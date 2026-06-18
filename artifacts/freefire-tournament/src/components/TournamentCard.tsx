import { Link } from "wouter";
import { Users, Trophy, Clock, ChevronRight, Zap } from "lucide-react";
import CountdownTimer from "./CountdownTimer";

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
}

const modeColors: Record<string, string> = {
  solo:  "bg-blue-500/20 text-blue-400 border-blue-500/30",
  duo:   "bg-purple-500/20 text-purple-400 border-purple-500/30",
  squad: "bg-[#ff6b00]/20 text-[#ff6b00] border-[#ff6b00]/30",
};

const statusConfig: Record<string, { color: string; dot?: string; label: string }> = {
  upcoming:  { color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30", label: "Soon" },
  live:      { color: "bg-green-500/20 text-green-400 border-green-500/30", dot: "bg-green-400 animate-pulse", label: "LIVE" },
  ongoing:   { color: "bg-green-500/20 text-green-400 border-green-500/30", dot: "bg-green-400 animate-pulse", label: "LIVE" },
  ended:     { color: "bg-gray-500/20 text-gray-400 border-gray-500/30", label: "Ended" },
  completed: { color: "bg-gray-500/20 text-gray-400 border-gray-500/30", label: "Ended" },
  cancelled: { color: "bg-red-500/20 text-red-400 border-red-500/30", label: "Off" },
};

export default function TournamentCard({ t, featured = false }: { t: Tournament; featured?: boolean }) {
  const slotPct = Math.min((t.filledSlots / t.maxSlots) * 100, 100);
  const slotsLeft = t.maxSlots - t.filledSlots;
  const isFull = slotsLeft === 0;
  const isLive = t.status === "live" || t.status === "ongoing";
  const entryFee = Number(t.entryFee);
  const perKill = Number(t.perKillReward ?? 0);
  const sc = statusConfig[t.status] ?? statusConfig.upcoming;

  if (featured) {
    return (
      <Link
        href={`/tournaments/${t.id}`}
        data-testid={`card-tournament-${t.id}`}
        className="group relative rounded-2xl border border-[#ff6b00]/20 bg-[#0e0e17] hover:border-[#ff6b00]/50 hover:shadow-[0_4px_24px_rgba(255,107,0,0.12)] transition-all duration-200 overflow-hidden flex flex-col"
      >
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
          {/* Status badge overlay */}
          <div className="absolute top-3 left-3 flex items-center gap-1.5">
            <span className={`text-[10px] font-black px-2 py-0.5 rounded border uppercase tracking-wide ${modeColors[t.mode] ?? modeColors.squad}`} data-testid={`badge-mode-${t.id}`}>
              {t.mode}
            </span>
            <span className={`text-[10px] font-black px-2 py-0.5 rounded border uppercase flex items-center gap-0.5 ${sc.color}`} data-testid={`badge-status-${t.id}`}>
              {sc.dot && <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${sc.dot}`} />}
              {sc.label}
            </span>
          </div>
          {/* Prize badge overlay */}
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

          {/* Countdown */}
          {t.status === "upcoming" && t.countdownTo && (
            <div className="mb-3">
              <CountdownTimer targetDate={t.countdownTo} className="text-[10px] gap-1" />
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
    );
  }

  return (
    <Link
      href={`/tournaments/${t.id}`}
      data-testid={`card-tournament-${t.id}`}
      className="group flex items-center gap-3 rounded-xl border border-[#ff6b00]/15 bg-[#0e0e17] hover:border-[#ff6b00]/40 hover:shadow-[0_2px_14px_rgba(255,107,0,0.08)] transition-all duration-200 overflow-hidden p-3"
    >
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
        {/* Name + badges row */}
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

        {/* Prize + Entry + Kill reward */}
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

        {/* Slots + time row */}
        <div className="flex items-center justify-between gap-2">
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
      </div>

      {/* Right: time + chevron */}
      <div className="flex flex-col items-end gap-1.5 shrink-0">
        {t.status === "upcoming" && t.countdownTo ? (
          <CountdownTimer targetDate={t.countdownTo} className="text-[9px] gap-0.5" />
        ) : (
          <div className="flex items-center gap-0.5 text-[#606070] text-[10px]">
            <Clock className="w-2.5 h-2.5" />
            {new Date(t.startDate).toLocaleDateString("en-BD", { day: "numeric", month: "short" })}
          </div>
        )}
        <ChevronRight className="w-3.5 h-3.5 text-[#ff6b00]/50 group-hover:text-[#ff6b00] group-hover:translate-x-0.5 transition-all" />
      </div>
    </Link>
  );
}
