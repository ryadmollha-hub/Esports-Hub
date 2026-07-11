import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { announcementsTable } from "@workspace/db";
import { eq, desc, and, or, isNull, gt } from "drizzle-orm";
import { requireAdmin } from "../middlewares/requireAdmin";

const router: IRouter = Router();

// ─── GET /announcements — public, active + not expired ──────────────────────

router.get("/announcements", async (_req, res) => {
  try {
    const now = new Date();
    const rows = await db
      .select()
      .from(announcementsTable)
      .where(
        and(
          eq(announcementsTable.isActive, true),
          or(isNull(announcementsTable.expiresAt), gt(announcementsTable.expiresAt, now))
        )
      )
      .orderBy(desc(announcementsTable.isPinned), desc(announcementsTable.createdAt))
      .limit(50);
    res.json(rows);
  } catch {
    res.status(500).json({ error: "Failed to load announcements." });
  }
});

// ─── GET /announcements/all — admin, all including inactive ─────────────────

router.get("/announcements/all", async (req, res) => {
  if (!await requireAdmin(req, res)) return;
  try {
    const rows = await db
      .select()
      .from(announcementsTable)
      .orderBy(desc(announcementsTable.isPinned), desc(announcementsTable.createdAt));
    res.json(rows);
  } catch {
    res.status(500).json({ error: "Failed to load announcements." });
  }
});

// ─── POST /announcements — admin create ────────────────────────────────────

router.post("/announcements", async (req, res) => {
  if (!await requireAdmin(req, res)) return;
  try {
    const { title, content, type, displayMode, isPinned, isActive, expiresAt } = req.body;
    if (!title || !content) {
      return res.status(400).json({ error: "title and content are required." });
    }
    const [announcement] = await db
      .insert(announcementsTable)
      .values({
        title,
        content,
        type: type ?? "info",
        displayMode: displayMode ?? "banner",
        isPinned: isPinned ?? false,
        isActive: isActive !== false,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      })
      .returning();
    res.status(201).json(announcement);
  } catch {
    res.status(500).json({ error: "Failed to create announcement." });
  }
});

// ─── PUT /announcements/:id — admin update ──────────────────────────────────

router.put("/announcements/:id", async (req, res) => {
  if (!await requireAdmin(req, res)) return;
  try {
    const id = parseInt(req.params.id);
    const { title, content, type, displayMode, isPinned, isActive, expiresAt } = req.body;
    const [updated] = await db
      .update(announcementsTable)
      .set({
        ...(title !== undefined && { title }),
        ...(content !== undefined && { content }),
        ...(type !== undefined && { type }),
        ...(displayMode !== undefined && { displayMode }),
        ...(isPinned !== undefined && { isPinned }),
        ...(isActive !== undefined && { isActive }),
        expiresAt: expiresAt !== undefined ? (expiresAt ? new Date(expiresAt) : null) : undefined,
        updatedAt: new Date(),
      })
      .where(eq(announcementsTable.id, id))
      .returning();
    if (!updated) return res.status(404).json({ error: "Announcement not found." });
    res.json(updated);
  } catch {
    res.status(500).json({ error: "Failed to update announcement." });
  }
});

// ─── PATCH /announcements/:id/pin — toggle pin ──────────────────────────────

router.patch("/announcements/:id/pin", async (req, res) => {
  if (!await requireAdmin(req, res)) return;
  try {
    const id = parseInt(req.params.id);
    const [current] = await db.select().from(announcementsTable).where(eq(announcementsTable.id, id));
    if (!current) return res.status(404).json({ error: "Announcement not found." });
    const [updated] = await db
      .update(announcementsTable)
      .set({ isPinned: !current.isPinned, updatedAt: new Date() })
      .where(eq(announcementsTable.id, id))
      .returning();
    res.json(updated);
  } catch {
    res.status(500).json({ error: "Failed to update announcement." });
  }
});

// ─── DELETE /announcements/:id ──────────────────────────────────────────────

router.delete("/announcements/:id", async (req, res) => {
  if (!await requireAdmin(req, res)) return;
  try {
    const id = parseInt(req.params.id);
    await db.delete(announcementsTable).where(eq(announcementsTable.id, id));
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Failed to delete announcement." });
  }
});

export default router;
