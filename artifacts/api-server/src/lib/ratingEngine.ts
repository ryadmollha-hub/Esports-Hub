import { db } from "@workspace/db";
import { playerRatingsTable, ratingHistoryTable, matchResultsTable } from "@workspace/db";
import { eq, and, inArray, sql } from "drizzle-orm";
import { logger } from "./logger";

// ─── Tier thresholds ──────────────────────────────────────────────────────────
export const TIERS = [
  { name: "Heroic",    min: 16000, color: "#ff4444", emoji: "🔥" },
  { name: "Master",   min: 12000, color: "#c084fc", emoji: "👑" },
  { name: "Diamond",  min:  8000, color: "#38bdf8", emoji: "💎" },
  { name: "Platinum", min:  5000, color: "#34d399", emoji: "🔷" },
  { name: "Gold",     min:  2500, color: "#fbbf24", emoji: "🥇" },
  { name: "Silver",   min:  1000, color: "#94a3b8", emoji: "🥈" },
  { name: "Bronze",   min:     0, color: "#b45309", emoji: "🥉" },
] as const;

export type TierName = typeof TIERS[number]["name"];

export function getTier(rating: number): typeof TIERS[number] {
  return TIERS.find((t) => rating >= t.min) ?? TIERS[TIERS.length - 1];
}

// ─── Points per match ─────────────────────────────────────────────────────────
// Placement points mirror Free Fire ranked scoring (simplified for custom rooms).
// Kill points: 3 per kill (capped at 20 kills = 60 pts to prevent kill-farming).
const PLACEMENT_PTS: Record<number, number> = {
  1: 15, 2: 12, 3: 10, 4: 8, 5: 6,
  6: 5,  7: 4,  8: 3,  9: 2, 10: 1,
};
const KILL_PTS = 3;
const MAX_KILL_PTS = 60; // cap at 20 kills

export function calcMatchPoints(rank: number, kills: number): number {
  const placementPts = PLACEMENT_PTS[rank] ?? 0;
  const killPts = Math.min(kills * KILL_PTS, MAX_KILL_PTS);
  return placementPts + killPts;
}

// ─── Update ratings after a match ────────────────────────────────────────────
// Idempotency strategy:
//   - rating_history has a unique constraint on (match_id, user_id).
//   - We INSERT ... ON CONFLICT DO NOTHING for each history row.
//   - We check the number of rows actually inserted; if 0 for a player, they
//     were already rated in a previous call — skip their player_ratings update.
//   - This makes the function safe to call multiple times and safe under
//     concurrent invocations (both just try to insert; only one wins).
//
// Called NON-BLOCKING from result routes — a failure here must never affect
// the main response that has already been sent.

export async function updateRatingsFromMatch(
  matchId: number,
  tournamentId: number,
): Promise<void> {
  try {
    // Fetch result rows that have a real userId (registered players only)
    const results = await db
      .select()
      .from(matchResultsTable)
      .where(eq(matchResultsTable.matchId, matchId));

    const userResults = results.filter((r) => r.userId && r.userId.trim() !== "");

    if (userResults.length === 0) {
      logger.info({ matchId }, "No user results to rate — skipping");
      return;
    }

    const userIds = userResults.map((r) => r.userId!);

    // Fetch existing ratings for all players in one query
    const existingRatings = await db
      .select()
      .from(playerRatingsTable)
      .where(inArray(playerRatingsTable.userId, userIds));
    const ratingMap = new Map(existingRatings.map((r) => [r.userId, r]));

    let applied = 0;
    let skipped = 0;

    for (const row of userResults) {
      const userId = row.userId!;
      const pts = calcMatchPoints(row.rank, row.kills);
      const current = ratingMap.get(userId);
      const ratingBefore = current?.rating ?? 0;
      const ratingAfter  = ratingBefore + pts;
      const tierBefore   = current?.tier ?? "Bronze";
      const tierAfter    = getTier(ratingAfter).name;

      // Attempt to insert history row — the unique constraint (match_id, user_id)
      // ensures this is a no-op if this player was already rated for this match.
      const inserted = await db
        .insert(ratingHistoryTable)
        .values({
          userId,
          matchId,
          tournamentId,
          ratingBefore,
          ratingChange: pts,
          ratingAfter,
          tierBefore,
          tierAfter,
          placement: row.rank,
          kills:     row.kills,
        })
        .onConflictDoNothing()
        .returning({ id: ratingHistoryTable.id });

      if (inserted.length === 0) {
        // Row already existed — this player was already rated; skip update.
        skipped++;
        continue;
      }

      applied++;

      // History row inserted — safe to update player_ratings now.
      if (!current) {
        await db.insert(playerRatingsTable).values({
          userId,
          playerName:   row.playerName,
          rating:       ratingAfter,
          tier:         tierAfter,
          totalMatches: 1,
          totalKills:   row.kills,
          totalWins:    row.rank === 1 ? 1 : 0,
          bestRank:     row.rank,
          updatedAt:    new Date(),
        }).onConflictDoUpdate({
          target: playerRatingsTable.userId,
          // If race between two inserts, fall back to incrementing
          set: {
            rating:       sql`${playerRatingsTable.rating} + ${pts}`,
            tier:         tierAfter,
            totalMatches: sql`${playerRatingsTable.totalMatches} + 1`,
            totalKills:   sql`${playerRatingsTable.totalKills} + ${row.kills}`,
            totalWins:    sql`${playerRatingsTable.totalWins} + ${row.rank === 1 ? 1 : 0}`,
            bestRank:     sql`LEAST(COALESCE(${playerRatingsTable.bestRank}, 9999), ${row.rank})`,
            updatedAt:    new Date(),
          },
        });
      } else {
        await db
          .update(playerRatingsTable)
          .set({
            playerName:   row.playerName,
            rating:       ratingAfter,
            tier:         tierAfter,
            totalMatches: (current.totalMatches ?? 0) + 1,
            totalKills:   (current.totalKills   ?? 0) + row.kills,
            totalWins:    (current.totalWins    ?? 0) + (row.rank === 1 ? 1 : 0),
            bestRank:
              current.bestRank == null
                ? row.rank
                : Math.min(current.bestRank, row.rank),
            updatedAt: new Date(),
          })
          .where(eq(playerRatingsTable.userId, userId));
      }
    }

    logger.info({ matchId, applied, skipped }, "Ratings updated");
  } catch (err) {
    // Non-fatal — log and move on; main result save already succeeded
    logger.error({ err, matchId }, "Rating update failed (non-fatal)");
  }
}
