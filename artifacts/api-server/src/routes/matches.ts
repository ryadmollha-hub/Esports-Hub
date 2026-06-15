import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { matchesTable, matchResultsTable, tournamentsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { requireAdmin } from "../middlewares/requireAdmin";

const router: IRouter = Router();

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
        return { ...m, results };
      })
    );
    res.json(result);
  } catch {
    res.status(500).json({ error: "Failed to load matches." });
  }
});

// ─── Create match (admin) ────────────────────────────────────────────────────

router.post("/tournaments/:id/matches", async (req, res) => {
  if (!await requireAdmin(req, res)) return;
  try {
    const id = parseInt(req.params.id);
    const { matchNumber, scheduledAt, mapName, status } = req.body;
    if (!matchNumber || !scheduledAt) {
      return res.status(400).json({ error: "matchNumber and scheduledAt are required." });
    }
    const [match] = await db
      .insert(matchesTable)
      .values({
        tournamentId: id,
        matchNumber: parseInt(matchNumber),
        scheduledAt: new Date(scheduledAt),
        status: status ?? "scheduled",
        mapName: mapName ?? null,
      })
      .returning();
    res.status(201).json(match);
  } catch {
    res.status(500).json({ error: "Failed to create match." });
  }
});

// ─── Update match (admin) ─────────────────────────────────────────────────────

router.patch("/matches/:id", async (req, res) => {
  if (!await requireAdmin(req, res)) return;
  try {
    const id = parseInt(req.params.id);
    const { matchNumber, scheduledAt, mapName, status } = req.body;
    const [updated] = await db
      .update(matchesTable)
      .set({
        ...(matchNumber !== undefined && { matchNumber: parseInt(matchNumber) }),
        ...(scheduledAt && { scheduledAt: new Date(scheduledAt) }),
        ...(mapName !== undefined && { mapName }),
        ...(status && { status }),
      })
      .where(eq(matchesTable.id, id))
      .returning();
    if (!updated) return res.status(404).json({ error: "Match not found." });
    res.json(updated);
  } catch {
    res.status(500).json({ error: "Failed to update match." });
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

    // Mark match completed
    await db.update(matchesTable)
      .set({ status: "completed" })
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
        points: r.points,
      }))
    );

    // Return updated match with results
    const [match] = await db.select().from(matchesTable).where(eq(matchesTable.id, id));
    const savedResults = await db
      .select()
      .from(matchResultsTable)
      .where(eq(matchResultsTable.matchId, id))
      .orderBy(matchResultsTable.rank);

    res.json({ success: true, match: { ...match, results: savedResults } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to save results." });
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

    // Attach results for completed matches
    const result = await Promise.all(
      matches.map(async (m) => {
        if (m.status === "completed") {
          const results = await db
            .select()
            .from(matchResultsTable)
            .where(eq(matchResultsTable.matchId, m.id))
            .orderBy(matchResultsTable.rank);
          return { ...m, results };
        }
        return { ...m, results: [] };
      })
    );

    res.json(result);
  } catch {
    res.status(500).json({ error: "Failed to load schedule." });
  }
});

export default router;
