import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";

export const hypeBoardTable = pgTable("hype_board", {
  id: serial("id").primaryKey(),
  tournamentId: integer("tournament_id").notNull(),
  userId: text("user_id").notNull(),
  playerName: text("player_name").notNull(),
  message: text("message").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type HypeMessage = typeof hypeBoardTable.$inferSelect;
