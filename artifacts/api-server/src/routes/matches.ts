import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { matchesTable, matchResultsTable, tournamentsTable, registrationsTable, walletTransactionsTable, prizeTiersTable } from "@workspace/db";
import { eq, desc, and, sql, inArray } from "drizzle-orm";
import { requireAdmin } from "../middlewares/requireAdmin";
import { logger } from "../lib/logger";
import { nextMatchSerial } from "../lib/matchSerial";
import { bulkCreateNotifications } from "../lib/notificationHelper";

const router: IRouter = Router();

// Helper: compute effective match status and whether room should be visible.
//
// Status flow:
//   scheduled (Coming Soon) → scheduled+roomVisible (Room Released) → live (Match Live) → completed (Match Completed)
//
// Timestamps:
//   roomReleaseAt  — when room credentials become visible (Phase 2 start)
//   scheduledAt    — actual match start time             (Phase 3 start)
//   roomHideAt     — when room hides / match ends        (Phase 4 start)
//                    defaults to scheduledAt + 2 h when not explicitly set.
//                    (Previously defaulted to scheduledAt itself, which hid the
//                    room at match start and prevented the "live" flip — that was the bug.)
function computeMatchVisibility(match: typeof matchesTable.$inferSelect) {
  const now = new Date();
  const startTime = new Date(match.scheduledAt);

  // Default hide time: 2 hours after match start when admin hasn't set an explicit end time.
  // IMPORTANT: the old default was `startTime` which caused the room to disappear the instant
  // the match began and prevented the effectiveStatus from ever reaching "live".
  const hideAt = match.roomHideAt
    ? new Date(match.roomHideAt)
    : new Date(startTime.getTime() + 2 * 60 * 60 * 1000);

  // If already manually marked completed, honour it immediately.
  if (match.status === "completed") {
    return { roomVisible: false, effectiveStatus: "completed" as string };
  }

  let roomVisible = false;
  let effectiveStatus: string = match.status;

  if (match.roomId) {
    if (now >= hideAt) {
      // Phase 4: past the hide/end time → auto-complete, hide room
      effectiveStatus = "completed";
      roomVisible = false;
    } else if (match.roomReleaseAt) {
      const releaseAt = new Date(match.roomReleaseAt);
      if (now >= releaseAt) {
        // Phase 2 / 3: room credentials are released
        roomVisible = true;
        // Only advance to "live" when the actual match start time has been reached.
        // Room release alone does NOT make the match live.
        if (effectiveStatus === "scheduled" && now >= startTime) {
          effectiveStatus = "live"; // Phase 3
        }
        // now < startTime → Phase 2 (Room Released, not yet live)
      }
      // else: now < releaseAt → Phase 1 (Coming Soon), room hidden
    } else {
      // No release time configured: room visible only when admin manually set status to "live"
      if (match.status === "live" && now >= startTime) {
        roomVisible = true;
      }
    }
  }

  return { roomVisible, effectiveStatus };
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

        const { roomVisible, effectiveStatus } = computeMatchVisibility(m);

        // Auto-update status in DB when a time-based transition occurs
        // (scheduled→live at scheduledAt, or scheduled/live→completed at roomHideAt)
        if (effectiveStatus !== m.status && (effectiveStatus === "live" || effectiveStatus === "completed")) {
          await db.update(matchesTable)
            .set({ status: effectiveStatus })
            .where(eq(matchesTable.id, m.id));
        }

        return {
          ...m,
          status: effectiveStatus,
          roomId: roomVisible ? m.roomId : null,
          roomPassword: roomVisible ? m.roomPassword : null,
          roomSet: !!(m.roomId),   // true if admin has saved credentials, regardless of visibility timing
          roomVisible,
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
        },
      })
      .from(matchesTable)
      .innerJoin(tournamentsTable, eq(matchesTable.tournamentId, tournamentsTable.id))
      .orderBy(matchesTable.scheduledAt);

    // Filter for live matches and attach visibility info
    const liveMatches = matches
      .map((m) => {
        const { roomVisible, effectiveStatus } = computeMatchVisibility(m as any);
        return {
          ...m,
          status: effectiveStatus,
          roomId: roomVisible ? m.roomId : null,
          roomPassword: roomVisible ? m.roomPassword : null,
          roomVisible,
        };
      })
      .filter((m) => m.status === "live");

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
    const { matchNumber, scheduledAt, mapName, status, roomId, roomPassword, roomReleaseAt } = req.body;

    if (!scheduledAt) {
      return res.status(400).json({ error: "scheduledAt is required." });
    }

    const parsedMatchNumber = parseInt(matchNumber, 10);
    if (!matchNumber || isNaN(parsedMatchNumber) || parsedMatchNumber < 1) {
      return res.status(400).json({ error: "A valid match number is required." });
    }

    // Validate that the tournament exists
    const [tournament] = await db
      .select({ id: tournamentsTable.id, startDate: tournamentsTable.startDate })
      .from(tournamentsTable)
      .where(eq(tournamentsTable.id, id));

    if (!tournament) {
      return res.status(404).json({ error: "Tournament not found." });
    }

    const scheduledAtDate = new Date(scheduledAt);
    if (isNaN(scheduledAtDate.getTime())) {
      return res.status(400).json({ error: "Invalid scheduledAt date." });
    }


    // Default roomReleaseAt: 10 minutes before scheduledAt if not provided
    let releaseAt: Date | null = null;
    if (roomReleaseAt) {
      releaseAt = new Date(roomReleaseAt);
    } else if (roomId) {
      releaseAt = new Date(scheduledAtDate.getTime() - 10 * 60 * 1000);
    }

    // Auto-generate permanent serial number (T-0001, T-0002, …)
    const serialNumber = await nextMatchSerial("tournament");

    const [match] = await db
      .insert(matchesTable)
      .values({
        tournamentId: id,
        matchNumber: parsedMatchNumber,
        serialNumber,
        scheduledAt: scheduledAtDate,
        status: status ?? "scheduled",
        mapName: mapName ?? null,
        roomId: roomId ?? null,
        roomPassword: roomPassword ?? null,
        roomReleaseAt: releaseAt,
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
    const { matchNumber, scheduledAt, mapName, status, roomId, roomPassword, roomReleaseAt } = req.body;

    const [existing] = await db.select().from(matchesTable).where(eq(matchesTable.id, id));
    if (!existing) return res.status(404).json({ error: "Match not found." });

    // Recalculate roomReleaseAt when roomId is set and scheduledAt changes
    let newReleaseAt = existing.roomReleaseAt;
    if (roomReleaseAt !== undefined) {
      newReleaseAt = roomReleaseAt ? new Date(roomReleaseAt) : null;
    } else if (roomId && scheduledAt) {
      newReleaseAt = new Date(new Date(scheduledAt).getTime() - 10 * 60 * 1000);
    } else if (roomId && !roomReleaseAt && existing.scheduledAt) {
      newReleaseAt = new Date(new Date(existing.scheduledAt).getTime() - 10 * 60 * 1000);
    }

    const [updated] = await db
      .update(matchesTable)
      .set({
        ...(matchNumber !== undefined && { matchNumber: parseInt(matchNumber) }),
        ...(scheduledAt && { scheduledAt: new Date(scheduledAt) }),
        ...(mapName !== undefined && { mapName }),
        ...(status && { status }),
        ...(roomId !== undefined && { roomId: roomId || null }),
        ...(roomPassword !== undefined && { roomPassword: roomPassword || null }),
        roomReleaseAt: newReleaseAt,
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

router.patch("/matches/:id/room", async (req, res) => {
  if (!await requireAdmin(req, res)) return;
  try {
    const id = parseInt(req.params.id);
    const { roomId, roomPassword, roomReleaseMinutesBefore, roomHideMinutesAfter } = req.body;

    const [existing] = await db.select().from(matchesTable).where(eq(matchesTable.id, id));
    if (!existing) return res.status(404).json({ error: "Match not found." });

    // Release time: N minutes BEFORE scheduledAt (default 10 min before)
    const minutesBefore = roomReleaseMinutesBefore ?? 10;
    const releaseAt = minutesBefore === -1
      ? new Date() // -1 = manual/immediate release
      : new Date(new Date(existing.scheduledAt).getTime() - minutesBefore * 60 * 1000);

    // Hide time: N minutes AFTER scheduledAt, or null = auto-hide at scheduledAt
    let hideAt: Date | null = null;
    if (roomHideMinutesAfter != null) {
      hideAt = new Date(new Date(existing.scheduledAt).getTime() + Number(roomHideMinutesAfter) * 60 * 1000);
    }

    const [updated] = await db
      .update(matchesTable)
      .set({
        roomId: roomId ?? null,
        roomPassword: roomPassword ?? null,
        roomReleaseAt: releaseAt,
        roomHideAt: hideAt,
        // Reset notification guard whenever room credentials are re-saved
        // so the scheduler can re-fire if the room was updated
        roomNotifiedAt: null,
      })
      .where(eq(matchesTable.id, id))
      .returning();

    res.json({ success: true, match: updated });

    // ── Trigger A: immediate notification when room is released right now ──
    // (minutesBefore === -1 means "Now" — release time is already in the past)
    if (minutesBefore === -1 && updated.roomId) {
      try {
        const now = new Date();
        // Mark as notified immediately so the scheduler skips this match
        await db.update(matchesTable)
          .set({ roomNotifiedAt: now })
          .where(and(eq(matchesTable.id, id)));

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
          logger.info({ matchId: id, userCount: userIds.length }, "Immediate room-open notifications sent");
        }
      } catch (err) {
        logger.error({ err }, "Failed to send immediate room notifications");
      }
    }
  } catch {
    res.status(500).json({ error: "Failed to update room details." });
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
      .set({ roomId: null, roomPassword: null, roomReleaseAt: null, roomHideAt: null })
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

    // Mark match completed and hide room details
    await db.update(matchesTable)
      .set({
        status: "completed",
        roomId: null,
        roomPassword: null,
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

    // Mark match completed
    await db.update(matchesTable)
      .set({ status: "completed" })
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
        createdAt: matchesTable.createdAt,
        tournament: {
          id: tournamentsTable.id,
          name: tournamentsTable.name,
          mode: tournamentsTable.mode,
          bannerUrl: tournamentsTable.bannerUrl,
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
