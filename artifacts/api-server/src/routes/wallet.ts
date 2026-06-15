import { Router, type IRouter } from "express";
import { requireAdmin, requireAuth } from "../middlewares/requireAdmin";
import { db } from "@workspace/db";
import { walletTransactionsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { createNotification } from "../lib/notificationHelper";

const router: IRouter = Router();

// ─── Helpers ────────────────────────────────────────────────────────────────

export function calcBalance(txs: any[]): number {
  const additions = txs
    .filter((t) => (t.type === "deposit" || t.type === "tournament_prize") && t.status === "approved")
    .reduce((s, t) => s + Number(t.amount), 0);
  const deductions = txs
    .filter((t) => (t.type === "withdraw" || t.type === "tournament_entry") && t.status === "approved")
    .reduce((s, t) => s + Number(t.amount), 0);
  return Math.max(0, additions - deductions);
}

export async function getUserBalance(userId: string): Promise<number> {
  const txs = await db
    .select()
    .from(walletTransactionsTable)
    .where(eq(walletTransactionsTable.userId, userId));
  return calcBalance(txs);
}

// ─── Routes ─────────────────────────────────────────────────────────────────

router.get("/wallet/balance", async (req, res) => {
  const userId = await requireAuth(req, res);
  if (!userId) return;

  try {
    const txs = await db
      .select()
      .from(walletTransactionsTable)
      .where(eq(walletTransactionsTable.userId, userId));

    const totalDeposit = txs
      .filter((t) => t.type === "deposit" && t.status === "approved")
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const totalWithdraw = txs
      .filter((t) => t.type === "withdraw" && t.status === "approved")
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const totalEntryFees = txs
      .filter((t) => t.type === "tournament_entry" && t.status === "approved")
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const totalPrizes = txs
      .filter((t) => t.type === "tournament_prize" && t.status === "approved")
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const pendingDeposit = txs
      .filter((t) => t.type === "deposit" && t.status === "pending")
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const pendingWithdraw = txs
      .filter((t) => t.type === "withdraw" && t.status === "pending")
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const balance = totalDeposit + totalPrizes - totalWithdraw - totalEntryFees;

    res.json({
      balance: Math.max(0, balance),
      totalDeposit,
      totalWithdraw,
      totalEntryFees,
      totalPrizes,
      pendingDeposit,
      pendingWithdraw,
    });
  } catch {
    res.status(500).json({ error: "Failed to load wallet balance." });
  }
});

router.post("/wallet/deposit", async (req, res) => {
  const userId = await requireAuth(req, res);
  if (!userId) return;

  const { amount, method, accountNumber, transactionId, screenshot } = req.body;
  if (!amount || !method || !accountNumber) {
    return res.status(400).json({ error: "Amount, payment method, and account number are required." });
  }
  if (parseFloat(amount) <= 0) {
    return res.status(400).json({ error: "Amount must be greater than zero." });
  }
  if (!["bkash", "nagad", "rocket"].includes(method)) {
    return res.status(400).json({ error: "Payment method must be BKash, Nagad, or Rocket." });
  }

  try {
    const [tx] = await db.insert(walletTransactionsTable).values({
      userId,
      type: "deposit",
      amount: String(amount),
      method,
      accountNumber,
      transactionId: transactionId ?? null,
      screenshot: screenshot ?? null,
      status: "pending",
    }).returning();

    res.status(201).json(tx);
  } catch {
    res.status(500).json({ error: "Failed to submit deposit request. Please try again." });
  }
});

router.post("/wallet/withdraw", async (req, res) => {
  const userId = await requireAuth(req, res);
  if (!userId) return;

  const { amount, method, accountNumber } = req.body;
  if (!amount || !method || !accountNumber) {
    return res.status(400).json({ error: "Amount, payment method, and account number are required." });
  }
  if (parseFloat(amount) <= 0) {
    return res.status(400).json({ error: "Amount must be greater than zero." });
  }
  if (!["bkash", "nagad", "rocket"].includes(method)) {
    return res.status(400).json({ error: "Payment method must be BKash, Nagad, or Rocket." });
  }

  try {
    const balance = await getUserBalance(userId);

    if (parseFloat(amount) > balance) {
      return res.status(400).json({ error: `Insufficient balance. Your available balance is ৳${balance.toFixed(2)}.` });
    }

    const [tx] = await db.insert(walletTransactionsTable).values({
      userId,
      type: "withdraw",
      amount: String(amount),
      method,
      accountNumber,
      status: "pending",
    }).returning();

    res.status(201).json(tx);
  } catch {
    res.status(500).json({ error: "Failed to submit withdrawal request. Please try again." });
  }
});

router.get("/wallet/my-transactions", async (req, res) => {
  const userId = await requireAuth(req, res);
  if (!userId) return;

  try {
    const txs = await db
      .select()
      .from(walletTransactionsTable)
      .where(eq(walletTransactionsTable.userId, userId))
      .orderBy(desc(walletTransactionsTable.createdAt));

    res.json(txs);
  } catch {
    res.status(500).json({ error: "Failed to load transaction history." });
  }
});

router.get("/admin/wallet-transactions", async (req, res) => {
  if (!await requireAdmin(req, res)) return;

  try {
    const { type, status } = req.query as Record<string, string>;
    const txs = await db
      .select()
      .from(walletTransactionsTable)
      .orderBy(desc(walletTransactionsTable.createdAt));

    const filtered = txs.filter((t) => {
      if (type && t.type !== type) return false;
      if (status && t.status !== status) return false;
      return true;
    });

    res.json(filtered);
  } catch {
    res.status(500).json({ error: "Failed to load wallet transactions." });
  }
});

router.patch("/admin/wallet-transactions/:id/approve", async (req, res) => {
  if (!await requireAdmin(req, res)) return;

  try {
    const id = parseInt(req.params.id);
    const [updated] = await db
      .update(walletTransactionsTable)
      .set({ status: "approved", updatedAt: new Date() })
      .where(eq(walletTransactionsTable.id, id))
      .returning();

    if (!updated) return res.status(404).json({ error: "Transaction not found." });

    const typeLabel = updated.type === "deposit" ? "Deposit" : "Withdrawal";
    await createNotification(
      updated.userId,
      `${typeLabel} Approved`,
      `Your ${typeLabel.toLowerCase()} of ৳${Number(updated.amount).toFixed(2)} has been approved.`,
      "success"
    );

    res.json(updated);
  } catch {
    res.status(500).json({ error: "Failed to approve transaction." });
  }
});

router.patch("/admin/wallet-transactions/:id/reject", async (req, res) => {
  if (!await requireAdmin(req, res)) return;

  try {
    const id = parseInt(req.params.id);
    const { adminNote } = req.body;
    const [updated] = await db
      .update(walletTransactionsTable)
      .set({ status: "rejected", adminNote: adminNote ?? null, updatedAt: new Date() })
      .where(eq(walletTransactionsTable.id, id))
      .returning();

    if (!updated) return res.status(404).json({ error: "Transaction not found." });

    const typeLabel = updated.type === "deposit" ? "Deposit" : "Withdrawal";
    await createNotification(
      updated.userId,
      `${typeLabel} Rejected`,
      `Your ${typeLabel.toLowerCase()} of ৳${Number(updated.amount).toFixed(2)} was rejected.${adminNote ? ` Reason: ${adminNote}` : ""}`,
      "error"
    );

    res.json(updated);
  } catch {
    res.status(500).json({ error: "Failed to reject transaction." });
  }
});

export default router;
