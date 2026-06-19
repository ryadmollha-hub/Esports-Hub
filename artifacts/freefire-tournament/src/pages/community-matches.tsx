import { useState, useEffect } from "react";
import { Link } from "wouter";
import {
  Lock, Zap, Swords, Users, Plus, RefreshCw, X, Copy, CheckCircle, XCircle, Timer,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CountdownTimer from "@/components/CountdownTimer";
import { useAuthContext } from "@/lib/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useCreateMatch } from "@/lib/CreateMatchContext";

// ─── Constants ────────────────────────────────────────────────────────────────

const TABS = [
  { key: "all",       label: "All",         icon: "⚡", color: "#ff6b00" },
  { key: "BR",        label: "BR",          icon: "🔥", color: "#ff6b00" },
  { key: "CS",        label: "Clash Squad", icon: "⚔️", color: "#00b4ff" },
  { key: "SOLO",      label: "Solo",        icon: "🎯", color: "#ffd700" },
  { key: "LONE_WOLF", label: "Lone Wolf",   icon: "🐺", color: "#a855f7" },
  { key: "FREE",      label: "Free Match",  icon: "🎁", color: "#00ff88" },
];

const TYPE_LABEL: Record<string, string> = {
  BR: "Battle Royale", CS: "Clash Squad", SOLO: "Solo",
  LONE_WOLF: "Lone Wolf", FREE: "Giveaway",
  "1v1": "1v1", "2v2": "2v2", "3v3": "3v3", "4v4": "4v4",
};

const TYPE_COLOR: Record<string, string> = {
  BR: "#ff6b00", CS: "#00b4ff", SOLO: "#ffd700",
  LONE_WOLF: "#a855f7", FREE: "#00ff88",
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
  return new Date(dt).toLocaleString("en-US", {
    month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: true,
  });
}

function playersForType(t: string): number {
  const map: Record<string, number> = {
    "1v1": 1, "2v2": 2, "3v3": 3, "4v4": 4,
    BR: 1, CS: 4, SOLO: 1, LONE_WOLF: 1, FREE: 1,
  };
  return map[t] ?? 1;
}

// ─── Match Card ───────────────────────────────────────────────────────────────

function MatchCard({
  m, myJoin, onJoin,
}: {
  m: any;
  myJoin?: { adminRoomId: string | null; adminRoomPassword: string | null; status: string };
  onJoin: () => void;
}) {
  const color       = TYPE_COLOR[m.matchType] ?? "#ff6b00";
  const effStatus   = getEffectiveStatus(m);
  const isLive      = !!m.credentialsReleased;
  const isFull      = m.filledSlots >= m.maxSlots;
  const isEnded     = effStatus === "ended" || effStatus === "cancelled";
  const startsAt    = getStartsAt(m);
  const slotPct     = Math.round((m.filledSlots / (m.maxSlots || 1)) * 100);
  const hasJoined   = !!myJoin;
  const roomReady   = hasJoined && (myJoin?.adminRoomId || m.roomId);

  return (
    <div
      className={`bg-[#0e0e18] border rounded-2xl overflow-hidden transition-all hover:shadow-lg ${
        isEnded ? "opacity-50 border-[#1e1e2e]" : "border-[#1e1e2e] hover:border-[#2a2a3a]"
      }`}
      style={isLive ? { borderColor: `${color}35`, boxShadow: `0 0 20px ${color}08` } : {}}
    >
      {/* Top accent + live bar */}
      <div className="h-[3px]" style={{ background: `linear-gradient(90deg, ${color}, ${color}20)` }} />

      <div className="px-4 py-4">
        {/* Row 1: title + badges */}
        <div className="flex items-start gap-3 mb-3">
          {/* Mode icon */}
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 border"
            style={{ background: `${color}10`, borderColor: `${color}20` }}
          >
            {TABS.find(t => t.key === m.matchType)?.icon ?? "🎮"}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-0.5">
              <span className="text-white font-black text-sm leading-tight truncate">
                {m.matchName || `${TYPE_LABEL[m.matchType] ?? m.matchType} Match`}
              </span>

              {/* Live badge */}
              {isLive && (
                <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase text-[#00ff88] bg-[#00ff88]/10 border border-[#00ff88]/25 px-1.5 py-0.5 rounded-full shrink-0">
                  <span className="w-1 h-1 rounded-full bg-[#00ff88] animate-pulse" /> LIVE
                </span>
              )}
              {/* Full badge */}
              {isFull && !isEnded && (
                <span className="text-[9px] font-black uppercase text-[#ff2244] bg-[#ff2244]/10 border border-[#ff2244]/20 px-1.5 py-0.5 rounded-full shrink-0">
                  FULL
                </span>
              )}
              {/* Mode badge */}
              <span
                className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full border shrink-0"
                style={{ color, background: `${color}10`, borderColor: `${color}25` }}
              >
                {m.matchType === "LONE_WOLF" ? "LONE WOLF" : m.matchType}
              </span>
            </div>

            {/* Creator */}
            <p className="text-[#606070] text-[10px]">
              by <span className="text-[#a0a0b0]">{m.creatorName ?? "Player"}</span>
              {m.isPrivate && (
                <span className="ml-1.5 inline-flex items-center gap-0.5 text-[9px] text-yellow-500">
                  <Lock className="w-2.5 h-2.5" /> Private
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Row 2: stats grid */}
        <div className="grid grid-cols-3 gap-2 mb-3 text-center">
          <div className="bg-[#0a0a0f] rounded-lg px-2 py-1.5">
            <div className="text-white font-black text-xs">
              {Number(m.entryFee) === 0 ? "FREE" : `৳${Number(m.entryFee).toLocaleString()}`}
            </div>
            <div className="text-[#4a4a5a] text-[9px] uppercase font-bold mt-0.5">Entry</div>
          </div>
          <div className="bg-[#0a0a0f] rounded-lg px-2 py-1.5">
            <div className="text-[#ff6b00] font-black text-xs">
              ৳{Number(m.prizePool).toLocaleString()}
            </div>
            <div className="text-[#4a4a5a] text-[9px] uppercase font-bold mt-0.5">Prize</div>
          </div>
          <div className="bg-[#0a0a0f] rounded-lg px-2 py-1.5">
            <div className="text-white font-black text-xs flex items-center justify-center gap-1">
              <Users className="w-2.5 h-2.5 text-[#606070]" />
              {m.filledSlots}/{m.maxSlots}
            </div>
            <div className="text-[#4a4a5a] text-[9px] uppercase font-bold mt-0.5">Slots</div>
          </div>
        </div>

        {/* Slot progress bar */}
        <div className="h-1 bg-[#1a1a24] rounded-full mb-3 overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${slotPct}%`,
              background: isFull ? "#ff2244" : color,
            }}
          />
        </div>

        {/* Row 3: schedule + countdown + join */}
        <div className="flex items-center justify-between gap-3">
          <div className="text-[10px] text-[#606070]">
            {startsAt && !isLive ? (
              <CountdownTimer targetDate={startsAt} />
            ) : (
              <span>{fmtSchedule(m.scheduledAt)}</span>
            )}
          </div>

          {/* Action */}
          {isEnded ? (
            <span className="text-[10px] text-[#3a3a46] font-bold uppercase">Ended</span>
          ) : roomReady ? (
            <div className="text-right">
              <div className="text-[9px] text-[#00ff88] font-black uppercase mb-0.5">Room Ready</div>
              <div className="text-[10px] text-white font-mono">
                {myJoin?.adminRoomId || m.roomId}
              </div>
            </div>
          ) : hasJoined ? (
            <span className="text-[10px] text-[#a0a0b0] font-bold uppercase">Joined ✓</span>
          ) : (
            <button
              onClick={onJoin}
              disabled={isFull}
              className="flex items-center gap-1.5 px-4 py-2 text-[11px] font-black uppercase rounded-xl transition-all hover:brightness-110 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
              style={{
                background: isLive ? "#00ff88" : color,
                color: isLive || color === "#ffd700" || color === "#00ff88" ? "#000" : "#fff",
                boxShadow: `0 4px 14px ${color}33`,
              }}
            >
              {isLive ? <><Zap className="w-3.5 h-3.5" /> Join Live</> : "JOIN →"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CommunityMatchesPage() {
  const { user, authFetch } = useAuthContext();
  const { toast }           = useToast();
  const { openCreateMatch } = useCreateMatch();

  // ── Tab ──
  const [activeTab, setActiveTab] = useState("all");

  // ── Match data ──
  const [allMatches, setAllMatches] = useState<any[]>([]);
  const [loading, setLoading]       = useState(false);
  const [myJoinMap, setMyJoinMap]   = useState<Record<number, {
    adminRoomId: string | null; adminRoomPassword: string | null; status: string;
  }>>({});
  const [myJoinedMatches, setMyJoinedMatches] = useState<any[]>([]);

  // ── Join modal ──
  const [joinMatch, setJoinMatch]     = useState<any>(null);
  const [joinPlayers, setJoinPlayers] = useState<{ name: string; uid: string }[]>([{ name: "", uid: "" }]);
  const [joinPassword, setJoinPassword] = useState("");
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [joining, setJoining]         = useState(false);

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
      setMyJoinedMatches(data);
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
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => d && setWalletBalance(d.balance ?? 0))
        .catch(() => {});
    }
  }, [user, joinMatch]);

  // Community matches = user-created only (never admin)
  const communityMatches = allMatches.filter(
    (m) => m.creatorId !== "admin" && m.status !== "cancelled"
  );

  // Apply tab filter
  const filtered =
    activeTab === "all"
      ? communityMatches
      : communityMatches.filter((m) => m.matchType === activeTab);

  const openJoin = (m: any) => {
    if (!user) {
      toast({ title: "Sign in required", description: "Please sign in to join a match.", variant: "destructive" });
      return;
    }
    setJoinMatch(m);
    setJoinPlayers(Array.from({ length: playersForType(m.matchType) }, () => ({ name: "", uid: "" })));
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

  const activeTabMeta = TABS.find((t) => t.key === activeTab)!;

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 pt-16 pb-24">
        <div className="mt-4">

          {/* ── Page header ── */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#ff6b00]/10 border border-[#ff6b00]/20 text-[#ff6b00] text-[10px] font-black uppercase tracking-widest mb-3">
                <span className="w-1.5 h-1.5 rounded-full bg-[#ff6b00] animate-pulse" />
                Player Created
              </div>
              <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tight leading-tight">
                Community <span className="text-[#ff6b00]">Matches</span>
              </h1>
              <p className="text-[#606070] text-sm mt-1">
                Rooms created by players — join or create your own
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

          {/* ── My Messages (matches I joined) ── */}
          {user && myJoinedMatches.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-2 h-2 rounded-full bg-[#00ff88] animate-pulse" />
                <h2 className="text-xs font-black uppercase text-[#a0a0b0] tracking-wider">
                  My Messages
                  <span className="ml-2 text-[#4a4a5a]">({myJoinedMatches.length})</span>
                </h2>
                <button onClick={fetchMyJoins} className="ml-auto text-[#4a4a5a] hover:text-[#a0a0b0] transition-colors">
                  <RefreshCw className="w-3 h-3" />
                </button>
              </div>
              <div className="space-y-2">
                {myJoinedMatches.map((req: any) => {
                  const statusColor = req.status === "accepted" ? "#00ff88" : req.status === "rejected" ? "#ff2244" : "#ffd700";
                  const statusLabel = req.status === "accepted" ? "Accepted" : req.status === "rejected" ? "Rejected" : "Pending";
                  const effStatus = req.effectiveStatus ?? "waiting";
                  const isActive = effStatus === "active";
                  const startsAt = req.timerStartedAt && req.startDelayMinutes
                    ? new Date(new Date(req.timerStartedAt).getTime() + req.startDelayMinutes * 60000)
                    : null;
                  const copyText = (txt: string) => { navigator.clipboard.writeText(txt); toast({ title: "Copied!" }); };

                  return (
                    <div key={req.joinId} className="bg-[#0d0d16] border border-[#1e1e2e] rounded-xl px-3 py-3 hover:border-[#2a2a36] transition-colors">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-white text-xs font-bold truncate max-w-[160px]">
                              {req.matchName || `${req.matchType} Match`}
                            </span>
                            <span className="text-[10px] text-[#606070]">{req.matchType}</span>
                            {isActive && (
                              <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full bg-[#00ff88]/10 text-[#00ff88] border border-[#00ff88]/30">
                                <span className="w-1 h-1 rounded-full bg-[#00ff88] animate-pulse" /> LIVE
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-[#606070] mt-0.5">by {req.creatorName}</div>
                        </div>
                        <span
                          className="shrink-0 text-[9px] font-black uppercase px-2 py-0.5 rounded-full border"
                          style={{ color: statusColor, borderColor: `${statusColor}30`, background: `${statusColor}10` }}
                        >
                          {statusLabel}
                        </span>
                      </div>

                      {/* Timer countdown */}
                      {req.status === "accepted" && startsAt && !isActive && (
                        <div className="mt-2 flex items-center gap-1.5 text-[11px] text-[#a0a0b0]">
                          <Timer className="w-3 h-3 text-[#ff6b00]" />
                          <span>Starts in:</span>
                          <CountdownTimer targetDate={startsAt} className="text-[11px]" />
                        </div>
                      )}

                      {/* Room credentials */}
                      {req.status === "accepted" && req.adminRoomId && isActive && (
                        <div className="mt-2 grid grid-cols-2 gap-2">
                          <div className="bg-[#0a0a0f] rounded-lg px-2 py-1.5 flex items-center gap-1.5 min-w-0">
                            <span className="text-[#606070] text-[10px] shrink-0">Room</span>
                            <code className="text-[#00ff88] font-mono text-xs font-bold truncate flex-1">{req.adminRoomId}</code>
                            <button onClick={() => copyText(req.adminRoomId)} className="text-[#606070] hover:text-[#00ff88] shrink-0">
                              <Copy className="w-3 h-3" />
                            </button>
                          </div>
                          {req.adminRoomPassword && (
                            <div className="bg-[#0a0a0f] rounded-lg px-2 py-1.5 flex items-center gap-1.5 min-w-0">
                              <span className="text-[#606070] text-[10px] shrink-0">Pass</span>
                              <code className="text-yellow-400 font-mono text-xs font-bold truncate flex-1">{req.adminRoomPassword}</code>
                              <button onClick={() => copyText(req.adminRoomPassword)} className="text-[#606070] hover:text-yellow-400 shrink-0">
                                <Copy className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Accepted but no room set yet */}
                      {req.status === "accepted" && !req.adminRoomId && (
                        <div className="mt-2 flex items-center gap-1.5 text-[11px] text-[#00ff88]/70">
                          <CheckCircle className="w-3 h-3 shrink-0" />
                          You're in! Room details will appear once admin sets them.
                        </div>
                      )}

                      {/* Pending */}
                      {req.status === "pending" && (
                        <div className="mt-2 text-[11px] text-yellow-400/70">
                          Waiting for creator to approve your request.
                        </div>
                      )}

                      {/* Rejected */}
                      {req.status === "rejected" && (
                        <div className="mt-2 flex items-center gap-1.5 text-[11px] text-[#ff2244]/70">
                          <XCircle className="w-3 h-3 shrink-0" />
                          Your request was rejected.
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Filter tabs (sticky) ── */}
          <div className="sticky top-0 z-20 bg-[#0a0a0f] -mx-4 px-4 pt-1 pb-3 border-b border-[#12121a] mb-5">
            <div className="flex gap-2 overflow-x-auto scrollbar-none">
              {TABS.map((tab) => {
                const cnt = tab.key === "all"
                  ? communityMatches.length
                  : communityMatches.filter((m) => m.matchType === tab.key).length;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black uppercase whitespace-nowrap transition-all flex-shrink-0 ${
                      activeTab === tab.key
                        ? "bg-[#ff6b00] text-white shadow-[0_4px_16px_rgba(255,107,0,0.35)]"
                        : "bg-[#12121a] border border-[#2a2a36] text-[#a0a0b0] hover:text-white hover:border-[#3a3a46]"
                    }`}
                  >
                    <span>{tab.icon}</span>
                    {tab.label}
                    {cnt > 0 && (
                      <span
                        className={`ml-0.5 text-[9px] font-black px-1.5 py-0.5 rounded-full ${
                          activeTab === tab.key
                            ? "bg-white/20 text-white"
                            : "bg-[#1e1e2e] text-[#606070]"
                        }`}
                      >
                        {cnt}
                      </span>
                    )}
                  </button>
                );
              })}

              <button
                onClick={fetchMatches}
                className="ml-auto flex items-center gap-1.5 px-3 py-2 bg-[#12121a] border border-[#2a2a36] hover:border-[#3a3a46] rounded-xl text-[#606070] hover:text-[#a0a0b0] transition-all flex-shrink-0"
              >
                <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />
              </button>
            </div>
          </div>

          {/* ── Match list ── */}
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-44 bg-[#12121a] rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-[#1e1e2e] rounded-2xl">
              <div className="text-5xl mb-4 opacity-20">{activeTabMeta.icon}</div>
              <p className="text-[#606070] text-sm font-bold">
                {activeTab === "all"
                  ? "No community matches yet"
                  : `No ${activeTabMeta.label} matches yet`}
              </p>
              <p className="text-[#3a3a46] text-xs mt-1">
                Be the first — create a room and invite friends!
              </p>
              {user && (
                <button
                  onClick={openCreateMatch}
                  className="inline-flex items-center gap-2 px-4 py-2 mt-5 bg-[#ff6b00] text-white text-xs font-black uppercase rounded-xl hover:bg-[#e66000] transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" /> Create First Match
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filtered.map((m: any) => (
                <MatchCard
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
                    className="w-full bg-[#0a0a0f] border border-[#2a2a36] rounded-xl px-4 py-3 text-white text-base placeholder-[#4a4a5a] focus:outline-none focus:border-[#ff6b00] transition-colors"
                  />
                  <input
                    type="text"
                    placeholder="Free Fire UID *"
                    value={player.uid}
                    onChange={(e) => setJoinPlayers((prev) => prev.map((x, j) => j === idx ? { ...x, uid: e.target.value } : x))}
                    className="w-full bg-[#0a0a0f] border border-[#2a2a36] rounded-xl px-4 py-3 text-white text-base font-mono placeholder-[#4a4a5a] focus:outline-none focus:border-[#ff6b00] transition-colors"
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
                    className="w-full bg-[#0a0a0f] border border-yellow-500/30 rounded-xl px-4 py-3 text-white text-base placeholder-[#4a4a5a] focus:outline-none focus:border-yellow-400 transition-colors"
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
