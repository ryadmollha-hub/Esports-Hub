import { useState, useEffect, useCallback } from "react";
import { Link } from "wouter";
import { Users, Trophy, Clock, ChevronRight, Zap } from "lucide-react";
import CountdownTimer from "./CountdownTimer";
import LeaderboardModal from "./LeaderboardModal";
import { apiBase as BASE } from "@/lib/apiBase";
import { parseBDDate, formatBDDate } from "@/lib/bdTime";

interface Tournament {
  id: number;
  name: string;
  description?: string | null;
  mode: string;
  status: string;
  startDate: string;
  maxSlots: number;
  filledSlots: number;
  prizePool: string | number;
  entryFee: string | number;
  perKillReward?: string | number | null;
  bannerUrl?: string | null;
  countdownTo?: string | null;
  resultsPublished?: boolean | null;
}

const modeColors: Record<string, string> = {
  solo:  "bg-blue-500/20 text-blue-400 border-blue-500/30",
  duo:   "bg-purple-500/20 text-purple-400 border-purple-500/30",
  squad: "bg-[#ff6b00]/20 text-[#ff6b00] border-[#ff6b00]/30",
};

type StatusKey = "upcoming" | "starting_soon" | "live" | "ongoing" | "ended" | "completed" | "cancelled" | "room_open";

const statusConfig: Record<StatusKey, { color: string; dot?: string; label: string }> = {
  upcoming:      { color: "bg-yellow-500/20 text-yellow-400 border border-yellow-500/40",                                      label: "Soon" },
  starting_soon: { color: "bg-yellow-500/20 text-yellow-400 border border-yellow-500/40",  dot: "bg-yellow-400 animate-pulse", label: "STARTING SOON" },
  room_open:     { color: "bg-orange-600/20 text-orange-400 border border-orange-500",     dot: "bg-orange-400 animate-pulse", label: "ROOM OPEN" },
  live:          { color: "bg-emerald-500/20 text-emerald-400 border border-emerald-500/50", dot: "bg-emerald-400 animate-pulse", label: "LIVE" },
  ongoing:       { color: "bg-emerald-500/20 text-emerald-400 border border-emerald-500/50", dot: "bg-emerald-400 animate-pulse", label: "LIVE" },
  ended:         { color: "bg-red-500/20 text-red-400 border border-red-500/40",           label: "Ended" },
  completed:     { color: "bg-red-500/20 text-red-400 border border-red-500/40",           label: "Completed" },
  cancelled:     { color: "bg-red-700/20 text-red-500 border border-red-700/40",           label: "Cancelled" },
};

function useClientStatus(serverStatus: string, startDate: string): StatusKey {
  const computeStatus = (): StatusKey => {
    if (serverStatus !== "upcoming") return serverStatus as StatusKey;
    const now = Date.now();
    // parseBDDate: if startDate has no timezone suffix, treat as UTC+6 (Bangladesh).
    // This prevents 6-hour drift when the app runs on non-BD servers (e.g. Replit UTC).
    const start = parseBDDate(startDate).getTime();
    if (now >= start + 60 * 60 * 1000) return "completed";
    if (now >= start) return "live";
    if (now >= start - 10 * 60 * 1000) return "starting_soon";
    return "upcoming";
  };
  const [status, setStatus] = useState<StatusKey>(computeStatus);
  useEffect(() => {
    setStatus(computeStatus());
    const id = setInterval(() => setStatus(computeStatus()), 15000);
    return () => clearInterval(id);
  }, [serverStatus, startDate]);
  return status;
}

/** Poll match room status and active match numbers when tournament is potentially active */
function useRoomOpen(tournamentId: number, clientStatus: StatusKey): { roomOpen: boolean; activeMatchNumbers: number[] } {
  const [roomOpen, setRoomOpen] = useState(false);
  const [activeMatchNumbers, setActiveMatchNumbers] = useState<number[]>([]);
  const shouldPoll = clientStatus === "upcoming" || clientStatus === "starting_soon" || clientStatus === "live" || clientStatus === "ongoing" || clientStatus === "room_open";

  const check = useCallback(async () => {
    if (!shouldPoll) { setRoomOpen(false); setActiveMatchNumbers([]); return; }
    try {
      const res = await fetch(`${BASE}/api/tournaments/${tournamentId}/matches`);
      if (!res.ok) return;
      const data: Array<{ id: number; matchNumber: number; status: string; roomVisible?: boolean; scheduledAt?: string }> = await res.json();
      const now = Date.now();
      // Phase 2 (Room Released): API returns status "room_released" when room
      // credentials are visible but the match hasn't started yet.
      const open = data.some(m => m.status === "room_released");
      setRoomOpen(open);
      const nums = data.map(m => m.matchNumber).filter(Boolean);
      setActiveMatchNumbers(nums);
    } catch {}
  }, [tournamentId, shouldPoll]);

  useEffect(() => {
    check();
    if (!shouldPoll) return;
    const id = setInterval(check, 60000);
    return () => clearInterval(id);
  }, [check, shouldPoll]);

  return { roomOpen, activeMatchNumbers };
}

export default function TournamentCard({ t, featured = false }: { t: Tournament; featured?: boolean }) {
  const slotPct   = Math.min((t.filledSlots / t.maxSlots) * 100, 100);
  const slotsLeft = t.maxSlots - t.filledSlots;
  const isFull    = slotsLeft === 0;
  const entryFee  = Number(t.entryFee);
  const perKill   = Number(t.perKillReward ?? 0);

  const clientStatus = useClientStatus(t.status, t.startDate);
  const { roomOpen, activeMatchNumbers } = useRoomOpen(t.id, clientStatus);

  // Derive effective status.
  // Priority (highest → lowest):
  //   1. resultsPublished OR server/client completed/ended  → completed / ended
  //   2. roomOpen (credentials visible, match not yet started) → room_open
  //   3. client-computed status
  const isTerminal =
    t.resultsPublished === true ||
    t.status === "completed" ||
    t.status === "ended" ||
    clientStatus === "completed" ||
    clientStatus === "ended";

  const effectiveStatus: StatusKey = isTerminal
    ? (t.status === "cancelled" ? "cancelled" : (t.status === "completed" || clientStatus === "completed") ? "completed" : "ended")
    : roomOpen && (clientStatus === "upcoming" || clientStatus === "starting_soon" || clientStatus === "live")
    ? "room_open"
    : clientStatus;

  const isLive = effectiveStatus === "live" || effectiveStatus === "ongoing" || effectiveStatus === "starting_soon" || effectiveStatus === "room_open";
  const sc     = statusConfig[effectiveStatus] ?? statusConfig.upcoming;

  const showResults  = isTerminal;
  // Show countdown for upcoming/starting_soon/room_open — timer must stay visible even when room credentials are out
  const showCountdown = effectiveStatus === "upcoming" || effectiveStatus === "starting_soon" || effectiveStatus === "room_open";
  const targetDate: string = (t.countdownTo ?? t.startDate)!;

  const [leaderboardOpen, setLeaderboardOpen] = useState(false);
  const openLeaderboard = (e: React.MouseEvent) => { e.preventDefault(); e.stopPropagation(); setLeaderboardOpen(true); };

  if (featured) {
    return (
      <>
        <div
          data-testid={`card-tournament-${t.id}`}
          className="group relative rounded-2xl border border-[#ff6b00]/20 bg-[#0e0e17] hover:border-[#ff6b00]/50 hover:shadow-[0_4px_24px_rgba(255,107,0,0.12)] transition-all duration-200 overflow-hidden flex flex-col"
        >
          <Link href={`/tournaments/${t.id}`} className="flex flex-col flex-1">
            {/* Banner */}
            <div className="relative h-36 w-full bg-gradient-to-br from-[#1a1a24] to-[#0a0a0f] overflow-hidden shrink-0">
              {t.bannerUrl ? (
                <img src={t.bannerUrl} alt={t.name}
                  className="w-full h-full object-cover opacity-50 group-hover:opacity-65 group-hover:scale-105 transition-all duration-500"
                  data-testid={`img-tournament-banner-${t.id}`} />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Trophy className="w-14 h-14 text-[#ff6b00]/10 group-hover:text-[#ff6b00]/20 transition-colors" />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-[#0e0e17] via-[#0e0e17]/20 to-transparent" />
              {isLive && <div className="absolute inset-0 bg-[#00ff88]/3" />}

              <div className="absolute top-3 left-3 flex items-center gap-1.5 flex-wrap">
                <span className={`text-[10px] font-black px-2 py-0.5 rounded border uppercase tracking-wide ${modeColors[t.mode] ?? modeColors.squad}`} data-testid={`badge-mode-${t.id}`}>
                  {t.mode}
                </span>
                <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase flex items-center gap-0.5 ${sc.color}`} data-testid={`badge-status-${t.id}`}>
                  {sc.dot && <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${sc.dot}`} />}
                  {sc.label}
                </span>
                {activeMatchNumbers.map(n => (
                  <span key={n} className="text-[10px] font-black px-2 py-0.5 rounded border uppercase bg-[#ff6b00]/20 text-[#ff6b00] border-[#ff6b00]/40">
                    Match #{n}
                  </span>
                ))}
              </div>

              <div className="absolute top-3 right-3 flex items-center gap-1 bg-black/60 backdrop-blur-sm rounded-lg px-2 py-1 border border-[#ffd700]/20">
                <Trophy className="w-3.5 h-3.5 text-[#ffd700]" />
                <span className="text-[#ffd700] text-xs font-black" data-testid={`text-prize-${t.id}`}>
                  ৳{Number(t.prizePool).toLocaleString()}
                </span>
              </div>
            </div>

            {/* Content */}
            <div className="p-4 flex flex-col flex-1">
              <h3 className="text-white font-black text-base leading-tight group-hover:text-[#ff6b00] transition-colors line-clamp-1 mb-2" data-testid={`text-tournament-name-${t.id}`}>
                {t.name}
              </h3>
              <div className="flex items-center gap-2 flex-wrap mb-3">
                <div className="flex items-center gap-1 bg-[#1a1a24] rounded-lg px-2 py-1">
                  <span className="text-[#a0a0b0] text-[10px] uppercase font-bold">Entry</span>
                  <span className={`text-xs font-black ${entryFee === 0 ? "text-[#00ff88]" : "text-white"}`}>
                    {entryFee === 0 ? "FREE" : `৳${entryFee.toLocaleString()}`}
                  </span>
                </div>
                {perKill > 0 && (
                  <div className="flex items-center gap-0.5 bg-[#00ff88]/8 border border-[#00ff88]/15 rounded-lg px-2 py-1">
                    <Zap className="w-3 h-3 text-[#00ff88]" />
                    <span className="text-[#00ff88] text-[10px] font-black">+৳{perKill}/kill</span>
                  </div>
                )}
                <div className="ml-auto flex items-center gap-1 text-[#606070] text-[10px]">
                  <Clock className="w-3 h-3" />
                  {formatBDDate(t.startDate)}
                </div>
              </div>

              {showCountdown && (
                <div className="mb-3 bg-[#0a0a0f] rounded-xl px-3 py-2 border border-[#1e1e2e]">
                  <div className="text-[9px] uppercase tracking-widest text-[#606070] font-bold mb-1.5">
                    {effectiveStatus === "starting_soon" ? "⚡ Starting Soon" : effectiveStatus === "room_open" ? "🔑 Match Starts In" : "Starts In"}
                  </div>
                  <CountdownTimer targetDate={targetDate} className="text-[11px] gap-1.5" />
                  {effectiveStatus === "room_open" && (
                    <div className="mt-1.5 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse shrink-0" />
                      <span className="text-orange-400 text-[9px] font-black uppercase tracking-wide">Room credentials available</span>
                    </div>
                  )}
                </div>
              )}

              <div className="mt-auto">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 text-[#606070]">
                    <Users className="w-3 h-3" />
                    <span className="text-xs">{t.filledSlots}<span className="text-[#3a3a48]">/{t.maxSlots}</span></span>
                  </div>
                  <div className="flex-1 h-1 bg-[#1a1a24] rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${isFull ? "bg-[#ff2244]" : slotPct >= 80 ? "bg-gradient-to-r from-[#ff6b00] to-[#ff2244]" : "bg-gradient-to-r from-[#00ff88] to-[#ff6b00]"}`}
                      style={{ width: `${slotPct}%` }}
                      data-testid={`bar-slots-${t.id}`}
                    />
                  </div>
                  <span data-testid={`text-slots-left-${t.id}`} className={`font-bold text-[10px] uppercase shrink-0 ${isFull ? "text-[#ff2244]" : slotsLeft <= 5 ? "text-yellow-400" : "text-[#606070]"}`}>
                    {isFull ? "FULL" : `${slotsLeft} left`}
                  </span>
                </div>
              </div>
            </div>
          </Link>

          {showResults && (
            <div className="px-4 pb-4 pt-0">
              <button
                onClick={openLeaderboard}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-[#ffd700]/15 to-[#ff6b00]/10 hover:from-[#ffd700]/25 hover:to-[#ff6b00]/20 border border-[#ffd700]/30 hover:border-[#ffd700]/60 text-[#ffd700] font-black text-xs uppercase rounded-xl transition-all duration-200 shadow-[0_2px_12px_rgba(255,215,0,0.08)] hover:shadow-[0_2px_20px_rgba(255,215,0,0.15)]"
              >
                <Trophy className="w-3.5 h-3.5" />
                🏆 View Leaderboard
              </button>
            </div>
          )}
        </div>

        {leaderboardOpen && <LeaderboardModal tournament={t} onClose={() => setLeaderboardOpen(false)} />}
      </>
    );
  }

  return (
    <>
      <div
        data-testid={`card-tournament-${t.id}`}
        className="group flex flex-col rounded-xl border border-[#ff6b00]/15 bg-[#0e0e17] hover:border-[#ff6b00]/40 hover:shadow-[0_2px_14px_rgba(255,107,0,0.08)] transition-all duration-200 overflow-hidden"
      >
        <Link href={`/tournaments/${t.id}`} className="flex items-center gap-3 p-3">
          <div className="relative w-16 h-16 shrink-0 rounded-lg overflow-hidden bg-gradient-to-br from-[#1a1a24] to-[#0a0a0f]">
            {t.bannerUrl ? (
              <img src={t.bannerUrl} alt={t.name}
                className="w-full h-full object-cover opacity-60 group-hover:opacity-75 group-hover:scale-105 transition-all duration-300"
                data-testid={`img-tournament-banner-${t.id}`} />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Trophy className="w-6 h-6 text-[#ff6b00]/20 group-hover:text-[#ff6b00]/35 transition-colors" />
              </div>
            )}
            {isLive && <div className="absolute inset-0 bg-[#00ff88]/5" />}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-1 flex-wrap">
              <span className={`text-[9px] font-black px-1.5 py-0.5 rounded border uppercase tracking-wide ${modeColors[t.mode] ?? modeColors.squad}`} data-testid={`badge-mode-${t.id}`}>
                {t.mode}
              </span>
              <span className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase flex items-center gap-0.5 ${sc.color}`} data-testid={`badge-status-${t.id}`}>
                {sc.dot && <span className={`w-1 h-1 rounded-full shrink-0 ${sc.dot}`} />}
                {sc.label}
              </span>
              {activeMatchNumbers.map(n => (
                <span key={n} className="text-[9px] font-black px-1.5 py-0.5 rounded border uppercase bg-[#ff6b00]/15 text-[#ff6b00] border-[#ff6b00]/30">
                  Match #{n}
                </span>
              ))}
            </div>

            <h3 className="text-white font-black text-sm leading-tight group-hover:text-[#ff6b00] transition-colors line-clamp-1 mb-1.5" data-testid={`text-tournament-name-${t.id}`}>
              {t.name}
            </h3>

            <div className="flex items-center gap-2 flex-wrap mb-1.5">
              <div className="flex items-center gap-1">
                <Trophy className="w-3 h-3 text-[#ffd700]" />
                <span className="text-[#ffd700] text-[10px] font-black" data-testid={`text-prize-${t.id}`}>৳{Number(t.prizePool).toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-1 bg-[#1a1a24] rounded px-1.5 py-0.5">
                <span className="text-[#a0a0b0] text-[9px] uppercase font-bold">Entry</span>
                <span className={`text-[10px] font-black ${entryFee === 0 ? "text-[#00ff88]" : "text-white"}`}>
                  {entryFee === 0 ? "FREE" : `৳${entryFee.toLocaleString()}`}
                </span>
              </div>
              {perKill > 0 && (
                <div className="flex items-center gap-0.5 bg-[#00ff88]/8 border border-[#00ff88]/15 rounded px-1.5 py-0.5">
                  <Zap className="w-2.5 h-2.5 text-[#00ff88]" />
                  <span className="text-[#00ff88] text-[9px] font-black">+৳{perKill}/kill</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              <div className="flex items-center gap-1 text-[#606070]">
                <Users className="w-2.5 h-2.5" />
                <span className="text-[10px]">{t.filledSlots}<span className="text-[#3a3a48]">/{t.maxSlots}</span></span>
              </div>
              <div className="flex-1 h-0.5 bg-[#1a1a24] rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${isFull ? "bg-[#ff2244]" : slotPct >= 80 ? "bg-gradient-to-r from-[#ff6b00] to-[#ff2244]" : "bg-gradient-to-r from-[#00ff88] to-[#ff6b00]"}`}
                  style={{ width: `${slotPct}%` }}
                  data-testid={`bar-slots-${t.id}`}
                />
              </div>
              <span data-testid={`text-slots-left-${t.id}`} className={`font-bold text-[9px] uppercase shrink-0 ${isFull ? "text-[#ff2244]" : slotsLeft <= 5 ? "text-yellow-400" : "text-[#606070]"}`}>
                {isFull ? "FULL" : `${slotsLeft} left`}
              </span>
            </div>
          </div>

          <div className="flex flex-col items-end gap-1 shrink-0">
            {showCountdown ? (
              <div className="flex flex-col items-end gap-0.5">
                <span className={`text-[8px] uppercase tracking-widest font-bold ${effectiveStatus === "starting_soon" ? "text-yellow-400" : effectiveStatus === "room_open" ? "text-orange-400" : "text-[#606070]"}`}>
                  {effectiveStatus === "starting_soon" ? "⚡ Soon" : effectiveStatus === "room_open" ? "🔑 Opens" : "Starts In"}
                </span>
                <CountdownTimer targetDate={targetDate} className="text-[9px] gap-0.5" />
              </div>
            ) : (
              <div className="flex items-center gap-0.5 text-[#606070] text-[10px]">
                <Clock className="w-2.5 h-2.5" />
                {formatBDDate(t.startDate)}
              </div>
            )}
            <ChevronRight className="w-3.5 h-3.5 text-[#ff6b00]/50 group-hover:text-[#ff6b00] group-hover:translate-x-0.5 transition-all" />
          </div>
        </Link>

        {showResults && (
          <div className="px-3 pb-3 pt-0">
            <button
              onClick={openLeaderboard}
              className="w-full flex items-center justify-center gap-1.5 py-2 bg-gradient-to-r from-[#ffd700]/12 to-[#ff6b00]/8 hover:from-[#ffd700]/22 hover:to-[#ff6b00]/15 border border-[#ffd700]/25 hover:border-[#ffd700]/50 text-[#ffd700] font-black text-[10px] uppercase rounded-lg transition-all duration-200"
            >
              <Trophy className="w-3 h-3" />
              🏆 View Leaderboard
            </button>
          </div>
        )}
      </div>

      {leaderboardOpen && <LeaderboardModal tournament={t} onClose={() => setLeaderboardOpen(false)} />}
    </>
  );
}
