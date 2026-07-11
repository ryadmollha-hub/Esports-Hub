import { Router, type IRouter } from "express";
import { requireAdmin } from "../middlewares/requireAdmin";
import { db } from "@workspace/db";
import { settingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { getMaintenanceMode, setMaintenanceMode, invalidateMaintenanceCache } from "../middlewares/maintenanceMode";

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

router.get("/settings/maintenance", async (_req, res) => {
  try {
    const enabled = await getMaintenanceMode();
    res.json({ maintenance: enabled });
  } catch {
    res.status(500).json({ error: "Failed to check maintenance status." });
  }
});

router.post("/admin/maintenance", async (req, res) => {
  if (!await requireAdmin(req, res)) return;
  try {
    const { enabled } = req.body;
    if (typeof enabled !== "boolean") {
      return res.status(400).json({ error: "enabled (boolean) is required." });
    }
    await setMaintenanceMode(enabled);
    res.json({ success: true, maintenance: enabled });
  } catch {
    res.status(500).json({ error: "Failed to update maintenance mode." });
  }
});

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

const DEFAULT_COMMUNITY_RULES = `1. Be respectful to all players.
2. No cheating, hacking, or use of unauthorized software.
3. Room ID and password will be shared before the match starts.
4. Players must join the room within 5 minutes of it being shared.
5. Match results are final once submitted by the host.
6. Entry fee is non-refundable once the match goes live.
7. Any disputes must be raised with the match host immediately after the match.`;

router.get("/settings/community-match-rules", async (_req, res) => {
  try {
    const rules = await getSetting("community_match_rules");
    res.json({ rules: rules || DEFAULT_COMMUNITY_RULES });
  } catch {
    res.status(500).json({ error: "Failed to load rules." });
  }
});

router.put("/admin/settings/community-match-rules", async (req, res) => {
  if (!await requireAdmin(req, res)) return;
  const { rules } = req.body;
  if (typeof rules !== "string" || !rules.trim()) {
    return res.status(400).json({ error: "rules (string) is required." });
  }
  try {
    await setSetting("community_match_rules", rules.trim());
    res.json({ success: true, rules: rules.trim() });
  } catch {
    res.status(500).json({ error: "Failed to save rules." });
  }
});

export default router;
