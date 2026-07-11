import { Router, type IRouter } from "express";
import { requireAdmin, requireAuth } from "../middlewares/requireAdmin";
import { db } from "@workspace/db";
import { supportTicketsTable, ticketRepliesTable, notificationsTable, settingsTable, usersTable } from "@workspace/db";
import { eq, desc, and } from "drizzle-orm";

const router: IRouter = Router();

const DEFAULT_SUPPORT: Record<string, string> = {
  whatsapp_number: "01768177772",
  telegram_link: "https://t.me/ayman990",
};

async function getSetting(key: string): Promise<string> {
  const [row] = await db.select().from(settingsTable).where(eq(settingsTable.key, key));
  return row?.value ?? DEFAULT_SUPPORT[key] ?? "";
}

async function setSetting(key: string, value: string): Promise<void> {
  const [existing] = await db.select().from(settingsTable).where(eq(settingsTable.key, key));
  if (existing) {
    await db.update(settingsTable).set({ value, updatedAt: new Date() }).where(eq(settingsTable.key, key));
  } else {
    await db.insert(settingsTable).values({ key, value });
  }
}

router.get("/support-settings", async (_req, res) => {
  try {
    const [whatsapp, telegram] = await Promise.all([
      getSetting("whatsapp_number"),
      getSetting("telegram_link"),
    ]);
    res.json({ whatsapp_number: whatsapp, telegram_link: telegram });
  } catch {
    res.status(500).json({ error: "Failed to load support settings." });
  }
});

router.put("/admin/support-settings", async (req, res) => {
  if (!await requireAdmin(req, res)) return;
  const { whatsapp_number, telegram_link } = req.body;
  if (!whatsapp_number || !telegram_link) {
    return res.status(400).json({ error: "Both whatsapp_number and telegram_link are required." });
  }
  try {
    await Promise.all([
      setSetting("whatsapp_number", String(whatsapp_number).trim()),
      setSetting("telegram_link", String(telegram_link).trim()),
    ]);
    res.json({ success: true, whatsapp_number, telegram_link });
  } catch {
    res.status(500).json({ error: "Failed to update support settings." });
  }
});

router.post("/support/tickets", async (req, res) => {
  const userId = await requireAuth(req, res);
  if (!userId) return;

  const { subject, category, message, screenshotUrl } = req.body;

  if (!subject?.trim() || !category?.trim() || !message?.trim()) {
    return res.status(400).json({ error: "Subject, category, and message are required." });
  }

  const validCategories = ["payment_issue", "tournament_issue", "match_issue", "account_issue", "technical_issue", "other"];
  if (!validCategories.includes(category)) {
    return res.status(400).json({ error: "Invalid category." });
  }

  if (subject.length > 200) {
    return res.status(400).json({ error: "Subject must be under 200 characters." });
  }

  if (message.length > 5000) {
    return res.status(400).json({ error: "Message must be under 5000 characters." });
  }

  if (screenshotUrl) {
    if (typeof screenshotUrl !== "string") {
      return res.status(400).json({ error: "Invalid screenshot." });
    }
    if (screenshotUrl.length > 7 * 1024 * 1024) {
      return res.status(400).json({ error: "Screenshot too large (max 5 MB)." });
    }
    if (!screenshotUrl.startsWith("data:image/")) {
      return res.status(400).json({ error: "Screenshot must be a base64 image." });
    }
  }

  try {
    const [ticket] = await db.insert(supportTicketsTable).values({
      userId,
      subject: subject.trim(),
      category,
      message: message.trim(),
      screenshotUrl: screenshotUrl ?? null,
      status: "open",
    }).returning();

    res.status(201).json(ticket);
  } catch {
    res.status(500).json({ error: "Failed to create ticket." });
  }
});

router.get("/support/tickets", async (req, res) => {
  const userId = await requireAuth(req, res);
  if (!userId) return;

  try {
    const tickets = await db
      .select()
      .from(supportTicketsTable)
      .where(eq(supportTicketsTable.userId, userId))
      .orderBy(desc(supportTicketsTable.createdAt));

    res.json(tickets);
  } catch {
    res.status(500).json({ error: "Failed to load tickets." });
  }
});

router.get("/support/tickets/:id", async (req, res) => {
  const userId = await requireAuth(req, res);
  if (!userId) return;

  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid ticket ID." });

  try {
    const [ticket] = await db
      .select()
      .from(supportTicketsTable)
      .where(and(eq(supportTicketsTable.id, id), eq(supportTicketsTable.userId, userId)));

    if (!ticket) return res.status(404).json({ error: "Ticket not found." });

    const replies = await db
      .select()
      .from(ticketRepliesTable)
      .where(eq(ticketRepliesTable.ticketId, id))
      .orderBy(ticketRepliesTable.createdAt);

    res.json({ ...ticket, replies });
  } catch {
    res.status(500).json({ error: "Failed to load ticket." });
  }
});

router.post("/support/tickets/:id/replies", async (req, res) => {
  const userId = await requireAuth(req, res);
  if (!userId) return;

  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid ticket ID." });

  const { message } = req.body;
  if (!message?.trim()) return res.status(400).json({ error: "Message is required." });
  if (message.length > 3000) return res.status(400).json({ error: "Message must be under 3000 characters." });

  try {
    const [ticket] = await db
      .select()
      .from(supportTicketsTable)
      .where(and(eq(supportTicketsTable.id, id), eq(supportTicketsTable.userId, userId)));

    if (!ticket) return res.status(404).json({ error: "Ticket not found." });
    if (ticket.status === "closed") return res.status(400).json({ error: "Cannot reply to a closed ticket." });

    const [reply] = await db.insert(ticketRepliesTable).values({
      ticketId: id,
      userId,
      message: message.trim(),
      isAdmin: false,
    }).returning();

    await db.update(supportTicketsTable)
      .set({ status: "open", updatedAt: new Date() })
      .where(eq(supportTicketsTable.id, id));

    res.status(201).json(reply);
  } catch {
    res.status(500).json({ error: "Failed to add reply." });
  }
});

router.get("/admin/support/tickets", async (req, res) => {
  if (!await requireAdmin(req, res)) return;

  try {
    const tickets = await db
      .select()
      .from(supportTicketsTable)
      .orderBy(desc(supportTicketsTable.createdAt));

    const ticketsWithCounts = await Promise.all(
      tickets.map(async (t) => {
        const replies = await db
          .select()
          .from(ticketRepliesTable)
          .where(eq(ticketRepliesTable.ticketId, t.id));

        const [user] = await db
          .select({ username: usersTable.username, displayName: usersTable.displayName, email: usersTable.email })
          .from(usersTable)
          .where(eq(usersTable.clerkId, t.userId));

        return { ...t, replyCount: replies.length, user: user ?? null };
      })
    );

    res.json(ticketsWithCounts);
  } catch {
    res.status(500).json({ error: "Failed to load tickets." });
  }
});

router.get("/admin/support/tickets/:id", async (req, res) => {
  if (!await requireAdmin(req, res)) return;

  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid ticket ID." });

  try {
    const [ticket] = await db
      .select()
      .from(supportTicketsTable)
      .where(eq(supportTicketsTable.id, id));

    if (!ticket) return res.status(404).json({ error: "Ticket not found." });

    const replies = await db
      .select()
      .from(ticketRepliesTable)
      .where(eq(ticketRepliesTable.ticketId, id))
      .orderBy(ticketRepliesTable.createdAt);

    const [user] = await db
      .select({ username: usersTable.username, displayName: usersTable.displayName, email: usersTable.email })
      .from(usersTable)
      .where(eq(usersTable.clerkId, ticket.userId));

    res.json({ ...ticket, replies, user: user ?? null });
  } catch {
    res.status(500).json({ error: "Failed to load ticket." });
  }
});

router.post("/admin/support/tickets/:id/replies", async (req, res) => {
  if (!await requireAdmin(req, res)) return;

  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid ticket ID." });

  const { message } = req.body;
  if (!message?.trim()) return res.status(400).json({ error: "Message is required." });

  try {
    const [ticket] = await db
      .select()
      .from(supportTicketsTable)
      .where(eq(supportTicketsTable.id, id));

    if (!ticket) return res.status(404).json({ error: "Ticket not found." });

    const [reply] = await db.insert(ticketRepliesTable).values({
      ticketId: id,
      userId: "admin",
      message: message.trim(),
      isAdmin: true,
    }).returning();

    await db.update(supportTicketsTable)
      .set({ status: "in_progress", updatedAt: new Date() })
      .where(and(eq(supportTicketsTable.id, id), eq(supportTicketsTable.status, "open")));

    await db.insert(notificationsTable).values({
      userId: ticket.userId,
      title: "Support Reply",
      message: `Admin replied to your ticket: "${ticket.subject}"`,
      type: "info",
      isRead: false,
    });

    res.status(201).json(reply);
  } catch {
    res.status(500).json({ error: "Failed to add reply." });
  }
});

router.put("/admin/support/tickets/:id/status", async (req, res) => {
  if (!await requireAdmin(req, res)) return;

  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid ticket ID." });

  const { status } = req.body;
  const validStatuses = ["open", "in_progress", "resolved", "closed"];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: "Invalid status." });
  }

  try {
    const [ticket] = await db
      .update(supportTicketsTable)
      .set({ status, updatedAt: new Date() })
      .where(eq(supportTicketsTable.id, id))
      .returning();

    if (!ticket) return res.status(404).json({ error: "Ticket not found." });

    if (status === "resolved" || status === "closed") {
      await db.insert(notificationsTable).values({
        userId: ticket.userId,
        title: status === "resolved" ? "Ticket Resolved" : "Ticket Closed",
        message: `Your support ticket "${ticket.subject}" has been ${status}.`,
        type: status === "resolved" ? "success" : "info",
        isRead: false,
      });
    }

    res.json(ticket);
  } catch {
    res.status(500).json({ error: "Failed to update status." });
  }
});

router.delete("/admin/support/tickets/:id", async (req, res) => {
  if (!await requireAdmin(req, res)) return;

  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid ticket ID." });

  try {
    await db.delete(supportTicketsTable).where(eq(supportTicketsTable.id, id));
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Failed to delete ticket." });
  }
});

export default router;
