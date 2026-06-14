import { Link } from "wouter";
import { Users, Trophy, Clock, ChevronRight } from "lucide-react";
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
  bannerUrl?: string | null;
  countdownTo?: string | null;
}

const modeColors: Record<string, string> = {
  solo: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  duo: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  squad: "bg-[#ff6b00]/20 text-[#ff6b00] border-[#ff6b00]/30",
};

const statusColors: Record<string, string> = {
  upcoming: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  ongoing: "bg-green-500/20 text-green-400 border-green-500/30",
  completed: "bg-gray-500/20 text-gray-400 border-gray-500/30",
  cancelled: "bg-red-500/20 text-red-400 border-red-500/30",
};

export default function TournamentCard({ t }: { t: Tournament }) {
  const slotPct = Math.min((t.filledSlots / t.maxSlots) * 100, 100);
  const slotsLeft = t.maxSlots - t.filledSlots;

  return (
    <Link
      href={`/tournaments/${t.id}`}
      data-testid={`card-tournament-${t.id}`}
      className="group block rounded-xl border border-[#ff6b00]/20 bg-[#12121a] hover:border-[#ff6b00]/50 hover:shadow-[0_0_20px_rgba(255,107,0,0.1)] transition-all overflow-hidden"
    >
      <div className="relative h-40 bg-gradient-to-br from-[#1a1a24] to-[#0a0a0f] overflow-hidden">
        {t.bannerUrl ? (
          <img
            src={t.bannerUrl}
            alt={t.name}
            className="w-full h-full object-cover opacity-60 group-hover:opacity-80 group-hover:scale-105 transition-all duration-500"
            data-testid={`img-tournament-banner-${t.id}`}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Trophy className="w-16 h-16 text-[#ff6b00]/20" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#12121a] to-transparent" />
        <div className="absolute top-3 left-3 flex gap-2">
          <span className={`text-xs font-bold px-2 py-0.5 rounded border uppercase ${modeColors[t.mode] ?? modeColors.squad}`} data-testid={`badge-mode-${t.id}`}>
            {t.mode}
          </span>
          <span className={`text-xs font-bold px-2 py-0.5 rounded border uppercase flex items-center gap-1 ${statusColors[t.status] ?? statusColors.upcoming}`} data-testid={`badge-status-${t.id}`}>
            {t.status === "ongoing" && <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />}
            {t.status}
          </span>
        </div>
      </div>

      <div className="p-4">
        <h3 className="text-white font-bold text-base mb-1 truncate group-hover:text-[#ff6b00] transition-colors" data-testid={`text-tournament-name-${t.id}`}>
          {t.name}
        </h3>

        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1 text-[#ffd700]">
            <Trophy className="w-4 h-4" />
            <span className="text-sm font-bold" data-testid={`text-prize-${t.id}`}>
              ৳{Number(t.prizePool).toLocaleString()}
            </span>
          </div>
          <div className="text-[#a0a0b0] text-xs">
            Entry: <span className="text-white font-medium">৳{Number(t.entryFee)}</span>
          </div>
        </div>

        <div className="mb-3">
          <div className="flex justify-between text-xs text-[#a0a0b0] mb-1">
            <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {t.filledSlots}/{t.maxSlots} slots</span>
            <span data-testid={`text-slots-left-${t.id}`}>{slotsLeft} left</span>
          </div>
          <div className="h-1.5 bg-[#1a1a24] rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#ff6b00] to-[#ffd700] rounded-full transition-all"
              style={{ width: `${slotPct}%` }}
              data-testid={`bar-slots-${t.id}`}
            />
          </div>
        </div>

        <div className="flex items-center justify-between">
          {t.status === "upcoming" && t.countdownTo ? (
            <CountdownTimer targetDate={t.countdownTo} />
          ) : (
            <div className="flex items-center gap-1 text-[#a0a0b0] text-xs">
              <Clock className="w-3 h-3" />
              {new Date(t.startDate).toLocaleDateString()}
            </div>
          )}
          <ChevronRight className="w-4 h-4 text-[#ff6b00] group-hover:translate-x-1 transition-transform" />
        </div>
      </div>
    </Link>
  );
}
