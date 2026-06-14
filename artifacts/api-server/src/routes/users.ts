import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { UpdateMyProfileBody } from "@workspace/api-zod";
import { safeGetUserId } from "../lib/clerkAuth";

const router: IRouter = Router();

async function getOrCreateUser(clerkId: string, clerkUser?: { email?: string; username?: string }) {
  const existing = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkId));
  if (existing[0]) return existing[0];
  const [created] = await db
    .insert(usersTable)
    .values({
      clerkId,
      email: clerkUser?.email ?? null,
      username: clerkUser?.username ?? null,
    })
    .returning();
  return created;
}

function sanitize(user: any) {
  const { passwordHash, ...safe } = user;
  return safe;
}

router.get("/users/me", async (req, res) => {
  const userId = safeGetUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  const user = await getOrCreateUser(userId);
  res.json(sanitize(user));
});

router.patch("/users/me", async (req, res) => {
  const userId = safeGetUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  const data = UpdateMyProfileBody.parse(req.body);
  let user = await db.select().from(usersTable).where(eq(usersTable.clerkId, userId));
  if (!user[0]) {
    await getOrCreateUser(userId);
    user = await db.select().from(usersTable).where(eq(usersTable.clerkId, userId));
  }
  const [updated] = await db
    .update(usersTable)
    .set({
      ...(data.username !== undefined && { username: data.username }),
      ...(data.displayName !== undefined && { displayName: data.displayName }),
      ...(data.freefireUid !== undefined && { freefireUid: data.freefireUid }),
      ...(data.freefireNickname !== undefined && { freefireNickname: data.freefireNickname }),
      ...(data.avatarUrl !== undefined && { avatarUrl: data.avatarUrl }),
    })
    .where(eq(usersTable.clerkId, userId))
    .returning();
  res.json(sanitize(updated));
});

router.get("/users/:id", async (req, res) => {
  const id = req.params.id;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.clerkId, id));
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json(sanitize(user));
});

export default router;
