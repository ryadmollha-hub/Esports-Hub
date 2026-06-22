import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { logger } from "../lib/logger";
import {
  tournamentsTable,
  prizeTiersTable,
  registrationsTable,
  usersTable,
  walletTransactionsTable,
  matchesTable,
} from "@workspace/db";
import { eq, desc, ilike, and, or, sql } from "drizzle-orm";
import {
  CreateTournamentBody,
  UpdateTournamentBody,
  UpdateTournamentRoomBody,
} from "@workspace/api-zod";
import { requireAdmin, requireAuth } from "../middlewares/requireAdmin";
import { getUserBalance } from "./wallet";

const router: IRouter = Router();

// ─── List / Featured ────────────────────────────────────────────────────────

router.get("/tournaments", async (req, res) => {
  try {
    const { status, mode, search, gameMode, page = "1", limit = "20" } = req.query as Record<string, string>;
    const conditions = [];
    if (status) conditions.push(eq(tournamentsTable.status, status));
    if (mode) conditions.push(eq(tournamentsTable.mode, mode));
    if (gameMode) conditions.push(eq(tournamentsTable.gameMode, gameMode));
    if (search) conditions.push(ilike(tournamentsTable.name, `%${search}%`));
    const rows = await db
      .select()
      .from(tournamentsTable)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(tournamentsTable.createdAt))
      .limit(parseInt(limit))
      .offset((parseInt(page) - 1) * parseInt(limit));
    res.json({ tournaments: rows, total: rows.length });
  } catch {
    res.status(500).json({ error: "Failed to load tournaments." });
  }
});

router.get("/tournaments/featured", async (_req, res) => {
  try {
    const rows = await db
      .select()
      .from(tournamentsTable)
      .where(eq(tournamentsTable.status, "upcoming"))
      .orderBy(desc(tournamentsTable.prizePool))
      .limit(3);
    res.json(rows);
  } catch {
    res.status(500).json({ error: "Failed to load featured tournaments." });
  }
});

// ─── Single tournament with prizes ──────────────────────────────────────────

router.get("/tournaments/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [tournament] = await db
      .select()
      .from(tournamentsTable)
      .where(eq(tournamentsTable.id, id));
    if (!tournament) return res.status(404).json({ error: "Tournament not found." });
    const prizes = await db
      .select()
      .from(prizeTiersTable)
      .where(eq(prizeTiersTable.tournamentId, id));
    res.json({ ...tournament, prizes });
  } catch {
    res.status(500).json({ error: "Failed to load tournament details." });
  }
});

// ─── Participants list ───────────────────────────────────────────────────────

router.get("/tournaments/:id/participants", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const rows = await db
      .select({
        id: registrationsTable.id,
        userId: registrationsTable.userId,
        freefireUid: registrationsTable.freefireUid,
        playerName: registrationsTable.playerName,
        status: registrationsTable.status,
        kills: registrationsTable.kills,
        earnedAmount: registrationsTable.earnedAmount,
        resultRank: registrationsTable.resultRank,
        createdAt: registrationsTable.createdAt,
      })
      .from(registrationsTable)
      .where(
        and(
          eq(registrationsTable.tournamentId, id),
          eq(registrationsTable.status, "approved")
        )
      )
      .orderBy(registrationsTable.createdAt);
    res.json(rows);
  } catch {
    res.status(500).json({ error: "Failed to load participants." });
  }
});

// ─── Tournament results (published) ─────────────────────────────────────────

router.get("/tournaments/:id/results", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [tournament] = await db
      .select()
      .from(tournamentsTable)
      .where(eq(tournamentsTable.id, id));
    if (!tournament) return res.status(404).json({ error: "Tournament not found." });
    if (!tournament.resultsPublished) {
      return res.status(404).json({ error: "Results not yet published." });
    }
    const participants = await db
      .select()
      .from(registrationsTable)
      .where(
        and(
          eq(registrationsTable.tournamentId, id),
          eq(registrationsTable.status, "approved")
        )
      );
    // Sort: ranked first (1,2,3), then by kills desc
    const sorted = participants.sort((a, b) => {
      if (a.resultRank && b.resultRank) return a.resultRank - b.resultRank;
      if (a.resultRank) return -1;
      if (b.resultRank) return 1;
      return (b.kills ?? 0) - (a.kills ?? 0);
    });
    res.json({ tournament, results: sorted });
  } catch {
    res.status(500).json({ error: "Failed to load results." });
  }
});

// ─── Join tournament (with entry fee deduction) ──────────────────────────────

router.post("/tournaments/:id/join", async (req, res) => {
  const userId = await requireAuth(req, res);
  if (!userId) return;

  try {
    const id = parseInt(req.params.id);

    const [tournament] = await db
      .select()
      .from(tournamentsTable)
      .where(eq(tournamentsTable.id, id));

    if (!tournament) return res.status(404).json({ error: "Tournament not found." });
    if (tournament.status === "live" || tournament.status === "ongoing") {
      return res.status(400).json({ error: "Registration is closed. Match is already live.", registrationClosed: true });
    }
    if (tournament.status === "ended" || tournament.status === "completed" || tournament.status === "cancelled") {
      return res.status(400).json({ error: "This tournament is no longer accepting players.", registrationClosed: true });
    }

    // Guard: block join if any match has been explicitly set live or completed by admin.
    // This prevents API-bypass joining when tournament-level status hasn't been updated yet.
    const activeMatches = await db
      .select({ id: matchesTable.id, status: matchesTable.status })
      .from(matchesTable)
      .where(and(
        eq(matchesTable.tournamentId, id),
        or(
          eq(matchesTable.status, "live"),
          eq(matchesTable.status, "completed"),
        ),
      ));
    if (activeMatches.some(m => m.status === "live")) {
      return res.status(400).json({ error: "Registration is closed. Match is already live.", registrationClosed: true });
    }
    if (activeMatches.some(m => m.status === "completed")) {
      return res.status(400).json({ error: "This tournament is no longer accepting players.", registrationClosed: true });
    }

    if (tournament.filledSlots >= tournament.maxSlots) {
      return res.status(400).json({ error: "Tournament is full. No slots available." });
    }

    // Duplicate check
    const existing = await db
      .select()
      .from(registrationsTable)
      .where(
        and(
          eq(registrationsTable.tournamentId, id),
          eq(registrationsTable.userId, userId)
        )
      );
    if (existing.length > 0) {
      return res.status(409).json({ error: "You have already joined this tournament." });
    }

    const [userProfile] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.clerkId, userId));

    if (!userProfile) return res.status(401).json({ error: "User not found." });

    const freefireUid = req.body?.freefireUid ?? userProfile.freefireUid;
    const playerName = req.body?.playerName ?? userProfile.displayName ?? userProfile.username ?? "Player";

    if (!freefireUid) {
      return res.status(400).json({
        error: "Please set your Free Fire UID in your profile before joining.",
        requiresProfile: true,
      });
    }

    // For duo/squad: additional team members
    const teamMembers = req.body?.teamMembers ?? null; // Array of {uid, name}
    // Validate team member count based on mode
    if (tournament.mode === "duo" && teamMembers && teamMembers.length !== 1) {
      return res.status(400).json({ error: "Duo tournament requires exactly 2 players (1 additional member)." });
    }
    if (tournament.mode === "squad" && teamMembers && teamMembers.length !== 3) {
      return res.status(400).json({ error: "Squad tournament requires exactly 4 players (3 additional members)." });
    }

    // ── Entry fee check & deduction ──────────────────────────────────────────
    const entryFee = Number(tournament.entryFee);
    if (entryFee > 0) {
      const balance = await getUserBalance(userId);
      if (balance < entryFee) {
        return res.status(400).json({
          error: `Insufficient wallet balance. You need ৳${entryFee} but have ৳${balance.toFixed(2)}.`,
          insufficientBalance: true,
          required: entryFee,
          balance,
        });
      }
      // Deduct entry fee (auto-approved system transaction)
      await db.insert(walletTransactionsTable).values({
        userId,
        type: "tournament_entry",
        amount: String(entryFee),
        status: "approved",
        notes: `Entry fee for "${tournament.name}"`,
        tournamentId: id,
      });
    }

    const [reg] = await db
      .insert(registrationsTable)
      .values({
        tournamentId: id,
        userId,
        freefireUid,
        playerName,
        teamMembers: teamMembers ? JSON.stringify(teamMembers) : null,
        status: "approved",
      })
      .returning();

    await db
      .update(tournamentsTable)
      .set({ filledSlots: sql`${tournamentsTable.filledSlots} + 1` })
      .where(eq(tournamentsTable.id, id));

    res.status(201).json({
      success: true,
      registration: reg,
      entryFeeDeducted: entryFee > 0 ? entryFee : 0,
    });
  } catch {
    res.status(500).json({ error: "Failed to join tournament. Please try again." });
  }
});

// ─── Leave tournament ─────────────────────────────────────────────────────────

router.delete("/tournaments/:id/join", async (req, res) => {
  const userId = await requireAuth(req, res);
  if (!userId) return;

  try {
    const id = parseInt(req.params.id);

    const [tournament] = await db
      .select()
      .from(tournamentsTable)
      .where(eq(tournamentsTable.id, id));

    if (!tournament) return res.status(404).json({ error: "Tournament not found." });
    if (tournament.status === "live" || tournament.status === "ongoing" || tournament.status === "ended" || tournament.status === "completed") {
      return res.status(400).json({ error: "You cannot leave a tournament that is live or ended." });
    }

    const [existing] = await db
      .select()
      .from(registrationsTable)
      .where(
        and(
          eq(registrationsTable.tournamentId, id),
          eq(registrationsTable.userId, userId)
        )
      );

    if (!existing) return res.status(404).json({ error: "You have not joined this tournament." });

    await db
      .delete(registrationsTable)
      .where(eq(registrationsTable.id, existing.id));

    await db
      .update(tournamentsTable)
      .set({ filledSlots: sql`GREATEST(${tournamentsTable.filledSlots} - 1, 0)` })
      .where(eq(tournamentsTable.id, id));

    // Refund entry fee if it was paid
    const entryFee = Number(tournament.entryFee);
    if (entryFee > 0) {
      // Void the entry fee transaction by creating a refund deposit
      await db.insert(walletTransactionsTable).values({
        userId,
        type: "tournament_prize",
        amount: String(entryFee),
        status: "approved",
        notes: `Refund: Left "${tournament.name}" before it started`,
        tournamentId: id,
      });
    }

    res.json({ success: true, refunded: entryFee > 0 ? entryFee : 0 });
  } catch {
    res.status(500).json({ error: "Failed to leave tournament. Please try again." });
  }
});

// ─── Admin: Publish results ───────────────────────────────────────────────────

router.post("/tournaments/:id/publish-results", async (req, res) => {
  if (!await requireAdmin(req, res)) return;
  try {
    const id = parseInt(req.params.id);
    const { results } = req.body as {
      results: Array<{
        registrationId: number;
        kills: number;
        resultRank?: number | null;
      }>
    };

    if (!Array.isArray(results) || results.length === 0) {
      return res.status(400).json({ error: "Results array is required." });
    }

    const [tournament] = await db
      .select()
      .from(tournamentsTable)
      .where(eq(tournamentsTable.id, id));

    if (!tournament) return res.status(404).json({ error: "Tournament not found." });

    const prizes = await db
      .select()
      .from(prizeTiersTable)
      .where(eq(prizeTiersTable.tournamentId, id))
      .orderBy(prizeTiersTable.rank);

    // Map rank index to prize amounts (prize_tiers sorted: 1st=index0, 2nd=index1, 3rd=index2)
    const prizeByRank: Record<number, number> = {};
    prizes.forEach((p, i) => {
      prizeByRank[i + 1] = Number(p.amount);
    });

    const perKill = Number(tournament.perKillReward ?? 0);

    // Update each participant
    for (const r of results) {
      const killBonus = perKill * (r.kills ?? 0);
      const rankPrize = r.resultRank ? (prizeByRank[r.resultRank] ?? 0) : 0;
      const totalEarned = rankPrize + killBonus;

      await db
        .update(registrationsTable)
        .set({
          kills: r.kills ?? 0,
          resultRank: r.resultRank ?? null,
          earnedAmount: String(totalEarned),
        })
        .where(eq(registrationsTable.id, r.registrationId));

      // Pay out prizes to winner wallets
      if (totalEarned > 0) {
        const [reg] = await db
          .select()
          .from(registrationsTable)
          .where(eq(registrationsTable.id, r.registrationId));

        if (reg) {
          const rankLabel = r.resultRank === 1 ? "🥇 1st" : r.resultRank === 2 ? "🥈 2nd" : r.resultRank === 3 ? "🥉 3rd" : null;
          const prizeNotes = [
            rankLabel ? `${rankLabel} Place prize in "${tournament.name}"` : null,
            killBonus > 0 ? `Kill bonus: ${r.kills} kills × ৳${perKill} in "${tournament.name}"` : null,
          ].filter(Boolean).join(" + ");

          await db.insert(walletTransactionsTable).values({
            userId: reg.userId,
            type: "tournament_prize",
            amount: String(totalEarned),
            status: "approved",
            notes: prizeNotes || `Tournament prize from "${tournament.name}"`,
            tournamentId: id,
          });
        }
      }
    }

    // Set top 3 winner (1st place)
    const first = results.find((r) => r.resultRank === 1);
    let winnerId: string | null = null;
    let winnerName: string | null = null;
    if (first) {
      const [reg] = await db
        .select()
        .from(registrationsTable)
        .where(eq(registrationsTable.id, first.registrationId));
      if (reg) { winnerId = reg.userId; winnerName = reg.playerName; }
    }

    // Mark results published + ended
    await db
      .update(tournamentsTable)
      .set({
        resultsPublished: true,
        status: "ended",
        ...(winnerId ? { winnerId, winnerName } : {}),
      })
      .where(eq(tournamentsTable.id, id));

    res.json({ success: true, participantsUpdated: results.length });
  } catch (err) {
    logger.error({ err }, "Failed to publish results");
    res.status(500).json({ error: "Failed to publish results." });
  }
});

// ─── Admin: Set winner manually ──────────────────────────────────────────────

router.post("/tournaments/:id/winner", async (req, res) => {
  if (!await requireAdmin(req, res)) return;
  try {
    const id = parseInt(req.params.id);
    const { userId, playerName } = req.body;
    if (!userId || !playerName) {
      return res.status(400).json({ error: "userId and playerName are required." });
    }
    const [updated] = await db
      .update(tournamentsTable)
      .set({ winnerId: userId, winnerName: playerName })
      .where(eq(tournamentsTable.id, id))
      .returning();
    if (!updated) return res.status(404).json({ error: "Tournament not found." });
    res.json({ success: true, winnerId: updated.winnerId, winnerName: updated.winnerName });
  } catch {
    res.status(500).json({ error: "Failed to set winner." });
  }
});

// ─── Admin: Auto-select random winner ────────────────────────────────────────

router.post("/tournaments/:id/auto-winner", async (req, res) => {
  if (!await requireAdmin(req, res)) return;
  try {
    const id = parseInt(req.params.id);
    const participants = await db
      .select()
      .from(registrationsTable)
      .where(
        and(
          eq(registrationsTable.tournamentId, id),
          eq(registrationsTable.status, "approved")
        )
      );
    if (participants.length === 0) {
      return res.status(400).json({ error: "No participants to select winner from." });
    }
    const winner = participants[Math.floor(Math.random() * participants.length)];
    const [updated] = await db
      .update(tournamentsTable)
      .set({ winnerId: winner.userId, winnerName: winner.playerName, autoWinner: true })
      .where(eq(tournamentsTable.id, id))
      .returning();
    res.json({ success: true, winnerId: updated.winnerId, winnerName: updated.winnerName });
  } catch {
    res.status(500).json({ error: "Failed to auto-select winner." });
  }
});

// ─── Admin: Clear winner ─────────────────────────────────────────────────────

router.delete("/tournaments/:id/winner", async (req, res) => {
  if (!await requireAdmin(req, res)) return;
  try {
    const id = parseInt(req.params.id);
    await db
      .update(tournamentsTable)
      .set({ winnerId: null, winnerName: null, autoWinner: false })
      .where(eq(tournamentsTable.id, id));
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Failed to clear winner." });
  }
});

// ─── Admin CRUD ───────────────────────────────────────────────────────────────

router.post("/tournaments", async (req, res) => {
  if (!await requireAdmin(req, res)) return;
  try {
    const data = CreateTournamentBody.parse(req.body);
    const [created] = await db.insert(tournamentsTable).values({
      name: data.name,
      description: data.description ?? null,
      mode: data.mode ?? "squad",
      status: (data as any).status ?? "upcoming",
      startDate: new Date(data.startDate),
      endDate: data.endDate ? new Date(data.endDate) : null,
      maxSlots: data.maxSlots ?? 100,
      prizePool: data.prizePool?.toString() ?? "0",
      entryFee: data.entryFee?.toString() ?? "0",
      perKillReward: (data as any).perKillReward?.toString() ?? "0",
      bannerUrl: data.bannerUrl ?? null,
      countdownTo: data.countdownTo ? new Date(data.countdownTo) : null,
      gameMode: data.gameMode ?? null,
    }).returning();
    if (data.prizes && data.prizes.length > 0) {
      await db.insert(prizeTiersTable).values(
        data.prizes.map((p: any) => ({
          tournamentId: created.id,
          rank: p.rank,
          amount: p.amount.toString(),
          percentage: p.percentage?.toString() ?? null,
          description: p.description ?? null,
        }))
      );
    }
    res.status(201).json(created);
  } catch (err: any) {
    if (err?.name === "ZodError") {
      return res.status(400).json({ error: "Invalid tournament data. Please check all fields." });
    }
    res.status(500).json({ error: "Failed to create tournament. Please try again." });
  }
});

router.put("/tournaments/:id", async (req, res) => {
  if (!await requireAdmin(req, res)) return;
  try {
    const id = parseInt(req.params.id);
    const data = UpdateTournamentBody.parse(req.body);
    const [updated] = await db
      .update(tournamentsTable)
      .set({
        ...(data.name && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.mode && { mode: data.mode }),
        ...(data.status && { status: data.status }),
        ...(data.startDate && { startDate: new Date(data.startDate) }),
        ...(data.endDate && { endDate: new Date(data.endDate) }),
        ...(data.maxSlots !== undefined && { maxSlots: data.maxSlots }),
        ...(data.prizePool !== undefined && { prizePool: data.prizePool.toString() }),
        ...(data.entryFee !== undefined && { entryFee: data.entryFee.toString() }),
        ...((data as any).perKillReward !== undefined && { perKillReward: (data as any).perKillReward.toString() }),
        ...(data.bannerUrl !== undefined && { bannerUrl: data.bannerUrl }),
        ...(data.countdownTo && { countdownTo: new Date(data.countdownTo) }),
        ...(data.gameMode !== undefined && { gameMode: data.gameMode || null }),
      })
      .where(eq(tournamentsTable.id, id))
      .returning();
    if (!updated) return res.status(404).json({ error: "Tournament not found." });

    // Update prize tiers if provided (replace existing ones)
    if ((data as any).prizes && Array.isArray((data as any).prizes) && (data as any).prizes.length > 0) {
      await db.delete(prizeTiersTable).where(eq(prizeTiersTable.tournamentId, id));
      await db.insert(prizeTiersTable).values(
        (data as any).prizes
          .filter((p: any) => p && p.amount)
          .map((p: any) => ({
            tournamentId: id,
            rank: p.rank,
            amount: p.amount.toString(),
            percentage: p.percentage?.toString() ?? null,
            description: p.description ?? null,
          }))
      );
    }

    res.json(updated);
  } catch (err: any) {
    if (err?.name === "ZodError") {
      return res.status(400).json({ error: "Invalid tournament data. Please check all fields." });
    }
    res.status(500).json({ error: "Failed to update tournament. Please try again." });
  }
});

router.delete("/tournaments/:id", async (req, res) => {
  if (!await requireAdmin(req, res)) return;
  try {
    const id = parseInt(req.params.id);
    await db.delete(tournamentsTable).where(eq(tournamentsTable.id, id));
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Failed to delete tournament." });
  }
});

router.patch("/tournaments/:id/room", async (req, res) => {
  if (!await requireAdmin(req, res)) return;
  try {
    const id = parseInt(req.params.id);
    const data = UpdateTournamentRoomBody.parse(req.body);
    const [updated] = await db
      .update(tournamentsTable)
      .set({
        roomId: data.roomId ?? null,
        roomPassword: data.roomPassword ?? null,
      })
      .where(eq(tournamentsTable.id, id))
      .returning();
    if (!updated) return res.status(404).json({ error: "Tournament not found." });
    res.json({ success: true, roomId: updated.roomId, roomPassword: updated.roomPassword });
  } catch {
    res.status(500).json({ error: "Failed to update room details." });
  }
});

export default router;
