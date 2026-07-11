import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { notificationsTable } from "@workspace/db";
import { eq, desc, and } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAdmin";

const router: IRouter = Router();

router.get("/notifications", async (req, res) => {
  const userId = await requireAuth(req, res);
  if (!userId) return;
  const rows = await db
    .select()
    .from(notificationsTable)
    .where(eq(notificationsTable.userId, userId))
    .orderBy(desc(notificationsTable.createdAt))
    .limit(50);
  res.json(rows);
});

router.get("/notifications/unread-count", async (req, res) => {
  const userId = await requireAuth(req, res);
  if (!userId) return;
  const rows = await db
    .select()
    .from(notificationsTable)
    .where(and(eq(notificationsTable.userId, userId), eq(notificationsTable.isRead, false)));
  res.json({ count: rows.length });
});

router.patch("/notifications/:id/read", async (req, res) => {
  const userId = await requireAuth(req, res);
  if (!userId) return;
  const id = parseInt(req.params.id);
  await db
    .update(notificationsTable)
    .set({ isRead: true })
    .where(and(eq(notificationsTable.id, id), eq(notificationsTable.userId, userId)));
  res.json({ success: true });
});

router.patch("/notifications/read-all", async (req, res) => {
  const userId = await requireAuth(req, res);
  if (!userId) return;
  await db
    .update(notificationsTable)
    .set({ isRead: true })
    .where(and(eq(notificationsTable.userId, userId), eq(notificationsTable.isRead, false)));
  res.json({ success: true });
});

export default router;
