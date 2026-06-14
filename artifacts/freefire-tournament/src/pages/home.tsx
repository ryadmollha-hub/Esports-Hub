import { Link } from "wouter";
import { Trophy, Users, Zap, ChevronRight, Flame } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import TournamentCard from "@/components/TournamentCard";
import CountdownTimer from "@/components/CountdownTimer";
import { useGetFeaturedTournaments, useListAnnouncements, useGetGlobalLeaderboard } from "@workspace/api-client-react";

const announcementTypeColors: Record<string, string> = {
  info: "border-l-blue-400 bg-blue-400/5",
  warning: "border-l-yellow-400 bg-yellow-400/5",
  success: "border-l-[#00ff88] bg-[#00ff88]/5",
  urgent: "border-l-[#ff2244] bg-[#ff2244]/5",
};

const rankColors = ["text-[#ffd700]", "text-gray-300", "text-amber-600"];

export default function Home() {
  const { data: featured = [], isLoading: loadingFeatured } = useGetFeaturedTournaments();
  const { data: announcements = [], isLoading: loadingAnn } = useListAnnouncements();
  const { data: leaderboard = [], isLoading: loadingLb } = useGetGlobalLeaderboard();

  const nextTournament = featured[0];

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <Navbar />

      {/* Hero */}
      <section className="relative min-h-[100dvh] flex flex-col items-center justify-center text-center px-4 overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center opacity-10" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0f]/50 via-transparent to-[#0a0a0f]" />
        <div className="absolute inset-0 bg-gradient-radial from-[#ff6b00]/5 via-transparent to-transparent" />

        <div className="relative z-10 max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-[#ff6b00]/10 border border-[#ff6b00]/30 rounded-full text-[#ff6b00] text-sm font-bold uppercase tracking-wider mb-6">
            <Flame className="w-4 h-4" />
            Season 2026 is Live
          </div>

          <h1 className="text-5xl md:text-8xl font-black uppercase leading-none tracking-tight mb-6" data-testid="text-hero-title">
            <span className="text-white">Dominate </span>
            <span className="text-[#ff6b00] [text-shadow:0_0_40px_rgba(255,107,0,0.5)]">Free Fire</span>
            <br />
            <span className="text-white">Tournaments</span>
          </h1>

          <p className="text-lg md:text-xl text-[#a0a0b0] mb-8 max-w-2xl mx-auto" data-testid="text-hero-sub">
            Compete in elite tournaments, build your squad, and claim prize pools worth thousands. The arena awaits.
          </p>

          {nextTournament && (
            <div className="glass-panel rounded-2xl p-6 mb-8 max-w-sm mx-auto border border-[#ff6b00]/20 bg-[#12121a]/80 backdrop-blur-md">
              <p className="text-[#a0a0b0] text-xs uppercase tracking-wider mb-2">Next Tournament Starts In</p>
              <CountdownTimer targetDate={nextTournament.countdownTo ?? nextTournament.startDate} className="text-2xl justify-center" />
              <p className="text-white font-bold mt-2 truncate" data-testid="text-hero-next-tournament">{nextTournament.name}</p>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/tournaments"
              data-testid="button-hero-find-tournaments"
              className="px-8 py-4 bg-[#ff6b00] text-white font-black uppercase text-base rounded-xl hover:bg-[#e66000] transition-all shadow-[0_0_30px_rgba(255,107,0,0.4)] hover:shadow-[0_0_50px_rgba(255,107,0,0.6)] flex items-center justify-center gap-2"
            >
              <Trophy className="w-5 h-5" /> Find Tournaments
            </Link>
            <Link
              href="/leaderboard"
              data-testid="button-hero-leaderboard"
              className="px-8 py-4 bg-transparent text-white font-black uppercase text-base rounded-xl border border-[#ff6b00]/40 hover:border-[#ff6b00] hover:bg-[#ff6b00]/10 transition-all flex items-center justify-center gap-2"
            >
              <Zap className="w-5 h-5" /> View Leaderboard
            </Link>
          </div>
        </div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-[#a0a0b0]">
          <div className="w-px h-12 bg-gradient-to-b from-transparent to-[#ff6b00]/40" />
          <span className="text-xs uppercase tracking-widest">Scroll</span>
        </div>
      </section>

      {/* Stats bar */}
      <section className="border-y border-[#ff6b00]/20 bg-[#12121a]/50">
        <div className="max-w-7xl mx-auto px-4 py-6 grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { label: "Active Tournaments", value: "12+" },
            { label: "Total Prize Pool", value: "৳50,000+" },
            { label: "Registered Players", value: "2,400+" },
            { label: "Matches Played", value: "180+" },
          ].map((s) => (
            <div key={s.label} className="text-center" data-testid={`stat-${s.label.toLowerCase().replace(/ /g, "-")}`}>
              <div className="text-2xl md:text-3xl font-black text-[#ff6b00]">{s.value}</div>
              <div className="text-[#a0a0b0] text-xs uppercase tracking-wide mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Featured Tournaments */}
      <section className="max-w-7xl mx-auto px-4 py-16">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl md:text-3xl font-black uppercase" data-testid="heading-featured-tournaments">
            Featured <span className="text-[#ff6b00]">Tournaments</span>
          </h2>
          <Link href="/tournaments" data-testid="link-view-all-tournaments" className="flex items-center gap-1 text-[#ff6b00] text-sm font-bold hover:gap-2 transition-all">
            View All <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {loadingFeatured ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1,2,3].map((i) => (
              <div key={i} className="h-64 bg-[#12121a] rounded-xl animate-pulse" data-testid={`skeleton-tournament-${i}`} />
            ))}
          </div>
        ) : featured.length === 0 ? (
          <div className="text-center py-16 text-[#a0a0b0]">
            <Trophy className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p>No upcoming tournaments. Check back soon.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {featured.map((t) => <TournamentCard key={t.id} t={t as any} />)}
          </div>
        )}
      </section>

      {/* Leaderboard Preview */}
      <section className="max-w-7xl mx-auto px-4 pb-16">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl md:text-3xl font-black uppercase">
            Top <span className="text-[#ff6b00]">Players</span>
          </h2>
          <Link href="/leaderboard" data-testid="link-view-leaderboard" className="flex items-center gap-1 text-[#ff6b00] text-sm font-bold hover:gap-2 transition-all">
            Full Leaderboard <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="bg-[#12121a] rounded-xl border border-[#ff6b00]/20 overflow-hidden">
          {loadingLb ? (
            <div className="p-8 text-center text-[#a0a0b0]">Loading rankings...</div>
          ) : leaderboard.length === 0 ? (
            <div className="p-8 text-center text-[#a0a0b0]">
              <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>No rankings yet. Play a match to appear here.</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#ff6b00]/10">
                  <th className="text-left text-[#a0a0b0] text-xs uppercase py-3 px-4">#</th>
                  <th className="text-left text-[#a0a0b0] text-xs uppercase py-3 px-4">Player</th>
                  <th className="text-right text-[#a0a0b0] text-xs uppercase py-3 px-4">Kills</th>
                  <th className="text-right text-[#a0a0b0] text-xs uppercase py-3 px-4">Points</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.slice(0, 5).map((entry: any) => (
                  <tr key={entry.rank} className="border-b border-[#ff6b00]/5 hover:bg-[#ff6b00]/5 transition-colors" data-testid={`row-leaderboard-${entry.rank}`}>
                    <td className="py-3 px-4">
                      <span className={`font-black text-base ${rankColors[entry.rank - 1] ?? "text-white"}`}>
                        #{entry.rank}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-medium text-white" data-testid={`text-player-${entry.rank}`}>{entry.playerName}</td>
                    <td className="py-3 px-4 text-right text-[#ff6b00] font-bold">{entry.kills}</td>
                    <td className="py-3 px-4 text-right text-white font-bold">{entry.points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {/* Announcements */}
      {(loadingAnn || announcements.length > 0) && (
        <section className="max-w-7xl mx-auto px-4 pb-16">
          <h2 className="text-2xl font-black uppercase mb-6">
            <span className="text-[#ff6b00]">Announcements</span>
          </h2>
          <div className="flex flex-col gap-4">
            {loadingAnn ? (
              [1,2].map((i) => <div key={i} className="h-16 bg-[#12121a] rounded-xl animate-pulse" />)
            ) : (
              announcements.slice(0, 3).map((a: any) => (
                <div
                  key={a.id}
                  className={`rounded-xl border-l-4 p-4 bg-[#12121a] ${announcementTypeColors[a.type] ?? announcementTypeColors.info}`}
                  data-testid={`card-announcement-${a.id}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h4 className="font-bold text-white text-sm" data-testid={`text-announcement-title-${a.id}`}>{a.title}</h4>
                      <p className="text-[#a0a0b0] text-sm mt-1 line-clamp-2">{a.content}</p>
                    </div>
                    <span className="text-[#a0a0b0] text-xs whitespace-nowrap mt-0.5">
                      {new Date(a.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      )}

      <Footer />
    </div>
  );
}
