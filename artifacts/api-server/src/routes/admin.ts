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
  userMatchesTable,
  userMatchJoinsTable,
  reportsTable,
} from "@workspace/db";
import { eq, desc, sql, ilike, or, and, gte } from "drizzle-orm";

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

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [
      totalUsersRow,
      totalTournamentsRow,
      totalTeamsRow,
      totalRegistrationsRow,
      activeTournamentsRow,
      pendingRegistrationsRow,
      prizePoolRow,
      pendingDepositsRow,
      pendingWithdrawalsRow,
      newUsersTodayRow,
      totalCommunityMatchesRow,
      activeCommunityMatchesRow,
      completedCommunityMatchesRow,
      pendingCommunityMatchesRow,
      pendingReportsRow,
    ] = await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(usersTable).then(r => r[0]),
      db.select({ count: sql<number>`count(*)` }).from(tournamentsTable).then(r => r[0]),
      db.select({ count: sql<number>`count(*)` }).from(teamsTable).then(r => r[0]),
      db.select({ count: sql<number>`count(*)` }).from(registrationsTable).then(r => r[0]),
      db.select({ count: sql<number>`count(*)` }).from(tournamentsTable).where(eq(tournamentsTable.status, "ongoing")).then(r => r[0]),
      db.select({ count: sql<number>`count(*)` }).from(registrationsTable).where(eq(registrationsTable.status, "pending")).then(r => r[0]),
      db.select({ total: sql<number>`coalesce(sum(prize_pool), 0)` }).from(tournamentsTable).then(r => r[0]),
      db.select({ count: sql<number>`count(*)` }).from(walletTransactionsTable).where(and(eq(walletTransactionsTable.status, "pending"), eq(walletTransactionsTable.type, "deposit"))).then(r => r[0]),
      db.select({ count: sql<number>`count(*)` }).from(walletTransactionsTable).where(and(eq(walletTransactionsTable.status, "pending"), eq(walletTransactionsTable.type, "withdraw"))).then(r => r[0]),
      db.select({ count: sql<number>`count(*)` }).from(usersTable).where(gte(usersTable.createdAt, todayStart)).then(r => r[0]),
      db.select({ count: sql<number>`count(*)` }).from(userMatchesTable).then(r => r[0]),
      db.select({ count: sql<number>`count(*)` }).from(userMatchesTable).where(or(eq(userMatchesTable.status, "active"), eq(userMatchesTable.status, "approved"), eq(userMatchesTable.status, "waiting"))).then(r => r[0]),
      db.select({ count: sql<number>`count(*)` }).from(userMatchesTable).where(or(eq(userMatchesTable.status, "ended"), eq(userMatchesTable.status, "completed"))).then(r => r[0]),
      db.select({ count: sql<number>`count(*)` }).from(userMatchesTable).where(eq(userMatchesTable.status, "pending_approval")).then(r => r[0]),
      db.select({ count: sql<number>`count(*)` }).from(reportsTable).where(eq(reportsTable.status, "pending")).then(r => r[0]),
    ]);

    const [recentRegistrations, upcomingTournaments, recentActivity] = await Promise.all([
      db.select().from(registrationsTable).orderBy(desc(registrationsTable.createdAt)).limit(10),
      db.select().from(tournamentsTable).where(eq(tournamentsTable.status, "upcoming")).orderBy(tournamentsTable.startDate).limit(5),
      db.select().from(auditLogsTable).orderBy(desc(auditLogsTable.createdAt)).limit(15),
    ]);

    res.json({
      totalUsers: Number(totalUsersRow.count),
      totalTournaments: Number(totalTournamentsRow.count),
      totalTeams: Number(totalTeamsRow.count),
      totalRegistrations: Number(totalRegistrationsRow.count),
      activeTournaments: Number(activeTournamentsRow.count),
      pendingRegistrations: Number(pendingRegistrationsRow.count),
      totalPrizePool: Number(prizePoolRow.total) || 0,
      pendingWalletRequests: Number(pendingDepositsRow.count) + Number(pendingWithdrawalsRow.count),
      pendingDeposits: Number(pendingDepositsRow.count),
      pendingWithdrawals: Number(pendingWithdrawalsRow.count),
      newUsersToday: Number(newUsersTodayRow.count),
      totalCommunityMatches: Number(totalCommunityMatchesRow.count),
      activeCommunityMatches: Number(activeCommunityMatchesRow.count),
      completedCommunityMatches: Number(completedCommunityMatchesRow.count),
      pendingCommunityMatches: Number(pendingCommunityMatchesRow.count),
      pendingReports: Number(pendingReportsRow.count),
      recentRegistrations,
      upcomingTournaments,
      recentActivity,
    });
  } catch (err) {
    console.error("Stats error:", err);
    res.status(500).json({ error: "Failed to load stats." });
  }
});

router.get("/admin/users", async (req, res) => {
  try {
    if (!await requireAdmin(req, res)) return;
    const { search, page = "1", limit = "50" } = req.query as Record<string, string>;
    const whereClause = search
      ? or(
          ilike(usersTable.username, `%${search}%`),
          ilike(usersTable.email, `%${search}%`),
          ilike(usersTable.clerkId, `%${search}%`)
        )
      : undefined;
    const rows = await db
      .select()
      .from(usersTable)
      .where(whereClause)
      .orderBy(desc(usersTable.createdAt))
      .limit(parseInt(limit))
      .offset((parseInt(page) - 1) * parseInt(limit));
    res.json(rows);
  } catch {
    res.status(500).json({ error: "Failed to fetch users." });
  }
});

router.get("/admin/users/:id/details", async (req, res) => {
  try {
    if (!await requireAdmin(req, res)) return;
    const { id } = req.params;

    const [user] = await db.select().from(usersTable).where(eq(usersTable.clerkId, id));
    if (!user) return res.status(404).json({ error: "User not found" });

    const [txs, joinedMatches, createdMatches] = await Promise.all([
      db.select().from(walletTransactionsTable).where(eq(walletTransactionsTable.userId, id)),
      db.select({ count: sql<number>`count(*)` }).from(userMatchJoinsTable).where(eq(userMatchJoinsTable.userId, id)).then(r => Number(r[0]?.count ?? 0)),
      db.select({ count: sql<number>`count(*)` }).from(userMatchesTable).where(eq(userMatchesTable.creatorId, id)).then(r => Number(r[0]?.count ?? 0)),
    ]);

    const approved = (type: string) => txs.filter(t => t.type === type && t.status === "approved").reduce((s, t) => s + parseFloat(t.amount), 0);
    const walletBalance = Math.max(0, (approved("deposit") + approved("tournament_prize")) - (approved("withdraw") + approved("tournament_entry")));
    const totalDeposit = approved("deposit");
    const totalWithdraw = approved("withdraw");

    const completedMatches = await db.select({ count: sql<number>`count(*)` }).from(userMatchesTable)
      .where(and(eq(userMatchesTable.creatorId, id), or(eq(userMatchesTable.status, "ended"), eq(userMatchesTable.status, "completed"))))
      .then(r => Number(r[0]?.count ?? 0));

    const cancelledMatches = await db.select({ count: sql<number>`count(*)` }).from(userMatchesTable)
      .where(and(eq(userMatchesTable.creatorId, id), eq(userMatchesTable.status, "cancelled")))
      .then(r => Number(r[0]?.count ?? 0));

    res.json({
      ...user,
      walletBalance,
      totalDeposit,
      totalWithdraw,
      matchesJoined: joinedMatches,
      matchesCreated: createdMatches,
      matchesCompleted: completedMatches,
      matchesCancelled: cancelledMatches,
      recentTransactions: txs.slice(0, 5),
    });
  } catch (err) {
    console.error("User details error:", err);
    res.status(500).json({ error: "Failed to fetch user details." });
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

// ─── Global Search ─────────────────────────────────────────────────────────────

router.get("/admin/global-search", async (req, res) => {
  try {
    if (!await requireAdmin(req, res)) return;
    const { q } = req.query as Record<string, string>;
    if (!q || q.trim().length < 2) return res.json({ users: [], tournaments: [], matches: [] });

    const term = q.trim();

    const [users, tournaments, matches] = await Promise.all([
      db.select({
        id: usersTable.clerkId,
        username: usersTable.username,
        email: usersTable.email,
        displayName: usersTable.displayName,
        isBanned: usersTable.isBanned,
        isAdmin: usersTable.isAdmin,
        createdAt: usersTable.createdAt,
      }).from(usersTable)
        .where(or(
          ilike(usersTable.username, `%${term}%`),
          ilike(usersTable.email, `%${term}%`),
          ilike(usersTable.clerkId, `%${term}%`),
          ilike(usersTable.displayName, `%${term}%`)
        ))
        .orderBy(desc(usersTable.createdAt))
        .limit(10),

      db.select().from(tournamentsTable)
        .where(or(
          ilike(tournamentsTable.name, `%${term}%`),
          ilike(tournamentsTable.description, `%${term}%`)
        ))
        .orderBy(desc(tournamentsTable.createdAt))
        .limit(10),

      db.select().from(userMatchesTable)
        .where(or(
          ilike(userMatchesTable.matchName, `%${term}%`),
          ilike(userMatchesTable.creatorName, `%${term}%`),
          ilike(userMatchesTable.matchType, `%${term}%`)
        ))
        .orderBy(desc(userMatchesTable.createdAt))
        .limit(10),
    ]);

    res.json({ users, tournaments, matches });
  } catch (err) {
    console.error("Search error:", err);
    res.status(500).json({ error: "Search failed." });
  }
});

// ─── Reports ───────────────────────────────────────────────────────────────────

router.get("/admin/reports", async (req, res) => {
  try {
    if (!await requireAdmin(req, res)) return;
    const { status } = req.query as Record<string, string>;
    const rows = await db
      .select()
      .from(reportsTable)
      .where(status && status !== "all" ? eq(reportsTable.status, status) : undefined)
      .orderBy(desc(reportsTable.createdAt))
      .limit(200);
    res.json(rows);
  } catch {
    res.status(500).json({ error: "Failed to fetch reports." });
  }
});

router.patch("/admin/reports/:id", async (req, res) => {
  try {
    if (!await requireAdmin(req, res)) return;
    const { id } = req.params;
    const { status, adminNote } = req.body;
    const update: any = {};
    if (status) update.status = status;
    if (adminNote !== undefined) update.adminNote = adminNote;
    if (status === "resolved" || status === "dismissed") update.resolvedAt = new Date();
    const [updated] = await db
      .update(reportsTable)
      .set(update)
      .where(eq(reportsTable.id, parseInt(id)))
      .returning();
    res.json(updated);
  } catch {
    res.status(500).json({ error: "Failed to update report." });
  }
});

router.delete("/admin/reports/:id", async (req, res) => {
  try {
    if (!await requireAdmin(req, res)) return;
    await db.delete(reportsTable).where(eq(reportsTable.id, parseInt(req.params.id)));
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Failed to delete report." });
  }
});

// Public: submit a report
router.post("/reports", async (req, res) => {
  try {
    const { reporterId, reporterName, targetType, targetId, targetName, reason, description } = req.body;
    if (!targetType || !targetId || !reason) {
      return res.status(400).json({ error: "targetType, targetId, and reason are required." });
    }
    const [report] = await db.insert(reportsTable).values({
      reporterId: reporterId ?? null,
      reporterName: reporterName ?? null,
      targetType,
      targetId: String(targetId),
      targetName: targetName ?? null,
      reason,
      description: description ?? null,
      status: "pending",
    }).returning();
    res.status(201).json(report);
  } catch {
    res.status(500).json({ error: "Failed to submit report." });
  }
});

export default router;
