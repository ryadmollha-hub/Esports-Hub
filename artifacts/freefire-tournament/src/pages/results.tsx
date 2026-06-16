import { useState } from "react";
import { Trophy, Target } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useListTournaments, useGetTournamentMatches, getGetTournamentMatchesQueryKey } from "@workspace/api-client-react";

const rankColors = ["text-[#ffd700] font-black", "text-gray-300 font-black", "text-amber-600 font-black"];

export default function ResultsPage() {
  const { data: tournaments = [] } = useListTournaments({ status: "completed" });
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const tournamentId = selectedId ?? ((tournaments as any[])[0]?.id ?? null);

  const { data: matches = [], isLoading } = useGetTournamentMatches(
    tournamentId ?? 0,
    { query: { enabled: !!tournamentId, queryKey: getGetTournamentMatchesQueryKey(tournamentId ?? 0) } }
  );

  const completedMatches = (matches as any[]).filter((m) => m.status === "completed");

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 pt-16 pb-16">
        <h1 className="text-4xl font-black uppercase mb-2" data-testid="heading-results">
          Match <span className="text-[#ff6b00]">Results</span>
        </h1>
        <p className="text-[#a0a0b0] mb-8">Final standings for completed matches</p>

        {(tournaments as any[]).length > 0 && (
          <select
            value={tournamentId ?? ""}
            onChange={(e) => setSelectedId(e.target.value ? parseInt(e.target.value) : null)}
            data-testid="select-tournament-results"
            className="mb-8 px-4 py-3 bg-[#12121a] border border-[#2a2a36] rounded-xl text-white focus:outline-none focus:border-[#ff6b00] transition-colors"
          >
            {(tournaments as any[]).map((t: any) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        )}

        {isLoading ? (
          <div className="space-y-4">
            {[1,2].map((i) => <div key={i} className="h-40 bg-[#12121a] rounded-xl animate-pulse" />)}
          </div>
        ) : completedMatches.length === 0 ? (
          <div className="text-center py-20">
            <Trophy className="w-16 h-16 mx-auto mb-4 text-[#ff6b00]/30" />
            <h3 className="text-xl font-bold mb-2">No results yet</h3>
            <p className="text-[#a0a0b0]">Results will appear after matches are completed</p>
          </div>
        ) : (
          <div className="space-y-6">
            {completedMatches.map((match: any) => (
              <div key={match.id} className="bg-[#12121a] rounded-xl border border-[#ff6b00]/20 overflow-hidden" data-testid={`card-match-results-${match.id}`}>
                <div className="flex items-center justify-between px-5 py-4 border-b border-[#ff6b00]/10">
                  <div>
                    <div className="text-white font-black">Match #{match.matchNumber}</div>
                    {match.mapName && <div className="text-[#a0a0b0] text-xs">{match.mapName}</div>}
                  </div>
                  <div className="text-[#a0a0b0] text-sm">{new Date(match.scheduledAt).toLocaleDateString()}</div>
                </div>

                {match.results && match.results.length > 0 ? (
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-[#ff6b00]/5">
                        <th className="text-left text-[#a0a0b0] text-xs py-2.5 px-4">#</th>
                        <th className="text-left text-[#a0a0b0] text-xs py-2.5 px-4">Player</th>
                        <th className="text-right text-[#a0a0b0] text-xs py-2.5 px-4">Kills</th>
                        <th className="text-right text-[#a0a0b0] text-xs py-2.5 px-4">Points</th>
                      </tr>
                    </thead>
                    <tbody>
                      {match.results
                        .sort((a: any, b: any) => a.rank - b.rank)
                        .map((result: any) => (
                          <tr key={result.id} className="border-b border-[#ff6b00]/5 last:border-0 hover:bg-[#ff6b00]/5" data-testid={`row-result-${result.id}`}>
                            <td className={`py-2.5 px-4 ${rankColors[result.rank - 1] ?? "text-[#a0a0b0]"}`}>#{result.rank}</td>
                            <td className="py-2.5 px-4 text-white font-medium" data-testid={`text-result-player-${result.id}`}>{result.playerName}</td>
                            <td className="py-2.5 px-4 text-right text-[#ff6b00] font-bold flex items-center justify-end gap-1">
                              <Target className="w-3 h-3" />{result.kills}
                            </td>
                            <td className="py-2.5 px-4 text-right text-white font-bold">{result.points}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="p-6 text-center text-[#a0a0b0] text-sm">No results posted yet</div>
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
