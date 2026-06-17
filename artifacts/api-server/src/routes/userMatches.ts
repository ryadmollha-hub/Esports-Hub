import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { logger } from "../lib/logger";
import {
  userMatchesTable,
  userMatchJoinsTable,
  walletTransactionsTable,
  usersTable,
} from "@workspace/db";
import { eq, and, desc, sql } from "drizzle-orm";
import { requireAdmin, requireAuth } from "../middlewares/requireAdmin";
import bcrypt from "bcryptjs";

const router: IRouter = Router();

const SLOTS_FOR_TYPE: Record<string, number> = {
  "1v1": 2,
  "2v2": 4,
  "3v3": 6,
  "4v4": 8,
};

async function getUserBalance(userId: string): Promise<number> {
  const txs = await db
    .select()
    .from(walletTransactionsTable)
    .where(eq(walletTransactionsTable.userId, userId));
  const credits = txs
    .filter((t) => (t.type === "deposit" || t.type === "tournament_prize") && t.status === "approved")
    .reduce((sum, t) => sum + parseFloat(t.amount), 0);
  const debits = txs
    .filter((t) => (t.type === "withdraw" || t.type === "tournament_entry") && t.status === "approved")
    .reduce((sum, t) => sum + parseFloat(t.amount), 0);
  return Math.max(0, credits - debits);
}

function stripMatch(m: typeof userMatchesTable.$inferSelect) {
  const { passwordHash, ...rest } = m as any;
  return { ...rest, isPasswordProtected: !!passwordHash };
}

// ─── Create a user match (auth required) ─────────────────────────────────────

router.post("/user-matches", async (req, res) => {
  const userId = await requireAuth(req, res);
  if (!userId) return;
  try {
    const { matchName, matchType, prizePool, scheduledAt, description, password } = req.body;
    if (!matchType || !prizePool || !scheduledAt) {
      return res.status(400).json({ error: "matchType, prizePool, and scheduledAt are required." });
    }
    const maxSlots = SLOTS_FOR_TYPE[matchType];
    if (!maxSlots) {
      return res.status(400).json({ error: "Invalid matchType. Must be 1v1, 2v2, 3v3, or 4v4." });
    }
    const prize = parseFloat(prizePool);
    if (isNaN(prize) || prize <= 0) {
      return res.status(400).json({ error: "prizePool must be a positive number." });
    }

    const schedDate = new Date(scheduledAt);
    if (isNaN(schedDate.getTime()) || schedDate <= new Date()) {
      return res.status(400).json({ error: "scheduledAt must be a future date." });
    }

    const [user] = await db.select({ username: usersTable.username, displayName: usersTable.displayName })
      .from(usersTable).where(eq(usersTable.clerkId, userId)).limit(1);

    let passwordHash: string | null = null;
    if (password && typeof password === "string" && password.trim().length > 0) {
      passwordHash = await bcrypt.hash(password.trim(), 10);
    }

    const [match] = await db.insert(userMatchesTable).values({
      creatorId: userId,
      creatorName: user?.displayName ?? user?.username ?? "Unknown",
      matchName: matchName?.trim() || null,
      matchType,
      prizePool: prize.toFixed(2),
      entryFee: "0.00",
      maxSlots,
      scheduledAt: schedDate,
      description: description ?? null,
      passwordHash,
      status: "pending_approval",
    }).returning();

    res.status(201).json(stripMatch(match));
  } catch (err) {
    logger.error({ err }, "Failed to create match");
    res.status(500).json({ error: "Failed to create match." });
  }
});

// ─── List approved user matches (public) ─────────────────────────────────────

router.get("/user-matches", async (_req, res) => {
  try {
    const matches = await db
      .select()
      .from(userMatchesTable)
      .where(eq(userMatchesTable.status, "approved"))
      .orderBy(desc(userMatchesTable.scheduledAt));
    res.json(matches.map(stripMatch));
  } catch {
    res.status(500).json({ error: "Failed to load matches." });
  }
});

// ─── List my submitted matches (auth required) ────────────────────────────────

router.get("/user-matches/mine", async (req, res) => {
  const userId = await requireAuth(req, res);
  if (!userId) return;
  try {
    const matches = await db
      .select()
      .from(userMatchesTable)
      .where(eq(userMatchesTable.creatorId, userId))
      .orderBy(desc(userMatchesTable.createdAt));
    res.json(matches.map(stripMatch));
  } catch {
    res.status(500).json({ error: "Failed to load your matches." });
  }
});

// ─── Join a match (auth required) ─────────────────────────────────────────────

router.post("/user-matches/:id/join", async (req, res) => {
  const userId = await requireAuth(req, res);
  if (!userId) return;
  try {
    const id = parseInt(req.params.id);
    const { inGameName, gameUid, password } = req.body;

    if (!inGameName || !String(inGameName).trim()) {
      return res.status(400).json({ error: "In-Game Name is required." });
    }
    if (!gameUid || !String(gameUid).trim()) {
      return res.status(400).json({ error: "Game UID is required." });
    }

    const [match] = await db.select().from(userMatchesTable).where(eq(userMatchesTable.id, id)).limit(1);

    if (!match) return res.status(404).json({ error: "Match not found." });
    if (match.status !== "approved") return res.status(400).json({ error: "This match is not open for joining." });
    if (match.creatorId === userId) return res.status(400).json({ error: "You cannot join your own match." });
    if (match.filledSlots >= match.maxSlots) return res.status(400).json({ error: "This match is full." });

    if (match.passwordHash) {
      if (!password || !String(password).trim()) {
        return res.status(400).json({ error: "This match is password protected. Please enter the password." });
      }
      const valid = await bcrypt.compare(String(password), match.passwordHash);
      if (!valid) {
        return res.status(400).json({ error: "Incorrect match password." });
      }
    }

    const existing = await db.select({ id: userMatchJoinsTable.id })
      .from(userMatchJoinsTable)
      .where(and(eq(userMatchJoinsTable.matchId, id), eq(userMatchJoinsTable.userId, userId)))
      .limit(1);
    if (existing.length > 0) return res.status(400).json({ error: "You have already joined this match." });

    const entryFee = parseFloat(match.entryFee);
    if (entryFee > 0) {
      const balance = await getUserBalance(userId);
      if (balance < entryFee) {
        return res.status(400).json({ error: `Insufficient wallet balance. You need ৳${entryFee.toFixed(2)} but have ৳${balance.toFixed(2)}.` });
      }
      await db.insert(walletTransactionsTable).values({
        userId,
        type: "tournament_entry",
        amount: entryFee.toFixed(2),
        status: "approved",
        notes: `Entry fee for ${match.matchName || match.matchType} match #${match.id}`,
        tournamentId: null,
      });
    }

    const [user] = await db.select({ username: usersTable.username, displayName: usersTable.displayName })
      .from(usersTable).where(eq(usersTable.clerkId, userId)).limit(1);

    await db.insert(userMatchJoinsTable).values({
      matchId: id,
      userId,
      username: user?.displayName ?? user?.username ?? "Unknown",
      inGameName: String(inGameName).trim(),
      gameUid: String(gameUid).trim(),
    });

    await db.update(userMatchesTable)
      .set({ filledSlots: sql`${userMatchesTable.filledSlots} + 1` })
      .where(eq(userMatchesTable.id, id));

    res.json({ success: true, message: "You have joined the match!" });
  } catch (err) {
    logger.error({ err }, "Failed to join match");
    res.status(500).json({ error: "Failed to join match." });
  }
});

// ─── Get participants for a match (public) ───────────────────────────────────

router.get("/user-matches/:id/participants", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const participants = await db
      .select()
      .from(userMatchJoinsTable)
      .where(eq(userMatchJoinsTable.matchId, id))
      .orderBy(userMatchJoinsTable.joinedAt);
    res.json(participants);
  } catch {
    res.status(500).json({ error: "Failed to load participants." });
  }
});

// ─── Admin: list all user matches ────────────────────────────────────────────

router.get("/admin/user-matches", async (req, res) => {
  if (!await requireAdmin(req, res)) return;
  try {
    const matches = await db
      .select()
      .from(userMatchesTable)
      .orderBy(desc(userMatchesTable.createdAt));
    res.json(matches.map(stripMatch));
  } catch {
    res.status(500).json({ error: "Failed to load matches." });
  }
});

// ─── Admin: approve ───────────────────────────────────────────────────────────

router.patch("/admin/user-matches/:id/approve", async (req, res) => {
  if (!await requireAdmin(req, res)) return;
  try {
    const id = parseInt(req.params.id);
    const { entryFee } = req.body;

    const fee = parseFloat(entryFee ?? "0");
    if (isNaN(fee) || fee < 0) {
      return res.status(400).json({ error: "Please set a valid Entry Fee (0 or greater) before approving." });
    }

    const [updated] = await db
      .update(userMatchesTable)
      .set({ status: "approved", adminNote: null, entryFee: fee.toFixed(2) })
      .where(eq(userMatchesTable.id, id))
      .returning();
    if (!updated) return res.status(404).json({ error: "Match not found." });
    res.json(stripMatch(updated));
  } catch {
    res.status(500).json({ error: "Failed to approve match." });
  }
});

// ─── Admin: reject ────────────────────────────────────────────────────────────

router.patch("/admin/user-matches/:id/reject", async (req, res) => {
  if (!await requireAdmin(req, res)) return;
  try {
    const id = parseInt(req.params.id);
    const { adminNote } = req.body;
    const [updated] = await db
      .update(userMatchesTable)
      .set({ status: "rejected", adminNote: adminNote ?? null })
      .where(eq(userMatchesTable.id, id))
      .returning();
    if (!updated) return res.status(404).json({ error: "Match not found." });
    res.json(stripMatch(updated));
  } catch {
    res.status(500).json({ error: "Failed to reject match." });
  }
});

// ─── User: delete own pending/rejected match ──────────────────────────────────

router.delete("/user-matches/:id", async (req, res) => {
  const userId = await requireAuth(req, res);
  if (!userId) return;
  try {
    const id = parseInt(req.params.id);
    const [match] = await db.select().from(userMatchesTable).where(eq(userMatchesTable.id, id)).limit(1);
    if (!match) return res.status(404).json({ error: "Match not found." });
    if (match.creatorId !== userId) return res.status(403).json({ error: "Not your match." });
    if (match.status === "approved") {
      return res.status(400).json({ error: "Approved matches cannot be deleted. Contact admin to remove it." });
    }
    await db.delete(userMatchJoinsTable).where(eq(userMatchJoinsTable.matchId, id));
    await db.delete(userMatchesTable).where(eq(userMatchesTable.id, id));
    res.json({ success: true });
  } catch (err) {
    logger.error({ err }, "Failed to delete match");
    res.status(500).json({ error: "Failed to delete match." });
  }
});

// ─── Admin: delete any match ──────────────────────────────────────────────────

router.delete("/admin/user-matches/:id", async (req, res) => {
  if (!await requireAdmin(req, res)) return;
  try {
    const id = parseInt(req.params.id);
    const [match] = await db.select().from(userMatchesTable).where(eq(userMatchesTable.id, id)).limit(1);
    if (!match) return res.status(404).json({ error: "Match not found." });

    if (match.status === "approved" && parseFloat(match.entryFee) > 0) {
      const joins = await db.select().from(userMatchJoinsTable).where(eq(userMatchJoinsTable.matchId, id));
      for (const join of joins) {
        await db.insert(walletTransactionsTable).values({
          userId: join.userId,
          type: "tournament_prize",
          amount: match.entryFee,
          status: "approved",
          notes: `Refund: ${match.matchName || match.matchType} match #${match.id} deleted by admin`,
          tournamentId: null,
        });
      }
    }

    await db.delete(userMatchJoinsTable).where(eq(userMatchJoinsTable.matchId, id));
    await db.delete(userMatchesTable).where(eq(userMatchesTable.id, id));
    res.json({ success: true });
  } catch (err) {
    logger.error({ err }, "Failed to delete match");
    res.status(500).json({ error: "Failed to delete match." });
  }
});

export default router;
