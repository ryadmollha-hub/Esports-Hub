import { Router, type IRouter } from "express";
import { safeGetUserId } from "../lib/clerkAuth";
import { audit, getClientIp } from "../lib/auditLog";
import { adminLoginLimiter } from "../middlewares/rateLimiter";
import { db } from "@workspace/db";
import {
  usersTable,
  tournamentsTable,
  teamsTable,
  registrationsTable,
  announcementsTable,
  walletTransactionsTable,
  auditLogsTable,
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
  const userId = safeGetUserId(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return false; }
  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.clerkId, userId));
    if (!user?.isAdmin) { res.status(403).json({ error: "Forbidden" }); return false; }
    return true;
  } catch {
    res.status(401).json({ error: "Unauthorized" });
    return false;
  }
}

router.post("/admin/login", adminLoginLimiter, async (req, res) => {
  try {
    const { username, password } = req.body;
    const ip = getClientIp(req);
    const ua = req.headers["user-agent"] ?? "unknown";

    if (!username || !password) {
      return res.status(400).json({ error: "username and password are required" });
    }

    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
      await audit("admin.login.success", {
        req,
        details: { username, ip, userAgent: ua },
        severity: "info",
      });
      return res.json({ success: true, token: getAdminToken() });
    }

    await audit("admin.login.failed", {
      req,
      details: { username, ip, userAgent: ua },
      severity: "critical",
    });
    return res.status(401).json({ error: "Invalid credentials" });
  } catch {
    return res.status(500).json({ error: "Login failed." });
  }
});

router.get("/admin/stats", async (req, res) => {
  try {
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
  } catch {
    res.status(500).json({ error: "Failed to load stats." });
  }
});

router.get("/admin/users", async (req, res) => {
  try {
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
  } catch {
    res.status(500).json({ error: "Failed to fetch users." });
  }
});

router.post("/admin/users/:id/ban", async (req, res) => {
  try {
    if (!await requireAdmin(req, res)) return;
    const adminId = safeGetUserId(req);
    const id = req.params.id;
    const [user] = await db.select().from(usersTable).where(eq(usersTable.clerkId, id));
    if (!user) return res.status(404).json({ error: "User not found" });
    const [updated] = await db
      .update(usersTable)
      .set({ isBanned: !user.isBanned })
      .where(eq(usersTable.clerkId, id))
      .returning();
    await audit(updated.isBanned ? "admin.user.banned" : "admin.user.unbanned", {
      userId: adminId,
      req,
      details: { targetUserId: id },
      severity: "warning",
    });
    res.json({ success: true, isBanned: updated.isBanned });
  } catch {
    res.status(500).json({ error: "Failed to update user." });
  }
});

router.post("/admin/users/:id/make-admin", async (req, res) => {
  try {
    if (!await requireAdmin(req, res)) return;
    const adminId = safeGetUserId(req);
    const id = req.params.id;
    const [user] = await db.select().from(usersTable).where(eq(usersTable.clerkId, id));
    if (!user) return res.status(404).json({ error: "User not found" });
    const [updated] = await db
      .update(usersTable)
      .set({ isAdmin: !user.isAdmin })
      .where(eq(usersTable.clerkId, id))
      .returning();
    await audit("admin.user.privilege_changed", {
      userId: adminId,
      req,
      details: { targetUserId: id, isAdmin: updated.isAdmin },
      severity: "critical",
    });
    res.json({ success: true, isAdmin: updated.isAdmin });
  } catch {
    res.status(500).json({ error: "Failed to update user." });
  }
});

router.get("/admin/registrations", async (req, res) => {
  try {
    if (!await requireAdmin(req, res)) return;
    const { status } = req.query as Record<string, string>;
    const rows = await db
      .select()
      .from(registrationsTable)
      .orderBy(desc(registrationsTable.createdAt))
      .limit(100);
    const filtered = status ? rows.filter((r) => r.status === status) : rows;
    res.json(filtered);
  } catch {
    res.status(500).json({ error: "Failed to fetch registrations." });
  }
});

router.get("/admin/audit-logs", async (req, res) => {
  try {
    if (!await requireAdmin(req, res)) return;
    const { severity, limit = "100" } = req.query as Record<string, string>;
    const rows = await db
      .select()
      .from(auditLogsTable)
      .where(severity ? eq(auditLogsTable.severity, severity) : undefined)
      .orderBy(desc(auditLogsTable.createdAt))
      .limit(Math.min(parseInt(limit), 500));
    res.json(rows);
  } catch {
    res.status(500).json({ error: "Failed to fetch audit logs." });
  }
});

router.post("/admin/notifications", async (req, res) => {
  try {
    if (!await requireAdmin(req, res)) return;
    const adminId = safeGetUserId(req);
    await audit("admin.notification.sent", { userId: adminId, req, details: req.body });
    res.json({ success: true, sent: true });
  } catch {
    res.status(500).json({ error: "Failed to send notification." });
  }
});

export default router;
