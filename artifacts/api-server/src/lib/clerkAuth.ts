import { getAuth } from "@clerk/express";
import type { Request } from "express";

/**
 * Safely get the Clerk userId from a request.
 * Returns null if Clerk middleware failed to initialize (e.g. missing secret key).
 */
export function safeGetUserId(req: Request): string | null {
  try {
    const { userId } = getAuth(req);
    return userId ?? null;
  } catch {
    return null;
  }
}
