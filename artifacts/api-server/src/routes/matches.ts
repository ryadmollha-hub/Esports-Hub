import { Router, type IRouter } from "express";
import { getAuth } from "@clerk/express";
import { db } from "@workspace/db";
import { matchesTable, matchResultsTable, tournamentsTable, usersTable } from "@workspace/db";
import { eq, gte, desc } from "drizzle-orm";
import { CreateMatchBody, UpdateMatchResultsBody } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/tournaments/:id/matches", async (req, res) => {
  const id = parseInt(req.params.id);
  const matches = await db
    .select()
    .from(matchesTable)
    .where(eq(matchesTable.tournamentId, id));
  const result = await Promise.all(
    matches.map(async (m) => {
      const results = await db
        .select()
        .from(matchResultsTable)
        .where(eq(matchResultsTable.matchId, m.id));
      return { ...m, results };
    })
  );
  res.json(result);
});

router.post("/tournaments/:id/matches", async (req, res) => {
  const { userId } = getAuth(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  const user = await db.select().from(usersTable).where(eq(usersTable.clerkId, userId));
  if (!user[0]?.isAdmin) return res.status(403).json({ error: "Forbidden" });
  const id = parseInt(req.params.id);
  const data = CreateMatchBody.parse(req.body);
  const [match] = await db
    .insert(matchesTable)
    .values({
      tournamentId: id,
      matchNumber: data.matchNumber,
      scheduledAt: new Date(data.scheduledAt),
      status: data.status ?? "scheduled",
      mapName: data.mapName ?? null,
    })
    .returning();
  res.status(201).json(match);
});

router.patch("/matches/:id/results", async (req, res) => {
  const { userId } = getAuth(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  const user = await db.select().from(usersTable).where(eq(usersTable.clerkId, userId));
  if (!user[0]?.isAdmin) return res.status(403).json({ error: "Forbidden" });
  const id = parseInt(req.params.id);
  const data = UpdateMatchResultsBody.parse(req.body);
  await db.update(matchesTable).set({ status: "completed" }).where(eq(matchesTable.id, id));
  if (data.results && data.results.length > 0) {
    await db.delete(matchResultsTable).where(eq(matchResultsTable.matchId, id));
    await db.insert(matchResultsTable).values(
      data.results.map((r: { teamId?: number; userId?: string; playerName: string; rank: number; kills: number; points: number }) => ({
        matchId: id,
        teamId: r.teamId ?? null,
        userId: r.userId ?? null,
        playerName: r.playerName,
        rank: r.rank,
        kills: r.kills,
        points: r.points,
      }))
    );
  }
  res.json({ success: true });
});

router.get("/matches/schedule", async (_req, res) => {
  const now = new Date();
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
  res.json(matches);
});

export default router;
