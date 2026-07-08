import { useState, useEffect, useCallback } from "react";
import { Trophy, X, Clock, Users, Swords, Zap, Star, Medal, RefreshCw } from "lucide-react";
import { apiBase as BASE } from "@/lib/apiBase";
import PlayerIdentity from "@/components/PlayerIdentity";

export interface ModalTournament {
  id: number;
  name: string;
}

interface MatchResult {
  id: number;
  playerName: string;
  rank: number;
  kills: number;
  points: number;
}

interface MatchWithResults {
  id: number;
  matchNumber: number;
  scheduledAt?: string | null;
  mapName?: string | null;
  status: string;
  results: MatchResult[];
}

function rankMedal(rank: number) {
  if (rank === 1) return <span className="text-[#ffd700] text-base">🥇</span>;
  if (rank === 2) return <span className="text-[#c0c0c0] text-base">🥈</span>;
  if (rank === 3) return <span className="text-[#cd7f32] text-base">🥉</span>;
  return <span className="text-[#606070] text-xs font-black">#{rank}</span>;
}

export default function LeaderboardModal({ tournament, onClose }: { tournament: ModalTournament; onClose: () => void }) {
  const [matches, setMatches] = useState<MatchWithResults[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeMatch, setActiveMatch] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${BASE}/api/tournaments/${tournament.id}/matches`);
      if (!res.ok) throw new Error("Failed to load results");
      const data: MatchWithResults[] = await res.json();
      const withResults = data.filter((m) => m.results && m.results.length > 0);
      setMatches(withResults.length > 0 ? withResults : data);
      setActiveMatch(0);
    } catch (e: any) {
      setError(e.message ?? "Could not load leaderboard.");
    } finally {
      setLoading(false);
    }
  }, [tournament.id]);

  useEffect(() => { load(); }, [load]);

  const currentMatch = matches?.[activeMatch];
  const sortedResults = currentMatch ? [...currentMatch.results].sort((a, b) => a.rank - b.rank) : [];

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 bg-black/85 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative w-full max-w-lg bg-[#0e0e17] border border-[#ff6b00]/25 rounded-2xl shadow-[0_0_60px_rgba(255,107,0,0.18)] overflow-hidden max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center gap-2.5 p-3 border-b border-[#1a1a28] bg-gradient-to-r from-[#ffd700]/8 to-transparent shrink-0">
          <div className="w-9 h-9 rounded-xl bg-[#ffd700]/15 border border-[#ffd700]/30 flex items-center justify-center shrink-0">
            <Trophy className="w-4 h-4 text-[#ffd700]" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-white font-black text-sm uppercase tracking-wide line-clamp-1">{tournament.name}</h2>
            <p className="text-[#a0a0b0] text-[10px] uppercase tracking-wider font-bold mt-0.5">🏆 Match Leaderboard</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-[#1a1a28] hover:bg-[#ff2244]/20 border border-[#2a2a36] hover:border-[#ff2244]/40 flex items-center justify-center transition-colors shrink-0"
          >
            <X className="w-3.5 h-3.5 text-[#a0a0b0]" />
          </button>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2.5">
            <div className="w-8 h-8 border-2 border-[#ff6b00] border-t-transparent rounded-full animate-spin" />
            <p className="text-[#606070] text-xs uppercase tracking-wider font-bold">Loading results…</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-8 gap-2.5 px-4">
            <p className="text-[#ff4444] text-sm text-center">{error}</p>
            <button onClick={load} className="flex items-center gap-1 text-xs text-[#ff6b00] font-bold uppercase hover:text-[#ff8533] transition-colors">
              <RefreshCw className="w-3.5 h-3.5" /> Retry
            </button>
          </div>
        ) : (
          <>
            {/* Match Tabs */}
            {matches && matches.length > 1 && (
              <div className="flex gap-1 px-3 pt-2.5 flex-wrap shrink-0">
                {matches.map((m, idx) => (
                  <button
                    key={m.id}
                    onClick={() => setActiveMatch(idx)}
                    className={`px-2.5 py-1 text-[10px] font-black uppercase rounded-lg border transition-colors ${
                      activeMatch === idx
                        ? "bg-[#ff6b00] border-[#ff6b00] text-white"
                        : "bg-[#12121a] border-[#2a2a36] text-[#a0a0b0] hover:border-[#ff6b00]/40"
                    }`}
                  >
                    Match {m.matchNumber}
                  </button>
                ))}
              </div>
            )}

            {/* Match info bar */}
            {currentMatch && (
              <div className="flex items-center gap-2.5 px-3 py-2 shrink-0">
                {currentMatch.mapName && (
                  <div className="flex items-center gap-1 bg-[#1a1a28] rounded-lg px-1.5 py-1 border border-[#2a2a36]">
                    <Swords className="w-3 h-3 text-[#a0a0b0]" />
                    <span className="text-[#a0a0b0] text-[10px] font-bold uppercase">{currentMatch.mapName}</span>
                  </div>
                )}
                {currentMatch.scheduledAt && (
                  <div className="flex items-center gap-1 text-[#606070] text-[10px]">
                    <Clock className="w-3 h-3" />
                    {new Date(currentMatch.scheduledAt).toLocaleString("en-BD", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </div>
                )}
                <div className="ml-auto flex items-center gap-1 text-[#606070] text-[10px]">
                  <Users className="w-3 h-3" />
                  <span>{sortedResults.length} players</span>
                </div>
              </div>
            )}

            {/* Results Table */}
            <div className="overflow-y-auto flex-1 px-3 pb-3">
              {sortedResults.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 gap-1.5">
                  <Medal className="w-8 h-8 text-[#303040]" />
                  <p className="text-[#606070] text-xs uppercase font-bold tracking-wider">No results published yet</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-[2rem_1fr_3rem_3rem] gap-1.5 px-2.5 py-1.5 mb-1">
                    <span className="text-[#505060] text-[9px] uppercase font-bold tracking-wider text-center">Rank</span>
                    <span className="text-[#505060] text-[9px] uppercase font-bold tracking-wider">Player</span>
                    <span className="text-[#505060] text-[9px] uppercase font-bold tracking-wider text-center">Kills</span>
                    <span className="text-[#505060] text-[9px] uppercase font-bold tracking-wider text-center">Pts</span>
                  </div>
                  <div className="space-y-1">
                    {sortedResults.map((r) => (
                      <div
                        key={r.id}
                        className={`grid grid-cols-[2rem_1fr_3rem_3rem] gap-1.5 items-center px-2.5 py-2 rounded-xl border transition-colors ${
                          r.rank === 1 ? "bg-gradient-to-r from-[#ffd700]/8 to-transparent border-[#ffd700]/20"
                          : r.rank === 2 ? "bg-gradient-to-r from-[#c0c0c0]/5 to-transparent border-[#c0c0c0]/15"
                          : r.rank === 3 ? "bg-gradient-to-r from-[#cd7f32]/5 to-transparent border-[#cd7f32]/15"
                          : "bg-[#12121a] border-[#1e1e2e]"
                        }`}
                      >
                        <div className="flex items-center justify-center">{rankMedal(r.rank)}</div>
                        <p className={`font-black text-xs truncate ${r.rank <= 3 ? "text-white" : "text-[#c0c0c0]"}`}><PlayerIdentity playerName={r.playerName} /></p>
                        <div className="flex items-center justify-center gap-0.5">
                          <Zap className="w-2.5 h-2.5 text-[#ff6b00]" />
                          <span className="text-[#ff6b00] text-xs font-black">{r.kills}</span>
                        </div>
                        <div className="flex items-center justify-center gap-0.5">
                          <Star className="w-2.5 h-2.5 text-[#a0a0b0]" />
                          <span className="text-[#a0a0b0] text-xs font-bold">{r.points}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
