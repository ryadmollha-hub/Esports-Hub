import { pgTable, serial, text, integer, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const registrationsTable = pgTable("registrations", {
  id: serial("id").primaryKey(),
  tournamentId: integer("tournament_id").notNull(),
  userId: text("user_id").notNull(),
  teamId: integer("team_id"),
  matchNumber: integer("match_number"), // Which match within the tournament this registration is assigned to
  status: text("status").notNull().default("pending"), // pending | approved | rejected
  freefireUid: text("freefire_uid").notNull(),
  playerName: text("player_name").notNull(),
  // For duo/squad: JSON array of {uid, name} for additional team members
  teamMembers: text("team_members"), // JSON: [{uid: string, name: string}]
  paymentScreenshot: text("payment_screenshot"),
  // Result fields
  kills: integer("kills").notNull().default(0),
  earnedAmount: numeric("earned_amount", { precision: 10, scale: 2 }).notNull().default("0"),
  resultRank: integer("result_rank"),  // 1 | 2 | 3 | null (for top 3 podium)
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertRegistrationSchema = createInsertSchema(registrationsTable).omit({ id: true, createdAt: true });
export type InsertRegistration = z.infer<typeof insertRegistrationSchema>;
export type Registration = typeof registrationsTable.$inferSelect;
