import { db } from "@workspace/db";
import { auditLogsTable } from "@workspace/db/schema";
import type { Request } from "express";

export function getClientIp(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (forwarded) return (Array.isArray(forwarded) ? forwarded[0] : forwarded).split(",")[0].trim();
  return req.socket?.remoteAddress ?? "unknown";
}

export async function audit(
  action: string,
  opts: {
    userId?: string | null;
    req?: Request;
    details?: Record<string, unknown>;
    severity?: "info" | "warning" | "critical";
  } = {},
): Promise<void> {
  try {
    await db.insert(auditLogsTable).values({
      action,
      userId: opts.userId ?? null,
      ipAddress: opts.req ? getClientIp(opts.req) : null,
      userAgent: opts.req?.headers["user-agent"] ?? null,
      details: opts.details ? JSON.stringify(opts.details) : null,
      severity: opts.severity ?? "info",
    });
  } catch {
    // Never let audit failures crash the app
  }
}
