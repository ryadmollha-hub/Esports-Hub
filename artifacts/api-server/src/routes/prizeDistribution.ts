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

    // Map rank (1, 2, 3) → prize amount using array position
    const prizeByRank: Record<number, number> = {};
    prizes.forEach((p, i) => { prizeByRank[i + 1] = Number(p.amount); });

    const perKill = Number(tournament.perKillReward ?? 0);

    // Collect all registration IDs involved
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

    // Collect all additional-member freefireUids for batch userId lookup
    const allUids: string[] = [];
    for (const regId of allRegIds) {
      const reg = regMap.get(regId);
      if (!reg?.teamMembers) continue;
      const members = JSON.parse(reg.teamMembers) as { uid: string; name: string }[];
      for (const m of members) { if (m.uid) allUids.push(m.uid); }
    }

    const uidToUserId = new Map<string, string>();
    if (allUids.length > 0) {
      const found = await db
        .select({ clerkId: usersTable.clerkId, freefireUid: usersTable.freefireUid })
        .from(usersTable)
        .where(inArray(usersTable.freefireUid, allUids));
      for (const u of found) {
        if (u.freefireUid) uidToUserId.set(u.freefireUid, u.clerkId);
      }
    }

    // Build per-team payouts
    type MemberPayout = {
      name: string;
      userId: string | null;
      freefireUid: string | null;
      isCapt: boolean;
      kills: number;
      rankShare: number;
      killReward: number;
      totalReward: number;
      userFound: boolean;
    };
    type TeamPayout = {
      registrationId: number;
      teamName: string;
      rank: number | null;
      rankPrize: number;
      totalMembers: number;
      memberPayouts: MemberPayout[];
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
      const totalMembers = 1 + teamMembers.length;
      const rankShare = totalMembers > 0 ? rankPrize / totalMembers : 0;

      const memberPayouts: MemberPayout[] = [];

      // Captain
      const captKills = kills.captainKills;
      const captKillReward = captKills * perKill;
      memberPayouts.push({
        name: reg.playerName,
        userId: reg.userId,
        freefireUid: reg.freefireUid,
        isCapt: true,
        kills: captKills,
        rankShare,
        killReward: captKillReward,
        totalReward: rankShare + captKillReward,
        userFound: true,
      });

      // Additional team members
      for (let i = 0; i < teamMembers.length; i++) {
        const member = teamMembers[i];
        const mKills = kills.memberKills[i] ?? 0;
        const mKillReward = mKills * perKill;
        const mUserId = uidToUserId.get(member.uid) ?? null;
        memberPayouts.push({
          name: member.name,
          userId: mUserId,
          freefireUid: member.uid,
          isCapt: false,
          kills: mKills,
          rankShare,
          killReward: mKillReward,
          totalReward: rankShare + mKillReward,
          userFound: !!mUserId,
        });
      }

      payouts.push({
        registrationId: regId,
        teamName: reg.playerName,
        rank,
        rankPrize,
        totalMembers,
        memberPayouts,
      });
    }

    const totalDistributed = payouts.reduce(
      (sum, p) => sum + p.memberPayouts.reduce((s, m) => s + m.totalReward, 0),
      0
    );

    if (preview) {
      return res.json({ preview: true, payouts, totalDistributed, perKill, prizeByRank });
    }

    // ─── Execute distribution ──────────────────────────────────────────────────
    const rankLabel = (rank: number | null) =>
      rank === 1 ? "🥇 1st Place" : rank === 2 ? "🥈 2nd Place" : rank === 3 ? "🥉 3rd Place" : null;

    let txCount = 0;
    for (const payout of payouts) {
      for (const member of payout.memberPayouts) {
        if (!member.userId) continue; // skip members without platform accounts

        if (member.rankShare > 0) {
          await db.insert(walletTransactionsTable).values({
            userId: member.userId,
            type: "tournament_prize",
            amount: member.rankShare.toFixed(2),
            status: "approved",
            notes: `Match #${match.matchNumber} ${rankLabel(payout.rank)} Winning Share — "${tournament.name}"`,
            tournamentId: match.tournamentId,
            matchId: matchId,
          });
          txCount++;
        }

        if (member.killReward > 0) {
          await db.insert(walletTransactionsTable).values({
            userId: member.userId,
            type: "tournament_prize",
            amount: member.killReward.toFixed(2),
            status: "approved",
            notes: `Match #${match.matchNumber} Kill Reward — ${member.kills} kills × ৳${perKill} — "${tournament.name}"`,
            tournamentId: match.tournamentId,
            matchId: matchId,
          });
          txCount++;
        }
      }
    }

    // Update registration result fields for placed teams
    for (const p of placements) {
      const payout = payouts.find((po) => po.registrationId === p.registrationId);
      if (!payout) continue;
      const captTotal = payout.memberPayouts[0]?.totalReward ?? 0;
      await db
        .update(registrationsTable)
        .set({ resultRank: p.rank, earnedAmount: captTotal.toFixed(2) })
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
