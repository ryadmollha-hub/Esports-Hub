import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Trophy, ChevronRight, RefreshCw } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

// ─── Shared category definitions (exported for use in category pages) ─────────

export const TOURNAMENT_CATEGORIES = [
  {
    slug:     "all",
    href:     "/tournaments/all",
    label:    "All Tournaments",
    icon:     "🏆",
    color:    "#ff6b00",
    desc:     "Browse every official competition in one place",
    gameMode: null as string | null,
  },
  {
    slug:     "br",
    href:     "/tournaments/br",
    label:    "BR Tournament",
    icon:     "🔥",
    color:    "#ff6b00",
    desc:     "Battle Royale — last squad standing wins",
    gameMode: "BR",
  },
  {
    slug:     "cs",
    href:     "/tournaments/cs",
    label:    "Clash Squad Tournament",
    icon:     "⚔️",
    color:    "#00b4ff",
    desc:     "Round-based 4v4 squad showdowns",
    gameMode: "CS",
  },
  {
    slug:     "solo",
    href:     "/tournaments/solo",
    label:    "Solo Tournament",
    icon:     "🎯",
    color:    "#ffd700",
    desc:     "Pure skill — no teammates, top performers win",
    gameMode: "SOLO",
  },
  {
    slug:     "lonewolf",
    href:     "/tournaments/lonewolf",
    label:    "Lone Wolf Tournament",
    icon:     "🐺",
    color:    "#a855f7",
    desc:     "Head-to-head 1v1 elimination duels",
    gameMode: "LONE_WOLF",
  },
  {
    slug:     "free",
    href:     "/tournaments/free",
    label:    "Free Match Tournament",
    icon:     "🎁",
    color:    "#00ff88",
    desc:     "No entry fee — open rooms and free giveaways",
    gameMode: "FREE",
  },
];

// ─── Hub Page ─────────────────────────────────────────────────────────────────

export default function TournamentsPage() {
  const [counts, setCounts]   = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  const fetchCounts = () => {
    setLoading(true);
    fetch("/api/tournaments?limit=200")
      .then((r) => r.json())
      .then((d: any) => {
        const all: any[] = d?.tournaments ?? (Array.isArray(d) ? d : []);
        const map: Record<string, number> = { all: all.length };
        for (const cat of TOURNAMENT_CATEGORIES) {
          if (cat.gameMode) {
            map[cat.slug] = all.filter((t: any) => t.gameMode === cat.gameMode).length;
          }
        }
        setCounts(map);
      })
      .catch(() => setCounts({}))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchCounts(); }, []);

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
            Select a category to view available tournaments
          </p>
        </div>

        {/* ── Category cards ── */}
        <div className="flex flex-col gap-3">
          {TOURNAMENT_CATEGORIES.map((cat) => {
            const count = counts[cat.slug] ?? 0;

            return (
              <CategoryCard
                key={cat.slug}
                cat={cat}
                count={count}
                loading={loading}
              />
            );
          })}
        </div>

        {/* Refresh */}
        <div className="flex justify-center mt-6">
          <button
            onClick={fetchCounts}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#0e0e18] border border-[#1e1e2e] hover:border-[#2a2a36] rounded-xl text-[#606070] hover:text-[#a0a0b0] transition-all text-xs font-bold uppercase"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh Counts
          </button>
        </div>

      </div>
      <Footer />
    </div>
  );
}

// ─── Category Card (standalone to avoid nested-<a> issues) ────────────────────

function CategoryCard({
  cat, count, loading,
}: {
  cat: (typeof TOURNAMENT_CATEGORIES)[number];
  count: number;
  loading: boolean;
}) {
  return (
    <Link
      href={cat.href}
      className="relative block w-full rounded-[18px] overflow-hidden transition-all duration-200 active:scale-[0.985] focus:outline-none"
      style={{
        minHeight: "100px",
        background: "#0e0e18",
        border: "1.5px solid #1e1e2e",
        textDecoration: "none",
      }}
      onMouseEnter={(e: React.MouseEvent<HTMLAnchorElement>) => {
        const el = e.currentTarget;
        el.style.borderColor = `${cat.color}40`;
        el.style.boxShadow = `0 6px 28px ${cat.color}12`;
        el.style.background = `linear-gradient(135deg, ${cat.color}10 0%, #0e0e18 60%)`;
      }}
      onMouseLeave={(e: React.MouseEvent<HTMLAnchorElement>) => {
        const el = e.currentTarget;
        el.style.borderColor = "#1e1e2e";
        el.style.boxShadow = "none";
        el.style.background = "#0e0e18";
      }}
    >
      {/* Left color accent bar */}
      <div
        className="absolute left-0 top-0 bottom-0 rounded-l-[18px]"
        style={{ width: "3px", background: `${cat.color}60` }}
      />

      <div className="relative flex items-center gap-4 pl-6 pr-4 py-5">
        {/* Large icon */}
        <div
          className="flex items-center justify-center shrink-0 rounded-2xl"
          style={{
            width: "52px",
            height: "52px",
            fontSize: "28px",
            background: `${cat.color}12`,
            border: `1px solid ${cat.color}22`,
          }}
        >
          {cat.icon}
        </div>

        {/* Title + description */}
        <div className="flex-1 min-w-0">
          <p className="font-black uppercase text-sm sm:text-base leading-tight tracking-tight mb-1 text-white">
            {cat.label}
          </p>
          <p className="text-[#606070] text-[11px] sm:text-xs leading-snug">
            {cat.desc}
          </p>
        </div>

        {/* Count + chevron */}
        <div className="shrink-0 flex flex-col items-end gap-0.5 pl-2">
          {loading ? (
            <div className="w-7 h-6 bg-[#1a1a24] rounded animate-pulse" />
          ) : (
            <span
              className="text-2xl font-black leading-none"
              style={{ color: count > 0 ? cat.color : "#2a2a36" }}
            >
              {count}
            </span>
          )}
          <span className="text-[9px] text-[#3a3a46] uppercase font-bold tracking-wider">
            {loading ? "" : count === 1 ? "match" : "matches"}
          </span>
          <ChevronRight className="w-3.5 h-3.5 mt-1 text-[#3a3a46]" />
        </div>
      </div>
    </Link>
  );
}
