import { Router, type IRouter } from "express";
import { requireAdmin } from "../middlewares/requireAdmin";
import { db } from "@workspace/db";
import { settingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

const DEFAULT_NUMBERS: Record<string, string> = {
  bkash_number: "01606622867",
  nagad_number: "01606622867",
  rocket_number: "01606622867",
};

async function getSetting(key: string): Promise<string> {
  const [row] = await db.select().from(settingsTable).where(eq(settingsTable.key, key));
  return row?.value ?? DEFAULT_NUMBERS[key] ?? "";
}

async function setSetting(key: string, value: string): Promise<void> {
  const [existing] = await db.select().from(settingsTable).where(eq(settingsTable.key, key));
  if (existing) {
    await db.update(settingsTable).set({ value, updatedAt: new Date() }).where(eq(settingsTable.key, key));
  } else {
    await db.insert(settingsTable).values({ key, value });
  }
}

router.get("/payment-settings", async (_req, res) => {
  try {
    const [bkash, nagad, rocket] = await Promise.all([
      getSetting("bkash_number"),
      getSetting("nagad_number"),
      getSetting("rocket_number"),
    ]);
    res.json({ bkash_number: bkash, nagad_number: nagad, rocket_number: rocket });
  } catch {
    res.status(500).json({ error: "Failed to load payment settings." });
  }
});

router.put("/admin/payment-settings", async (req, res) => {
  if (!await requireAdmin(req, res)) return;

  const { bkash_number, nagad_number, rocket_number } = req.body;

  if (!bkash_number || !nagad_number || !rocket_number) {
    return res.status(400).json({ error: "All three payment numbers are required." });
  }

  try {
    await Promise.all([
      setSetting("bkash_number", String(bkash_number).trim()),
      setSetting("nagad_number", String(nagad_number).trim()),
      setSetting("rocket_number", String(rocket_number).trim()),
    ]);
    res.json({ success: true, bkash_number, nagad_number, rocket_number });
  } catch {
    res.status(500).json({ error: "Failed to update payment settings." });
  }
});

export default router;
