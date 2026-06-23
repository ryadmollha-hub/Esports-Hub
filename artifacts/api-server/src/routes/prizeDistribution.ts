import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  matchesTable,
  tournamentsTable,
  prizeTiersTable,
  registrationsTable,
  walletTransactionsTable,
  usersTable,
} from "@workspace/db";
import { eq, and, desc, inArray } from "drizzle-orm";
import { requireAdmin } from "../middlewares/requireAdmin";
import { logger } from "../lib/logger";

const router: IRouter = Router();

// ─── Get tournament registrations enriched for prize distribution UI ─────────

router.get("/admin/tournaments/:tournamentId/prize-registrations", async (req, res) => {
  if (!await requireAdmin(req, res)) return;
  try {
    const tournamentId = parseInt(req.params.tournamentId);

    const [tournament] = await db
      .select()
      .from(tournamentsTable)
      .where(eq(tournamentsTable.id, tournamentId));

    if (!tournament) return res.status(404).json({ error: "Tournament not found." });

    const prizes = await db
      .select()
      .from(prizeTiersTable)
      .where(eq(prizeTiersTable.tournamentId, tournamentId))
      .orderBy(prizeTiersTable.rank);

    const registrations = await db
      .select()
      .from(registrationsTable)
      .where(
        and(
          eq(registrationsTable.tournamentId, tournamentId),
          eq(registrationsTable.status, "approved")
        )
      )
      .orderBy(registrationsTable.createdAt);

    const enriched = registrations.map((r) => ({
      ...r,
      teamMembersArr: r.teamMembers
        ? (JSON.parse(r.teamMembers) as { uid: string; name: string }[])
        : [],
    }));

    res.json({ tournament: { ...tournament, prizes }, registrations: enriched });
  } catch (err) {
    logger.error({ err }, "Failed to load prize registrations");
    res.status(500).json({ error: "Failed to load prize registrations." });
  }
});

// ─── Preview or distribute prizes for a match ─────────────────────────────────
// ROUTING RULE: Entire team prize (rank reward + all member kills × perKill)
// is credited to the team leader's wallet. Teammates without app accounts are
// tracked for stats only — they do not receive separate wallet transactions.

router.post("/admin/matches/:matchId/distribute-prizes", async (req, res) => {
  if (!await requireAdmin(req, res)) return;
  try {
    const matchId = parseInt(req.params.matchId);
    const {
      preview = false,
      placements = [],
      teamKills = [],
    } = req.body as {
      preview?: boolean;
      placements?: Array<{ registrationId: number; rank: number }>;
      teamKills?: Array<{ registrationId: number; captainKills: number; memberKills?: number[] }>;
    };

    const [match] = await db.select().from(matchesTable).where(eq(matchesTable.id, matchId));
    if (!match) return res.status(404).json({ error: "Match not found." });

    if (!preview && match.prizeDistributed) {
      return res.status(409).json({
        error: "Prizes have already been distributed for this match.",
        alreadyDistributed: true,
        distributedAt: match.prizeDistributedAt,
      });
    }

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

    // Map rank (1, 2, 3) → prize amount. Fallback: split prizePool 50/30/20.
    const prizeByRank: Record<number, number> = {};
    if (prizes.length > 0) {
      prizes.forEach((p, i) => { prizeByRank[i + 1] = Number(p.amount); });
    } else {
      const pool = Number(tournament.prizePool ?? 0);
      if (pool > 0) {
        prizeByRank[1] = parseFloat((pool * 0.50).toFixed(2));
        prizeByRank[2] = parseFloat((pool * 0.30).toFixed(2));
        prizeByRank[3] = parseFloat((pool * 0.20).toFixed(2));
      }
    }

    const perKill = Number(tournament.perKillReward ?? 0);

    const allRegIds = [
      ...new Set([
        ...placements.map((p) => p.registrationId),
        ...teamKills.map((k) => k.registrationId),
      ]),
    ];

    if (allRegIds.length === 0) {
      return res.status(400).json({ error: "No placements or kill data provided." });
    }

    const registrations = await db
      .select()
      .from(registrationsTable)
      .where(inArray(registrationsTable.id, allRegIds));

    const regMap = new Map(registrations.map((r) => [r.id, r]));

    const killMap = new Map<number, { captainKills: number; memberKills: number[] }>();
    for (const k of teamKills) {
      killMap.set(k.registrationId, {
        captainKills: k.captainKills ?? 0,
        memberKills: k.memberKills ?? [],
      });
    }

    const placementMap = new Map<number, number>();
    for (const p of placements) {
      placementMap.set(p.registrationId, p.rank);
    }

    // ─── Build per-team payouts ────────────────────────────────────────────────
    type MemberStat = {
      name: string;
      freefireUid: string | null;
      isLeader: boolean;
      kills: number;
    };

    type TeamPayout = {
      registrationId: number;
      teamName: string;
      rank: number | null;
      rankPrize: number;
      totalKills: number;
      killReward: number;
      grandTotal: number;
      leaderUserId: string | null;
      leaderFound: boolean;
      members: MemberStat[];
    };

    const payouts: TeamPayout[] = [];

    for (const regId of allRegIds) {
      const reg = regMap.get(regId);
      if (!reg) continue;

      const rank = placementMap.get(regId) ?? null;
      const rankPrize = rank ? (prizeByRank[rank] ?? 0) : 0;
      const kills = killMap.get(regId) ?? { captainKills: 0, memberKills: [] };

      const teamMembers: { uid: string; name: string }[] = reg.teamMembers
        ? JSON.parse(reg.teamMembers)
        : [];

      const captKills = kills.captainKills;
      const memberKillsList = kills.memberKills;
      const totalKills = captKills + memberKillsList.reduce((s, k) => s + k, 0);
      const killReward = parseFloat((totalKills * perKill).toFixed(2));
      const grandTotal = parseFloat((rankPrize + killReward).toFixed(2));

      // Build per-member stat list for display / logging
      const memberStats: MemberStat[] = [
        { name: reg.playerName, freefireUid: reg.freefireUid, isLeader: true, kills: captKills },
        ...teamMembers.map((m, i) => ({
          name: m.name,
          freefireUid: m.uid,
          isLeader: false,
          kills: memberKillsList[i] ?? 0,
        })),
      ];

      payouts.push({
        registrationId: regId,
        teamName: reg.playerName,
        rank,
        rankPrize,
        totalKills,
        killReward,
        grandTotal,
        leaderUserId: reg.userId,
        leaderFound: !!reg.userId,
        members: memberStats,
      });
    }

    const totalDistributed = payouts.reduce((sum, p) => sum + p.grandTotal, 0);

    if (preview) {
      return res.json({ preview: true, payouts, totalDistributed, perKill, prizeByRank });
    }

    // ─── Execute distribution ──────────────────────────────────────────────────
    const rankLabel = (rank: number | null) =>
      rank === 1 ? "🥇 1st Place" : rank === 2 ? "🥈 2nd Place" : rank === 3 ? "🥉 3rd Place" : null;

    let txCount = 0;

    for (const payout of payouts) {
      if (!payout.leaderUserId) continue;

      // Rank reward transaction
      if (payout.rankPrize > 0) {
        await db.insert(walletTransactionsTable).values({
          userId: payout.leaderUserId,
          type: "tournament_prize",
          amount: payout.rankPrize.toFixed(2),
          status: "approved",
          notes: `Match #${match.matchNumber} ${rankLabel(payout.rank)} Rank Prize — "${tournament.name}"`,
          tournamentId: match.tournamentId,
          matchId,
        });
        txCount++;
      }

      // Kill reward transaction (all member kills combined → leader)
      if (payout.killReward > 0) {
        const killBreakdown = payout.members
          .filter((m) => m.kills > 0)
          .map((m) => `${m.name} ${m.kills}K`)
          .join(" + ");
        await db.insert(walletTransactionsTable).values({
          userId: payout.leaderUserId,
          type: "tournament_prize",
          amount: payout.killReward.toFixed(2),
          status: "approved",
          notes: `Match #${match.matchNumber} Team Kill Reward (${killBreakdown || `${payout.totalKills}K`}) × ৳${perKill} — "${tournament.name}"`,
          tournamentId: match.tournamentId,
          matchId,
        });
        txCount++;
      }
    }

    // Update registration result fields
    for (const p of placements) {
      const payout = payouts.find((po) => po.registrationId === p.registrationId);
      if (!payout) continue;
      await db
        .update(registrationsTable)
        .set({ resultRank: p.rank, earnedAmount: payout.grandTotal.toFixed(2) })
        .where(eq(registrationsTable.id, p.registrationId));
    }

    // Mark match as prize-distributed and completed
    await db
      .update(matchesTable)
      .set({ prizeDistributed: true, prizeDistributedAt: new Date(), status: "completed" })
      .where(eq(matchesTable.id, matchId));

    res.json({ success: true, payouts, totalDistributed, transactionsCreated: txCount });
  } catch (err) {
    logger.error({ err }, "Failed to distribute prizes");
    res.status(500).json({ error: "Failed to distribute prizes. Please try again." });
  }
});

// ─── Prize distribution report ────────────────────────────────────────────────

router.get("/admin/prize-distributions", async (_req, res) => {
  if (!await requireAdmin(_req, res)) return;
  try {
    const distributedMatches = await db
      .select({
        matchId: matchesTable.id,
        matchNumber: matchesTable.matchNumber,
        serialNumber: matchesTable.serialNumber,
        distributedAt: matchesTable.prizeDistributedAt,
        tournamentId: matchesTable.tournamentId,
        tournamentName: tournamentsTable.name,
        tournamentMode: tournamentsTable.mode,
      })
      .from(matchesTable)
      .innerJoin(tournamentsTable, eq(matchesTable.tournamentId, tournamentsTable.id))
      .where(eq(matchesTable.prizeDistributed, true))
      .orderBy(desc(matchesTable.prizeDistributedAt));

    const report = await Promise.all(
      distributedMatches.map(async (m) => {
        const txs = await db
          .select({
            id: walletTransactionsTable.id,
            userId: walletTransactionsTable.userId,
            amount: walletTransactionsTable.amount,
            notes: walletTransactionsTable.notes,
            createdAt: walletTransactionsTable.createdAt,
            userName: usersTable.displayName,
            username: usersTable.username,
          })
          .from(walletTransactionsTable)
          .leftJoin(usersTable, eq(walletTransactionsTable.userId, usersTable.clerkId))
          .where(
            and(
              eq(walletTransactionsTable.matchId, m.matchId),
              eq(walletTransactionsTable.type, "tournament_prize")
            )
          )
          .orderBy(walletTransactionsTable.createdAt);

        const totalAmount = txs.reduce((sum, t) => sum + Number(t.amount), 0);
        return { ...m, transactions: txs, totalAmount };
      })
    );

    res.json(report);
  } catch (err) {
    logger.error({ err }, "Failed to load prize distributions");
    res.status(500).json({ error: "Failed to load prize distributions." });
  }
});

export default router;
