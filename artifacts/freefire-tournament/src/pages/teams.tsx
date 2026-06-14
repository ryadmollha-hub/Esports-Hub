import { useState } from "react";
import { Search, Users, Shield, Plus, Crown } from "lucide-react";
import { Link } from "wouter";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useListTeams, useRequestJoinTeam, getListTeamsQueryKey } from "@workspace/api-client-react";
import { useAuth } from "@/lib/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export default function TeamsPage() {
  const [search, setSearch] = useState("");
  const { isSignedIn } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();

  const params = search ? { search } : {};
  const { data: teams = [], isLoading } = useListTeams(params, {
    query: { queryKey: getListTeamsQueryKey(params) },
  });

  const joinTeam = useRequestJoinTeam();

  const handleJoin = (teamId: number) => {
    if (!isSignedIn) { toast({ title: "Sign in required", description: "Please sign in to join a team.", variant: "destructive" }); return; }
    joinTeam.mutate(
      { id: teamId, data: {} },
      {
        onSuccess: () => {
          toast({ title: "Join request sent!", description: "Wait for the captain to approve your request." });
          qc.invalidateQueries({ queryKey: getListTeamsQueryKey() });
        },
        onError: (err: any) => {
          toast({ title: "Error", description: err?.response?.data?.error ?? "Could not send request.", variant: "destructive" });
        },
      }
    );
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 pt-24 pb-16">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-4xl font-black uppercase" data-testid="heading-teams">
              All <span className="text-[#ff6b00]">Teams</span>
            </h1>
            <p className="text-[#a0a0b0] mt-1">Find a team or create your own squad</p>
          </div>
          {isSignedIn && (
            <Link
              href="/teams/my"
              data-testid="link-my-team"
              className="px-5 py-2.5 bg-[#ff6b00] text-white font-bold uppercase text-sm rounded-xl hover:bg-[#e66000] transition-all shadow-[0_0_15px_rgba(255,107,0,0.3)] flex items-center gap-2"
            >
              <Shield className="w-4 h-4" /> My Team
            </Link>
          )}
        </div>

        <div className="relative mb-8">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#a0a0b0]" />
          <input
            type="text"
            placeholder="Search teams..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            data-testid="input-search-teams"
            className="w-full max-w-md pl-10 pr-4 py-3 bg-[#12121a] border border-[#2a2a36] rounded-xl text-white placeholder-[#a0a0b0] focus:outline-none focus:border-[#ff6b00] transition-colors"
          />
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1,2,3,4,5,6].map((i) => <div key={i} className="h-40 bg-[#12121a] rounded-xl animate-pulse" />)}
          </div>
        ) : (teams as any[]).length === 0 ? (
          <div className="text-center py-20">
            <Users className="w-16 h-16 mx-auto mb-4 text-[#ff6b00]/30" />
            <h3 className="text-xl font-bold mb-2">No teams found</h3>
            <p className="text-[#a0a0b0] mb-6">Be the first to create a team!</p>
            {isSignedIn && (
              <Link href="/teams/my" data-testid="link-create-team" className="inline-flex items-center gap-2 px-6 py-3 bg-[#ff6b00] text-white font-bold uppercase rounded-xl hover:bg-[#e66000] transition-all">
                <Plus className="w-4 h-4" /> Create Team
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {(teams as any[]).map((team: any) => (
              <div key={team.id} className="bg-[#12121a] rounded-xl border border-[#ff6b00]/20 hover:border-[#ff6b00]/40 transition-all p-5" data-testid={`card-team-${team.id}`}>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-[#ff6b00]/10 border border-[#ff6b00]/30 flex items-center justify-center">
                      {team.logoUrl ? (
                        <img src={team.logoUrl} alt={team.name} className="w-full h-full object-cover rounded-xl" />
                      ) : (
                        <Shield className="w-6 h-6 text-[#ff6b00]" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-black text-white" data-testid={`text-team-name-${team.id}`}>{team.name}</h3>
                      {team.tag && <span className="text-[#a0a0b0] text-xs">[{team.tag}]</span>}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="bg-[#1a1a24] rounded-lg p-2.5 text-center">
                    <div className="text-[#ff6b00] font-black">{team.totalKills ?? 0}</div>
                    <div className="text-[#a0a0b0] text-xs">Kills</div>
                  </div>
                  <div className="bg-[#1a1a24] rounded-lg p-2.5 text-center">
                    <div className="text-[#ffd700] font-black">{team.totalWins ?? 0}</div>
                    <div className="text-[#a0a0b0] text-xs">Wins</div>
                  </div>
                </div>

                {isSignedIn && (
                  <button
                    onClick={() => handleJoin(team.id)}
                    disabled={joinTeam.isPending}
                    data-testid={`button-join-team-${team.id}`}
                    className="w-full py-2 text-sm font-bold uppercase bg-[#ff6b00]/10 border border-[#ff6b00]/30 text-[#ff6b00] rounded-lg hover:bg-[#ff6b00]/20 transition-colors disabled:opacity-50"
                  >
                    Request to Join
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
