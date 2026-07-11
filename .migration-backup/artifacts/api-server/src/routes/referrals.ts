import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { usersTable, referralsTable, walletTransactionsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAdmin";
import { createNotification } from "../lib/notificationHelper";

const router: IRouter = Router();

function generateCode(username: string): string {
  const base = (username ?? "user").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
  const suffix = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${base}${suffix}`;
}

router.get("/referrals/my", async (req, res) => {
  const userId = await requireAuth(req, res);
  if (!userId) return;

  const [user] = await db.select().from(usersTable).where(eq(usersTable.clerkId, userId));
  if (!user) return res.status(404).json({ error: "User not found" });

  let referralCode = user.referralCode;
  if (!referralCode) {
    referralCode = generateCode(user.username ?? user.displayName ?? "user");
    let attempts = 0;
    while (attempts < 10) {
      const existing = await db.select().from(usersTable).where(eq(usersTable.referralCode, referralCode));
      if (existing.length === 0) break;
      referralCode = generateCode(user.username ?? "user");
      attempts++;
    }
    await db.update(usersTable).set({ referralCode }).where(eq(usersTable.clerkId, userId));
  }

  const referrals = await db
    .select()
    .from(referralsTable)
    .where(eq(referralsTable.referrerId, userId))
    .orderBy(desc(referralsTable.createdAt));

  const totalReward = referrals.reduce((s, r) => s + Number(r.rewardAmount), 0);

  res.json({
    referralCode,
    totalReferrals: referrals.length,
    totalReward,
    referrals,
  });
});

router.post("/referrals/apply", async (req, res) => {
  const userId = await requireAuth(req, res);
  if (!userId) return;

  const { code } = req.body;
  if (!code) return res.status(400).json({ error: "Referral code is required" });

  const [currentUser] = await db.select().from(usersTable).where(eq(usersTable.clerkId, userId));
  if (!currentUser) return res.status(404).json({ error: "User not found" });

  if (currentUser.referredBy) return res.status(409).json({ error: "You have already used a referral code" });

  const [referrer] = await db.select().from(usersTable).where(eq(usersTable.referralCode, code.toUpperCase()));
  if (!referrer) return res.status(404).json({ error: "Invalid referral code" });

  if (referrer.clerkId === userId) return res.status(400).json({ error: "You cannot use your own referral code" });

  const existingReferral = await db.select().from(referralsTable).where(eq(referralsTable.referredId, userId));
  if (existingReferral.length > 0) return res.status(409).json({ error: "Referral already applied" });

  const REWARD = 50;

  await db.insert(referralsTable).values({
    referrerId: referrer.clerkId,
    referredId: userId,
    rewardAmount: String(REWARD),
    status: "completed",
  });

  await db.update(usersTable).set({ referredBy: code.toUpperCase() }).where(eq(usersTable.clerkId, userId));

  await db.insert(walletTransactionsTable).values({
    userId: referrer.clerkId,
    type: "deposit",
    amount: String(REWARD),
    status: "approved",
    notes: `Referral reward for inviting ${currentUser.username ?? currentUser.email ?? "a user"}`,
  });

  await createNotification(referrer.clerkId, "Referral Reward!", `You earned ৳${REWARD} for referring a new user.`, "success");

  res.json({ success: true, reward: REWARD });
});

export default router;
