import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  registrationsTable,
  tournamentsTable,
  teamsTable,
  usersTable,
} from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { RegisterForTournamentBody } from "@workspace/api-zod";
import { safeGetUserId } from "../lib/clerkAuth";

const router: IRouter = Router();

router.get("/tournaments/:id/registrations", async (req, res) => {
  const id = parseInt(req.params.id);
  const { status } = req.query as Record<string, string>;
  const conditions: ReturnType<typeof eq>[] = [eq(registrationsTable.tournamentId, id)];
  if (status) conditions.push(eq(registrationsTable.status, status));
  const rows = await db
    .select()
    .from(registrationsTable)
    .where(and(...conditions));
  res.json(rows);
});

router.post("/tournaments/:id/registrations", async (req, res) => {
  const userId = safeGetUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  const id = parseInt(req.params.id);
  const data = RegisterForTournamentBody.parse(req.body);
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
    return res.status(409).json({ error: "Already registered for this tournament" });
  }
  const [reg] = await db
    .insert(registrationsTable)
    .values({
      tournamentId: id,
      userId,
      teamId: data.teamId ?? null,
      freefireUid: data.freefireUid,
      playerName: data.playerName,
      paymentScreenshot: data.paymentScreenshot ?? null,
      status: "pending",
    })
    .returning();
  res.status(201).json(reg);
});

router.post("/registrations/:id/approve", async (req, res) => {
  const userId = safeGetUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  const user = await db.select().from(usersTable).where(eq(usersTable.clerkId, userId));
  if (!user[0]?.isAdmin) return res.status(403).json({ error: "Forbidden" });
  const id = parseInt(req.params.id);
  const [reg] = await db
    .select()
    .from(registrationsTable)
    .where(eq(registrationsTable.id, id));
  if (!reg) return res.status(404).json({ error: "Registration not found" });
  await db
    .update(registrationsTable)
    .set({ status: "approved" })
    .where(eq(registrationsTable.id, id));
  await db
    .update(tournamentsTable)
    .set({ filledSlots: db.$count(registrationsTable, and(eq(registrationsTable.tournamentId, reg.tournamentId), eq(registrationsTable.status, "approved"))) })
    .where(eq(tournamentsTable.id, reg.tournamentId));
  res.json({ success: true });
});

router.post("/registrations/:id/reject", async (req, res) => {
  const userId = safeGetUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  const user = await db.select().from(usersTable).where(eq(usersTable.clerkId, userId));
  if (!user[0]?.isAdmin) return res.status(403).json({ error: "Forbidden" });
  const id = parseInt(req.params.id);
  await db
    .update(registrationsTable)
    .set({ status: "rejected" })
    .where(eq(registrationsTable.id, id));
  res.json({ success: true });
});

router.get("/registrations/me", async (req, res) => {
  const userId = safeGetUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  const rows = await db
    .select({
      id: registrationsTable.id,
      tournamentId: registrationsTable.tournamentId,
      userId: registrationsTable.userId,
      teamId: registrationsTable.teamId,
      status: registrationsTable.status,
      freefireUid: registrationsTable.freefireUid,
      playerName: registrationsTable.playerName,
      paymentScreenshot: registrationsTable.paymentScreenshot,
      createdAt: registrationsTable.createdAt,
      tournament: {
        id: tournamentsTable.id,
        name: tournamentsTable.name,
        mode: tournamentsTable.mode,
        status: tournamentsTable.status,
        startDate: tournamentsTable.startDate,
        prizePool: tournamentsTable.prizePool,
        bannerUrl: tournamentsTable.bannerUrl,
      },
    })
    .from(registrationsTable)
    .innerJoin(tournamentsTable, eq(registrationsTable.tournamentId, tournamentsTable.id))
    .where(eq(registrationsTable.userId, userId));
  res.json(rows);
});

export default router;
