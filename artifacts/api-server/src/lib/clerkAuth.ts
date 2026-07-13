import type { Request } from "express";

/**
 * Get the authenticated user ID from the JWT-verified request.
 * Returns null if not authenticated.
 */
export function safeGetUserId(req: Request): string | null {
  return (req as any).userId ?? null;
}
