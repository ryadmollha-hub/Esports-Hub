import type { Request, Response } from "express";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { safeGetUserId } from "../lib/clerkAuth";

const ADMIN_USERNAME = process.env.ADMIN_USERNAME ?? "BLACKCODE";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "USER505";
const ADMIN_SECRET = process.env.ADMIN_SECRET ?? "blackcode-admin-secret-2026";

function getAdminToken(): string {
  return Buffer.from(`${ADMIN_USERNAME}:${ADMIN_PASSWORD}:${ADMIN_SECRET}`).toString("base64");
}

export function isValidAdminToken(req: Request): boolean {
  const token = (req as any).headers["x-admin-token"];
  return token === getAdminToken();
}

export async function requireAdmin(req: Request, res: Response): Promise<boolean> {
  if (isValidAdminToken(req)) return true;
  const userId = safeGetUserId(req);
  if (!userId) {
    res.status(401).json({ error: "You must be logged in to perform this action." });
    return false;
  }
  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.clerkId, userId));
    if (!user) {
      res.status(401).json({ error: "User not found. Please log in again." });
      return false;
    }
    if (!user.isAdmin) {
      res.status(403).json({ error: "Access denied. Admin privileges required." });
      return false;
    }
    return true;
  } catch {
    res.status(500).json({ error: "Authentication error. Please try again." });
    return false;
  }
}

export async function requireAuth(req: Request, res: Response): Promise<string | null> {
  const userId = safeGetUserId(req);
  if (!userId) {
    res.status(401).json({ error: "Please log in to continue." });
    return null;
  }
  return userId;
}
