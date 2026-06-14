import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  tournamentsTable,
  prizeTiersTable,
  registrationsTable,
  usersTable,
} from "@workspace/db";
import { eq, desc, ilike, and, sql } from "drizzle-orm";
import {
  CreateTournamentBody,
  UpdateTournamentBody,
  UpdateTournamentRoomBody,
} from "@workspace/api-zod";
import { requireAdmin, requireAuth } from "../middlewares/requireAdmin";

const router: IRouter = Router();

// ─── List / Featured ────────────────────────────────────────────────────────

router.get("/tournaments", async (req, res) => {
  try {
    const { status, mode, search, page = "1", limit = "20" } = req.query as Record<string, string>;
    const conditions = [];
    if (status) conditions.push(eq(tournamentsTable.status, status));
    if (mode) conditions.push(eq(tournamentsTable.mode, mode));
    if (search) conditions.push(ilike(tournamentsTable.name, `%${search}%`));
    const rows = await db
      .select()
      .from(tournamentsTable)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(tournamentsTable.createdAt))
      .limit(parseInt(limit))
      .offset((parseInt(page) - 1) * parseInt(limit));
    res.json(rows);
  } catch (err) {
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

// ─── Single tournament with prizes + winner ─────────────────────────────────

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

// ─── Join tournament ─────────────────────────────────────────────────────────

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
    if (tournament.status === "ended" || tournament.status === "cancelled") {
      return res.status(400).json({ error: "This tournament is no longer accepting players." });
    }
    if (tournament.filledSlots >= tournament.maxSlots) {
      return res.status(400).json({ error: "Tournament is full. No slots available." });
    }

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

    const freefireUid = userProfile.freefireUid ?? req.body?.freefireUid;
    const playerName = userProfile.displayName ?? userProfile.username ?? req.body?.playerName ?? "Player";

    if (!freefireUid) {
      return res.status(400).json({
        error: "Please set your Free Fire UID in your profile before joining.",
        requiresProfile: true,
      });
    }

    const [reg] = await db
      .insert(registrationsTable)
      .values({
        tournamentId: id,
        userId,
        freefireUid,
        playerName,
        status: "approved",
      })
      .returning();

    await db
      .update(tournamentsTable)
      .set({ filledSlots: sql`${tournamentsTable.filledSlots} + 1` })
      .where(eq(tournamentsTable.id, id));

    res.status(201).json({ success: true, registration: reg });
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
    if (tournament.status === "live" || tournament.status === "ended") {
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

    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Failed to leave tournament. Please try again." });
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
      status: data.status ?? "upcoming",
      startDate: new Date(data.startDate),
      endDate: data.endDate ? new Date(data.endDate) : null,
      maxSlots: data.maxSlots ?? 100,
      prizePool: data.prizePool?.toString() ?? "0",
      entryFee: data.entryFee?.toString() ?? "0",
      perKillReward: (data as any).perKillReward?.toString() ?? "0",
      bannerUrl: data.bannerUrl ?? null,
      countdownTo: data.countdownTo ? new Date(data.countdownTo) : null,
    }).returning();
    if (data.prizes && data.prizes.length > 0) {
      await db.insert(prizeTiersTable).values(
        data.prizes.map((p: { rank: string; amount: number; percentage?: number; description?: string }) => ({
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
      })
      .where(eq(tournamentsTable.id, id))
      .returning();
    if (!updated) return res.status(404).json({ error: "Tournament not found." });
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
