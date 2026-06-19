import { useState } from "react";
import { Search, Trophy, RefreshCw } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import TournamentCard from "@/components/TournamentCard";
import { useListTournaments, getListTournamentsQueryKey } from "@workspace/api-client-react";

// ─── Category tab definitions ─────────────────────────────────────────────────

const GAME_MODE_TABS = [
  { key: "all",       label: "All Tournaments",      icon: "🏆", color: "#ff6b00" },
  { key: "BR",        label: "BR Tournament",         icon: "🔥", color: "#ff6b00" },
  { key: "CS",        label: "Clash Squad",           icon: "⚔️", color: "#00b4ff" },
  { key: "SOLO",      label: "Solo Tournament",       icon: "🎯", color: "#ffd700" },
  { key: "LONE_WOLF", label: "Lone Wolf",             icon: "🐺", color: "#a855f7" },
  { key: "FREE",      label: "Free Match",            icon: "🎁", color: "#00ff88" },
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

  // Client-side filter by gameMode tab
  const filtered =
    activeTab === "all"
      ? all
      : all.filter((t: any) => t.gameMode === activeTab);

  const activeTabMeta = GAME_MODE_TABS.find((m) => m.key === activeTab)!;

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 pt-16 pb-24">

        {/* ── Page header ── */}
        <div className="mt-4 mb-6">
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

        {/* ── Category tabs (sticky) ── */}
        <div className="sticky top-0 z-20 bg-[#0a0a0f] -mx-4 px-4 pt-1 pb-3 border-b border-[#12121a] mb-5">
          <div className="flex gap-2 overflow-x-auto scrollbar-none">
            {GAME_MODE_TABS.map((tab) => (
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
              </button>
            ))}
          </div>
        </div>

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

        {/* ── Result count ── */}
        {!isLoading && (
          <p className="text-[#4a4a5a] text-xs mb-4">
            {filtered.length} {filtered.length === 1 ? "tournament" : "tournaments"}
            {activeTab !== "all" && ` · ${activeTabMeta.label}`}
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
            <div className="text-5xl mb-4 opacity-20">{activeTabMeta.icon}</div>
            <h3 className="text-base font-bold text-white mb-1">
              {activeTab === "all"
                ? "No tournaments found"
                : `No ${activeTabMeta.label} tournaments yet`}
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
