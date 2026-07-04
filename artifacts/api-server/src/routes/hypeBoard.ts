import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { hypeBoardTable, registrationsTable, usersTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth, requireAdmin } from "../middlewares/requireAdmin";

const router: IRouter = Router();

// GET /api/tournaments/:id/hype — anyone can read
router.get("/tournaments/:id/hype", async (req, res) => {
  try {
    const tournamentId = parseInt(req.params.id);
    const rows = await db
      .select()
      .from(hypeBoardTable)
      .where(eq(hypeBoardTable.tournamentId, tournamentId))
      .orderBy(desc(hypeBoardTable.createdAt))
      .limit(100);
    res.json(rows);
  } catch {
    res.status(500).json({ error: "Failed to fetch hype messages." });
  }
});

// POST /api/tournaments/:id/hype — approved registered players only
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

    // Check user is registered for this tournament (approved)
    const [reg] = await db
      .select({ id: registrationsTable.id })
      .from(registrationsTable)
      .where(
        and(
          eq(registrationsTable.tournamentId, tournamentId),
          eq(registrationsTable.userId, userId),
          eq(registrationsTable.status, "approved"),
        ),
      )
      .limit(1);

    if (!reg) {
      return res.status(403).json({ error: "Only approved players can post hype." });
    }

    // Rate limit: 1 message per 10 minutes per user per tournament
    const tenMinsAgo = new Date(Date.now() - 10 * 60 * 1000);
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

    if (recent && new Date(recent.createdAt) > tenMinsAgo) {
      const wait = Math.ceil((new Date(recent.createdAt).getTime() + 10 * 60 * 1000 - Date.now()) / 60000);
      return res.status(429).json({ error: `আরও ${wait} মিনিট অপেক্ষা করুন।` });
    }

    // Get player name
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
