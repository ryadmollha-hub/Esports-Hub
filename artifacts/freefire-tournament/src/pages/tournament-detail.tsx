import { useRoute, Link } from "wouter";
import { Trophy, Users, Clock, Calendar, Shield, ChevronLeft, Flame } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CountdownTimer from "@/components/CountdownTimer";
import { useGetTournament, getGetTournamentQueryKey } from "@workspace/api-client-react";
import { useAuth } from "@/lib/AuthContext";

const modeColors: Record<string, string> = {
  solo: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  duo: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  squad: "bg-[#ff6b00]/20 text-[#ff6b00] border-[#ff6b00]/30",
};

const statusColors: Record<string, string> = {
  upcoming: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  ongoing: "bg-green-500/20 text-green-400 border-green-500/30",
  completed: "bg-gray-500/20 text-gray-400 border-gray-500/30",
  cancelled: "bg-red-500/20 text-red-400 border-red-500/30",
};

const rankTrophyColors = ["text-[#ffd700]", "text-gray-300", "text-amber-600"];

export default function TournamentDetailPage() {
  const [, params] = useRoute("/tournaments/:id");
  const id = parseInt(params?.id ?? "0");
  const { isSignedIn } = useAuth();

  const { data: tournament, isLoading } = useGetTournament(id, {
    query: { enabled: !!id, queryKey: getGetTournamentQueryKey(id) },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f]">
        <Navbar />
        <div className="max-w-5xl mx-auto px-4 pt-24">
          <div className="h-64 bg-[#12121a] rounded-xl animate-pulse mb-6" />
          <div className="h-8 bg-[#12121a] rounded animate-pulse w-1/2 mb-4" />
          <div className="h-4 bg-[#12121a] rounded animate-pulse w-3/4" />
        </div>
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <Navbar />
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-2">Tournament Not Found</h2>
          <Link href="/tournaments" className="text-[#ff6b00]">Back to Tournaments</Link>
        </div>
      </div>
    );
  }

  const t = tournament as any;
  const slotPct = Math.min((t.filledSlots / t.maxSlots) * 100, 100);

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 pt-24 pb-16">
        <Link href="/tournaments" data-testid="link-back-tournaments" className="inline-flex items-center gap-2 text-[#a0a0b0] hover:text-white mb-6 transition-colors">
          <ChevronLeft className="w-4 h-4" /> Back to Tournaments
        </Link>

        {/* Banner */}
        <div className="relative h-64 md:h-80 rounded-2xl overflow-hidden mb-8 bg-gradient-to-br from-[#1a1a24] to-[#0a0a0f]">
          {t.bannerUrl ? (
            <img src={t.bannerUrl} alt={t.name} className="w-full h-full object-cover opacity-60" data-testid="img-tournament-detail-banner" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Flame className="w-24 h-24 text-[#ff6b00]/20" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f] via-[#0a0a0f]/30 to-transparent" />
          <div className="absolute bottom-6 left-6 right-6">
            <div className="flex flex-wrap gap-2 mb-3">
              <span className={`text-xs font-bold px-3 py-1 rounded-full border uppercase ${modeColors[t.mode]}`}>{t.mode}</span>
              <span className={`text-xs font-bold px-3 py-1 rounded-full border uppercase ${statusColors[t.status]}`}>{t.status}</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-black" data-testid="text-tournament-detail-name">{t.name}</h1>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <div className="md:col-span-2 space-y-6">
            {t.description && (
              <div className="bg-[#12121a] rounded-xl border border-[#ff6b00]/20 p-6">
                <h3 className="text-white font-bold uppercase text-sm mb-3 tracking-wider">About</h3>
                <p className="text-[#a0a0b0] leading-relaxed" data-testid="text-tournament-description">{t.description}</p>
              </div>
            )}

            {/* Countdown */}
            {t.status === "upcoming" && t.countdownTo && (
              <div className="bg-[#12121a] rounded-xl border border-[#ff6b00]/20 p-6">
                <h3 className="text-white font-bold uppercase text-sm mb-4 tracking-wider">Starts In</h3>
                <CountdownTimer targetDate={t.countdownTo} className="text-3xl gap-4" />
              </div>
            )}

            {/* Prizes */}
            {t.prizes && t.prizes.length > 0 && (
              <div className="bg-[#12121a] rounded-xl border border-[#ff6b00]/20 p-6">
                <h3 className="text-white font-bold uppercase text-sm mb-4 tracking-wider">Prize Distribution</h3>
                <div className="space-y-3">
                  {t.prizes.map((prize: any, i: number) => (
                    <div key={prize.id} className="flex items-center justify-between py-2 border-b border-[#ff6b00]/10 last:border-0" data-testid={`row-prize-${prize.id}`}>
                      <div className="flex items-center gap-3">
                        <Trophy className={`w-5 h-5 ${rankTrophyColors[i] ?? "text-[#a0a0b0]"}`} />
                        <div>
                          <div className="font-bold text-white" data-testid={`text-prize-rank-${prize.id}`}>{prize.rank}</div>
                          {prize.description && <div className="text-[#a0a0b0] text-xs">{prize.description}</div>}
                        </div>
                      </div>
                      <div className={`font-black text-lg ${rankTrophyColors[i] ?? "text-white"}`} data-testid={`text-prize-amount-${prize.id}`}>
                        ৳{Number(prize.amount).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Room Info */}
            {t.status === "ongoing" && t.roomId && (
              <div className="bg-[#ff6b00]/10 rounded-xl border border-[#ff6b00]/40 p-6">
                <h3 className="text-[#ff6b00] font-bold uppercase text-sm mb-4 tracking-wider flex items-center gap-2">
                  <Shield className="w-4 h-4" /> Room Details (Approved Players Only)
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-[#a0a0b0] text-xs uppercase mb-1">Room ID</div>
                    <div className="text-white font-mono font-bold text-lg" data-testid="text-room-id">{t.roomId}</div>
                  </div>
                  {t.roomPassword && (
                    <div>
                      <div className="text-[#a0a0b0] text-xs uppercase mb-1">Password</div>
                      <div className="text-white font-mono font-bold text-lg" data-testid="text-room-password">{t.roomPassword}</div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <div className="bg-[#12121a] rounded-xl border border-[#ff6b00]/20 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[#a0a0b0] text-sm">Prize Pool</span>
                <span className="text-[#ffd700] font-black text-xl" data-testid="text-detail-prize">৳{Number(t.prizePool).toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#a0a0b0] text-sm">Entry Fee</span>
                <span className="text-white font-bold" data-testid="text-detail-fee">৳{Number(t.entryFee)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#a0a0b0] text-sm">Mode</span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded border uppercase ${modeColors[t.mode]}`}>{t.mode}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#a0a0b0] text-sm">Start Date</span>
                <span className="text-white text-sm" data-testid="text-detail-start">{new Date(t.startDate).toLocaleDateString()}</span>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-[#a0a0b0] flex items-center gap-1"><Users className="w-3 h-3" /> Slots</span>
                  <span className="text-white">{t.filledSlots}/{t.maxSlots}</span>
                </div>
                <div className="h-2 bg-[#1a1a24] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#ff6b00] to-[#ffd700] rounded-full"
                    style={{ width: `${slotPct}%` }}
                  />
                </div>
              </div>

              {t.status === "upcoming" && (
                isSignedIn ? (
                  <Link
                    href={`/register?tournament=${t.id}`}
                    data-testid="button-register-tournament"
                    className="block w-full text-center px-6 py-3 bg-[#ff6b00] text-white font-black uppercase rounded-xl hover:bg-[#e66000] transition-all shadow-[0_0_20px_rgba(255,107,0,0.3)]"
                  >
                    Register Now
                  </Link>
                ) : (
                  <Link
                    href="/sign-in"
                    data-testid="button-signin-to-register"
                    className="block w-full text-center px-6 py-3 bg-[#ff6b00]/20 border border-[#ff6b00]/40 text-[#ff6b00] font-black uppercase rounded-xl hover:bg-[#ff6b00]/30 transition-all"
                  >
                    Sign In to Register
                  </Link>
                )
              )}
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
