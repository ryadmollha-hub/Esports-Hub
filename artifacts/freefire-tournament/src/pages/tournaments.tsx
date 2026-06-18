import { useState, useEffect } from "react";
import { Search, Trophy, Swords } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import TournamentCard from "@/components/TournamentCard";
import { useListTournaments, getListTournamentsQueryKey } from "@workspace/api-client-react";
import { useAuthContext } from "@/lib/AuthContext";
import { Link } from "wouter";

const COMMUNITY_CATEGORIES = [
  { slug: "BR",        label: "BR Match",       sub: "Battle Royale — 48 players",      icon: "🔥", color: "#ff6b00", accentFrom: "#ff6b00", accentTo: "#ff2244", typeKey: "BR" },
  { slug: "CS",        label: "Clash Squad",    sub: "CS Mode · 4v4 team battles",       icon: "⚔️",  color: "#00b4ff", accentFrom: "#00b4ff", accentTo: "#0055ff", typeKey: "CS" },
  { slug: "SOLO",      label: "Solo Survival",  sub: "Every player for themselves",      icon: "🎯", color: "#ffd700", accentFrom: "#ffd700", accentTo: "#ff9500", typeKey: "SOLO" },
  { slug: "LONE_WOLF", label: "Lone Wolf",      sub: "1v1 elimination format",           icon: "🐺", color: "#a855f7", accentFrom: "#a855f7", accentTo: "#6366f1", typeKey: "LONE_WOLF" },
  { slug: "FREE",      label: "Free Match",     sub: "Giveaways & open rooms",           icon: "🎁", color: "#00ff88", accentFrom: "#00ff88", accentTo: "#00b4ff", typeKey: "FREE" },
];

export default function TournamentsPage() {
  const [search, setSearch] = useState("");
  const [mode, setMode] = useState("");
  const [status, setStatus] = useState("");
  const { user } = useAuthContext();

  const params = {
    ...(search && { search }),
    ...(mode && { mode: mode as "solo" | "duo" | "squad" }),
    ...(status && { status: status as "upcoming" | "ongoing" | "completed" }),
  };
  const { data: tournamentsData, isLoading } = useListTournaments(params, {
    query: { queryKey: getListTournamentsQueryKey(params) },
  });
  const tournaments: any[] = (tournamentsData as any)?.tournaments ?? (Array.isArray(tournamentsData) ? tournamentsData : []);

  const [communityMatches, setCommunityMatches] = useState<any[]>([]);
  const [communityLoading, setCommunityLoading] = useState(true);

  const fetchCommunity = () => {
    setCommunityLoading(true);
    fetch("/api/user-matches")
      .then((r) => r.json())
      .then((d) => setCommunityMatches(Array.isArray(d) ? d : []))
      .catch(() => setCommunityMatches([]))
      .finally(() => setCommunityLoading(false));
  };

  useEffect(() => { fetchCommunity(); }, []);

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 pt-16 pb-24">

        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-5 mt-4">
          <div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black uppercase mb-1" data-testid="heading-tournaments">
              All <span className="text-[#ff6b00]">Tournaments</span>
            </h1>
            <p className="text-[#a0a0b0] text-sm">Find and join the hottest Free Fire competitions</p>
          </div>
        </div>

        {/* Filters */}
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
          <div className="grid grid-cols-2 sm:flex gap-2">
            <select value={mode} onChange={(e) => setMode(e.target.value)}
              data-testid="select-filter-mode"
              className="w-full px-3 py-2.5 bg-[#12121a] border border-[#2a2a36] rounded-xl text-white focus:outline-none focus:border-[#ff6b00] transition-colors text-sm">
              <option value="">All Modes</option>
              <option value="solo">Solo</option>
              <option value="duo">Duo</option>
              <option value="squad">Squad</option>
            </select>
            <select value={status} onChange={(e) => setStatus(e.target.value)}
              data-testid="select-filter-status"
              className="w-full px-3 py-2.5 bg-[#12121a] border border-[#2a2a36] rounded-xl text-white focus:outline-none focus:border-[#ff6b00] transition-colors text-sm">
              <option value="">All Status</option>
              <option value="upcoming">Upcoming</option>
              <option value="ongoing">Ongoing</option>
              <option value="completed">Completed</option>
            </select>
          </div>
        </div>

        {/* Official Tournaments */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {[1,2,3,4].map((i) => (
              <div key={i} className="h-64 bg-[#12121a] rounded-2xl animate-pulse" data-testid={`skeleton-card-${i}`} />
            ))}
          </div>
        ) : tournaments.length === 0 ? (
          <div className="text-center py-16">
            <Trophy className="w-12 h-12 mx-auto mb-3 text-[#ff6b00]/30" />
            <h3 className="text-lg font-bold text-white mb-1">No tournaments found</h3>
            <p className="text-[#a0a0b0] text-sm">Try adjusting your filters or check back later</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {tournaments.map((t: any) => <TournamentCard key={t.id} t={t} featured />)}
          </div>
        )}

        {/* ── Community Match Categories ── */}
        <div className="mt-20 pt-4 border-t border-[#1a1a28]">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight">
                Community <span className="text-[#ff6b00]">Matches</span>
              </h2>
              <p className="text-[#a0a0b0] text-sm mt-1">
                Choose a match format to browse available rooms
                {user && (
                  <Link href="/my-matches" className="ml-3 text-[#ff6b00] hover:underline font-bold">
                    + Create a Match
                  </Link>
                )}
              </p>
            </div>
            <button
              onClick={fetchCommunity}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#12121a] border border-[#2a2a36] text-[#606070] hover:text-[#a0a0b0] hover:border-[#3a3a46] transition-colors text-xs font-bold uppercase"
            >
              <Search className="w-3.5 h-3.5" /> Refresh
            </button>
          </div>

          {communityLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1,2,3,4,5].map((i) => <div key={i} className="h-40 bg-[#12121a] rounded-2xl animate-pulse" />)}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {COMMUNITY_CATEGORIES.map((cat) => {
                const count = communityMatches.filter((m: any) => m.matchType === cat.typeKey).length;
                const liveCount = communityMatches.filter((m: any) => m.matchType === cat.typeKey && !!m.credentialsReleased).length;
                return (
                  <Link key={cat.slug} href={`/matches/${cat.slug}`}>
                    <div
                      className="relative rounded-2xl overflow-hidden border cursor-pointer group transition-all duration-200 hover:scale-[1.015] active:scale-[0.99]"
                      style={{
                        background: `linear-gradient(135deg, ${cat.accentFrom}12 0%, ${cat.accentTo}06 100%)`,
                        borderColor: `${cat.color}22`,
                      }}
                    >
                      {/* Dot pattern */}
                      <div className="absolute inset-0 opacity-[0.04]"
                        style={{ backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)", backgroundSize: "20px 20px" }} />
                      {/* Hover ring */}
                      <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                        style={{ boxShadow: `inset 0 0 0 1px ${cat.color}55` }} />

                      <div className="relative p-5">
                        <div className="flex items-start justify-between mb-3">
                          <div className="text-4xl leading-none">{cat.icon}</div>
                          {liveCount > 0 && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase text-[#00ff88] bg-[#00ff88]/10 border border-[#00ff88]/30 px-2 py-0.5 rounded-full">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#00ff88] animate-pulse" /> {liveCount} LIVE
                            </span>
                          )}
                        </div>
                        <h3 className="text-lg font-black uppercase tracking-tight" style={{ color: cat.color }}>{cat.label}</h3>
                        <p className="text-[#606070] text-xs mt-0.5 mb-3">{cat.sub}</p>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-[#a0a0b0]">
                            {count === 0 ? "No matches yet" : `${count} match${count !== 1 ? "es" : ""} available`}
                          </span>
                          <span className="text-sm font-black transition-transform duration-200 group-hover:translate-x-1" style={{ color: cat.color }}>→</span>
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}

          {/* Quick links row */}
          <div className="mt-6 flex items-center justify-center gap-4">
            <Swords className="w-4 h-4 text-[#3a3a46]" />
            <span className="text-[#3a3a46] text-xs">Click any category above to see matches and join</span>
            <Swords className="w-4 h-4 text-[#3a3a46]" />
          </div>
        </div>

      </div>
      <Footer />
    </div>
  );
}
