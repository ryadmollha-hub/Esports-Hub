import { db } from "@workspace/db";
import { userMatchesTable, matchesTable, registrationsTable, tournamentsTable } from "@workspace/db";
import { lt, lte, gte, and, ne, eq, isNull, isNotNull } from "drizzle-orm";
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

      // ── 1b. Auto-release rooms whose configured roomReleaseAt has passed ──
      // Mirrors exactly what POST /matches/:id/release-room does manually:
      // reveal credentials (roomReleased=true) and close registration for the
      // parent tournament, bundled into one automatic step once the admin's
      // chosen release time arrives. Requires roomId to already be set (the
      // admin must have saved credentials first) and skips matches that are
      // already released/hidden/completed so this only ever fires once.
      // (computeMatchVisibility in routes/matches.ts also derives visibility
      // from roomReleaseAt directly, so players see credentials the instant
      // their countdown hits zero — this write is the durable follow-up that
      // keeps roomReleased/registrationClosed consistent in the DB.)
      const dueRooms = await db
        .update(matchesTable)
        .set({ roomReleased: true, roomHidden: false })
        .where(
          and(
            isNotNull(matchesTable.roomReleaseAt),
            lte(matchesTable.roomReleaseAt, now),
            isNotNull(matchesTable.roomId),
            eq(matchesTable.roomReleased, false),
            eq(matchesTable.roomHidden, false),
            ne(matchesTable.status, "completed"),
          ),
        )
        .returning({ id: matchesTable.id, tournamentId: matchesTable.tournamentId, roomNotifiedAt: matchesTable.roomNotifiedAt });

      for (const room of dueRooms) {
        try {
          await db
            .update(tournamentsTable)
            .set({ registrationClosed: true })
            .where(eq(tournamentsTable.id, room.tournamentId));

          if (!room.roomNotifiedAt) {
            await db
              .update(matchesTable)
              .set({ roomNotifiedAt: now })
              .where(and(eq(matchesTable.id, room.id), isNull(matchesTable.roomNotifiedAt)));

            const registrants = await db
              .select({ userId: registrationsTable.userId })
              .from(registrationsTable)
              .where(
                and(
                  eq(registrationsTable.tournamentId, room.tournamentId),
                  eq(registrationsTable.status, "approved"),
                ),
              );
            const userIds = [...new Set(registrants.map((r) => r.userId))];
            if (userIds.length > 0) {
              await bulkCreateNotifications(
                userIds,
                "রুম আইডি রিলিজ হয়েছে! 🔑",
                "রুম আইডি ও পাসওয়ার্ড এখন দেখা যাচ্ছে। এখনই ম্যাচে যোগ দিন!",
                "info",
              );
            }
          }
        } catch (err) {
          logger.error({ err, matchId: room.id }, "Failed post-auto-release steps for match");
        }
      }

      if (dueRooms.length > 0) {
        logger.info({ count: dueRooms.length, ids: dueRooms.map((r) => r.id) }, "Auto-released rooms whose roomReleaseAt has passed");
      }

      // ── 2. Auto match-live: the ONE permitted automatic transition ────────
      // Once scheduledAt has passed, flip matchLive true. This never touches
      // room state, registration, or completion — fully decoupled.
      const dueMatches = await db
        .update(matchesTable)
        .set({ matchLive: true, status: "live" })
        .where(
          and(
            lte(matchesTable.scheduledAt, now),
            eq(matchesTable.matchLive, false),
            ne(matchesTable.status, "completed"),
          ),
        )
        .returning({ id: matchesTable.id, matchNumber: matchesTable.matchNumber });

      if (dueMatches.length > 0) {
        logger.info({ count: dueMatches.length, ids: dueMatches.map((m) => m.id) }, "Auto-started matches whose scheduledAt has passed");
      }

      // ── 3. TRIGGER B: 5-minute match start warning ───────────────────────
      // Matches starting in 4.5 – 5.5 min, not yet live, warning not yet sent.
      // This is a passive notification only — it never mutates room/registration state.
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
            eq(matchesTable.matchLive, false),
            ne(matchesTable.status, "completed"),
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
