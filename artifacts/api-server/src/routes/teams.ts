import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { teamsTable, teamMembersTable, usersTable } from "@workspace/db";
import { eq, ilike, and, ne } from "drizzle-orm";
import { CreateTeamBody, UpdateTeamBody } from "@workspace/api-zod";
import { safeGetUserId } from "../lib/clerkAuth";
import { createNotification } from "../lib/notificationHelper";

const router: IRouter = Router();

router.get("/teams", async (req, res) => {
  const { search } = req.query as Record<string, string>;
  const rows = await db
    .select()
    .from(teamsTable)
    .where(search ? ilike(teamsTable.name, `%${search}%`) : undefined);

  const teamsWithCounts = await Promise.all(
    rows.map(async (team) => {
      const members = await db
        .select()
        .from(teamMembersTable)
        .where(and(eq(teamMembersTable.teamId, team.id), eq(teamMembersTable.status, "active")));
      return { ...team, memberCount: members.length };
    })
  );
  res.json(teamsWithCounts);
});

router.post("/teams", async (req, res) => {
  const userId = safeGetUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const existingMembership = await db
    .select()
    .from(teamMembersTable)
    .where(and(eq(teamMembersTable.userId, userId), eq(teamMembersTable.status, "active")));
  if (existingMembership.length > 0) {
    return res.status(409).json({ error: "You are already a member of a team. Leave your current team first." });
  }

  const data = CreateTeamBody.parse(req.body);
  const [team] = await db
    .insert(teamsTable)
    .values({
      name: data.name,
      tag: data.tag ?? null,
      logoUrl: data.logoUrl ?? null,
      captainId: userId,
      maxMembers: (data as any).maxMembers ?? 4,
    })
    .returning();
  await db.insert(teamMembersTable).values({
    teamId: team.id,
    userId,
    role: "captain",
    status: "active",
    freefireUid: data.freefireUid ?? null,
    playerName: data.playerName ?? null,
  });
  res.status(201).json(team);
});

router.get("/teams/me", async (req, res) => {
  const userId = safeGetUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  const member = await db
    .select()
    .from(teamMembersTable)
    .where(and(eq(teamMembersTable.userId, userId), eq(teamMembersTable.status, "active")));
  if (!member[0]) return res.status(404).json({ error: "No team found" });
  const [team] = await db
    .select()
    .from(teamsTable)
    .where(eq(teamsTable.id, member[0].teamId));
  if (!team) return res.status(404).json({ error: "Team not found" });
  const members = await db
    .select()
    .from(teamMembersTable)
    .where(and(eq(teamMembersTable.teamId, team.id), ne(teamMembersTable.status, "rejected")));
  res.json({ ...team, members });
});

router.get("/teams/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const [team] = await db.select().from(teamsTable).where(eq(teamsTable.id, id));
  if (!team) return res.status(404).json({ error: "Team not found" });
  const members = await db
    .select()
    .from(teamMembersTable)
    .where(and(eq(teamMembersTable.teamId, id), eq(teamMembersTable.status, "active")));
  res.json({ ...team, members });
});

router.put("/teams/:id", async (req, res) => {
  const userId = safeGetUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  const id = parseInt(req.params.id);
  const [team] = await db.select().from(teamsTable).where(eq(teamsTable.id, id));
  if (!team) return res.status(404).json({ error: "Team not found" });
  if (team.captainId !== userId) return res.status(403).json({ error: "Only captain can update team" });
  const data = UpdateTeamBody.parse(req.body);
  const [updated] = await db
    .update(teamsTable)
    .set({
      ...(data.name && { name: data.name }),
      ...(data.tag !== undefined && { tag: data.tag }),
      ...(data.logoUrl !== undefined && { logoUrl: data.logoUrl }),
      ...((data as any).maxMembers !== undefined && { maxMembers: (data as any).maxMembers }),
    })
    .where(eq(teamsTable.id, id))
    .returning();
  res.json(updated);
});

router.post("/teams/:id/join", async (req, res) => {
  const userId = safeGetUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  const id = parseInt(req.params.id);
  const [team] = await db.select().from(teamsTable).where(eq(teamsTable.id, id));
  if (!team) return res.status(404).json({ error: "Team not found" });

  const activeMembers = await db
    .select()
    .from(teamMembersTable)
    .where(and(eq(teamMembersTable.teamId, id), eq(teamMembersTable.status, "active")));
  if (activeMembers.length >= team.maxMembers) {
    return res.status(400).json({ error: "Team is full" });
  }

  const existing = await db
    .select()
    .from(teamMembersTable)
    .where(and(eq(teamMembersTable.teamId, id), eq(teamMembersTable.userId, userId)));
  if (existing.length > 0) {
    if (existing[0].status === "active") return res.status(409).json({ error: "You are already a member of this team" });
    if (existing[0].status === "pending") return res.status(409).json({ error: "You already have a pending request for this team" });
    // rejected — allow re-request
    await db.delete(teamMembersTable).where(eq(teamMembersTable.id, existing[0].id));
  }

  const alsoMember = await db
    .select()
    .from(teamMembersTable)
    .where(and(eq(teamMembersTable.userId, userId), eq(teamMembersTable.status, "active")));
  if (alsoMember.length > 0) {
    return res.status(409).json({ error: "You are already a member of another team. Leave first." });
  }

  const { freefireUid, playerName } = req.body;
  const [member] = await db
    .insert(teamMembersTable)
    .values({ teamId: id, userId, role: "member", status: "pending", freefireUid: freefireUid ?? null, playerName: playerName ?? null })
    .returning();

  await createNotification(team.captainId, "New Join Request", `Someone wants to join your team ${team.name}.`, "info");

  res.status(201).json(member);
});

router.post("/teams/:id/leave", async (req, res) => {
  const userId = safeGetUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  const id = parseInt(req.params.id);
  const [team] = await db.select().from(teamsTable).where(eq(teamsTable.id, id));
  if (!team) return res.status(404).json({ error: "Team not found" });
  if (team.captainId === userId) {
    return res.status(400).json({ error: "Captain cannot leave the team. Transfer captaincy or delete the team." });
  }
  await db
    .delete(teamMembersTable)
    .where(and(eq(teamMembersTable.teamId, id), eq(teamMembersTable.userId, userId)));
  res.json({ success: true });
});

router.get("/teams/:id/join-requests", async (req, res) => {
  const userId = safeGetUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  const id = parseInt(req.params.id);
  const [team] = await db.select().from(teamsTable).where(eq(teamsTable.id, id));
  if (!team) return res.status(404).json({ error: "Team not found" });
  if (team.captainId !== userId) return res.status(403).json({ error: "Only captain can view join requests" });
  const rows = await db
    .select()
    .from(teamMembersTable)
    .where(and(eq(teamMembersTable.teamId, id), eq(teamMembersTable.status, "pending")));
  res.json(rows);
});

router.post("/teams/:teamId/members/:memberId/approve", async (req, res) => {
  const userId = safeGetUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  const teamId = parseInt(req.params.teamId);
  const memberId = parseInt(req.params.memberId);
  const [team] = await db.select().from(teamsTable).where(eq(teamsTable.id, teamId));
  if (!team) return res.status(404).json({ error: "Team not found" });
  if (team.captainId !== userId) return res.status(403).json({ error: "Only captain can approve members" });

  const activeMembers = await db
    .select()
    .from(teamMembersTable)
    .where(and(eq(teamMembersTable.teamId, teamId), eq(teamMembersTable.status, "active")));
  if (activeMembers.length >= team.maxMembers) {
    return res.status(400).json({ error: "Team is full. Cannot approve more members." });
  }

  const [member] = await db
    .select()
    .from(teamMembersTable)
    .where(and(eq(teamMembersTable.id, memberId), eq(teamMembersTable.teamId, teamId)));

  await db
    .update(teamMembersTable)
    .set({ status: "active" })
    .where(and(eq(teamMembersTable.id, memberId), eq(teamMembersTable.teamId, teamId)));

  if (member) {
    await createNotification(member.userId, "Join Request Accepted!", `Your request to join ${team.name} has been approved. Welcome to the team!`, "success");
  }

  res.json({ success: true });
});

router.post("/teams/:teamId/members/:memberId/reject", async (req, res) => {
  const userId = safeGetUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  const teamId = parseInt(req.params.teamId);
  const memberId = parseInt(req.params.memberId);
  const [team] = await db.select().from(teamsTable).where(eq(teamsTable.id, teamId));
  if (!team) return res.status(404).json({ error: "Team not found" });
  if (team.captainId !== userId) return res.status(403).json({ error: "Only captain can reject members" });

  const [member] = await db
    .select()
    .from(teamMembersTable)
    .where(and(eq(teamMembersTable.id, memberId), eq(teamMembersTable.teamId, teamId)));

  await db
    .update(teamMembersTable)
    .set({ status: "rejected" })
    .where(and(eq(teamMembersTable.id, memberId), eq(teamMembersTable.teamId, teamId)));

  if (member) {
    await createNotification(member.userId, "Join Request Rejected", `Your request to join ${team.name} was not accepted.`, "error");
  }

  res.json({ success: true });
});

router.delete("/teams/:id", async (req, res) => {
  const userId = safeGetUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  const id = parseInt(req.params.id);
  const [team] = await db.select().from(teamsTable).where(eq(teamsTable.id, id));
  if (!team) return res.status(404).json({ error: "Team not found" });
  if (team.captainId !== userId) return res.status(403).json({ error: "Only captain can delete team" });
  await db.delete(teamMembersTable).where(eq(teamMembersTable.teamId, id));
  await db.delete(teamsTable).where(eq(teamsTable.id, id));
  res.json({ success: true });
});

export default router;
