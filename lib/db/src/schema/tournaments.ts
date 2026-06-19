import { pgTable, serial, text, integer, numeric, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const tournamentsTable = pgTable("tournaments", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  mode: text("mode").notNull().default("squad"), // solo | duo | squad
  status: text("status").notNull().default("upcoming"), // upcoming | live | ended | cancelled
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date"),
  maxSlots: integer("max_slots").notNull().default(100),
  filledSlots: integer("filled_slots").notNull().default(0),
  prizePool: numeric("prize_pool", { precision: 10, scale: 2 }).notNull().default("0"),
  entryFee: numeric("entry_fee", { precision: 10, scale: 2 }).notNull().default("0"),
  perKillReward: numeric("per_kill_reward", { precision: 10, scale: 2 }).notNull().default("0"),
  bannerUrl: text("banner_url"),
  roomId: text("room_id"),
  roomPassword: text("room_password"),
  countdownTo: timestamp("countdown_to"),
  winnerId: text("winner_id"),
  winnerName: text("winner_name"),
  gameMode: text("game_mode"), // BR | CS | SOLO | LONE_WOLF | FREE (null = uncategorised)
  autoWinner: boolean("auto_winner").notNull().default(false),
  resultsPublished: boolean("results_published").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const prizeTiersTable = pgTable("prize_tiers", {
  id: serial("id").primaryKey(),
  tournamentId: integer("tournament_id").notNull(),
  rank: text("rank").notNull(),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  percentage: numeric("percentage", { precision: 5, scale: 2 }),
  description: text("description"),
});

export const insertTournamentSchema = createInsertSchema(tournamentsTable).omit({ id: true, createdAt: true });
export const insertPrizeTierSchema = createInsertSchema(prizeTiersTable).omit({ id: true });
export type InsertTournament = z.infer<typeof insertTournamentSchema>;
export type InsertPrizeTier = z.infer<typeof insertPrizeTierSchema>;
export type Tournament = typeof tournamentsTable.$inferSelect;
export type PrizeTier = typeof prizeTiersTable.$inferSelect;
