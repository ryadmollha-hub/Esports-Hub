import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const tournamentRulesTable = pgTable("tournament_rules", {
  id: serial("id").primaryKey(),
  tournamentId: integer("tournament_id").notNull(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  orderIndex: integer("order_index").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertTournamentRuleSchema = createInsertSchema(tournamentRulesTable).omit({ id: true, createdAt: true });
export type InsertTournamentRule = z.infer<typeof insertTournamentRuleSchema>;
export type TournamentRule = typeof tournamentRulesTable.$inferSelect;
