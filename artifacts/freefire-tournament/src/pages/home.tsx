import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Trophy, Users, Zap, ChevronRight, Flame, Swords, Clock, CheckCircle, X } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import TournamentCard from "@/components/TournamentCard";
import CountdownTimer from "@/components/CountdownTimer";
import { useGetFeaturedTournaments, useListAnnouncements, useGetGlobalLeaderboard } from "@workspace/api-client-react";
import { useAuthContext } from "@/lib/AuthContext";
import { useToast } from "@/hooks/use-toast";

const announcementTypeColors: Record<string, string> = {
  info: "border-l-blue-400 bg-blue-400/5",
  warning: "border-l-yellow-400 bg-yellow-400/5",
  success: "border-l-[#00ff88] bg-[#00ff88]/5",
  urgent: "border-l-[#ff2244] bg-[#ff2244]/5",
};

const rankColors = ["text-[#ffd700]", "text-gray-300", "text-amber-600"];

const MATCH_STATUS_COLOR: Record<string, string> = {
  "1v1": "bg-blue-500/10 text-blue-400 border-blue-400/30",
  "2v2": "bg-purple-500/10 text-purple-400 border-purple-400/30",
  "3v3": "bg-[#ff6b00]/10 text-[#ff6b00] border-[#ff6b00]/30",
  "4v4": "bg-[#00ff88]/10 text-[#00ff88] border-[#00ff88]/30",
};

export default function Home() {
  const { data: _featured, isLoading: loadingFeatured } = useGetFeaturedTournaments();
  const { data: _announcements, isLoading: loadingAnn } = useListAnnouncements();
  const { data: _leaderboard, isLoading: loadingLb } = useGetGlobalLeaderboard();
  const { user, authFetch } = useAuthContext();
  const { toast } = useToast();

  const featured = Array.isArray(_featured) ? _featured : [];
  const announcements = Array.isArray(_announcements) ? _announcements : [];
  const leaderboard = Array.isArray(_leaderboard) ? _leaderboard : [];

  const nextTournament = featured[0];

  const [communityMatches, setCommunityMatches] = useState<any[]>([]);
  const [loadingMatches, setLoadingMatches] = useState(true);
  const [joiningMatch, setJoiningMatch] = useState<number | null>(null);
  const [joinConfirm, setJoinConfirm] = useState<any | null>(null);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    fetch("/api/user-matches")
      .then((r) => r.json())
      .then((data) => setCommunityMatches(Array.isArray(data) ? data : []))
      .catch(() => setCommunityMatches([]))
      .finally(() => setLoadingMatches(false));
  }, []);

  useEffect(() => {
    if (user && joinConfirm) {
      authFetch("/wallet/balance")
        .then((r) => r.ok ? r.json() : null)
        .then((d) => { if (d) setWalletBalance(d.balance ?? 0); })
        .catch(() => {});
    }
  }, [user, joinConfirm]);

  const openJoinConfirm = (match: any) => {
    if (!user) { toast({ title: "Sign in required", description: "Please sign in to join a match.", variant: "destructive" }); return; }
    setJoinConfirm(match);
    setWalletBalance(null);
  };

  const doJoin = async () => {
    if (!joinConfirm) return;
    setJoining(true);
    try {
      const res = await authFetch(`/user-matches/${joinConfirm.id}/join`, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        toast({ title: "Joined!", description: data.message ?? "You have joined the match!" });
        setCommunityMatches((prev) => prev.map((m) => m.id === joinConfirm.id ? { ...m, filledSlots: m.filledSlots + 1 } : m));
        setJoinConfirm(null);
      } else {
        toast({ title: "Cannot join", description: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Connection error", variant: "destructive" });
    } finally {
      setJoining(false);
    }
  };

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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {featured.map((t) => <TournamentCard key={t.id} t={t as any} />)}
          </div>
        )}
      </section>

      {/* Community Matches — approved user-submitted matches */}
      {(loadingMatches || communityMatches.length > 0) && (
        <section className="max-w-7xl mx-auto px-4 pb-10">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xl md:text-2xl font-black uppercase">
              Community <span className="text-[#ff6b00]">Matches</span>
            </h2>
            <span className="text-[#606070] text-xs">Player-created · Join with wallet balance</span>
          </div>

          {loadingMatches ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {[1,2,3].map((i) => <div key={i} className="h-36 bg-[#12121a] rounded-xl animate-pulse" />)}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {communityMatches.map((m: any) => {
                const isFull = m.filledSlots >= m.maxSlots;
                const isPast = new Date(m.scheduledAt) < new Date();
                const disabled = isFull || isPast;
                return (
                  <div key={m.id} className={`bg-[#12121a] rounded-xl border transition-colors p-4 ${disabled ? "border-[#2a2a36] opacity-60" : "border-[#ff6b00]/10 hover:border-[#ff6b00]/30"}`}>
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div>
                        <span className={`inline-flex items-center gap-1 text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${MATCH_STATUS_COLOR[m.matchType] ?? "text-white border-white/20"}`}>
                          <Swords className="w-2.5 h-2.5" /> {m.matchType}
                        </span>
                        <div className="text-[#a0a0b0] text-xs mt-1.5 flex items-center gap-1">
                          <Clock className="w-3 h-3 shrink-0" />
                          {new Date(m.scheduledAt).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[#ffd700] font-black text-sm">৳{Number(m.prizePool).toLocaleString()}</div>
                        <div className="text-[#606070] text-[10px]">prize pool</div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between mb-3">
                      <div className="text-xs text-[#a0a0b0]">
                        By <span className="text-white font-bold">{m.creatorName ?? "Player"}</span>
                      </div>
                      <div className="text-xs text-[#606070]">
                        <span className={`font-bold ${isFull ? "text-[#ff2244]" : "text-[#00ff88]"}`}>{m.filledSlots}/{m.maxSlots}</span> slots
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="text-xs">
                        Entry: <span className="font-black text-[#ff6b00]">৳{Number(m.entryFee).toLocaleString()}</span>
                      </div>
                      {isPast ? (
                        <span className="text-[#606070] text-xs font-bold uppercase">Ended</span>
                      ) : isFull ? (
                        <span className="text-[#ff2244] text-xs font-bold uppercase">Full</span>
                      ) : (
                        <button
                          onClick={() => openJoinConfirm(m)}
                          className="px-3 py-1.5 bg-[#ff6b00] text-white text-xs font-black uppercase rounded-lg hover:bg-[#e66000] transition-colors"
                        >
                          Join
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

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

      {/* Join Confirmation Modal */}
      {joinConfirm && (
        <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setJoinConfirm(null)} />
          <div className="relative w-full sm:max-w-sm bg-[#0d0d16] border border-[#ff6b00]/20 rounded-t-3xl sm:rounded-2xl p-5 z-10">
            <div className="sm:hidden w-12 h-1 bg-[#2a2a36] rounded-full mx-auto mb-4" />

            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Swords className="w-5 h-5 text-[#ff6b00]" />
                <h3 className="font-black text-white">Join Match</h3>
              </div>
              <button onClick={() => setJoinConfirm(null)} className="w-7 h-7 rounded-full bg-[#1a1a24] flex items-center justify-center text-[#a0a0b0] hover:text-white">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="bg-[#0a0a0f] rounded-xl p-3 mb-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-[#a0a0b0]">Match Type</span>
                <span className="font-black text-white">{joinConfirm.matchType}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#a0a0b0]">Prize Pool</span>
                <span className="font-black text-[#ffd700]">৳{Number(joinConfirm.prizePool).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#a0a0b0]">Entry Fee</span>
                <span className="font-black text-[#ff6b00]">৳{Number(joinConfirm.entryFee).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#a0a0b0]">Your Balance</span>
                <span className={`font-black ${walletBalance === null ? "text-[#606070]" : walletBalance >= Number(joinConfirm.entryFee) ? "text-[#00ff88]" : "text-[#ff2244]"}`}>
                  {walletBalance === null ? "Loading..." : `৳${walletBalance.toFixed(2)}`}
                </span>
              </div>
            </div>

            {walletBalance !== null && walletBalance < Number(joinConfirm.entryFee) ? (
              <div className="mb-4 p-3 bg-[#ff2244]/5 border border-[#ff2244]/20 rounded-xl text-center">
                <p className="text-[#ff2244] text-sm font-bold">Insufficient balance</p>
                <Link href="/wallet" onClick={() => setJoinConfirm(null)} className="text-[#ff6b00] text-xs font-bold underline mt-1 block">Top up wallet →</Link>
              </div>
            ) : (
              <p className="text-[#a0a0b0] text-xs mb-4 text-center">
                <CheckCircle className="w-3.5 h-3.5 text-[#00ff88] inline mr-1" />
                ৳{Number(joinConfirm.entryFee).toLocaleString()} will be deducted instantly.
              </p>
            )}

            <button
              onClick={doJoin}
              disabled={joining || (walletBalance !== null && walletBalance < Number(joinConfirm.entryFee))}
              className="w-full py-3 bg-[#ff6b00] text-white font-black uppercase rounded-xl text-sm hover:bg-[#e66000] disabled:opacity-40 transition-all"
            >
              {joining ? "Joining..." : `Confirm & Pay ৳${Number(joinConfirm.entryFee).toLocaleString()}`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
