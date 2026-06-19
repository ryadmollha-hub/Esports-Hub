import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const reportsTable = pgTable("reports", {
  id: serial("id").primaryKey(),
  reporterId: text("reporter_id"),
  reporterName: text("reporter_name"),
  targetType: text("target_type").notNull(),
  targetId: text("target_id").notNull(),
  targetName: text("target_name"),
  reason: text("reason").notNull(),
  description: text("description"),
  status: text("status").notNull().default("pending"),
  adminNote: text("admin_note"),
  resolvedAt: timestamp("resolved_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
