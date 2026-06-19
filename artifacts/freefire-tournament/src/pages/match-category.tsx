import { useState, useEffect } from "react";
import { useRoute, Link } from "wouter";
import {
  ArrowLeft, Lock, Timer, Zap, Clock, ChevronDown, ChevronUp,
  Swords, Users, Trophy, Target, Map, Globe, RefreshCw, X, Plus,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CountdownTimer from "@/components/CountdownTimer";
import { useAuthContext } from "@/lib/AuthContext";
import { useToast } from "@/hooks/use-toast";

// ─── Meta ─────────────────────────────────────────────────────────────────────

const CATEGORY_META: Record<string, {
  label: string; sub: string; icon: string; color: string; typeKey: string;
}> = {
  BR:        { label: "BR Match",       sub: "Battle Royale · 48 players",       icon: "🔥", color: "#ff6b00", typeKey: "BR"        },
  CS:        { label: "Clash Squad",    sub: "CS Mode · 4v4 team battles",        icon: "⚔️",  color: "#00b4ff", typeKey: "CS"        },
  SOLO:      { label: "Solo Survival",  sub: "Every player for themselves",       icon: "🎯", color: "#ffd700", typeKey: "SOLO"      },
  LONE_WOLF: { label: "Lone Wolf",      sub: "1v1 elimination format",            icon: "🐺", color: "#a855f7", typeKey: "LONE_WOLF" },
  FREE:      { label: "Free Match",     sub: "Giveaways & open rooms",            icon: "🎁", color: "#00ff88", typeKey: "FREE"      },
};

const TYPE_LABEL: Record<string, string> = {
  BR: "Battle Royale", CS: "Clash Squad", SOLO: "Solo",
  LONE_WOLF: "Lone Wolf", FREE: "Giveaway",
  "1v1": "1v1", "2v2": "2v2", "3v3": "3v3", "4v4": "4v4",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

// ─── Stat cell (used inside match rows) ──────────────────────────────────────

function StatCell({ label, value, valueClass = "text-white" }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="flex flex-col items-center min-w-[60px]">
      <span className={`text-sm font-black leading-tight ${valueClass}`}>{value}</span>
      <span className="text-[9px] font-bold uppercase text-[#3a3a46] mt-0.5 tracking-wider">{label}</span>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function MatchCategoryPage() {
  const [, params] = useRoute("/matches/:category");
  const category   = (params?.category ?? "BR").toUpperCase();
  const meta       = CATEGORY_META[category] ?? CATEGORY_META["BR"];

  const { user, authFetch } = useAuthContext();
  const { toast }           = useToast();

  const [matches,            setMatches]            = useState<any[]>([]);
  const [loading,            setLoading]            = useState(true);
  const [myJoinMap,          setMyJoinMap]          = useState<Record<number, { adminRoomId: string | null; adminRoomPassword: string | null; status: string }>>({});
  const [expandedCredentials,setExpandedCredentials] = useState<Record<number, boolean>>({});

  // Join modal
  const [joinMatch,    setJoinMatch]    = useState<any>(null);
  const [joinPlayers,  setJoinPlayers]  = useState<{ name: string; uid: string }[]>([{ name: "", uid: "" }]);
  const [joinPassword, setJoinPassword] = useState("");
  const [walletBalance,setWalletBalance]= useState<number | null>(null);
  const [joining,      setJoining]      = useState(false);

  const playersForType = (t: string) => {
    const map: Record<string, number> = { "1v1": 1, "2v2": 2, "3v3": 3, "4v4": 4, BR: 1, CS: 4, SOLO: 1, LONE_WOLF: 1, FREE: 1 };
    return map[t] ?? 1;
  };

  // Tick every 30 s to recompute countdown
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
          map[j.matchId] = {
            adminRoomId:       j.adminRoomId       ?? null,
            adminRoomPassword: j.adminRoomPassword ?? null,
            status:            j.status,
          };
        }
      }
      setMyJoinMap(map);
    } catch {}
  };

  useEffect(() => { fetchMatches(); },        [category]);
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
        toast({
          title:       data.isPending ? "Request Sent!" : "Joined!",
          description: data.isPending
            ? "The creator will review your request."
            : "You've successfully joined the match!",
        });
        if (!data.isPending) {
          setMatches((prev) =>
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

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 pt-16 pb-24">

        {/* ── Breadcrumb ── */}
        <div className="flex items-center gap-2 mt-4 mb-6">
          <Link
            href="/tournaments"
            className="flex items-center gap-1.5 text-[#606070] hover:text-white transition-colors text-sm font-bold"
          >
            <ArrowLeft className="w-4 h-4" /> Tournaments
          </Link>
          <span className="text-[#2a2a36]">/</span>
          <span className="font-bold text-sm" style={{ color: meta.color }}>{meta.label}</span>
        </div>

        {/* ── Category header ── */}
        <div
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border px-6 py-5 mb-8"
          style={{
            background:   `linear-gradient(135deg, ${meta.color}0e 0%, transparent 70%)`,
            borderColor:  `${meta.color}20`,
          }}
        >
          <div className="flex items-center gap-4">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl border shrink-0"
              style={{ background: `${meta.color}15`, borderColor: `${meta.color}25` }}
            >
              {meta.icon}
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight" style={{ color: meta.color }}>
                {meta.label}
              </h1>
              <p className="text-[#a0a0b0] text-sm mt-0.5">{meta.sub}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="text-right">
              <div className="text-2xl font-black text-white">{loading ? "—" : matches.length}</div>
              <div className="text-[#3a3a46] text-[10px] uppercase font-bold">Matches</div>
            </div>
            <div className="flex flex-col gap-2">
              <button
                onClick={fetchMatches}
                className="flex items-center gap-1.5 px-3 py-2 bg-[#0a0a0f] border border-[#2a2a36] hover:border-[#3a3a46] rounded-xl text-[#606070] hover:text-[#a0a0b0] transition-colors text-xs font-bold uppercase"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Refresh
              </button>
              {user && (
                <Link href="/my-matches">
                  <button
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black uppercase transition-all"
                    style={{ background: meta.color, color: meta.color === "#ffd700" || meta.color === "#00ff88" ? "#000" : "#fff" }}
                  >
                    <Plus className="w-3.5 h-3.5" /> Create
                  </button>
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* ── Column headers (desktop) ── */}
        {!loading && matches.length > 0 && (
          <div className="hidden md:grid grid-cols-[1fr_80px_80px_80px_80px_160px_120px] gap-4 px-5 py-2 mb-1">
            <span className="text-[9px] font-black uppercase text-[#3a3a46] tracking-wider">Match</span>
            <span className="text-[9px] font-black uppercase text-[#3a3a46] tracking-wider text-center">WIN PRIZE</span>
            <span className="text-[9px] font-black uppercase text-[#3a3a46] tracking-wider text-center">ENTRY FEE</span>
            <span className="text-[9px] font-black uppercase text-[#3a3a46] tracking-wider text-center">PER KILL</span>
            <span className="text-[9px] font-black uppercase text-[#3a3a46] tracking-wider text-center">MAP</span>
            <span className="text-[9px] font-black uppercase text-[#3a3a46] tracking-wider">SLOTS</span>
            <span className="text-[9px] font-black uppercase text-[#3a3a46] tracking-wider text-right"></span>
          </div>
        )}

        {/* ── Match rows ── */}
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-20 bg-[#12121a] rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : matches.length === 0 ? (
          <div className="text-center py-20 border border-dashed border-[#1e1e2e] rounded-2xl">
            <div className="text-6xl mb-4 opacity-50">{meta.icon}</div>
            <h3 className="text-lg font-bold text-white mb-2">No {meta.label} matches yet</h3>
            <p className="text-[#606070] text-sm mb-6">Check back soon — or be the first to create one!</p>
            {user && (
              <Link href="/my-matches">
                <button
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-black uppercase text-sm"
                  style={{ background: meta.color, color: meta.color === "#ffd700" || meta.color === "#00ff88" ? "#000" : "#fff" }}
                >
                  <Plus className="w-4 h-4" /> Create the first match
                </button>
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {matches.map((m: any) => {
              const effStatus    = getEffectiveStatus(m);
              const isLive       = !!m.credentialsReleased;
              const isFull       = m.filledSlots >= m.maxSlots;
              const startsAt     = getStartsAt(m);
              const isTimerOn    = !!m.timerStartedAt && !isLive;
              const isEnded      = effStatus === "ended" || effStatus === "cancelled";
              const myJoin       = myJoinMap[m.id];
              const hasCredentials = !!myJoin && !!myJoin.adminRoomId;
              const credsExpanded  = !!expandedCredentials[m.id];
              const slotPct      = Math.round((m.filledSlots / m.maxSlots) * 100);

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
                    style={{ background: isLive ? "#00ff88" : isEnded ? "#1e1e2e" : meta.color }}
                  />

                  {/* ── Main row ── */}
                  <div className="px-5 py-4">

                    {/* Mobile: stacked layout */}
                    <div className="md:hidden space-y-3">
                      {/* Title row */}
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
                        <JoinButton m={m} isLive={isLive} isEnded={isEnded} isFull={isFull} myJoin={myJoin} meta={meta} onJoin={() => openJoin(m)} />
                      </div>

                      {/* Stats row */}
                      <div className="grid grid-cols-4 gap-2">
                        <StatCell label="WIN PRIZE" value={Number(m.prizePool) > 0 ? `৳${Number(m.prizePool).toLocaleString()}` : "—"} valueClass="text-[#ffd700]" />
                        <StatCell label="ENTRY FEE" value={Number(m.entryFee) > 0 ? `৳${Number(m.entryFee)}` : "Free"} valueClass={Number(m.entryFee) > 0 ? "text-[#ff6b00]" : "text-[#00ff88]"} />
                        <StatCell label="PER KILL"  value={m.perKill && Number(m.perKill) > 0 ? `৳${Number(m.perKill)}` : "—"} />
                        <StatCell label="MAP"       value={m.mapName || "—"} />
                      </div>

                      {/* Slot bar */}
                      <SlotBar slotPct={slotPct} filledSlots={m.filledSlots} maxSlots={m.maxSlots} isFull={isFull} />
                    </div>

                    {/* Desktop: single-line grid row */}
                    <div className="hidden md:grid grid-cols-[1fr_80px_80px_80px_80px_160px_120px] gap-4 items-center">
                      {/* Match name + info */}
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                          <StatusBadge isLive={isLive} isEnded={isEnded} />
                          {m.matchMode && (
                            <span className="inline-flex items-center text-[9px] font-black uppercase text-[#00b4ff] bg-[#00b4ff]/10 border border-[#00b4ff]/25 px-1.5 py-0.5 rounded-full">
                              {m.matchMode}
                            </span>
                          )}
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

                      {/* Stats */}
                      <StatCell label="WIN PRIZE" value={Number(m.prizePool) > 0 ? `৳${Number(m.prizePool).toLocaleString()}` : "—"} valueClass="text-[#ffd700]" />
                      <StatCell label="ENTRY FEE" value={Number(m.entryFee) > 0 ? `৳${Number(m.entryFee)}` : "Free"} valueClass={Number(m.entryFee) > 0 ? "text-[#ff6b00]" : "text-[#00ff88]"} />
                      <StatCell label="PER KILL"  value={m.perKill && Number(m.perKill) > 0 ? `৳${Number(m.perKill)}` : "—"} />
                      <StatCell label="MAP"       value={m.mapName || "—"} />

                      {/* Slot bar (inline) */}
                      <div>
                        <SlotBar slotPct={slotPct} filledSlots={m.filledSlots} maxSlots={m.maxSlots} isFull={isFull} />
                      </div>

                      {/* Join button */}
                      <div className="flex justify-end">
                        <JoinButton m={m} isLive={isLive} isEnded={isEnded} isFull={isFull} myJoin={myJoin} meta={meta} onJoin={() => openJoin(m)} />
                      </div>
                    </div>
                  </div>

                  {/* ── Room credentials accordion ── */}
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
                              ? <ChevronUp   className="w-3.5 h-3.5 text-[#00ff88]" />
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

            {/* Match summary */}
            <div className="bg-[#0a0a0f] rounded-xl p-3 mb-4 grid grid-cols-2 gap-x-3 gap-y-2">
              {[
                { label: "Format",     value: TYPE_LABEL[joinMatch.matchType] ?? joinMatch.matchType, cls: "text-white" },
                { label: "Win Prize",  value: `৳${Number(joinMatch.prizePool).toLocaleString()}`,     cls: "text-[#ffd700]" },
                { label: "Entry Fee",  value: Number(joinMatch.entryFee) > 0 ? `৳${Number(joinMatch.entryFee)}` : "Free", cls: Number(joinMatch.entryFee) > 0 ? "text-[#ff6b00]" : "text-[#00ff88]" },
                { label: "Slots",      value: `${joinMatch.filledSlots}/${joinMatch.maxSlots}`,        cls: "text-white" },
              ].map(({ label, value, cls }) => (
                <div key={label}>
                  <span className="text-[#606070] text-[10px] uppercase font-bold">{label}</span>
                  <p className={`font-black text-sm ${cls}`}>{value}</p>
                </div>
              ))}
              {Number(joinMatch.entryFee) > 0 && (
                <div className="col-span-2 pt-1 border-t border-[#1a1a24]">
                  <span className="text-[#606070] text-[10px] uppercase font-bold">Your Wallet</span>
                  <p className={`font-black text-sm ${walletBalance === null ? "text-[#606070]" : walletBalance >= Number(joinMatch.entryFee) ? "text-[#00ff88]" : "text-[#ff2244]"}`}>
                    {walletBalance === null ? "Loading…" : `৳${walletBalance.toFixed(2)}`}
                  </p>
                </div>
              )}
            </div>

            {/* Player inputs */}
            <div className="space-y-3 mb-4">
              {joinPlayers.map((player, idx) => (
                <div key={idx} className="space-y-2">
                  {joinPlayers.length > 1 && (
                    <span className="text-[#606070] text-[10px] font-black uppercase tracking-wider">Player {idx + 1}</span>
                  )}
                  <input
                    type="text"
                    placeholder="In-game name *"
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

// ─── Small shared sub-components ─────────────────────────────────────────────

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
  m, isLive, isEnded, isFull, myJoin, meta, onJoin,
}: {
  m: any; isLive: boolean; isEnded: boolean; isFull: boolean;
  myJoin: any; meta: any; onJoin: () => void;
}) {
  if (isEnded) return (
    <div className="px-4 py-2 rounded-xl bg-[#1a1a24] text-[#606070] text-[10px] font-black uppercase text-center">
      Ended
    </div>
  );
  if (isFull) return (
    <div className="px-4 py-2 rounded-xl bg-[#ff2244]/10 border border-[#ff2244]/20 text-[#ff2244] text-[10px] font-black uppercase text-center">
      Full
    </div>
  );
  if (myJoin) return (
    <div className="px-4 py-2 rounded-xl bg-[#00ff88]/10 border border-[#00ff88]/20 text-[#00ff88] text-[10px] font-black uppercase text-center">
      ✓ Joined
    </div>
  );
  return (
    <button
      onClick={onJoin}
      className="flex items-center gap-1.5 px-5 py-2 text-[11px] font-black uppercase rounded-xl transition-all hover:brightness-110 active:scale-95"
      style={{
        background:  isLive ? "#00ff88" : meta.color,
        color:       isLive || meta.color === "#ffd700" ? "#000" : "#fff",
        boxShadow:   `0 4px 16px ${isLive ? "rgba(0,255,136,.2)" : `${meta.color}33`}`,
      }}
    >
      {isLive ? <><Zap className="w-3.5 h-3.5" /> Join Live</> : "JOIN →"}
    </button>
  );
}
