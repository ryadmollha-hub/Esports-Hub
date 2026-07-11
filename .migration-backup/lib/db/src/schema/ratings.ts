import { pgTable, serial, text, integer, timestamp, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

// ─── FF Arena Skill Rating ────────────────────────────────────────────────────
//
// Each registered user has exactly ONE row in player_ratings (upserted on every
// match result publication).  Rating is additive — it never decreases.  This
// keeps the system friendly for newcomers while still rewarding consistent play.
//
// Tier thresholds (total accumulated rating points):
//   Bronze       0  – 999
//   Silver    1000  – 2 499
//   Gold      2500  – 4 999
//   Platinum  5000  – 7 999
//   Diamond   8000  – 11 999
//   Master   12000  – 15 999
//   Heroic   16000+

export const playerRatingsTable = pgTable("player_ratings", {
  id:           serial("id").primaryKey(),
  userId:       text("user_id").notNull().unique(),   // matches usersTable.clerkId
  playerName:   text("player_name").notNull(),
  rating:       integer("rating").notNull().default(0),
  tier:         text("tier").notNull().default("Bronze"),
  totalMatches: integer("total_matches").notNull().default(0),
  totalKills:   integer("total_kills").notNull().default(0),
  totalWins:    integer("total_wins").notNull().default(0),
  bestRank:     integer("best_rank"),                 // lowest placement number ever
  updatedAt:    timestamp("updated_at").notNull().defaultNow(),
  createdAt:    timestamp("created_at").notNull().defaultNow(),
});

// One row per match per player — never mutated after insertion.
// The unique(matchId, userId) constraint is the idempotency lock: inserting a
// duplicate is a no-op (ON CONFLICT DO NOTHING), so retries and concurrent
// calls are both safe without application-level locks.
export const ratingHistoryTable = pgTable("rating_history", {
  id:            serial("id").primaryKey(),
  userId:        text("user_id").notNull(),
  matchId:       integer("match_id").notNull(),
  tournamentId:  integer("tournament_id"),
  ratingBefore:  integer("rating_before").notNull(),
  ratingChange:  integer("rating_change").notNull(),
  ratingAfter:   integer("rating_after").notNull(),
  tierBefore:    text("tier_before").notNull(),
  tierAfter:     text("tier_after").notNull(),
  placement:     integer("placement"),
  kills:         integer("kills").notNull().default(0),
  createdAt:     timestamp("created_at").notNull().defaultNow(),
}, (t) => [
  unique("rating_history_match_user_uniq").on(t.matchId, t.userId),
]);

export const insertPlayerRatingSchema = createInsertSchema(playerRatingsTable).omit({ id: true, createdAt: true });
export type InsertPlayerRating = z.infer<typeof insertPlayerRatingSchema>;
export type PlayerRating = typeof playerRatingsTable.$inferSelect;
export type RatingHistory = typeof ratingHistoryTable.$inferSelect;
