import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { hypeBoardTable, registrationsTable, usersTable, tournamentsTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth, requireAdmin } from "../middlewares/requireAdmin";
import { computeBadges } from "../lib/badges";

const router: IRouter = Router();

// GET /api/tournaments/:id/hype — anyone can read; includes earned badges
router.get("/tournaments/:id/hype", async (req, res) => {
  try {
    const tournamentId = parseInt(req.params.id);
    const rows = await db
      .select({
        id: hypeBoardTable.id,
        tournamentId: hypeBoardTable.tournamentId,
        userId: hypeBoardTable.userId,
        playerName: hypeBoardTable.playerName,
        message: hypeBoardTable.message,
        createdAt: hypeBoardTable.createdAt,
        totalKills: usersTable.totalKills,
        totalWins: usersTable.totalWins,
        tournamentsPlayed: usersTable.tournamentsPlayed,
      })
      .from(hypeBoardTable)
      .leftJoin(usersTable, eq(hypeBoardTable.userId, usersTable.clerkId))
      .where(eq(hypeBoardTable.tournamentId, tournamentId))
      .orderBy(desc(hypeBoardTable.createdAt))
      .limit(100);

    const messages = rows.map(({ totalKills, totalWins, tournamentsPlayed, ...msg }) => ({
      ...msg,
      badges: computeBadges({ totalKills, totalWins, tournamentsPlayed }),
    }));

    res.json(messages);
  } catch {
    res.status(500).json({ error: "Failed to fetch hype messages." });
  }
});

// POST /api/tournaments/:id/hype — any logged-in user, 2-min cooldown
router.post("/tournaments/:id/hype", async (req, res) => {
  const userId = await requireAuth(req, res);
  if (!userId) return;

  try {
    const tournamentId = parseInt(req.params.id);
    const { message } = req.body as { message?: string };

    if (!message || message.trim().length === 0) {
      return res.status(400).json({ error: "Message cannot be empty." });
    }
    if (message.trim().length > 120) {
      return res.status(400).json({ error: "Message too long (max 120 characters)." });
    }

    // ── Server-side board lock: deny posting when tournament is live/ended ──
    const [tournament] = await db
      .select({ status: tournamentsTable.status })
      .from(tournamentsTable)
      .where(eq(tournamentsTable.id, tournamentId))
      .limit(1);

    if (!tournament) {
      return res.status(404).json({ error: "Tournament not found." });
    }

    const lockedStatuses = ["live", "ongoing", "ended", "completed", "cancelled"];
    if (lockedStatuses.includes(tournament.status)) {
      return res.status(403).json({
        error: "Hype Board is locked because the match is live or has ended.",
      });
    }

    // ── Rate limit: 1 message per 2 minutes per user per tournament ──
    const twoMinsAgo = new Date(Date.now() - 120 * 1000);
    const [recent] = await db
      .select({ id: hypeBoardTable.id, createdAt: hypeBoardTable.createdAt })
      .from(hypeBoardTable)
      .where(
        and(
          eq(hypeBoardTable.tournamentId, tournamentId),
          eq(hypeBoardTable.userId, userId),
        ),
      )
      .orderBy(desc(hypeBoardTable.createdAt))
      .limit(1);

    if (recent && new Date(recent.createdAt) > twoMinsAgo) {
      const waitMs = new Date(recent.createdAt).getTime() + 120 * 1000 - Date.now();
      const waitSeconds = Math.ceil(waitMs / 1000);
      const waitMins = Math.ceil(waitMs / 60000);
      return res.status(429).json({
        error: `আরও ${waitMins} মিনিট অপেক্ষা করুন।`,
        waitSeconds,
      });
    }

    // ── Get player name ──
    const [userRow] = await db
      .select({ displayName: usersTable.displayName, username: usersTable.username })
      .from(usersTable)
      .where(eq(usersTable.clerkId, userId))
      .limit(1);

    const playerName = userRow?.displayName ?? userRow?.username ?? "Unknown";

    const [inserted] = await db
      .insert(hypeBoardTable)
      .values({ tournamentId, userId, playerName, message: message.trim() })
      .returning();

    res.json(inserted);
  } catch {
    res.status(500).json({ error: "Failed to post hype message." });
  }
});

// DELETE /api/hype/:messageId — admin only
router.delete("/hype/:messageId", async (req, res) => {
  const ok = await requireAdmin(req, res);
  if (!ok) return;

  try {
    const messageId = parseInt(req.params.messageId);
    await db.delete(hypeBoardTable).where(eq(hypeBoardTable.id, messageId));
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Failed to delete message." });
  }
});

export default router;
