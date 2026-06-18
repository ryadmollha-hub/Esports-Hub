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
  const [myJoinMap, setMyJoinMap] = useState<Record<number, { adminRoomId: string | null; adminRoomPassword: string | null; status: string }>>({});
  const [joinMatch, setJoinMatch] = useState<any>(null);
  const [joinPlayers, setJoinPlayers] = useState<{ name: string; uid: string }[]>([{ name: "", uid: "" }]);
  const [joinPassword, setJoinPassword] = useState("");
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [joining, setJoining] = useState(false);
  const [, setTick] = useState(0);

  const playersForType = (matchType: string) => {
    const map: Record<string, number> = { "1v1": 1, "2v2": 2, "3v3": 3, "4v4": 4 };
    return map[matchType] ?? 1;
  };

  // Re-compute effective statuses every 30s
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchMyJoinRequests = async () => {
    if (!user) return;
    try {
      const r = await authFetch("/user-matches/my-requests");
      if (!r.ok) return;
      const data: any[] = await r.json();
      const map: Record<number, { adminRoomId: string | null; adminRoomPassword: string | null; status: string }> = {};
      for (const j of data) {
        if (j.status === "accepted") {
          map[j.matchId] = {
            adminRoomId: j.adminRoomId ?? null,
            adminRoomPassword: j.adminRoomPassword ?? null,
            status: j.status,
          };
        }
      }
      setMyJoinMap(map);
    } catch {}
  };

  const fetchCommunity = () => {
    setCommunityLoading(true);
    fetch("/api/user-matches")
      .then((r) => r.json())
      .then((d) => setCommunityMatches(Array.isArray(d) ? d : []))
      .catch(() => setCommunityMatches([]))
      .finally(() => setCommunityLoading(false));
  };

  useEffect(() => { fetchCommunity(); }, []);

  // Fetch user's join requests (for credentials) whenever user logs in, and poll every 30s
  useEffect(() => {
    if (!user) { setMyJoinMap({}); return; }
    fetchMyJoinRequests();
    const interval = setInterval(fetchMyJoinRequests, 30000);
    return () => clearInterval(interval);
  }, [user]);

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
    const count = playersForType(match.matchType);
    setJoinMatch(match);
    setJoinPlayers(Array.from({ length: count }, () => ({ name: "", uid: "" })));
    setJoinPassword("");
    setWalletBalance(null);
  };

  const updatePlayer = (idx: number, field: "name" | "uid", value: string) => {
    setJoinPlayers((prev) => prev.map((p, i) => i === idx ? { ...p, [field]: value } : p));
  };

  const doJoin = async () => {
    if (!joinMatch) return;
    setJoining(true);
    try {
      const res = await authFetch(`/user-matches/${joinMatch.id}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          players: joinPlayers.map((p) => ({ name: p.name.trim(), uid: p.uid.trim() })),
          ...(joinMatch.isPasswordProtected ? { password: joinPassword } : {}),
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
          fetchMyJoinRequests();
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
    joinPlayers.some((p) => !p.name.trim() || !p.uid.trim()) ||
    (joinMatch?.isPasswordProtected && !joinPassword.trim()) ||
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

        {/* Official Tournaments — large featured cards */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {[1,2,3,4].map((i) => (
              <div key={i} className="h-64 bg-[#12121a] rounded-2xl animate-pulse" data-testid={`skeleton-card-${i}`} />
            ))}
          </div>
        ) : tournaments.length === 0 ? (
          <div className="text-center py-16">
            <Trophy className="w-12 h-12 mx-auto mb-3 text-[#ff6b00]/30" />
            <h3 className="text-lg font-bold text-white mb-1">No tournaments found</h3>
            <p className="text-[#a0a0b0] text-sm">Try adjusting your filters or check back later</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {tournaments.map((t: any) => <TournamentCard key={t.id} t={t} featured />)}
          </div>
        )}

        {/* ── Community Matches (public only) ── */}
        <div className="mt-24 pt-4 border-t border-[#1a1a28]">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight">
                Community <span className="text-[#ff6b00]">Matches</span>
              </h2>
              <p className="text-[#a0a0b0] text-sm mt-1">
                Public player-created matches — join and compete
                {user && (
                  <Link href="/my-matches" className="ml-2 text-[#ff6b00] hover:underline font-bold">
                    → Create a Match
                  </Link>
                )}
              </p>
            </div>
            <button onClick={() => { fetchCommunity(); fetchMyJoinRequests(); }} title="Refresh"
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#12121a] border border-[#2a2a36] text-[#606070] hover:text-[#a0a0b0] hover:border-[#3a3a46] transition-colors text-xs font-bold uppercase">
              <Search className="w-3.5 h-3.5" /> Refresh
            </button>
          </div>

          {communityLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {[1,2,3,4,5,6].map((i) => <div key={i} className="h-52 bg-[#12121a] rounded-2xl animate-pulse" />)}
            </div>
          ) : communityMatches.length === 0 ? (
            <div className="bg-[#12121a] border border-[#ff6b00]/10 rounded-2xl p-14 text-center">
              <Swords className="w-12 h-12 mx-auto mb-4 text-[#ff6b00]/20" />
              <h3 className="font-bold text-white text-lg mb-2">No community matches yet</h3>
              <p className="text-[#a0a0b0] text-sm">
                {user ? (
                  <>Head to <Link href="/my-matches" className="text-[#ff6b00] font-bold hover:underline">My Matches</Link> to create the first match!</>
                ) : (
                  <>Sign in and create a match to get things started.</>
                )}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {communityMatches.map((m: any) => {
                const effStatus = getEffectiveStatus(m);
                const isLive = !!m.credentialsReleased;
                const isFull = m.filledSlots >= m.maxSlots;
                const startsAt = getStartsAt(m);
                const isTimerRunning = !!m.timerStartedAt && !isLive;
                const isEnded = effStatus === "ended" || effStatus === "cancelled";
                const canJoin = !isFull && !isEnded;
                const myJoin = myJoinMap[m.id];
                const hasCredentials = !!myJoin && (!!myJoin.adminRoomId);

                return (
                  <div
                    key={m.id}
                    className={`relative flex flex-col bg-[#12121a] border rounded-2xl overflow-hidden transition-all ${
                      isLive
                        ? "border-[#00ff88]/30 shadow-[0_0_20px_rgba(0,255,136,0.06)]"
                        : "border-[#2a2a36] hover:border-[#3a3a46]"
                    } ${!canJoin ? "opacity-60" : ""}`}
                  >
                    {/* Top accent bar */}
                    <div className={`h-1 w-full ${isLive ? "bg-[#00ff88]" : isEnded ? "bg-[#2a2a36]" : "bg-[#ff6b00]"}`} />

                    <div className="p-5 flex flex-col flex-1 gap-4">
                      {/* Header row: status + type badge */}
                      <div className="flex items-center justify-between gap-2">
                        {isLive ? (
                          <span className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase text-[#00ff88] bg-[#00ff88]/10 border border-[#00ff88]/30 px-3 py-1.5 rounded-full">
                            <span className="w-2 h-2 rounded-full bg-[#00ff88] animate-pulse shrink-0" />
                            LIVE
                          </span>
                        ) : isEnded ? (
                          <span className="text-[11px] font-black uppercase text-[#606070] bg-[#1a1a24] border border-[#2a2a36] px-3 py-1.5 rounded-full">ENDED</span>
                        ) : (
                          <span className="text-[11px] font-black uppercase text-[#a0a0b0] bg-[#1a1a24] border border-[#2a2a36] px-3 py-1.5 rounded-full">UPCOMING</span>
                        )}
                        <span className={`inline-flex items-center gap-1 text-[11px] font-black uppercase px-2.5 py-1.5 rounded-lg border ${MATCH_TYPE_COLOR[m.matchType] ?? "text-white border-white/20"}`}>
                          <Swords className="w-3 h-3" /> {m.matchType}
                        </span>
                      </div>

                      {/* Match title */}
                      <div>
                        <h3 className="text-lg font-black text-white leading-tight truncate">
                          {m.matchName || `${m.matchType} Match`}
                        </h3>
                        <p className="text-[#606070] text-xs mt-0.5">by {m.creatorName || "Player"}</p>
                      </div>

                      {/* Stats row */}
                      <div className="grid grid-cols-3 gap-2">
                        <div className="bg-[#0a0a0f] rounded-xl p-2.5 text-center">
                          <div className="text-[#ffd700] font-black text-base">৳{Number(m.prizePool).toLocaleString()}</div>
                          <div className="text-[#606070] text-[10px] uppercase mt-0.5">Prize</div>
                        </div>
                        <div className="bg-[#0a0a0f] rounded-xl p-2.5 text-center">
                          <div className={`font-black text-base ${Number(m.entryFee) > 0 ? "text-[#ff6b00]" : "text-[#00ff88]"}`}>
                            {Number(m.entryFee) > 0 ? `৳${Number(m.entryFee)}` : "Free"}
                          </div>
                          <div className="text-[#606070] text-[10px] uppercase mt-0.5">Entry</div>
                        </div>
                        <div className="bg-[#0a0a0f] rounded-xl p-2.5 text-center">
                          <div className={`font-black text-base ${isFull ? "text-[#ff2244]" : "text-[#00ff88]"}`}>
                            {m.filledSlots}/{m.maxSlots}
                          </div>
                          <div className="text-[#606070] text-[10px] uppercase mt-0.5">Slots</div>
                        </div>
                      </div>

                      {/* Countdown timer */}
                      {isTimerRunning && startsAt && (
                        <div className="flex items-center gap-2 text-[#ff6b00] bg-[#ff6b00]/5 border border-[#ff6b00]/15 rounded-xl px-3 py-2">
                          <Timer className="w-3.5 h-3.5 shrink-0" />
                          <span className="text-xs font-bold">Starts in </span>
                          <CountdownTimer targetDate={startsAt} className="text-xs font-black" />
                        </div>
                      )}

                      {/* Room credentials (for accepted joined users) */}
                      {hasCredentials && myJoin && (
                        <div className="bg-[#00ff88]/5 border border-[#00ff88]/20 rounded-xl p-3 space-y-2">
                          <div className="flex items-center gap-1.5 text-[#00ff88] text-xs font-black uppercase mb-1">
                            <Zap className="w-3 h-3" /> Room Credentials
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-[#a0a0b0] text-xs">Room ID</span>
                            <span className="text-white font-black text-sm font-mono bg-[#0a0a0f] px-2.5 py-0.5 rounded-lg">
                              {myJoin.adminRoomId}
                            </span>
                          </div>
                          {myJoin.adminRoomPassword && (
                            <div className="flex justify-between items-center">
                              <span className="text-[#a0a0b0] text-xs">Password</span>
                              <span className="text-white font-black text-sm font-mono bg-[#0a0a0f] px-2.5 py-0.5 rounded-lg">
                                {myJoin.adminRoomPassword}
                              </span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Badges row */}
                      <div className="flex items-center gap-2 flex-wrap mt-auto">
                        {m.isPasswordProtected && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full bg-yellow-500/10 text-yellow-400 border border-yellow-500/30">
                            <Lock className="w-2.5 h-2.5" /> Protected
                          </span>
                        )}
                        {myJoin && !hasCredentials && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/30">
                            <Clock className="w-2.5 h-2.5" /> Joined — Awaiting Room
                          </span>
                        )}
                      </div>

                      {/* Join button */}
                      {isEnded ? (
                        <div className="w-full py-3.5 rounded-xl bg-[#1a1a24] text-[#606070] text-sm font-black uppercase text-center">
                          Match Ended
                        </div>
                      ) : isFull ? (
                        <div className="w-full py-3.5 rounded-xl bg-[#ff2244]/10 border border-[#ff2244]/20 text-[#ff2244] text-sm font-black uppercase text-center">
                          Match Full
                        </div>
                      ) : myJoin ? (
                        <div className="w-full py-3.5 rounded-xl bg-[#00ff88]/10 border border-[#00ff88]/20 text-[#00ff88] text-sm font-black uppercase text-center">
                          ✓ You've Joined
                        </div>
                      ) : (
                        <button
                          onClick={() => openJoin(m)}
                          className={`w-full py-3.5 text-sm font-black uppercase rounded-xl transition-all flex items-center justify-center gap-2 ${
                            isLive
                              ? "bg-[#00ff88] hover:bg-[#00dd77] text-black shadow-[0_4px_20px_rgba(0,255,136,0.25)] hover:shadow-[0_4px_24px_rgba(0,255,136,0.4)]"
                              : "bg-[#ff6b00] hover:bg-[#e66000] text-white shadow-[0_4px_20px_rgba(255,107,0,0.25)] hover:shadow-[0_4px_24px_rgba(255,107,0,0.4)]"
                          }`}
                        >
                          {isLive ? (
                            <><Zap className="w-4 h-4" /> Join Live</>
                          ) : m.isPasswordProtected ? (
                            <><Lock className="w-4 h-4" /> Join Match</>
                          ) : (
                            "Join Match"
                          )}
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

            <div className="space-y-4 mb-3">
              {joinPlayers.map((player, idx) => (
                <div key={idx} className="space-y-2">
                  {joinPlayers.length > 1 && (
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-[#ff6b00]/20 border border-[#ff6b00]/40 flex items-center justify-center text-[#ff6b00] text-[10px] font-black">{idx + 1}</div>
                      <span className="text-[#a0a0b0] text-xs font-bold uppercase tracking-wider">Player {idx + 1}</span>
                    </div>
                  )}
                  <div>
                    <label className="block text-[#a0a0b0] text-xs uppercase tracking-wider mb-1.5 font-bold">
                      {joinPlayers.length > 1 ? `P${idx + 1} ` : ""}In-Game Name *
                    </label>
                    <input type="text" placeholder="In-game nickname"
                      value={player.name}
                      onChange={(e) => updatePlayer(idx, "name", e.target.value)}
                      className="w-full bg-[#0a0a0f] border border-[#2a2a36] rounded-xl px-3 py-2.5 text-white text-sm placeholder-[#4a4a5a] focus:outline-none focus:border-[#ff6b00] transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-[#a0a0b0] text-xs uppercase tracking-wider mb-1.5 font-bold">
                      {joinPlayers.length > 1 ? `P${idx + 1} ` : ""}Game UID *
                    </label>
                    <input type="text" placeholder="Free Fire UID"
                      value={player.uid}
                      onChange={(e) => updatePlayer(idx, "uid", e.target.value)}
                      className="w-full bg-[#0a0a0f] border border-[#2a2a36] rounded-xl px-3 py-2.5 text-white text-sm font-mono placeholder-[#4a4a5a] focus:outline-none focus:border-[#ff6b00] transition-colors"
                    />
                  </div>
                  {idx < joinPlayers.length - 1 && <div className="border-t border-[#2a2a36]" />}
                </div>
              ))}
              {joinMatch.isPasswordProtected && (
                <div>
                  <label className="block text-xs uppercase tracking-wider mb-1.5 font-bold flex items-center gap-1.5">
                    <Lock className="w-3 h-3 text-yellow-400" />
                    <span className="text-yellow-400">Match Password *</span>
                  </label>
                  <input type="password" placeholder="Enter match password"
                    value={joinPassword}
                    onChange={(e) => setJoinPassword(e.target.value)}
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
