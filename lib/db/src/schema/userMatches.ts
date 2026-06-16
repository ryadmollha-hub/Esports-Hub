import { pgTable, serial, text, numeric, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const userMatchesTable = pgTable("user_matches", {
  id: serial("id").primaryKey(),
  creatorId: text("creator_id").notNull(),
  creatorName: text("creator_name"),
  matchType: text("match_type").notNull(), // 1v1 | 2v2 | 3v3 | 4v4
  prizePool: numeric("prize_pool", { precision: 10, scale: 2 }).notNull(),
  entryFee: numeric("entry_fee", { precision: 10, scale: 2 }).notNull(),
  maxSlots: integer("max_slots").notNull(),
  filledSlots: integer("filled_slots").notNull().default(0),
  scheduledAt: timestamp("scheduled_at").notNull(),
  description: text("description"),
  status: text("status").notNull().default("pending_approval"), // pending_approval | approved | rejected | cancelled
  adminNote: text("admin_note"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const userMatchJoinsTable = pgTable("user_match_joins", {
  id: serial("id").primaryKey(),
  matchId: integer("match_id").notNull(),
  userId: text("user_id").notNull(),
  username: text("username"),
  joinedAt: timestamp("joined_at").notNull().defaultNow(),
});

export const insertUserMatchSchema = createInsertSchema(userMatchesTable).omit({ id: true, createdAt: true });
export type InsertUserMatch = z.infer<typeof insertUserMatchSchema>;
export type UserMatch = typeof userMatchesTable.$inferSelect;
export type UserMatchJoin = typeof userMatchJoinsTable.$inferSelect;
