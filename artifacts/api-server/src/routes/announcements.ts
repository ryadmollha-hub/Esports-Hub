import { Router, type IRouter } from "express";
import { safeGetUserId } from "../lib/clerkAuth";
import { db } from "@workspace/db";
import { announcementsTable, usersTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { CreateAnnouncementBody } from "@workspace/api-zod";

const router: IRouter = Router();

const ADMIN_SECRET = process.env.ADMIN_SECRET ?? "blackcode-admin-secret-2026";
const ADMIN_USERNAME = process.env.ADMIN_USERNAME ?? "BLACKCODE";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "USER505";

function isValidAdminToken(req: any): boolean {
  const token = req.headers["x-admin-token"];
  const expected = Buffer.from(`${ADMIN_USERNAME}:${ADMIN_PASSWORD}:${ADMIN_SECRET}`).toString("base64");
  return token === expected;
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

router.get("/announcements", async (_req, res) => {
  const rows = await db
    .select()
    .from(announcementsTable)
    .orderBy(desc(announcementsTable.createdAt))
    .limit(20);
  res.json(rows);
});

router.post("/announcements", async (req, res) => {
  if (!await requireAdmin(req, res)) return;
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

router.delete("/announcements/:id", async (req, res) => {
  if (!await requireAdmin(req, res)) return;
  const id = parseInt(req.params.id);
  await db.delete(announcementsTable).where(eq(announcementsTable.id, id));
  res.json({ success: true });
});

export default router;
