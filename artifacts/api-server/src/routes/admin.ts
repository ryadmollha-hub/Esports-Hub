import { Router, type IRouter } from "express";
import { getAuth } from "@clerk/express";
import { db } from "@workspace/db";
import {
  usersTable,
  tournamentsTable,
  teamsTable,
  registrationsTable,
} from "@workspace/db";
import { eq, desc, sql, ilike } from "drizzle-orm";

const router: IRouter = Router();

async function requireAdmin(req: any, res: any): Promise<boolean> {
  const { userId } = getAuth(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return false; }
  const user = await db.select().from(usersTable).where(eq(usersTable.clerkId, userId));
  if (!user[0]?.isAdmin) { res.status(403).json({ error: "Forbidden" }); return false; }
  return true;
}

router.get("/admin/stats", async (req, res) => {
  if (!await requireAdmin(req, res)) return;
  const [totalUsers] = await db.select({ count: sql<number>`count(*)` }).from(usersTable);
  const [totalTournaments] = await db.select({ count: sql<number>`count(*)` }).from(tournamentsTable);
  const [totalTeams] = await db.select({ count: sql<number>`count(*)` }).from(teamsTable);
  const [totalRegistrations] = await db.select({ count: sql<number>`count(*)` }).from(registrationsTable);
  const [activeTournaments] = await db
    .select({ count: sql<number>`count(*)` })
    .from(tournamentsTable)
    .where(eq(tournamentsTable.status, "ongoing"));
  const [pendingRegistrations] = await db
    .select({ count: sql<number>`count(*)` })
    .from(registrationsTable)
    .where(eq(registrationsTable.status, "pending"));
  const [prizePool] = await db
    .select({ total: sql<number>`sum(prize_pool)` })
    .from(tournamentsTable);
  const recentRegistrations = await db
    .select()
    .from(registrationsTable)
    .orderBy(desc(registrationsTable.createdAt))
    .limit(10);
  const upcomingTournaments = await db
    .select()
    .from(tournamentsTable)
    .where(eq(tournamentsTable.status, "upcoming"))
    .orderBy(tournamentsTable.startDate)
    .limit(5);

  res.json({
    totalUsers: Number(totalUsers.count),
    totalTournaments: Number(totalTournaments.count),
    totalTeams: Number(totalTeams.count),
    totalRegistrations: Number(totalRegistrations.count),
    activeTournaments: Number(activeTournaments.count),
    pendingRegistrations: Number(pendingRegistrations.count),
    totalPrizePool: Number(prizePool.total) || 0,
    recentRegistrations,
    upcomingTournaments,
  });
});

router.get("/admin/users", async (req, res) => {
  if (!await requireAdmin(req, res)) return;
  const { search, page = "1", limit = "20" } = req.query as Record<string, string>;
  const rows = await db
    .select()
    .from(usersTable)
    .where(search ? ilike(usersTable.username, `%${search}%`) : undefined)
    .orderBy(desc(usersTable.createdAt))
    .limit(parseInt(limit))
    .offset((parseInt(page) - 1) * parseInt(limit));
  res.json(rows);
});

router.post("/admin/users/:id/ban", async (req, res) => {
  if (!await requireAdmin(req, res)) return;
  const id = req.params.id;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.clerkId, id));
  if (!user) return res.status(404).json({ error: "User not found" });
  const [updated] = await db
    .update(usersTable)
    .set({ isBanned: !user.isBanned })
    .where(eq(usersTable.clerkId, id))
    .returning();
  res.json({ success: true, isBanned: updated.isBanned });
});

router.post("/admin/notifications", async (req, res) => {
  if (!await requireAdmin(req, res)) return;
  const { title, message, userId } = req.body;
  res.json({ success: true, sent: true });
});

export default router;
