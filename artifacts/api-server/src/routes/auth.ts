import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { signToken, signResetToken, verifyResetToken } from "../lib/jwt";
import { safeGetUserId } from "../lib/clerkAuth";
import { randomUUID } from "crypto";

const router: IRouter = Router();

function generateReferralCode(username: string | null | undefined): string {
  const base = (username ?? "USER").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6).padEnd(3, "X");
  const suffix = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${base}${suffix}`;
}

router.post("/auth/register", async (req, res) => {
  const { email, password, username } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "email and password are required" });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters" });
  }

  const existing = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, email.toLowerCase().trim()))
    .limit(1);

  if (existing.length > 0) {
    return res.status(409).json({ error: "An account with this email already exists" });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const userId = randomUUID();

  // Generate unique referral code
  let referralCode = generateReferralCode(username);
  let attempts = 0;
  while (attempts < 10) {
    const codeCheck = await db.select().from(usersTable).where(eq(usersTable.referralCode, referralCode)).limit(1);
    if (codeCheck.length === 0) break;
    referralCode = generateReferralCode(username);
    attempts++;
  }

  const [user] = await db
    .insert(usersTable)
    .values({
      clerkId: userId,
      email: email.toLowerCase().trim(),
      username: username?.trim() ?? null,
      passwordHash,
      referralCode,
    })
    .returning();

  const token = signToken({ userId: user.clerkId, email: user.email!, username: user.username });
  res.status(201).json({ token, user: sanitizeUser(user) });
});

router.post("/auth/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "email and password are required" });
  }

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, email.toLowerCase().trim()))
    .limit(1);

  if (!user || !user.passwordHash) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  if (user.isBanned) {
    return res.status(403).json({ error: "Your account has been suspended" });
  }

  const token = signToken({ userId: user.clerkId, email: user.email!, username: user.username });
  res.json({ token, user: sanitizeUser(user) });
});

router.get("/auth/me", async (req, res) => {
  const userId = safeGetUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const [user] = await db.select().from(usersTable).where(eq(usersTable.clerkId, userId)).limit(1);
  if (!user) return res.status(404).json({ error: "User not found" });

  res.json(sanitizeUser(user));
});

router.post("/auth/forgot-password", async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "email is required" });

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, email.toLowerCase().trim()))
    .limit(1);

  if (!user) {
    return res.json({ message: "If that email exists, a reset link has been sent." });
  }

  const resetToken = signResetToken(user.clerkId);
  res.json({
    message: "Password reset token generated. Use it within 1 hour.",
    resetToken,
  });
});

router.post("/auth/reset-password", async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password) {
    return res.status(400).json({ error: "token and password are required" });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters" });
  }

  const payload = verifyResetToken(token);
  if (!payload) {
    return res.status(400).json({ error: "Invalid or expired reset token" });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await db
    .update(usersTable)
    .set({ passwordHash })
    .where(eq(usersTable.clerkId, payload.userId));

  res.json({ message: "Password reset successfully. Please log in." });
});

function sanitizeUser(user: typeof usersTable.$inferSelect) {
  const { passwordHash, ...safe } = user as any;
  return safe;
}

export default router;
