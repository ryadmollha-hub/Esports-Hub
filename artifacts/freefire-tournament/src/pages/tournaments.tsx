import { useState, useEffect } from "react";
import { Search, Trophy, Plus, ChevronRight, RefreshCw } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import TournamentCard from "@/components/TournamentCard";
import { useListTournaments, getListTournamentsQueryKey } from "@workspace/api-client-react";
import { useAuthContext } from "@/lib/AuthContext";
import { Link, useLocation } from "wouter";

// ─── Category definitions ─────────────────────────────────────────────────────

const CATEGORIES = [
  {
    slug: "BR",
    label: "BR Match",
    sub: "Battle Royale · 48 players per lobby",
    icon: "🔥",
    color: "#ff6b00",
    typeKey: "BR",
    detail: "Large-scale battle — last squad standing wins the prize pool.",
  },
  {
    slug: "CS",
    label: "Clash Squad",
    sub: "CS Mode · 4v4 team battles",
    icon: "⚔️",
    color: "#00b4ff",
    typeKey: "CS",
    detail: "Round-based squad showdowns. Eliminate the enemy team to win.",
  },
  {
    slug: "SOLO",
    label: "Solo Survival",
    sub: "Every player for themselves · 12 slots",
    icon: "🎯",
    color: "#ffd700",
    typeKey: "SOLO",
    detail: "Pure skill — no teammates. Top performers share the prize.",
  },
  {
    slug: "LONE_WOLF",
    label: "Lone Wolf",
    sub: "1v1 elimination format · 12 slots",
    icon: "🐺",
    color: "#a855f7",
    typeKey: "LONE_WOLF",
    detail: "Head-to-head duels. Climb the bracket to claim the win.",
  },
  {
    slug: "FREE",
    label: "Free Match",
    sub: "Giveaways & open rooms · 20 slots",
    icon: "🎁",
    color: "#00ff88",
    typeKey: "FREE",
    detail: "No entry fee — open rooms, fun matches, and free giveaways.",
  },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TournamentsPage() {
  const [search, setSearch] = useState("");
  const [mode, setMode]     = useState("");
  const [status, setStatus] = useState("");
  const { user } = useAuthContext();
  const [, navigate] = useLocation();

  // Official tournaments
  const params = {
    ...(search && { search }),
    ...(mode   && { mode:   mode   as "solo" | "duo" | "squad" }),
    ...(status && { status: status as "upcoming" | "ongoing" | "completed" }),
  };
  const { data: tournamentsData, isLoading } = useListTournaments(params, {
    query: { queryKey: getListTournamentsQueryKey(params) },
  });
  const tournaments: any[] =
    (tournamentsData as any)?.tournaments ??
    (Array.isArray(tournamentsData) ? tournamentsData : []);

  // Match counts per category (lightweight — only counts, no rendering)
  const [countMap, setCountMap]     = useState<Record<string, number>>({});
  const [liveMap,  setLiveMap]      = useState<Record<string, number>>({});
  const [countLoading, setCountLoading] = useState(true);

  const fetchCounts = () => {
    setCountLoading(true);
    fetch("/api/user-matches")
      .then((r) => r.json())
      .then((d: any[]) => {
        const all = Array.isArray(d) ? d : [];
        const cm: Record<string, number> = {};
        const lm: Record<string, number> = {};
        for (const cat of CATEGORIES) {
          cm[cat.typeKey] = all.filter((m) => m.matchType === cat.typeKey).length;
          lm[cat.typeKey] = all.filter((m) => m.matchType === cat.typeKey && !!m.credentialsReleased).length;
        }
        setCountMap(cm);
        setLiveMap(lm);
      })
      .catch(() => {})
      .finally(() => setCountLoading(false));
  };

  useEffect(() => { fetchCounts(); }, []);

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 pt-16 pb-24">

        {/* ── Page header ── */}
        <div className="mt-4 mb-5">
          <h1
            className="text-2xl sm:text-3xl md:text-4xl font-black uppercase mb-1"
            data-testid="heading-tournaments"
          >
            All <span className="text-[#ff6b00]">Tournaments</span>
          </h1>
          <p className="text-[#a0a0b0] text-sm">
            Find and join the hottest Free Fire competitions
          </p>
        </div>

        {/* ── Filters ── */}
        <div className="flex flex-col sm:flex-row gap-2 mb-6">
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
          <div className="grid grid-cols-2 sm:flex gap-2">
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value)}
              data-testid="select-filter-mode"
              className="w-full px-3 py-2.5 bg-[#12121a] border border-[#2a2a36] rounded-xl text-white focus:outline-none focus:border-[#ff6b00] transition-colors text-sm"
            >
              <option value="">All Modes</option>
              <option value="solo">Solo</option>
              <option value="duo">Duo</option>
              <option value="squad">Squad</option>
            </select>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              data-testid="select-filter-status"
              className="w-full px-3 py-2.5 bg-[#12121a] border border-[#2a2a36] rounded-xl text-white focus:outline-none focus:border-[#ff6b00] transition-colors text-sm"
            >
              <option value="">All Status</option>
              <option value="upcoming">Upcoming</option>
              <option value="ongoing">Ongoing</option>
              <option value="completed">Completed</option>
            </select>
          </div>
        </div>

        {/* ── Official Tournaments ── */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-64 bg-[#12121a] rounded-2xl animate-pulse" data-testid={`skeleton-card-${i}`} />
            ))}
          </div>
        ) : tournaments.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-[#2a2a36] rounded-2xl">
            <Trophy className="w-10 h-10 mx-auto mb-3 text-[#ff6b00]/25" />
            <h3 className="text-base font-bold text-white mb-1">No tournaments found</h3>
            <p className="text-[#a0a0b0] text-sm">Try adjusting your filters or check back later</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {tournaments.map((t: any) => (
              <TournamentCard key={t.id} t={t} featured />
            ))}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* ── Community Matches — Category Dashboard ──                   */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <div className="mt-16 pt-8 border-t border-[#1a1a28]">

          {/* Section header + Create button */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#ff6b00]/10 border border-[#ff6b00]/20 text-[#ff6b00] text-[10px] font-black uppercase tracking-widest mb-3">
                <span className="w-1.5 h-1.5 rounded-full bg-[#ff6b00] animate-pulse" />
                Player Created
              </div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-black uppercase tracking-tight leading-tight">
                Community <span className="text-[#ff6b00]">Matches</span>
              </h2>
              <p className="text-[#a0a0b0] text-sm mt-2">
                Choose a format below to browse and join available rooms
              </p>
            </div>

            {/* Prominent Create button */}
            {user ? (
              <Link href="/my-matches">
                <button className="flex items-center gap-2 px-5 py-3 bg-[#ff6b00] hover:bg-[#e66000] text-white font-black uppercase text-sm rounded-xl transition-all shadow-[0_4px_20px_rgba(255,107,0,0.3)] hover:shadow-[0_6px_24px_rgba(255,107,0,0.4)] hover:-translate-y-0.5 active:translate-y-0 shrink-0">
                  <Plus className="w-4 h-4" />
                  Create a Match
                </button>
              </Link>
            ) : (
              <Link href="/sign-in">
                <button className="flex items-center gap-2 px-5 py-3 bg-[#1a1a24] hover:bg-[#2a2a36] border border-[#ff6b00]/30 hover:border-[#ff6b00]/60 text-[#ff6b00] font-black uppercase text-sm rounded-xl transition-all shrink-0">
                  <Plus className="w-4 h-4" />
                  Sign in to Create
                </button>
              </Link>
            )}
          </div>

          {/* ── Category panels grid ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {CATEGORIES.map((cat) => {
              const count = countMap[cat.typeKey] ?? 0;
              const live  = liveMap[cat.typeKey]  ?? 0;

              return (
                <button
                  key={cat.slug}
                  onClick={() => navigate(`/matches`)}
                  className="group relative w-full text-left bg-[#0e0e18] border border-[#1e1e2e] hover:border-[#2a2a3e] rounded-2xl overflow-hidden transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 focus:outline-none focus:ring-2 focus:ring-[#ff6b00]/40"
                >
                  {/* Left accent bar */}
                  <div
                    className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-2xl transition-all duration-200 group-hover:w-[4px]"
                    style={{ background: cat.color }}
                  />

                  {/* Subtle hover glow */}
                  <div
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-2xl pointer-events-none"
                    style={{ background: `radial-gradient(ellipse at 0% 50%, ${cat.color}09 0%, transparent 60%)` }}
                  />

                  <div className="relative pl-6 pr-4 py-4 flex items-center gap-4">
                    {/* Icon */}
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0 border transition-all duration-200 group-hover:scale-105"
                      style={{ background: `${cat.color}12`, borderColor: `${cat.color}20` }}
                    >
                      {cat.icon}
                    </div>

                    {/* Text */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-sm font-black uppercase tracking-tight text-white group-hover:text-white transition-colors">
                          {cat.label}
                        </span>
                        {live > 0 && (
                          <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase text-[#00ff88] bg-[#00ff88]/10 border border-[#00ff88]/25 px-1.5 py-0.5 rounded-full">
                            <span className="w-1 h-1 rounded-full bg-[#00ff88] animate-pulse" />
                            {live} LIVE
                          </span>
                        )}
                      </div>
                      <p className="text-[#606070] text-[11px] leading-snug">{cat.sub}</p>
                    </div>

                    {/* Count + arrow */}
                    <div className="shrink-0 flex flex-col items-end gap-1">
                      {countLoading ? (
                        <div className="w-6 h-4 bg-[#1a1a24] rounded animate-pulse" />
                      ) : (
                        <span
                          className="text-xs font-black"
                          style={{ color: count > 0 ? cat.color : "#3a3a46" }}
                        >
                          {count}
                        </span>
                      )}
                      <span className="text-[9px] text-[#3a3a46] uppercase font-bold">
                        {countLoading ? "" : count === 1 ? "match" : "matches"}
                      </span>
                    </div>

                    <ChevronRight
                      className="w-4 h-4 text-[#3a3a46] group-hover:text-[#606070] group-hover:translate-x-0.5 transition-all duration-200 shrink-0"
                    />
                  </div>

                  {/* Bottom rule: show detail text */}
                  <div className="mx-4 mb-3 pt-3 border-t border-[#1a1a28]">
                    <p className="text-[10px] text-[#3a3a46] group-hover:text-[#4a4a5a] transition-colors leading-snug">
                      {cat.detail}
                    </p>
                  </div>
                </button>
              );
            })}

            {/* Refresh tile */}
            <button
              onClick={fetchCounts}
              className="group w-full text-left bg-[#0a0a0f] border border-dashed border-[#1e1e2e] hover:border-[#2a2a36] rounded-2xl px-6 py-4 flex items-center justify-center gap-2 transition-all text-[#3a3a46] hover:text-[#606070]"
            >
              <RefreshCw className="w-4 h-4 group-hover:rotate-180 transition-transform duration-500" />
              <span className="text-xs font-bold uppercase">Refresh counts</span>
            </button>
          </div>

          {/* Footer hint */}
          <p className="text-center text-[#2a2a36] text-xs mt-6">
            Click any format above to see all available matches and join
          </p>
        </div>

      </div>
      <Footer />
    </div>
  );
}
