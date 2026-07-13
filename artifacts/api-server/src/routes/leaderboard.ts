import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { matchResultsTable, matchesTable, usersTable, teamsTable } from "@workspace/db";
import { eq, desc, sum, sql } from "drizzle-orm";

const router: IRouter = Router();

router.get(["/leaderboard", "/leaderboard/global"], async (_req, res) => {
  const rows = await db
    .select({
      userId: matchResultsTable.userId,
      playerName: matchResultsTable.playerName,
      totalKills: sum(matchResultsTable.kills),
      totalPoints: sum(matchResultsTable.points),
    })
    .from(matchResultsTable)
    .groupBy(matchResultsTable.userId, matchResultsTable.playerName)
    .orderBy(desc(sum(matchResultsTable.points)))
    .limit(100);

  const result = rows.map((r, idx) => ({
    rank: idx + 1,
    userId: r.userId,
    playerName: r.playerName,
    kills: Number(r.totalKills) || 0,
    points: Number(r.totalPoints) || 0,
    wins: 0,
    teamName: null,
    teamId: null,
  }));

  res.json(result);
});

router.get("/tournaments/:id/leaderboard", async (req, res) => {
  const tournamentId = parseInt(req.params.id);
  const rows = await db
    .select({
      userId: matchResultsTable.userId,
      playerName: matchResultsTable.playerName,
      totalKills: sum(matchResultsTable.kills),
      totalPoints: sum(matchResultsTable.points),
    })
    .from(matchResultsTable)
    .innerJoin(matchesTable, eq(matchResultsTable.matchId, matchesTable.id))
    .where(eq(matchesTable.tournamentId, tournamentId))
    .groupBy(matchResultsTable.userId, matchResultsTable.playerName)
    .orderBy(desc(sum(matchResultsTable.points)))
    .limit(100);

  const result = rows.map((r, idx) => ({
    rank: idx + 1,
    userId: r.userId,
    playerName: r.playerName,
    kills: Number(r.totalKills) || 0,
    points: Number(r.totalPoints) || 0,
    wins: 0,
    teamName: null,
    teamId: null,
  }));

  res.json(result);
});

export default router;
