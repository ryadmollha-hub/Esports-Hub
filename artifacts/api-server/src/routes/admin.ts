import { Router, type IRouter } from "express";
import { getAuth } from "@clerk/express";
import { db } from "@workspace/db";
import {
  usersTable,
  tournamentsTable,
  teamsTable,
  registrationsTable,
  announcementsTable,
  walletTransactionsTable,
} from "@workspace/db";
import { eq, desc, sql, ilike } from "drizzle-orm";

const router: IRouter = Router();

const ADMIN_USERNAME = process.env.ADMIN_USERNAME ?? "BLACKCODE";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "USER505";
const ADMIN_SECRET = process.env.ADMIN_SECRET ?? "blackcode-admin-secret-2026";

function getAdminToken(): string {
  return Buffer.from(`${ADMIN_USERNAME}:${ADMIN_PASSWORD}:${ADMIN_SECRET}`).toString("base64");
}

function isValidAdminToken(req: any): boolean {
  const token = req.headers["x-admin-token"];
  return token === getAdminToken();
}

async function requireAdmin(req: any, res: any): Promise<boolean> {
  if (isValidAdminToken(req)) return true;
  try {
    const { userId } = getAuth(req);
    if (!userId) { res.status(401).json({ error: "Unauthorized" }); return false; }
    const [user] = await db.select().from(usersTable).where(eq(usersTable.clerkId, userId));
    if (!user?.isAdmin) { res.status(403).json({ error: "Forbidden" }); return false; }
    return true;
  } catch {
    res.status(401).json({ error: "Unauthorized" });
    return false;
  }
}

router.post("/admin/login", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: "username and password are required" });
  }
  if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
    return res.json({ success: true, token: getAdminToken() });
  }
  return res.status(401).json({ error: "Invalid credentials" });
});

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
    .select({ total: sql<number>`coalesce(sum(prize_pool), 0)` })
    .from(tournamentsTable);
  const [pendingDeposits] = await db
    .select({ count: sql<number>`count(*)` })
    .from(walletTransactionsTable)
    .where(eq(walletTransactionsTable.status, "pending"));
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
    pendingWalletRequests: Number(pendingDeposits.count),
    recentRegistrations,
    upcomingTournaments,
  });
});

router.get("/admin/users", async (req, res) => {
  if (!await requireAdmin(req, res)) return;
  const { search, page = "1", limit = "50" } = req.query as Record<string, string>;
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

router.post("/admin/users/:id/make-admin", async (req, res) => {
  if (!await requireAdmin(req, res)) return;
  const id = req.params.id;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.clerkId, id));
  if (!user) return res.status(404).json({ error: "User not found" });
  const [updated] = await db
    .update(usersTable)
    .set({ isAdmin: !user.isAdmin })
    .where(eq(usersTable.clerkId, id))
    .returning();
  res.json({ success: true, isAdmin: updated.isAdmin });
});

router.get("/admin/registrations", async (req, res) => {
  if (!await requireAdmin(req, res)) return;
  const { status } = req.query as Record<string, string>;
  const rows = await db
    .select()
    .from(registrationsTable)
    .orderBy(desc(registrationsTable.createdAt))
    .limit(100);
  const filtered = status ? rows.filter((r) => r.status === status) : rows;
  res.json(filtered);
});

router.post("/admin/notifications", async (req, res) => {
  if (!await requireAdmin(req, res)) return;
  res.json({ success: true, sent: true });
});

export default router;
