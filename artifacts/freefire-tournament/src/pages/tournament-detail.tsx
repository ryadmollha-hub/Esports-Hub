import { useState, useEffect, useCallback } from "react";
import { useRoute, Link, useLocation, useSearch } from "wouter";
import {
  Trophy, Users, Calendar, Shield, ChevronLeft, Flame,
  UserPlus, UserMinus, Crown, Swords, CheckCircle, RefreshCw,
  Star, X, Wallet, Zap, Medal, Target, BookOpen, Lock,
  Radio, Clock, Key, Eye, EyeOff
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CountdownTimer from "@/components/CountdownTimer";
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

const statusConfig: Record<string, { color: string; label: string; dot: string }> = {
  upcoming:  { color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30", label: "Upcoming",   dot: "bg-yellow-400" },
  live:      { color: "bg-green-500/20 text-green-400 border-green-500/30",    label: "🔴 LIVE",    dot: "bg-green-400 animate-pulse" },
  ongoing:   { color: "bg-green-500/20 text-green-400 border-green-500/30",    label: "🔴 LIVE",    dot: "bg-green-400 animate-pulse" },
  ended:     { color: "bg-gray-500/20 text-gray-400 border-gray-500/30",       label: "Ended",     dot: "bg-gray-400" },
  completed: { color: "bg-gray-500/20 text-gray-400 border-gray-500/30",       label: "Completed", dot: "bg-gray-400" },
  cancelled: { color: "bg-red-500/20 text-red-400 border-red-500/30",          label: "Cancelled", dot: "bg-red-400" },
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

interface Rule {
  id: number;
  title: string;
  content: string;
  orderIndex: number;
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
  const [rules, setRules] = useState<Rule[]>([]);
  const [matches, setMatches] = useState<MatchInfo[]>([]);
  const [loadingPart, setLoadingPart] = useState(true);
  const [joining, setJoining] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [showRegistrationModal, setShowRegistrationModal] = useState(false);
  const [showFeeModal, setShowFeeModal] = useState(false);
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [showRoomPass, setShowRoomPass] = useState(false);

  // Registration form state
  const [regForm, setRegForm] = useState({
    uid: "",
    name: "",
    members: [] as TeamMember[],
  });

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
    try {
      const res = await fetch(`${apiBase}/api/tournaments/${id}/results`);
      if (res.ok) {
        const data = await res.json();
        setResults(data.results ?? []);
      }
    } catch {}
  }, [id]);

  const loadRules = useCallback(async () => {
    if (!id) return;
    try {
      const res = await fetch(`${apiBase}/api/tournaments/${id}/rules`);
      if (res.ok) setRules(await res.json());
    } catch {}
  }, [id]);

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

  useEffect(() => {
    loadParticipants();
    loadRules();
    loadMatches();
    if (t?.resultsPublished) loadResults();
  }, [loadParticipants, loadRules, loadMatches, t?.resultsPublished]);

  useEffect(() => {
    const id = setInterval(() => loadMatches(), 60000);
    return () => clearInterval(id);
  }, [loadMatches]);

  useEffect(() => {
    if (user) loadBalance();
  }, [user, loadBalance]);

  // Initialize team members when tournament mode becomes known
  useEffect(() => {
    if (t?.mode) {
      const count = modePlayerCount[t.mode] ?? 1;
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
  const isEnded = t?.status === "ended" || t?.status === "completed";
  const isLive = t?.status === "live" || t?.status === "ongoing";
  const isRegistrationClosed = isLive || isEnded || t?.status === "cancelled";

  // Live matches
  const liveMatches = matches.filter(m => m.status === "live");
  const upcomingMatches = matches.filter(m => m.status === "scheduled");
  const completedMatches = matches.filter(m => m.status === "completed");

  const doJoin = async () => {
    if (!user) { setLocation("/sign-in"); return; }
    setJoining(true);
    setShowFeeModal(false);
    setShowRegistrationModal(false);
    try {
      const mode = t?.mode ?? "solo";
      const playerCount = modePlayerCount[mode] ?? 1;
      const teamMembers = playerCount > 1 ? regForm.members : undefined;

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
  const statusCfg = statusConfig[t.status] ?? statusConfig.upcoming;
  const hasWinner = !!t.winnerId && !!t.winnerName;
  const playerCount = modePlayerCount[t.mode] ?? 1;

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

            {/* Countdown */}
            {t.status === "upcoming" && t.countdownTo && (
              <div className="bg-[#12121a] rounded-xl border border-[#ff6b00]/20 p-5">
                <h3 className="text-white font-bold uppercase text-sm mb-3 tracking-wider">Starts In</h3>
                <CountdownTimer targetDate={t.countdownTo} className="text-3xl gap-4" />
              </div>
            )}

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
                        {new Date(match.scheduledAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </div>
                    {match.roomVisible && isJoined ? (
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
                    ) : match.roomVisible && !isJoined ? (
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
              <div className="bg-[#12121a] rounded-xl border border-[#ff6b00]/20 p-5">
                <h3 className="text-white font-bold uppercase text-sm mb-3 tracking-wider flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[#ff6b00]" /> Scheduled Matches
                </h3>
                <div className="space-y-2">
                  {upcomingMatches.map(match => {
                    const scheduledMs = new Date(match.scheduledAt).getTime();
                    const releaseMs = scheduledMs - 10 * 60 * 1000;
                    const hideMs = scheduledMs + 60 * 60 * 1000;
                    const nowMs = Date.now();
                    const minsToRelease = Math.ceil((releaseMs - nowMs) / 60000);
                    const roomClosed = nowMs >= hideMs;
                    const roomSoon = !roomClosed && minsToRelease <= 30 && minsToRelease > 0;
                    return (
                      <div key={match.id} className="flex items-center justify-between py-2.5 border-b border-[#1a1a24] last:border-0">
                        <div className="flex items-center gap-3">
                          <span className="text-[#a0a0b0] text-xs uppercase bg-[#1a1a24] px-2 py-0.5 rounded font-bold">#{match.matchNumber}</span>
                          <div>
                            <div className="text-white text-sm font-bold">Match #{match.matchNumber}</div>
                            {match.mapName && <div className="text-[#a0a0b0] text-xs">{match.mapName}</div>}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-white text-sm font-bold">{new Date(match.scheduledAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
                          <div className="text-[#a0a0b0] text-xs">{new Date(match.scheduledAt).toLocaleDateString()}</div>
                          {roomClosed ? (
                            <div className="text-[#a0a0b0] text-[10px] font-bold mt-0.5">🔴 Room closed</div>
                          ) : roomSoon ? (
                            <div className="text-yellow-400 text-[10px] font-bold mt-0.5 animate-pulse">⏳ Room in {minsToRelease}m</div>
                          ) : null}
                        </div>
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
            {t.resultsPublished && results !== null && (
              <div className="space-y-4">
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
                              <div className={`text-4xl shrink-0 leading-none`}>{cfg.emoji}</div>
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
                      return (
                        <div key={p.id} className={`flex items-start gap-3 p-3 rounded-xl ${
                          p.userId === t.winnerId ? "bg-[#ffd700]/10 border border-[#ffd700]/30" : "bg-[#1a1a24]"
                        }`}>
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shrink-0 mt-0.5 ${
                            p.userId === t.winnerId ? "bg-[#ffd700]/20 text-[#ffd700]" : "bg-[#ff6b00]/15 text-[#ff6b00]"
                          }`}>
                            {p.userId === t.winnerId ? <Crown className="w-3.5 h-3.5" /> : i + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-white font-bold text-sm">{p.playerName}</span>
                              {p.userId === user?.userId && (
                                <span className="text-[10px] font-black uppercase text-[#00ff88] bg-[#00ff88]/10 px-1.5 py-0.5 rounded-full">You</span>
                              )}
                            </div>
                            <div className="text-[#a0a0b0] text-xs font-mono">UID: {p.freefireUid}</div>
                            {members.length > 0 && (
                              <div className="mt-1 space-y-0.5">
                                {members.map((m, mi) => (
                                  <div key={mi} className="text-[#a0a0b0] text-xs">
                                    P{mi + 2}: {m.name} <span className="font-mono">(UID: {m.uid})</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                          <CheckCircle className="w-4 h-4 text-[#00ff88] shrink-0 mt-0.5" />
                        </div>
                      );
                    })}
                  </div>
                )}
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
                <span className={`font-black text-base ${entryFee === 0 ? "text-[#00ff88]" : "text-white"}`}>
                  {entryFee === 0 ? "FREE" : `৳${entryFee.toLocaleString()}`}
                </span>
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
              {user && walletBalance !== null && entryFee > 0 && !isJoined && !isRegistrationClosed && (
                <div className={`flex items-center justify-between py-2 px-3 rounded-lg border ${
                  walletBalance >= entryFee
                    ? "bg-[#00ff88]/5 border-[#00ff88]/20"
                    : "bg-[#ff2244]/10 border-[#ff2244]/30"
                }`}>
                  <span className="flex items-center gap-1.5 text-sm text-[#a0a0b0]">
                    <Wallet className="w-3.5 h-3.5" /> Balance
                  </span>
                  <span className={`font-black text-sm ${walletBalance >= entryFee ? "text-[#00ff88]" : "text-[#ff2244]"}`}>
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

                {user && isJoined && (
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
                    {t.resultsPublished ? (
                      <div className="w-full text-center py-3.5 bg-purple-500/10 border border-purple-500/30 text-purple-400 font-black uppercase rounded-xl text-sm">
                        Results Published
                      </div>
                    ) : (isLive || liveMatches.length > 0) ? (
                      <div className="w-full text-center py-3.5 bg-[#ff2244]/10 border border-[#ff2244]/30 text-[#ff2244] font-black uppercase rounded-xl text-sm flex items-center justify-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-[#ff2244] animate-pulse inline-block" />
                        Match Live — Registration Closed
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
                        {joining ? "Joining..." : entryFee > 0 ? `Join (৳${entryFee} fee)` : "Join Tournament"}
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
                <UserPlus className="w-5 h-5 text-[#ff6b00]" />
                Register — {t.mode?.charAt(0).toUpperCase() + t.mode?.slice(1)}
              </h3>
              <button onClick={() => setShowRegistrationModal(false)} className="text-[#a0a0b0] hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

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
                {joining ? "Joining..." : entryFee > 0 ? `Continue (৳${entryFee} fee)` : "Join Tournament"}
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
              <div className="flex justify-between text-sm">
                <span className="text-[#a0a0b0]">Entry Fee</span>
                <span className="text-[#ff6b00] font-black">৳{entryFee}</span>
              </div>
              <div className="flex justify-between text-sm border-t border-[#2a2a36] pt-2">
                <span className="text-[#a0a0b0]">Your Balance</span>
                <span className={`font-black ${walletBalance !== null && walletBalance >= entryFee ? "text-[#00ff88]" : "text-[#ff2244]"}`}>
                  ৳{walletBalance?.toFixed(2) ?? "..."}
                </span>
              </div>
            </div>
            {walletBalance !== null && walletBalance < entryFee ? (
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
                  ৳{entryFee} will be deducted from your wallet instantly.
                </p>
                <button onClick={() => doJoin()} disabled={joining}
                  className="w-full py-3 bg-[#ff6b00] text-white font-black uppercase rounded-xl hover:bg-[#e66000] transition-colors disabled:opacity-50 text-sm">
                  {joining ? "Joining..." : `Confirm & Pay ৳${entryFee}`}
                </button>
              </div>
            )}
          </div>
        </div>
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
            <div className="overflow-y-auto flex-1 space-y-4 pr-1">
              {rules.length === 0 ? (
                <p className="text-[#a0a0b0] text-center py-8">No rules posted yet.</p>
              ) : rules.map((rule, i) => (
                <div key={rule.id} className="border-b border-[#1a1a24] pb-4 last:border-0">
                  <div className="flex items-start gap-3">
                    <span className="shrink-0 w-6 h-6 rounded-full bg-[#ff6b00]/20 border border-[#ff6b00]/30 text-[#ff6b00] text-xs font-black flex items-center justify-center mt-0.5">
                      {i + 1}
                    </span>
                    <div>
                      <div className="text-white font-bold text-sm mb-1">{rule.title}</div>
                      <div className="text-[#a0a0b0] text-sm leading-relaxed whitespace-pre-line">{rule.content}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
