import { Trophy, Star } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useListTournaments, useGetTournament, getGetTournamentQueryKey } from "@workspace/api-client-react";
import { useState } from "react";

const prizeColors = [
  "from-[#ffd700]/20 to-[#ffd700]/5 border-[#ffd700]/40 text-[#ffd700]",
  "from-gray-300/20 to-gray-300/5 border-gray-300/40 text-gray-300",
  "from-amber-600/20 to-amber-600/5 border-amber-600/40 text-amber-600",
];

export default function PrizesPage() {
  const { data: tournamentsRaw } = useListTournaments({ status: "upcoming" });
  const tournaments: any[] = (tournamentsRaw as any)?.tournaments ?? [];
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const tournamentId = selectedId ?? (tournaments[0]?.id ?? null);

  const { data: tournament, isLoading } = useGetTournament(tournamentId ?? 0, {
    query: { enabled: !!tournamentId, queryKey: getGetTournamentQueryKey(tournamentId ?? 0) },
  });

  const t = tournament as any;

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <Navbar />
      <div className="max-w-4xl mx-auto px-3 pt-16 pb-16">
        <h1 className="text-2xl sm:text-4xl font-black uppercase mb-1.5" data-testid="heading-prizes">
          Prize <span className="text-[#ff6b00]">Pool</span>
        </h1>
        <p className="text-[#a0a0b0] mb-5">Win big — claim your share of the prize pool</p>

        {tournaments.length > 0 && (
          <select
            value={tournamentId ?? ""}
            onChange={(e) => setSelectedId(e.target.value ? parseInt(e.target.value) : null)}
            data-testid="select-tournament-prizes"
            className="w-full mb-7 px-3 py-2.5 bg-[#12121a] border border-[#2a2a36] rounded-xl text-white focus:outline-none focus:border-[#ff6b00] transition-colors"
          >
            {tournaments.map((t: any) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        )}

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1,2,3].map((i) => <div key={i} className="h-40 bg-[#12121a] rounded-xl animate-pulse" />)}
          </div>
        ) : !t ? (
          <div className="text-center py-20">
            <Trophy className="w-16 h-16 mx-auto mb-3 text-[#ff6b00]/30" />
            <p className="text-[#a0a0b0]">No tournament data available</p>
          </div>
        ) : (
          <>
            {/* Total prize banner */}
            <div className="relative rounded-2xl overflow-hidden border border-[#ffd700]/30 bg-gradient-to-r from-[#ffd700]/10 to-[#ff6b00]/10 p-5 mb-7 text-center">
              <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1559827260-dc66d52bef19?q=80&w=2070')] bg-cover bg-center opacity-5" />
              <Trophy className="w-12 h-12 mx-auto text-[#ffd700] mb-2.5" />
              <p className="text-[#a0a0b0] uppercase text-sm tracking-wider mb-1">Total Prize Pool</p>
              <p className="text-3xl sm:text-5xl font-black text-[#ffd700] [text-shadow:0_0_30px_rgba(255,215,0,0.4)]" data-testid="text-total-prize">
                ৳{Number(t.prizePool).toLocaleString()}
              </p>
              <p className="text-[#a0a0b0] mt-2.5">{t.name}</p>
            </div>

            {t.prizes && t.prizes.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {t.prizes.map((prize: any, i: number) => (
                  <div
                    key={prize.id}
                    className={`rounded-2xl border bg-gradient-to-b p-4 text-center ${prizeColors[i] ?? "from-[#1a1a24] to-[#12121a] border-[#2a2a36] text-white"}`}
                    data-testid={`card-prize-${prize.id}`}
                  >
                    <Trophy className={`w-10 h-10 mx-auto mb-2.5 ${prizeColors[i]?.split(" ")[3] ?? "text-white"}`} />
                    <div className="text-xl font-black mb-1" data-testid={`text-prize-card-rank-${prize.id}`}>{prize.rank}</div>
                    <div className="text-3xl font-black mb-1.5" data-testid={`text-prize-card-amount-${prize.id}`}>
                      ৳{Number(prize.amount).toLocaleString()}
                    </div>
                    {prize.description && (
                      <div className="text-sm opacity-70">{prize.description}</div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-[#a0a0b0]">
                <Star className="w-10 h-10 mx-auto mb-2.5 opacity-30" />
                <p>Prize tiers will be announced soon</p>
              </div>
            )}
          </>
        )}
      </div>
      <Footer />
    </div>
  );
}
