import { db } from "@workspace/db";
import { userMatchesTable } from "@workspace/db";
import { lt, and, ne } from "drizzle-orm";
import { logger } from "./logger";

export function startMatchScheduler(): void {
  logger.info("Match scheduler starting (60s interval)");

  const tick = async () => {
    try {
      const now = new Date();
      const expired = await db
        .update(userMatchesTable)
        .set({ status: "ended" })
        .where(
          and(
            lt(userMatchesTable.roomHideTime, now),
            ne(userMatchesTable.status, "ended"),
            ne(userMatchesTable.status, "cancelled"),
          ),
        )
        .returning({ id: userMatchesTable.id });

      if (expired.length > 0) {
        logger.info({ count: expired.length, ids: expired.map((r) => r.id) }, "Auto-expired matches by roomHideTime");
      }
    } catch (err) {
      logger.error({ err }, "Match scheduler tick error");
    }
  };

  tick();
  setInterval(tick, 60_000);
}
