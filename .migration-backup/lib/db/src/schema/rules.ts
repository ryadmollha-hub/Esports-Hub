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

// ── Global Category Rules ─────────────────────────────────────────────────────
// One rule block per game category (BR, CS, LONE_WOLF, FREE, SOLO).
// Replaces per-tournament and per-match individual rules.
export const categoryRulesTable = pgTable("category_rules", {
  id: serial("id").primaryKey(),
  category: text("category").notNull().unique(), // BR | CS | LONE_WOLF | FREE | SOLO
  rules: text("rules").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertCategoryRuleSchema = createInsertSchema(categoryRulesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertCategoryRule = z.infer<typeof insertCategoryRuleSchema>;
export type CategoryRule = typeof categoryRulesTable.$inferSelect;
