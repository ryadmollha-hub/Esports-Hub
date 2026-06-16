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
  upcoming:  { color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30", label: "Upcoming" },
  live:      { color: "bg-green-500/20 text-green-400 border-green-500/30",    dot: "bg-green-400 animate-pulse", label: "LIVE" },
  ongoing:   { color: "bg-green-500/20 text-green-400 border-green-500/30",    dot: "bg-green-400 animate-pulse", label: "LIVE" },
  ended:     { color: "bg-gray-500/20 text-gray-400 border-gray-500/30",       label: "Ended" },
  completed: { color: "bg-gray-500/20 text-gray-400 border-gray-500/30",       label: "Ended" },
  cancelled: { color: "bg-red-500/20 text-red-400 border-red-500/30",          label: "Cancelled" },
};

export default function TournamentCard({ t }: { t: Tournament }) {
  const slotPct = Math.min((t.filledSlots / t.maxSlots) * 100, 100);
  const slotsLeft = t.maxSlots - t.filledSlots;
  const isFull = slotsLeft === 0;
  const isLive = t.status === "live" || t.status === "ongoing";
  const entryFee = Number(t.entryFee);
  const perKill = Number(t.perKillReward ?? 0);
  const sc = statusConfig[t.status] ?? statusConfig.upcoming;

  return (
    <Link
      href={`/tournaments/${t.id}`}
      data-testid={`card-tournament-${t.id}`}
      className="group block rounded-xl border border-[#ff6b00]/15 bg-[#0e0e17] hover:border-[#ff6b00]/40 hover:shadow-[0_4px_20px_rgba(255,107,0,0.08)] transition-all duration-300 overflow-hidden"
    >
      {/* Banner */}
      <div className="relative h-32 bg-gradient-to-br from-[#1a1a24] to-[#0a0a0f] overflow-hidden">
        {t.bannerUrl ? (
          <img
            src={t.bannerUrl}
            alt={t.name}
            className="w-full h-full object-cover opacity-50 group-hover:opacity-65 group-hover:scale-105 transition-all duration-500"
            data-testid={`img-tournament-banner-${t.id}`}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Trophy className="w-10 h-10 text-[#ff6b00]/10 group-hover:text-[#ff6b00]/20 transition-colors" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0e0e17] via-[#0e0e17]/20 to-transparent" />

        {isLive && (
          <div className="absolute inset-0 bg-[#00ff88]/3" />
        )}

        {/* Badges */}
        <div className="absolute top-2 left-2 flex gap-1">
          <span className={`text-[9px] font-black px-1.5 py-0.5 rounded border uppercase tracking-wide ${modeColors[t.mode] ?? modeColors.squad}`} data-testid={`badge-mode-${t.id}`}>
            {t.mode}
          </span>
          <span className={`text-[9px] font-black px-1.5 py-0.5 rounded border uppercase flex items-center gap-1 ${sc.color}`} data-testid={`badge-status-${t.id}`}>
            {sc.dot && <span className={`w-1 h-1 rounded-full shrink-0 ${sc.dot}`} />}
            {sc.label}
          </span>
        </div>

        {/* Prize pool badge */}
        <div className="absolute top-2 right-2">
          <div className="flex items-center gap-1 bg-[#0a0a0f]/80 backdrop-blur-sm border border-[#ffd700]/30 rounded px-1.5 py-0.5">
            <Trophy className="w-2.5 h-2.5 text-[#ffd700]" />
            <span className="text-[#ffd700] text-[10px] font-black" data-testid={`text-prize-${t.id}`}>
              ৳{Number(t.prizePool).toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-3">
        <h3 className="text-white font-black text-sm mb-2 leading-tight group-hover:text-[#ff6b00] transition-colors line-clamp-1" data-testid={`text-tournament-name-${t.id}`}>
          {t.name}
        </h3>

        {/* Fee + Kill reward row */}
        <div className="flex items-center gap-1.5 mb-2 flex-wrap">
          <div className="flex items-center gap-1 bg-[#1a1a24] rounded px-2 py-1">
            <span className="text-[#a0a0b0] text-[9px] uppercase font-bold">Entry</span>
            <span className={`text-[10px] font-black ${entryFee === 0 ? "text-[#00ff88]" : "text-white"}`}>
              {entryFee === 0 ? "FREE" : `৳${entryFee.toLocaleString()}`}
            </span>
          </div>
          {perKill > 0 && (
            <div className="flex items-center gap-1 bg-[#00ff88]/8 border border-[#00ff88]/15 rounded px-1.5 py-1">
              <Zap className="w-2.5 h-2.5 text-[#00ff88]" />
              <span className="text-[#00ff88] text-[9px] font-black">+৳{perKill}/kill</span>
            </div>
          )}
        </div>

        {/* Slot progress */}
        <div className="mb-2">
          <div className="flex justify-between text-xs mb-1">
            <span className="flex items-center gap-1 text-[#606070]">
              <Users className="w-2.5 h-2.5" />
              <span className="text-[10px]">{t.filledSlots}<span className="text-[#3a3a48]">/{t.maxSlots}</span></span>
            </span>
            <span data-testid={`text-slots-left-${t.id}`} className={`font-bold text-[9px] uppercase ${isFull ? "text-[#ff2244]" : slotsLeft <= 5 ? "text-yellow-400" : "text-[#606070]"}`}>
              {isFull ? "FULL" : `${slotsLeft} left`}
            </span>
          </div>
          <div className="h-0.5 bg-[#1a1a24] rounded-full overflow-hidden">
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
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-[#ff6b00]/8">
          {t.status === "upcoming" && t.countdownTo ? (
            <CountdownTimer targetDate={t.countdownTo} className="text-[10px] gap-1" />
          ) : (
            <div className="flex items-center gap-1 text-[#606070] text-[10px]">
              <Clock className="w-2.5 h-2.5" />
              {new Date(t.startDate).toLocaleDateString("en-BD", { day: "numeric", month: "short" })}
            </div>
          )}
          <div className="flex items-center gap-0.5 text-[#ff6b00]/70 group-hover:text-[#ff6b00] transition-colors text-[10px] font-bold uppercase">
            View <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>
      </div>
    </Link>
  );
}
