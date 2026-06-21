import { useState, useEffect, useCallback } from "react";
import { Link } from "wouter";
import { Users, Trophy, Clock, ChevronRight, Zap, X, Medal, Swords, Star, RefreshCw } from "lucide-react";
import CountdownTimer from "./CountdownTimer";
import { apiBase as BASE } from "@/lib/apiBase";

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

interface MatchResult {
  id: number;
  matchId: number;
  playerName: string;
  rank: number;
  kills: number;
  points: number;
}

interface MatchWithResults {
  id: number;
  matchNumber: number;
  scheduledAt?: string | null;
  mapName?: string | null;
  status: string;
  resultsPublished?: boolean | null;
  results: MatchResult[];
}

const modeColors: Record<string, string> = {
  solo:  "bg-blue-500/20 text-blue-400 border-blue-500/30",
  duo:   "bg-purple-500/20 text-purple-400 border-purple-500/30",
  squad: "bg-[#ff6b00]/20 text-[#ff6b00] border-[#ff6b00]/30",
};

type StatusKey = "upcoming" | "starting_soon" | "live" | "ongoing" | "ended" | "completed" | "cancelled";

const statusConfig: Record<string, { color: string; dot?: string; label: string }> = {
  upcoming:      { color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30", label: "Soon" },
  starting_soon: { color: "bg-[#ff6b00]/20 text-[#ff6b00] border-[#ff6b00]/40", dot: "bg-[#ff6b00] animate-pulse", label: "STARTING SOON" },
  live:          { color: "bg-green-500/20 text-green-400 border-green-500/30", dot: "bg-green-400 animate-pulse", label: "LIVE" },
  ongoing:       { color: "bg-green-500/20 text-green-400 border-green-500/30", dot: "bg-green-400 animate-pulse", label: "LIVE" },
  ended:         { color: "bg-gray-500/20 text-gray-400 border-gray-500/30", label: "Ended" },
  completed:     { color: "bg-gray-500/20 text-gray-400 border-gray-500/30", label: "Completed" },
  cancelled:     { color: "bg-red-500/20 text-red-400 border-red-500/30", label: "Off" },
};

function useClientStatus(serverStatus: string, startDate: string): StatusKey {
  const computeStatus = (): StatusKey => {
    if (serverStatus !== "upcoming") return serverStatus as StatusKey;
    const now = Date.now();
    const start = new Date(startDate).getTime();
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

const rankMedal = (rank: number) => {
  if (rank === 1) return <span className="text-[#ffd700] text-base">🥇</span>;
  if (rank === 2) return <span className="text-[#c0c0c0] text-base">🥈</span>;
  if (rank === 3) return <span className="text-[#cd7f32] text-base">🥉</span>;
  return <span className="text-[#606070] text-xs font-black">#{rank}</span>;
};

function LeaderboardModal({ tournament, onClose }: { tournament: Tournament; onClose: () => void }) {
  const [matches, setMatches] = useState<MatchWithResults[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeMatch, setActiveMatch] = useState<number>(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${BASE}/api/tournaments/${tournament.id}/matches`);
      if (!res.ok) throw new Error("Failed to load results");
      const data: MatchWithResults[] = await res.json();
      const withResults = data.filter((m) => m.results && m.results.length > 0);
      setMatches(withResults.length > 0 ? withResults : data);
      setActiveMatch(0);
    } catch (e: any) {
      setError(e.message ?? "Could not load leaderboard.");
    } finally {
      setLoading(false);
    }
  }, [tournament.id]);

  useEffect(() => {
    load();
  }, [load]);

  const currentMatch = matches?.[activeMatch];
  const sortedResults = currentMatch
    ? [...currentMatch.results].sort((a, b) => a.rank - b.rank)
    : [];

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative w-full max-w-lg bg-[#0e0e17] border border-[#ff6b00]/25 rounded-2xl shadow-[0_0_60px_rgba(255,107,0,0.18)] overflow-hidden max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center gap-3 p-4 border-b border-[#1a1a28] bg-gradient-to-r from-[#ff6b00]/8 to-transparent shrink-0">
          <div className="w-9 h-9 rounded-xl bg-[#ff6b00]/15 border border-[#ff6b00]/30 flex items-center justify-center shrink-0">
            <Trophy className="w-4.5 h-4.5 text-[#ffd700]" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-white font-black text-sm uppercase tracking-wide line-clamp-1">{tournament.name}</h2>
            <p className="text-[#a0a0b0] text-[10px] uppercase tracking-wider font-bold mt-0.5">🏆 Match Results</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-[#1a1a28] hover:bg-[#ff2244]/20 border border-[#2a2a36] hover:border-[#ff2244]/40 flex items-center justify-center transition-colors shrink-0"
          >
            <X className="w-3.5 h-3.5 text-[#a0a0b0]" />
          </button>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="w-8 h-8 border-2 border-[#ff6b00] border-t-transparent rounded-full animate-spin" />
            <p className="text-[#606070] text-xs uppercase tracking-wider font-bold">Loading results…</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3 px-6">
            <p className="text-[#ff4444] text-sm text-center">{error}</p>
            <button onClick={load} className="flex items-center gap-1.5 text-xs text-[#ff6b00] font-bold uppercase hover:text-[#ff8533] transition-colors">
              <RefreshCw className="w-3.5 h-3.5" /> Retry
            </button>
          </div>
        ) : (
          <>
            {/* Match Tabs */}
            {matches && matches.length > 1 && (
              <div className="flex gap-1.5 px-4 pt-3 pb-0 flex-wrap shrink-0">
                {matches.map((m, idx) => (
                  <button
                    key={m.id}
                    onClick={() => setActiveMatch(idx)}
                    className={`px-3 py-1 text-[10px] font-black uppercase rounded-lg border transition-colors ${
                      activeMatch === idx
                        ? "bg-[#ff6b00] border-[#ff6b00] text-white"
                        : "bg-[#12121a] border-[#2a2a36] text-[#a0a0b0] hover:border-[#ff6b00]/40"
                    }`}
                  >
                    Match {m.matchNumber}
                  </button>
                ))}
              </div>
            )}

            {/* Match info bar */}
            {currentMatch && (
              <div className="flex items-center gap-3 px-4 py-2.5 shrink-0">
                {currentMatch.mapName && (
                  <div className="flex items-center gap-1 bg-[#1a1a28] rounded-lg px-2 py-1 border border-[#2a2a36]">
                    <Swords className="w-3 h-3 text-[#a0a0b0]" />
                    <span className="text-[#a0a0b0] text-[10px] font-bold uppercase">{currentMatch.mapName}</span>
                  </div>
                )}
                {currentMatch.scheduledAt && (
                  <div className="flex items-center gap-1 text-[#606070] text-[10px]">
                    <Clock className="w-3 h-3" />
                    {new Date(currentMatch.scheduledAt).toLocaleString("en-BD", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </div>
                )}
                <div className="ml-auto flex items-center gap-1 text-[#606070] text-[10px]">
                  <Users className="w-3 h-3" />
                  <span>{sortedResults.length} players</span>
                </div>
              </div>
            )}

            {/* Results Table */}
            <div className="overflow-y-auto flex-1 px-4 pb-4">
              {sortedResults.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 gap-2">
                  <Medal className="w-8 h-8 text-[#303040]" />
                  <p className="text-[#606070] text-xs uppercase font-bold tracking-wider">No results published yet</p>
                </div>
              ) : (
                <>
                  {/* Table header */}
                  <div className="grid grid-cols-[2rem_1fr_3rem_3rem] gap-2 px-3 py-2 mb-1">
                    <span className="text-[#505060] text-[9px] uppercase font-bold tracking-wider text-center">Rank</span>
                    <span className="text-[#505060] text-[9px] uppercase font-bold tracking-wider">Player</span>
                    <span className="text-[#505060] text-[9px] uppercase font-bold tracking-wider text-center">Kills</span>
                    <span className="text-[#505060] text-[9px] uppercase font-bold tracking-wider text-center">Points</span>
                  </div>

                  <div className="space-y-1.5">
                    {sortedResults.map((r) => (
                      <div
                        key={r.id}
                        className={`grid grid-cols-[2rem_1fr_3rem_3rem] gap-2 items-center px-3 py-2.5 rounded-xl border transition-colors ${
                          r.rank === 1
                            ? "bg-gradient-to-r from-[#ffd700]/8 to-transparent border-[#ffd700]/20"
                            : r.rank === 2
                            ? "bg-gradient-to-r from-[#c0c0c0]/5 to-transparent border-[#c0c0c0]/15"
                            : r.rank === 3
                            ? "bg-gradient-to-r from-[#cd7f32]/5 to-transparent border-[#cd7f32]/15"
                            : "bg-[#12121a] border-[#1e1e2e]"
                        }`}
                      >
                        <div className="flex items-center justify-center">{rankMedal(r.rank)}</div>
                        <div className="min-w-0">
                          <p className={`font-black text-xs truncate ${r.rank <= 3 ? "text-white" : "text-[#c0c0c0]"}`}>{r.playerName}</p>
                        </div>
                        <div className="flex flex-col items-center">
                          <div className="flex items-center gap-0.5">
                            <Zap className="w-2.5 h-2.5 text-[#ff6b00]" />
                            <span className="text-[#ff6b00] text-xs font-black">{r.kills}</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-center">
                          <div className="flex items-center gap-0.5">
                            <Star className="w-2.5 h-2.5 text-[#a0a0b0]" />
                            <span className="text-[#a0a0b0] text-xs font-bold">{r.points}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function TournamentCard({ t, featured = false }: { t: Tournament; featured?: boolean }) {
  const slotPct    = Math.min((t.filledSlots / t.maxSlots) * 100, 100);
  const slotsLeft  = t.maxSlots - t.filledSlots;
  const isFull     = slotsLeft === 0;
  const entryFee   = Number(t.entryFee);
  const perKill    = Number(t.perKillReward ?? 0);

  const clientStatus = useClientStatus(t.status, t.startDate);
  const isLive       = clientStatus === "live" || clientStatus === "ongoing" || clientStatus === "starting_soon";
  const sc           = statusConfig[clientStatus] ?? statusConfig.upcoming;
  const showResults  = t.resultsPublished === true || clientStatus === "completed" || t.status === "completed";

  const targetDate: string = (t.countdownTo ?? t.startDate)!;

  const [leaderboardOpen, setLeaderboardOpen] = useState(false);

  const openLeaderboard = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setLeaderboardOpen(true);
  };

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
                <img
                  src={t.bannerUrl}
                  alt={t.name}
                  className="w-full h-full object-cover opacity-50 group-hover:opacity-65 group-hover:scale-105 transition-all duration-500"
                  data-testid={`img-tournament-banner-${t.id}`}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Trophy className="w-14 h-14 text-[#ff6b00]/10 group-hover:text-[#ff6b00]/20 transition-colors" />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-[#0e0e17] via-[#0e0e17]/20 to-transparent" />
              {isLive && <div className="absolute inset-0 bg-[#00ff88]/3" />}

              {/* Badges overlay */}
              <div className="absolute top-3 left-3 flex items-center gap-1.5">
                <span className={`text-[10px] font-black px-2 py-0.5 rounded border uppercase tracking-wide ${modeColors[t.mode] ?? modeColors.squad}`} data-testid={`badge-mode-${t.id}`}>
                  {t.mode}
                </span>
                <span className={`text-[10px] font-black px-2 py-0.5 rounded border uppercase flex items-center gap-0.5 ${sc.color}`} data-testid={`badge-status-${t.id}`}>
                  {sc.dot && <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${sc.dot}`} />}
                  {sc.label}
                </span>
              </div>

              {/* Prize overlay */}
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

              {/* Stats row */}
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
                  {new Date(t.startDate).toLocaleDateString("en-BD", { day: "numeric", month: "short" })}
                </div>
              </div>

              {/* Countdown — shown for upcoming AND starting_soon states */}
              {(clientStatus === "upcoming" || clientStatus === "starting_soon") && (
                <div className="mb-3 bg-[#0a0a0f] rounded-xl px-3 py-2 border border-[#1e1e2e]">
                  <div className="text-[9px] uppercase tracking-widest text-[#606070] font-bold mb-1.5">
                    {clientStatus === "starting_soon" ? "⚡ Starting Soon" : "Starts In"}
                  </div>
                  <CountdownTimer targetDate={targetDate} className="text-[11px] gap-1.5" />
                </div>
              )}

              {/* Slots bar */}
              <div className="mt-auto">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 text-[#606070]">
                    <Users className="w-3 h-3" />
                    <span className="text-xs">{t.filledSlots}<span className="text-[#3a3a48]">/{t.maxSlots}</span></span>
                  </div>
                  <div className="flex-1 h-1 bg-[#1a1a24] rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isFull ? "bg-[#ff2244]" :
                        slotPct >= 80 ? "bg-gradient-to-r from-[#ff6b00] to-[#ff2244]" :
                        "bg-gradient-to-r from-[#00ff88] to-[#ff6b00]"
                      }`}
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

          {/* View Leaderboard button — only shown when results are published */}
          {showResults && (
            <div className="px-4 pb-4 pt-0">
              <button
                onClick={openLeaderboard}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-[#ffd700]/15 to-[#ff6b00]/10 hover:from-[#ffd700]/25 hover:to-[#ff6b00]/20 border border-[#ffd700]/30 hover:border-[#ffd700]/60 text-[#ffd700] font-black text-xs uppercase rounded-xl transition-all duration-200 shadow-[0_2px_12px_rgba(255,215,0,0.08)] hover:shadow-[0_2px_20px_rgba(255,215,0,0.15)]"
              >
                <Trophy className="w-3.5 h-3.5" />
                View Leaderboard
              </button>
            </div>
          )}
        </div>

        {leaderboardOpen && (
          <LeaderboardModal tournament={t} onClose={() => setLeaderboardOpen(false)} />
        )}
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
          {/* Thumbnail */}
          <div className="relative w-16 h-16 shrink-0 rounded-lg overflow-hidden bg-gradient-to-br from-[#1a1a24] to-[#0a0a0f]">
            {t.bannerUrl ? (
              <img
                src={t.bannerUrl}
                alt={t.name}
                className="w-full h-full object-cover opacity-60 group-hover:opacity-75 group-hover:scale-105 transition-all duration-300"
                data-testid={`img-tournament-banner-${t.id}`}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Trophy className="w-6 h-6 text-[#ff6b00]/20 group-hover:text-[#ff6b00]/35 transition-colors" />
              </div>
            )}
            {isLive && <div className="absolute inset-0 bg-[#00ff88]/5" />}
          </div>

          {/* Main content */}
          <div className="flex-1 min-w-0">
            {/* Badges row */}
            <div className="flex items-center gap-1.5 mb-1 flex-wrap">
              <span className={`text-[9px] font-black px-1.5 py-0.5 rounded border uppercase tracking-wide ${modeColors[t.mode] ?? modeColors.squad}`} data-testid={`badge-mode-${t.id}`}>
                {t.mode}
              </span>
              <span className={`text-[9px] font-black px-1.5 py-0.5 rounded border uppercase flex items-center gap-0.5 ${sc.color}`} data-testid={`badge-status-${t.id}`}>
                {sc.dot && <span className={`w-1 h-1 rounded-full shrink-0 ${sc.dot}`} />}
                {sc.label}
              </span>
            </div>

            <h3 className="text-white font-black text-sm leading-tight group-hover:text-[#ff6b00] transition-colors line-clamp-1 mb-1.5" data-testid={`text-tournament-name-${t.id}`}>
              {t.name}
            </h3>

            {/* Prize + Entry */}
            <div className="flex items-center gap-2 flex-wrap mb-1.5">
              <div className="flex items-center gap-1">
                <Trophy className="w-3 h-3 text-[#ffd700]" />
                <span className="text-[#ffd700] text-[10px] font-black" data-testid={`text-prize-${t.id}`}>
                  ৳{Number(t.prizePool).toLocaleString()}
                </span>
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

            {/* Slots bar */}
            <div className="flex items-center gap-1.5 flex-1">
              <div className="flex items-center gap-1 text-[#606070]">
                <Users className="w-2.5 h-2.5" />
                <span className="text-[10px]">{t.filledSlots}<span className="text-[#3a3a48]">/{t.maxSlots}</span></span>
              </div>
              <div className="flex-1 h-0.5 bg-[#1a1a24] rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    isFull ? "bg-[#ff2244]" :
                    slotPct >= 80 ? "bg-gradient-to-r from-[#ff6b00] to-[#ff2244]" :
                    "bg-gradient-to-r from-[#00ff88] to-[#ff6b00]"
                  }`}
                  style={{ width: `${slotPct}%` }}
                  data-testid={`bar-slots-${t.id}`}
                />
              </div>
              <span data-testid={`text-slots-left-${t.id}`} className={`font-bold text-[9px] uppercase shrink-0 ${isFull ? "text-[#ff2244]" : slotsLeft <= 5 ? "text-yellow-400" : "text-[#606070]"}`}>
                {isFull ? "FULL" : `${slotsLeft} left`}
              </span>
            </div>
          </div>

          {/* Right: countdown + chevron */}
          <div className="flex flex-col items-end gap-1 shrink-0">
            {(clientStatus === "upcoming" || clientStatus === "starting_soon") ? (
              <div className="flex flex-col items-end gap-0.5">
                <span className={`text-[8px] uppercase tracking-widest font-bold ${clientStatus === "starting_soon" ? "text-[#ff6b00]" : "text-[#606070]"}`}>
                  {clientStatus === "starting_soon" ? "⚡ Soon" : "Starts In"}
                </span>
                <CountdownTimer targetDate={targetDate} className="text-[9px] gap-0.5" />
              </div>
            ) : (
              <div className="flex items-center gap-0.5 text-[#606070] text-[10px]">
                <Clock className="w-2.5 h-2.5" />
                {new Date(t.startDate).toLocaleDateString("en-BD", { day: "numeric", month: "short" })}
              </div>
            )}
            <ChevronRight className="w-3.5 h-3.5 text-[#ff6b00]/50 group-hover:text-[#ff6b00] group-hover:translate-x-0.5 transition-all" />
          </div>
        </Link>

        {/* View Leaderboard button for list-style card */}
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

      {leaderboardOpen && (
        <LeaderboardModal tournament={t} onClose={() => setLeaderboardOpen(false)} />
      )}
    </>
  );
}
