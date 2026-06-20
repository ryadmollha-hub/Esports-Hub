import { db } from "@workspace/db";
import { matchCountersTable } from "@workspace/db";
import { sql } from "drizzle-orm";

/**
 * Atomically increment the match counter for the given type and return the
 * next formatted serial number.
 *
 * Tournament matches → T-0001, T-0002, …
 * Community matches  → C-0001, C-0002, …
 *
 * Numbers are permanent: they are never reset, never reused even after a match
 * is deleted, and continue increasing forever (zero-padded to 4 digits, then
 * naturally wider e.g. T-10000, T-99999, …).
 */
export async function nextMatchSerial(
  type: "tournament" | "community",
): Promise<string> {
  const [row] = await db
    .insert(matchCountersTable)
    .values({ type, lastValue: 1 })
    .onConflictDoUpdate({
      target: matchCountersTable.type,
      set: { lastValue: sql`${matchCountersTable.lastValue} + 1` },
    })
    .returning();

  const prefix = type === "tournament" ? "T" : "C";
  const n = row.lastValue;
  return `${prefix}-${n.toString().padStart(4, "0")}`;
}
