import { useState, useEffect } from "react";
import { useRoute, Link } from "wouter";
import {
  ArrowLeft, Lock, Timer, Zap, Clock, ChevronDown, ChevronUp, Eye,
  Swords, Users, Trophy, Target, Map, Globe, RefreshCw,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CountdownTimer from "@/components/CountdownTimer";
import { useAuthContext } from "@/lib/AuthContext";
import { useToast } from "@/hooks/use-toast";

const CATEGORY_META: Record<string, {
  label: string; sub: string; icon: string;
  color: string; accentFrom: string; accentTo: string;
  typeKey: string;
}> = {
  BR:        { label: "BR Match",          sub: "Battle Royale",         icon: "🔥", color: "#ff6b00", accentFrom: "#ff6b00", accentTo: "#ff2244", typeKey: "BR" },
  CS:        { label: "Clash Squad",       sub: "CS Mode · 4v4",         icon: "⚔️",  color: "#00b4ff", accentFrom: "#00b4ff", accentTo: "#0055ff", typeKey: "CS" },
  SOLO:      { label: "Solo Survival",     sub: "Every player for themselves", icon: "🎯", color: "#ffd700", accentFrom: "#ffd700", accentTo: "#ff9500", typeKey: "SOLO" },
  LONE_WOLF: { label: "Lone Wolf",         sub: "1v1 elimination format", icon: "🐺", color: "#a855f7", accentFrom: "#a855f7", accentTo: "#6366f1", typeKey: "LONE_WOLF" },
  FREE:      { label: "Free Match",        sub: "Giveaways & open rooms", icon: "🎁", color: "#00ff88", accentFrom: "#00ff88", accentTo: "#00b4ff", typeKey: "FREE" },
};

const TYPE_LABEL: Record<string, string> = {
  BR: "Battle Royale", CS: "Clash Squad", SOLO: "Solo", LONE_WOLF: "Lone Wolf", FREE: "Giveaway",
  "1v1": "1v1", "2v2": "2v2", "3v3": "3v3", "4v4": "4v4",
};

const MAP_OPTIONS = ["Bermuda", "Kalahari", "Alpine", "Purgatory", "Nexterra", "Other"];

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

function fmtSchedule(dt: string | null | undefined): string {
  if (!dt) return "TBA";
  const d = new Date(dt);
  return d.toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: true });
}

export default function MatchCategoryPage() {
  const [, params] = useRoute("/matches/:category");
  const category = (params?.category ?? "BR").toUpperCase();
  const meta = CATEGORY_META[category] ?? CATEGORY_META["BR"];

  const { user, authFetch } = useAuthContext();
  const { toast } = useToast();

  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [myJoinMap, setMyJoinMap] = useState<Record<number, { adminRoomId: string | null; adminRoomPassword: string | null; status: string }>>({});
  const [expandedCredentials, setExpandedCredentials] = useState<Record<number, boolean>>({});
  const [, setTick] = useState(0);

  // Join modal state
  const [joinMatch, setJoinMatch] = useState<any>(null);
  const [joinPlayers, setJoinPlayers] = useState<{ name: string; uid: string }[]>([{ name: "", uid: "" }]);
  const [joinPassword, setJoinPassword] = useState("");
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [joining, setJoining] = useState(false);

  const playersForType = (t: string) => {
    const m: Record<string, number> = { "1v1": 1, "2v2": 2, "3v3": 3, "4v4": 4, BR: 1, CS: 4, SOLO: 1, LONE_WOLF: 1, FREE: 1 };
    return m[t] ?? 1;
  };

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30000);
    return () => clearInterval(id);
  }, []);

  const fetchMatches = () => {
    setLoading(true);
    fetch("/api/user-matches")
      .then((r) => r.json())
      .then((d) => {
        const all = Array.isArray(d) ? d : [];
        setMatches(all.filter((m: any) => m.matchType === meta.typeKey));
      })
      .catch(() => setMatches([]))
      .finally(() => setLoading(false));
  };

  const fetchMyJoins = async () => {
    if (!user) return;
    try {
      const r = await authFetch("/user-matches/my-requests");
      if (!r.ok) return;
      const data: any[] = await r.json();
      const map: Record<number, any> = {};
      for (const j of data) {
        if (j.status === "accepted") {
          map[j.matchId] = { adminRoomId: j.adminRoomId ?? null, adminRoomPassword: j.adminRoomPassword ?? null, status: j.status };
        }
      }
      setMyJoinMap(map);
    } catch {}
  };

  useEffect(() => { fetchMatches(); }, [category]);
  useEffect(() => {
    if (!user) { setMyJoinMap({}); return; }
    fetchMyJoins();
    const id = setInterval(fetchMyJoins, 30000);
    return () => clearInterval(id);
  }, [user]);

  useEffect(() => {
    if (user && joinMatch && Number(joinMatch.entryFee) > 0) {
      authFetch("/wallet/balance")
        .then((r) => r.ok ? r.json() : null)
        .then((d) => d && setWalletBalance(d.balance ?? 0))
        .catch(() => {});
    }
  }, [user, joinMatch]);

  const openJoin = (m: any) => {
    if (!user) {
      toast({ title: "Sign in required", description: "Please sign in to join a match.", variant: "destructive" });
      return;
    }
    const count = playersForType(m.matchType);
    setJoinMatch(m);
    setJoinPlayers(Array.from({ length: count }, () => ({ name: "", uid: "" })));
    setJoinPassword("");
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
          players: joinPlayers.map((p) => ({ name: p.name.trim(), uid: p.uid.trim() })),
          ...(joinMatch.isPasswordProtected ? { password: joinPassword } : {}),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast({ title: data.isPending ? "Request Sent!" : "Joined!", description: data.isPending ? "The creator will review your request." : "You've joined the match!" });
        if (!data.isPending) {
          setMatches((prev) => prev.map((m) => m.id === joinMatch.id ? { ...m, filledSlots: m.filledSlots + 1 } : m));
          fetchMyJoins();
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
      <div className="max-w-5xl mx-auto px-4 pt-16 pb-24">

        {/* Back breadcrumb */}
        <div className="flex items-center gap-2 mt-4 mb-6">
          <Link href="/tournaments" className="flex items-center gap-1.5 text-[#a0a0b0] hover:text-white transition-colors text-sm font-bold">
            <ArrowLeft className="w-4 h-4" /> Tournaments
          </Link>
          <span className="text-[#3a3a46]">/</span>
          <span className="text-white font-bold text-sm">{meta.label}</span>
        </div>

        {/* Category header banner */}
        <div
          className="relative rounded-2xl overflow-hidden mb-8 p-6"
          style={{ background: `linear-gradient(135deg, ${meta.accentFrom}18 0%, ${meta.accentTo}08 100%)`, border: `1px solid ${meta.color}25` }}
        >
          <div className="absolute inset-0 opacity-5" style={{ backgroundImage: "radial-gradient(circle at 80% 50%, white 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
          <div className="relative flex items-center gap-4">
            <div className="text-5xl leading-none">{meta.icon}</div>
            <div>
              <h1 className="text-3xl font-black uppercase tracking-tight" style={{ color: meta.color }}>{meta.label}</h1>
              <p className="text-[#a0a0b0] text-sm mt-1">{meta.sub}</p>
            </div>
            <div className="ml-auto text-right">
              <div className="text-2xl font-black text-white">{loading ? "—" : matches.length}</div>
              <div className="text-[#606070] text-xs uppercase">Matches</div>
            </div>
          </div>
        </div>

        {/* Match list */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 bg-[#12121a] rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : matches.length === 0 ? (
          <div className="text-center py-20 border border-dashed border-[#2a2a36] rounded-2xl">
            <div className="text-5xl mb-4">{meta.icon}</div>
            <h3 className="text-lg font-bold text-white mb-2">No {meta.label} matches yet</h3>
            <p className="text-[#606070] text-sm">Check back soon — or create the first one!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {matches.map((m: any) => {
              const effStatus = getEffectiveStatus(m);
              const isLive = !!m.credentialsReleased;
              const isFull = m.filledSlots >= m.maxSlots;
              const startsAt = getStartsAt(m);
              const isTimerRunning = !!m.timerStartedAt && !isLive;
              const isEnded = effStatus === "ended" || effStatus === "cancelled";
              const myJoin = myJoinMap[m.id];
              const hasCredentials = !!myJoin && !!myJoin.adminRoomId;
              const credsExpanded = !!expandedCredentials[m.id];
              const slotPct = Math.round((m.filledSlots / m.maxSlots) * 100);

              return (
                <div
                  key={m.id}
                  className={`bg-[#12121a] border rounded-2xl overflow-hidden transition-all ${
                    isLive ? "border-[#00ff88]/30 shadow-[0_0_20px_rgba(0,255,136,0.04)]"
                           : "border-[#2a2a36] hover:border-[#3a3a46]"
                  } ${isEnded ? "opacity-60" : ""}`}
                >
                  {/* Accent top bar */}
                  <div
                    className="h-[3px] w-full"
                    style={{ background: isLive ? "#00ff88" : isEnded ? "#2a2a36" : meta.color }}
                  />

                  <div className="p-4 md:p-5">
                    {/* ── Row 1: status + header info ── */}
                    <div className="flex items-start gap-4 mb-4">
                      {/* Left icon block */}
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0 border"
                        style={{ background: `${meta.color}15`, borderColor: `${meta.color}25` }}
                      >
                        {meta.icon}
                      </div>

                      {/* Title + schedule */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          {isLive ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase text-[#00ff88] bg-[#00ff88]/10 border border-[#00ff88]/30 px-2 py-0.5 rounded-full">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#00ff88] animate-pulse" /> LIVE
                            </span>
                          ) : isEnded ? (
                            <span className="text-[10px] font-black uppercase text-[#606070] bg-[#1a1a24] border border-[#2a2a36] px-2 py-0.5 rounded-full">ENDED</span>
                          ) : (
                            <span className="text-[10px] font-black uppercase text-[#a0a0b0] bg-[#1a1a24] border border-[#2a2a36] px-2 py-0.5 rounded-full">UPCOMING</span>
                          )}
                          {m.isPasswordProtected && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-400 border border-yellow-500/25">
                              <Lock className="w-2.5 h-2.5" /> Protected
                            </span>
                          )}
                        </div>
                        <h3 className="text-base md:text-lg font-black text-white leading-tight truncate">
                          {m.matchName || `${TYPE_LABEL[m.matchType] ?? m.matchType} Match`}
                        </h3>
                        <div className="flex items-center gap-3 mt-1 flex-wrap">
                          <span className="text-[#606070] text-xs">by {m.creatorName || "Player"}</span>
                          {m.scheduledAt && (
                            <span className="flex items-center gap-1 text-[#a0a0b0] text-xs">
                              <Clock className="w-3 h-3" /> {fmtSchedule(m.scheduledAt)}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Countdown (desktop) */}
                      {isTimerRunning && startsAt && (
                        <div className="hidden md:flex items-center gap-1.5 text-[#ff6b00] bg-[#ff6b00]/5 border border-[#ff6b00]/15 rounded-xl px-3 py-2 shrink-0">
                          <Timer className="w-3.5 h-3.5 shrink-0" />
                          <CountdownTimer targetDate={startsAt} className="text-xs font-black" />
                        </div>
                      )}
                    </div>

                    {/* Countdown (mobile) */}
                    {isTimerRunning && startsAt && (
                      <div className="flex md:hidden items-center gap-1.5 text-[#ff6b00] bg-[#ff6b00]/5 border border-[#ff6b00]/15 rounded-lg px-3 py-2 mb-3">
                        <Timer className="w-3 h-3 shrink-0" />
                        <span className="text-[11px] font-bold">Starts in </span>
                        <CountdownTimer targetDate={startsAt} className="text-[11px] font-black" />
                      </div>
                    )}

                    {/* ── Row 2: 6-field info grid ── */}
                    <div className="grid grid-cols-3 md:grid-cols-6 gap-2 mb-4">
                      <div className="bg-[#0a0a0f] rounded-xl p-2.5 text-center border border-[#1a1a24]">
                        <div className="flex items-center justify-center gap-1 mb-1">
                          <Trophy className="w-3 h-3 text-[#ffd700]" />
                          <span className="text-[9px] font-bold uppercase text-[#606070]">WIN PRIZE</span>
                        </div>
                        <div className="text-[#ffd700] font-black text-sm">
                          {Number(m.prizePool) > 0 ? `৳${Number(m.prizePool).toLocaleString()}` : "—"}
                        </div>
                      </div>

                      <div className="bg-[#0a0a0f] rounded-xl p-2.5 text-center border border-[#1a1a24]">
                        <div className="flex items-center justify-center gap-1 mb-1">
                          <Users className="w-3 h-3 text-[#a0a0b0]" />
                          <span className="text-[9px] font-bold uppercase text-[#606070]">ENTRY TYPE</span>
                        </div>
                        <div className="text-white font-black text-xs">{TYPE_LABEL[m.matchType] ?? m.matchType}</div>
                      </div>

                      <div className="bg-[#0a0a0f] rounded-xl p-2.5 text-center border border-[#1a1a24]">
                        <div className="flex items-center justify-center gap-1 mb-1">
                          <span className="text-[9px] font-bold uppercase text-[#606070]">ENTRY FEE</span>
                        </div>
                        <div className={`font-black text-sm ${Number(m.entryFee) > 0 ? "text-[#ff6b00]" : "text-[#00ff88]"}`}>
                          {Number(m.entryFee) > 0 ? `৳${Number(m.entryFee)}` : "Free"}
                        </div>
                      </div>

                      <div className="bg-[#0a0a0f] rounded-xl p-2.5 text-center border border-[#1a1a24]">
                        <div className="flex items-center justify-center gap-1 mb-1">
                          <Target className="w-3 h-3 text-[#a0a0b0]" />
                          <span className="text-[9px] font-bold uppercase text-[#606070]">PER KILL</span>
                        </div>
                        <div className="text-white font-black text-sm">
                          {m.perKill && Number(m.perKill) > 0 ? `৳${Number(m.perKill)}` : "—"}
                        </div>
                      </div>

                      <div className="bg-[#0a0a0f] rounded-xl p-2.5 text-center border border-[#1a1a24]">
                        <div className="flex items-center justify-center gap-1 mb-1">
                          <Map className="w-3 h-3 text-[#a0a0b0]" />
                          <span className="text-[9px] font-bold uppercase text-[#606070]">MAP</span>
                        </div>
                        <div className="text-white font-black text-xs truncate">{m.mapName || "—"}</div>
                      </div>

                      <div className="bg-[#0a0a0f] rounded-xl p-2.5 text-center border border-[#1a1a24]">
                        <div className="flex items-center justify-center gap-1 mb-1">
                          <Globe className="w-3 h-3 text-[#a0a0b0]" />
                          <span className="text-[9px] font-bold uppercase text-[#606070]">VERSION</span>
                        </div>
                        <div className="text-white font-black text-xs truncate">{m.version || "—"}</div>
                      </div>
                    </div>

                    {/* ── Row 3: slot progress bar + join button ── */}
                    <div className="flex items-center gap-3 mb-3">
                      <div className="flex-1">
                        <div className="flex justify-between text-xs mb-1.5">
                          <span className="text-[#a0a0b0] font-bold flex items-center gap-1">
                            <Users className="w-3 h-3" /> {m.filledSlots}/{m.maxSlots} slots
                          </span>
                          <span className={`font-black text-xs ${isFull ? "text-[#ff2244]" : "text-[#00ff88]"}`}>
                            {isFull ? "FULL" : `${m.maxSlots - m.filledSlots} left`}
                          </span>
                        </div>
                        <div className="h-2 bg-[#1a1a24] rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${slotPct}%`,
                              background: isFull
                                ? "#ff2244"
                                : slotPct > 75
                                ? "linear-gradient(90deg,#ff9500,#ff2244)"
                                : "linear-gradient(90deg,#00ff88,#00b4ff)",
                            }}
                          />
                        </div>
                      </div>

                      {/* Join button */}
                      <div className="shrink-0">
                        {isEnded ? (
                          <div className="px-4 py-2 rounded-xl bg-[#1a1a24] text-[#606070] text-xs font-black uppercase text-center">
                            Ended
                          </div>
                        ) : isFull ? (
                          <div className="px-4 py-2 rounded-xl bg-[#ff2244]/10 border border-[#ff2244]/20 text-[#ff2244] text-xs font-black uppercase text-center">
                            Full
                          </div>
                        ) : myJoin ? (
                          <div className="px-4 py-2 rounded-xl bg-[#00ff88]/10 border border-[#00ff88]/20 text-[#00ff88] text-xs font-black uppercase text-center">
                            ✓ Joined
                          </div>
                        ) : (
                          <button
                            onClick={() => openJoin(m)}
                            className="flex items-center gap-1.5 px-5 py-2 text-xs font-black uppercase rounded-xl transition-all"
                            style={{
                              background: isLive ? "#00ff88" : meta.color,
                              color: isLive ? "#000" : "#fff",
                              boxShadow: `0 4px 16px ${isLive ? "rgba(0,255,136,0.2)" : `${meta.color}33`}`,
                            }}
                          >
                            {isLive ? <><Zap className="w-3.5 h-3.5" /> Join Live</> : "Join →"}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* ── Row 4: Room Details accordion ── */}
                    {hasCredentials && myJoin ? (
                      <div className="border border-[#00ff88]/20 rounded-xl overflow-hidden">
                        <button
                          onClick={() => setExpandedCredentials((prev) => ({ ...prev, [m.id]: !prev[m.id] }))}
                          className="w-full flex items-center justify-between gap-2 px-3.5 py-2.5 bg-[#00ff88]/5 hover:bg-[#00ff88]/10 transition-colors text-left"
                        >
                          <span className="flex items-center gap-1.5 text-[#00ff88] text-xs font-black uppercase">
                            🔑 Room Details
                          </span>
                          {credsExpanded ? <ChevronUp className="w-3.5 h-3.5 text-[#00ff88]" /> : <ChevronDown className="w-3.5 h-3.5 text-[#00ff88]" />}
                        </button>
                        {credsExpanded && (
                          <div className="px-3.5 py-3 bg-[#0a0a0f] space-y-2.5 border-t border-[#00ff88]/10">
                            <div className="flex justify-between items-center gap-2">
                              <span className="text-[#a0a0b0] text-xs shrink-0">Room ID</span>
                              <span className="text-white font-black font-mono text-sm bg-[#12121a] px-3 py-1 rounded-lg border border-[#2a2a36] select-all">
                                {myJoin.adminRoomId}
                              </span>
                            </div>
                            {myJoin.adminRoomPassword && (
                              <div className="flex justify-between items-center gap-2">
                                <span className="text-[#a0a0b0] text-xs shrink-0">Password</span>
                                <span className="text-white font-black font-mono text-sm bg-[#12121a] px-3 py-1 rounded-lg border border-[#2a2a36] select-all">
                                  {myJoin.adminRoomPassword}
                                </span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ) : myJoin ? (
                      <div className="flex items-center gap-2 px-3.5 py-2.5 bg-blue-500/5 border border-blue-500/20 rounded-xl">
                        <Clock className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                        <span className="text-blue-400 text-xs font-bold">
                          Room credentials will unlock 10 mins before the match for joined players only.
                        </span>
                      </div>
                    ) : (
                      <button
                        disabled
                        className="w-full flex items-center justify-center gap-2 px-3.5 py-2.5 bg-[#1a1a24] border border-[#2a2a36] rounded-xl text-[#606070] text-xs font-bold cursor-not-allowed"
                      >
                        🔒 Room credentials will unlock 10 mins before the match for joined players only.
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Refresh */}
        <div className="flex justify-center mt-8">
          <button
            onClick={() => { fetchMatches(); fetchMyJoins(); }}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#12121a] border border-[#2a2a36] rounded-xl text-[#a0a0b0] hover:text-white hover:border-[#3a3a46] transition-all text-sm font-bold"
          >
            <RefreshCw className="w-4 h-4" /> Refresh Matches
          </button>
        </div>
      </div>
      <Footer />

      {/* ── Join Modal ── */}
      {joinMatch && (
        <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setJoinMatch(null)} />
          <div className="relative w-full sm:max-w-sm bg-[#0d0d16] border border-[#ff6b00]/20 rounded-t-3xl sm:rounded-2xl p-5 z-10 max-h-[90vh] overflow-y-auto">
            <div className="sm:hidden w-12 h-1 bg-[#2a2a36] rounded-full mx-auto mb-4" />
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-black text-white">Join Match</h3>
                <p className="text-[#606070] text-xs">{joinMatch.matchName || `${TYPE_LABEL[joinMatch.matchType] ?? joinMatch.matchType} Match`}</p>
              </div>
              <button onClick={() => setJoinMatch(null)} className="w-8 h-8 rounded-full bg-[#1a1a24] flex items-center justify-center text-[#a0a0b0] hover:text-white">
                ✕
              </button>
            </div>

            {Number(joinMatch.entryFee) > 0 && (
              <div className="mb-3 p-3 bg-[#ff6b00]/10 border border-[#ff6b00]/20 rounded-xl text-xs text-[#a0a0b0]">
                Entry Fee: <span className="text-[#ff6b00] font-black">৳{Number(joinMatch.entryFee)}</span>
                {walletBalance !== null && (
                  <span className="ml-2">(Wallet: <span className={walletBalance < Number(joinMatch.entryFee) ? "text-red-400 font-bold" : "text-[#00ff88] font-bold"}>৳{walletBalance}</span>)</span>
                )}
              </div>
            )}

            <div className="space-y-3 mb-4">
              {joinPlayers.map((p, i) => (
                <div key={i} className="space-y-2">
                  {joinPlayers.length > 1 && <p className="text-[#a0a0b0] text-xs font-bold uppercase">Player {i + 1}</p>}
                  <input
                    type="text" placeholder="In-game name" value={p.name}
                    onChange={(e) => setJoinPlayers((prev) => prev.map((x, j) => j === i ? { ...x, name: e.target.value } : x))}
                    className="w-full bg-[#0a0a0f] border border-[#2a2a36] rounded-xl px-4 py-2.5 text-white text-sm placeholder-[#4a4a5a] focus:outline-none focus:border-[#ff6b00] transition-colors"
                  />
                  <input
                    type="text" placeholder="Free Fire UID" value={p.uid}
                    onChange={(e) => setJoinPlayers((prev) => prev.map((x, j) => j === i ? { ...x, uid: e.target.value } : x))}
                    className="w-full bg-[#0a0a0f] border border-[#2a2a36] rounded-xl px-4 py-2.5 text-white text-sm placeholder-[#4a4a5a] focus:outline-none focus:border-[#ff6b00] transition-colors"
                  />
                </div>
              ))}
            </div>

            {joinMatch.isPasswordProtected && (
              <div className="mb-4">
                <input
                  type="password" placeholder="Match password" value={joinPassword}
                  onChange={(e) => setJoinPassword(e.target.value)}
                  className="w-full bg-[#0a0a0f] border border-yellow-500/30 rounded-xl px-4 py-2.5 text-white text-sm placeholder-[#4a4a5a] focus:outline-none focus:border-yellow-400 transition-colors"
                />
              </div>
            )}

            <div className="flex gap-2">
              <button onClick={() => setJoinMatch(null)} className="flex-1 py-2.5 bg-[#1a1a24] border border-[#2a2a36] text-white font-bold uppercase rounded-xl text-sm hover:bg-[#2a2a36] transition-colors">
                Cancel
              </button>
              <button onClick={doJoin} disabled={joinDisabled}
                className="flex-1 py-2.5 bg-[#ff6b00] text-white font-black uppercase rounded-xl text-sm hover:bg-[#e66000] disabled:opacity-40 transition-all">
                {joining ? "Joining..." : "Confirm Join"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
