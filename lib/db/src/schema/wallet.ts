import { pgTable, serial, text, numeric, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const walletTransactionsTable = pgTable("wallet_transactions", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  type: text("type").notNull(), // deposit | withdraw | tournament_entry | tournament_prize
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  method: text("method"),           // bkash | nagad | null for system transactions
  accountNumber: text("account_number"), // null for system transactions
  transactionId: text("transaction_id"),
  screenshot: text("screenshot"),
  status: text("status").notNull().default("pending"), // pending | approved | rejected
  adminNote: text("admin_note"),
  notes: text("notes"),             // human-readable description
  tournamentId: integer("tournament_id"), // for tournament_entry / tournament_prize
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertWalletTransactionSchema = createInsertSchema(walletTransactionsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertWalletTransaction = z.infer<typeof insertWalletTransactionSchema>;
export type WalletTransaction = typeof walletTransactionsTable.$inferSelect;
