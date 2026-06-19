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
import { validateBase64Image } from "../lib/fileValidator";
import { audit } from "../lib/auditLog";

const router: IRouter = Router();

router.get("/tournaments/:id/registrations", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { status } = req.query as Record<string, string>;
    const conditions: ReturnType<typeof eq>[] = [eq(registrationsTable.tournamentId, id)];
    if (status) conditions.push(eq(registrationsTable.status, status));
    const rows = await db
      .select()
      .from(registrationsTable)
      .where(and(...conditions));
    res.json(rows);
  } catch {
    res.status(500).json({ error: "Failed to fetch registrations." });
  }
});

router.post("/tournaments/:id/registrations", async (req, res) => {
  try {
    const userId = safeGetUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const id = parseInt(req.params.id);
    let data: ReturnType<typeof RegisterForTournamentBody.parse>;
    try {
      data = RegisterForTournamentBody.parse(req.body);
    } catch (zodErr: any) {
      return res.status(400).json({ error: "Invalid registration data.", details: zodErr.errors });
    }

    const [tournament] = await db.select().from(tournamentsTable).where(eq(tournamentsTable.id, id)).limit(1);
    if (!tournament) return res.status(404).json({ error: "Tournament not found." });
    if (tournament.status === "ended" || tournament.status === "cancelled") {
      return res.status(400).json({ error: "This tournament is no longer accepting registrations." });
    }
    if (tournament.filledSlots >= tournament.maxSlots) {
      return res.status(400).json({ error: "This tournament is full." });
    }

    const existing = await db
      .select({ id: registrationsTable.id })
      .from(registrationsTable)
      .where(and(
        eq(registrationsTable.tournamentId, id),
        eq(registrationsTable.userId, userId)
      ));
    if (existing.length > 0) {
      return res.status(409).json({ error: "You are already registered for this tournament." });
    }

    const uidDuplicate = await db
      .select({ id: registrationsTable.id })
      .from(registrationsTable)
      .where(and(
        eq(registrationsTable.tournamentId, id),
        eq(registrationsTable.freefireUid, data.freefireUid)
      ));
    if (uidDuplicate.length > 0) {
      return res.status(409).json({ error: "This Free Fire UID is already registered for this tournament." });
    }

    if (data.paymentScreenshot) {
      const imgCheck = validateBase64Image(data.paymentScreenshot);
      if (!imgCheck.valid) {
        return res.status(400).json({ error: imgCheck.error ?? "Invalid screenshot." });
      }
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

    await audit("user.tournament.registered", {
      userId,
      req,
      details: { tournamentId: id, freefireUid: data.freefireUid },
    });

    res.status(201).json(reg);
  } catch {
    res.status(500).json({ error: "Registration failed. Please try again." });
  }
});

router.post("/registrations/:id/approve", async (req, res) => {
  try {
    const userId = safeGetUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    const user = await db.select().from(usersTable).where(eq(usersTable.clerkId, userId));
    if (!user[0]?.isAdmin) return res.status(403).json({ error: "Forbidden" });

    const id = parseInt(req.params.id);
    const [reg] = await db.select().from(registrationsTable).where(eq(registrationsTable.id, id));
    if (!reg) return res.status(404).json({ error: "Registration not found" });
    if (reg.status === "approved") return res.status(400).json({ error: "Registration is already approved." });

    await db.update(registrationsTable).set({ status: "approved" }).where(eq(registrationsTable.id, id));
    await db
      .update(tournamentsTable)
      .set({ filledSlots: db.$count(registrationsTable, and(eq(registrationsTable.tournamentId, reg.tournamentId), eq(registrationsTable.status, "approved"))) })
      .where(eq(tournamentsTable.id, reg.tournamentId));

    await audit("admin.registration.approved", { userId, req, details: { registrationId: id } });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Failed to approve registration." });
  }
});

router.post("/registrations/:id/reject", async (req, res) => {
  try {
    const userId = safeGetUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    const user = await db.select().from(usersTable).where(eq(usersTable.clerkId, userId));
    if (!user[0]?.isAdmin) return res.status(403).json({ error: "Forbidden" });

    const id = parseInt(req.params.id);
    const [reg] = await db.select().from(registrationsTable).where(eq(registrationsTable.id, id));
    if (!reg) return res.status(404).json({ error: "Registration not found" });
    if (reg.status === "approved") return res.status(400).json({ error: "Cannot reject an already approved registration." });

    await db.update(registrationsTable).set({ status: "rejected" }).where(eq(registrationsTable.id, id));
    await audit("admin.registration.rejected", { userId, req, details: { registrationId: id } });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Failed to reject registration." });
  }
});

router.patch("/registrations/:id/match-number", async (req, res) => {
  try {
    const userId = safeGetUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    const user = await db.select().from(usersTable).where(eq(usersTable.clerkId, userId));
    if (!user[0]?.isAdmin) return res.status(403).json({ error: "Forbidden" });

    const id = parseInt(req.params.id);
    const { matchNumber } = req.body;
    const [reg] = await db.select().from(registrationsTable).where(eq(registrationsTable.id, id));
    if (!reg) return res.status(404).json({ error: "Registration not found" });

    const parsed = matchNumber != null && matchNumber !== "" ? parseInt(String(matchNumber)) : null;
    await db.update(registrationsTable).set({ matchNumber: parsed }).where(eq(registrationsTable.id, id));
    res.json({ success: true, matchNumber: parsed });
  } catch {
    res.status(500).json({ error: "Failed to update match number." });
  }
});

router.get("/registrations/me", async (req, res) => {
  try {
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
  } catch {
    res.status(500).json({ error: "Failed to fetch your registrations." });
  }
});

export default router;
