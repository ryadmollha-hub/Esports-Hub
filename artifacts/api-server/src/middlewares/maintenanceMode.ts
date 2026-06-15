import type { Request, Response, NextFunction } from "express";
import { db } from "@workspace/db";
import { settingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

let cached: boolean | null = null;
let cacheTime = 0;
const CACHE_TTL_MS = 10_000;

export async function getMaintenanceMode(): Promise<boolean> {
  const now = Date.now();
  if (cached !== null && now - cacheTime < CACHE_TTL_MS) return cached;
  try {
    const [row] = await db.select().from(settingsTable).where(eq(settingsTable.key, "maintenance_mode")).limit(1);
    cached = row?.value === "true";
    cacheTime = now;
    return cached;
  } catch {
    return cached ?? false;
  }
}

export async function setMaintenanceMode(enabled: boolean): Promise<void> {
  const value = enabled ? "true" : "false";
  const [existing] = await db.select().from(settingsTable).where(eq(settingsTable.key, "maintenance_mode")).limit(1);
  if (existing) {
    await db.update(settingsTable).set({ value, updatedAt: new Date() }).where(eq(settingsTable.key, "maintenance_mode"));
  } else {
    await db.insert(settingsTable).values({ key: "maintenance_mode", value });
  }
  cached = enabled;
  cacheTime = Date.now();
}

export function invalidateMaintenanceCache(): void {
  cached = null;
  cacheTime = 0;
}

function isAdminRequest(req: Request): boolean {
  const ADMIN_USERNAME = process.env.ADMIN_USERNAME ?? "BLACKCODE";
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "USER505";
  const ADMIN_SECRET = process.env.ADMIN_SECRET ?? "blackcode-admin-secret-2026";
  const expectedToken = Buffer.from(`${ADMIN_USERNAME}:${ADMIN_PASSWORD}:${ADMIN_SECRET}`).toString("base64");
  if (req.headers["x-admin-token"] === expectedToken) return true;
  const auth = req.headers["authorization"];
  if (auth?.startsWith("Bearer ")) {
    try {
      const { verifyToken } = require("../lib/jwt");
      const payload = verifyToken(auth.slice(7));
      if (payload?.isAdmin) return true;
    } catch {}
  }
  return false;
}

const ALWAYS_ALLOWED = [
  "/api/captcha",
  "/api/auth/login",
  "/api/auth/register",
  "/api/settings/maintenance",
];

export async function maintenanceModeMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  const active = await getMaintenanceMode();
  if (!active) { next(); return; }

  const path = req.path;

  if (ALWAYS_ALLOWED.some((p) => path.startsWith(p))) { next(); return; }
  if (path.startsWith("/api/admin")) { next(); return; }
  if (isAdminRequest(req)) { next(); return; }

  res.status(503).json({
    maintenance: true,
    message: "The website is currently under maintenance. Please check back soon.",
  });
}
