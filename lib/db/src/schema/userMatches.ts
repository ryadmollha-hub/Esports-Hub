import { pgTable, serial, text, numeric, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const userMatchesTable = pgTable("user_matches", {
  id: serial("id").primaryKey(),
  creatorId: text("creator_id").notNull(),
  creatorName: text("creator_name"),
  matchName: text("match_name"),
  matchType: text("match_type").notNull(),
  prizePool: numeric("prize_pool", { precision: 10, scale: 2 }).notNull(),
  entryFee: numeric("entry_fee", { precision: 10, scale: 2 }).notNull().default("0.00"),
  maxSlots: integer("max_slots").notNull(),
  filledSlots: integer("filled_slots").notNull().default(0),
  scheduledAt: timestamp("scheduled_at"),
  description: text("description"),
  passwordHash: text("password_hash"),
  roomId: text("room_id"),
  isPrivate: boolean("is_private").notNull().default(false),
  status: text("status").notNull().default("waiting"),
  startDelayMinutes: integer("start_delay_minutes"),
  timerStartedAt: timestamp("timer_started_at"),
  adminNote: text("admin_note"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const userMatchJoinsTable = pgTable("user_match_joins", {
  id: serial("id").primaryKey(),
  matchId: integer("match_id").notNull(),
  userId: text("user_id").notNull(),
  username: text("username"),
  inGameName: text("in_game_name"),
  gameUid: text("game_uid"),
  teamPlayers: text("team_players"),
  status: text("status").notNull().default("accepted"),
  joinedAt: timestamp("joined_at").notNull().defaultNow(),
});

export const insertUserMatchSchema = createInsertSchema(userMatchesTable).omit({ id: true, createdAt: true });
export type InsertUserMatch = z.infer<typeof insertUserMatchSchema>;
export type UserMatch = typeof userMatchesTable.$inferSelect;
export type UserMatchJoin = typeof userMatchJoinsTable.$inferSelect;
