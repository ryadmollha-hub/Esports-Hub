import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { signToken, signResetToken, verifyResetToken } from "../lib/jwt";
import { safeGetUserId } from "../lib/clerkAuth";
import { verifyCaptcha } from "../lib/captcha";
import { audit } from "../lib/auditLog";
import { authLimiter, registerLimiter } from "../middlewares/rateLimiter";
import { randomUUID } from "crypto";

const router: IRouter = Router();

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

function validatePassword(password: string): string | null {
  if (password.length < 8) return "Password must be at least 8 characters.";
  if (!/[A-Z]/.test(password)) return "Password must contain at least one uppercase letter.";
  if (!/[a-z]/.test(password)) return "Password must contain at least one lowercase letter.";
  if (!/\d/.test(password)) return "Password must contain at least one number.";
  return null;
}

function generateReferralCode(username: string | null | undefined): string {
  const base = (username ?? "USER").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6).padEnd(3, "X");
  const suffix = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${base}${suffix}`;
}

router.post("/auth/register", registerLimiter, async (req, res) => {
  try {
    const { email, password, username, captchaToken, captchaAnswer } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Email and password are required." });
    }

    if (!captchaToken || !captchaAnswer) {
      return res.status(400).json({ success: false, message: "Please complete the security check." });
    }
    if (!verifyCaptcha(captchaToken, captchaAnswer)) {
      return res.status(400).json({ success: false, message: "Incorrect security answer. Please try again." });
    }

    const pwError = validatePassword(password);
    if (pwError) return res.status(400).json({ success: false, message: pwError });

    const normalizedEmail = email.toLowerCase().trim();

    const existing = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.email, normalizedEmail))
      .limit(1);

    if (existing.length > 0) {
      await audit("user.register.duplicate", { req, details: { email: normalizedEmail }, severity: "warning" });
      return res.status(409).json({ success: false, message: "An account with this email already exists." });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const userId = randomUUID();

    let referralCode = generateReferralCode(username);
    let attempts = 0;
    while (attempts < 10) {
      const check = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.referralCode, referralCode)).limit(1);
      if (check.length === 0) break;
      referralCode = generateReferralCode(username);
      attempts++;
    }

    const [user] = await db
      .insert(usersTable)
      .values({
        clerkId: userId,
        email: normalizedEmail,
        username: username?.trim() ?? null,
        passwordHash,
        referralCode,
      })
      .returning();

    await audit("user.register", { userId: user.clerkId, req, details: { email: normalizedEmail } });

    const token = signToken({ userId: user.clerkId, email: user.email!, username: user.username });
    return res.status(201).json({ success: true, message: "Account created successfully.", token, user: sanitizeUser(user) });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: "Registration failed. Please try again." });
  }
});

router.post("/auth/login", authLimiter, async (req, res) => {
  try {
    const { email, password, captchaToken, captchaAnswer } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Email and password are required." });
    }

    if (!captchaToken || !captchaAnswer) {
      return res.status(400).json({ success: false, message: "Please complete the security check." });
    }
    if (!verifyCaptcha(captchaToken, captchaAnswer)) {
      return res.status(400).json({ success: false, message: "Incorrect security answer. Please try again." });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, normalizedEmail))
      .limit(1);

    if (!user || !user.passwordHash) {
      await audit("user.login.failed", { req, details: { email: normalizedEmail, reason: "not_found" }, severity: "warning" });
      return res.status(401).json({ success: false, message: "Invalid email or password." });
    }

    if (user.isBanned) {
      await audit("user.login.banned", { userId: user.clerkId, req, severity: "warning" });
      return res.status(403).json({ success: false, message: "Your account has been suspended." });
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const minutes = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60_000);
      return res.status(429).json({ success: false, message: `Account temporarily locked. Try again in ${minutes} minute(s).` });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      const newAttempts = (user.loginAttempts ?? 0) + 1;
      const lockUpdate: Record<string, any> = { loginAttempts: newAttempts };
      if (newAttempts >= 5) {
        lockUpdate.lockedUntil = new Date(Date.now() + 15 * 60 * 1000);
      }
      await db.update(usersTable).set(lockUpdate).where(eq(usersTable.clerkId, user.clerkId));
      await audit("user.login.failed", { userId: user.clerkId, req, details: { attempts: newAttempts }, severity: "warning" });
      const remaining = Math.max(0, 5 - newAttempts);
      return res.status(401).json({
        success: false,
        message: newAttempts >= 5
          ? "Too many failed attempts. Account locked for 15 minutes."
          : `Invalid email or password. ${remaining} attempt(s) remaining.`,
      });
    }

    await db.update(usersTable).set({
      loginAttempts: 0,
      lockedUntil: null,
      lastLoginAt: new Date(),
      lastLoginIp: req.ip ?? null,
    }).where(eq(usersTable.clerkId, user.clerkId));

    await audit("user.login", { userId: user.clerkId, req });

    const token = signToken({ userId: user.clerkId, email: user.email!, username: user.username });
    return res.json({ success: true, message: "Login successful.", token, user: sanitizeUser(user) });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: "Login failed. Please try again." });
  }
});

router.get("/auth/me", async (req, res) => {
  try {
    const userId = safeGetUserId(req);
    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });

    const [user] = await db.select().from(usersTable).where(eq(usersTable.clerkId, userId)).limit(1);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    return res.json(sanitizeUser(user));
  } catch {
    return res.status(500).json({ success: false, message: "Failed to fetch user." });
  }
});

router.post("/auth/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: "Email is required." });

    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, email.toLowerCase().trim()))
      .limit(1);

    if (!user) {
      return res.json({ success: true, message: "If that email exists, a reset link has been sent." });
    }

    await audit("user.forgot_password", { userId: user.clerkId, req });

    const resetToken = signResetToken(user.clerkId);
    return res.json({
      success: true,
      message: "Password reset token generated. Use it within 1 hour.",
      resetToken,
    });
  } catch {
    return res.status(500).json({ success: false, message: "Failed to process request." });
  }
});

router.post("/auth/reset-password", async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) {
      return res.status(400).json({ success: false, message: "Token and password are required." });
    }

    const pwError = validatePassword(password);
    if (pwError) return res.status(400).json({ success: false, message: pwError });

    const payload = verifyResetToken(token);
    if (!payload) {
      return res.status(400).json({ success: false, message: "Invalid or expired reset token." });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    await db.update(usersTable).set({ passwordHash, loginAttempts: 0, lockedUntil: null }).where(eq(usersTable.clerkId, payload.userId));
    await audit("user.reset_password", { userId: payload.userId, req });

    return res.json({ success: true, message: "Password reset successfully. Please log in." });
  } catch {
    return res.status(500).json({ success: false, message: "Failed to reset password." });
  }
});

router.post("/auth/setup-2fa", async (req, res) => {
  try {
    const userId = safeGetUserId(req);
    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });

    const [user] = await db.select().from(usersTable).where(eq(usersTable.clerkId, userId)).limit(1);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    const { generateTOTPSecret, getTOTPUri } = await import("../lib/totp.js");
    const secret = generateTOTPSecret();
    await db.update(usersTable).set({ totpSecret: secret, totpEnabled: false }).where(eq(usersTable.clerkId, userId));

    return res.json({
      success: true,
      secret,
      uri: getTOTPUri(secret, user.email ?? user.username ?? userId),
    });
  } catch {
    return res.status(500).json({ success: false, message: "Failed to set up 2FA." });
  }
});

router.post("/auth/confirm-2fa", async (req, res) => {
  try {
    const userId = safeGetUserId(req);
    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });

    const { code } = req.body;
    if (!code) return res.status(400).json({ success: false, message: "TOTP code is required." });

    const [user] = await db.select().from(usersTable).where(eq(usersTable.clerkId, userId)).limit(1);
    if (!user?.totpSecret) return res.status(400).json({ success: false, message: "2FA not set up. Call /auth/setup-2fa first." });

    const { verifyTOTP } = await import("../lib/totp.js");
    if (!verifyTOTP(user.totpSecret, code)) {
      return res.status(400).json({ success: false, message: "Invalid code. Please try again." });
    }

    await db.update(usersTable).set({ totpEnabled: true }).where(eq(usersTable.clerkId, userId));
    await audit("user.2fa.enabled", { userId, req });

    return res.json({ success: true, message: "Two-factor authentication enabled." });
  } catch {
    return res.status(500).json({ success: false, message: "Failed to confirm 2FA." });
  }
});

function sanitizeUser(user: typeof usersTable.$inferSelect) {
  const { passwordHash, totpSecret, ...safe } = user as any;
  return safe;
}

export default router;
