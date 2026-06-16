import { useEffect, useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useAuthContext } from "@/lib/AuthContext";
import { useLocation } from "wouter";
import { Shield, Users, Crown, Check, X, LogOut, Trash2, Edit2, UserMinus, Save } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod/v4";
import { useQueryClient } from "@tanstack/react-query";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import {
  useGetMyTeam, useCreateTeam, useGetTeamJoinRequests, useApproveTeamMember,
  getGetMyTeamQueryKey, getGetTeamJoinRequestsQueryKey,
} from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const createSchema = z.object({
  name: z.string().min(2, "Team name must be at least 2 characters"),
  tag: z.string().max(6, "Tag max 6 characters").optional(),
  freefireUid: z.string().min(1, "Your Free Fire UID is required"),
  playerName: z.string().min(1, "Your in-game name is required"),
  maxMembers: z.coerce.number().min(2).max(10).default(4),
});

const editSchema = z.object({
  name: z.string().min(2, "Team name must be at least 2 characters"),
  tag: z.string().max(6, "Tag max 6 characters").optional(),
  logoUrl: z.string().optional(),
  maxMembers: z.coerce.number().min(2).max(10),
});

type CreateForm = z.infer<typeof createSchema>;
type EditForm = z.infer<typeof editSchema>;

export default function MyTeamPage() {
  const { isSignedIn, isLoaded } = useAuth();
  const { user } = useAuthContext();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [leavingTeam, setLeavingTeam] = useState(false);
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [deletingTeam, setDeletingTeam] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [kickingId, setKickingId] = useState<number | null>(null);

  const token = typeof window !== "undefined" ? localStorage.getItem("ff_auth_token") : null;

  useEffect(() => {
    if (isLoaded && !isSignedIn) setLocation("/sign-in");
  }, [isLoaded, isSignedIn]);

  const { data: myTeam, isLoading, error } = useGetMyTeam({
    query: { queryKey: getGetMyTeamQueryKey() },
  });

  const team = myTeam as any;
  const hasTeam = !!team && !error;

  const { data: joinRequests = [] } = useGetTeamJoinRequests(
    team?.id ?? 0,
    { query: { enabled: hasTeam, queryKey: getGetTeamJoinRequestsQueryKey(team?.id ?? 0) } }
  );

  const createTeam = useCreateTeam();
  const approveTeamMember = useApproveTeamMember();

  const form = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
    defaultValues: { name: "", tag: "", freefireUid: "", playerName: "", maxMembers: 4 },
  });

  const editForm = useForm<EditForm>({
    resolver: zodResolver(editSchema),
    defaultValues: { name: team?.name ?? "", tag: team?.tag ?? "", logoUrl: team?.logoUrl ?? "", maxMembers: team?.maxMembers ?? 4 },
  });

  useEffect(() => {
    if (team && showEditForm) {
      editForm.reset({
        name: team.name ?? "",
        tag: team.tag ?? "",
        logoUrl: team.logoUrl ?? "",
        maxMembers: team.maxMembers ?? 4,
      });
    }
  }, [team, showEditForm]);

  // Determine if the current logged-in user is the team captain
  const isCaptain = !!user && !!team && team.captainId === user.userId;
  const activeMembers = team?.members?.filter((m: any) => m.status === "active") ?? [];

  const onCreateTeam = (data: CreateForm) => {
    createTeam.mutate(
      { data: { name: data.name, tag: data.tag, freefireUid: data.freefireUid, playerName: data.playerName, maxMembers: data.maxMembers } as any },
      {
        onSuccess: () => {
          toast({ title: "Team created!", description: "Your squad is ready." });
          qc.invalidateQueries({ queryKey: getGetMyTeamQueryKey() });
        },
        onError: (err: any) => {
          toast({ title: "Error", description: err?.response?.data?.error ?? "Failed to create team.", variant: "destructive" });
        },
      }
    );
  };

  const onEditTeam = async (data: EditForm) => {
    if (!token || !team) return;
    setSavingEdit(true);
    try {
      const res = await fetch(`${BASE}/api/teams/${team.id}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ name: data.name, tag: data.tag || null, logoUrl: data.logoUrl || null, maxMembers: data.maxMembers }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "Failed to update team");
      toast({ title: "Team updated!" });
      setShowEditForm(false);
      qc.invalidateQueries({ queryKey: getGetMyTeamQueryKey() });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setSavingEdit(false);
  };

  const handleApprove = (teamId: number, memberId: number) => {
    approveTeamMember.mutate(
      { teamId, memberId },
      {
        onSuccess: () => {
          toast({ title: "Member approved!" });
          qc.invalidateQueries({ queryKey: getGetMyTeamQueryKey() });
          qc.invalidateQueries({ queryKey: getGetTeamJoinRequestsQueryKey(teamId) });
        },
        onError: (err: any) => {
          toast({ title: "Error", description: err?.response?.data?.error ?? "Failed to approve.", variant: "destructive" });
        },
      }
    );
  };

  const handleReject = async (teamId: number, memberId: number) => {
    if (!token) return;
    setRejectingId(memberId);
    try {
      const res = await fetch(`${BASE}/api/teams/${teamId}/members/${memberId}/reject`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error ?? "Failed to reject");
      }
      toast({ title: "Request rejected." });
      qc.invalidateQueries({ queryKey: getGetTeamJoinRequestsQueryKey(teamId) });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setRejectingId(null);
  };

  const handleKickMember = async (memberId: number, playerName: string) => {
    if (!token || !team) return;
    if (!confirm(`Remove ${playerName} from the team?`)) return;
    setKickingId(memberId);
    try {
      const res = await fetch(`${BASE}/api/teams/${team.id}/members/${memberId}/reject`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "Failed to remove member");
      toast({ title: "Member removed from team." });
      qc.invalidateQueries({ queryKey: getGetMyTeamQueryKey() });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setKickingId(null);
  };

  const handleLeaveTeam = async () => {
    if (!token || !team) return;
    if (!confirm("Are you sure you want to leave this team?")) return;
    setLeavingTeam(true);
    try {
      const res = await fetch(`${BASE}/api/teams/${team.id}/leave`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "Failed to leave team");
      toast({ title: "You left the team." });
      qc.invalidateQueries({ queryKey: getGetMyTeamQueryKey() });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setLeavingTeam(false);
  };

  const handleDeleteTeam = async () => {
    if (!token || !team) return;
    if (!confirm("Are you sure you want to DELETE this team? This cannot be undone.")) return;
    setDeletingTeam(true);
    try {
      const res = await fetch(`${BASE}/api/teams/${team.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "Failed to delete team");
      toast({ title: "Team deleted." });
      qc.invalidateQueries({ queryKey: getGetMyTeamQueryKey() });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setDeletingTeam(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f]">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 pt-16">
          <div className="h-40 bg-[#12121a] rounded-xl animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 pt-16 pb-20">
        <h1 className="text-4xl font-black uppercase mb-2" data-testid="heading-my-team">
          My <span className="text-[#ff6b00]">Team</span>
        </h1>

        {!hasTeam ? (
          <div className="mt-8">
            <p className="text-[#a0a0b0] mb-8">You don't have a team yet. Create one or request to join an existing team.</p>
            <div className="bg-[#12121a] rounded-2xl border border-[#ff6b00]/20 p-8 max-w-lg">
              <h2 className="text-xl font-black uppercase mb-6 text-[#ff6b00]">Create a Team</h2>
              <form onSubmit={form.handleSubmit(onCreateTeam)} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wide text-[#a0a0b0] mb-1.5">Team Name</label>
                  <input {...form.register("name")} placeholder="Enter team name" data-testid="input-team-name"
                    className="w-full px-4 py-3 bg-[#1a1a24] border border-[#2a2a36] rounded-xl text-white placeholder-[#a0a0b0] focus:outline-none focus:border-[#ff6b00] transition-colors" />
                  {form.formState.errors.name && <p className="text-[#ff2244] text-xs mt-1">{form.formState.errors.name.message}</p>}
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wide text-[#a0a0b0] mb-1.5">Tag <span className="font-normal normal-case text-xs">(max 6 chars)</span></label>
                  <input {...form.register("tag")} placeholder="e.g. FIRE" data-testid="input-team-tag"
                    className="w-full px-4 py-3 bg-[#1a1a24] border border-[#2a2a36] rounded-xl text-white placeholder-[#a0a0b0] focus:outline-none focus:border-[#ff6b00] transition-colors font-mono" />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wide text-[#a0a0b0] mb-1.5">Max Members</label>
                  <select {...form.register("maxMembers")}
                    className="w-full px-4 py-3 bg-[#1a1a24] border border-[#2a2a36] rounded-xl text-white focus:outline-none focus:border-[#ff6b00] transition-colors">
                    <option value={2}>2 (Duo)</option>
                    <option value={4}>4 (Squad)</option>
                    <option value={6}>6</option>
                    <option value={10}>10</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wide text-[#a0a0b0] mb-1.5">Your Free Fire UID</label>
                  <input {...form.register("freefireUid")} placeholder="FF UID" data-testid="input-captain-uid"
                    className="w-full px-4 py-3 bg-[#1a1a24] border border-[#2a2a36] rounded-xl text-white placeholder-[#a0a0b0] focus:outline-none focus:border-[#ff6b00] transition-colors font-mono" />
                  {form.formState.errors.freefireUid && <p className="text-[#ff2244] text-xs mt-1">{form.formState.errors.freefireUid.message}</p>}
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wide text-[#a0a0b0] mb-1.5">Your In-Game Name</label>
                  <input {...form.register("playerName")} placeholder="Your FF nickname" data-testid="input-captain-name"
                    className="w-full px-4 py-3 bg-[#1a1a24] border border-[#2a2a36] rounded-xl text-white placeholder-[#a0a0b0] focus:outline-none focus:border-[#ff6b00] transition-colors" />
                  {form.formState.errors.playerName && <p className="text-[#ff2244] text-xs mt-1">{form.formState.errors.playerName.message}</p>}
                </div>
                <button type="submit" disabled={createTeam.isPending} data-testid="button-create-team"
                  className="w-full py-3 bg-[#ff6b00] text-white font-black uppercase rounded-xl hover:bg-[#e66000] disabled:opacity-50 transition-all shadow-[0_0_20px_rgba(255,107,0,0.3)]">
                  {createTeam.isPending ? "Creating..." : "Create Team"}
                </button>
              </form>
            </div>
          </div>
        ) : (
          <div className="mt-6 space-y-6">
            {/* Team Header */}
            <div className="bg-[#12121a] rounded-2xl border border-[#ff6b00]/20 p-6">
              <div className="flex items-center gap-5">
                <div className="w-16 h-16 rounded-2xl bg-[#ff6b00]/10 border border-[#ff6b00]/30 flex items-center justify-center shrink-0">
                  {team.logoUrl ? (
                    <img src={team.logoUrl} alt={team.name} className="w-full h-full object-cover rounded-2xl" />
                  ) : (
                    <Shield className="w-8 h-8 text-[#ff6b00]" />
                  )}
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-black text-white" data-testid="text-my-team-name">{team.name}</h2>
                  {team.tag && <span className="text-[#a0a0b0] text-sm">[{team.tag}]</span>}
                  <div className="text-[#a0a0b0] text-xs mt-1">
                    {activeMembers.length}/{team.maxMembers ?? 4} members
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <div className="text-[#ff6b00] font-black text-xl">{team.totalKills ?? 0}</div>
                    <div className="text-[#a0a0b0] text-xs">Total Kills</div>
                  </div>
                  <div>
                    <div className="text-[#ffd700] font-black text-xl">{team.totalWins ?? 0}</div>
                    <div className="text-[#a0a0b0] text-xs">Wins</div>
                  </div>
                </div>
              </div>

              {/* Captain actions */}
              <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-[#ff6b00]/10">
                {isCaptain && (
                  <button
                    onClick={() => setShowEditForm((v) => !v)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#ff6b00]/10 border border-[#ff6b00]/30 text-[#ff6b00] rounded-lg text-xs font-bold uppercase hover:bg-[#ff6b00]/20 transition-colors"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    Edit Team
                  </button>
                )}
                {isCaptain && (
                  <button
                    onClick={handleDeleteTeam}
                    disabled={deletingTeam}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#ff2244]/10 border border-[#ff2244]/30 text-[#ff2244] rounded-lg text-xs font-bold uppercase hover:bg-[#ff2244]/20 transition-colors disabled:opacity-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    {deletingTeam ? "Deleting..." : "Delete Team"}
                  </button>
                )}
                {!isCaptain && (
                  <button
                    onClick={handleLeaveTeam}
                    disabled={leavingTeam}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#ff2244]/10 border border-[#ff2244]/30 text-[#ff2244] rounded-lg text-xs font-bold uppercase hover:bg-[#ff2244]/20 transition-colors disabled:opacity-50"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    {leavingTeam ? "Leaving..." : "Leave Team"}
                  </button>
                )}
              </div>

              {/* Edit Team Form */}
              {showEditForm && isCaptain && (
                <form onSubmit={editForm.handleSubmit(onEditTeam)} className="mt-4 pt-4 border-t border-[#ff6b00]/10 space-y-3">
                  <h3 className="text-sm font-black uppercase text-[#ff6b00] mb-3">Edit Team Details</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wide text-[#a0a0b0] mb-1">Team Name</label>
                      <input {...editForm.register("name")}
                        className="w-full px-3 py-2.5 bg-[#1a1a24] border border-[#2a2a36] rounded-lg text-white text-sm placeholder-[#a0a0b0] focus:outline-none focus:border-[#ff6b00] transition-colors" />
                      {editForm.formState.errors.name && <p className="text-[#ff2244] text-xs mt-1">{editForm.formState.errors.name.message}</p>}
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wide text-[#a0a0b0] mb-1">Tag</label>
                      <input {...editForm.register("tag")} placeholder="e.g. FIRE"
                        className="w-full px-3 py-2.5 bg-[#1a1a24] border border-[#2a2a36] rounded-lg text-white text-sm placeholder-[#a0a0b0] focus:outline-none focus:border-[#ff6b00] transition-colors font-mono" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wide text-[#a0a0b0] mb-1">Logo URL <span className="font-normal normal-case">(optional)</span></label>
                    <input {...editForm.register("logoUrl")} placeholder="https://..."
                      className="w-full px-3 py-2.5 bg-[#1a1a24] border border-[#2a2a36] rounded-lg text-white text-sm placeholder-[#a0a0b0] focus:outline-none focus:border-[#ff6b00] transition-colors" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wide text-[#a0a0b0] mb-1">Max Members</label>
                    <select {...editForm.register("maxMembers")}
                      className="w-full px-3 py-2.5 bg-[#1a1a24] border border-[#2a2a36] rounded-lg text-white text-sm focus:outline-none focus:border-[#ff6b00] transition-colors">
                      <option value={2}>2 (Duo)</option>
                      <option value={4}>4 (Squad)</option>
                      <option value={6}>6</option>
                      <option value={10}>10</option>
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <button type="submit" disabled={savingEdit}
                      className="flex items-center gap-1.5 px-4 py-2 bg-[#ff6b00] text-white font-bold text-sm uppercase rounded-lg hover:bg-[#e66000] disabled:opacity-50 transition-all">
                      <Save className="w-3.5 h-3.5" />
                      {savingEdit ? "Saving..." : "Save Changes"}
                    </button>
                    <button type="button" onClick={() => setShowEditForm(false)}
                      className="px-4 py-2 bg-[#1a1a24] text-[#a0a0b0] font-bold text-sm uppercase rounded-lg hover:text-white transition-colors">
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Members */}
            <div className="bg-[#12121a] rounded-2xl border border-[#ff6b00]/20 p-6">
              <h3 className="font-black uppercase text-sm text-[#a0a0b0] mb-4 tracking-wider flex items-center gap-2">
                <Users className="w-4 h-4" /> Members ({activeMembers.length}/{team.maxMembers ?? 4})
              </h3>
              <div className="space-y-3">
                {activeMembers.map((member: any) => (
                  <div key={member.id} className="flex items-center gap-3 py-2 border-b border-[#ff6b00]/5 last:border-0" data-testid={`row-member-${member.id}`}>
                    <div className="w-8 h-8 rounded-lg bg-[#ff6b00]/10 flex items-center justify-center">
                      {member.role === "captain" ? <Crown className="w-4 h-4 text-[#ffd700]" /> : <Users className="w-4 h-4 text-[#a0a0b0]" />}
                    </div>
                    <div className="flex-1">
                      <div className="font-bold text-white text-sm">{member.playerName ?? "Unknown"}</div>
                      <div className="text-[#a0a0b0] text-xs font-mono">{member.freefireUid}</div>
                    </div>
                    <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded ${member.role === "captain" ? "text-[#ffd700] bg-[#ffd700]/10" : "text-[#a0a0b0] bg-[#1a1a24]"}`}>
                      {member.role}
                    </span>
                    {/* Captain can remove non-captain members */}
                    {isCaptain && member.role !== "captain" && (
                      <button
                        onClick={() => handleKickMember(member.id, member.playerName ?? member.userId)}
                        disabled={kickingId === member.id}
                        title="Remove from team"
                        className="p-1.5 bg-[#ff2244]/10 border border-[#ff2244]/20 rounded-lg text-[#ff2244] hover:bg-[#ff2244]/20 transition-colors disabled:opacity-50"
                      >
                        <UserMinus className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
                {activeMembers.length === 0 && (
                  <p className="text-[#a0a0b0] text-sm text-center py-4">No active members yet.</p>
                )}
              </div>
            </div>

            {/* Join Requests (captain only) */}
            {isCaptain && (joinRequests as any[]).length > 0 && (
              <div className="bg-[#12121a] rounded-2xl border border-yellow-400/20 p-6">
                <h3 className="font-black uppercase text-sm text-yellow-400 mb-4 tracking-wider">
                  Pending Join Requests ({(joinRequests as any[]).length})
                </h3>
                <div className="space-y-3">
                  {(joinRequests as any[]).map((req: any) => (
                    <div key={req.id} className="flex items-center gap-3 py-2 border-b border-yellow-400/5 last:border-0" data-testid={`row-join-request-${req.id}`}>
                      <div className="flex-1">
                        <div className="font-bold text-white text-sm">{req.playerName ?? req.userId}</div>
                        {req.freefireUid && <div className="text-[#a0a0b0] text-xs font-mono">{req.freefireUid}</div>}
                      </div>
                      <button
                        onClick={() => handleApprove(team.id, req.id)}
                        disabled={approveTeamMember.isPending}
                        data-testid={`button-approve-member-${req.id}`}
                        className="p-2 bg-[#00ff88]/10 border border-[#00ff88]/30 rounded-lg text-[#00ff88] hover:bg-[#00ff88]/20 transition-colors"
                        title="Approve"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleReject(team.id, req.id)}
                        disabled={rejectingId === req.id}
                        data-testid={`button-reject-member-${req.id}`}
                        className="p-2 bg-[#ff2244]/10 border border-[#ff2244]/30 rounded-lg text-[#ff2244] hover:bg-[#ff2244]/20 transition-colors"
                        title="Reject"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
