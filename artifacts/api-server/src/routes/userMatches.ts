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

// ─── Create a user match (auth required) ─────────────────────────────────────

router.post("/user-matches", async (req, res) => {
  const userId = await requireAuth(req, res);
  if (!userId) return;
  try {
    const { matchType, prizePool, scheduledAt, description } = req.body;
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

    const [match] = await db.insert(userMatchesTable).values({
      creatorId: userId,
      creatorName: user?.displayName ?? user?.username ?? "Unknown",
      matchType,
      prizePool: prize.toFixed(2),
      entryFee: "0.00",
      maxSlots,
      scheduledAt: schedDate,
      description: description ?? null,
      status: "pending_approval",
    }).returning();

    res.status(201).json(match);
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
    res.json(matches);
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
    res.json(matches);
  } catch {
    res.status(500).json({ error: "Failed to load your matches." });
  }
});

// ─── Join a match (auth required, deducts wallet balance) ────────────────────

router.post("/user-matches/:id/join", async (req, res) => {
  const userId = await requireAuth(req, res);
  if (!userId) return;
  try {
    const id = parseInt(req.params.id);
    const [match] = await db.select().from(userMatchesTable).where(eq(userMatchesTable.id, id)).limit(1);

    if (!match) return res.status(404).json({ error: "Match not found." });
    if (match.status !== "approved") return res.status(400).json({ error: "This match is not open for joining." });
    if (match.creatorId === userId) return res.status(400).json({ error: "You cannot join your own match." });
    if (match.filledSlots >= match.maxSlots) return res.status(400).json({ error: "This match is full." });

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
        notes: `Entry fee for user match #${match.id} (${match.matchType})`,
        tournamentId: null,
      });
    }

    const [user] = await db.select({ username: usersTable.username, displayName: usersTable.displayName })
      .from(usersTable).where(eq(usersTable.clerkId, userId)).limit(1);

    await db.insert(userMatchJoinsTable).values({
      matchId: id,
      userId,
      username: user?.displayName ?? user?.username ?? "Unknown",
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
    res.json(matches);
  } catch {
    res.status(500).json({ error: "Failed to load matches." });
  }
});

// ─── Admin: approve ───────────────────────────────────────────────────────────

router.patch("/admin/user-matches/:id/approve", async (req, res) => {
  if (!await requireAdmin(req, res)) return;
  try {
    const id = parseInt(req.params.id);
    const [updated] = await db
      .update(userMatchesTable)
      .set({ status: "approved", adminNote: null })
      .where(eq(userMatchesTable.id, id))
      .returning();
    if (!updated) return res.status(404).json({ error: "Match not found." });
    res.json(updated);
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
    res.json(updated);
  } catch {
    res.status(500).json({ error: "Failed to reject match." });
  }
});

export default router;
