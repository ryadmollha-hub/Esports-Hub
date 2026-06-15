import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { tournamentRulesTable } from "@workspace/db";
import { eq, asc } from "drizzle-orm";
import { requireAdmin } from "../middlewares/requireAdmin";

const router: IRouter = Router();

// ─── Get rules for a tournament (public) ───────────────────────────────────

router.get("/tournaments/:id/rules", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const rules = await db
      .select()
      .from(tournamentRulesTable)
      .where(eq(tournamentRulesTable.tournamentId, id))
      .orderBy(asc(tournamentRulesTable.orderIndex), asc(tournamentRulesTable.createdAt));
    res.json(rules);
  } catch {
    res.status(500).json({ error: "Failed to load rules." });
  }
});

// ─── Create rule (admin) ────────────────────────────────────────────────────

router.post("/tournaments/:id/rules", async (req, res) => {
  if (!await requireAdmin(req, res)) return;
  try {
    const tournamentId = parseInt(req.params.id);
    const { title, content, orderIndex } = req.body;
    if (!title || !content) {
      return res.status(400).json({ error: "title and content are required." });
    }
    const [rule] = await db
      .insert(tournamentRulesTable)
      .values({
        tournamentId,
        title,
        content,
        orderIndex: orderIndex ?? 0,
      })
      .returning();
    res.status(201).json(rule);
  } catch {
    res.status(500).json({ error: "Failed to create rule." });
  }
});

// ─── Update rule (admin) ────────────────────────────────────────────────────

router.patch("/rules/:id", async (req, res) => {
  if (!await requireAdmin(req, res)) return;
  try {
    const id = parseInt(req.params.id);
    const { title, content, orderIndex } = req.body;
    const [updated] = await db
      .update(tournamentRulesTable)
      .set({
        ...(title !== undefined && { title }),
        ...(content !== undefined && { content }),
        ...(orderIndex !== undefined && { orderIndex }),
      })
      .where(eq(tournamentRulesTable.id, id))
      .returning();
    if (!updated) return res.status(404).json({ error: "Rule not found." });
    res.json(updated);
  } catch {
    res.status(500).json({ error: "Failed to update rule." });
  }
});

// ─── Delete rule (admin) ────────────────────────────────────────────────────

router.delete("/rules/:id", async (req, res) => {
  if (!await requireAdmin(req, res)) return;
  try {
    const id = parseInt(req.params.id);
    await db.delete(tournamentRulesTable).where(eq(tournamentRulesTable.id, id));
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Failed to delete rule." });
  }
});

export default router;
