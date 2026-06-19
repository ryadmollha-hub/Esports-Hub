import { useState } from "react";
import { Search, Trophy, RefreshCw, ChevronRight } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import TournamentCard from "@/components/TournamentCard";
import { useListTournaments, getListTournamentsQueryKey } from "@workspace/api-client-react";

// ─── Category definitions ─────────────────────────────────────────────────────

const CATEGORIES = [
  {
    key:   "all",
    label: "All Tournaments",
    icon:  "🏆",
    color: "#ff6b00",
    desc:  "Browse every official competition in one place",
  },
  {
    key:   "BR",
    label: "BR Tournament",
    icon:  "🔥",
    color: "#ff6b00",
    desc:  "Battle Royale — last squad standing wins",
  },
  {
    key:   "CS",
    label: "Clash Squad Tournament",
    icon:  "⚔️",
    color: "#00b4ff",
    desc:  "Round-based 4v4 squad showdowns",
  },
  {
    key:   "SOLO",
    label: "Solo Tournament",
    icon:  "🎯",
    color: "#ffd700",
    desc:  "Pure skill — no teammates, top performers win",
  },
  {
    key:   "LONE_WOLF",
    label: "Lone Wolf Tournament",
    icon:  "🐺",
    color: "#a855f7",
    desc:  "Head-to-head 1v1 elimination duels",
  },
  {
    key:   "FREE",
    label: "Free Match Tournament",
    icon:  "🎁",
    color: "#00ff88",
    desc:  "No entry fee — open rooms and free giveaways",
  },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TournamentsPage() {
  const [activeTab, setActiveTab] = useState("all");
  const [search, setSearch]       = useState("");
  const [status, setStatus]       = useState("");

  const params = {
    ...(search && { search }),
    ...(status && { status: status as "upcoming" | "ongoing" | "completed" }),
  };
  const { data, isLoading, refetch } = useListTournaments(params, {
    query: { queryKey: getListTournamentsQueryKey(params) },
  });
  const all: any[] =
    (data as any)?.tournaments ?? (Array.isArray(data) ? data : []);

  // Client-side filter by gameMode tab — logic unchanged
  const filtered =
    activeTab === "all"
      ? all
      : all.filter((t: any) => t.gameMode === activeTab);

  const activeMeta = CATEGORIES.find((c) => c.key === activeTab)!;

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 pt-16 pb-28">

        {/* ── Page header ── */}
        <div className="mt-4 mb-7">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#ff6b00]/10 border border-[#ff6b00]/20 text-[#ff6b00] text-[10px] font-black uppercase tracking-widest mb-3">
            <Trophy className="w-3 h-3" />
            Official · Admin Curated
          </div>
          <h1
            className="text-2xl sm:text-3xl md:text-4xl font-black uppercase mb-1"
            data-testid="heading-tournaments"
          >
            All <span className="text-[#ff6b00]">Tournaments</span>
          </h1>
          <p className="text-[#a0a0b0] text-sm">
            Official Free Fire competitions organised by FF Arena admins
          </p>
        </div>

        {/* ── Category cards ── */}
        <div className="flex flex-col gap-3 mb-7">
          {CATEGORIES.map((cat) => {
            const count =
              cat.key === "all"
                ? all.length
                : all.filter((t: any) => t.gameMode === cat.key).length;
            const isActive = activeTab === cat.key;

            return (
              <button
                key={cat.key}
                onClick={() => setActiveTab(cat.key)}
                className="relative w-full text-left rounded-[18px] overflow-hidden transition-all duration-200 active:scale-[0.985] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6b00]/50"
                style={{
                  minHeight: "100px",
                  background: isActive
                    ? `linear-gradient(135deg, ${cat.color}1a 0%, #0e0e18 55%)`
                    : "#0e0e18",
                  border: `1.5px solid ${isActive ? cat.color + "55" : "#1e1e2e"}`,
                  boxShadow: isActive
                    ? `0 6px 28px ${cat.color}18, inset 0 0 0 1px ${cat.color}20`
                    : "none",
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    (e.currentTarget as HTMLElement).style.borderColor = `${cat.color}35`;
                    (e.currentTarget as HTMLElement).style.boxShadow = `0 4px 20px ${cat.color}10`;
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    (e.currentTarget as HTMLElement).style.borderColor = "#1e1e2e";
                    (e.currentTarget as HTMLElement).style.boxShadow = "none";
                  }
                }}
              >
                {/* Left color accent bar */}
                <div
                  className="absolute left-0 top-0 bottom-0 transition-all duration-200"
                  style={{
                    width: isActive ? "4px" : "3px",
                    background: isActive ? cat.color : `${cat.color}50`,
                    borderRadius: "18px 0 0 18px",
                  }}
                />

                {/* Subtle radial glow on active */}
                {isActive && (
                  <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      background: `radial-gradient(ellipse at 0% 50%, ${cat.color}12 0%, transparent 55%)`,
                    }}
                  />
                )}

                <div className="relative flex items-center gap-4 pl-6 pr-4 py-5">
                  {/* Large icon */}
                  <div
                    className="flex items-center justify-center shrink-0 rounded-2xl transition-transform duration-200"
                    style={{
                      width: "52px",
                      height: "52px",
                      fontSize: "28px",
                      background: `${cat.color}12`,
                      border: `1px solid ${cat.color}20`,
                      transform: isActive ? "scale(1.05)" : "scale(1)",
                    }}
                  >
                    {cat.icon}
                  </div>

                  {/* Title + description */}
                  <div className="flex-1 min-w-0">
                    <p
                      className="font-black uppercase text-sm sm:text-base leading-tight tracking-tight mb-1 transition-colors"
                      style={{ color: isActive ? cat.color : "#ffffff" }}
                    >
                      {cat.label}
                    </p>
                    <p className="text-[#606070] text-[11px] sm:text-xs leading-snug">
                      {cat.desc}
                    </p>
                  </div>

                  {/* Count + chevron */}
                  <div className="shrink-0 flex flex-col items-end gap-0.5">
                    <span
                      className="text-2xl font-black leading-none"
                      style={{ color: count > 0 ? cat.color : "#2a2a36" }}
                    >
                      {isLoading ? (
                        <span className="inline-block w-6 h-5 bg-[#1a1a24] rounded animate-pulse" />
                      ) : (
                        count
                      )}
                    </span>
                    <span className="text-[9px] text-[#3a3a46] uppercase font-bold tracking-wider">
                      {isLoading ? "" : count === 1 ? "match" : "matches"}
                    </span>
                    <ChevronRight
                      className="w-3.5 h-3.5 mt-1 transition-all duration-200"
                      style={{
                        color: isActive ? cat.color : "#3a3a46",
                        transform: isActive ? "translateX(2px)" : "none",
                      }}
                    />
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* ── Divider ── */}
        <div
          className="h-px mb-6"
          style={{
            background: `linear-gradient(90deg, ${activeMeta.color}30, transparent)`,
          }}
        />

        {/* ── Search + Status + Refresh ── */}
        <div className="flex flex-col sm:flex-row gap-2 mb-5">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#a0a0b0]" />
            <input
              type="text"
              placeholder="Search tournaments..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              data-testid="input-search-tournaments"
              className="w-full pl-9 pr-3 py-2.5 bg-[#12121a] border border-[#2a2a36] rounded-xl text-white placeholder-[#a0a0b0] focus:outline-none focus:border-[#ff6b00] transition-colors text-sm"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              data-testid="select-filter-status"
              className="px-3 py-2.5 bg-[#12121a] border border-[#2a2a36] rounded-xl text-white focus:outline-none focus:border-[#ff6b00] transition-colors text-sm"
            >
              <option value="">All Status</option>
              <option value="upcoming">Upcoming</option>
              <option value="live">Live</option>
              <option value="ended">Ended</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <button
              onClick={() => refetch()}
              title="Refresh"
              className="px-3 py-2.5 bg-[#12121a] border border-[#2a2a36] hover:border-[#3a3a46] rounded-xl text-[#a0a0b0] hover:text-white transition-all"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ── Result count label ── */}
        {!isLoading && (
          <p className="text-[#4a4a5a] text-xs mb-4">
            {filtered.length} {filtered.length === 1 ? "tournament" : "tournaments"}
            {activeTab !== "all" && (
              <span style={{ color: activeMeta.color }}> · {activeMeta.label}</span>
            )}
          </p>
        )}

        {/* ── Tournament grid ── */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-64 bg-[#12121a] rounded-2xl animate-pulse"
                data-testid={`skeleton-card-${i}`}
              />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-[#2a2a36] rounded-2xl">
            <div className="text-5xl mb-4 opacity-20">{activeMeta.icon}</div>
            <h3 className="text-base font-bold text-white mb-1">
              {activeTab === "all"
                ? "No tournaments found"
                : `No ${activeMeta.label}s yet`}
            </h3>
            <p className="text-[#606070] text-sm">
              {activeTab === "all"
                ? "Try adjusting your filters or check back later"
                : "Check back soon — new tournaments are added regularly"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {filtered.map((t: any) => (
              <TournamentCard key={t.id} t={t} featured />
            ))}
          </div>
        )}

      </div>
      <Footer />
    </div>
  );
}
