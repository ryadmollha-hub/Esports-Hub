import React, { useEffect, useState, useCallback } from "react";
import { useLocation, Link } from "wouter";
import {
  Trophy, Clock, CheckCircle, XCircle,
  Key, EyeOff, Eye, BarChart2, Swords, Copy
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useGetMyRegistrations } from "@workspace/api-client-react";
import { useAuthContext } from "@/lib/AuthContext";
import { apiBase as BASE } from "@/lib/apiBase";

const statusColors: Record<string, string> = {
  approved: "text-[#00ff88] bg-[#00ff88]/10 border-[#00ff88]/30",
  rejected: "text-[#ff2244] bg-[#ff2244]/10 border-[#ff2244]/30",
  pending: "text-yellow-400 bg-yellow-400/10 border-yellow-400/30",
};

const statusIcon: Record<string, React.ReactElement> = {
  approved: <CheckCircle className="w-3.5 h-3.5" />,
  rejected: <XCircle className="w-3.5 h-3.5" />,
  pending: <Clock className="w-3.5 h-3.5" />,
};

export default function DashboardPage() {
  const { user: authUser, isLoading } = useAuthContext();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && !authUser) setLocation("/sign-in");
  }, [isLoading, authUser]);

  const { data: registrations = [], isLoading: loadingRegs } = useGetMyRegistrations();
  const regs = registrations as any[];

  const [matchesByTournament, setMatchesByTournament] = useState<Record<number, any[]>>({});
  const [roomPassVisible, setRoomPassVisible] = useState<Record<string, boolean>>({});

  const fetchMatchesForTournament = useCallback(async (tournamentId: number) => {
    try {
      const res = await fetch(`${BASE}/api/tournaments/${tournamentId}/matches`);
      if (res.ok) {
        const data = await res.json();
        setMatchesByTournament((prev) => ({ ...prev, [tournamentId]: data }));
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (regs.length > 0) {
      regs
        .filter((r: any) => r.status === "approved")
        .forEach((r: any) => {
          if (!matchesByTournament[r.tournamentId]) {
            fetchMatchesForTournament(r.tournamentId);
          }
        });
    }
  }, [regs]);

  const txStatusBadge = (status: string) => (
    <span className={`inline-flex items-center gap-1 text-xs font-bold px-1.5 py-0.5 rounded border uppercase ${statusColors[status] ?? statusColors.pending}`}>
      {statusIcon[status]} {status}
    </span>
  );

  if (isLoading) return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
      <div className="text-[#a0a0b0] animate-pulse">Loading...</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white pb-24">
      <Navbar />
      <div className="max-w-5xl mx-auto px-3 pt-16 pb-4">

        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-black uppercase">My <span className="text-[#ff6b00]">Tournaments</span></h2>
          <Link href="/tournaments" className="text-[#ff6b00] text-sm font-bold hover:underline">Browse More →</Link>
        </div>

        {loadingRegs ? (
          <div className="space-y-3">{[1, 2].map((i) => <div key={i} className="h-32 bg-[#12121a] rounded-xl animate-pulse" />)}</div>
        ) : regs.length === 0 ? (
          <div className="bg-[#12121a] rounded-xl border border-[#ff6b00]/10 p-7 text-center">
            <Trophy className="w-10 h-10 mx-auto mb-2.5 text-[#ff6b00]/30" />
            <p className="text-[#a0a0b0] mb-3">No tournament registrations yet</p>
            <Link href="/tournaments" className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#ff6b00] text-white font-bold uppercase text-sm rounded-xl hover:bg-[#e66000] transition-all">Browse Tournaments</Link>
          </div>
        ) : (
          <div className="space-y-3">
            {regs.map((reg: any) => {
              const tId = reg.tournamentId;
              const tMatches: any[] = matchesByTournament[tId] ?? [];
              const tName = reg.tournament?.name ?? `Tournament #${tId}`;
              const tPrize = reg.tournament?.prizePool;
              const visibleMatches = tMatches.filter((m: any) => m.roomVisible);

              return (
                <div key={reg.id} className="bg-[#12121a] rounded-xl border border-[#ff6b00]/10 hover:border-[#ff6b00]/25 transition-colors overflow-hidden">
                  {/* Header */}
                  <div className="p-3 flex items-start gap-2.5">
                    <div className="w-9 h-9 rounded-lg bg-[#ff6b00]/15 border border-[#ff6b00]/20 flex items-center justify-center shrink-0 mt-0.5">
                      <Trophy className="w-4.5 h-4.5 text-[#ff6b00]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <Link href={`/tournaments/${tId}`} className="font-black text-white hover:text-[#ff6b00] transition-colors truncate block text-sm">
                        {tName}
                      </Link>
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        <span className="text-[#a0a0b0] text-[10px] font-mono">UID: {reg.freefireUid}</span>
                        {tMatches.length > 0 && tMatches.map((m: any) => (
                          <span key={m.id} className="text-[10px] font-black px-1 py-0.5 rounded border bg-[#ff6b00]/10 text-[#ff6b00] border-[#ff6b00]/20">
                            Match #{m.matchNumber}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="shrink-0">{txStatusBadge(reg.status)}</div>
                  </div>

                  {/* Match Action Links — only for approved registrations */}
                  {reg.status === "approved" && (
                    <div className="border-t border-[#ff6b00]/8 px-3 pb-3">
                      {/* Room Credentials */}
                      {visibleMatches.length > 0 ? visibleMatches.map((m: any) => (
                        <div key={m.id} className="mt-2.5 bg-[#0a0a14] rounded-xl border border-[#00ff88]/20 p-2.5">
                          <div className="flex items-center gap-1 mb-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#00ff88] animate-pulse" />
                            <span className="text-[#00ff88] text-[10px] font-black uppercase tracking-wider">Match #{m.matchNumber} — Room Open</span>
                          </div>
                          <div className="grid grid-cols-2 gap-1.5">
                            <div className="bg-[#12121a] rounded-lg p-1.5">
                              <div className="text-[#606070] text-[9px] uppercase mb-0.5 flex items-center gap-1"><Key className="w-2.5 h-2.5" /> Room ID</div>
                              <div className="flex items-center gap-1">
                                <span className="text-white font-mono font-bold text-xs">{m.roomId}</span>
                                <button onClick={() => navigator.clipboard.writeText(m.roomId)} className="text-[#606070] hover:text-[#ff6b00] transition-colors shrink-0">
                                  <Copy className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                            <div className="bg-[#12121a] rounded-lg p-1.5">
                              <div className="text-[#606070] text-[9px] uppercase mb-0.5 flex items-center justify-between">
                                <span className="flex items-center gap-1"><Key className="w-2.5 h-2.5" /> Password</span>
                                <button onClick={() => setRoomPassVisible(prev => ({ ...prev, [m.id]: !prev[m.id] }))} className="text-[#606070] hover:text-[#ff6b00] transition-colors">
                                  {roomPassVisible[m.id] ? <EyeOff className="w-2.5 h-2.5" /> : <Eye className="w-2.5 h-2.5" />}
                                </button>
                              </div>
                              <div className="flex items-center gap-1">
                                <span className="text-white font-mono font-bold text-xs">
                                  {roomPassVisible[m.id] ? m.roomPassword : "••••••"}
                                </span>
                                {roomPassVisible[m.id] && (
                                  <button onClick={() => navigator.clipboard.writeText(m.roomPassword)} className="text-[#606070] hover:text-[#ff6b00] transition-colors shrink-0">
                                    <Copy className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      )) : (
                        <div className="mt-2.5 bg-[#0a0a14] rounded-xl border border-[#2a2a36] p-2.5 text-center">
                          <Key className="w-4 h-4 text-[#404050] mx-auto mb-1" />
                          <p className="text-[#606070] text-[10px]">Room credentials will appear here when released</p>
                        </div>
                      )}

                      {/* Quick action links */}
                      <div className="grid grid-cols-3 gap-1.5 mt-2.5">
                        <Link
                          href={`/tournaments/${tId}`}
                          className="flex flex-col items-center gap-1 p-2 bg-[#1a1a24] hover:bg-[#ff6b00]/10 border border-[#2a2a36] hover:border-[#ff6b00]/30 rounded-xl transition-all group"
                        >
                          <BarChart2 className="w-4 h-4 text-[#a0a0b0] group-hover:text-[#ff6b00] transition-colors" />
                          <span className="text-[9px] text-[#a0a0b0] group-hover:text-white font-bold uppercase">Leaderboard</span>
                        </Link>
                        <Link
                          href={`/tournaments/${tId}`}
                          className="flex flex-col items-center gap-1 p-2 bg-[#1a1a24] hover:bg-[#ffd700]/10 border border-[#2a2a36] hover:border-[#ffd700]/30 rounded-xl transition-all group"
                        >
                          <Trophy className="w-4 h-4 text-[#a0a0b0] group-hover:text-[#ffd700] transition-colors" />
                          <span className="text-[9px] text-[#a0a0b0] group-hover:text-white font-bold uppercase">
                            {tPrize ? `৳${Number(tPrize).toLocaleString()}` : "Prize Pool"}
                          </span>
                        </Link>
                        <Link
                          href={`/tournaments/${tId}`}
                          className="flex flex-col items-center gap-1 p-2 bg-[#1a1a24] hover:bg-[#00ff88]/10 border border-[#2a2a36] hover:border-[#00ff88]/30 rounded-xl transition-all group"
                        >
                          <Swords className="w-4 h-4 text-[#a0a0b0] group-hover:text-[#00ff88] transition-colors" />
                          <span className="text-[9px] text-[#a0a0b0] group-hover:text-white font-bold uppercase">Match Stats</span>
                        </Link>
                      </div>
                    </div>
                  )}

                  {/* Pending/rejected notice */}
                  {reg.status !== "approved" && (
                    <div className="border-t border-[#2a2a36] px-3 pb-2.5 pt-1.5">
                      <p className="text-[#606070] text-[10px]">
                        {reg.status === "pending" ? "⏳ Registration pending approval — match access will unlock once approved." : "❌ Registration rejected."}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
