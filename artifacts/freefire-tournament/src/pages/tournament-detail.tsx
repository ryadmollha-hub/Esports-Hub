import { useState, useEffect, useCallback } from "react";
import { useRoute, Link, useLocation } from "wouter";
import {
  Trophy, Users, Clock, Calendar, Shield, ChevronLeft, Flame,
  UserPlus, UserMinus, Crown, Swords, CheckCircle, RefreshCw,
  AlertCircle, Star, X
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CountdownTimer from "@/components/CountdownTimer";
import { useGetTournament, getGetTournamentQueryKey } from "@workspace/api-client-react";
import { useAuthContext } from "@/lib/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

const modeColors: Record<string, string> = {
  solo: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  duo: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  squad: "bg-[#ff6b00]/20 text-[#ff6b00] border-[#ff6b00]/30",
};

const statusConfig: Record<string, { color: string; label: string; dot: string }> = {
  upcoming: { color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30", label: "Upcoming", dot: "bg-yellow-400" },
  live:     { color: "bg-green-500/20 text-green-400 border-green-500/30",   label: "🔴 LIVE",   dot: "bg-green-400 animate-pulse" },
  ongoing:  { color: "bg-green-500/20 text-green-400 border-green-500/30",   label: "🔴 LIVE",   dot: "bg-green-400 animate-pulse" },
  ended:    { color: "bg-gray-500/20 text-gray-400 border-gray-500/30",      label: "Ended",    dot: "bg-gray-400" },
  completed:{ color: "bg-gray-500/20 text-gray-400 border-gray-500/30",      label: "Ended",    dot: "bg-gray-400" },
  cancelled:{ color: "bg-red-500/20 text-red-400 border-red-500/30",         label: "Cancelled",dot: "bg-red-400" },
};

const rankColors = ["text-[#ffd700]", "text-gray-300", "text-amber-600"];

interface Participant {
  id: number;
  userId: string;
  freefireUid: string;
  playerName: string;
  createdAt: string;
}

export default function TournamentDetailPage() {
  const [, params] = useRoute("/tournaments/:id");
  const [, setLocation] = useLocation();
  const id = parseInt(params?.id ?? "0");
  const { user, authFetch, isLoading: authLoading } = useAuthContext();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loadingPart, setLoadingPart] = useState(true);
  const [joining, setJoining] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [showUidModal, setShowUidModal] = useState(false);
  const [tempUid, setTempUid] = useState("");

  const { data: tournament, isLoading } = useGetTournament(id, {
    query: { enabled: !!id, queryKey: getGetTournamentQueryKey(id) },
  });

  const t = tournament as any;

  const loadParticipants = useCallback(async () => {
    if (!id) return;
    setLoadingPart(true);
    try {
      const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
      const res = await fetch(`${BASE}/api/tournaments/${id}/participants`);
      if (res.ok) setParticipants(await res.json());
    } catch {} finally { setLoadingPart(false); }
  }, [id]);

  useEffect(() => { loadParticipants(); }, [loadParticipants]);

  const isJoined = !!user && participants.some((p) => p.userId === user.userId);
  const isFull = t ? t.filledSlots >= t.maxSlots : false;
  const canJoin = !!user && !isJoined && !isFull &&
    t?.status !== "ended" && t?.status !== "completed" && t?.status !== "cancelled";
  const canLeave = !!user && isJoined &&
    t?.status !== "live" && t?.status !== "ongoing" && t?.status !== "ended" && t?.status !== "completed";

  const doJoin = async (uid?: string) => {
    if (!user) { setLocation("/sign-in"); return; }
    setJoining(true);
    try {
      const res = await authFetch(`/tournaments/${id}/join`, {
        method: "POST",
        body: JSON.stringify(uid ? { freefireUid: uid } : {}),
      });
      const data = await res.json();
      if (res.ok) {
        toast({ title: "🎮 Joined!", description: "You have successfully joined the tournament." });
        queryClient.invalidateQueries({ queryKey: getGetTournamentQueryKey(id) });
        loadParticipants();
        setShowUidModal(false);
        setTempUid("");
      } else if (data.requiresProfile) {
        setShowUidModal(true);
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Connection error. Please try again.", variant: "destructive" });
    } finally { setJoining(false); }
  };

  const doLeave = async () => {
    if (!window.confirm("Are you sure you want to leave this tournament?")) return;
    setLeaving(true);
    try {
      const res = await authFetch(`/tournaments/${id}/join`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok) {
        toast({ title: "Left tournament", description: "You have left the tournament." });
        queryClient.invalidateQueries({ queryKey: getGetTournamentQueryKey(id) });
        loadParticipants();
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Connection error. Please try again.", variant: "destructive" });
    } finally { setLeaving(false); }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f]">
        <Navbar />
        <div className="max-w-5xl mx-auto px-4 pt-24">
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

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 pt-24 pb-28">
        <Link href="/tournaments" className="inline-flex items-center gap-2 text-[#a0a0b0] hover:text-white mb-6 transition-colors">
          <ChevronLeft className="w-4 h-4" /> Back to Tournaments
        </Link>

        {/* Winner Banner */}
        {hasWinner && (
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
              <div className="ml-auto hidden sm:flex">
                <Star className="w-8 h-8 text-[#ffd700]/40" />
              </div>
            </div>
          </div>
        )}

        {/* Banner */}
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
            </div>
            <h1 className="text-2xl md:text-4xl font-black">{t.name}</h1>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6">

          {/* ── Left Column ── */}
          <div className="md:col-span-2 space-y-5">

            {t.description && (
              <div className="bg-[#12121a] rounded-xl border border-[#ff6b00]/20 p-5">
                <h3 className="text-white font-bold uppercase text-sm mb-2 tracking-wider">About</h3>
                <p className="text-[#a0a0b0] leading-relaxed text-sm">{t.description}</p>
              </div>
            )}

            {/* Countdown */}
            {(t.status === "upcoming") && t.countdownTo && (
              <div className="bg-[#12121a] rounded-xl border border-[#ff6b00]/20 p-5">
                <h3 className="text-white font-bold uppercase text-sm mb-3 tracking-wider">Starts In</h3>
                <CountdownTimer targetDate={t.countdownTo} className="text-3xl gap-4" />
              </div>
            )}

            {/* Prizes */}
            {t.prizes && t.prizes.length > 0 && (
              <div className="bg-[#12121a] rounded-xl border border-[#ff6b00]/20 p-5">
                <h3 className="text-white font-bold uppercase text-sm mb-3 tracking-wider">Prize Distribution</h3>
                <div className="space-y-2">
                  {t.prizes.map((prize: any, i: number) => (
                    <div key={prize.id} className="flex items-center justify-between py-2 border-b border-[#ff6b00]/10 last:border-0">
                      <div className="flex items-center gap-3">
                        <Trophy className={`w-5 h-5 ${rankColors[i] ?? "text-[#a0a0b0]"}`} />
                        <div>
                          <div className="font-bold text-white text-sm">{prize.rank}</div>
                          {prize.percentage && <div className="text-[#a0a0b0] text-xs">{prize.percentage}% of pool</div>}
                        </div>
                      </div>
                      <div className={`font-black text-lg ${rankColors[i] ?? "text-white"}`}>
                        ৳{Number(prize.amount).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Room Info */}
            {(t.status === "live" || t.status === "ongoing") && t.roomId && isJoined && (
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

            {/* Room locked for non-joined */}
            {(t.status === "live" || t.status === "ongoing") && t.roomId && !isJoined && user && (
              <div className="bg-[#1a1a24] rounded-xl border border-[#2a2a36] p-5 text-center">
                <Shield className="w-8 h-8 text-[#a0a0b0]/40 mx-auto mb-2" />
                <p className="text-[#a0a0b0] text-sm">Room details are only visible to joined players.</p>
              </div>
            )}

            {/* Participants List */}
            <div className="bg-[#12121a] rounded-xl border border-[#ff6b00]/20 p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-[#ff6b00]" />
                  <h3 className="text-white font-bold uppercase text-sm tracking-wider">
                    Players ({participants.length}/{t.maxSlots})
                  </h3>
                </div>
                <button
                  onClick={loadParticipants}
                  className="text-[#a0a0b0] hover:text-white transition-colors"
                  title="Refresh"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>

              {/* Slot bar */}
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
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-12 bg-[#1a1a24] rounded-xl animate-pulse" />
                  ))}
                </div>
              ) : participants.length === 0 ? (
                <div className="text-center py-8">
                  <Swords className="w-10 h-10 mx-auto mb-2 text-[#ff6b00]/20" />
                  <p className="text-[#a0a0b0] text-sm">No players yet. Be the first to join!</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {participants.map((p, i) => (
                    <div
                      key={p.id}
                      className={`flex items-center gap-3 p-3 rounded-xl ${
                        p.userId === t.winnerId
                          ? "bg-[#ffd700]/10 border border-[#ffd700]/30"
                          : "bg-[#1a1a24] border border-transparent"
                      }`}
                    >
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${
                        p.userId === t.winnerId ? "bg-[#ffd700]/20 text-[#ffd700]" : "bg-[#ff6b00]/15 text-[#ff6b00]"
                      }`}>
                        {p.userId === t.winnerId ? <Crown className="w-3.5 h-3.5" /> : i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-white font-bold text-sm truncate">{p.playerName}</span>
                          {p.userId === t.winnerId && (
                            <span className="text-[10px] font-black uppercase text-[#ffd700] bg-[#ffd700]/10 px-1.5 py-0.5 rounded-full border border-[#ffd700]/30">
                              Winner
                            </span>
                          )}
                          {p.userId === user?.userId && (
                            <span className="text-[10px] font-black uppercase text-[#00ff88] bg-[#00ff88]/10 px-1.5 py-0.5 rounded-full">You</span>
                          )}
                        </div>
                        <div className="text-[#a0a0b0] text-xs font-mono">UID: {p.freefireUid}</div>
                      </div>
                      <CheckCircle className="w-4 h-4 text-[#00ff88] shrink-0" />
                    </div>
                  ))}
                </div>
              )}
            </div>
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
                <span className="text-white font-bold">
                  {Number(t.entryFee) === 0 ? <span className="text-[#00ff88]">FREE</span> : `৳${Number(t.entryFee).toLocaleString()}`}
                </span>
              </div>
              {Number(t.perKillReward) > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-[#a0a0b0] text-sm">Per Kill Reward</span>
                  <span className="text-[#00ff88] font-bold">+৳{Number(t.perKillReward).toLocaleString()}</span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-[#a0a0b0] text-sm">Mode</span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded border uppercase ${modeColors[t.mode]}`}>{t.mode}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#a0a0b0] text-sm flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> Start</span>
                <span className="text-white text-sm">{new Date(t.startDate).toLocaleDateString()}</span>
              </div>

              <div className="border-t border-[#2a2a36] pt-3">
                {/* Join/Leave/Status Button */}
                {!user && !authLoading && (
                  <Link
                    href="/sign-in"
                    className="block w-full text-center px-6 py-3.5 bg-[#ff6b00]/20 border border-[#ff6b00]/40 text-[#ff6b00] font-black uppercase rounded-xl hover:bg-[#ff6b00]/30 transition-all text-sm"
                  >
                    Sign In to Join
                  </Link>
                )}

                {user && isJoined && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-center gap-2 py-2.5 bg-[#00ff88]/10 border border-[#00ff88]/30 rounded-xl">
                      <CheckCircle className="w-4 h-4 text-[#00ff88]" />
                      <span className="text-[#00ff88] font-black uppercase text-sm">You're In!</span>
                    </div>
                    {canLeave && (
                      <button
                        onClick={doLeave}
                        disabled={leaving}
                        className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#ff2244]/10 border border-[#ff2244]/30 text-[#ff2244] font-bold uppercase text-sm rounded-xl hover:bg-[#ff2244]/20 transition-all disabled:opacity-50"
                      >
                        <UserMinus className="w-4 h-4" />
                        {leaving ? "Leaving..." : "Leave Tournament"}
                      </button>
                    )}
                  </div>
                )}

                {user && !isJoined && (
                  <>
                    {isFull ? (
                      <div className="w-full text-center py-3.5 bg-[#ff2244]/10 border border-[#ff2244]/30 text-[#ff2244] font-black uppercase rounded-xl text-sm">
                        Tournament Full
                      </div>
                    ) : t.status === "ended" || t.status === "completed" || t.status === "cancelled" ? (
                      <div className="w-full text-center py-3.5 bg-[#1a1a24] border border-[#2a2a36] text-[#a0a0b0] font-bold uppercase rounded-xl text-sm">
                        Registration Closed
                      </div>
                    ) : (
                      <button
                        onClick={() => doJoin()}
                        disabled={joining}
                        className="w-full flex items-center justify-center gap-2 py-3.5 bg-[#ff6b00] text-white font-black uppercase rounded-xl hover:bg-[#e66000] transition-all shadow-[0_0_20px_rgba(255,107,0,0.3)] disabled:opacity-50 text-sm"
                      >
                        <UserPlus className="w-4 h-4" />
                        {joining ? "Joining..." : "Join Tournament"}
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Quick stats card */}
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
          </div>
        </div>
      </div>

      {/* UID Modal */}
      {showUidModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
          <div className="w-full max-w-sm bg-[#0d0d16] border border-[#ff6b00]/30 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-black uppercase text-white">Enter Free Fire UID</h3>
              <button onClick={() => setShowUidModal(false)} className="text-[#a0a0b0] hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-[#a0a0b0] text-sm mb-4">
              You haven't set a Free Fire UID in your profile. Enter it here to join, or{" "}
              <Link href="/profile" className="text-[#ff6b00] hover:underline">update your profile</Link>.
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={tempUid}
                onChange={(e) => setTempUid(e.target.value)}
                placeholder="123456789"
                className="flex-1 bg-[#1a1a24] border border-[#2a2a36] rounded-xl px-4 py-2.5 text-white placeholder-[#606070] focus:outline-none focus:border-[#ff6b00] font-mono"
              />
              <button
                onClick={() => tempUid.trim() && doJoin(tempUid.trim())}
                disabled={!tempUid.trim() || joining}
                className="px-4 py-2.5 bg-[#ff6b00] text-white font-bold rounded-xl hover:bg-[#e66000] transition-colors disabled:opacity-50"
              >
                {joining ? "..." : "Join"}
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
