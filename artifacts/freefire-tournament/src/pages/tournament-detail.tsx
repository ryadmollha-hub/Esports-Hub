import { useState, useEffect, useCallback } from "react";
import { useRoute, Link, useLocation, useSearch } from "wouter";
import { parseBDDate, formatBDTime, formatBDDate } from "@/lib/bdTime";
import {
  Trophy, Users, Calendar, Shield, ChevronLeft, Flame,
  UserPlus, UserMinus, Crown, Swords, CheckCircle, RefreshCw,
  Star, X, Wallet, Zap, Medal, Target, BookOpen, Lock,
  Radio, Clock, Key, Eye, EyeOff
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CountdownTimer from "@/components/CountdownTimer";
import LeaderboardModal from "@/components/LeaderboardModal";
import { useGetTournament, getGetTournamentQueryKey } from "@workspace/api-client-react";
import { useAuthContext } from "@/lib/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { apiBase } from "@/lib/apiBase";

const modeColors: Record<string, string> = {
  solo: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  duo: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  squad: "bg-[#ff6b00]/20 text-[#ff6b00] border-[#ff6b00]/30",
};

const modePlayerCount: Record<string, number> = {
  solo: 1,
  duo: 2,
  squad: 4,
};

function getPlayerCount(mode: string): number {
  if (modePlayerCount[mode]) return modePlayerCount[mode];
  const m = mode?.match(/^(\d+)v\d+$/i);
  if (m) return parseInt(m[1]);
  return 1;
}

const statusConfig: Record<string, { color: string; label: string; dot: string }> = {
  upcoming:     { color: "bg-yellow-500/20 text-yellow-400 border border-yellow-500/40",    label: "Upcoming",          dot: "bg-yellow-400" },
  coming_soon:  { color: "bg-blue-500/20 text-blue-400 border border-blue-500/40",          label: "Coming Soon",       dot: "bg-blue-400" },
  live:         { color: "bg-emerald-500/20 text-emerald-400 border border-emerald-500/50", label: "🔴 LIVE",           dot: "bg-emerald-400 animate-pulse" },
  ongoing:      { color: "bg-emerald-500/20 text-emerald-400 border border-emerald-500/50", label: "🔴 LIVE",           dot: "bg-emerald-400 animate-pulse" },
  room_open:    { color: "bg-orange-600/20 text-orange-400 border border-orange-500",       label: "🔑 Room Released",  dot: "bg-orange-400 animate-pulse" },
  ended:        { color: "bg-red-500/20 text-red-400 border border-red-500/40",             label: "Ended",             dot: "bg-red-400" },
  completed:    { color: "bg-red-500/20 text-red-400 border border-red-500/40",             label: "Completed",         dot: "bg-red-400" },
  cancelled:    { color: "bg-red-700/20 text-red-500 border border-red-700/40",             label: "Cancelled",         dot: "bg-red-500" },
};

const podiumConfig = [
  { rank: 1, emoji: "🥇", label: "1st Place", bg: "from-[#ffd700]/15 to-[#ff6b00]/10", border: "border-[#ffd700]/40", text: "text-[#ffd700]", icon: "w-16 h-16" },
  { rank: 2, emoji: "🥈", label: "2nd Place", bg: "from-gray-400/15 to-gray-600/5",    border: "border-gray-400/30",  text: "text-gray-300",  icon: "w-14 h-14" },
  { rank: 3, emoji: "🥉", label: "3rd Place", bg: "from-amber-600/15 to-amber-800/5",  border: "border-amber-600/30", text: "text-amber-500", icon: "w-12 h-12" },
];

interface Participant {
  id: number;
  userId: string;
  freefireUid: string;
  playerName: string;
  teamMembers?: string | null;
  kills: number;
  earnedAmount: string;
  resultRank: number | null;
  createdAt: string;
}

interface TeamMember {
  uid: string;
  name: string;
}

interface CategoryRule {
  category: string;
  rules: string;
}

interface MatchResult {
  id: number;
  playerName: string;
  rank: number;
  kills: number;
  points: number;
}

interface MatchInfo {
  id: number;
  matchNumber: number;
  scheduledAt: string;
  status: string;
  mapName?: string;
  roomId?: string | null;
  roomPassword?: string | null;
  roomVisible?: boolean;
  roomReleaseAt?: string | null;
  roomHideAt?: string | null;
  results?: MatchResult[];
  resultsPublished?: boolean;
}

export default function TournamentDetailPage() {
  const [, params] = useRoute("/tournaments/:id");
  const [, setLocation] = useLocation();
  const id = parseInt(params?.id ?? "0");
  const { user, authFetch, isLoading: authLoading } = useAuthContext();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [participants, setParticipants] = useState<Participant[]>([]);
  const [results, setResults] = useState<Participant[] | null>(null);
  const [resultsLoading, setResultsLoading] = useState(false);
  const [categoryRules, setCategoryRules] = useState<CategoryRule | null>(null);
  const [matches, setMatches] = useState<MatchInfo[]>([]);
  const [loadingPart, setLoadingPart] = useState(true);
  const [joining, setJoining] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [showRegistrationModal, setShowRegistrationModal] = useState(false);
  const [showFeeModal, setShowFeeModal] = useState(false);
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [showRoomPass, setShowRoomPass] = useState(false);
  const [showLeaderboardModal, setShowLeaderboardModal] = useState(false);

  // Hype Board state
  interface HypeMsg { id: number; userId: string; playerName: string; message: string; createdAt: string; }
  const [hypeMessages, setHypeMessages] = useState<HypeMsg[]>([]);
  const [hypeText, setHypeText] = useState("");
  const [hypePosting, setHypePosting] = useState(false);
  const [hypeLoading, setHypeLoading] = useState(false);

  // Registration form state
  const [regForm, setRegForm] = useState({
    uid: "",
    name: "",
    members: [] as TeamMember[],
  });
  const [selectedMode, setSelectedMode] = useState<string>("solo");

  const { data: tournament, isLoading } = useGetTournament(id, {
    query: { enabled: !!id, queryKey: getGetTournamentQueryKey(id), refetchInterval: 30000 },
  });

  const t = tournament as any;

  const loadParticipants = useCallback(async () => {
    if (!id) return;
    setLoadingPart(true);
    try {
      const res = await fetch(`${apiBase}/api/tournaments/${id}/participants`);
      if (res.ok) setParticipants(await res.json());
    } catch {} finally { setLoadingPart(false); }
  }, [id]);

  const loadResults = useCallback(async () => {
    if (!id) return;
    setResultsLoading(true);
    try {
      const res = await fetch(`${apiBase}/api/tournaments/${id}/results`);
      if (res.ok) {
        const data = await res.json();
        setResults(data.results ?? []);
      }
    } catch {} finally {
      setResultsLoading(false);
    }
  }, [id]);

  const loadRules = useCallback(async () => {
    if (!id) return;
    const category = t?.gameMode;
    if (!category) { setCategoryRules(null); return; }
    try {
      const res = await fetch(`${apiBase}/api/category-rules/${encodeURIComponent(category)}`);
      if (res.ok) {
        const data = await res.json();
        setCategoryRules({ category: data.category ?? category, rules: data.rules ?? "" });
      }
    } catch {}
  }, [id, t?.gameMode]);

  const loadMatches = useCallback(async () => {
    if (!id) return;
    try {
      const res = await fetch(`${apiBase}/api/tournaments/${id}/matches`);
      if (res.ok) setMatches(await res.json());
    } catch {}
  }, [id]);

  const loadBalance = useCallback(async () => {
    if (!user) return;
    try {
      const res = await authFetch("/wallet/balance");
      if (res.ok) {
        const d = await res.json();
        setWalletBalance(d.balance ?? 0);
      }
    } catch {}
  }, [user, authFetch]);

  const loadHype = useCallback(async () => {
    if (!id) return;
    setHypeLoading(true);
    try {
      const res = await fetch(`${apiBase}/api/tournaments/${id}/hype`);
      if (res.ok) setHypeMessages(await res.json());
    } catch {} finally { setHypeLoading(false); }
  }, [id]);

  const postHype = async () => {
    if (!hypeText.trim() || hypePosting) return;
    setHypePosting(true);
    try {
      const res = await authFetch(`/tournaments/${id}/hype`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: hypeText.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { toast({ title: data.error ?? "Failed", variant: "destructive" }); return; }
      setHypeText("");
      loadHype();
    } catch { toast({ title: "Network error", variant: "destructive" }); }
    finally { setHypePosting(false); }
  };

  const deleteHype = async (msgId: number) => {
    try {
      await authFetch(`/hype/${msgId}`, { method: "DELETE" });
      setHypeMessages(prev => prev.filter(m => m.id !== msgId));
    } catch {}
  };

  useEffect(() => {
    loadParticipants();
    loadRules();
    loadMatches();
    loadHype();
    if (t?.resultsPublished) loadResults();
  }, [loadParticipants, loadRules, loadMatches, loadHype, t?.resultsPublished]);

  useEffect(() => {
    // Poll every 30 s so time-based status transitions (Coming Soon → Room Released →
    // Match Live → Match Completed) are reflected quickly without a manual refresh.
    const id = setInterval(() => loadMatches(), 30000);
    return () => clearInterval(id);
  }, [loadMatches]);

  useEffect(() => {
    // Poll hype board every 30 s so new messages appear automatically
    // without requiring a manual refresh.
    const id = setInterval(() => loadHype(), 30000);
    return () => clearInterval(id);
  }, [loadHype]);

  useEffect(() => {
    if (user) loadBalance();
  }, [user, loadBalance]);

  // Initialize team members when tournament mode becomes known
  useEffect(() => {
    if (t?.mode) {
      setSelectedMode(t.mode);
      const count = getPlayerCount(t.mode);
      const membersNeeded = count - 1;
      setRegForm(prev => ({
        ...prev,
        members: Array.from({ length: membersNeeded }, (_, i) => prev.members[i] ?? { uid: "", name: "" }),
      }));
    }
  }, [t?.mode]);

  const isJoined = !!user && participants.some((p) => p.userId === user.userId);
  const isFull = t ? t.filledSlots >= t.maxSlots : false;
  const entryFee = t ? Number(t.entryFee) : 0;
  const canLeave = false; // No leave / no refund policy — entry is final
  const nowMs = Date.now();

  // Match-level status buckets — derived from what the API returns (effectiveStatus),
  // which already has computeMatchVisibility applied server-side.
  // BUG FIX 1: do NOT gate liveMatches on scheduledAt — if the admin explicitly
  // set a match to "live", registration must close immediately regardless of start time.
  const liveMatches        = matches.filter(m => m.status === "live");
  const upcomingMatches    = matches.filter(m => m.status === "scheduled" || m.status === "room_released");
  const completedMatches   = matches.filter(m => m.status === "completed");
  const matchesWithResults = matches.filter(m => m.results && m.results.length > 0);

  // BUG FIX 2: isEnded must include match-level completion.
  // When admin marks a match "completed" via PATCH /matches/:id, only the match record
  // changes — the parent tournament t.status stays "upcoming". Without this check the
  // JOIN button would wrongly remain visible after match completion.
  const isEnded = (
    t?.status === "ended" ||
    t?.status === "completed" ||
    completedMatches.length > 0
  );

  // Room is "open" (Phase 2: Room Released) when the API returns status "room_released".
  // This is the distinct phase between room credentials being visible and match start.
  const roomOpen = matches.some(m => m.status === "room_released");

  // Tournament is "live" when the tournament-level status is live/ongoing,
  // OR when the admin has manually set any match to "live" status.
  // Guard: not "live" when already ended (completed takes precedence).
  const isLive = !isEnded && (
    t?.status === "live" ||
    t?.status === "ongoing" ||
    liveMatches.length > 0
  );
  const isRegistrationClosed = isLive || isEnded || t?.status === "cancelled";

  const doJoin = async () => {
    if (!user) { setLocation("/sign-in"); return; }
    setJoining(true);
    setShowFeeModal(false);
    setShowRegistrationModal(false);
    try {
      const modalCount = getPlayerCount(selectedMode);
      const teamMembers = modalCount > 1 ? regForm.members.slice(0, modalCount - 1) : undefined;

      // Validate
      if (!regForm.uid.trim()) {
        toast({ title: "Enter your Free Fire UID", variant: "destructive" });
        setJoining(false);
        return;
      }
      if (teamMembers) {
        for (let i = 0; i < teamMembers.length; i++) {
          if (!teamMembers[i].uid.trim() || !teamMembers[i].name.trim()) {
            toast({ title: `Enter UID and name for Player ${i + 2}`, variant: "destructive" });
            setJoining(false);
            return;
          }
        }
      }

      const res = await authFetch(`/tournaments/${id}/join`, {
        method: "POST",
        body: JSON.stringify({
          freefireUid: regForm.uid.trim(),
          playerName: regForm.name.trim() || undefined,
          teamMembers: teamMembers?.map(m => ({ uid: m.uid.trim(), name: m.name.trim() })),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        const msg = data.entryFeeDeducted > 0
          ? `Joined! ৳${data.entryFeeDeducted} entry fee deducted from your wallet.`
          : "You have successfully joined the tournament.";
        toast({ title: "🎮 Joined!", description: msg });
        queryClient.invalidateQueries({ queryKey: getGetTournamentQueryKey(id) });
        loadParticipants();
        loadBalance();
      } else if (data.requiresProfile) {
        setShowRegistrationModal(true);
      } else if (data.insufficientBalance) {
        toast({ title: "Insufficient Balance", description: data.error, variant: "destructive" });
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Connection error. Please try again.", variant: "destructive" });
    } finally { setJoining(false); }
  };

  const handleJoinClick = () => {
    if (!user) { setLocation("/sign-in"); return; }
    // Always show registration modal for UID entry
    setShowRegistrationModal(true);
  };

  const handleRegistrationSubmit = () => {
    if (entryFee > 0) {
      setShowRegistrationModal(false);
      setShowFeeModal(true);
    } else {
      doJoin();
    }
  };

  const handleModeChange = (mode: string) => {
    setSelectedMode(mode);
    const count = getPlayerCount(mode);
    const membersNeeded = count - 1;
    setRegForm(prev => ({
      ...prev,
      members: Array.from({ length: membersNeeded }, (_, i) => prev.members[i] ?? { uid: "", name: "" }),
    }));
  };

  const doLeave = async () => {
    if (!window.confirm("Are you sure you want to leave this tournament?")) return;
    setLeaving(true);
    try {
      const res = await authFetch(`/tournaments/${id}/join`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok) {
        const msg = data.refunded > 0
          ? `Left tournament. ৳${data.refunded} entry fee refunded.`
          : "You have left the tournament.";
        toast({ title: "Left tournament", description: msg });
        queryClient.invalidateQueries({ queryKey: getGetTournamentQueryKey(id) });
        loadParticipants();
        loadBalance();
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Connection error. Please try again.", variant: "destructive" });
    } finally { setLeaving(false); }
  };

  const searchStr = useSearch();
  const fromSlug = new URLSearchParams(searchStr).get("from");
  const backHref = fromSlug ? `/tournaments/${fromSlug}` : "/tournaments";
  const handleBack = () => {
    if (window.history.length > 1) window.history.back();
    else setLocation(backHref);
  };

  function BackButton() {
    return (
      <button
        onClick={handleBack}
        className="inline-flex items-center gap-2 text-[#a0a0b0] hover:text-white mb-6 transition-colors"
      >
        <ChevronLeft className="w-4 h-4" /> Back to Tournaments
      </button>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f]">
        <Navbar />
        <div className="max-w-5xl mx-auto px-4 pt-16">
          <div className="h-64 bg-[#12121a] rounded-xl animate-pulse mb-6" />
          <div className="h-8 bg-[#12121a] rounded animate-pulse w-1/2 mb-4" />
          <div className="h-4 bg-[#12121a] rounded animate-pulse w-3/4" />
        </div>
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <Navbar />
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-2">Tournament Not Found</h2>
          <Link href="/tournaments" className="text-[#ff6b00]">Back to Tournaments</Link>
        </div>
      </div>
    );
  }

  const slotPct = Math.min((t.filledSlots / t.maxSlots) * 100, 100);
  const slotsLeft = t.maxSlots - t.filledSlots;
  // Effective display status — priority order:
  // 1. resultsPublished OR ended/completed → always "completed"/"ended" (overrides room_open)
  // 2. If room credentials are out but match hasn't started → "room_open"
  // 3. Otherwise fall back to the tournament's own status field
  const effectiveDisplayStatus = (isEnded || t.resultsPublished)
    ? (t.status === "cancelled" ? "cancelled" : t.status === "completed" ? "completed" : "ended")
    : (!isLive && roomOpen ? "room_open" : t.status);
  const statusCfg = statusConfig[effectiveDisplayStatus] ?? statusConfig.upcoming;
  const hasWinner = !!t.winnerId && !!t.winnerName;
  const playerCount = getPlayerCount(t.mode);
  const totalEntryFee = entryFee * playerCount;
  const modalFee = entryFee * getPlayerCount(selectedMode);

  const podiumResults = results?.filter((r) => r.resultRank && r.resultRank <= 3)
    .sort((a, b) => (a.resultRank ?? 99) - (b.resultRank ?? 99)) ?? [];
  const otherResults = results?.filter((r) => !r.resultRank || r.resultRank > 3)
    .sort((a, b) => (b.kills ?? 0) - (a.kills ?? 0)) ?? [];

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 pt-16 pb-20">
        <BackButton />

        {/* ── Winner Banner ── */}
        {hasWinner && !t.resultsPublished && (
          <div className="mb-6 relative bg-gradient-to-r from-[#ffd700]/15 via-[#ff6b00]/10 to-[#ffd700]/15 border border-[#ffd700]/40 rounded-2xl p-5 overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,215,0,0.08),transparent_70%)]" />
            <div className="relative flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-[#ffd700]/20 border-2 border-[#ffd700]/60 flex items-center justify-center shrink-0">
                <Crown className="w-7 h-7 text-[#ffd700]" />
              </div>
              <div>
                <div className="text-[#ffd700] text-xs font-black uppercase tracking-wider mb-0.5">
                  {t.autoWinner ? "🎲 Auto-Selected Winner" : "👑 Tournament Winner"}
                </div>
                <div className="text-white font-black text-2xl">{t.winnerName}</div>
              </div>
            </div>
          </div>
        )}

        {/* ── Banner ── */}
        <div className="relative h-56 md:h-72 rounded-2xl overflow-hidden mb-8 bg-gradient-to-br from-[#1a1a24] to-[#0a0a0f]">
          {t.bannerUrl ? (
            <img src={t.bannerUrl} alt={t.name} className="w-full h-full object-cover opacity-60" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Flame className="w-20 h-20 text-[#ff6b00]/20" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f] via-[#0a0a0f]/30 to-transparent" />
          <div className="absolute bottom-5 left-5 right-5">
            <div className="flex flex-wrap gap-2 mb-2">
              <span className={`text-xs font-bold px-3 py-1 rounded-full border uppercase ${modeColors[t.mode]}`}>{t.mode}</span>
              <span className={`text-xs font-bold px-3 py-1 rounded-full border uppercase flex items-center gap-1.5 ${statusCfg.color}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />
                {statusCfg.label}
              </span>
              {t.resultsPublished && (
                <span className="text-xs font-bold px-3 py-1 rounded-full border uppercase bg-purple-500/20 text-purple-400 border-purple-500/30">
                  Results Published
                </span>
              )}
            </div>
            <h1 className="text-2xl md:text-4xl font-black">{t.name}</h1>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6">

          {/* ── Left Column ── */}
          <div className="md:col-span-2 space-y-5">

            {/* Status Alert Banners */}
            {t.resultsPublished && (
              <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4 flex items-center gap-3">
                <Trophy className="w-5 h-5 text-purple-400 shrink-0" />
                <div>
                  <div className="text-purple-400 font-black uppercase text-sm">Results Published</div>
                  <div className="text-[#a0a0b0] text-xs">Match has ended. View the final leaderboard below.</div>
                </div>
              </div>
            )}
            {isLive && !t.resultsPublished && (
              <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 flex items-center gap-3 animate-pulse">
                <Radio className="w-5 h-5 text-green-400 shrink-0" />
                <div>
                  <div className="text-green-400 font-black uppercase text-sm">🔴 Match is Live!</div>
                  <div className="text-[#a0a0b0] text-xs">Registration is closed. Check room details if you're a participant.</div>
                </div>
              </div>
            )}
            {isEnded && !t.resultsPublished && (
              <div className="bg-gray-500/10 border border-gray-500/30 rounded-xl p-4 flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-gray-400 shrink-0" />
                <div>
                  <div className="text-gray-400 font-black uppercase text-sm">Match Completed</div>
                  <div className="text-[#a0a0b0] text-xs">Results will be published soon.</div>
                </div>
              </div>
            )}

            {t.description && (
              <div className="bg-[#12121a] rounded-xl border border-[#ff6b00]/20 p-5">
                <h3 className="text-white font-bold uppercase text-sm mb-2 tracking-wider">About</h3>
                <p className="text-[#a0a0b0] leading-relaxed text-sm">{t.description}</p>
              </div>
            )}

            {/* Countdown — visible for upcoming AND when room is released (timer keeps ticking).
                Priority: count down to the earliest upcoming room release time first;
                once the room is released, count down to match start instead. */}
            {(t.status === "upcoming" || roomOpen) && (() => {
              // Find the earliest match that still has a future room release pending
              const nextRelease = matches
                .filter(m => !m.roomVisible && m.roomReleaseAt && parseBDDate(m.roomReleaseAt as string).getTime() > nowMs)
                .map(m => m.roomReleaseAt as string)
                .sort((a, b) => parseBDDate(a).getTime() - parseBDDate(b).getTime())[0];

              const countdownTarget = nextRelease ?? (t.countdownTo ?? t.startDate);
              if (!countdownTarget) return null;

              const isReleaseCountdown = !!nextRelease;
              return (
                <div className={`rounded-xl border p-5 ${roomOpen ? "bg-orange-600/5 border-orange-500/30" : isReleaseCountdown ? "bg-blue-600/5 border-blue-500/20" : "bg-[#12121a] border-[#ff6b00]/20"}`}>
                  <h3 className={`font-bold uppercase text-sm mb-3 tracking-wider ${roomOpen ? "text-orange-400" : isReleaseCountdown ? "text-blue-400" : "text-white"}`}>
                    {roomOpen ? "🔑 Match Starts In" : isReleaseCountdown ? "🔒 Room Released In" : "Starts In"}
                  </h3>
                  <CountdownTimer
                    targetDate={countdownTarget}
                    className="text-3xl gap-4"
                    onExpire={loadMatches}
                  />
                  {roomOpen && (
                    <p className="mt-3 text-orange-300/70 text-xs">Room credentials are now available. Check your join details.</p>
                  )}
                  {isReleaseCountdown && !roomOpen && (
                    <p className="mt-3 text-blue-300/70 text-xs">Room ID and Password will be revealed automatically when this timer reaches zero.</p>
                  )}
                </div>
              );
            })()}

            {/* ── LIVE MATCHES SECTION ── */}
            {liveMatches.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-green-400 font-black uppercase text-sm tracking-wider flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                  Live Matches
                </h3>
                {liveMatches.map(match => (
                  <div key={match.id} className="bg-green-500/10 border border-green-500/30 rounded-xl p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black px-2.5 py-1 rounded-full bg-green-500/20 text-green-400 border border-green-500/30 uppercase flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" /> Live
                        </span>
                        <span className="text-white font-bold">Match #{match.matchNumber}</span>
                        {match.mapName && <span className="text-[#a0a0b0] text-xs">{match.mapName}</span>}
                      </div>
                      <div className="flex items-center gap-1.5 text-[#a0a0b0] text-xs">
                        <Clock className="w-3.5 h-3.5" />
                        {formatBDTime(match.scheduledAt)}
                      </div>
                    </div>
                    {match.roomVisible && isJoined && Date.now() >= (match.roomReleaseAt ? parseBDDate(match.roomReleaseAt).getTime() : parseBDDate(match.scheduledAt).getTime()) ? (
                      <div className="grid grid-cols-2 gap-3 mt-3">
                        <div className="bg-[#0a0a0f]/60 rounded-lg p-3">
                          <div className="text-[#a0a0b0] text-xs uppercase mb-1 flex items-center gap-1">
                            <Key className="w-3 h-3" /> Room ID
                          </div>
                          <div className="text-white font-mono font-black text-lg">{match.roomId}</div>
                        </div>
                        <div className="bg-[#0a0a0f]/60 rounded-lg p-3">
                          <div className="text-[#a0a0b0] text-xs uppercase mb-1 flex items-center gap-1">
                            <Lock className="w-3 h-3" /> Password
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="text-white font-mono font-black text-lg">
                              {showRoomPass ? match.roomPassword : "••••••"}
                            </div>
                            <button onClick={() => setShowRoomPass(!showRoomPass)} className="text-[#a0a0b0] hover:text-white">
                              {showRoomPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : match.roomVisible && !isJoined && Date.now() >= (match.roomReleaseAt ? parseBDDate(match.roomReleaseAt).getTime() : parseBDDate(match.scheduledAt).getTime()) ? (
                      <div className="text-center py-2 text-[#a0a0b0] text-sm">
                        Join the tournament to view room details.
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 mt-2 text-[#a0a0b0] text-sm">
                        <Lock className="w-4 h-4" />
                        Room details available to joined players.
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Upcoming Matches */}
            {upcomingMatches.length > 0 && (
              <div className={`rounded-xl border p-5 ${roomOpen ? "bg-[#ff6b00]/5 border-[#ff6b00]/30" : "bg-[#12121a] border-[#ff6b00]/20"}`}>
                <h3 className="text-white font-bold uppercase text-sm mb-3 tracking-wider flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[#ff6b00]" /> Scheduled Matches
                  {roomOpen && (
                    <span className="ml-auto text-[10px] font-black text-[#ff6b00] bg-[#ff6b00]/10 border border-[#ff6b00]/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#ff6b00] animate-pulse inline-block" /> Room Released
                    </span>
                  )}
                </h3>
                <div className="space-y-3">
                  {upcomingMatches.map(match => {
                    // parseBDDate: treat naive timestamps as UTC+6 so release/hide
                    // windows are correct regardless of server or browser timezone.
                    const scheduledMs = parseBDDate(match.scheduledAt).getTime();
                    const releaseMs = match.roomReleaseAt
                      ? parseBDDate(match.roomReleaseAt).getTime()
                      : scheduledMs - 10 * 60 * 1000;
                    const hideMs = match.roomHideAt
                      ? parseBDDate(match.roomHideAt).getTime()
                      : scheduledMs + 60 * 60 * 1000;
                    const nowMs = Date.now();
                    const minsToRelease = Math.ceil((releaseMs - nowMs) / 60000);
                    const roomClosed = nowMs >= hideMs;
                    const roomSoon = !roomClosed && minsToRelease <= 60 && minsToRelease > 0;
                    return (
                      <div key={match.id} className="border-b border-[#1a1a24] last:border-0 pb-3 last:pb-0">
                        <div className="flex items-center justify-between py-1">
                          <div className="flex items-center gap-3">
                            <span className="text-[#a0a0b0] text-xs uppercase bg-[#1a1a24] px-2 py-0.5 rounded font-bold">#{match.matchNumber}</span>
                            <div>
                              <div className="text-white text-sm font-bold">Match #{match.matchNumber}</div>
                              {match.mapName && <div className="text-[#a0a0b0] text-xs">{match.mapName}</div>}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-white text-sm font-bold">{formatBDTime(match.scheduledAt)}</div>
                            <div className="text-[#a0a0b0] text-xs">{formatBDDate(match.scheduledAt)}</div>
                            {match.roomVisible ? (
                              <div className="text-[#ff6b00] text-[10px] font-black mt-0.5 flex items-center justify-end gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#ff6b00] animate-pulse inline-block" /> Room Released
                              </div>
                            ) : roomClosed ? (
                              <div className="text-[#a0a0b0] text-[10px] font-bold mt-0.5">🔴 Room closed</div>
                            ) : (
                              <div className="text-blue-400 text-[10px] font-bold mt-0.5">⏳ Coming Soon</div>
                            )}
                          </div>
                        </div>
                        {/* Per-match countdown to room release — only when room not yet visible and release time is in the future */}
                        {!match.roomVisible && !roomClosed && match.roomReleaseAt && releaseMs > nowMs && (
                          <div className="mt-2 flex items-center gap-2 bg-blue-500/5 border border-blue-500/20 rounded-lg px-3 py-2">
                            <Lock className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                            <span className="text-blue-400 text-xs font-bold uppercase">Room releases in:</span>
                            <CountdownTimer
                              targetDate={match.roomReleaseAt as string}
                              className="text-sm gap-1"
                              onExpire={loadMatches}
                            />
                          </div>
                        )}
                        {/* Show credentials when room is released, to joined players only */}
                        {match.roomVisible && isJoined && Date.now() >= (match.roomReleaseAt ? parseBDDate(match.roomReleaseAt).getTime() : parseBDDate(match.scheduledAt).getTime()) && (
                          <div className="grid grid-cols-2 gap-3 mt-2">
                            <div className="bg-[#0a0a0f]/60 rounded-lg p-3 border border-[#ff6b00]/20">
                              <div className="text-[#a0a0b0] text-xs uppercase mb-1 flex items-center gap-1">
                                <Key className="w-3 h-3" /> Room ID
                              </div>
                              <div className="text-white font-mono font-black text-lg">{match.roomId}</div>
                            </div>
                            <div className="bg-[#0a0a0f]/60 rounded-lg p-3 border border-[#ff6b00]/20">
                              <div className="text-[#a0a0b0] text-xs uppercase mb-1 flex items-center gap-1">
                                <Lock className="w-3 h-3" /> Password
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="text-white font-mono font-black text-lg">
                                  {showRoomPass ? match.roomPassword : "••••••"}
                                </div>
                                <button onClick={() => setShowRoomPass(!showRoomPass)} className="text-[#a0a0b0] hover:text-white">
                                  {showRoomPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                        {match.roomVisible && !isJoined && Date.now() >= (match.roomReleaseAt ? parseBDDate(match.roomReleaseAt).getTime() : parseBDDate(match.scheduledAt).getTime()) && (
                          <div className="mt-2 text-center text-[#a0a0b0] text-xs py-2 bg-[#1a1a24] rounded-lg">
                            Join the tournament to view room credentials.
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Tournament Room Info (legacy - for tournaments without matches) */}
            {(isLive) && t.roomId && isJoined && matches.length === 0 && (
              <div className="bg-[#ff6b00]/10 rounded-xl border border-[#ff6b00]/40 p-5">
                <h3 className="text-[#ff6b00] font-bold uppercase text-sm mb-3 tracking-wider flex items-center gap-2">
                  <Shield className="w-4 h-4" /> Room Details (Joined Players Only)
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-[#a0a0b0] text-xs uppercase mb-1">Room ID</div>
                    <div className="text-white font-mono font-bold text-xl">{t.roomId}</div>
                  </div>
                  {t.roomPassword && (
                    <div>
                      <div className="text-[#a0a0b0] text-xs uppercase mb-1">Password</div>
                      <div className="text-white font-mono font-bold text-xl">{t.roomPassword}</div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── RESULTS SECTION ── */}
            {(t.resultsPublished || matchesWithResults.length > 0) && (
              <div id="results-section" className="space-y-4">

                {/* ── Per-match results (published via admin "Save Results" flow) ── */}
                {matchesWithResults.map((m) => (
                  <div key={m.id} className="bg-[#12121a] rounded-xl border border-[#ff6b00]/20 p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <Trophy className="w-4 h-4 text-[#ffd700]" />
                      <h3 className="text-white font-black uppercase text-sm tracking-wider">
                        Match #{m.matchNumber} Results{m.mapName ? ` · ${m.mapName}` : ""}
                      </h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-[#a0a0b0] text-xs uppercase border-b border-[#2a2a36]">
                            <th className="text-left py-2 pr-3 w-12">Rank</th>
                            <th className="text-left py-2 pr-3">Player</th>
                            <th className="text-right py-2 pr-3">Kills</th>
                            <th className="text-right py-2">Prize</th>
                          </tr>
                        </thead>
                        <tbody>
                          {m.results!.map((r, idx) => {
                            const medal = r.rank === 1 ? "🥇" : r.rank === 2 ? "🥈" : r.rank === 3 ? "🥉" : null;
                            return (
                              <tr key={r.id ?? idx} className="border-b border-[#1a1a24] last:border-0">
                                <td className="py-2.5 pr-3">
                                  <span className="font-black text-[#a0a0b0]">{medal ?? `#${r.rank}`}</span>
                                </td>
                                <td className="py-2.5 pr-3">
                                  <div className="font-bold text-white">{r.playerName}</div>
                                </td>
                                <td className="py-2.5 pr-3 text-right">
                                  <span className="text-white font-bold">{r.kills}</span>
                                </td>
                                <td className="py-2.5 text-right">
                                  <span className={`font-black ${r.points > 0 ? "text-[#00ff88]" : "text-[#a0a0b0]"}`}>
                                    {r.points > 0 ? `৳${r.points.toLocaleString()}` : "—"}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}

                {/* ── Per-tournament registration results (published via "Publish Results" flow) ── */}
                {t.resultsPublished && resultsLoading && (
                  <div className="flex items-center justify-center py-10 gap-3">
                    <div className="w-5 h-5 border-2 border-[#ff6b00] border-t-transparent rounded-full animate-spin" />
                    <span className="text-[#a0a0b0] text-xs uppercase font-bold tracking-wider">Loading results…</span>
                  </div>
                )}

                {t.resultsPublished && !resultsLoading && results !== null && (
                  <>
                    {podiumResults.length > 0 && (
                      <div className="bg-[#12121a] rounded-xl border border-[#ff6b00]/20 p-5">
                        <div className="flex items-center gap-2 mb-5">
                          <Trophy className="w-5 h-5 text-[#ffd700]" />
                          <h3 className="text-white font-black uppercase text-sm tracking-wider">Tournament Results</h3>
                        </div>
                        <div className="space-y-3 mb-4">
                          {podiumResults.map((player) => {
                            const cfg = podiumConfig.find((c) => c.rank === player.resultRank)!;
                            return (
                              <div key={player.id} className={`relative bg-gradient-to-r ${cfg.bg} border ${cfg.border} rounded-xl p-4 overflow-hidden`}>
                                <div className="flex items-center gap-4">
                                  <div className="text-4xl shrink-0 leading-none">{cfg.emoji}</div>
                                  <div className="flex-1 min-w-0">
                                    <div className={`font-black text-lg ${cfg.text}`}>{player.playerName}</div>
                                    <div className="text-[#a0a0b0] text-xs font-mono">UID: {player.freefireUid}</div>
                                  </div>
                                  <div className="text-right shrink-0">
                                    <div className="flex items-center gap-1.5 justify-end mb-1">
                                      <Target className="w-3.5 h-3.5 text-[#ff6b00]" />
                                      <span className="text-white font-black">{player.kills} kills</span>
                                    </div>
                                    <div className={`font-black text-lg ${cfg.text}`}>
                                      ৳{Number(player.earnedAmount).toLocaleString()}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {(podiumResults.length > 0 || otherResults.length > 0) && (
                      <div className="bg-[#12121a] rounded-xl border border-[#ff6b00]/20 p-5">
                        <h3 className="text-white font-bold uppercase text-sm mb-4 tracking-wider flex items-center gap-2">
                          <Medal className="w-4 h-4 text-[#ff6b00]" /> Full Leaderboard
                        </h3>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="text-[#a0a0b0] text-xs uppercase border-b border-[#2a2a36]">
                                <th className="text-left py-2 pr-3">Rank</th>
                                <th className="text-left py-2 pr-3">Player</th>
                                <th className="text-left py-2 pr-3 hidden sm:table-cell">UID</th>
                                <th className="text-right py-2 pr-3">Kills</th>
                                <th className="text-right py-2">Earned</th>
                              </tr>
                            </thead>
                            <tbody>
                              {[...podiumResults, ...otherResults].map((player, i) => {
                                const emoji = player.resultRank === 1 ? "🥇" : player.resultRank === 2 ? "🥈" : player.resultRank === 3 ? "🥉" : null;
                                const rowNum = i + 1;
                                return (
                                  <tr key={player.id} className={`border-b border-[#1a1a24] last:border-0 ${player.userId === user?.userId ? "bg-[#ff6b00]/5" : ""}`}>
                                    <td className="py-2.5 pr-3"><span className="font-black text-[#a0a0b0]">{emoji ?? `#${rowNum}`}</span></td>
                                    <td className="py-2.5 pr-3">
                                      <div className="font-bold text-white">{player.playerName}</div>
                                      {player.userId === user?.userId && <span className="text-[10px] text-[#00ff88] font-bold">You</span>}
                                    </td>
                                    <td className="py-2.5 pr-3 hidden sm:table-cell"><span className="text-[#a0a0b0] font-mono text-xs">{player.freefireUid}</span></td>
                                    <td className="py-2.5 pr-3 text-right"><span className="text-white font-bold">{player.kills}</span></td>
                                    <td className="py-2.5 text-right">
                                      <span className={`font-black ${Number(player.earnedAmount) > 0 ? "text-[#00ff88]" : "text-[#a0a0b0]"}`}>
                                        {Number(player.earnedAmount) > 0 ? `৳${Number(player.earnedAmount).toLocaleString()}` : "—"}
                                      </span>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Prizes */}
            {t.prizes && t.prizes.length > 0 && (
              <div className="bg-[#12121a] rounded-xl border border-[#ff6b00]/20 p-5">
                <h3 className="text-white font-bold uppercase text-sm mb-3 tracking-wider">Prize Distribution</h3>
                <div className="space-y-2">
                  {t.prizes.map((prize: any, i: number) => {
                    const rankColors = [
                      { trophy: "text-[#FFD700]", amount: "text-[#FFD700]", label: "text-[#FFD700]" },
                      { trophy: "text-[#C0C0C0]", amount: "text-[#C0C0C0]", label: "text-[#C0C0C0]" },
                      { trophy: "text-[#CD7F32]", amount: "text-[#CD7F32]", label: "text-[#CD7F32]" },
                    ];
                    const rc = rankColors[i] ?? { trophy: "text-[#a0a0b0]", amount: "text-white", label: "text-white" };
                    return (
                      <div key={prize.id} className="flex items-center justify-between py-2 border-b border-[#ff6b00]/10 last:border-0">
                        <div className="flex items-center gap-3">
                          <Trophy className={`w-5 h-5 ${rc.trophy}`} />
                          <div>
                            <div className={`font-bold text-sm ${i < 3 ? rc.label : "text-white"}`}>{prize.rank}</div>
                            {prize.percentage && <div className="text-[#a0a0b0] text-xs">{prize.percentage}% of pool</div>}
                          </div>
                        </div>
                        <div className={`font-black text-lg ${rc.amount}`}>
                          ৳{Number(prize.amount).toLocaleString()}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Participants List — only when results not published */}
            {!t.resultsPublished && (
              <div className="bg-[#12121a] rounded-xl border border-[#ff6b00]/20 p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-[#ff6b00]" />
                    <h3 className="text-white font-bold uppercase text-sm tracking-wider">
                      Players ({participants.length}/{t.maxSlots})
                    </h3>
                  </div>
                  <button onClick={loadParticipants} className="text-[#a0a0b0] hover:text-white transition-colors" title="Refresh">
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>

                <div className="mb-4">
                  <div className="flex justify-between text-xs text-[#a0a0b0] mb-1.5">
                    <span>{t.filledSlots} joined</span>
                    <span className={slotsLeft === 0 ? "text-[#ff2244] font-bold" : "text-[#00ff88]"}>
                      {slotsLeft === 0 ? "FULL" : `${slotsLeft} slots left`}
                    </span>
                  </div>
                  <div className="h-2 bg-[#1a1a24] rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        slotPct >= 90 ? "bg-gradient-to-r from-[#ff2244] to-[#ff6b00]"
                        : slotPct >= 60 ? "bg-gradient-to-r from-[#ff6b00] to-[#ffd700]"
                        : "bg-gradient-to-r from-[#00ff88] to-[#ff6b00]"
                      }`}
                      style={{ width: `${slotPct}%` }}
                    />
                  </div>
                </div>

                {loadingPart ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map((i) => <div key={i} className="h-12 bg-[#1a1a24] rounded-xl animate-pulse" />)}
                  </div>
                ) : participants.length === 0 ? (
                  <div className="text-center py-8">
                    <Swords className="w-10 h-10 mx-auto mb-2 text-[#ff6b00]/20" />
                    <p className="text-[#a0a0b0] text-sm">No players yet. Be the first to join!</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                    {participants.map((p, i) => {
                      const members: TeamMember[] = p.teamMembers ? JSON.parse(p.teamMembers) : [];
                      const isWinner = p.userId === t.winnerId;
                      const isSquad = members.length > 0;
                      return (
                        <div key={p.id} className={`rounded-xl overflow-hidden border ${
                          isWinner ? "border-[#ffd700]/40" : "border-[#2a2a36]"
                        }`}>
                          {/* Team Leader Row */}
                          <div className={`flex items-center gap-3 p-3 ${
                            isWinner ? "bg-[#ffd700]/10" : "bg-[#1a1a24]"
                          }`}>
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${
                              isWinner ? "bg-[#ffd700]/20 text-[#ffd700]" : "bg-[#ff6b00]/15 text-[#ff6b00]"
                            }`}>
                              {isWinner ? <Crown className="w-3.5 h-3.5" /> : i + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {/* Crown badge for team leader in duo/squad */}
                                {isSquad && (
                                  <span className="inline-flex items-center gap-0.5 text-[10px] font-black text-[#ffd700] bg-[#ffd700]/10 border border-[#ffd700]/30 px-1.5 py-0.5 rounded-full">
                                    👑 Leader
                                  </span>
                                )}
                                <span className="text-white font-bold text-sm">{p.playerName}</span>
                                {p.userId === user?.userId && (
                                  <span className="text-[10px] font-black uppercase text-[#00ff88] bg-[#00ff88]/10 px-1.5 py-0.5 rounded-full">You</span>
                                )}
                              </div>
                              <div className="text-[#a0a0b0] text-xs font-mono">UID: {p.freefireUid}</div>
                            </div>
                            <CheckCircle className="w-4 h-4 text-[#00ff88] shrink-0" />
                          </div>
                          {/* Teammate Rows — indented squad block */}
                          {members.map((m, mi) => (
                            <div key={mi} className="flex items-center gap-3 px-3 py-2 bg-[#141420] border-t border-[#222230]">
                              <div className="w-7 h-7 flex items-center justify-center shrink-0">
                                <div className="w-1.5 h-1.5 rounded-full bg-[#404058]" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] font-black text-[#606070] uppercase">P{mi + 2}</span>
                                  <span className="text-[#c0c0d0] text-xs font-medium">{m.name}</span>
                                </div>
                                <div className="text-[#505060] text-[10px] font-mono">UID: {m.uid}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ── HYPE BOARD ── */}
            {(t?.status === "upcoming" || t?.status === "live" || t?.status === "ongoing" || hypeMessages.length > 0) && (
              <div className="bg-[#12121a] rounded-xl border border-[#ff6b00]/20 overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#1a1a24]">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🔥</span>
                    <h3 className="text-white font-black uppercase text-sm tracking-wider">Hype Board</h3>
                    <span className="text-[10px] font-bold text-[#ff6b00] bg-[#ff6b00]/10 border border-[#ff6b00]/20 px-2 py-0.5 rounded-full">
                      {hypeMessages.length} হাইপ
                    </span>
                  </div>
                  <button onClick={loadHype} className="text-[#a0a0b0] hover:text-white transition-colors" title="Refresh">
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Input area — any logged-in user can post hype */}
                {user && t?.status !== "ended" && t?.status !== "completed" && t?.status !== "cancelled" && (
                  <div className="px-5 py-3 border-b border-[#1a1a24] bg-[#0e0e18]">
                    <div className="flex gap-2">
                      <div className="flex-1 relative">
                        <input
                          value={hypeText}
                          onChange={e => setHypeText(e.target.value.slice(0, 120))}
                          onKeyDown={e => e.key === "Enter" && postHype()}
                          placeholder="তোমার হাইপ লেখো... 🔥"
                          className="w-full bg-[#1a1a24] border border-[#2a2a36] rounded-lg px-3 py-2 text-sm text-white placeholder:text-[#505060] focus:outline-none focus:border-[#ff6b00]/50 pr-12"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-[#404055]">
                          {hypeText.length}/120
                        </span>
                      </div>
                      <button
                        onClick={postHype}
                        disabled={hypePosting || !hypeText.trim()}
                        className="bg-[#ff6b00] hover:bg-[#e05f00] disabled:opacity-40 text-white font-black text-xs px-3 py-2 rounded-lg transition-colors whitespace-nowrap flex items-center gap-1"
                      >
                        {hypePosting ? <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : "🔥 পোস্ট"}
                      </button>
                    </div>
                  </div>
                )}

                {/* Messages */}
                <div className="max-h-72 overflow-y-auto divide-y divide-[#1a1a24]">
                  {hypeLoading ? (
                    <div className="flex items-center justify-center py-8 gap-2">
                      <div className="w-4 h-4 border-2 border-[#ff6b00] border-t-transparent rounded-full animate-spin" />
                      <span className="text-[#a0a0b0] text-xs">লোড হচ্ছে...</span>
                    </div>
                  ) : hypeMessages.length === 0 ? (
                    <div className="text-center py-8">
                      <div className="text-3xl mb-2">🤫</div>
                      <p className="text-[#505060] text-sm">এখনো কেউ হাইপ করেনি — প্রথম হও!</p>
                    </div>
                  ) : (
                    hypeMessages.map((msg) => {
                      const isMe = user?.userId === msg.userId;
                      const timeAgo = (() => {
                        const diff = Math.floor((Date.now() - new Date(msg.createdAt).getTime()) / 60000);
                        if (diff < 1) return "এইমাত্র";
                        if (diff < 60) return `${diff}m আগে`;
                        const h = Math.floor(diff / 60);
                        return `${h}h আগে`;
                      })();
                      return (
                        <div key={msg.id} className={`flex items-start gap-3 px-4 py-3 ${isMe ? "bg-[#ff6b00]/5" : "hover:bg-[#1a1a24]/50"} transition-colors group`}>
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shrink-0 mt-0.5 ${
                            isMe ? "bg-[#ff6b00]/20 text-[#ff6b00]" : "bg-[#2a2a36] text-[#a0a0b0]"
                          }`}>
                            {msg.playerName.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                              <span className={`text-xs font-black ${isMe ? "text-[#ff6b00]" : "text-[#c0c0d0]"}`}>
                                {msg.playerName} {isMe && <span className="text-[9px] font-bold bg-[#ff6b00]/20 text-[#ff6b00] px-1.5 py-0.5 rounded-full ml-1">You</span>}
                              </span>
                              <span className="text-[10px] text-[#404055]">{timeAgo}</span>
                            </div>
                            <p className="text-sm text-white leading-relaxed break-words">{msg.message}</p>
                          </div>
                          {user?.isAdmin && (
                            <button
                              onClick={() => deleteHype(msg.id)}
                              className="opacity-0 group-hover:opacity-100 text-red-500/60 hover:text-red-400 transition-all shrink-0 mt-1"
                              title="Delete"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ── Sidebar ── */}
          <div className="space-y-4">
            <div className="bg-[#12121a] rounded-xl border border-[#ff6b00]/20 p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[#a0a0b0] text-sm">Prize Pool</span>
                <span className="text-[#ffd700] font-black text-xl">৳{Number(t.prizePool).toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#a0a0b0] text-sm">Entry Fee</span>
                <div className="text-right">
                  <span className={`font-black text-base ${totalEntryFee === 0 ? "text-[#00ff88]" : "text-white"}`}>
                    {totalEntryFee === 0 ? "FREE" : `৳${totalEntryFee.toLocaleString()}`}
                  </span>
                  {playerCount > 1 && entryFee > 0 && (
                    <div className="text-[10px] text-[#a0a0b0] mt-0.5">৳{entryFee} × {playerCount} players</div>
                  )}
                </div>
              </div>
              {Number(t.perKillReward) > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-[#a0a0b0] text-sm flex items-center gap-1"><Zap className="w-3.5 h-3.5" /> Per Kill</span>
                  <span className="text-[#00ff88] font-bold">+৳{Number(t.perKillReward).toLocaleString()}</span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-[#a0a0b0] text-sm">Mode</span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded border uppercase ${modeColors[t.mode]}`}>{t.mode}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#a0a0b0] text-sm">Team Size</span>
                <span className="text-white font-bold">{playerCount} Player{playerCount > 1 ? "s" : ""}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#a0a0b0] text-sm flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> Start</span>
                <span className="text-white text-sm">{new Date(t.startDate).toLocaleDateString()}</span>
              </div>

              {/* Wallet balance */}
              {user && walletBalance !== null && totalEntryFee > 0 && !isJoined && !isRegistrationClosed && (
                <div className={`flex items-center justify-between py-2 px-3 rounded-lg border ${
                  walletBalance >= totalEntryFee
                    ? "bg-[#00ff88]/5 border-[#00ff88]/20"
                    : "bg-[#ff2244]/10 border-[#ff2244]/30"
                }`}>
                  <span className="flex items-center gap-1.5 text-sm text-[#a0a0b0]">
                    <Wallet className="w-3.5 h-3.5" /> Balance
                  </span>
                  <span className={`font-black text-sm ${walletBalance >= totalEntryFee ? "text-[#00ff88]" : "text-[#ff2244]"}`}>
                    ৳{walletBalance.toFixed(2)}
                  </span>
                </div>
              )}

              {/* Game Rules Button — always visible */}
              <button
                onClick={() => setShowRulesModal(true)}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#1a1a24] border border-[#2a2a36] text-[#a0a0b0] font-bold uppercase text-sm rounded-xl hover:text-white hover:border-[#ff6b00]/30 transition-all"
              >
                <BookOpen className="w-4 h-4" /> Game Rules
              </button>

              <div className="border-t border-[#2a2a36] pt-3">
                {!user && !authLoading && (
                  <Link href="/sign-in" className="block w-full text-center px-6 py-3.5 bg-[#ff6b00]/20 border border-[#ff6b00]/40 text-[#ff6b00] font-black uppercase rounded-xl hover:bg-[#ff6b00]/30 transition-all text-sm">
                    Sign In to Join
                  </Link>
                )}

                {(isEnded || t.resultsPublished || matchesWithResults.length > 0) && (
                  <button
                    onClick={() => setShowLeaderboardModal(true)}
                    className="w-full flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-[#ffd700]/15 to-[#ff6b00]/10 hover:from-[#ffd700]/25 hover:to-[#ff6b00]/20 border border-[#ffd700]/30 hover:border-[#ffd700]/60 text-[#ffd700] font-black uppercase rounded-xl transition-all text-sm shadow-[0_2px_14px_rgba(255,215,0,0.08)] hover:shadow-[0_2px_22px_rgba(255,215,0,0.18)]"
                  >
                    <Trophy className="w-4 h-4" />
                    🏆 ফলাফল দেখুন
                  </button>
                )}

                {user && isJoined && !isEnded && !t.resultsPublished && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-center gap-2 py-2.5 bg-[#00ff88]/10 border border-[#00ff88]/30 rounded-xl">
                      <CheckCircle className="w-4 h-4 text-[#00ff88]" />
                      <span className="text-[#00ff88] font-black uppercase text-sm">You're In!</span>
                    </div>
                    <p className="text-center text-[10px] text-[#606070]">
                      Entry is final — no cancellations or refunds
                    </p>
                  </div>
                )}

                {user && !isJoined && (
                  <>
                    {(t.resultsPublished || matchesWithResults.length > 0) ? (
                      <button
                        onClick={() => setShowLeaderboardModal(true)}
                        className="w-full text-center py-3.5 bg-gradient-to-r from-[#ffd700]/12 to-[#ff6b00]/8 hover:from-[#ffd700]/22 hover:to-[#ff6b00]/15 border border-[#ffd700]/25 hover:border-[#ffd700]/50 text-[#ffd700] font-black uppercase rounded-xl text-sm transition-all cursor-pointer flex items-center justify-center gap-2"
                      >
                        <Trophy className="w-4 h-4" />
                        🏆 View Leaderboard
                      </button>
                    ) : (isLive || liveMatches.length > 0) ? (
                      <div className="w-full text-center py-3.5 bg-[#ff2244]/10 border border-[#ff2244]/30 text-[#ff2244] font-black uppercase rounded-xl text-sm flex items-center justify-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-[#ff2244] animate-pulse inline-block" />
                        Match Live — Registration Closed
                      </div>
                    ) : roomOpen ? (
                      <div className="w-full text-center py-3.5 bg-[#ff6b00]/10 border border-[#ff6b00]/30 text-[#ff6b00] font-black uppercase rounded-xl text-sm flex items-center justify-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-[#ff6b00] animate-pulse inline-block" />
                        Room Open — Registration Closed
                      </div>
                    ) : isEnded ? (
                      <div className="w-full text-center py-3.5 bg-[#1a1a24] border border-[#2a2a36] text-[#a0a0b0] font-bold uppercase rounded-xl text-sm">
                        Match Completed
                      </div>
                    ) : t.status === "cancelled" ? (
                      <div className="w-full text-center py-3.5 bg-[#ff2244]/10 border border-[#ff2244]/30 text-[#ff2244] font-bold uppercase rounded-xl text-sm">
                        Tournament Cancelled
                      </div>
                    ) : isFull ? (
                      <div className="w-full text-center py-3.5 bg-[#ff2244]/10 border border-[#ff2244]/30 text-[#ff2244] font-black uppercase rounded-xl text-sm">
                        Tournament Full
                      </div>
                    ) : (
                      <button onClick={handleJoinClick} disabled={joining}
                        className="w-full flex items-center justify-center gap-2 py-3.5 bg-[#ff6b00] text-white font-black uppercase rounded-xl hover:bg-[#e66000] transition-all shadow-[0_0_20px_rgba(255,107,0,0.3)] disabled:opacity-50 text-sm">
                        <UserPlus className="w-4 h-4" />
                        {joining ? "Joining..." : totalEntryFee > 0 ? `Join (৳${totalEntryFee} fee)` : "Join Tournament"}
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Slot stats */}
            {!isEnded && (
              <div className="bg-[#12121a] rounded-xl border border-[#ff6b00]/10 p-4 grid grid-cols-3 gap-3 text-center">
                <div>
                  <div className="text-[#ff6b00] font-black text-lg">{t.maxSlots}</div>
                  <div className="text-[#a0a0b0] text-[10px] uppercase">Total</div>
                </div>
                <div>
                  <div className="text-white font-black text-lg">{t.filledSlots}</div>
                  <div className="text-[#a0a0b0] text-[10px] uppercase">Joined</div>
                </div>
                <div>
                  <div className={`font-black text-lg ${slotsLeft === 0 ? "text-[#ff2244]" : "text-[#00ff88]"}`}>{slotsLeft}</div>
                  <div className="text-[#a0a0b0] text-[10px] uppercase">Left</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Registration Modal (Dynamic Solo/Duo/Squad) ── */}
      {showRegistrationModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
          <div className="w-full max-w-md bg-[#0d0d16] border border-[#ff6b00]/30 rounded-2xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-black uppercase text-white flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-[#ff6b00]" /> Register
              </h3>
              <button onClick={() => setShowRegistrationModal(false)} className="text-[#a0a0b0] hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* ── Game Mode Toggle ── (shown only for duo/squad tournaments) */}
            {(() => {
              const tMode = (t?.mode ?? "squad").toLowerCase();
              const allOptions: { mode: string; label: string; count: number }[] = [
                { mode: "solo",  label: "Solo",  count: 1 },
                { mode: "duo",   label: "Duo",   count: 2 },
                { mode: "squad", label: "Squad", count: 4 },
              ];
              // solo  → no toggle (always 1 player, no choice)
              // duo   → solo + duo only
              // squad → all three
              const available =
                tMode === "solo"  ? [] :
                tMode === "duo"   ? allOptions.slice(0, 2) :
                allOptions;
              if (available.length === 0) return null;
              return (
                <div className="mb-5">
                  <div className="text-[#a0a0b0] text-[10px] uppercase tracking-widest font-bold mb-2">Game Mode</div>
                  <div className="flex gap-2">
                    {available.map(({ mode, label, count }) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => handleModeChange(mode)}
                        className={`flex-1 py-2.5 rounded-xl font-black text-xs uppercase border transition-all ${
                          selectedMode === mode
                            ? "bg-[#ff6b00] border-[#ff6b00] text-white shadow-[0_0_14px_rgba(255,107,0,0.35)]"
                            : "bg-[#1a1a24] border-[#2a2a36] text-[#a0a0b0] hover:border-[#ff6b00]/50 hover:text-white"
                        }`}
                      >
                        {label}
                        <div className="text-[10px] font-normal opacity-70 mt-0.5">{count}P</div>
                      </button>
                    ))}
                  </div>
                  {entryFee > 0 && (
                    <div className="mt-2 text-center text-xs text-[#a0a0b0]">
                      ৳{entryFee} × {getPlayerCount(selectedMode)} players ={" "}
                      <span className="text-[#ff6b00] font-black">৳{modalFee}</span>
                    </div>
                  )}
                </div>
              );
            })()}

            <div className="space-y-4">
              {/* Player 1 (the user) */}
              <div className="bg-[#1a1a24] rounded-xl p-4 border border-[#ff6b00]/10">
                <div className="text-[#ff6b00] text-xs font-black uppercase mb-3 flex items-center gap-1.5">
                  <Star className="w-3 h-3" /> Player 1 (You)
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="text-[#a0a0b0] text-xs uppercase mb-1 block">Free Fire UID *</label>
                    <input
                      type="text"
                      placeholder="Enter your UID"
                      value={regForm.uid}
                      onChange={(e) => setRegForm({ ...regForm, uid: e.target.value })}
                      className="w-full bg-[#0a0a0f] border border-[#2a2a36] rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#ff6b00] font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[#a0a0b0] text-xs uppercase mb-1 block">In-Game Name *</label>
                    <input
                      type="text"
                      placeholder="Your in-game name"
                      value={regForm.name}
                      onChange={(e) => setRegForm({ ...regForm, name: e.target.value })}
                      className="w-full bg-[#0a0a0f] border border-[#2a2a36] rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#ff6b00]"
                    />
                  </div>
                </div>
              </div>

              {/* Additional players for duo/squad */}
              {regForm.members.map((member, idx) => (
                <div key={idx} className="bg-[#1a1a24] rounded-xl p-4 border border-[#2a2a36]">
                  <div className="text-[#a0a0b0] text-xs font-black uppercase mb-3">
                    Player {idx + 2}
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="text-[#a0a0b0] text-xs uppercase mb-1 block">Free Fire UID *</label>
                      <input
                        type="text"
                        placeholder="Enter UID"
                        value={member.uid}
                        onChange={(e) => {
                          const updated = [...regForm.members];
                          updated[idx] = { ...updated[idx], uid: e.target.value };
                          setRegForm({ ...regForm, members: updated });
                        }}
                        className="w-full bg-[#0a0a0f] border border-[#2a2a36] rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#ff6b00] font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[#a0a0b0] text-xs uppercase mb-1 block">In-Game Name *</label>
                      <input
                        type="text"
                        placeholder="In-game name"
                        value={member.name}
                        onChange={(e) => {
                          const updated = [...regForm.members];
                          updated[idx] = { ...updated[idx], name: e.target.value };
                          setRegForm({ ...regForm, members: updated });
                        }}
                        className="w-full bg-[#0a0a0f] border border-[#2a2a36] rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#ff6b00]"
                      />
                    </div>
                  </div>
                </div>
              ))}

              <button
                onClick={handleRegistrationSubmit}
                disabled={joining}
                className="w-full py-3 bg-[#ff6b00] text-white font-black uppercase rounded-xl hover:bg-[#e66000] transition-colors disabled:opacity-50 text-sm"
              >
                {joining ? "Joining..." : modalFee > 0 ? `Continue (৳${modalFee} fee)` : "Join Tournament"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Entry Fee Confirmation Modal ── */}
      {showFeeModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
          <div className="w-full max-w-sm bg-[#0d0d16] border border-[#ff6b00]/30 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-black uppercase text-white flex items-center gap-2">
                <Wallet className="w-5 h-5 text-[#ff6b00]" /> Entry Fee
              </h3>
              <button onClick={() => setShowFeeModal(false)} className="text-[#a0a0b0] hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="bg-[#1a1a24] rounded-xl p-4 mb-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-[#a0a0b0]">Tournament</span>
                <span className="text-white font-bold truncate ml-2 max-w-[55%] text-right">{t.name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[#a0a0b0]">Mode</span>
                <span className="text-white font-bold uppercase">{t.mode}</span>
              </div>
              {getPlayerCount(selectedMode) > 1 ? (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-[#a0a0b0]">Per Player</span>
                    <span className="text-white font-bold">৳{entryFee} × {getPlayerCount(selectedMode)}</span>
                  </div>
                  <div className="flex justify-between text-sm border-t border-[#2a2a36] pt-2">
                    <span className="text-[#a0a0b0] font-bold">Total Fee</span>
                    <span className="text-[#ff6b00] font-black">৳{modalFee}</span>
                  </div>
                </>
              ) : (
                <div className="flex justify-between text-sm">
                  <span className="text-[#a0a0b0]">Entry Fee</span>
                  <span className="text-[#ff6b00] font-black">৳{modalFee}</span>
                </div>
              )}
              <div className="flex justify-between text-sm border-t border-[#2a2a36] pt-2">
                <span className="text-[#a0a0b0]">Your Balance</span>
                <span className={`font-black ${walletBalance !== null && walletBalance >= modalFee ? "text-[#00ff88]" : "text-[#ff2244]"}`}>
                  ৳{walletBalance?.toFixed(2) ?? "..."}
                </span>
              </div>
            </div>
            {walletBalance !== null && walletBalance < modalFee ? (
              <div className="space-y-3">
                <p className="text-[#ff2244] text-sm text-center font-bold">Insufficient balance to join.</p>
                <Link href="/wallet" onClick={() => setShowFeeModal(false)}
                  className="block w-full text-center px-6 py-3 bg-[#ff6b00] text-white font-black uppercase rounded-xl hover:bg-[#e66000] transition-colors text-sm">
                  Add Funds to Wallet
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-[#a0a0b0] text-sm text-center">
                  ৳{modalFee} will be deducted from your wallet instantly.
                </p>
                <button onClick={() => doJoin()} disabled={joining}
                  className="w-full py-3 bg-[#ff6b00] text-white font-black uppercase rounded-xl hover:bg-[#e66000] transition-colors disabled:opacity-50 text-sm">
                  {joining ? "Joining..." : `Confirm & Pay ৳${modalFee}`}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Leaderboard Modal ── */}
      {showLeaderboardModal && t && (
        <LeaderboardModal tournament={{ id: t.id, name: t.name }} onClose={() => setShowLeaderboardModal(false)} />
      )}

      {/* ── Game Rules Modal ── */}
      {showRulesModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
          <div className="w-full max-w-lg bg-[#0d0d16] border border-[#ff6b00]/30 rounded-2xl p-6 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between mb-5 shrink-0">
              <h3 className="font-black uppercase text-white flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-[#ff6b00]" /> Game Rules
              </h3>
              <button onClick={() => setShowRulesModal(false)} className="text-[#a0a0b0] hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 pr-1">
              {!categoryRules || !categoryRules.rules ? (
                <p className="text-[#a0a0b0] text-center py-8">No rules posted yet for this category.</p>
              ) : (
                <div className="text-[#a0a0b0] text-sm leading-relaxed whitespace-pre-line">{categoryRules.rules}</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
