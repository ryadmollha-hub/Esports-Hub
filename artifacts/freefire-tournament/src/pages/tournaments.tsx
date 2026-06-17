import { useState, useEffect } from "react";
import { Search, Trophy, Swords, Clock, Lock, X, Timer, Zap } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import TournamentCard from "@/components/TournamentCard";
import CountdownTimer from "@/components/CountdownTimer";
import { useListTournaments, getListTournamentsQueryKey } from "@workspace/api-client-react";
import { useAuthContext } from "@/lib/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";

const MATCH_TYPE_COLOR: Record<string, string> = {
  "1v1": "bg-blue-500/10 text-blue-400 border-blue-400/30",
  "2v2": "bg-purple-500/10 text-purple-400 border-purple-400/30",
  "3v3": "bg-[#ff6b00]/10 text-[#ff6b00] border-[#ff6b00]/30",
  "4v4": "bg-[#00ff88]/10 text-[#00ff88] border-[#00ff88]/30",
};

function getEffectiveStatus(m: any): string {
  if (m.effectiveStatus) return m.effectiveStatus;
  if (m.status === "active" || m.status === "ended" || m.status === "cancelled") return m.status;
  if (m.timerStartedAt && m.startDelayMinutes) {
    const startMs = new Date(m.timerStartedAt).getTime() + m.startDelayMinutes * 60 * 1000;
    if (Date.now() >= startMs) return "active";
  }
  return "waiting";
}

function getStartsAt(m: any): Date | null {
  if (!m.timerStartedAt || !m.startDelayMinutes) return null;
  return new Date(new Date(m.timerStartedAt).getTime() + m.startDelayMinutes * 60 * 1000);
}

export default function TournamentsPage() {
  const [search, setSearch] = useState("");
  const [mode, setMode] = useState("");
  const [status, setStatus] = useState("");
  const { user, authFetch } = useAuthContext();
  const { toast } = useToast();

  const params = {
    ...(search && { search }),
    ...(mode && { mode: mode as "solo" | "duo" | "squad" }),
    ...(status && { status: status as "upcoming" | "ongoing" | "completed" }),
  };
  const { data: tournamentsData, isLoading } = useListTournaments(params, {
    query: { queryKey: getListTournamentsQueryKey(params) },
  });
  const tournaments: any[] = (tournamentsData as any)?.tournaments ?? (Array.isArray(tournamentsData) ? tournamentsData : []);

  const [communityMatches, setCommunityMatches] = useState<any[]>([]);
  const [communityLoading, setCommunityLoading] = useState(true);
  const [joinMatch, setJoinMatch] = useState<any>(null);
  const [joinForm, setJoinForm] = useState({ inGameName: "", gameUid: "", password: "" });
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [joining, setJoining] = useState(false);
  const [, setTick] = useState(0);

  // Re-compute effective statuses every 30s
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchCommunity = () => {
    setCommunityLoading(true);
    fetch("/api/user-matches")
      .then((r) => r.json())
      .then((d) => setCommunityMatches(Array.isArray(d) ? d : []))
      .catch(() => setCommunityMatches([]))
      .finally(() => setCommunityLoading(false));
  };

  useEffect(() => { fetchCommunity(); }, []);

  useEffect(() => {
    if (user && joinMatch && Number(joinMatch.entryFee) > 0) {
      authFetch("/wallet/balance")
        .then((r) => r.ok ? r.json() : null)
        .then((d) => d && setWalletBalance(d.balance ?? 0))
        .catch(() => {});
    }
  }, [user, joinMatch]);

  const openJoin = (match: any) => {
    if (!user) {
      toast({ title: "Sign in required", description: "Please sign in to join a match.", variant: "destructive" });
      return;
    }
    setJoinMatch(match);
    setJoinForm({ inGameName: "", gameUid: "", password: "" });
    setWalletBalance(null);
  };

  const doJoin = async () => {
    if (!joinMatch) return;
    setJoining(true);
    try {
      const res = await authFetch(`/user-matches/${joinMatch.id}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inGameName: joinForm.inGameName.trim(),
          gameUid: joinForm.gameUid.trim(),
          ...(joinMatch.isPasswordProtected ? { password: joinForm.password } : {}),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        if (data.isPending) {
          toast({ title: "Request Sent!", description: "The creator will review your request." });
        } else {
          toast({ title: "Joined!", description: "You have successfully joined the match!" });
          setCommunityMatches((prev) =>
            prev.map((m) => m.id === joinMatch.id ? { ...m, filledSlots: m.filledSlots + 1 } : m)
          );
        }
        setJoinMatch(null);
      } else {
        toast({ title: "Cannot join", description: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Connection error", variant: "destructive" });
    } finally {
      setJoining(false);
    }
  };

  const joinDisabled =
    joining ||
    !joinForm.inGameName.trim() ||
    !joinForm.gameUid.trim() ||
    (joinMatch?.isPasswordProtected && !joinForm.password.trim()) ||
    (walletBalance !== null && Number(joinMatch?.entryFee ?? 0) > 0 && walletBalance < Number(joinMatch?.entryFee ?? 0));

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 pt-16 pb-24">

        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-5 mt-4">
          <div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black uppercase mb-1" data-testid="heading-tournaments">
              All <span className="text-[#ff6b00]">Tournaments</span>
            </h1>
            <p className="text-[#a0a0b0] text-sm">Find and join the hottest Free Fire competitions</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-2 mb-5">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#a0a0b0]" />
            <input
              type="text"
              placeholder="Search tournaments..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              data-testid="input-search-tournaments"
              className="w-full pl-9 pr-3 py-2.5 bg-[#12121a] border border-[#2a2a36] rounded-xl text-white placeholder-[#a0a0b0] focus:outline-none focus:border-[#ff6b00] transition-colors text-sm"
            />
          </div>
          <div className="grid grid-cols-2 sm:flex gap-2">
            <select value={mode} onChange={(e) => setMode(e.target.value)}
              data-testid="select-filter-mode"
              className="w-full px-3 py-2.5 bg-[#12121a] border border-[#2a2a36] rounded-xl text-white focus:outline-none focus:border-[#ff6b00] transition-colors text-sm">
              <option value="">All Modes</option>
              <option value="solo">Solo</option>
              <option value="duo">Duo</option>
              <option value="squad">Squad</option>
            </select>
            <select value={status} onChange={(e) => setStatus(e.target.value)}
              data-testid="select-filter-status"
              className="w-full px-3 py-2.5 bg-[#12121a] border border-[#2a2a36] rounded-xl text-white focus:outline-none focus:border-[#ff6b00] transition-colors text-sm">
              <option value="">All Status</option>
              <option value="upcoming">Upcoming</option>
              <option value="ongoing">Ongoing</option>
              <option value="completed">Completed</option>
            </select>
          </div>
        </div>

        {/* Official Tournaments */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1,2,3,4,5,6].map((i) => (
              <div key={i} className="h-48 bg-[#12121a] rounded-xl animate-pulse" data-testid={`skeleton-card-${i}`} />
            ))}
          </div>
        ) : tournaments.length === 0 ? (
          <div className="text-center py-16">
            <Trophy className="w-12 h-12 mx-auto mb-3 text-[#ff6b00]/30" />
            <h3 className="text-lg font-bold text-white mb-1">No tournaments found</h3>
            <p className="text-[#a0a0b0] text-sm">Try adjusting your filters or check back later</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tournaments.map((t: any) => <TournamentCard key={t.id} t={t} />)}
          </div>
        )}

        {/* ── Community Matches (public only) ── */}
        <div className="mt-12">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-black uppercase">
                Community <span className="text-[#ff6b00]">Matches</span>
              </h2>
              <p className="text-[#a0a0b0] text-xs mt-0.5">
                Public player-created matches — join and compete
                {user && (
                  <Link href="/profile" className="ml-2 text-[#ff6b00] hover:underline font-bold">
                    → Create a Match
                  </Link>
                )}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={fetchCommunity} title="Refresh"
                className="w-7 h-7 rounded-lg bg-[#12121a] border border-[#2a2a36] flex items-center justify-center text-[#606070] hover:text-[#a0a0b0] transition-colors">
                <Search className="w-3 h-3" />
              </button>
            </div>
          </div>

          {communityLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1,2,3].map((i) => <div key={i} className="h-44 bg-[#12121a] rounded-2xl animate-pulse" />)}
            </div>
          ) : communityMatches.length === 0 ? (
            <div className="bg-[#12121a] border border-[#ff6b00]/10 rounded-2xl p-10 text-center">
              <Swords className="w-10 h-10 mx-auto mb-3 text-[#ff6b00]/20" />
              <h3 className="font-bold text-white mb-1">No community matches yet</h3>
              <p className="text-[#a0a0b0] text-sm">
                {user ? (
                  <>Head to your <Link href="/profile" className="text-[#ff6b00] font-bold hover:underline">Profile</Link> to create the first match!</>
                ) : (
                  <>Sign in and create a match to get things started.</>
                )}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {communityMatches.map((m: any) => {
                const effStatus = getEffectiveStatus(m);
                const isActive = effStatus === "active";
                const isFull = m.filledSlots >= m.maxSlots;
                const startsAt = getStartsAt(m);
                const isTimerRunning = !!m.timerStartedAt && !isActive;
                const isEnded = effStatus === "ended" || effStatus === "cancelled";
                const canJoin = !isFull && !isEnded;

                return (
                  <div key={m.id} className={`bg-[#12121a] rounded-2xl border p-4 transition-colors ${!canJoin ? "border-[#2a2a36] opacity-60" : isActive ? "border-[#00ff88]/20 hover:border-[#00ff88]/40" : "border-[#ff6b00]/10 hover:border-[#ff6b00]/30"}`}>
                    {/* Status bar for active matches */}
                    {isActive && (
                      <div className="flex items-center gap-1.5 text-[10px] font-black uppercase text-[#00ff88] mb-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#00ff88] animate-pulse" />
                        LIVE NOW
                        <Zap className="w-3 h-3 ml-auto" />
                      </div>
                    )}
                    {isTimerRunning && startsAt && (
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#ff6b00] mb-2">
                        <Timer className="w-3 h-3" />
                        Starts in: <CountdownTimer targetDate={startsAt} className="text-[10px]" />
                      </div>
                    )}

                    {/* Title row */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex-1 min-w-0">
                        <div className="font-black text-white text-sm truncate">{m.matchName || `${m.matchType} Match`}</div>
                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                          <span className={`inline-flex items-center gap-1 text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${MATCH_TYPE_COLOR[m.matchType] ?? "text-white border-white/20"}`}>
                            <Swords className="w-2.5 h-2.5" /> {m.matchType}
                          </span>
                          {m.isPasswordProtected && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-400 border border-yellow-500/30">
                              <Lock className="w-2.5 h-2.5" /> Password
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-[#ffd700] font-black text-sm">৳{Number(m.prizePool).toLocaleString()}</div>
                        <div className="text-[#606070] text-[10px]">prize pool</div>
                      </div>
                    </div>

                    {/* Info row */}
                    <div className="flex items-center justify-between text-xs text-[#606070] mb-3">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {m.creatorName ? `by ${m.creatorName}` : "Community"}
                      </div>
                      <div>
                        <span className={`font-bold ${isFull ? "text-[#ff2244]" : "text-[#00ff88]"}`}>{m.filledSlots}/{m.maxSlots}</span> slots
                      </div>
                    </div>

                    {/* Footer row */}
                    <div className="flex items-center justify-between">
                      <div className="text-xs">
                        Fee: <span className={`font-black ${Number(m.entryFee) > 0 ? "text-[#ff6b00]" : "text-[#00ff88]"}`}>
                          {Number(m.entryFee) > 0 ? `৳${Number(m.entryFee).toLocaleString()}` : "Free"}
                        </span>
                      </div>
                      {isEnded ? (
                        <span className="text-[#606070] text-xs font-bold uppercase">Ended</span>
                      ) : isFull ? (
                        <span className="text-[#ff2244] text-xs font-bold uppercase">Full</span>
                      ) : (
                        <button
                          onClick={() => openJoin(m)}
                          className={`px-3 py-1.5 text-white text-xs font-black uppercase rounded-lg transition-colors ${isActive ? "bg-[#00ff88] hover:bg-[#00cc66] text-black" : "bg-[#ff6b00] hover:bg-[#e66000]"}`}
                        >
                          {m.isPasswordProtected ? (
                            <span className="flex items-center gap-1"><Lock className="w-3 h-3" /> Join</span>
                          ) : isActive ? (
                            <span className="flex items-center gap-1"><Zap className="w-3 h-3" /> Join Live</span>
                          ) : "Join"}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
      <Footer />

      {/* ── Join Match Modal ── */}
      {joinMatch && (
        <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setJoinMatch(null)} />
          <div className="relative w-full sm:max-w-sm bg-[#0d0d16] border border-[#ff6b00]/20 rounded-t-3xl sm:rounded-2xl p-5 z-10 max-h-[90vh] overflow-y-auto">
            <div className="sm:hidden w-12 h-1 bg-[#2a2a36] rounded-full mx-auto mb-4" />

            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Swords className="w-5 h-5 text-[#ff6b00]" />
                <div>
                  <h3 className="font-black text-white">Join Match</h3>
                  <p className="text-[#606070] text-xs">{joinMatch.matchName || `${joinMatch.matchType} Match`}</p>
                </div>
              </div>
              <button onClick={() => setJoinMatch(null)} className="w-7 h-7 rounded-full bg-[#1a1a24] flex items-center justify-center text-[#a0a0b0] hover:text-white transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="bg-[#0a0a0f] rounded-xl p-3 mb-4 space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-[#a0a0b0]">Type</span>
                <span className="font-black text-white">{joinMatch.matchType}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#a0a0b0]">Prize Pool</span>
                <span className="font-black text-[#ffd700]">৳{Number(joinMatch.prizePool).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#a0a0b0]">Entry Fee</span>
                <span className={`font-black ${Number(joinMatch.entryFee) > 0 ? "text-[#ff6b00]" : "text-[#00ff88]"}`}>
                  {Number(joinMatch.entryFee) > 0 ? `৳${Number(joinMatch.entryFee).toLocaleString()}` : "Free"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#a0a0b0]">Slots</span>
                <span className="font-black text-white">{joinMatch.filledSlots}/{joinMatch.maxSlots}</span>
              </div>
              {Number(joinMatch.entryFee) > 0 && (
                <div className="flex justify-between">
                  <span className="text-[#a0a0b0]">Your Balance</span>
                  <span className={`font-black ${walletBalance === null ? "text-[#606070]" : walletBalance >= Number(joinMatch.entryFee) ? "text-[#00ff88]" : "text-[#ff2244]"}`}>
                    {walletBalance === null ? "Loading..." : `৳${walletBalance.toFixed(2)}`}
                  </span>
                </div>
              )}
            </div>

            <div className="space-y-3 mb-3">
              <div>
                <label className="block text-[#a0a0b0] text-xs uppercase tracking-wider mb-1.5 font-bold">In-Game Name *</label>
                <input type="text" placeholder="Your in-game nickname"
                  value={joinForm.inGameName}
                  onChange={(e) => setJoinForm({ ...joinForm, inGameName: e.target.value })}
                  className="w-full bg-[#0a0a0f] border border-[#2a2a36] rounded-xl px-3 py-2.5 text-white text-sm placeholder-[#4a4a5a] focus:outline-none focus:border-[#ff6b00] transition-colors"
                />
              </div>
              <div>
                <label className="block text-[#a0a0b0] text-xs uppercase tracking-wider mb-1.5 font-bold">Game UID *</label>
                <input type="text" placeholder="Your Free Fire UID"
                  value={joinForm.gameUid}
                  onChange={(e) => setJoinForm({ ...joinForm, gameUid: e.target.value })}
                  className="w-full bg-[#0a0a0f] border border-[#2a2a36] rounded-xl px-3 py-2.5 text-white text-sm font-mono placeholder-[#4a4a5a] focus:outline-none focus:border-[#ff6b00] transition-colors"
                />
              </div>
              {joinMatch.isPasswordProtected && (
                <div>
                  <label className="block text-xs uppercase tracking-wider mb-1.5 font-bold flex items-center gap-1.5">
                    <Lock className="w-3 h-3 text-yellow-400" />
                    <span className="text-yellow-400">Match Password *</span>
                  </label>
                  <input type="password" placeholder="Enter match password"
                    value={joinForm.password}
                    onChange={(e) => setJoinForm({ ...joinForm, password: e.target.value })}
                    className="w-full bg-[#0a0a0f] border border-yellow-500/30 rounded-xl px-3 py-2.5 text-white text-sm placeholder-[#4a4a5a] focus:outline-none focus:border-yellow-400 transition-colors"
                  />
                </div>
              )}
            </div>

            {walletBalance !== null && Number(joinMatch.entryFee) > 0 && walletBalance < Number(joinMatch.entryFee) && (
              <div className="mb-3 p-3 bg-[#ff2244]/5 border border-[#ff2244]/20 rounded-xl text-center">
                <p className="text-[#ff2244] text-sm font-bold">Insufficient balance</p>
                <Link href="/wallet" onClick={() => setJoinMatch(null)} className="text-[#ff6b00] text-xs font-bold underline mt-1 block">
                  Top up wallet →
                </Link>
              </div>
            )}

            <button onClick={doJoin} disabled={joinDisabled}
              className="w-full py-3 bg-[#ff6b00] text-white font-black uppercase rounded-xl text-sm hover:bg-[#e66000] disabled:opacity-40 transition-all">
              {joining ? "Joining..." : Number(joinMatch.entryFee) > 0 ? `Join & Pay ৳${Number(joinMatch.entryFee).toLocaleString()}` : "Join Match"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
