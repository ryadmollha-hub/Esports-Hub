import { useEffect, useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useLocation } from "wouter";
import { Shield, Users, Crown, Check, X, Plus } from "lucide-react";
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

const createSchema = z.object({
  name: z.string().min(2, "Team name must be at least 2 characters"),
  tag: z.string().max(6, "Tag max 6 characters").optional(),
  freefireUid: z.string().min(1, "Your Free Fire UID is required"),
  playerName: z.string().min(1, "Your in-game name is required"),
});

type CreateForm = z.infer<typeof createSchema>;

export default function MyTeamPage() {
  const { isSignedIn, isLoaded } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();

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
    defaultValues: { name: "", tag: "", freefireUid: "", playerName: "" },
  });

  const onCreateTeam = (data: CreateForm) => {
    createTeam.mutate(
      { data: { name: data.name, tag: data.tag, freefireUid: data.freefireUid, playerName: data.playerName } },
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

  const handleApprove = (teamId: number, memberId: number) => {
    approveTeamMember.mutate(
      { teamId, memberId },
      {
        onSuccess: () => {
          toast({ title: "Member approved!" });
          qc.invalidateQueries({ queryKey: getGetMyTeamQueryKey() });
          qc.invalidateQueries({ queryKey: getGetTeamJoinRequestsQueryKey(teamId) });
        },
      }
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f]">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 pt-24">
          <div className="h-40 bg-[#12121a] rounded-xl animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 pt-24 pb-28">
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
            <div className="bg-[#12121a] rounded-2xl border border-[#ff6b00]/20 p-6 flex items-center gap-5">
              <div className="w-16 h-16 rounded-2xl bg-[#ff6b00]/10 border border-[#ff6b00]/30 flex items-center justify-center">
                <Shield className="w-8 h-8 text-[#ff6b00]" />
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-black text-white" data-testid="text-my-team-name">{team.name}</h2>
                {team.tag && <span className="text-[#a0a0b0] text-sm">[{team.tag}]</span>}
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

            {/* Members */}
            <div className="bg-[#12121a] rounded-2xl border border-[#ff6b00]/20 p-6">
              <h3 className="font-black uppercase text-sm text-[#a0a0b0] mb-4 tracking-wider flex items-center gap-2">
                <Users className="w-4 h-4" /> Members
              </h3>
              <div className="space-y-3">
                {team.members
                  ?.filter((m: any) => m.status === "active")
                  .map((member: any) => (
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
                    </div>
                  ))}
              </div>
            </div>

            {/* Join Requests */}
            {(joinRequests as any[]).length > 0 && (
              <div className="bg-[#12121a] rounded-2xl border border-yellow-400/20 p-6">
                <h3 className="font-black uppercase text-sm text-yellow-400 mb-4 tracking-wider">
                  Pending Join Requests ({(joinRequests as any[]).length})
                </h3>
                <div className="space-y-3">
                  {(joinRequests as any[]).map((req: any) => (
                    <div key={req.id} className="flex items-center gap-3 py-2" data-testid={`row-join-request-${req.id}`}>
                      <div className="flex-1">
                        <div className="font-bold text-white text-sm">{req.playerName ?? req.userId}</div>
                        {req.freefireUid && <div className="text-[#a0a0b0] text-xs font-mono">{req.freefireUid}</div>}
                      </div>
                      <button
                        onClick={() => handleApprove(team.id, req.id)}
                        disabled={approveTeamMember.isPending}
                        data-testid={`button-approve-member-${req.id}`}
                        className="p-2 bg-[#00ff88]/10 border border-[#00ff88]/30 rounded-lg text-[#00ff88] hover:bg-[#00ff88]/20 transition-colors"
                      >
                        <Check className="w-4 h-4" />
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
