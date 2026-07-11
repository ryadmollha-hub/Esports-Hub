import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { usersTable, matchResultsTable, registrationsTable } from "@workspace/db";
import { eq, sum, sql, count, and } from "drizzle-orm";
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
  // Primary: aggregate from registrationsTable which stores userId reliably.
  // kills + resultRank are populated by POST /tournaments/:id/publish-results.
  const [regStats] = await db
    .select({
      played:     sql<number>`coalesce(count(*), 0)::int`,
      totalKills: sql<number>`coalesce(sum(${registrationsTable.kills}), 0)::int`,
      totalWins:  sql<number>`coalesce(count(*) filter (where ${registrationsTable.resultRank} = 1), 0)::int`,
    })
    .from(registrationsTable)
    .where(
      and(
        eq(registrationsTable.userId, userId),
        eq(registrationsTable.status, "approved"),
      )
    );

  // Supplement: per-match results where the admin explicitly linked a userId.
  const [matchStats] = await db
    .select({
      totalKills: sql<number>`coalesce(sum(${matchResultsTable.kills}), 0)::int`,
      totalWins:  sql<number>`coalesce(count(*) filter (where ${matchResultsTable.rank} = 1), 0)::int`,
    })
    .from(matchResultsTable)
    .where(eq(matchResultsTable.userId, userId));

  const kills        = Number(regStats?.totalKills ?? 0) + Number(matchStats?.totalKills ?? 0);
  const wins         = Number(regStats?.totalWins  ?? 0) + Number(matchStats?.totalWins  ?? 0);
  const played       = Number(regStats?.played     ?? 0);

  console.log(`[stats] userId=${userId}  played=${played}  kills=${kills}  wins=${wins}`);

  return {
    totalKills:        kills,
    totalWins:         wins,
    tournamentsPlayed: played,
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
