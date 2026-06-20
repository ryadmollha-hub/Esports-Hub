import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Trophy, Users, Zap, ChevronRight, Flame, Lock, Swords } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import TournamentCard from "@/components/TournamentCard";
import CountdownTimer from "@/components/CountdownTimer";
import { useGetFeaturedTournaments, useListAnnouncements, useGetGlobalLeaderboard } from "@workspace/api-client-react";
import { apiBase } from "@/lib/apiBase";

const announcementTypeColors: Record<string, string> = {
  info: "border-l-blue-400 bg-blue-400/5",
  warning: "border-l-yellow-400 bg-yellow-400/5",
  success: "border-l-[#00ff88] bg-[#00ff88]/5",
  urgent: "border-l-[#ff2244] bg-[#ff2244]/5",
};

const rankColors = ["text-[#ffd700]", "text-gray-300", "text-amber-600"];


export default function Home() {
  const { data: _featured, isLoading: loadingFeatured } = useGetFeaturedTournaments();
  const { data: _announcements, isLoading: loadingAnn } = useListAnnouncements();
  const { data: _leaderboard, isLoading: loadingLb } = useGetGlobalLeaderboard();
  const featured = Array.isArray(_featured) ? _featured : [];
  const announcements = Array.isArray(_announcements) ? _announcements : [];
  const leaderboard = Array.isArray(_leaderboard) ? _leaderboard : [];

  const [communityMatches, setCommunityMatches] = useState<any[]>([]);
  const [loadingCommunity, setLoadingCommunity] = useState(true);
  useEffect(() => {
    fetch(`${apiBase}/api/user-matches`)
      .then((r) => r.json())
      .then((d) => setCommunityMatches(Array.isArray(d) ? d : []))
      .catch(() => setCommunityMatches([]))
      .finally(() => setLoadingCommunity(false));
  }, []);

  const nextTournament = featured[0];

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <Navbar />

      {/* Hero */}
      <section className="relative min-h-[80dvh] flex flex-col items-center justify-center text-center px-4 overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center opacity-10" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0f]/50 via-transparent to-[#0a0a0f]" />
        <div className="absolute inset-0 bg-gradient-radial from-[#ff6b00]/5 via-transparent to-transparent" />

        <div className="relative z-10 max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#ff6b00]/10 border border-[#ff6b00]/30 rounded-full text-[#ff6b00] text-xs font-bold uppercase tracking-wider mb-4">
            <Flame className="w-3 h-3" />
            Bangladesh Free Fire Esports
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-6xl font-black uppercase leading-none tracking-tight mb-4">
            <span className="text-white">Dominate </span>
            <span className="text-[#ff6b00] [text-shadow:0_0_40px_rgba(255,107,0,0.5)]">Free Fire</span>
            <br />
            <span className="text-white">Tournaments</span>
          </h1>

          <p className="text-base md:text-lg text-[#a0a0b0] mb-6 max-w-2xl mx-auto">
            Compete in elite tournaments, build your squad, and claim real prize pools. Join, register, and prove you are the best.
          </p>

          {nextTournament && (
            <div className="glass-panel rounded-xl p-4 mb-6 max-w-sm mx-auto border border-[#ff6b00]/20 bg-[#12121a]/80 backdrop-blur-md">
              <p className="text-[#a0a0b0] text-xs uppercase tracking-wider mb-1">Next Tournament Starts In</p>
              <CountdownTimer targetDate={nextTournament.countdownTo ?? nextTournament.startDate} className="text-xl justify-center" />
              <p className="text-white font-bold mt-1 truncate text-sm">{nextTournament.name}</p>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/tournaments"
              className="px-6 py-3 bg-[#ff6b00] text-white font-black uppercase text-sm rounded-xl hover:bg-[#e66000] transition-all shadow-[0_0_20px_rgba(255,107,0,0.4)] hover:shadow-[0_0_40px_rgba(255,107,0,0.6)] flex items-center justify-center gap-2"
            >
              <Trophy className="w-4 h-4" /> Find Tournaments
            </Link>
            <Link
              href="/leaderboard"
              className="px-6 py-3 bg-transparent text-white font-black uppercase text-sm rounded-xl border border-[#ff6b00]/40 hover:border-[#ff6b00] hover:bg-[#ff6b00]/10 transition-all flex items-center justify-center gap-2"
            >
              <Zap className="w-4 h-4" /> View Leaderboard
            </Link>
          </div>
        </div>

        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 text-[#a0a0b0]">
          <div className="w-px h-8 bg-gradient-to-b from-transparent to-[#ff6b00]/40" />
          <span className="text-[10px] uppercase tracking-widest">Scroll</span>
        </div>
      </section>

      {/* Featured Tournaments */}
      <section className="max-w-7xl mx-auto px-4 py-10">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl md:text-2xl font-black uppercase">
            Featured <span className="text-[#ff6b00]">Tournaments</span>
          </h2>
          <Link href="/tournaments" className="flex items-center gap-1 text-[#ff6b00] text-xs font-bold hover:gap-2 transition-all">
            View All <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {loadingFeatured ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1,2,3].map((i) => (
              <div key={i} className="h-48 bg-[#12121a] rounded-xl animate-pulse" />
            ))}
          </div>
        ) : featured.length === 0 ? (
          <div className="text-center py-12 text-[#a0a0b0]">
            <Trophy className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p className="text-lg font-bold text-white/30">No Tournaments Yet</p>
            <p className="text-sm mt-1">The admin will post upcoming tournaments soon. Check back later.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {featured.map((t) => <TournamentCard key={t.id} t={t as any} featured />)}
          </div>
        )}
      </section>

      {/* Community Matches */}
      <section className="max-w-7xl mx-auto px-4 pb-10">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl md:text-2xl font-black uppercase">
            Community <span className="text-[#ff6b00]">Matches</span>
          </h2>
          <Link href="/matches" className="flex items-center gap-1 text-[#ff6b00] text-xs font-bold hover:gap-2 transition-all">
            View All <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {loadingCommunity ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-36 bg-[#12121a] rounded-xl animate-pulse" />
            ))}
          </div>
        ) : communityMatches.length === 0 ? (
          <div className="text-center py-12 text-[#a0a0b0] bg-[#12121a] rounded-xl border border-[#ff6b00]/10">
            <Swords className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p className="text-lg font-bold text-white/30">No Community Matches Yet</p>
            <p className="text-sm mt-1">Be the first to host a community match!</p>
            <Link href="/matches" className="inline-block mt-4 px-5 py-2 bg-[#ff6b00] text-white font-bold text-xs rounded-lg hover:bg-[#e66000] transition-colors">
              Host a Match
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {communityMatches.slice(0, 6).map((m: any) => {
              const isFree = !m.entryFee || parseFloat(m.entryFee) === 0;
              const prize = m.prizePool ? parseFloat(m.prizePool) : 0;
              const scheduledAt = m.scheduledAt ? new Date(m.scheduledAt) : null;
              return (
                <Link key={m.id} href="/matches">
                  <div className="bg-[#12121a] border border-[#ff6b00]/10 hover:border-[#ff6b00]/30 rounded-xl p-4 transition-all cursor-pointer group">
                    {/* Header row */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        {m.serialNumber && (
                          <span className="shrink-0 text-[#ff6b00] font-mono text-xs bg-[#ff6b00]/10 border border-[#ff6b00]/20 px-1.5 py-0.5 rounded">
                            {m.serialNumber}
                          </span>
                        )}
                        <span className="text-white font-bold text-sm truncate group-hover:text-[#ff6b00] transition-colors">
                          {m.matchName || m.matchType}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {m.isPrivate && <Lock className="w-3 h-3 text-[#a0a0b0]" />}
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#ff6b00]/10 text-[#ff6b00] uppercase">
                          {m.matchMode ?? m.matchType}
                        </span>
                      </div>
                    </div>

                    {/* Host */}
                    <p className="text-[#a0a0b0] text-xs mb-2">
                      By <span className="text-white font-semibold">{m.creatorName}</span>
                    </p>

                    {/* Stats row */}
                    <div className="flex items-center gap-3 text-xs">
                      <span className={isFree ? "text-[#00ff88] font-bold" : "text-white font-bold"}>
                        {isFree ? "FREE" : `৳${m.entryFee}`}
                      </span>
                      {prize > 0 && (
                        <span className="text-yellow-400 font-bold flex items-center gap-0.5">
                          🏆 ৳{prize.toFixed(0)}
                        </span>
                      )}
                      <span className="text-[#a0a0b0] ml-auto flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {m.filledSlots ?? 0}/{m.maxSlots}
                      </span>
                    </div>

                    {/* Scheduled time */}
                    {scheduledAt && (
                      <div className="mt-2 text-[10px] text-[#606070]">
                        {scheduledAt.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                        {" · "}
                        {scheduledAt.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
                      </div>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* Leaderboard Preview */}
      <section className="max-w-7xl mx-auto px-4 pb-10">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl md:text-2xl font-black uppercase">
            Top <span className="text-[#ff6b00]">Players</span>
          </h2>
          <Link href="/leaderboard" className="flex items-center gap-1 text-[#ff6b00] text-xs font-bold hover:gap-2 transition-all">
            Full Leaderboard <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="bg-[#12121a] rounded-xl border border-[#ff6b00]/20 overflow-hidden">
          {loadingLb ? (
            <div className="p-6 text-center text-[#a0a0b0]">Loading rankings...</div>
          ) : leaderboard.length === 0 ? (
            <div className="p-8 text-center text-[#a0a0b0]">
              <Users className="w-10 h-10 mx-auto mb-2 opacity-20" />
              <p className="text-white/30 font-bold">No Rankings Yet</p>
              <p className="text-sm mt-1">Play a match to appear on the leaderboard.</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#ff6b00]/10">
                  <th className="text-left text-[#a0a0b0] text-xs uppercase py-2 px-3">#</th>
                  <th className="text-left text-[#a0a0b0] text-xs uppercase py-2 px-3">Player</th>
                  <th className="text-right text-[#a0a0b0] text-xs uppercase py-2 px-3">Kills</th>
                  <th className="text-right text-[#a0a0b0] text-xs uppercase py-2 px-3">Points</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.slice(0, 5).map((entry: any) => (
                  <tr key={entry.rank} className="border-b border-[#ff6b00]/5 hover:bg-[#ff6b00]/5 transition-colors">
                    <td className="py-2 px-3">
                      <span className={`font-black text-sm ${rankColors[entry.rank - 1] ?? "text-white"}`}>
                        #{entry.rank}
                      </span>
                    </td>
                    <td className="py-2 px-3 font-medium text-white text-sm">{entry.playerName}</td>
                    <td className="py-2 px-3 text-right text-[#ff6b00] font-bold text-sm">{entry.kills}</td>
                    <td className="py-2 px-3 text-right text-white font-bold text-sm">{entry.points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {/* Announcements */}
      {(loadingAnn || announcements.length > 0) && (
        <section className="max-w-7xl mx-auto px-4 pb-10">
          <h2 className="text-xl font-black uppercase mb-4">
            Latest <span className="text-[#ff6b00]">Announcements</span>
          </h2>
          <div className="flex flex-col gap-2.5">
            {loadingAnn ? (
              [1,2].map((i) => <div key={i} className="h-14 bg-[#12121a] rounded-xl animate-pulse" />)
            ) : (
              announcements.slice(0, 5).map((a: any) => (
                <div
                  key={a.id}
                  className={`rounded-xl border-l-4 p-3 bg-[#12121a] ${announcementTypeColors[a.type] ?? announcementTypeColors.info}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h4 className="font-bold text-white text-sm">{a.title}</h4>
                      <p className="text-[#a0a0b0] text-xs mt-0.5 line-clamp-2">{a.content}</p>
                    </div>
                    <span className="text-[#a0a0b0] text-xs whitespace-nowrap">
                      {new Date(a.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      )}

      {/* How It Works */}
      <section className="max-w-7xl mx-auto px-4 pb-10">
        <h2 className="text-xl md:text-2xl font-black uppercase text-center mb-6">
          How It <span className="text-[#ff6b00]">Works</span>
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { step: "01", title: "Register", desc: "Create your account and complete your Free Fire profile with your UID and nickname." },
            { step: "02", title: "Join Tournament", desc: "Browse available tournaments, pay the entry fee via BKash or Nagad, and register your team." },
            { step: "03", title: "Get Room Details", desc: "Once approved, receive the Room ID and password from the admin before match time." },
            { step: "04", title: "Win Prizes", desc: "Compete hard, rank high, and receive your prize money directly to your mobile wallet." },
          ].map((item) => (
            <div key={item.step} className="bg-[#12121a] border border-[#ff6b00]/10 rounded-xl p-4 text-center hover:border-[#ff6b00]/30 transition-colors">
              <div className="text-2xl font-black text-[#ff6b00]/20 mb-2">{item.step}</div>
              <h3 className="font-black uppercase text-white text-sm mb-1">{item.title}</h3>
              <p className="text-[#a0a0b0] text-xs leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <Footer />
    </div>
  );
}
