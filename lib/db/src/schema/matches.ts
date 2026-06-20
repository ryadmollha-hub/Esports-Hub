import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

// ─── Global match serial-number counters ──────────────────────────────────────
// Monotonically-increasing. Never resets. Deleted matches never re-use a number.
export const matchCountersTable = pgTable("match_counters", {
  type: text("type").primaryKey(), // 'tournament' | 'community'
  lastValue: integer("last_value").notNull().default(0),
});

export const matchesTable = pgTable("matches", {
  id: serial("id").primaryKey(),
  tournamentId: integer("tournament_id").notNull(),
  matchNumber: integer("match_number").notNull(),
  serialNumber: text("serial_number"), // T-0001, T-0002, … — globally unique permanent ID
  scheduledAt: timestamp("scheduled_at").notNull(),
  status: text("status").notNull().default("scheduled"), // scheduled | live | completed
  mapName: text("map_name"),
  roomId: text("room_id"),
  roomPassword: text("room_password"),
  roomReleaseAt: timestamp("room_release_at"), // when room details become visible to players
  roomHideAt: timestamp("room_hide_at"),       // when to stop showing room (null = auto-hide at scheduledAt)
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const matchResultsTable = pgTable("match_results", {
  id: serial("id").primaryKey(),
  matchId: integer("match_id").notNull(),
  teamId: integer("team_id"),
  userId: text("user_id"),
  playerName: text("player_name").notNull(),
  rank: integer("rank").notNull(),
  kills: integer("kills").notNull().default(0),
  points: integer("points").notNull().default(0),
});

export const insertMatchSchema = createInsertSchema(matchesTable).omit({ id: true, createdAt: true });
export const insertMatchResultSchema = createInsertSchema(matchResultsTable).omit({ id: true });
export type InsertMatch = z.infer<typeof insertMatchSchema>;
export type InsertMatchResult = z.infer<typeof insertMatchResultSchema>;
export type Match = typeof matchesTable.$inferSelect;
export type MatchResult = typeof matchResultsTable.$inferSelect;
