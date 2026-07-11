import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { promoCodesTable, promoCodeUsagesTable, walletTransactionsTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth, requireAdmin } from "../middlewares/requireAdmin";
import { createNotification } from "../lib/notificationHelper";

const router: IRouter = Router();

// ─── Admin Routes ────────────────────────────────────────────────────────────

router.get("/admin/promo-codes", async (req, res) => {
  if (!await requireAdmin(req, res)) return;
  const codes = await db.select().from(promoCodesTable).orderBy(desc(promoCodesTable.createdAt));
  res.json(codes);
});

router.post("/admin/promo-codes", async (req, res) => {
  if (!await requireAdmin(req, res)) return;
  const { code, bonusAmount, usageLimit, expiresAt, isActive } = req.body;
  if (!code || !bonusAmount) return res.status(400).json({ error: "Code and bonus amount are required" });
  const existing = await db.select().from(promoCodesTable).where(eq(promoCodesTable.code, code.toUpperCase()));
  if (existing.length > 0) return res.status(409).json({ error: "Promo code already exists" });
  const [promo] = await db.insert(promoCodesTable).values({
    code: code.toUpperCase(),
    bonusAmount: String(bonusAmount),
    usageLimit: usageLimit ?? 100,
    isActive: isActive ?? true,
    expiresAt: expiresAt ? new Date(expiresAt) : null,
  }).returning();
  res.status(201).json(promo);
});

router.put("/admin/promo-codes/:id", async (req, res) => {
  if (!await requireAdmin(req, res)) return;
  const id = parseInt(req.params.id);
  const { bonusAmount, usageLimit, expiresAt, isActive } = req.body;
  const [updated] = await db.update(promoCodesTable).set({
    ...(bonusAmount !== undefined && { bonusAmount: String(bonusAmount) }),
    ...(usageLimit !== undefined && { usageLimit }),
    ...(expiresAt !== undefined && { expiresAt: expiresAt ? new Date(expiresAt) : null }),
    ...(isActive !== undefined && { isActive }),
  }).where(eq(promoCodesTable.id, id)).returning();
  if (!updated) return res.status(404).json({ error: "Promo code not found" });
  res.json(updated);
});

router.delete("/admin/promo-codes/:id", async (req, res) => {
  if (!await requireAdmin(req, res)) return;
  const id = parseInt(req.params.id);
  await db.delete(promoCodeUsagesTable).where(eq(promoCodeUsagesTable.promoCodeId, id));
  await db.delete(promoCodesTable).where(eq(promoCodesTable.id, id));
  res.json({ success: true });
});

// ─── User Routes ─────────────────────────────────────────────────────────────

router.post("/promo-codes/apply", async (req, res) => {
  const userId = await requireAuth(req, res);
  if (!userId) return;

  const { code } = req.body;
  if (!code) return res.status(400).json({ error: "Promo code is required" });

  const [promo] = await db.select().from(promoCodesTable).where(eq(promoCodesTable.code, code.toUpperCase()));
  if (!promo) return res.status(404).json({ error: "Invalid promo code" });
  if (!promo.isActive) return res.status(400).json({ error: "This promo code is no longer active" });
  if (promo.expiresAt && new Date() > promo.expiresAt) return res.status(400).json({ error: "This promo code has expired" });
  if (promo.usageCount >= promo.usageLimit) return res.status(400).json({ error: "This promo code has reached its usage limit" });

  const existingUsage = await db.select().from(promoCodeUsagesTable).where(
    and(eq(promoCodeUsagesTable.promoCodeId, promo.id), eq(promoCodeUsagesTable.userId, userId))
  );
  if (existingUsage.length > 0) return res.status(409).json({ error: "You have already used this promo code" });

  await db.insert(promoCodeUsagesTable).values({ promoCodeId: promo.id, userId });
  await db.update(promoCodesTable).set({ usageCount: promo.usageCount + 1 }).where(eq(promoCodesTable.id, promo.id));
  await db.insert(walletTransactionsTable).values({
    userId,
    type: "deposit",
    amount: promo.bonusAmount,
    status: "approved",
    notes: `Promo code bonus: ${promo.code}`,
  });

  await createNotification(userId, "Promo Code Applied!", `You received ৳${promo.bonusAmount} bonus from code ${promo.code}.`, "success");

  res.json({ success: true, bonusAmount: promo.bonusAmount, code: promo.code });
});

export default router;
