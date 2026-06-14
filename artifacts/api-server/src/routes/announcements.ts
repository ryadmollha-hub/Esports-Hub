import { Router, type IRouter } from "express";
import { getAuth } from "@clerk/express";
import { db } from "@workspace/db";
import { announcementsTable, usersTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { CreateAnnouncementBody } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/announcements", async (_req, res) => {
  const rows = await db
    .select()
    .from(announcementsTable)
    .orderBy(desc(announcementsTable.createdAt))
    .limit(20);
  res.json(rows);
});

router.post("/announcements", async (req, res) => {
  const { userId } = getAuth(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  const user = await db.select().from(usersTable).where(eq(usersTable.clerkId, userId));
  if (!user[0]?.isAdmin) return res.status(403).json({ error: "Forbidden" });
  const data = CreateAnnouncementBody.parse(req.body);
  const [announcement] = await db
    .insert(announcementsTable)
    .values({
      title: data.title,
      content: data.content,
      type: data.type ?? "info",
    })
    .returning();
  res.status(201).json(announcement);
});

export default router;
