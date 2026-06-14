import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  tournamentsTable,
  prizeTiersTable,
  registrationsTable,
  usersTable,
} from "@workspace/db";
import { eq, desc, ilike, and } from "drizzle-orm";
import {
  CreateTournamentBody,
  UpdateTournamentBody,
  UpdateTournamentRoomBody,
} from "@workspace/api-zod";
import { requireAdmin } from "../middlewares/requireAdmin";

const router: IRouter = Router();

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
