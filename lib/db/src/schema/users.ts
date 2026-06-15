import { pgTable, serial, text, boolean, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  clerkId: text("clerk_id").notNull().unique(),
  username: text("username"),
  displayName: text("display_name"),
  email: text("email"),
  passwordHash: text("password_hash"),
  avatarUrl: text("avatar_url"),
  freefireUid: text("freefire_uid"),
  freefireNickname: text("freefire_nickname"),
  isAdmin: boolean("is_admin").notNull().default(false),
  isBanned: boolean("is_banned").notNull().default(false),
  totalKills: integer("total_kills").notNull().default(0),
  totalWins: integer("total_wins").notNull().default(0),
  tournamentsPlayed: integer("tournaments_played").notNull().default(0),
  referralCode: text("referral_code").unique(),
  referredBy: text("referred_by"),
  totpSecret: text("totp_secret"),
  totpEnabled: boolean("totp_enabled").notNull().default(false),
  lastLoginAt: timestamp("last_login_at"),
  lastLoginIp: text("last_login_ip"),
  loginAttempts: integer("login_attempts").notNull().default(0),
  lockedUntil: timestamp("locked_until"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({ id: true, createdAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
