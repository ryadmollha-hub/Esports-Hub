import { useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, Search, RefreshCw, Trophy } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import TournamentCard from "@/components/TournamentCard";
import { useListTournaments, getListTournamentsQueryKey } from "@workspace/api-client-react";
import { TOURNAMENT_CATEGORIES } from "@/pages/tournaments";

// ─── Category Tournament Page ─────────────────────────────────────────────────
// Renders a dedicated page for one tournament category (or "all").
// Props:
//   gameMode — "BR" | "CS" | "SOLO" | "LONE_WOLF" | "FREE" | null (all)
//   slug     — "br" | "cs" | "solo" | "lonewolf" | "free" | "all"

interface Props {
  gameMode: string | null;
  slug: string;
}

export default function TournamentCategoryPage({ gameMode, slug }: Props) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");

  const meta = TOURNAMENT_CATEGORIES.find((c) => c.slug === slug)
    ?? TOURNAMENT_CATEGORIES[0];

  const params = {
    ...(search && { search }),
    ...(status && { status: status as "upcoming" | "ongoing" | "completed" }),
    ...(gameMode && { gameMode }),
  };
  const { data, isLoading, refetch } = useListTournaments(params, {
    query: { queryKey: getListTournamentsQueryKey(params) },
  });
  const all: any[] =
    (data as any)?.tournaments ?? (Array.isArray(data) ? data : []);

  // Filter by gameMode if this is not the "all" page
  const tournaments =
    gameMode == null
      ? all
      : all.filter((t: any) => t.gameMode === gameMode);

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 pt-16 pb-28">

        {/* ── Back button ── */}
        <div className="mt-4 mb-5">
          <Link
            href="/tournaments"
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#0e0e18] border border-[#1e1e2e] hover:border-[#2a2a36] rounded-xl text-[#a0a0b0] hover:text-white transition-all text-xs font-black uppercase"
            style={{ textDecoration: "none" }}
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            All Categories
          </Link>
        </div>

        {/* ── Category header ── */}
        <div className="mb-7">
          {/* Category badge */}
          <div
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest mb-3 border"
            style={{
              background: `${meta.color}12`,
              borderColor: `${meta.color}30`,
              color: meta.color,
            }}
          >
            <Trophy className="w-3 h-3" />
            Official · Admin Curated
          </div>

          <div className="flex items-center gap-4 mb-2">
            {/* Icon */}
            <div
              className="flex items-center justify-center rounded-2xl shrink-0"
              style={{
                width: "56px",
                height: "56px",
                fontSize: "30px",
                background: `${meta.color}12`,
                border: `1.5px solid ${meta.color}25`,
              }}
            >
              {meta.icon}
            </div>
            <div>
              <h1
                className="text-2xl sm:text-3xl md:text-4xl font-black uppercase leading-tight"
                data-testid="heading-tournaments"
              >
                <span style={{ color: meta.color }}>{meta.label}</span>
              </h1>
              <p className="text-[#606070] text-sm mt-0.5">{meta.desc}</p>
            </div>
          </div>

          {/* Accent rule */}
          <div
            className="h-px mt-4"
            style={{ background: `linear-gradient(90deg, ${meta.color}40, transparent)` }}
          />
        </div>

        {/* ── Search + Status + Refresh ── */}
        <div className="flex flex-col sm:flex-row gap-2 mb-5">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#a0a0b0]" />
            <input
              type="text"
              placeholder={`Search ${meta.label.toLowerCase()}s…`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              data-testid="input-search-tournaments"
              className="w-full pl-9 pr-3 py-2.5 bg-[#12121a] border border-[#2a2a36] rounded-xl text-white placeholder-[#a0a0b0] focus:outline-none transition-colors text-sm"
              style={{ outlineColor: meta.color }}
              onFocus={(e) => (e.target.style.borderColor = meta.color)}
              onBlur={(e) => (e.target.style.borderColor = "#2a2a36")}
            />
          </div>
          <div className="flex gap-2">
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              data-testid="select-filter-status"
              className="px-3 py-2.5 bg-[#12121a] border border-[#2a2a36] rounded-xl text-white focus:outline-none transition-colors text-sm"
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
            {tournaments.length}{" "}
            {tournaments.length === 1 ? "tournament" : "tournaments"}
            {gameMode && (
              <span style={{ color: meta.color }}> · {meta.label}</span>
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
        ) : tournaments.length === 0 ? (
          <div
            className="text-center py-16 border border-dashed rounded-2xl"
            style={{ borderColor: `${meta.color}25` }}
          >
            <div className="text-5xl mb-4 opacity-20">{meta.icon}</div>
            <h3 className="text-base font-bold text-white mb-1">
              No {meta.label}s yet
            </h3>
            <p className="text-[#606070] text-sm">
              Check back soon — new tournaments are added regularly
            </p>
            <Link
              href="/tournaments"
              className="inline-flex items-center gap-1.5 mt-5 text-xs font-black uppercase px-4 py-2 rounded-xl border transition-all"
              style={{
                color: meta.color,
                borderColor: `${meta.color}30`,
                background: `${meta.color}08`,
                textDecoration: "none",
              }}
            >
              <ArrowLeft className="w-3 h-3" /> Back to Categories
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {tournaments.map((t: any) => (
              <TournamentCard key={t.id} t={t} featured from={slug} />
            ))}
          </div>
        )}

      </div>
      <Footer />
    </div>
  );
}
