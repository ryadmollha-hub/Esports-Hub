import { useState } from "react";
import { Calendar, Clock, Map, ChevronDown, ChevronUp, Trophy, Target, Star } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useGetMatchSchedule, getGetMatchScheduleQueryKey } from "@workspace/api-client-react";

const statusConfig: Record<string, { label: string; color: string; dot: string }> = {
  scheduled: { label: "Scheduled", color: "text-yellow-400 border-yellow-400/30 bg-yellow-400/10", dot: "bg-yellow-400" },
  live:       { label: "🔴 LIVE",  color: "text-green-400 border-green-400/30 bg-green-400/10",    dot: "bg-green-400 animate-pulse" },
  completed:  { label: "Completed", color: "text-gray-400 border-gray-400/30 bg-gray-400/10",      dot: "bg-gray-400" },
};

const rankEmoji = (rank: number) => rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : null;

export default function SchedulePage() {
  const { data: matches = [], isLoading, refetch } = useGetMatchSchedule({
    query: { queryKey: getGetMatchScheduleQueryKey(), refetchInterval: 15000 },
  });

  const [expanded, setExpanded] = useState<Record<number, boolean>>({});

  const upcoming = (matches as any[]).filter((m) => m.status === "scheduled" || m.status === "live");
  const past = (matches as any[]).filter((m) => m.status === "completed");

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 pt-24 pb-20">
        <div className="mb-8">
          <h1 className="text-4xl font-black uppercase mb-1" data-testid="heading-schedule">
            Match <span className="text-[#ff6b00]">Schedule</span>
          </h1>
          <p className="text-[#a0a0b0] text-sm">Upcoming and completed matches with full results</p>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1,2,3].map((i) => <div key={i} className="h-20 bg-[#12121a] rounded-xl animate-pulse" />)}
          </div>
        ) : (matches as any[]).length === 0 ? (
          <div className="text-center py-20">
            <Calendar className="w-16 h-16 mx-auto mb-4 text-[#ff6b00]/20" />
            <h3 className="text-xl font-black mb-2">No Matches Yet</h3>
            <p className="text-[#a0a0b0] text-sm">Matches will appear here once tournaments begin</p>
          </div>
        ) : (
          <div className="space-y-10">
            {upcoming.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-2 h-2 bg-[#ff6b00] rounded-full animate-pulse" />
                  <h2 className="text-sm font-black uppercase tracking-widest text-[#ff6b00]">Upcoming & Live</h2>
                </div>
                <div className="space-y-3">
                  {upcoming.map((match: any) => (
                    <MatchRow key={match.id} match={match} expanded={expanded[match.id]} onToggle={() => setExpanded((p) => ({ ...p, [match.id]: !p[match.id] }))} />
                  ))}
                </div>
              </div>
            )}
            {past.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-2 h-2 bg-[#a0a0b0] rounded-full" />
                  <h2 className="text-sm font-black uppercase tracking-widest text-[#a0a0b0]">Completed</h2>
                </div>
                <div className="space-y-3">
                  {past.map((match: any) => (
                    <MatchRow key={match.id} match={match} expanded={expanded[match.id]} onToggle={() => setExpanded((p) => ({ ...p, [match.id]: !p[match.id] }))} />
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

function MatchRow({ match, expanded, onToggle }: { match: any; expanded: boolean; onToggle: () => void }) {
  const sc = statusConfig[match.status] ?? statusConfig.scheduled;
  const hasResults = match.results && match.results.length > 0;

  return (
    <div className="bg-[#12121a] rounded-xl border border-[#ff6b00]/10 hover:border-[#ff6b00]/25 transition-colors overflow-hidden" data-testid={`row-match-${match.id}`}>
      <div className="p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className={`text-[10px] font-black px-2 py-0.5 rounded border flex items-center gap-1.5 uppercase ${sc.color}`}>
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${sc.dot}`} />
              {sc.label}
            </span>
            <span className="text-[#606070] text-xs font-bold uppercase">Match #{match.matchNumber}</span>
          </div>
          <div className="font-black text-white text-base" data-testid={`text-match-tournament-${match.id}`}>
            {match.tournament?.name ?? "Unknown Tournament"}
          </div>
          {match.mapName && (
            <div className="flex items-center gap-1 text-[#a0a0b0] text-xs mt-1">
              <Map className="w-3 h-3" /> {match.mapName}
            </div>
          )}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right">
            <div className="flex items-center gap-1 text-[#a0a0b0] text-sm justify-end" data-testid={`text-match-time-${match.id}`}>
              <Clock className="w-3.5 h-3.5" />
              {new Date(match.scheduledAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </div>
            <div className="text-[#606070] text-xs">
              {new Date(match.scheduledAt).toLocaleDateString("en-BD", { day: "numeric", month: "short", year: "numeric" })}
            </div>
          </div>
          {hasResults && (
            <button
              onClick={onToggle}
              className="flex items-center gap-1 px-3 py-1.5 bg-[#ff6b00]/10 border border-[#ff6b00]/20 rounded-lg text-[#ff6b00] text-xs font-bold hover:bg-[#ff6b00]/20 transition-colors"
            >
              Results {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>
      </div>

      {/* Results expansion */}
      {hasResults && expanded && (
        <div className="border-t border-[#ff6b00]/10 bg-[#0d0d16] p-4">
          <div className="flex items-center gap-2 mb-3">
            <Trophy className="w-4 h-4 text-[#ffd700]" />
            <span className="text-white font-black text-sm uppercase tracking-wide">Final Results</span>
          </div>

          {/* Top 3 Podium */}
          <div className="space-y-2 mb-3">
            {match.results.slice(0, 3).map((r: any) => {
              const emoji = rankEmoji(r.rank);
              const podiumColors = [
                "from-[#ffd700]/10 to-transparent border-[#ffd700]/30 text-[#ffd700]",
                "from-gray-400/10 to-transparent border-gray-400/20 text-gray-300",
                "from-amber-600/10 to-transparent border-amber-600/20 text-amber-500",
              ];
              const colClass = podiumColors[r.rank - 1] ?? "from-[#1a1a24] to-transparent border-[#2a2a36] text-[#a0a0b0]";
              return (
                <div key={r.id ?? r.rank} className={`bg-gradient-to-r ${colClass} border rounded-xl p-3 flex items-center gap-3`}>
                  <span className="text-2xl shrink-0">{emoji ?? `#${r.rank}`}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-black text-white truncate">{r.playerName}</div>
                  </div>
                  <div className="flex gap-3 shrink-0 text-xs">
                    <div className="text-center">
                      <div className="flex items-center gap-1 text-[#ff6b00] font-black">
                        <Target className="w-3 h-3" /> {r.kills}
                      </div>
                      <div className="text-[#606070]">Kills</div>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center gap-1 text-[#00ff88] font-black">
                        <Star className="w-3 h-3" /> {r.points}
                      </div>
                      <div className="text-[#606070]">Points</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Remaining players */}
          {match.results.length > 3 && (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-[#606070] uppercase border-b border-[#2a2a36]">
                    <th className="text-left py-1.5 pr-2">#</th>
                    <th className="text-left py-1.5 pr-2">Player</th>
                    <th className="text-right py-1.5 pr-2">Kills</th>
                    <th className="text-right py-1.5">Points</th>
                  </tr>
                </thead>
                <tbody>
                  {match.results.slice(3).map((r: any) => (
                    <tr key={r.id ?? r.rank} className="border-b border-[#1a1a24] last:border-0 hover:bg-[#ff6b00]/3">
                      <td className="py-1.5 pr-2 text-[#a0a0b0] font-bold">#{r.rank}</td>
                      <td className="py-1.5 pr-2 text-white font-medium">{r.playerName}</td>
                      <td className="py-1.5 pr-2 text-right text-[#ff6b00] font-bold">{r.kills}</td>
                      <td className="py-1.5 text-right text-white font-bold">{r.points}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
