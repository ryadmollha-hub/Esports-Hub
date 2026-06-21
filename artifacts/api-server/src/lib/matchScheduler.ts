import { db } from "@workspace/db";
import { userMatchesTable, matchesTable, registrationsTable } from "@workspace/db";
import { lt, lte, gte, and, ne, eq, isNull } from "drizzle-orm";
import { logger } from "./logger";
import { bulkCreateNotifications } from "./notificationHelper";

export function startMatchScheduler(): void {
  logger.info("Match scheduler starting (60s interval)");

  const tick = async () => {
    try {
      const now = new Date();

      // ── 1. Auto-expire community matches by roomHideTime ─────────────────
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

      // ── 2. TRIGGER A: Room credentials released — notify registrants ──────
      // Find tournament matches where roomReleaseAt has passed, credentials exist,
      // but room-open notification hasn't been sent yet (idempotency guard).
      const roomReadyMatches = await db
        .select()
        .from(matchesTable)
        .where(
          and(
            lte(matchesTable.roomReleaseAt, now),
            isNull(matchesTable.roomNotifiedAt),
          ),
        );

      for (const match of roomReadyMatches) {
        if (!match.roomId) continue;
        try {
          // Mark as notified first to prevent double-send under concurrent ticks
          const updated = await db
            .update(matchesTable)
            .set({ roomNotifiedAt: now })
            .where(and(eq(matchesTable.id, match.id), isNull(matchesTable.roomNotifiedAt)))
            .returning({ id: matchesTable.id });

          if (updated.length === 0) continue; // Another tick already handled it

          const registrants = await db
            .select({ userId: registrationsTable.userId })
            .from(registrationsTable)
            .where(
              and(
                eq(registrationsTable.tournamentId, match.tournamentId),
                eq(registrationsTable.status, "approved"),
              ),
            );

          const userIds = [...new Set(registrants.map((r) => r.userId))];
          if (userIds.length === 0) continue;

          await bulkCreateNotifications(
            userIds,
            "রুম আইডি ও পাসওয়ার্ড রেডি! ⚡",
            `আপনার টুর্নামেন্ট Match #${match.matchNumber} এর রুম আইডি ও পাসওয়ার্ড রিলিজ করা হয়েছে। জলদি চেক করে কাস্টম রুমে জয়েন করুন!`,
            "success",
          );

          logger.info({ matchId: match.id, matchNumber: match.matchNumber, userCount: userIds.length }, "Room-open notifications sent");
        } catch (err) {
          logger.error({ err, matchId: match.id }, "Failed to send room-open notifications for match");
        }
      }

      // ── 3. TRIGGER B: 5-minute match start warning ───────────────────────
      // Matches starting in 4.5 – 5.5 min, still scheduled, warning not yet sent.
      const fiveMinFrom = new Date(now.getTime() + 4.5 * 60 * 1000);
      const fiveMinTo   = new Date(now.getTime() + 5.5 * 60 * 1000);

      const warningMatches = await db
        .select()
        .from(matchesTable)
        .where(
          and(
            gte(matchesTable.scheduledAt, fiveMinFrom),
            lte(matchesTable.scheduledAt, fiveMinTo),
            isNull(matchesTable.startWarningNotifiedAt),
            eq(matchesTable.status, "scheduled"),
          ),
        );

      for (const match of warningMatches) {
        try {
          const updated = await db
            .update(matchesTable)
            .set({ startWarningNotifiedAt: now })
            .where(and(eq(matchesTable.id, match.id), isNull(matchesTable.startWarningNotifiedAt)))
            .returning({ id: matchesTable.id });

          if (updated.length === 0) continue;

          const registrants = await db
            .select({ userId: registrationsTable.userId })
            .from(registrationsTable)
            .where(
              and(
                eq(registrationsTable.tournamentId, match.tournamentId),
                eq(registrationsTable.status, "approved"),
              ),
            );

          const userIds = [...new Set(registrants.map((r) => r.userId))];
          if (userIds.length === 0) continue;

          await bulkCreateNotifications(
            userIds,
            "ম্যাচ শুরু হতে ৫ মিনিট বাকি! ⚠️",
            `তাড়াতাড়ি রুমে প্রবেশ করুন! ৫ মিনিট পর ম্যাচ স্টার্ট হয়ে যাবে এবং রুম আইডি হাইড হয়ে যাবে।`,
            "warning",
          );

          logger.info({ matchId: match.id, matchNumber: match.matchNumber, userCount: userIds.length }, "5-min warning notifications sent");
        } catch (err) {
          logger.error({ err, matchId: match.id }, "Failed to send 5-min warning for match");
        }
      }

    } catch (err) {
      logger.error({ err }, "Match scheduler tick error");
    }
  };

  tick();
  setInterval(tick, 60_000);
}
