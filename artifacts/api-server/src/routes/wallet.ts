import { Router, type IRouter } from "express";
import { getAuth } from "@clerk/express";
import { db } from "@workspace/db";
import { walletTransactionsTable, usersTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

const router: IRouter = Router();

function isValidAdminToken(req: any): boolean {
  const token = req.headers["x-admin-token"];
  const secret = process.env.ADMIN_SECRET ?? "blackcode-admin-secret-2026";
  const expected = Buffer.from(`BLACKCODE:USER505:${secret}`).toString("base64");
  return token === expected;
}

async function getClerkUserId(req: any): Promise<string | null> {
  try {
    const { userId } = getAuth(req);
    return userId ?? null;
  } catch {
    return null;
  }
}

router.post("/wallet/deposit", async (req, res) => {
  const userId = await getClerkUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const { amount, method, accountNumber, transactionId, screenshot } = req.body;
  if (!amount || !method || !accountNumber) {
    return res.status(400).json({ error: "amount, method, accountNumber are required" });
  }
  if (!["bkash", "nagad"].includes(method)) {
    return res.status(400).json({ error: "method must be bkash or nagad" });
  }

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
});

router.post("/wallet/withdraw", async (req, res) => {
  const userId = await getClerkUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const { amount, method, accountNumber } = req.body;
  if (!amount || !method || !accountNumber) {
    return res.status(400).json({ error: "amount, method, accountNumber are required" });
  }
  if (!["bkash", "nagad"].includes(method)) {
    return res.status(400).json({ error: "method must be bkash or nagad" });
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
});

router.get("/wallet/my-transactions", async (req, res) => {
  const userId = await getClerkUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const txs = await db
    .select()
    .from(walletTransactionsTable)
    .where(eq(walletTransactionsTable.userId, userId))
    .orderBy(desc(walletTransactionsTable.createdAt));

  res.json(txs);
});

router.get("/admin/wallet-transactions", async (req, res) => {
  const isAdminTk = isValidAdminToken(req);
  if (!isAdminTk) {
    const uid = await getClerkUserId(req);
    if (!uid) return res.status(401).json({ error: "Unauthorized" });
    const [user] = await db.select().from(usersTable).where(eq(usersTable.clerkId, uid));
    if (!user?.isAdmin) return res.status(403).json({ error: "Forbidden" });
  }

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
});

router.patch("/admin/wallet-transactions/:id/approve", async (req, res) => {
  const isAdminTk = isValidAdminToken(req);
  if (!isAdminTk) {
    const uid = await getClerkUserId(req);
    if (!uid) return res.status(401).json({ error: "Unauthorized" });
    const [user] = await db.select().from(usersTable).where(eq(usersTable.clerkId, uid));
    if (!user?.isAdmin) return res.status(403).json({ error: "Forbidden" });
  }

  const id = parseInt(req.params.id);
  const [updated] = await db
    .update(walletTransactionsTable)
    .set({ status: "approved", updatedAt: new Date() })
    .where(eq(walletTransactionsTable.id, id))
    .returning();

  if (!updated) return res.status(404).json({ error: "Transaction not found" });
  res.json(updated);
});

router.patch("/admin/wallet-transactions/:id/reject", async (req, res) => {
  const isAdminTk = isValidAdminToken(req);
  if (!isAdminTk) {
    const uid = await getClerkUserId(req);
    if (!uid) return res.status(401).json({ error: "Unauthorized" });
    const [user] = await db.select().from(usersTable).where(eq(usersTable.clerkId, uid));
    if (!user?.isAdmin) return res.status(403).json({ error: "Forbidden" });
  }

  const id = parseInt(req.params.id);
  const { adminNote } = req.body;
  const [updated] = await db
    .update(walletTransactionsTable)
    .set({ status: "rejected", adminNote: adminNote ?? null, updatedAt: new Date() })
    .where(eq(walletTransactionsTable.id, id))
    .returning();

  if (!updated) return res.status(404).json({ error: "Transaction not found" });
  res.json(updated);
});

export default router;
