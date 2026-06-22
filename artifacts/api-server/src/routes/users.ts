import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { usersTable, matchResultsTable, registrationsTable } from "@workspace/db";
import { eq, sum, sql, count } from "drizzle-orm";
import { UpdateMyProfileBody } from "@workspace/api-zod";
import { safeGetUserId } from "../lib/clerkAuth";

const router: IRouter = Router();

async function getOrCreateUser(clerkId: string, clerkUser?: { email?: string; username?: string }) {
  const existing = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkId));
  if (existing[0]) return existing[0];
  const [created] = await db
    .insert(usersTable)
    .values({
      clerkId,
      email: clerkUser?.email ?? null,
      username: clerkUser?.username ?? null,
    })
    .returning();
  return created;
}

function sanitize(user: any) {
  const { passwordHash, ...safe } = user;
  return safe;
}

async function computeUserStats(userId: string) {
  // Kills & wins from match results (matchResultsTable.userId is the user's clerkId)
  const [statsRow] = await db
    .select({
      totalKills: sql<number>`coalesce(sum(${matchResultsTable.kills}), 0)::int`,
      totalWins:  sql<number>`coalesce(count(*) filter (where ${matchResultsTable.rank} = 1), 0)::int`,
      played:     sql<number>`coalesce(count(distinct ${matchResultsTable.matchId}), 0)::int`,
    })
    .from(matchResultsTable)
    .where(eq(matchResultsTable.userId, userId));

  return {
    totalKills:        Number(statsRow?.totalKills ?? 0),
    totalWins:         Number(statsRow?.totalWins ?? 0),
    tournamentsPlayed: Number(statsRow?.played ?? 0),
  };
}

router.get("/users/me", async (req, res) => {
  const userId = safeGetUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  const user = await getOrCreateUser(userId);
  const stats = await computeUserStats(userId);
  res.json({ ...sanitize(user), ...stats });
});

router.patch("/users/me", async (req, res) => {
  const userId = safeGetUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  const data = UpdateMyProfileBody.parse(req.body);
  let user = await db.select().from(usersTable).where(eq(usersTable.clerkId, userId));
  if (!user[0]) {
    await getOrCreateUser(userId);
    user = await db.select().from(usersTable).where(eq(usersTable.clerkId, userId));
  }
  const [updated] = await db
    .update(usersTable)
    .set({
      ...(data.username !== undefined && { username: data.username }),
      ...(data.displayName !== undefined && { displayName: data.displayName }),
      ...(data.freefireUid !== undefined && { freefireUid: data.freefireUid }),
      ...(data.freefireNickname !== undefined && { freefireNickname: data.freefireNickname }),
      ...(data.avatarUrl !== undefined && { avatarUrl: data.avatarUrl }),
    })
    .where(eq(usersTable.clerkId, userId))
    .returning();
  const stats = await computeUserStats(userId);
  res.json({ ...sanitize(updated), ...stats });
});

router.get("/users/:id", async (req, res) => {
  const id = req.params.id;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.clerkId, id));
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json(sanitize(user));
});

export default router;
