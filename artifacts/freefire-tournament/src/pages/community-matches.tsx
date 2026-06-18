import { useState, useEffect } from "react";
import { Link } from "wouter";
import {
  ArrowLeft, Lock, Timer, Zap, Clock, ChevronDown, ChevronUp,
  Swords, Users, Plus, RefreshCw, X, ChevronRight,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CountdownTimer from "@/components/CountdownTimer";
import { useAuthContext } from "@/lib/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useCreateMatch } from "@/lib/CreateMatchContext";

// ─── Category definitions ────────────────────────────────────────────────────

const CATEGORIES = [
  {
    slug: "BR",
    label: "BR Match",
    heading: "BR Matches List",
    sub: "Battle Royale · 48 players per lobby",
    icon: "🔥",
    color: "#ff6b00",
    typeKey: "BR",
    detail: "Large-scale battle — last squad standing wins the prize pool.",
  },
  {
    slug: "CS",
    label: "Clash Squad",
    heading: "Clash Squad List",
    sub: "CS Mode · 4v4 team battles",
    icon: "⚔️",
    color: "#00b4ff",
    typeKey: "CS",
    detail: "Round-based squad showdowns. Eliminate the enemy team to win.",
  },
  {
    slug: "SOLO",
    label: "Solo Survival",
    heading: "Solo Survival List",
    sub: "Every player for themselves · 12 slots",
    icon: "🎯",
    color: "#ffd700",
    typeKey: "SOLO",
    detail: "Pure skill — no teammates. Top performers share the prize.",
  },
  {
    slug: "LONE_WOLF",
    label: "Lone Wolf",
    heading: "Lone Wolf List",
    sub: "1v1 elimination format · 12 slots",
    icon: "🐺",
    color: "#a855f7",
    typeKey: "LONE_WOLF",
    detail: "Head-to-head duels. Climb the bracket to claim the win.",
  },
  {
    slug: "FREE",
    label: "Free Match",
    heading: "Free Match List",
    sub: "Giveaways & open rooms · 20 slots",
    icon: "🎁",
    color: "#00ff88",
    typeKey: "FREE",
    detail: "No entry fee — open rooms, fun matches, and free giveaways.",
  },
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

function fmtSchedule(dt: string | null | undefined): string {
  if (!dt) return "TBA";
  const d = new Date(dt);
  return d.toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: true });
}

function playersForType(t: string): number {
  const map: Record<string, number> = { "1v1": 1, "2v2": 2, "3v3": 3, "4v4": 4, BR: 1, CS: 4, SOLO: 1, LONE_WOLF: 1, FREE: 1 };
  return map[t] ?? 1;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function CommunityFeedCard({
  m, myJoin, onJoin,
}: {
  m: any; myJoin: any; onJoin: () => void;
}) {
  const cat = CATEGORIES.find((c) => c.typeKey === m.matchType);
  const color = cat?.color ?? "#ff6b00";
  const effStatus = getEffectiveStatus(m);
  const isLive = !!m.credentialsReleased;
  const isFull = m.filledSlots >= m.maxSlots;
  const isEnded = effStatus === "ended" || effStatus === "cancelled";
  const slotPct = Math.round((m.filledSlots / m.maxSlots) * 100);

  return (
    <div
      className={`bg-[#0e0e18] border rounded-xl overflow-hidden transition-all hover:border-opacity-50 ${isEnded ? "opacity-50" : ""}`}
      style={{ borderColor: `${color}20` }}
    >
      <div className="h-[2px]" style={{ background: isLive ? "#00ff88" : isEnded ? "#1e1e2e" : color }} />
      <div className="px-4 py-3">
        <div className="flex items-center gap-3">
          {/* Type badge */}
          <span
            className="text-[10px] font-black uppercase px-2 py-1 rounded-lg shrink-0 tracking-wide"
            style={{ background: `${color}15`, color }}
          >
            {TYPE_LABEL[m.matchType] ?? m.matchType}
          </span>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
              <h3 className="text-sm font-black text-white truncate leading-tight">
                {m.matchName || `${TYPE_LABEL[m.matchType] ?? m.matchType} Match`}
              </h3>
              {isLive && (
                <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase text-[#00ff88] bg-[#00ff88]/10 border border-[#00ff88]/25 px-1.5 py-0.5 rounded-full shrink-0">
                  <span className="w-1 h-1 rounded-full bg-[#00ff88] animate-pulse" /> LIVE
                </span>
              )}
            </div>
            <p className="text-[#606070] text-[11px]">
              by <span className="text-[#a0a0b0] font-bold">{m.creatorName || "Player"}</span>
              {" · "}
              {Number(m.entryFee) > 0 ? <span className="text-[#ff6b00]">৳{Number(m.entryFee)} entry</span> : <span className="text-[#00ff88]">Free</span>}
              {Number(m.prizePool) > 0 && <> · <span className="text-[#ffd700]">৳{Number(m.prizePool).toLocaleString()} prize</span></>}
              {" · "}{m.filledSlots}/{m.maxSlots} slots
            </p>
          </div>

          {/* Slot bar (desktop) */}
          <div className="hidden sm:block w-28 shrink-0">
            <div className="h-1.5 bg-[#1a1a24] rounded-full overflow-hidden mb-1">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${slotPct}%`,
                  background: isFull ? "#ff2244" : slotPct > 75 ? "linear-gradient(90deg,#ff9500,#ff2244)" : "linear-gradient(90deg,#00ff88,#00b4ff)",
                }}
              />
            </div>
            <span className="text-[9px] text-[#606070] font-bold">
              {isFull ? "FULL" : `${m.maxSlots - m.filledSlots} slots left`}
            </span>
          </div>

          {/* Join button */}
          {isEnded ? (
            <div className="px-3 py-1.5 rounded-lg bg-[#1a1a24] text-[#606070] text-[10px] font-black uppercase shrink-0">Ended</div>
          ) : isFull ? (
            <div className="px-3 py-1.5 rounded-lg bg-[#ff2244]/10 border border-[#ff2244]/20 text-[#ff2244] text-[10px] font-black uppercase shrink-0">Full</div>
          ) : myJoin ? (
            <div className="px-3 py-1.5 rounded-lg bg-[#00ff88]/10 border border-[#00ff88]/20 text-[#00ff88] text-[10px] font-black uppercase shrink-0">✓ Joined</div>
          ) : (
            <button
              onClick={onJoin}
              className="px-4 py-1.5 text-[10px] font-black uppercase rounded-lg transition-all hover:brightness-110 active:scale-95 shrink-0"
              style={{
                background: isLive ? "#00ff88" : color,
                color: isLive || color === "#ffd700" || color === "#00ff88" ? "#000" : "#fff",
              }}
            >
              {isLive ? "⚡ Join" : "Join →"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCell({ label, value, valueClass = "text-white" }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="flex flex-col items-center min-w-[60px]">
      <span className={`text-sm font-black leading-tight ${valueClass}`}>{value}</span>
      <span className="text-[9px] font-bold uppercase text-[#3a3a46] mt-0.5 tracking-wider">{label}</span>
    </div>
  );
}

function StatusBadge({ isLive, isEnded }: { isLive: boolean; isEnded: boolean }) {
  if (isLive) return (
    <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase text-[#00ff88] bg-[#00ff88]/10 border border-[#00ff88]/25 px-2 py-0.5 rounded-full">
      <span className="w-1.5 h-1.5 rounded-full bg-[#00ff88] animate-pulse" /> LIVE
    </span>
  );
  if (isEnded) return (
    <span className="text-[9px] font-black uppercase text-[#606070] bg-[#1a1a24] border border-[#2a2a36] px-2 py-0.5 rounded-full">ENDED</span>
  );
  return (
    <span className="text-[9px] font-black uppercase text-[#a0a0b0] bg-[#1a1a24] border border-[#2a2a36] px-2 py-0.5 rounded-full">UPCOMING</span>
  );
}

function PasswordBadge() {
  return (
    <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-yellow-400 border border-yellow-500/20 px-1.5 py-0.5 rounded-full bg-yellow-500/8">
      <Lock className="w-2.5 h-2.5" /> Protected
    </span>
  );
}

function SlotBar({ slotPct, filledSlots, maxSlots, isFull }: { slotPct: number; filledSlots: number; maxSlots: number; isFull: boolean }) {
  return (
    <div>
      <div className="h-2 bg-[#1a1a24] rounded-full overflow-hidden mb-1">
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
      <div className="flex justify-between">
        <span className="text-[9px] text-[#606070] font-bold flex items-center gap-0.5">
          <Users className="w-2.5 h-2.5" /> {filledSlots}/{maxSlots}
        </span>
        <span className={`text-[9px] font-black ${isFull ? "text-[#ff2244]" : "text-[#00ff88]"}`}>
          {isFull ? "FULL" : `${maxSlots - filledSlots} left`}
        </span>
      </div>
    </div>
  );
}

function JoinButton({
  m, isLive, isEnded, isFull, myJoin, color, onJoin,
}: {
  m: any; isLive: boolean; isEnded: boolean; isFull: boolean;
  myJoin: any; color: string; onJoin: () => void;
}) {
  if (isEnded) return (
    <div className="px-4 py-2 rounded-xl bg-[#1a1a24] text-[#606070] text-[10px] font-black uppercase text-center whitespace-nowrap">Ended</div>
  );
  if (isFull) return (
    <div className="px-4 py-2 rounded-xl bg-[#ff2244]/10 border border-[#ff2244]/20 text-[#ff2244] text-[10px] font-black uppercase text-center whitespace-nowrap">Full</div>
  );
  if (myJoin) return (
    <div className="px-4 py-2 rounded-xl bg-[#00ff88]/10 border border-[#00ff88]/20 text-[#00ff88] text-[10px] font-black uppercase text-center whitespace-nowrap">✓ Joined</div>
  );
  return (
    <button
      onClick={onJoin}
      className="flex items-center gap-1.5 px-5 py-2 text-[11px] font-black uppercase rounded-xl transition-all hover:brightness-110 active:scale-95 whitespace-nowrap"
      style={{
        background: isLive ? "#00ff88" : color,
        color: isLive || color === "#ffd700" || color === "#00ff88" ? "#000" : "#fff",
        boxShadow: `0 4px 16px ${isLive ? "rgba(0,255,136,.2)" : `${color}33`}`,
      }}
    >
      {isLive ? <><Zap className="w-3.5 h-3.5" /> Join Live</> : "JOIN →"}
    </button>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CommunityMatchesPage() {
  const { user, authFetch } = useAuthContext();
  const { toast } = useToast();
  const { openCreateMatch } = useCreateMatch();

  // ── View state ──
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const activeMeta = CATEGORIES.find((c) => c.slug === activeCategory) ?? null;

  // ── Match data ──
  const [allMatches, setAllMatches] = useState<any[]>([]);
  const [countMap, setCountMap] = useState<Record<string, number>>({});
  const [liveMap, setLiveMap] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [myJoinMap, setMyJoinMap] = useState<Record<number, { adminRoomId: string | null; adminRoomPassword: string | null; status: string }>>({});
  const [expandedCredentials, setExpandedCredentials] = useState<Record<number, boolean>>({});

  // ── Join modal ──
  const [joinMatch, setJoinMatch] = useState<any>(null);
  const [joinPlayers, setJoinPlayers] = useState<{ name: string; uid: string }[]>([{ name: "", uid: "" }]);
  const [joinPassword, setJoinPassword] = useState("");
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [joining, setJoining] = useState(false);

  // tick for countdown
  const [, setTick] = useState(0);
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
        setAllMatches(all);
        const cm: Record<string, number> = {};
        const lm: Record<string, number> = {};
        for (const cat of CATEGORIES) {
          cm[cat.typeKey] = all.filter((m) => m.matchType === cat.typeKey && m.creatorId === "admin").length;
          lm[cat.typeKey] = all.filter((m) => m.matchType === cat.typeKey && m.creatorId === "admin" && !!m.credentialsReleased).length;
        }
        setCountMap(cm);
        setLiveMap(lm);
      })
      .catch(() => setAllMatches([]))
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

  useEffect(() => { fetchMatches(); }, []);
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

  // Admin-only matches for category view (premium format pages)
  const matches = activeMeta
    ? allMatches.filter((m) => m.matchType === activeMeta.typeKey && m.creatorId === "admin")
    : [];

  // User-created matches for the community feed (shown below the category grid)
  const communityFeedMatches = allMatches.filter(
    (m) => m.creatorId !== "admin" && m.status !== "cancelled"
  );

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
        toast({
          title: data.isPending ? "Request Sent!" : "Joined!",
          description: data.isPending
            ? "The creator will review your request."
            : "You've successfully joined the match!",
        });
        if (!data.isPending) {
          setAllMatches((prev) =>
            prev.map((m) => m.id === joinMatch.id ? { ...m, filledSlots: m.filledSlots + 1 } : m)
          );
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

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 pt-16 pb-24">

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* VIEW 1 — Category Selection Screen (activeCategory === null)       */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {activeCategory === null && (
          <div className="mt-6">

            {/* Header row */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#ff6b00]/10 border border-[#ff6b00]/20 text-[#ff6b00] text-[10px] font-black uppercase tracking-widest mb-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#ff6b00] animate-pulse" />
                  Player Created
                </div>
                <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tight leading-tight">
                  Community <span className="text-[#ff6b00]">Matches</span>
                </h1>
                <p className="text-[#606070] text-sm mt-2 font-medium">
                  Browse by format — pick a category to see available rooms
                </p>
              </div>

              {/* Create button */}
              {user ? (
                <button
                  onClick={openCreateMatch}
                  className="flex items-center gap-2 px-5 py-3 bg-[#ff6b00] hover:bg-[#e66000] text-white font-black uppercase text-sm rounded-xl transition-all shadow-[0_4px_20px_rgba(255,107,0,0.35)] hover:shadow-[0_6px_28px_rgba(255,107,0,0.45)] hover:-translate-y-0.5 active:translate-y-0 shrink-0"
                >
                  <Plus className="w-4 h-4" /> Create a Match
                </button>
              ) : (
                <Link href="/sign-in">
                  <button className="flex items-center gap-2 px-5 py-3 bg-[#141420] hover:bg-[#1e1e2e] border border-[#ff6b00]/40 hover:border-[#ff6b00]/70 text-[#ff6b00] font-black uppercase text-sm rounded-xl transition-all shrink-0">
                    <Plus className="w-4 h-4" /> Sign in to Create
                  </button>
                </Link>
              )}
            </div>

            {/* Divider */}
            <div className="h-px bg-gradient-to-r from-transparent via-[#ff6b00]/20 to-transparent mb-8" />

            {/* Category grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {CATEGORIES.map((cat) => {
                const count = countMap[cat.typeKey] ?? 0;
                const live = liveMap[cat.typeKey] ?? 0;

                return (
                  <button
                    key={cat.slug}
                    onClick={() => setActiveCategory(cat.slug)}
                    className="group relative w-full text-left rounded-2xl overflow-hidden border transition-all duration-200 hover:-translate-y-1 active:translate-y-0 focus:outline-none"
                    style={{
                      background: "#0e0e18",
                      borderColor: `${cat.color}30`,
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.borderColor = `${cat.color}70`;
                      (e.currentTarget as HTMLButtonElement).style.boxShadow = `0 8px 32px ${cat.color}12`;
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.borderColor = `${cat.color}30`;
                      (e.currentTarget as HTMLButtonElement).style.boxShadow = "none";
                    }}
                  >
                    {/* Top accent line */}
                    <div
                      className="h-[3px] w-full"
                      style={{ background: `linear-gradient(90deg, ${cat.color}, ${cat.color}40)` }}
                    />

                    <div className="px-6 py-5 flex items-center gap-5">
                      {/* Icon */}
                      <div
                        className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shrink-0 border"
                        style={{ background: `${cat.color}10`, borderColor: `${cat.color}25` }}
                      >
                        {cat.icon}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h2 className="text-lg font-black uppercase tracking-tight" style={{ color: cat.color }}>
                            {cat.label}
                          </h2>
                          {live > 0 && (
                            <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase text-[#00ff88] bg-[#00ff88]/10 border border-[#00ff88]/25 px-1.5 py-0.5 rounded-full">
                              <span className="w-1 h-1 rounded-full bg-[#00ff88] animate-pulse" /> {live} LIVE
                            </span>
                          )}
                        </div>
                        <p className="text-[#606070] text-[12px] leading-snug mb-2">{cat.sub}</p>
                        <p className="text-[#3a3a46] text-[11px] leading-snug">{cat.detail}</p>
                      </div>

                      {/* Count + chevron */}
                      <div className="shrink-0 flex flex-col items-end gap-1 pl-2">
                        {loading ? (
                          <div className="w-8 h-5 bg-[#1a1a24] rounded animate-pulse" />
                        ) : (
                          <span className="text-2xl font-black" style={{ color: count > 0 ? cat.color : "#2a2a36" }}>
                            {count}
                          </span>
                        )}
                        <span className="text-[9px] text-[#3a3a46] uppercase font-bold tracking-wider">
                          {loading ? "" : count === 1 ? "match" : "matches"}
                        </span>
                        <ChevronRight
                          className="w-5 h-5 mt-1 group-hover:translate-x-1 transition-transform duration-200"
                          style={{ color: cat.color }}
                        />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Refresh */}
            <div className="flex justify-center mt-6">
              <button
                onClick={fetchMatches}
                className="flex items-center gap-2 px-4 py-2.5 bg-[#0e0e18] border border-[#1e1e2e] hover:border-[#2a2a36] rounded-xl text-[#606070] hover:text-[#a0a0b0] transition-all text-xs font-bold uppercase"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh Counts
              </button>
            </div>

            {/* ── Community Feed ── */}
            <div className="mt-12">
              {/* Section header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#1a1a24] border border-[#2a2a36] text-[#a0a0b0] text-[10px] font-black uppercase tracking-widest mb-2">
                    <Swords className="w-3 h-3" /> Player Created
                  </div>
                  <h2 className="text-xl font-black uppercase tracking-tight text-white">
                    Community <span className="text-[#a0a0b0]">Feed</span>
                  </h2>
                  <p className="text-[#606070] text-xs mt-1">Rooms created by fellow players — join or create your own</p>
                </div>
                {user ? (
                  <button
                    onClick={openCreateMatch}
                    className="flex items-center gap-2 px-4 py-2.5 bg-[#141420] hover:bg-[#1e1e2e] border border-[#ff6b00]/30 hover:border-[#ff6b00]/60 text-[#ff6b00] font-black uppercase text-xs rounded-xl transition-all shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" /> Create a Match
                  </button>
                ) : (
                  <Link href="/sign-in">
                    <button className="flex items-center gap-2 px-4 py-2.5 bg-[#141420] border border-[#ff6b00]/30 text-[#ff6b00] font-black uppercase text-xs rounded-xl shrink-0">
                      <Plus className="w-3.5 h-3.5" /> Sign in to Create
                    </button>
                  </Link>
                )}
              </div>

              <div className="h-px bg-gradient-to-r from-transparent via-[#2a2a36] to-transparent mb-5" />

              {loading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => <div key={i} className="h-14 bg-[#12121a] rounded-xl animate-pulse" />)}
                </div>
              ) : communityFeedMatches.length === 0 ? (
                <div className="text-center py-10 border border-dashed border-[#1e1e2e] rounded-2xl">
                  <Swords className="w-8 h-8 mx-auto mb-3 text-[#2a2a36]" />
                  <p className="text-[#606070] text-sm font-bold">No player-created matches yet</p>
                  <p className="text-[#3a3a46] text-xs mt-1">Be the first — create a room and invite friends!</p>
                  {user && (
                    <button
                      onClick={openCreateMatch}
                      className="inline-flex items-center gap-2 px-4 py-2 mt-4 bg-[#ff6b00] text-white text-xs font-black uppercase rounded-xl hover:bg-[#e66000] transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" /> Create First Match
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  {communityFeedMatches.map((m: any) => (
                    <CommunityFeedCard
                      key={m.id}
                      m={m}
                      myJoin={myJoinMap[m.id]}
                      onJoin={() => openJoin(m)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* VIEW 2 — Match List Screen (activeCategory !== null)               */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {activeCategory !== null && activeMeta && (
          <div className="mt-6">

            {/* Back button + heading row */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setActiveCategory(null)}
                  className="flex items-center gap-2 px-4 py-2.5 bg-[#0e0e18] border border-[#2a2a36] hover:border-[#ff6b00]/40 rounded-xl text-[#a0a0b0] hover:text-white transition-all text-sm font-black uppercase shrink-0"
                >
                  <ArrowLeft className="w-4 h-4" /> Back to Formats
                </button>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight" style={{ color: activeMeta.color }}>
                    {activeMeta.heading}
                  </h1>
                  <p className="text-[#606070] text-xs mt-0.5">{activeMeta.sub}</p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={fetchMatches}
                  className="flex items-center gap-1.5 px-3 py-2 bg-[#0e0e18] border border-[#2a2a36] hover:border-[#3a3a46] rounded-xl text-[#606070] hover:text-[#a0a0b0] transition-colors text-xs font-bold uppercase"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
                </button>
                {user ? (
                  <button
                    onClick={openCreateMatch}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black uppercase transition-all"
                    style={{
                      background: activeMeta.color,
                      color: activeMeta.color === "#ffd700" || activeMeta.color === "#00ff88" ? "#000" : "#fff",
                    }}
                  >
                    <Plus className="w-3.5 h-3.5" /> Create
                  </button>
                ) : (
                  <Link href="/sign-in">
                    <button className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black uppercase bg-[#0e0e18] border border-[#ff6b00]/30 text-[#ff6b00] transition-all">
                      <Plus className="w-3.5 h-3.5" /> Sign in
                    </button>
                  </Link>
                )}
              </div>
            </div>

            {/* Divider with accent */}
            <div
              className="h-px mb-6"
              style={{ background: `linear-gradient(90deg, ${activeMeta.color}40, transparent)` }}
            />

            {/* Column headers (desktop) */}
            {!loading && matches.length > 0 && (
              <div className="hidden md:grid grid-cols-[1fr_80px_80px_80px_80px_160px_120px] gap-4 px-5 py-2 mb-1">
                <span className="text-[9px] font-black uppercase text-[#3a3a46] tracking-wider">Match</span>
                <span className="text-[9px] font-black uppercase text-[#3a3a46] tracking-wider text-center">WIN PRIZE</span>
                <span className="text-[9px] font-black uppercase text-[#3a3a46] tracking-wider text-center">ENTRY FEE</span>
                <span className="text-[9px] font-black uppercase text-[#3a3a46] tracking-wider text-center">PER KILL</span>
                <span className="text-[9px] font-black uppercase text-[#3a3a46] tracking-wider text-center">MAP</span>
                <span className="text-[9px] font-black uppercase text-[#3a3a46] tracking-wider">SLOTS</span>
                <span className="text-[9px] font-black uppercase text-[#3a3a46] tracking-wider text-right" />
              </div>
            )}

            {/* Match rows */}
            {loading ? (
              <div className="space-y-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-20 bg-[#12121a] rounded-2xl animate-pulse" />
                ))}
              </div>
            ) : matches.length === 0 ? (
              <div className="text-center py-20 border border-dashed border-[#1e1e2e] rounded-2xl">
                <div className="text-6xl mb-4 opacity-40">{activeMeta.icon}</div>
                <h3 className="text-lg font-bold text-white mb-2">No {activeMeta.label} matches scheduled yet</h3>
                <p className="text-[#606070] text-sm">Check back soon — admin-curated matches will appear here.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {matches.map((m: any) => {
                  const effStatus = getEffectiveStatus(m);
                  const isLive = !!m.credentialsReleased;
                  const isFull = m.filledSlots >= m.maxSlots;
                  const startsAt = getStartsAt(m);
                  const isTimerOn = !!m.timerStartedAt && !isLive;
                  const isEnded = effStatus === "ended" || effStatus === "cancelled";
                  const myJoin = myJoinMap[m.id];
                  const hasCredentials = !!myJoin && !!myJoin.adminRoomId;
                  const credsExpanded = !!expandedCredentials[m.id];
                  const slotPct = Math.round((m.filledSlots / m.maxSlots) * 100);

                  return (
                    <div
                      key={m.id}
                      className={`bg-[#0e0e18] border rounded-2xl overflow-hidden transition-all ${
                        isLive
                          ? "border-[#00ff88]/25 shadow-[0_0_24px_rgba(0,255,136,0.05)]"
                          : "border-[#1e1e2e] hover:border-[#2a2a36]"
                      } ${isEnded ? "opacity-55" : ""}`}
                    >
                      {/* Top accent line */}
                      <div
                        className="h-[2px] w-full"
                        style={{ background: isLive ? "#00ff88" : isEnded ? "#1e1e2e" : activeMeta.color }}
                      />

                      {/* Main row */}
                      <div className="px-5 py-4">
                        {/* Mobile: stacked */}
                        <div className="md:hidden space-y-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap mb-1">
                                <StatusBadge isLive={isLive} isEnded={isEnded} />
                                {m.isPasswordProtected && <PasswordBadge />}
                              </div>
                              <h3 className="text-sm font-black text-white truncate">
                                {m.matchName || `${TYPE_LABEL[m.matchType] ?? m.matchType} Match`}
                              </h3>
                              <p className="text-[#606070] text-[11px] mt-0.5">
                                by {m.creatorName || "Player"} · {fmtSchedule(m.scheduledAt)}
                              </p>
                            </div>
                            <JoinButton m={m} isLive={isLive} isEnded={isEnded} isFull={isFull} myJoin={myJoin} color={activeMeta.color} onJoin={() => openJoin(m)} />
                          </div>
                          <div className="grid grid-cols-4 gap-2">
                            <StatCell label="WIN PRIZE" value={Number(m.prizePool) > 0 ? `৳${Number(m.prizePool).toLocaleString()}` : "—"} valueClass="text-[#ffd700]" />
                            <StatCell label="ENTRY FEE" value={Number(m.entryFee) > 0 ? `৳${Number(m.entryFee)}` : "Free"} valueClass={Number(m.entryFee) > 0 ? "text-[#ff6b00]" : "text-[#00ff88]"} />
                            <StatCell label="PER KILL" value={m.perKill && Number(m.perKill) > 0 ? `৳${Number(m.perKill)}` : "—"} />
                            <StatCell label="MAP" value={m.mapName || "—"} />
                          </div>
                          <SlotBar slotPct={slotPct} filledSlots={m.filledSlots} maxSlots={m.maxSlots} isFull={isFull} />
                        </div>

                        {/* Desktop: single-line grid */}
                        <div className="hidden md:grid grid-cols-[1fr_80px_80px_80px_80px_160px_120px] gap-4 items-center">
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                              <StatusBadge isLive={isLive} isEnded={isEnded} />
                              {m.isPasswordProtected && <PasswordBadge />}
                              {isTimerOn && startsAt && (
                                <span className="inline-flex items-center gap-1 text-[9px] font-bold text-[#ff6b00] bg-[#ff6b00]/8 border border-[#ff6b00]/20 px-1.5 py-0.5 rounded-full">
                                  <Timer className="w-2.5 h-2.5" />
                                  <CountdownTimer targetDate={startsAt} className="text-[9px] font-black text-[#ff6b00]" />
                                </span>
                              )}
                            </div>
                            <h3 className="text-sm font-black text-white truncate leading-tight">
                              {m.matchName || `${TYPE_LABEL[m.matchType] ?? m.matchType} Match`}
                            </h3>
                            <p className="text-[#3a3a46] text-[10px] mt-0.5">
                              by {m.creatorName || "Player"} · {fmtSchedule(m.scheduledAt)}
                            </p>
                          </div>
                          <StatCell label="WIN PRIZE" value={Number(m.prizePool) > 0 ? `৳${Number(m.prizePool).toLocaleString()}` : "—"} valueClass="text-[#ffd700]" />
                          <StatCell label="ENTRY FEE" value={Number(m.entryFee) > 0 ? `৳${Number(m.entryFee)}` : "Free"} valueClass={Number(m.entryFee) > 0 ? "text-[#ff6b00]" : "text-[#00ff88]"} />
                          <StatCell label="PER KILL" value={m.perKill && Number(m.perKill) > 0 ? `৳${Number(m.perKill)}` : "—"} />
                          <StatCell label="MAP" value={m.mapName || "—"} />
                          <div>
                            <SlotBar slotPct={slotPct} filledSlots={m.filledSlots} maxSlots={m.maxSlots} isFull={isFull} />
                          </div>
                          <div className="flex justify-end">
                            <JoinButton m={m} isLive={isLive} isEnded={isEnded} isFull={isFull} myJoin={myJoin} color={activeMeta.color} onJoin={() => openJoin(m)} />
                          </div>
                        </div>
                      </div>

                      {/* Room credentials accordion */}
                      {(hasCredentials || myJoin) && (
                        <div className="border-t border-[#1a1a24]">
                          {hasCredentials ? (
                            <>
                              <button
                                onClick={() => setExpandedCredentials((prev) => ({ ...prev, [m.id]: !prev[m.id] }))}
                                className="w-full flex items-center justify-between gap-2 px-5 py-2.5 hover:bg-[#00ff88]/5 transition-colors"
                              >
                                <span className="flex items-center gap-1.5 text-[#00ff88] text-[10px] font-black uppercase">
                                  🔑 Room Details — tap to reveal
                                </span>
                                {credsExpanded
                                  ? <ChevronUp className="w-3.5 h-3.5 text-[#00ff88]" />
                                  : <ChevronDown className="w-3.5 h-3.5 text-[#00ff88]" />
                                }
                              </button>
                              {credsExpanded && (
                                <div className="px-5 pb-4 flex flex-wrap gap-4">
                                  <div className="flex items-center gap-3 bg-[#0a0a0f] border border-[#2a2a36] rounded-xl px-4 py-2.5">
                                    <span className="text-[#606070] text-xs font-bold shrink-0">Room ID</span>
                                    <span className="text-white font-black font-mono text-sm select-all">{myJoin?.adminRoomId}</span>
                                  </div>
                                  {myJoin?.adminRoomPassword && (
                                    <div className="flex items-center gap-3 bg-[#0a0a0f] border border-[#2a2a36] rounded-xl px-4 py-2.5">
                                      <span className="text-[#606070] text-xs font-bold shrink-0">Password</span>
                                      <span className="text-white font-black font-mono text-sm select-all">{myJoin.adminRoomPassword}</span>
                                    </div>
                                  )}
                                </div>
                              )}
                            </>
                          ) : (
                            <div className="flex items-center gap-2 px-5 py-2.5">
                              <Clock className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                              <span className="text-blue-400 text-[10px] font-bold">
                                Room credentials will unlock 10 minutes before the match — for joined players only.
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
      <Footer />

      {/* ── Join Modal ── */}
      {joinMatch && (
        <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/85 backdrop-blur-sm" onClick={() => setJoinMatch(null)} />
          <div className="relative w-full sm:max-w-sm bg-[#0d0d16] border border-[#ff6b00]/20 rounded-t-3xl sm:rounded-2xl px-5 pb-6 pt-4 z-10 max-h-[90vh] overflow-y-auto">
            <div className="sm:hidden w-10 h-1 bg-[#2a2a36] rounded-full mx-auto mb-4" />

            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Swords className="w-5 h-5 text-[#ff6b00]" />
                <div>
                  <h3 className="font-black text-white text-sm">Join Match</h3>
                  <p className="text-[#606070] text-[11px]">
                    {joinMatch.matchName || `${TYPE_LABEL[joinMatch.matchType] ?? joinMatch.matchType} Match`}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setJoinMatch(null)}
                className="w-7 h-7 rounded-full bg-[#1a1a24] flex items-center justify-center text-[#a0a0b0] hover:text-white transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Entry fee notice */}
            {Number(joinMatch.entryFee) > 0 && (
              <div className="mb-4 px-4 py-3 bg-[#ff6b00]/8 border border-[#ff6b00]/20 rounded-xl flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#ff6b00]/15 border border-[#ff6b00]/25 flex items-center justify-center text-base shrink-0">৳</div>
                <div>
                  <div className="text-white font-black text-sm">Entry Fee: ৳{Number(joinMatch.entryFee).toLocaleString()}</div>
                  {walletBalance !== null && (
                    <div className={`text-[11px] font-bold mt-0.5 ${walletBalance >= Number(joinMatch.entryFee) ? "text-[#00ff88]" : "text-[#ff2244]"}`}>
                      Wallet: ৳{walletBalance.toLocaleString()} {walletBalance >= Number(joinMatch.entryFee) ? "✓" : "— insufficient"}
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="space-y-3 mb-4">
              {joinPlayers.map((player, idx) => (
                <div key={idx} className="space-y-2">
                  {joinPlayers.length > 1 && (
                    <div className="text-[#606070] text-[10px] font-black uppercase tracking-wider">Player {idx + 1}</div>
                  )}
                  <input
                    type="text"
                    placeholder="In-Game Name *"
                    value={player.name}
                    onChange={(e) => setJoinPlayers((prev) => prev.map((x, j) => j === idx ? { ...x, name: e.target.value } : x))}
                    className="w-full bg-[#0a0a0f] border border-[#2a2a36] rounded-xl px-3 py-2.5 text-white text-sm placeholder-[#4a4a5a] focus:outline-none focus:border-[#ff6b00] transition-colors"
                  />
                  <input
                    type="text"
                    placeholder="Free Fire UID *"
                    value={player.uid}
                    onChange={(e) => setJoinPlayers((prev) => prev.map((x, j) => j === idx ? { ...x, uid: e.target.value } : x))}
                    className="w-full bg-[#0a0a0f] border border-[#2a2a36] rounded-xl px-3 py-2.5 text-white text-sm font-mono placeholder-[#4a4a5a] focus:outline-none focus:border-[#ff6b00] transition-colors"
                  />
                  {idx < joinPlayers.length - 1 && <div className="border-t border-[#1a1a24] pt-1" />}
                </div>
              ))}
              {joinMatch.isPasswordProtected && (
                <div>
                  <label className="flex items-center gap-1.5 text-yellow-400 text-[10px] font-black uppercase mb-1.5">
                    <Lock className="w-3 h-3" /> Match Password *
                  </label>
                  <input
                    type="password"
                    placeholder="Enter match password"
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

            <button
              onClick={doJoin}
              disabled={joinDisabled}
              className="w-full py-3 bg-[#ff6b00] hover:bg-[#e66000] text-white font-black uppercase rounded-xl text-sm disabled:opacity-40 transition-all"
            >
              {joining
                ? "Joining…"
                : Number(joinMatch.entryFee) > 0
                ? `Join & Pay ৳${Number(joinMatch.entryFee).toLocaleString()}`
                : "Join Match"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
