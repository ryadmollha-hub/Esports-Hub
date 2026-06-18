import { useState, useEffect, useRef } from "react";
import {
  Search, Trophy, Swords, Lock, X, Timer, Zap, Clock,
  ChevronDown, ChevronUp, Eye, Users, Target, Map, Globe,
  ChevronLeft, ChevronRight, RefreshCw,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import TournamentCard from "@/components/TournamentCard";
import CountdownTimer from "@/components/CountdownTimer";
import { useListTournaments, getListTournamentsQueryKey } from "@workspace/api-client-react";
import { useAuthContext } from "@/lib/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";

// ─── Category definitions ────────────────────────────────────────────────────

const CATEGORIES = [
  { slug: "BR",        label: "BR Match",      sub: "Battle Royale · 48 players",    icon: "🔥", color: "#ff6b00", typeKey: "BR" },
  { slug: "CS",        label: "Clash Squad",   sub: "CS Mode · 4v4 team battles",    icon: "⚔️",  color: "#00b4ff", typeKey: "CS" },
  { slug: "SOLO",      label: "Solo Survival", sub: "Every player for themselves",   icon: "🎯", color: "#ffd700", typeKey: "SOLO" },
  { slug: "LONE_WOLF", label: "Lone Wolf",     sub: "1v1 elimination format",        icon: "🐺", color: "#a855f7", typeKey: "LONE_WOLF" },
  { slug: "FREE",      label: "Free Match",    sub: "Giveaways & open rooms",        icon: "🎁", color: "#00ff88", typeKey: "FREE" },
];

const TYPE_LABEL: Record<string, string> = {
  BR: "Battle Royale", CS: "Clash Squad", SOLO: "Solo",
  LONE_WOLF: "Lone Wolf", FREE: "Giveaway",
  "1v1": "1v1", "2v2": "2v2", "3v3": "3v3", "4v4": "4v4",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

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

function fmtTime(dt: string | null | undefined): string {
  if (!dt) return "";
  const d = new Date(dt);
  return d.toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: true });
}

// ─── Horizontal scroll row ───────────────────────────────────────────────────

function HScrollRow({ children, color }: { children: React.ReactNode; color: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const scroll = (dir: "left" | "right") => {
    ref.current?.scrollBy({ left: dir === "left" ? -300 : 300, behavior: "smooth" });
  };
  return (
    <div className="relative group/row">
      {/* Left arrow */}
      <button
        onClick={() => scroll("left")}
        className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-3 z-10 w-8 h-8 rounded-full bg-[#12121a] border border-[#2a2a36] flex items-center justify-center text-[#a0a0b0] hover:text-white hover:border-[#3a3a46] transition-all opacity-0 group-hover/row:opacity-100 shadow-lg"
        style={{ boxShadow: `0 0 12px 2px ${color}22` }}
      >
        <ChevronLeft className="w-4 h-4" />
      </button>
      {/* Right arrow */}
      <button
        onClick={() => scroll("right")}
        className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-3 z-10 w-8 h-8 rounded-full bg-[#12121a] border border-[#2a2a36] flex items-center justify-center text-[#a0a0b0] hover:text-white hover:border-[#3a3a46] transition-all opacity-0 group-hover/row:opacity-100 shadow-lg"
        style={{ boxShadow: `0 0 12px 2px ${color}22` }}
      >
        <ChevronRight className="w-4 h-4" />
      </button>
      <div
        ref={ref}
        className="flex gap-3 overflow-x-auto pb-2 scroll-smooth"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {children}
      </div>
    </div>
  );
}

// ─── Match card ───────────────────────────────────────────────────────────────

function MatchCard({
  m,
  catColor,
  myJoin,
  credsExpanded,
  onToggleCreds,
  onJoin,
}: {
  m: any;
  catColor: string;
  myJoin: { adminRoomId: string | null; adminRoomPassword: string | null; status: string } | undefined;
  credsExpanded: boolean;
  onToggleCreds: () => void;
  onJoin: () => void;
}) {
  const effStatus = getEffectiveStatus(m);
  const isLive = !!m.credentialsReleased;
  const isFull = m.filledSlots >= m.maxSlots;
  const startsAt = getStartsAt(m);
  const isTimerRunning = !!m.timerStartedAt && !isLive;
  const isEnded = effStatus === "ended" || effStatus === "cancelled";
  const hasCredentials = !!myJoin && !!myJoin.adminRoomId;
  const slotPct = Math.round((m.filledSlots / m.maxSlots) * 100);

  return (
    <div
      className={`shrink-0 w-72 flex flex-col bg-[#12121a] border rounded-2xl overflow-hidden transition-all ${
        isLive ? "border-[#00ff88]/35 shadow-[0_0_18px_rgba(0,255,136,0.06)]"
               : "border-[#2a2a36] hover:border-[#3a3a46]"
      } ${isEnded ? "opacity-55" : ""}`}
    >
      {/* Accent bar */}
      <div className="h-[3px] w-full" style={{ background: isLive ? "#00ff88" : isEnded ? "#2a2a36" : catColor }} />

      <div className="p-3.5 flex flex-col gap-2.5 flex-1">
        {/* Status row */}
        <div className="flex items-center justify-between gap-1.5">
          {isLive ? (
            <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase text-[#00ff88] bg-[#00ff88]/10 border border-[#00ff88]/30 px-2 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00ff88] animate-pulse" /> LIVE
            </span>
          ) : isEnded ? (
            <span className="text-[9px] font-black uppercase text-[#606070] bg-[#1a1a24] border border-[#2a2a36] px-2 py-0.5 rounded-full">ENDED</span>
          ) : (
            <span className="text-[9px] font-black uppercase text-[#a0a0b0] bg-[#1a1a24] border border-[#2a2a36] px-2 py-0.5 rounded-full">UPCOMING</span>
          )}
          {m.isPasswordProtected && (
            <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-yellow-400 border border-yellow-500/25 px-1.5 py-0.5 rounded-full bg-yellow-500/10">
              <Lock className="w-2.5 h-2.5" />
            </span>
          )}
        </div>

        {/* Title + creator */}
        <div>
          <h3 className="text-[13px] font-black text-white leading-tight truncate">
            {m.matchName || `${TYPE_LABEL[m.matchType] ?? m.matchType} Match`}
          </h3>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <span className="text-[#606070] text-[10px]">by {m.creatorName || "Player"}</span>
            {m.scheduledAt && (
              <span className="text-[#4a4a5a] text-[10px] flex items-center gap-0.5">
                <Clock className="w-2.5 h-2.5" /> {fmtTime(m.scheduledAt)}
              </span>
            )}
          </div>
        </div>

        {/* Countdown */}
        {isTimerRunning && startsAt && (
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[#ff6b00]" style={{ background: `${catColor}08`, borderColor: `${catColor}20` }}>
            <Timer className="w-3 h-3 shrink-0" />
            <span className="text-[10px] font-bold">Starts in </span>
            <CountdownTimer targetDate={startsAt} className="text-[10px] font-black" />
          </div>
        )}

        {/* Stats grid: 3 cols */}
        <div className="grid grid-cols-3 gap-1">
          <div className="bg-[#0a0a0f] rounded-lg p-1.5 text-center border border-[#1a1a24]">
            <div className="text-[#ffd700] font-black text-xs">
              {Number(m.prizePool) > 0 ? `৳${Number(m.prizePool).toLocaleString()}` : "—"}
            </div>
            <div className="text-[#606070] text-[8px] uppercase mt-0.5">Prize</div>
          </div>
          <div className="bg-[#0a0a0f] rounded-lg p-1.5 text-center border border-[#1a1a24]">
            <div className={`font-black text-xs ${Number(m.entryFee) > 0 ? "text-[#ff6b00]" : "text-[#00ff88]"}`}>
              {Number(m.entryFee) > 0 ? `৳${Number(m.entryFee)}` : "Free"}
            </div>
            <div className="text-[#606070] text-[8px] uppercase mt-0.5">Entry</div>
          </div>
          <div className="bg-[#0a0a0f] rounded-lg p-1.5 text-center border border-[#1a1a24]">
            <div className={`font-black text-xs ${isFull ? "text-[#ff2244]" : "text-[#00ff88]"}`}>
              {m.filledSlots}/{m.maxSlots}
            </div>
            <div className="text-[#606070] text-[8px] uppercase mt-0.5">Slots</div>
          </div>
        </div>

        {/* Extra info row (per kill / map / version) if present */}
        {(m.perKill || m.mapName || m.version) && (
          <div className="flex items-center gap-2 flex-wrap">
            {m.perKill && Number(m.perKill) > 0 && (
              <span className="inline-flex items-center gap-1 text-[9px] font-bold text-[#a0a0b0] bg-[#1a1a24] border border-[#2a2a36] px-1.5 py-0.5 rounded-md">
                <Target className="w-2.5 h-2.5" /> ৳{Number(m.perKill)}/kill
              </span>
            )}
            {m.mapName && (
              <span className="inline-flex items-center gap-1 text-[9px] font-bold text-[#a0a0b0] bg-[#1a1a24] border border-[#2a2a36] px-1.5 py-0.5 rounded-md">
                <Map className="w-2.5 h-2.5" /> {m.mapName}
              </span>
            )}
            {m.version && (
              <span className="inline-flex items-center gap-1 text-[9px] font-bold text-[#a0a0b0] bg-[#1a1a24] border border-[#2a2a36] px-1.5 py-0.5 rounded-md">
                <Globe className="w-2.5 h-2.5" /> {m.version}
              </span>
            )}
          </div>
        )}

        {/* Slot progress bar */}
        <div>
          <div className="h-1.5 bg-[#1a1a24] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${slotPct}%`,
                background: isFull
                  ? "#ff2244"
                  : slotPct > 75
                  ? "linear-gradient(90deg,#ff9500,#ff2244)"
                  : `linear-gradient(90deg,${catColor},${catColor}99)`,
              }}
            />
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-[9px] text-[#606070]">{m.filledSlots} joined</span>
            <span className={`text-[9px] font-bold ${isFull ? "text-[#ff2244]" : "text-[#a0a0b0]"}`}>
              {isFull ? "FULL" : `${m.maxSlots - m.filledSlots} left`}
            </span>
          </div>
        </div>

        {/* Room credentials accordion (push to bottom) */}
        <div className="mt-auto">
          {hasCredentials && myJoin ? (
            <div className="border border-[#00ff88]/20 rounded-xl overflow-hidden mb-2">
              <button
                onClick={onToggleCreds}
                className="w-full flex items-center justify-between gap-2 px-3 py-2 bg-[#00ff88]/5 hover:bg-[#00ff88]/10 transition-colors"
              >
                <span className="flex items-center gap-1.5 text-[#00ff88] text-[10px] font-black uppercase">
                  🔑 Room Details
                </span>
                {credsExpanded ? <ChevronUp className="w-3 h-3 text-[#00ff88]" /> : <ChevronDown className="w-3 h-3 text-[#00ff88]" />}
              </button>
              {credsExpanded && (
                <div className="px-3 py-2 bg-[#0a0a0f] space-y-1.5 border-t border-[#00ff88]/10">
                  <div className="flex justify-between items-center gap-2">
                    <span className="text-[#a0a0b0] text-[10px]">Room ID</span>
                    <span className="text-white font-black text-xs font-mono bg-[#12121a] px-2 py-0.5 rounded border border-[#2a2a36] select-all">
                      {myJoin.adminRoomId}
                    </span>
                  </div>
                  {myJoin.adminRoomPassword && (
                    <div className="flex justify-between items-center gap-2">
                      <span className="text-[#a0a0b0] text-[10px]">Password</span>
                      <span className="text-white font-black text-xs font-mono bg-[#12121a] px-2 py-0.5 rounded border border-[#2a2a36] select-all">
                        {myJoin.adminRoomPassword}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : myJoin ? (
            <div className="flex items-start gap-1.5 px-2.5 py-2 bg-blue-500/5 border border-blue-500/15 rounded-xl mb-2">
              <Clock className="w-3 h-3 text-blue-400 shrink-0 mt-0.5" />
              <span className="text-blue-400 text-[9px] font-bold leading-tight">
                Room credentials unlock 10 min before match for joined players only.
              </span>
            </div>
          ) : (
            <div className="flex items-start gap-1.5 px-2.5 py-2 bg-[#1a1a24] border border-[#2a2a36] rounded-xl mb-2">
              <Lock className="w-3 h-3 text-[#606070] shrink-0 mt-0.5" />
              <span className="text-[#606070] text-[9px] font-bold leading-tight">
                Room credentials unlock 10 min before match for joined players only.
              </span>
            </div>
          )}

          {/* Join / status button */}
          {isEnded ? (
            <div className="w-full py-2 rounded-xl bg-[#1a1a24] text-[#606070] text-[10px] font-black uppercase text-center">
              Match Ended
            </div>
          ) : isFull ? (
            <div className="w-full py-2 rounded-xl bg-[#ff2244]/10 border border-[#ff2244]/20 text-[#ff2244] text-[10px] font-black uppercase text-center">
              Match Full
            </div>
          ) : myJoin ? (
            <div className="w-full py-2 rounded-xl bg-[#00ff88]/10 border border-[#00ff88]/20 text-[#00ff88] text-[10px] font-black uppercase text-center">
              ✓ You've Joined
            </div>
          ) : (
            <button
              onClick={onJoin}
              className="w-full py-2 text-[10px] font-black uppercase rounded-xl transition-all flex items-center justify-center gap-1.5"
              style={{
                background: isLive ? "#00ff88" : catColor,
                color: isLive ? "#000" : "#fff",
                boxShadow: `0 3px 12px ${isLive ? "rgba(0,255,136,0.2)" : catColor + "33"}`,
              }}
            >
              {isLive ? <><Zap className="w-3 h-3" /> Join Live</> : "Join Match →"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Empty placeholder card ───────────────────────────────────────────────────

function EmptyCard({ cat }: { cat: typeof CATEGORIES[0] }) {
  return (
    <div
      className="shrink-0 w-64 flex flex-col items-center justify-center gap-3 border border-dashed rounded-2xl p-6 text-center"
      style={{ borderColor: `${cat.color}25`, background: `${cat.color}06` }}
    >
      <div className="text-3xl opacity-40">{cat.icon}</div>
      <div>
        <p className="text-[#606070] text-xs font-bold">No {cat.label} matches yet</p>
        <p className="text-[#3a3a46] text-[10px] mt-0.5">Be the first to create one!</p>
      </div>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

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

  // Community matches
  const [communityMatches, setCommunityMatches] = useState<any[]>([]);
  const [communityLoading, setCommunityLoading] = useState(true);
  const [myJoinMap, setMyJoinMap] = useState<Record<number, { adminRoomId: string | null; adminRoomPassword: string | null; status: string }>>({});
  const [expandedCredentials, setExpandedCredentials] = useState<Record<number, boolean>>({});
  const [, setTick] = useState(0);

  // Join modal
  const [joinMatch, setJoinMatch] = useState<any>(null);
  const [joinPlayers, setJoinPlayers] = useState<{ name: string; uid: string }[]>([{ name: "", uid: "" }]);
  const [joinPassword, setJoinPassword] = useState("");
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [joining, setJoining] = useState(false);

  const playersForType = (t: string) => {
    const map: Record<string, number> = { "1v1": 1, "2v2": 2, "3v3": 3, "4v4": 4, BR: 1, CS: 4, SOLO: 1, LONE_WOLF: 1, FREE: 1 };
    return map[t] ?? 1;
  };

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30000);
    return () => clearInterval(id);
  }, []);

  const fetchMyJoinRequests = async () => {
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
    if (!user) { setMyJoinMap({}); return; }
    fetchMyJoinRequests();
    const id = setInterval(fetchMyJoinRequests, 30000);
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
          setCommunityMatches((prev) => prev.map((m) => m.id === joinMatch.id ? { ...m, filledSlots: m.filledSlots + 1 } : m));
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

        {/* ── Page header ── */}
        <div className="mt-4 mb-5">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-black uppercase mb-1" data-testid="heading-tournaments">
            All <span className="text-[#ff6b00]">Tournaments</span>
          </h1>
          <p className="text-[#a0a0b0] text-sm">Find and join the hottest Free Fire competitions</p>
        </div>

        {/* ── Filters ── */}
        <div className="flex flex-col sm:flex-row gap-2 mb-6">
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
            <select value={mode} onChange={(e) => setMode(e.target.value)} data-testid="select-filter-mode"
              className="w-full px-3 py-2.5 bg-[#12121a] border border-[#2a2a36] rounded-xl text-white focus:outline-none focus:border-[#ff6b00] transition-colors text-sm">
              <option value="">All Modes</option>
              <option value="solo">Solo</option>
              <option value="duo">Duo</option>
              <option value="squad">Squad</option>
            </select>
            <select value={status} onChange={(e) => setStatus(e.target.value)} data-testid="select-filter-status"
              className="w-full px-3 py-2.5 bg-[#12121a] border border-[#2a2a36] rounded-xl text-white focus:outline-none focus:border-[#ff6b00] transition-colors text-sm">
              <option value="">All Status</option>
              <option value="upcoming">Upcoming</option>
              <option value="ongoing">Ongoing</option>
              <option value="completed">Completed</option>
            </select>
          </div>
        </div>

        {/* ── Official Tournaments ── */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {[1,2,3,4].map((i) => <div key={i} className="h-64 bg-[#12121a] rounded-2xl animate-pulse" data-testid={`skeleton-card-${i}`} />)}
          </div>
        ) : tournaments.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-[#2a2a36] rounded-2xl">
            <Trophy className="w-10 h-10 mx-auto mb-3 text-[#ff6b00]/25" />
            <h3 className="text-base font-bold text-white mb-1">No tournaments found</h3>
            <p className="text-[#a0a0b0] text-sm">Try adjusting your filters or check back later</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {tournaments.map((t: any) => <TournamentCard key={t.id} t={t} featured />)}
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────── */}
        {/* ── Community Matches — Categorized horizontal rows ── */}
        {/* ─────────────────────────────────────────────────────────── */}
        <div className="mt-16 pt-6 border-t border-[#1a1a28]">

          {/* Section header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight">
                Community <span className="text-[#ff6b00]">Matches</span>
              </h2>
              <p className="text-[#a0a0b0] text-sm mt-1">
                Player-created matches — browse by format
                {user && (
                  <Link href="/my-matches" className="ml-3 text-[#ff6b00] hover:underline font-bold">+ Create a Match</Link>
                )}
              </p>
            </div>
            <button
              onClick={() => { fetchCommunity(); fetchMyJoinRequests(); }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#12121a] border border-[#2a2a36] text-[#606070] hover:text-[#a0a0b0] hover:border-[#3a3a46] transition-colors text-xs font-bold uppercase"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </button>
          </div>

          {/* Category rows */}
          <div className="space-y-8">
            {CATEGORIES.map((cat) => {
              const catMatches = communityMatches.filter((m: any) => m.matchType === cat.typeKey);
              const liveCount = catMatches.filter((m: any) => !!m.credentialsReleased).length;

              return (
                <div key={cat.slug}>
                  {/* Category row header */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-xl border"
                        style={{ background: `${cat.color}15`, borderColor: `${cat.color}25` }}
                      >
                        {cat.icon}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-black uppercase tracking-tight" style={{ color: cat.color }}>
                            {cat.label}
                          </h3>
                          {liveCount > 0 && (
                            <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase text-[#00ff88] bg-[#00ff88]/10 border border-[#00ff88]/30 px-2 py-0.5 rounded-full">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#00ff88] animate-pulse" /> {liveCount} LIVE
                            </span>
                          )}
                          <span className="text-[10px] font-bold text-[#4a4a5a] bg-[#1a1a24] border border-[#2a2a36] px-2 py-0.5 rounded-full">
                            {communityLoading ? "…" : catMatches.length}
                          </span>
                        </div>
                        <p className="text-[#606070] text-[11px] mt-0">{cat.sub}</p>
                      </div>
                    </div>
                    <Link href={`/matches/${cat.slug}`}
                      className="text-[11px] font-black uppercase transition-colors hover:opacity-80 flex items-center gap-1"
                      style={{ color: cat.color }}>
                      View All →
                    </Link>
                  </div>

                  {/* Horizontal scroll row */}
                  {communityLoading ? (
                    <div className="flex gap-3 overflow-hidden">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="shrink-0 w-72 h-64 bg-[#12121a] rounded-2xl animate-pulse" />
                      ))}
                    </div>
                  ) : (
                    <HScrollRow color={cat.color}>
                      {catMatches.length === 0 ? (
                        <EmptyCard cat={cat} />
                      ) : (
                        catMatches.map((m: any) => (
                          <MatchCard
                            key={m.id}
                            m={m}
                            catColor={cat.color}
                            myJoin={myJoinMap[m.id]}
                            credsExpanded={!!expandedCredentials[m.id]}
                            onToggleCreds={() => setExpandedCredentials((prev) => ({ ...prev, [m.id]: !prev[m.id] }))}
                            onJoin={() => openJoin(m)}
                          />
                        ))
                      )}
                    </HScrollRow>
                  )}

                  {/* Thin separator between categories */}
                  <div className="mt-6 h-px bg-[#1a1a28]" />
                </div>
              );
            })}
          </div>
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
                  <p className="text-[#606070] text-xs">{joinMatch.matchName || `${TYPE_LABEL[joinMatch.matchType] ?? joinMatch.matchType} Match`}</p>
                </div>
              </div>
              <button onClick={() => setJoinMatch(null)} className="w-7 h-7 rounded-full bg-[#1a1a24] flex items-center justify-center text-[#a0a0b0] hover:text-white transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Match summary */}
            <div className="bg-[#0a0a0f] rounded-xl p-3 mb-4 space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-[#a0a0b0] text-xs">Type</span>
                <span className="font-black text-white text-xs">{TYPE_LABEL[joinMatch.matchType] ?? joinMatch.matchType}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#a0a0b0] text-xs">Prize Pool</span>
                <span className="font-black text-[#ffd700] text-xs">৳{Number(joinMatch.prizePool).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#a0a0b0] text-xs">Entry Fee</span>
                <span className={`font-black text-xs ${Number(joinMatch.entryFee) > 0 ? "text-[#ff6b00]" : "text-[#00ff88]"}`}>
                  {Number(joinMatch.entryFee) > 0 ? `৳${Number(joinMatch.entryFee).toLocaleString()}` : "Free"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#a0a0b0] text-xs">Slots</span>
                <span className="font-black text-white text-xs">{joinMatch.filledSlots}/{joinMatch.maxSlots}</span>
              </div>
              {Number(joinMatch.entryFee) > 0 && (
                <div className="flex justify-between">
                  <span className="text-[#a0a0b0] text-xs">Your Wallet</span>
                  <span className={`font-black text-xs ${walletBalance === null ? "text-[#606070]" : walletBalance >= Number(joinMatch.entryFee) ? "text-[#00ff88]" : "text-[#ff2244]"}`}>
                    {walletBalance === null ? "Loading..." : `৳${walletBalance.toFixed(2)}`}
                  </span>
                </div>
              )}
            </div>

            {/* Player inputs */}
            <div className="space-y-4 mb-4">
              {joinPlayers.map((player, idx) => (
                <div key={idx} className="space-y-2">
                  {joinPlayers.length > 1 && (
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-[#ff6b00]/20 border border-[#ff6b00]/40 flex items-center justify-center text-[#ff6b00] text-[10px] font-black">{idx + 1}</div>
                      <span className="text-[#a0a0b0] text-xs font-bold uppercase tracking-wider">Player {idx + 1}</span>
                    </div>
                  )}
                  <input type="text" placeholder="In-game name *" value={player.name}
                    onChange={(e) => setJoinPlayers((prev) => prev.map((x, j) => j === idx ? { ...x, name: e.target.value } : x))}
                    className="w-full bg-[#0a0a0f] border border-[#2a2a36] rounded-xl px-3 py-2.5 text-white text-sm placeholder-[#4a4a5a] focus:outline-none focus:border-[#ff6b00] transition-colors"
                  />
                  <input type="text" placeholder="Free Fire UID *" value={player.uid}
                    onChange={(e) => setJoinPlayers((prev) => prev.map((x, j) => j === idx ? { ...x, uid: e.target.value } : x))}
                    className="w-full bg-[#0a0a0f] border border-[#2a2a36] rounded-xl px-3 py-2.5 text-white text-sm font-mono placeholder-[#4a4a5a] focus:outline-none focus:border-[#ff6b00] transition-colors"
                  />
                  {idx < joinPlayers.length - 1 && <div className="border-t border-[#2a2a36]" />}
                </div>
              ))}
              {joinMatch.isPasswordProtected && (
                <div>
                  <label className="block text-xs uppercase tracking-wider mb-1.5 font-bold flex items-center gap-1.5 text-yellow-400">
                    <Lock className="w-3 h-3" /> Match Password *
                  </label>
                  <input type="password" placeholder="Enter match password" value={joinPassword}
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
