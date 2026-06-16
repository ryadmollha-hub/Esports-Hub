import { useState } from "react";
import { Trophy, Target, Zap, Crown } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useGetGlobalLeaderboard, useListTournaments, useGetTournamentLeaderboard, getGetGlobalLeaderboardQueryKey, getGetTournamentLeaderboardQueryKey } from "@workspace/api-client-react";

const rankBadge = (rank: number) => {
  if (rank === 1) return "bg-[#ffd700] text-[#0a0a0f]";
  if (rank === 2) return "bg-gray-300 text-[#0a0a0f]";
  if (rank === 3) return "bg-amber-600 text-white";
  return "bg-[#1a1a24] text-[#a0a0b0]";
};

export default function LeaderboardPage() {
  const [tournamentId, setTournamentId] = useState<number | null>(null);
  const { data: tournaments = [] } = useListTournaments({});

  const { data: globalLb = [], isLoading: loadingGlobal } = useGetGlobalLeaderboard({
    query: { enabled: !tournamentId, queryKey: getGetGlobalLeaderboardQueryKey(), refetchInterval: 20000 },
  });

  const { data: tournamentLb = [], isLoading: loadingTournament } = useGetTournamentLeaderboard(
    tournamentId ?? 0,
    { query: { enabled: !!tournamentId, queryKey: getGetTournamentLeaderboardQueryKey(tournamentId ?? 0), refetchInterval: 20000 } }
  );

  const entries = (tournamentId ? tournamentLb : globalLb) as any[];
  const isLoading = tournamentId ? loadingTournament : loadingGlobal;

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 pt-16 pb-20">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-5">
          <div>
            <h1 className="text-3xl font-black uppercase" data-testid="heading-leaderboard">
              <span className="text-[#ff6b00]">Leaderboard</span>
            </h1>
            <p className="text-[#a0a0b0] text-sm mt-0.5">Top ranked Free Fire players</p>
          </div>
          <select
            value={tournamentId ?? ""}
            onChange={(e) => setTournamentId(e.target.value ? parseInt(e.target.value) : null)}
            data-testid="select-tournament-filter"
            className="px-4 py-2.5 bg-[#12121a] border border-[#2a2a36] rounded-xl text-white focus:outline-none focus:border-[#ff6b00] transition-colors text-sm"
          >
            <option value="">Global Rankings</option>
            {(tournaments as any[]).map((t: any) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>

        {/* Top 3 Podium */}
        {entries.length >= 3 && (
          <div className="flex items-end justify-center gap-3 mb-6">
            {[1, 0, 2].map((i) => {
              const e = entries[i];
              if (!e) return null;
              const heights = ["h-20", "h-28", "h-16"];
              const colors = ["bg-gray-300/10 border-gray-300/30", "bg-[#ffd700]/10 border-[#ffd700]/30", "bg-amber-600/10 border-amber-600/30"];
              const rankNum = [2, 1, 3];
              return (
                <div key={i} className={`flex-1 max-w-[160px] rounded-t-xl border border-b-0 ${colors[i]} flex flex-col items-center justify-end ${heights[i]} pt-4 pb-3 px-3`} data-testid={`podium-rank-${rankNum[i]}`}>
                  {rankNum[i] === 1 && <Crown className="w-6 h-6 text-[#ffd700] mb-1" />}
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-sm mb-2 ${rankBadge(rankNum[i])}`}>#{rankNum[i]}</div>
                  <div className="text-white font-bold text-xs text-center truncate w-full" data-testid={`text-podium-name-${rankNum[i]}`}>{e.playerName}</div>
                  <div className="text-[#ff6b00] font-black text-sm">{e.points} pts</div>
                </div>
              );
            })}
          </div>
        )}

        <div className="bg-[#12121a] rounded-xl border border-[#ff6b00]/20 overflow-hidden">
          <div className="grid grid-cols-12 text-[#a0a0b0] text-xs uppercase py-2 px-3 border-b border-[#ff6b00]/10">
            <div className="col-span-1">#</div>
            <div className="col-span-5">Player</div>
            <div className="col-span-2 text-right">Kills</div>
            <div className="col-span-2 text-right">Points</div>
            <div className="col-span-2 text-right">Wins</div>
          </div>

          {isLoading ? (
            <div className="p-8 text-center text-[#a0a0b0]">Loading rankings...</div>
          ) : entries.length === 0 ? (
            <div className="p-12 text-center">
              <Trophy className="w-12 h-12 mx-auto mb-3 text-[#ff6b00]/30" />
              <p className="text-[#a0a0b0]">No rankings yet. Matches need to be completed first.</p>
            </div>
          ) : (
            entries.map((entry: any) => (
              <div
                key={entry.rank}
                className={`grid grid-cols-12 items-center py-2 px-3 border-b border-[#ff6b00]/5 hover:bg-[#ff6b00]/5 transition-colors ${entry.rank <= 3 ? "bg-[#ff6b00]/5" : ""}`}
                data-testid={`row-leaderboard-${entry.rank}`}
              >
                <div className="col-span-1">
                  <span className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm ${rankBadge(entry.rank)}`}>
                    {entry.rank}
                  </span>
                </div>
                <div className="col-span-5">
                  <div className="font-bold text-white text-sm" data-testid={`text-lb-player-${entry.rank}`}>{entry.playerName}</div>
                  {entry.teamName && <div className="text-[#a0a0b0] text-xs">{entry.teamName}</div>}
                </div>
                <div className="col-span-2 text-right">
                  <span className="text-[#ff6b00] font-bold flex items-center justify-end gap-1">
                    <Target className="w-3 h-3" />{entry.kills}
                  </span>
                </div>
                <div className="col-span-2 text-right font-bold text-white">{entry.points}</div>
                <div className="col-span-2 text-right font-bold text-[#ffd700]">{entry.wins}</div>
              </div>
            ))
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
}
