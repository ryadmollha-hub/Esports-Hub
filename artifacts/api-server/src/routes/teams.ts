import { Router, type IRouter } from "express";
import { getAuth } from "@clerk/express";
import { db } from "@workspace/db";
import { teamsTable, teamMembersTable, usersTable } from "@workspace/db";
import { eq, ilike, and } from "drizzle-orm";
import { CreateTeamBody, UpdateTeamBody } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/teams", async (req, res) => {
  const { search } = req.query as Record<string, string>;
  const rows = await db
    .select()
    .from(teamsTable)
    .where(search ? ilike(teamsTable.name, `%${search}%`) : undefined);
  res.json(rows);
});

router.post("/teams", async (req, res) => {
  const { userId } = getAuth(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  const data = CreateTeamBody.parse(req.body);
  const [team] = await db
    .insert(teamsTable)
    .values({
      name: data.name,
      tag: data.tag ?? null,
      logoUrl: data.logoUrl ?? null,
      captainId: userId,
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
  const { userId } = getAuth(req);
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
    .where(eq(teamMembersTable.teamId, team.id));
  res.json({ ...team, members });
});

router.get("/teams/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const [team] = await db.select().from(teamsTable).where(eq(teamsTable.id, id));
  if (!team) return res.status(404).json({ error: "Team not found" });
  const members = await db
    .select()
    .from(teamMembersTable)
    .where(eq(teamMembersTable.teamId, id));
  res.json({ ...team, members });
});

router.put("/teams/:id", async (req, res) => {
  const { userId } = getAuth(req);
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
    })
    .where(eq(teamsTable.id, id))
    .returning();
  res.json(updated);
});

router.post("/teams/:id/join", async (req, res) => {
  const { userId } = getAuth(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  const id = parseInt(req.params.id);
  const [team] = await db.select().from(teamsTable).where(eq(teamsTable.id, id));
  if (!team) return res.status(404).json({ error: "Team not found" });
  const existing = await db
    .select()
    .from(teamMembersTable)
    .where(and(eq(teamMembersTable.teamId, id), eq(teamMembersTable.userId, userId)));
  if (existing.length > 0) return res.status(409).json({ error: "Already a member or pending" });
  const [member] = await db
    .insert(teamMembersTable)
    .values({ teamId: id, userId, role: "member", status: "pending" })
    .returning();
  res.status(201).json(member);
});

router.get("/teams/:id/join-requests", async (req, res) => {
  const { userId } = getAuth(req);
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
  const { userId } = getAuth(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  const teamId = parseInt(req.params.teamId);
  const memberId = parseInt(req.params.memberId);
  const [team] = await db.select().from(teamsTable).where(eq(teamsTable.id, teamId));
  if (!team) return res.status(404).json({ error: "Team not found" });
  if (team.captainId !== userId) return res.status(403).json({ error: "Only captain can approve members" });
  await db
    .update(teamMembersTable)
    .set({ status: "active" })
    .where(and(eq(teamMembersTable.id, memberId), eq(teamMembersTable.teamId, teamId)));
  res.json({ success: true });
});

export default router;
