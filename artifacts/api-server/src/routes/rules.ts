import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { tournamentRulesTable, categoryRulesTable } from "@workspace/db";
import { eq, asc } from "drizzle-orm";
import { requireAdmin } from "../middlewares/requireAdmin";

const router: IRouter = Router();

// ─── Legacy: Get rules for a specific tournament (public) ───────────────────

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

// ─── Global Category Rules (public) ─────────────────────────────────────────

router.get("/category-rules", async (_req, res) => {
  try {
    const rules = await db.select().from(categoryRulesTable).orderBy(asc(categoryRulesTable.category));
    res.json(rules);
  } catch {
    res.status(500).json({ error: "Failed to load category rules." });
  }
});

router.get("/category-rules/:category", async (req, res) => {
  try {
    const category = req.params.category.toUpperCase();
    const [rule] = await db
      .select()
      .from(categoryRulesTable)
      .where(eq(categoryRulesTable.category, category));
    if (!rule) return res.json({ category, rules: "" });
    res.json(rule);
  } catch {
    res.status(500).json({ error: "Failed to load category rules." });
  }
});

// ─── Admin: List all category rules ─────────────────────────────────────────

router.get("/admin/category-rules", async (req, res) => {
  if (!await requireAdmin(req, res)) return;
  try {
    const rules = await db.select().from(categoryRulesTable).orderBy(asc(categoryRulesTable.category));
    res.json(rules);
  } catch {
    res.status(500).json({ error: "Failed to load category rules." });
  }
});

// ─── Admin: Upsert category rules ────────────────────────────────────────────

router.post("/admin/category-rules", async (req, res) => {
  if (!await requireAdmin(req, res)) return;
  try {
    const { category, rules } = req.body as { category: string; rules: string };
    if (!category?.trim() || !rules?.trim()) {
      return res.status(400).json({ error: "category and rules are required." });
    }
    const cat = category.trim().toUpperCase();
    const [saved] = await db
      .insert(categoryRulesTable)
      .values({ category: cat, rules: rules.trim() })
      .onConflictDoUpdate({
        target: categoryRulesTable.category,
        set: { rules: rules.trim(), updatedAt: new Date() },
      })
      .returning();
    res.json(saved);
  } catch {
    res.status(500).json({ error: "Failed to save category rules." });
  }
});

// ─── Legacy: Create rule for a tournament (admin) ───────────────────────────

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
      .values({ tournamentId, title, content, orderIndex: orderIndex ?? 0 })
      .returning();
    res.status(201).json(rule);
  } catch {
    res.status(500).json({ error: "Failed to create rule." });
  }
});

// ─── Legacy: Update / Delete individual rule (admin) ────────────────────────

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
