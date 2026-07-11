import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { matchesTable, matchResultsTable, tournamentsTable, registrationsTable, walletTransactionsTable, prizeTiersTable } from "@workspace/db";
import { eq, desc, and, sql, inArray } from "drizzle-orm";
import { requireAdmin } from "../middlewares/requireAdmin";
import { logger } from "../lib/logger";
import { nextMatchSerial } from "../lib/matchSerial";
import { bulkCreateNotifications } from "../lib/notificationHelper";
import { updateRatingsFromMatch } from "../lib/ratingEngine";

const router: IRouter = Router();

// ─── Explicit, decoupled lifecycle ──────────────────────────────────────────
// Each state below is a distinct, independently-controlled flag. NONE of them
// is inferred from another, and NONE of them is inferred from wall-clock time
// except `matchLive`, which the scheduler (or an admin) may flip on once
// `scheduledAt` has passed — this never touches room/registration/completion.
//
//   registrationOpen — lives on the tournament (tournamentsTable.registrationClosed);
//                       toggled ONLY by an explicit admin action.
//   matchCreated      — a row exists in matchesTable. Creating it sets nothing else.
//   roomReleased      — matchesTable.roomReleased. Set ONLY by POST /matches/:id/release-room.
//   roomVisible       — derived read-only view: roomReleased && !roomHidden && roomId is set.
//   matchLive         — matchesTable.matchLive. Set by POST /matches/:id/start OR by the
//                       scheduler once scheduledAt passes (never implies room release).
//   matchCompleted    — matchesTable.status === "completed". Set ONLY by an explicit
//                       "Complete Match" / results-submission admin action.
//
// `effectiveStatus` below is a friendly label DERIVED for display only; it never
// writes back to the DB and never causes a state transition on its own.
function computeMatchVisibility(match: typeof matchesTable.$inferSelect) {
  if (match.status === "completed") {
    return { roomVisible: false, roomWindowOpen: false, effectiveStatus: "completed" as string };
  }

  const roomVisible = !!(match.roomReleased && !match.roomHidden && match.roomId);
  // roomWindowOpen: the release stage has been explicitly entered by the admin,
  // even if credentials aren't visible right now (e.g. briefly hidden).
  const roomWindowOpen = !!(match.roomReleased && !match.roomHidden);

  let effectiveStatus: string = "scheduled";
  if (match.matchLive) {
    effectiveStatus = "live";
  } else if (match.roomReleased) {
    effectiveStatus = "room_released";
  }

  return { roomVisible, roomWindowOpen, effectiveStatus };
}

// ─── Get matches for a tournament ───────────────────────────────────────────

router.get("/tournaments/:id/matches", async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    const matches = await db
      .select()
      .from(matchesTable)
      .where(eq(matchesTable.tournamentId, id))
      .orderBy(matchesTable.matchNumber);

    const result = await Promise.all(
      matches.map(async (m) => {
        const results = await db
          .select()
          .from(matchResultsTable)
          .where(eq(matchResultsTable.matchId, m.id))
          .orderBy(matchResultsTable.rank);

        // Purely read-only derivation — never writes back to the DB from a GET request.
        const { roomVisible, roomWindowOpen, effectiveStatus } = computeMatchVisibility(m);

        return {
          ...m,
          status: effectiveStatus,
          roomId: roomVisible ? m.roomId : null,
          roomPassword: roomVisible ? m.roomPassword : null,
          roomSet: !!(m.roomId),   // true if admin has saved credentials, regardless of release state
          roomVisible,
          roomWindowOpen,          // true once the admin has explicitly released the room (and not hidden it)
          results,
        };
      })
    );
    res.json(result);
  } catch {
    res.status(500).json({ error: "Failed to load matches." });
  }
});

// ─── Get all live matches (public) ──────────────────────────────────────────

router.get("/matches/live", async (_req, res) => {
  try {
    const now = new Date();
    const matches = await db
      .select({
        id: matchesTable.id,
        tournamentId: matchesTable.tournamentId,
        matchNumber: matchesTable.matchNumber,
        scheduledAt: matchesTable.scheduledAt,
        status: matchesTable.status,
        mapName: matchesTable.mapName,
        roomId: matchesTable.roomId,
        roomPassword: matchesTable.roomPassword,
        roomReleaseAt: matchesTable.roomReleaseAt,
        createdAt: matchesTable.createdAt,
        tournament: {
          id: tournamentsTable.id,
          name: tournamentsTable.name,
          mode: tournamentsTable.mode,
          bannerUrl: tournamentsTable.bannerUrl,
          status: tournamentsTable.status,
          startDate: tournamentsTable.startDate,
        },
      })
      .from(matchesTable)
      .innerJoin(tournamentsTable, eq(matchesTable.tournamentId, tournamentsTable.id))
      .orderBy(matchesTable.scheduledAt);

    // Filter for live matches and attach visibility info.
    // Includes both "live" and "room_released" so players can see the
    // Room Released → Match Live transition without a page change.
    const liveMatches = matches
      .map((m) => {
        const { roomVisible, roomWindowOpen, effectiveStatus } = computeMatchVisibility(m as any);
        return {
          ...m,
          status: effectiveStatus,
          roomId: roomVisible ? m.roomId : null,
          roomPassword: roomVisible ? m.roomPassword : null,
          roomSet: !!(m.roomId),
          roomVisible,
          roomWindowOpen,
        };
      })
      .filter((m) => m.status === "live" || m.status === "room_released");

    res.json(liveMatches);
  } catch {
    res.status(500).json({ error: "Failed to load live matches." });
  }
});

// ─── Create match (admin) ────────────────────────────────────────────────────

router.post("/tournaments/:id/matches", async (req, res) => {
  if (!await requireAdmin(req, res)) return;
  try {
    const id = parseInt(req.params.id);
    // NOTE: creating a match ONLY records its number/time/map. It must never
    // release the room, close registration, mark the match live, or otherwise
    // touch any other lifecycle field.
    const { matchNumber, scheduledAt, mapName, roomId, roomPassword, roomReleaseAt } = req.body;

    const parsedMatchNumber = parseInt(matchNumber, 10);
    if (!matchNumber || isNaN(parsedMatchNumber) || parsedMatchNumber < 1) {
      return res.status(400).json({ error: "A valid match number is required." });
    }

    // Validate that the tournament exists.
    const [tournament] = await db
      .select({ id: tournamentsTable.id })
      .from(tournamentsTable)
      .where(eq(tournamentsTable.id, id));

    if (!tournament) {
      return res.status(404).json({ error: "Tournament not found." });
    }

    const parsedScheduledAt = scheduledAt ? new Date(scheduledAt) : null;
    const scheduledAtDate = parsedScheduledAt && !isNaN(parsedScheduledAt.getTime())
      ? parsedScheduledAt
      : new Date();

    // Auto-generate permanent serial number (T-0001, T-0002, …)
    const serialNumber = await nextMatchSerial("tournament");

    const [match] = await db
      .insert(matchesTable)
      .values({
        tournamentId: id,
        matchNumber: parsedMatchNumber,
        serialNumber,
        scheduledAt: scheduledAtDate,
        status: "scheduled",
        mapName: mapName ?? null,
        // Room ID/password may be pre-filled here for convenience, but this NEVER
        // releases them — roomReleased stays false until the admin explicitly
        // clicks "Release Room".
        roomId: roomId ?? null,
        roomPassword: roomPassword ?? null,
        // roomReleaseAt is purely an informational target time for the countdown UI.
        roomReleaseAt: roomReleaseAt ? new Date(roomReleaseAt) : null,
        roomReleased: false,
        roomHidden: false,
        matchLive: false,
      })
      .returning();
    res.status(201).json(match);
  } catch (err) {
    logger.error({ err }, "Failed to create match");
    res.status(500).json({ error: "Failed to create match." });
  }
});

// ─── Update match (admin) ─────────────────────────────────────────────────────

router.patch("/matches/:id", async (req, res) => {
  if (!await requireAdmin(req, res)) return;
  try {
    const id = parseInt(req.params.id);
    // NOTE: this endpoint edits basic match metadata only (number/time/map/room
    // data fields). It must never toggle roomReleased, roomHidden, matchLive, or
    // registration — those are explicit actions via their own endpoints below.
    const { matchNumber, scheduledAt, mapName, status, roomId, roomPassword, roomReleaseAt } = req.body;

    const [existing] = await db.select().from(matchesTable).where(eq(matchesTable.id, id));
    if (!existing) return res.status(404).json({ error: "Match not found." });

    const [updated] = await db
      .update(matchesTable)
      .set({
        ...(matchNumber !== undefined && { matchNumber: parseInt(matchNumber) }),
        ...(scheduledAt && { scheduledAt: new Date(scheduledAt) }),
        ...(mapName !== undefined && { mapName }),
        // "status" here is only accepted as an explicit admin override (e.g. manually
        // marking a match completed from this generic endpoint); it never auto-derives.
        ...(status && { status }),
        ...(roomId !== undefined && { roomId: roomId || null }),
        ...(roomPassword !== undefined && { roomPassword: roomPassword || null }),
        ...(roomReleaseAt !== undefined && { roomReleaseAt: roomReleaseAt ? new Date(roomReleaseAt) : null }),
      })
      .where(eq(matchesTable.id, id))
      .returning();
    if (!updated) return res.status(404).json({ error: "Match not found." });

    // ── Auto-cascade: when all matches for a tournament are completed,
    //    promote the tournament status to "ended" so every page is consistent.
    if (status === "completed") {
      try {
        const [rem] = await db
          .select({ cnt: sql<number>`cast(count(*) as int)` })
          .from(matchesTable)
          .where(and(
            eq(matchesTable.tournamentId, updated.tournamentId),
            sql`${matchesTable.status} != 'completed'`,
          ));
        if ((rem?.cnt ?? 1) === 0) {
          await db.update(tournamentsTable)
            .set({ status: "ended" })
            .where(eq(tournamentsTable.id, updated.tournamentId));
          logger.info({ tournamentId: updated.tournamentId }, "Tournament auto-ended: all matches completed");
        }
      } catch (e) {
        logger.warn({ err: e }, "Failed to auto-end tournament after match completed");
      }
    }

    res.json(updated);
  } catch (err) {
    logger.error({ err }, "Failed to update match");
    res.status(500).json({ error: "Failed to update match." });
  }
});

// ─── Set room details for a match (admin) ────────────────────────────────────

// This ONLY stores room data + an informational target release time for the
// countdown UI. It NEVER reveals credentials — that requires the explicit
// "Release Room" action below.
router.patch("/matches/:id/room", async (req, res) => {
  if (!await requireAdmin(req, res)) return;
  try {
    const id = parseInt(req.params.id);
    const { roomId, roomPassword, roomReleaseAt } = req.body;

    const [existing] = await db.select().from(matchesTable).where(eq(matchesTable.id, id));
    if (!existing) return res.status(404).json({ error: "Match not found." });

    const [updated] = await db
      .update(matchesTable)
      .set({
        roomId: roomId ?? null,
        roomPassword: roomPassword ?? null,
        // Purely informational — drives the "Room Releases In" countdown only.
        roomReleaseAt: roomReleaseAt ? new Date(roomReleaseAt) : null,
      })
      .where(eq(matchesTable.id, id))
      .returning();

    res.json({ success: true, match: updated });
  } catch {
    res.status(500).json({ error: "Failed to update room details." });
  }
});

// ─── Release room (admin) — the ONLY action that reveals credentials ─────────

router.post("/matches/:id/release-room", async (req, res) => {
  if (!await requireAdmin(req, res)) return;
  try {
    const id = parseInt(req.params.id);
    const [existing] = await db.select().from(matchesTable).where(eq(matchesTable.id, id));
    if (!existing) return res.status(404).json({ error: "Match not found." });
    if (!existing.roomId) {
      return res.status(400).json({ error: "Set the Room ID (and password) before releasing the room." });
    }

    const now = new Date();
    const [updated] = await db
      .update(matchesTable)
      .set({ roomReleased: true, roomHidden: false, roomNotifiedAt: existing.roomNotifiedAt ?? now })
      .where(eq(matchesTable.id, id))
      .returning();

    res.json({ success: true, match: updated });

    if (!existing.roomNotifiedAt) {
      try {
        const registrants = await db
          .select({ userId: registrationsTable.userId })
          .from(registrationsTable)
          .where(and(
            eq(registrationsTable.tournamentId, updated.tournamentId),
            eq(registrationsTable.status, "approved"),
          ));

        const userIds = [...new Set(registrants.map((r) => r.userId))];
        if (userIds.length > 0) {
          await bulkCreateNotifications(
            userIds,
            "রুম আইডি ও পাসওয়ার্ড রেডি! ⚡",
            `আপনার টুর্নামেন্ট Match #${updated.matchNumber} এর রুম আইডি ও পাসওয়ার্ড রিলিজ করা হয়েছে। জলদি চেক করে কাস্টম রুমে জয়েন করুন!`,
            "success",
          );
          logger.info({ matchId: id, userCount: userIds.length }, "Room-release notifications sent");
        }
      } catch (err) {
        logger.error({ err }, "Failed to send room-release notifications");
      }
    }
  } catch {
    res.status(500).json({ error: "Failed to release room." });
  }
});

// ─── Hide room credentials (admin, optional) ─────────────────────────────────

router.post("/matches/:id/hide-room", async (req, res) => {
  if (!await requireAdmin(req, res)) return;
  try {
    const id = parseInt(req.params.id);
    const [existing] = await db.select().from(matchesTable).where(eq(matchesTable.id, id));
    if (!existing) return res.status(404).json({ error: "Match not found." });
    const [updated] = await db
      .update(matchesTable)
      .set({ roomHidden: true })
      .where(eq(matchesTable.id, id))
      .returning();
    res.json({ success: true, match: updated });
  } catch {
    res.status(500).json({ error: "Failed to hide room." });
  }
});

// ─── Start match (admin, manual) ─────────────────────────────────────────────
// Normally the scheduler flips matchLive once scheduledAt passes; this lets an
// admin start early. It never touches room state or registration.

router.post("/matches/:id/start", async (req, res) => {
  if (!await requireAdmin(req, res)) return;
  try {
    const id = parseInt(req.params.id);
    const [existing] = await db.select().from(matchesTable).where(eq(matchesTable.id, id));
    if (!existing) return res.status(404).json({ error: "Match not found." });
    if (existing.status === "completed") {
      return res.status(400).json({ error: "Match is already completed." });
    }
    const [updated] = await db
      .update(matchesTable)
      .set({ matchLive: true, status: "live" })
      .where(eq(matchesTable.id, id))
      .returning();
    res.json({ success: true, match: updated });
  } catch {
    res.status(500).json({ error: "Failed to start match." });
  }
});

// ─── Clear room credentials for a match (admin) ──────────────────────────────

router.delete("/matches/:id/room", async (req, res) => {
  if (!await requireAdmin(req, res)) return;
  try {
    const id = parseInt(req.params.id);
    const [existing] = await db.select().from(matchesTable).where(eq(matchesTable.id, id));
    if (!existing) return res.status(404).json({ error: "Match not found." });
    await db
      .update(matchesTable)
      .set({
        roomId: null,
        roomPassword: null,
        roomReleaseAt: null,
        roomHideAt: null,
        roomReleased: false,
        roomHidden: false,
        roomNotifiedAt: null,
      })
      .where(eq(matchesTable.id, id));
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Failed to clear room details." });
  }
});

// ─── Submit match results (admin) ────────────────────────────────────────────

router.patch("/matches/:id/results", async (req, res) => {
  if (!await requireAdmin(req, res)) return;
  try {
    const id = parseInt(req.params.id);
    const { results } = req.body as {
      results: Array<{
        teamId?: number;
        userId?: string;
        playerName: string;
        rank: number;
        kills: number;
        points: number;
        prize?: number;
      }>;
    };

    if (!Array.isArray(results) || results.length === 0) {
      return res.status(400).json({ error: "results array is required." });
    }

    // Mark match completed and hide room credentials (data is kept for records,
    // only its visibility is turned off — an explicit part of this same admin action).
    await db.update(matchesTable)
      .set({
        status: "completed",
        roomHidden: true,
      })
      .where(eq(matchesTable.id, id));

    // Replace results
    await db.delete(matchResultsTable).where(eq(matchResultsTable.matchId, id));
    await db.insert(matchResultsTable).values(
      results.map((r) => ({
        matchId: id,
        teamId: r.teamId ?? null,
        userId: r.userId ?? null,
        playerName: r.playerName,
        rank: r.rank,
        kills: r.kills,
        // Accept prizeMoney as an alias for points (frontend sends prizeMoney)
        points: r.points ?? (r as any).prizeMoney ?? 0,
      }))
    );

    // Return updated match with results
    const [match] = await db.select().from(matchesTable).where(eq(matchesTable.id, id));
    const savedResults = await db
      .select()
      .from(matchResultsTable)
      .where(eq(matchResultsTable.matchId, id))
      .orderBy(matchResultsTable.rank);

    // ── Cascade: mark tournament resultsPublished = true.
    //    Also auto-set status = "ended" if every match for this tournament is now completed.
    if (match) {
      try {
        const [rem] = await db
          .select({ cnt: sql<number>`cast(count(*) as int)` })
          .from(matchesTable)
          .where(and(
            eq(matchesTable.tournamentId, match.tournamentId),
            sql`${matchesTable.status} != 'completed'`,
          ));
        await db.update(tournamentsTable)
          .set({
            resultsPublished: true,
            ...((rem?.cnt ?? 1) === 0 ? { status: "ended" } : {}),
          })
          .where(eq(tournamentsTable.id, match.tournamentId));
        logger.info({ tournamentId: match.tournamentId, allCompleted: (rem?.cnt ?? 1) === 0 }, "Tournament resultsPublished cascaded from match results");
      } catch (e) {
        logger.warn({ err: e }, "Failed to cascade tournament resultsPublished after match results save");
      }
    }

    res.json({ success: true, match: { ...match, results: savedResults } });

    // Non-blocking: update FF Arena ratings. A failure here must NOT affect the
    // response already sent above — this runs after the response is flushed.
    if (match) {
      updateRatingsFromMatch(id, match.tournamentId).catch((e) =>
        logger.error({ err: e, matchId: id }, "Background rating update failed"),
      );
    }
  } catch (err) {
    logger.error({ err }, "Failed to save results");
    res.status(500).json({ error: "Failed to save results." });
  }
});

// ─── Team-grouped results + auto prize distribution (admin) ──────────────────
// Accepts squad-structured kills/ranks, saves per-member result rows, and
// automatically credits the computed grand total (rank prize + kill reward)
// to the team leader's wallet. Teammates receive result rows but NO wallet tx.

router.patch("/admin/matches/:id/team-results", async (req, res) => {
  if (!await requireAdmin(req, res)) return;
  try {
    const id = parseInt(req.params.id);
    const { teams } = req.body as {
      teams: Array<{
        registrationId: number;
        rank: number | null;
        captainKills: number;
        memberKills?: number[];
      }>;
    };

    if (!Array.isArray(teams) || teams.length === 0) {
      return res.status(400).json({ error: "teams array is required." });
    }

    const [match] = await db.select().from(matchesTable).where(eq(matchesTable.id, id));
    if (!match) return res.status(404).json({ error: "Match not found." });

    const [tournament] = await db
      .select()
      .from(tournamentsTable)
      .where(eq(tournamentsTable.id, match.tournamentId));
    if (!tournament) return res.status(404).json({ error: "Tournament not found." });

    const prizes = await db
      .select()
      .from(prizeTiersTable)
      .where(eq(prizeTiersTable.tournamentId, match.tournamentId))
      .orderBy(prizeTiersTable.rank);

    // rank → prize amount map
    const prizeByRank: Record<number, number> = {};
    prizes.forEach((p, i) => { prizeByRank[i + 1] = Number(p.amount); });
    if (prizes.length === 0) {
      const pool = Number(tournament.prizePool ?? 0);
      if (pool > 0) {
        prizeByRank[1] = parseFloat((pool * 0.50).toFixed(2));
        prizeByRank[2] = parseFloat((pool * 0.30).toFixed(2));
        prizeByRank[3] = parseFloat((pool * 0.20).toFixed(2));
      }
    }

    const perKill = Number(tournament.perKillReward ?? 0);

    const regIds = teams.map((t) => t.registrationId);
    const registrations = await db
      .select()
      .from(registrationsTable)
      .where(inArray(registrationsTable.id, regIds));
    const regMap = new Map(registrations.map((r) => [r.id, r]));

    const resultRows: Array<typeof matchResultsTable.$inferInsert> = [];
    const walletInserts: Array<typeof walletTransactionsTable.$inferInsert> = [];
    let totalPrize = 0;
    let teamsRewarded = 0;

    const rankLabel = (rank: number | null) =>
      rank === 1 ? "🥇 1st Place" : rank === 2 ? "🥈 2nd Place" : rank === 3 ? "🥉 3rd Place" : `#${rank}`;

    for (const team of teams) {
      const reg = regMap.get(team.registrationId);
      if (!reg) continue;

      const teamMembers: { uid: string; name: string }[] = reg.teamMembers
        ? JSON.parse(reg.teamMembers)
        : [];

      const rank = team.rank ?? null;
      const rankPrize = rank ? (prizeByRank[rank] ?? 0) : 0;
      const captKills = team.captainKills ?? 0;
      const memberKillsList = team.memberKills ?? [];
      const totalKills = captKills + memberKillsList.reduce((s, k) => s + k, 0);
      const killReward = parseFloat((totalKills * perKill).toFixed(2));
      const grandTotal = parseFloat((rankPrize + killReward).toFixed(2));
      const displayRank = rank ?? 99;

      // Captain result row — carries total team prize in points for leaderboard
      resultRows.push({
        matchId: id,
        userId: reg.userId ?? null,
        playerName: reg.playerName,
        rank: displayRank,
        kills: captKills,
        points: grandTotal > 0 ? Math.round(grandTotal) : 0,
      });

      // Teammate result rows — track kills but no wallet credit
      teamMembers.forEach((mem, i) => {
        resultRows.push({
          matchId: id,
          userId: null,
          playerName: mem.name,
          rank: displayRank,
          kills: memberKillsList[i] ?? 0,
          points: 0,
        });
      });

      // Wallet transactions → team leader only
      if (grandTotal > 0 && reg.userId) {
        teamsRewarded++;
        totalPrize = parseFloat((totalPrize + grandTotal).toFixed(2));

        if (rankPrize > 0) {
          walletInserts.push({
            userId: reg.userId,
            type: "tournament_prize",
            amount: rankPrize.toFixed(2),
            status: "approved",
            notes: `Match #${match.matchNumber} ${rankLabel(rank)} Rank Prize — "${tournament.name}"`,
            tournamentId: match.tournamentId,
            matchId: id,
          });
        }

        if (killReward > 0) {
          const killBreakdown = [
            captKills > 0 ? `${reg.playerName} ${captKills}K` : null,
            ...teamMembers.map((m, i) =>
              (memberKillsList[i] ?? 0) > 0 ? `${m.name} ${memberKillsList[i]}K` : null
            ),
          ].filter(Boolean).join(" + ");
          walletInserts.push({
            userId: reg.userId,
            type: "tournament_prize",
            amount: killReward.toFixed(2),
            status: "approved",
            notes: `Match #${match.matchNumber} Team Kill Reward (${killBreakdown || `${totalKills}K`}) × ৳${perKill} — "${tournament.name}"`,
            tournamentId: match.tournamentId,
            matchId: id,
          });
        }
      }
    }

    // Replace results for this match
    await db.delete(matchResultsTable).where(eq(matchResultsTable.matchId, id));
    if (resultRows.length > 0) await db.insert(matchResultsTable).values(resultRows);

    // Insert wallet transactions
    if (walletInserts.length > 0) await db.insert(walletTransactionsTable).values(walletInserts);

    // Mark match completed and hide room credentials (kept for records, only hidden)
    await db.update(matchesTable)
      .set({ status: "completed", roomHidden: true })
      .where(eq(matchesTable.id, id));

    // Cascade tournament resultsPublished
    try {
      const [rem] = await db
        .select({ cnt: sql<number>`cast(count(*) as int)` })
        .from(matchesTable)
        .where(and(
          eq(matchesTable.tournamentId, match.tournamentId),
          sql`${matchesTable.status} != 'completed'`,
        ));
      await db.update(tournamentsTable)
        .set({
          resultsPublished: true,
          ...((rem?.cnt ?? 1) === 0 ? { status: "ended" } : {}),
        })
        .where(eq(tournamentsTable.id, match.tournamentId));
    } catch (e) {
      logger.warn({ err: e }, "Failed to cascade tournament resultsPublished");
    }

    logger.info({ matchId: id, resultsCount: resultRows.length, teamsRewarded, totalPrize }, "Team results saved with auto prize distribution");
    res.json({ success: true, resultsCount: resultRows.length, teamsRewarded, totalPrize });

    // Non-blocking: update FF Arena ratings after response is already sent.
    updateRatingsFromMatch(id, match.tournamentId).catch((e) =>
      logger.error({ err: e, matchId: id }, "Background rating update (team-results) failed"),
    );
  } catch (err) {
    logger.error({ err }, "Failed to save team results");
    res.status(500).json({ error: "Failed to save team results." });
  }
});

// ─── Delete match (admin) ─────────────────────────────────────────────────────

router.delete("/matches/:id", async (req, res) => {
  if (!await requireAdmin(req, res)) return;
  try {
    const id = parseInt(req.params.id);
    await db.delete(matchResultsTable).where(eq(matchResultsTable.matchId, id));
    await db.delete(matchesTable).where(eq(matchesTable.id, id));
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Failed to delete match." });
  }
});

// ─── Public schedule ──────────────────────────────────────────────────────────

router.get("/matches/schedule", async (_req, res) => {
  try {
    const matches = await db
      .select({
        id: matchesTable.id,
        tournamentId: matchesTable.tournamentId,
        matchNumber: matchesTable.matchNumber,
        scheduledAt: matchesTable.scheduledAt,
        status: matchesTable.status,
        mapName: matchesTable.mapName,
        roomId: matchesTable.roomId,
        roomPassword: matchesTable.roomPassword,
        roomReleaseAt: matchesTable.roomReleaseAt,
        roomHideAt: matchesTable.roomHideAt,
        createdAt: matchesTable.createdAt,
        tournament: {
          id: tournamentsTable.id,
          name: tournamentsTable.name,
          mode: tournamentsTable.mode,
          bannerUrl: tournamentsTable.bannerUrl,
          startDate: tournamentsTable.startDate,
        },
      })
      .from(matchesTable)
      .innerJoin(tournamentsTable, eq(matchesTable.tournamentId, tournamentsTable.id))
      .orderBy(matchesTable.scheduledAt);

    // Attach results for completed matches, apply visibility rules
    const result = await Promise.all(
      matches.map(async (m) => {
        const { roomVisible, effectiveStatus } = computeMatchVisibility(m as any);
        let matchResults: any[] = [];
        if (m.status === "completed") {
          matchResults = await db
            .select()
            .from(matchResultsTable)
            .where(eq(matchResultsTable.matchId, m.id))
            .orderBy(matchResultsTable.rank);
        }
        return {
          ...m,
          status: effectiveStatus,
          roomId: roomVisible ? m.roomId : null,
          roomPassword: roomVisible ? m.roomPassword : null,
          roomVisible,
          results: matchResults,
        };
      })
    );

    res.json(result);
  } catch {
    res.status(500).json({ error: "Failed to load schedule." });
  }
});

export default router;
