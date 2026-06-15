import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { matchesTable, matchResultsTable, tournamentsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { requireAdmin } from "../middlewares/requireAdmin";

const router: IRouter = Router();

// Helper: compute effective match status and whether room should be visible
function computeMatchVisibility(match: typeof matchesTable.$inferSelect) {
  const now = new Date();
  const isCompleted = match.status === "completed";

  // Room details are visible if:
  // 1. roomReleaseAt is set AND current time >= roomReleaseAt
  // 2. OR match is live
  // 3. But NOT if completed (room hidden after results)
  let roomVisible = false;
  let effectiveStatus = match.status;

  if (!isCompleted && match.roomId) {
    if (match.roomReleaseAt && now >= new Date(match.roomReleaseAt)) {
      roomVisible = true;
      // Auto-promote to live if was scheduled
      if (effectiveStatus === "scheduled") {
        effectiveStatus = "live";
      }
    } else if (match.status === "live") {
      roomVisible = true;
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

        // Auto-update status to live in DB if needed
        if (effectiveStatus !== m.status && effectiveStatus === "live") {
          await db.update(matchesTable)
            .set({ status: "live" })
            .where(eq(matchesTable.id, m.id));
        }

        return {
          ...m,
          status: effectiveStatus,
          roomId: roomVisible ? m.roomId : null,
          roomPassword: roomVisible ? m.roomPassword : null,
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
    if (!matchNumber || !scheduledAt) {
      return res.status(400).json({ error: "matchNumber and scheduledAt are required." });
    }

    // Default roomReleaseAt: 10 minutes before scheduledAt if not provided
    let releaseAt: Date | null = null;
    if (roomReleaseAt) {
      releaseAt = new Date(roomReleaseAt);
    } else if (roomId && scheduledAt) {
      releaseAt = new Date(new Date(scheduledAt).getTime() - 10 * 60 * 1000);
    }

    const [match] = await db
      .insert(matchesTable)
      .values({
        tournamentId: id,
        matchNumber: parseInt(matchNumber),
        scheduledAt: new Date(scheduledAt),
        status: status ?? "scheduled",
        mapName: mapName ?? null,
        roomId: roomId ?? null,
        roomPassword: roomPassword ?? null,
        roomReleaseAt: releaseAt,
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
    res.json(updated);
  } catch {
    res.status(500).json({ error: "Failed to update match." });
  }
});

// ─── Set room details for a match (admin) ────────────────────────────────────

router.patch("/matches/:id/room", async (req, res) => {
  if (!await requireAdmin(req, res)) return;
  try {
    const id = parseInt(req.params.id);
    const { roomId, roomPassword, roomReleaseMinutesBefore } = req.body;

    const [existing] = await db.select().from(matchesTable).where(eq(matchesTable.id, id));
    if (!existing) return res.status(404).json({ error: "Match not found." });

    // Calculate release time based on minutes before scheduled time
    const minutesBefore = roomReleaseMinutesBefore ?? 10;
    const releaseAt = new Date(new Date(existing.scheduledAt).getTime() - minutesBefore * 60 * 1000);

    const [updated] = await db
      .update(matchesTable)
      .set({
        roomId: roomId ?? null,
        roomPassword: roomPassword ?? null,
        roomReleaseAt: releaseAt,
        // If setting room details manually, also mark as live
        status: "live",
      })
      .where(eq(matchesTable.id, id))
      .returning();
    res.json({ success: true, match: updated });
  } catch {
    res.status(500).json({ error: "Failed to update room details." });
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
