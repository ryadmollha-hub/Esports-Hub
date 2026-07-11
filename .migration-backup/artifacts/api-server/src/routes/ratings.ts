import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { playerRatingsTable, ratingHistoryTable, matchesTable, tournamentsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { TIERS, getTier } from "../lib/ratingEngine";

const router: IRouter = Router();

// ─── Global FF Arena Rank Leaderboard ────────────────────────────────────────
// GET /api/ratings/leaderboard
// Returns top 100 players sorted by rating descending.
router.get("/ratings/leaderboard", async (_req, res) => {
  try {
    const rows = await db
      .select()
      .from(playerRatingsTable)
      .orderBy(desc(playerRatingsTable.rating))
      .limit(100);

    const result = rows.map((r, idx) => ({
      position:     idx + 1,
      userId:       r.userId,
      playerName:   r.playerName,
      rating:       r.rating,
      tier:         r.tier,
      tierInfo:     getTier(r.rating),
      totalMatches: r.totalMatches,
      totalKills:   r.totalKills,
      totalWins:    r.totalWins,
      bestRank:     r.bestRank,
    }));

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: "Failed to load ratings leaderboard." });
  }
});

// ─── Single player rating + recent history ───────────────────────────────────
// GET /api/ratings/user/:userId
router.get("/ratings/user/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    const [rating] = await db
      .select()
      .from(playerRatingsTable)
      .where(eq(playerRatingsTable.userId, userId));

    const history = await db
      .select({
        id:            ratingHistoryTable.id,
        matchId:       ratingHistoryTable.matchId,
        tournamentId:  ratingHistoryTable.tournamentId,
        ratingBefore:  ratingHistoryTable.ratingBefore,
        ratingChange:  ratingHistoryTable.ratingChange,
        ratingAfter:   ratingHistoryTable.ratingAfter,
        tierBefore:    ratingHistoryTable.tierBefore,
        tierAfter:     ratingHistoryTable.tierAfter,
        placement:     ratingHistoryTable.placement,
        kills:         ratingHistoryTable.kills,
        createdAt:     ratingHistoryTable.createdAt,
        matchNumber:   matchesTable.matchNumber,
        tournamentName: tournamentsTable.name,
      })
      .from(ratingHistoryTable)
      .leftJoin(matchesTable,      eq(ratingHistoryTable.matchId,      matchesTable.id))
      .leftJoin(tournamentsTable,  eq(ratingHistoryTable.tournamentId, tournamentsTable.id))
      .where(eq(ratingHistoryTable.userId, userId))
      .orderBy(desc(ratingHistoryTable.createdAt))
      .limit(20);

    res.json({
      rating: rating
        ? { ...rating, tierInfo: getTier(rating.rating) }
        : null,
      history,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to load player rating." });
  }
});

// ─── Tier definitions (static, for frontend) ─────────────────────────────────
router.get("/ratings/tiers", (_req, res) => {
  res.json(TIERS);
});

export default router;
