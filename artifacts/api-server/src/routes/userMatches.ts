import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { logger } from "../lib/logger";
import {
  userMatchesTable,
  userMatchJoinsTable,
  walletTransactionsTable,
  usersTable,
} from "@workspace/db";
import { eq, and, desc, sql, inArray } from "drizzle-orm";
import { requireAdmin, requireAuth } from "../middlewares/requireAdmin";
import bcrypt from "bcryptjs";

const router: IRouter = Router();

const SLOTS_FOR_TYPE: Record<string, number> = {
  "1v1": 2, "2v2": 4, "3v3": 6, "4v4": 8,
  "BR": 48, "CS": 8, "SOLO": 12, "LONE_WOLF": 12, "FREE": 20,
};

async function getUserBalance(userId: string): Promise<number> {
  const txs = await db.select().from(walletTransactionsTable).where(eq(walletTransactionsTable.userId, userId));
  const credits = txs
    .filter((t) => (t.type === "deposit" || t.type === "tournament_prize") && t.status === "approved")
    .reduce((sum, t) => sum + parseFloat(t.amount), 0);
  const debits = txs
    .filter((t) => (t.type === "withdraw" || t.type === "tournament_entry") && t.status === "approved")
    .reduce((sum, t) => sum + parseFloat(t.amount), 0);
  return Math.max(0, credits - debits);
}

function effectiveStatus(match: typeof userMatchesTable.$inferSelect): string {
  if (match.status === "pending_approval") return "pending_approval";
  if (match.status === "active" || match.status === "ended" || match.status === "cancelled") return match.status;
  if (match.timerStartedAt && match.startDelayMinutes) {
    const startMs = new Date(match.timerStartedAt).getTime() + match.startDelayMinutes * 60 * 1000;
    if (Date.now() >= startMs) return "active";
  }
  if (match.status === "approved") return "waiting";
  return match.status;
}

function stripMatch(m: typeof userMatchesTable.$inferSelect, includeRoom = false) {
  const { passwordHash, roomId, adminRoomId, adminRoomPassword, ...rest } = m as any;
  return {
    ...rest,
    isPasswordProtected: !!passwordHash,
    effectiveStatus: effectiveStatus(m),
    credentialsReleased: !!adminRoomId,
    ...(includeRoom ? { roomId: roomId ?? null, adminRoomId: adminRoomId ?? null, adminRoomPassword: adminRoomPassword ?? null } : {}),
  };
}

// ─── Create a user match ──────────────────────────────────────────────────────

router.post("/user-matches", async (req, res) => {
  const userId = await requireAuth(req, res);
  if (!userId) return;
  try {
    const { matchName, matchType, scheduledAt, description, password, roomId, isPrivate, prizePool: prizePoolInput, entryFee: entryFeeInput, perKill: perKillInput, mapName, version } = req.body;
    if (!matchType) return res.status(400).json({ error: "matchType is required." });

    const maxSlots = SLOTS_FOR_TYPE[matchType];
    if (!maxSlots) return res.status(400).json({ error: "Invalid matchType. Must be one of: 1v1, 2v2, 3v3, 4v4, BR, CS, SOLO, LONE_WOLF, FREE." });

    const prize = prizePoolInput !== undefined ? Math.max(0, parseFloat(prizePoolInput) || 0) : 0;
    const fee = entryFeeInput !== undefined ? Math.max(0, parseFloat(entryFeeInput) || 0) : 0;
    const perKill = perKillInput !== undefined ? Math.max(0, parseFloat(perKillInput) || 0) : 0;

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
      entryFee: fee.toFixed(2),
      perKill: perKill > 0 ? perKill.toFixed(2) : null,
      mapName: mapName?.trim() || null,
      version: version?.trim() || null,
      maxSlots,
      scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
      description: description ?? null,
      passwordHash,
      roomId: roomId?.trim() || null,
      isPrivate: !!isPrivate,
      status: "pending_approval",
    }).returning();

    res.status(201).json(stripMatch(match, true));
  } catch (err) {
    logger.error({ err }, "Failed to create match");
    res.status(500).json({ error: "Failed to create match." });
  }
});

// ─── List public matches ──────────────────────────────────────────────────────

router.get("/user-matches", async (_req, res) => {
  try {
    const matches = await db
      .select()
      .from(userMatchesTable)
      .where(
        and(
          eq(userMatchesTable.isPrivate, false),
          inArray(userMatchesTable.status, ["waiting", "active", "approved"])
        )
      )
      .orderBy(desc(userMatchesTable.createdAt));
    res.json(matches.map((m) => stripMatch(m)));
  } catch {
    res.status(500).json({ error: "Failed to load matches." });
  }
});

// ─── My created matches ───────────────────────────────────────────────────────

router.get("/user-matches/mine", async (req, res) => {
  const userId = await requireAuth(req, res);
  if (!userId) return;
  try {
    const matches = await db
      .select()
      .from(userMatchesTable)
      .where(eq(userMatchesTable.creatorId, userId))
      .orderBy(desc(userMatchesTable.createdAt));

    const matchIds = matches.map((m) => m.id);
    let pendingCounts: Record<number, number> = {};
    let participants: typeof userMatchJoinsTable.$inferSelect[] = [];
    if (matchIds.length > 0) {
      const joins = await db.select().from(userMatchJoinsTable).where(inArray(userMatchJoinsTable.matchId, matchIds));
      participants = joins;
      for (const j of joins) {
        if (j.status === "pending") pendingCounts[j.matchId] = (pendingCounts[j.matchId] ?? 0) + 1;
      }
    }

    res.json(matches.map((m) => ({
      ...stripMatch(m, true),
      pendingRequests: pendingCounts[m.id] ?? 0,
      participants: participants.filter((j) => j.matchId === m.id && j.status === "accepted"),
    })));
  } catch (err) {
    logger.error({ err }, "Failed to load mine");
    res.status(500).json({ error: "Failed to load your matches." });
  }
});

// ─── My join requests (matches I requested to join) ───────────────────────────

router.get("/user-matches/my-requests", async (req, res) => {
  const userId = await requireAuth(req, res);
  if (!userId) return;
  try {
    const joins = await db.select().from(userMatchJoinsTable)
      .where(eq(userMatchJoinsTable.userId, userId))
      .orderBy(desc(userMatchJoinsTable.joinedAt));

    if (joins.length === 0) return res.json([]);

    const matchIds = [...new Set(joins.map((j) => j.matchId))];
    const matches = await db.select().from(userMatchesTable)
      .where(inArray(userMatchesTable.id, matchIds));

    const matchMap: Record<number, typeof userMatchesTable.$inferSelect> = {};
    for (const m of matches) matchMap[m.id] = m;

    const result = joins.map((j) => {
      const match = matchMap[j.matchId];
      if (!match) return null;
      const effStatus = effectiveStatus(match);
      const isActive = effStatus === "active";
      const isPaidMember = j.status === "accepted";
      return {
        joinId: j.id,
        matchId: j.matchId,
        matchName: match.matchName || `${match.matchType} Match`,
        matchType: match.matchType,
        creatorName: match.creatorName,
        prizePool: match.prizePool,
        entryFee: match.entryFee,
        maxSlots: match.maxSlots,
        filledSlots: match.filledSlots,
        isPrivate: match.isPrivate,
        status: j.status,
        joinedAt: j.joinedAt,
        effectiveStatus: effStatus,
        timerStartedAt: match.timerStartedAt,
        startDelayMinutes: match.startDelayMinutes,
        roomId: (isPaidMember && isActive) ? match.roomId : null,
        adminRoomId: isPaidMember ? (match.adminRoomId ?? null) : null,
        adminRoomPassword: isPaidMember ? (match.adminRoomPassword ?? null) : null,
      };
    }).filter(Boolean);

    res.json(result);
  } catch (err) {
    logger.error({ err }, "Failed to load requests");
    res.status(500).json({ error: "Failed to load your requests." });
  }
});

// ─── Get participants for a match ─────────────────────────────────────────────

router.get("/user-matches/:id/participants", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const participants = await db.select().from(userMatchJoinsTable)
      .where(and(eq(userMatchJoinsTable.matchId, id), eq(userMatchJoinsTable.status, "accepted")))
      .orderBy(userMatchJoinsTable.joinedAt);
    res.json(participants);
  } catch {
    res.status(500).json({ error: "Failed to load participants." });
  }
});

// ─── Get join requests for my match (creator) ────────────────────────────────

router.get("/user-matches/:id/join-requests", async (req, res) => {
  const userId = await requireAuth(req, res);
  if (!userId) return;
  try {
    const id = parseInt(req.params.id);
    const [match] = await db.select().from(userMatchesTable).where(eq(userMatchesTable.id, id)).limit(1);
    if (!match) return res.status(404).json({ error: "Match not found." });
    if (match.creatorId !== userId) return res.status(403).json({ error: "Not your match." });

    const requests = await db.select().from(userMatchJoinsTable)
      .where(eq(userMatchJoinsTable.matchId, id))
      .orderBy(userMatchJoinsTable.joinedAt);
    res.json(requests);
  } catch {
    res.status(500).json({ error: "Failed to load requests." });
  }
});

// ─── Get room details (creator or accepted participants when active) ───────────

router.get("/user-matches/:id/details", async (req, res) => {
  const userId = await requireAuth(req, res);
  if (!userId) return;
  try {
    const id = parseInt(req.params.id);
    const [match] = await db.select().from(userMatchesTable).where(eq(userMatchesTable.id, id)).limit(1);
    if (!match) return res.status(404).json({ error: "Match not found." });

    const isCreator = match.creatorId === userId;
    const effStatus = effectiveStatus(match);

    if (!isCreator) {
      const [join] = await db.select().from(userMatchJoinsTable)
        .where(and(eq(userMatchJoinsTable.matchId, id), eq(userMatchJoinsTable.userId, userId)))
        .limit(1);
      if (!join || join.status !== "accepted") {
        return res.status(403).json({ error: "You are not an accepted participant." });
      }
      if (effStatus !== "active") {
        return res.status(403).json({ error: "Room details are only visible once the match is active." });
      }
    }

    res.json({ roomId: match.roomId ?? null, hasPassword: !!match.passwordHash });
  } catch {
    res.status(500).json({ error: "Failed to load match details." });
  }
});

// ─── Join a match ─────────────────────────────────────────────────────────────

const PLAYERS_FOR_TYPE: Record<string, number> = {
  "1v1": 1, "2v2": 2, "3v3": 3, "4v4": 4,
};

router.post("/user-matches/:id/join", async (req, res) => {
  const userId = await requireAuth(req, res);
  if (!userId) return;
  try {
    const id = parseInt(req.params.id);
    const { players, password } = req.body;

    const [match] = await db.select().from(userMatchesTable).where(eq(userMatchesTable.id, id)).limit(1);
    if (!match) return res.status(404).json({ error: "Match not found." });

    const effStatus = effectiveStatus(match);
    if (!["waiting", "active", "approved"].includes(effStatus)) {
      return res.status(400).json({ error: "This match is not open for joining." });
    }
    // Temporarily disabled for testing: creators may join their own match
    // if (match.creatorId === userId) return res.status(400).json({ error: "You cannot join your own match." });
    if (match.filledSlots >= match.maxSlots) return res.status(400).json({ error: "This match is full." });

    const requiredPlayers = PLAYERS_FOR_TYPE[match.matchType] ?? 1;
    if (!Array.isArray(players) || players.length !== requiredPlayers) {
      return res.status(400).json({ error: `This ${match.matchType} match requires ${requiredPlayers} player(s).` });
    }
    for (let i = 0; i < players.length; i++) {
      const p = players[i];
      if (!p?.name || !String(p.name).trim()) return res.status(400).json({ error: `Player ${i + 1} In-Game Name is required.` });
      if (!p?.uid || !String(p.uid).trim()) return res.status(400).json({ error: `Player ${i + 1} Game UID is required.` });
    }

    const existing = await db.select({ id: userMatchJoinsTable.id })
      .from(userMatchJoinsTable)
      .where(and(eq(userMatchJoinsTable.matchId, id), eq(userMatchJoinsTable.userId, userId)))
      .limit(1);
    if (existing.length > 0) return res.status(400).json({ error: "You have already joined or requested this match." });

    const [user] = await db.select({ username: usersTable.username, displayName: usersTable.displayName })
      .from(usersTable).where(eq(usersTable.clerkId, userId)).limit(1);

    const firstPlayer = players[0];
    const teamPlayersJson = JSON.stringify(players.map((p: any) => ({ name: String(p.name).trim(), uid: String(p.uid).trim() })));

    if (match.isPrivate) {
      await db.insert(userMatchJoinsTable).values({
        matchId: id,
        userId,
        username: user?.displayName ?? user?.username ?? "Unknown",
        inGameName: String(firstPlayer.name).trim(),
        gameUid: String(firstPlayer.uid).trim(),
        teamPlayers: teamPlayersJson,
        status: "pending",
      });
      return res.json({ success: true, message: "Join request submitted! The creator will review it.", isPending: true });
    }

    if (match.passwordHash) {
      if (!password || !String(password).trim()) {
        return res.status(400).json({ error: "This match requires a password." });
      }
      const valid = await bcrypt.compare(String(password), match.passwordHash);
      if (!valid) return res.status(400).json({ error: "Incorrect match password." });
    }

    const entryFee = parseFloat(match.entryFee);
    if (entryFee > 0) {
      const balance = await getUserBalance(userId);
      if (balance < entryFee) {
        return res.status(400).json({ error: `Insufficient balance. Need ৳${entryFee.toFixed(2)}, have ৳${balance.toFixed(2)}.` });
      }
      await db.insert(walletTransactionsTable).values({
        userId,
        type: "tournament_entry",
        amount: entryFee.toFixed(2),
        status: "approved",
        notes: `Entry: ${match.matchName || match.matchType} match #${match.id}`,
        tournamentId: null,
      });
    }

    await db.insert(userMatchJoinsTable).values({
      matchId: id,
      userId,
      username: user?.displayName ?? user?.username ?? "Unknown",
      inGameName: String(firstPlayer.name).trim(),
      gameUid: String(firstPlayer.uid).trim(),
      teamPlayers: teamPlayersJson,
      status: "accepted",
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

// ─── Creator: update match (room id, name, description, password) ─────────────

router.patch("/user-matches/:id", async (req, res) => {
  const userId = await requireAuth(req, res);
  if (!userId) return;
  try {
    const id = parseInt(req.params.id);
    const [match] = await db.select().from(userMatchesTable).where(eq(userMatchesTable.id, id)).limit(1);
    if (!match) return res.status(404).json({ error: "Match not found." });
    if (match.creatorId !== userId) return res.status(403).json({ error: "Not your match." });

    const updates: Partial<typeof userMatchesTable.$inferInsert> = {};
    if (req.body.matchName !== undefined) updates.matchName = req.body.matchName?.trim() || null;
    if (req.body.description !== undefined) updates.description = req.body.description || null;
    if (req.body.roomId !== undefined) updates.roomId = req.body.roomId?.trim() || null;
    if (req.body.password !== undefined) {
      if (req.body.password && req.body.password.trim().length > 0) {
        updates.passwordHash = await bcrypt.hash(req.body.password.trim(), 10);
      } else {
        updates.passwordHash = null;
      }
    }

    const [updated] = await db.update(userMatchesTable).set(updates).where(eq(userMatchesTable.id, id)).returning();
    res.json(stripMatch(updated, true));
  } catch (err) {
    logger.error({ err }, "Failed to update match");
    res.status(500).json({ error: "Failed to update match." });
  }
});

// ─── Creator: start timer ─────────────────────────────────────────────────────

router.post("/user-matches/:id/start-timer", async (req, res) => {
  const userId = await requireAuth(req, res);
  if (!userId) return;
  try {
    const id = parseInt(req.params.id);
    const { delayMinutes } = req.body;

    const delay = parseInt(delayMinutes);
    if (isNaN(delay) || delay < 1 || delay > 120) {
      return res.status(400).json({ error: "delayMinutes must be between 1 and 120." });
    }

    const [match] = await db.select().from(userMatchesTable).where(eq(userMatchesTable.id, id)).limit(1);
    if (!match) return res.status(404).json({ error: "Match not found." });
    if (match.creatorId !== userId) return res.status(403).json({ error: "Not your match." });
    if (match.status === "pending_approval") return res.status(400).json({ error: "This match is pending admin approval. You can start the timer once it is approved." });
    if (effectiveStatus(match) === "active") return res.status(400).json({ error: "Match is already active." });

    const now = new Date();
    const [updated] = await db.update(userMatchesTable)
      .set({ timerStartedAt: now, startDelayMinutes: delay, status: "waiting" })
      .where(eq(userMatchesTable.id, id))
      .returning();

    res.json({ success: true, timerStartedAt: now, startDelayMinutes: delay, startsAt: new Date(now.getTime() + delay * 60000) });
  } catch (err) {
    logger.error({ err }, "Failed to start timer");
    res.status(500).json({ error: "Failed to start timer." });
  }
});

// ─── Creator: approve join request ───────────────────────────────────────────

router.patch("/user-matches/:id/join-requests/:joinId/approve", async (req, res) => {
  const userId = await requireAuth(req, res);
  if (!userId) return;
  try {
    const matchId = parseInt(req.params.id);
    const joinId = parseInt(req.params.joinId);

    const [match] = await db.select().from(userMatchesTable).where(eq(userMatchesTable.id, matchId)).limit(1);
    if (!match) return res.status(404).json({ error: "Match not found." });
    if (match.creatorId !== userId) return res.status(403).json({ error: "Not your match." });
    if (match.filledSlots >= match.maxSlots) return res.status(400).json({ error: "Match is full." });

    const [join] = await db.select().from(userMatchJoinsTable).where(eq(userMatchJoinsTable.id, joinId)).limit(1);
    if (!join || join.matchId !== matchId) return res.status(404).json({ error: "Request not found." });
    if (join.status !== "pending") return res.status(400).json({ error: "Request is not pending." });

    const entryFee = parseFloat(match.entryFee);
    if (entryFee > 0) {
      const balance = await getUserBalance(join.userId);
      if (balance < entryFee) {
        return res.status(400).json({ error: `Player has insufficient balance (৳${balance.toFixed(2)}).` });
      }
      await db.insert(walletTransactionsTable).values({
        userId: join.userId,
        type: "tournament_entry",
        amount: entryFee.toFixed(2),
        status: "approved",
        notes: `Entry (approved): ${match.matchName || match.matchType} match #${match.id}`,
        tournamentId: null,
      });
    }

    await db.update(userMatchJoinsTable).set({ status: "accepted" }).where(eq(userMatchJoinsTable.id, joinId));
    await db.update(userMatchesTable)
      .set({ filledSlots: sql`${userMatchesTable.filledSlots} + 1` })
      .where(eq(userMatchesTable.id, matchId));

    res.json({ success: true });
  } catch (err) {
    logger.error({ err }, "Failed to approve");
    res.status(500).json({ error: "Failed to approve request." });
  }
});

// ─── Creator: reject join request ────────────────────────────────────────────

router.patch("/user-matches/:id/join-requests/:joinId/reject", async (req, res) => {
  const userId = await requireAuth(req, res);
  if (!userId) return;
  try {
    const matchId = parseInt(req.params.id);
    const joinId = parseInt(req.params.joinId);

    const [match] = await db.select().from(userMatchesTable).where(eq(userMatchesTable.id, matchId)).limit(1);
    if (!match) return res.status(404).json({ error: "Match not found." });
    if (match.creatorId !== userId) return res.status(403).json({ error: "Not your match." });

    const [join] = await db.select().from(userMatchJoinsTable).where(eq(userMatchJoinsTable.id, joinId)).limit(1);
    if (!join || join.matchId !== matchId) return res.status(404).json({ error: "Request not found." });
    if (join.status !== "pending") return res.status(400).json({ error: "Request is not pending." });

    await db.update(userMatchJoinsTable).set({ status: "rejected" }).where(eq(userMatchJoinsTable.id, joinId));
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Failed to reject request." });
  }
});

// ─── Creator/user: cancel match ───────────────────────────────────────────────

router.delete("/user-matches/:id", async (req, res) => {
  const userId = await requireAuth(req, res);
  if (!userId) return;
  try {
    const id = parseInt(req.params.id);
    const [match] = await db.select().from(userMatchesTable).where(eq(userMatchesTable.id, id)).limit(1);
    if (!match) return res.status(404).json({ error: "Match not found." });
    if (match.creatorId !== userId) return res.status(403).json({ error: "Not your match." });

    const effStatus = effectiveStatus(match);
    if (effStatus === "ended") return res.status(400).json({ error: "Ended matches cannot be cancelled." });

    const entryFee = parseFloat(match.entryFee);
    if (entryFee > 0) {
      const accepted = await db.select().from(userMatchJoinsTable)
        .where(and(eq(userMatchJoinsTable.matchId, id), eq(userMatchJoinsTable.status, "accepted")));
      for (const j of accepted) {
        await db.insert(walletTransactionsTable).values({
          userId: j.userId,
          type: "tournament_prize",
          amount: entryFee.toFixed(2),
          status: "approved",
          notes: `Refund: ${match.matchName || match.matchType} match #${match.id} cancelled`,
          tournamentId: null,
        });
      }
    }

    await db.delete(userMatchJoinsTable).where(eq(userMatchJoinsTable.matchId, id));
    await db.delete(userMatchesTable).where(eq(userMatchesTable.id, id));
    res.json({ success: true });
  } catch (err) {
    logger.error({ err }, "Failed to cancel match");
    res.status(500).json({ error: "Failed to cancel match." });
  }
});

// ─── Admin: set room credentials for a match ─────────────────────────────────

router.patch("/admin/user-matches/:id/room-credentials", async (req, res) => {
  if (!await requireAdmin(req, res)) return;
  try {
    const id = parseInt(req.params.id);
    const { adminRoomId, adminRoomPassword } = req.body;

    if (!adminRoomId || !String(adminRoomId).trim()) {
      return res.status(400).json({ error: "adminRoomId is required." });
    }

    const [match] = await db.select().from(userMatchesTable).where(eq(userMatchesTable.id, id)).limit(1);
    if (!match) return res.status(404).json({ error: "Match not found." });

    const [updated] = await db.update(userMatchesTable)
      .set({
        adminRoomId: String(adminRoomId).trim(),
        adminRoomPassword: adminRoomPassword ? String(adminRoomPassword).trim() : null,
      })
      .where(eq(userMatchesTable.id, id))
      .returning();

    res.json({ success: true, adminRoomId: updated.adminRoomId, adminRoomPassword: updated.adminRoomPassword });
  } catch (err) {
    logger.error({ err }, "Failed to set room credentials");
    res.status(500).json({ error: "Failed to set room credentials." });
  }
});

// ─── Admin: create a match directly (auto-approved) ──────────────────────────

router.post("/admin/user-matches", async (req, res) => {
  if (!await requireAdmin(req, res)) return;
  try {
    const { matchName, matchType, scheduledAt, description, prizePool: prizePoolInput, entryFee: entryFeeInput, perKill: perKillInput, mapName, isPrivate } = req.body;
    if (!matchType) return res.status(400).json({ error: "matchType is required." });

    const maxSlots = SLOTS_FOR_TYPE[matchType];
    if (!maxSlots) return res.status(400).json({ error: "Invalid matchType. Must be one of: BR, CS, SOLO, LONE_WOLF, FREE." });

    const prize = prizePoolInput !== undefined ? Math.max(0, parseFloat(prizePoolInput) || 0) : 0;
    const fee = entryFeeInput !== undefined ? Math.max(0, parseFloat(entryFeeInput) || 0) : 0;
    const perKill = perKillInput !== undefined ? Math.max(0, parseFloat(perKillInput) || 0) : 0;

    const [match] = await db.insert(userMatchesTable).values({
      creatorId: "admin",
      creatorName: "Admin",
      matchName: matchName?.trim() || null,
      matchType,
      prizePool: prize.toFixed(2),
      entryFee: fee.toFixed(2),
      perKill: perKill > 0 ? perKill.toFixed(2) : null,
      mapName: mapName?.trim() || null,
      maxSlots,
      scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
      description: description?.trim() || null,
      isPrivate: !!isPrivate,
      status: "waiting",
    }).returning();

    res.status(201).json(stripMatch(match, true));
  } catch (err) {
    logger.error({ err }, "Admin failed to create match");
    res.status(500).json({ error: "Failed to create match." });
  }
});

// ─── Admin: list all matches ──────────────────────────────────────────────────

router.get("/admin/user-matches", async (req, res) => {
  if (!await requireAdmin(req, res)) return;
  try {
    const matches = await db.select().from(userMatchesTable).orderBy(desc(userMatchesTable.createdAt));
    res.json(matches.map((m) => ({ ...stripMatch(m, true), effectiveStatus: effectiveStatus(m) })));
  } catch {
    res.status(500).json({ error: "Failed to load matches." });
  }
});

// ─── Admin: delete any match ──────────────────────────────────────────────────

router.delete("/admin/user-matches/:id", async (req, res) => {
  if (!await requireAdmin(req, res)) return;
  try {
    const id = parseInt(req.params.id);
    const [match] = await db.select().from(userMatchesTable).where(eq(userMatchesTable.id, id)).limit(1);
    if (!match) return res.status(404).json({ error: "Match not found." });

    const entryFee = parseFloat(match.entryFee);
    if (entryFee > 0) {
      const accepted = await db.select().from(userMatchJoinsTable)
        .where(and(eq(userMatchJoinsTable.matchId, id), eq(userMatchJoinsTable.status, "accepted")));
      for (const j of accepted) {
        await db.insert(walletTransactionsTable).values({
          userId: j.userId,
          type: "tournament_prize",
          amount: entryFee.toFixed(2),
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

// ─── Admin: approve/reject (legacy compat) ────────────────────────────────────

router.patch("/admin/user-matches/:id/approve", async (req, res) => {
  if (!await requireAdmin(req, res)) return;
  try {
    const id = parseInt(req.params.id);
    const { entryFee } = req.body;
    const fee = parseFloat(entryFee ?? "0");
    if (isNaN(fee) || fee < 0) return res.status(400).json({ error: "Invalid entry fee." });

    const [updated] = await db.update(userMatchesTable)
      .set({ status: "waiting", adminNote: null, entryFee: fee.toFixed(2), isPrivate: false })
      .where(eq(userMatchesTable.id, id))
      .returning();
    if (!updated) return res.status(404).json({ error: "Match not found." });
    res.json(stripMatch(updated, true));
  } catch {
    res.status(500).json({ error: "Failed to approve match." });
  }
});

router.patch("/admin/user-matches/:id/reject", async (req, res) => {
  if (!await requireAdmin(req, res)) return;
  try {
    const id = parseInt(req.params.id);
    const { adminNote } = req.body;
    const [updated] = await db.update(userMatchesTable)
      .set({ status: "cancelled", adminNote: adminNote ?? null })
      .where(eq(userMatchesTable.id, id))
      .returning();
    if (!updated) return res.status(404).json({ error: "Match not found." });
    res.json(stripMatch(updated, true));
  } catch {
    res.status(500).json({ error: "Failed to reject match." });
  }
});

export default router;
