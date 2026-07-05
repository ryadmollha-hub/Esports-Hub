import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Trophy, ChevronRight, RefreshCw, Swords, Users, Zap } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CountdownTimer from "@/components/CountdownTimer";
import { apiBase } from "@/lib/apiBase";

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

const TYPE_COLOR: Record<string, string> = {
  BR: "#ff6b00", CS: "#00b4ff", SOLO: "#ffd700",
  LONE_WOLF: "#a855f7", FREE: "#00ff88",
};
const TYPE_ICON: Record<string, string> = {
  BR: "🔥", CS: "⚔️", SOLO: "🎯", LONE_WOLF: "🐺", FREE: "🎁",
};

function fmtTime(dt: string | null) {
  if (!dt) return null;
  return new Date(dt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: true });
}

// ─── Hub Page ─────────────────────────────────────────────────────────────────

export default function TournamentsPage() {
  const [counts, setCounts]   = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  const [communityMatches, setCommunityMatches] = useState<any[]>([]);
  const [cmLoading, setCmLoading] = useState(true);

  const fetchCounts = () => {
    setLoading(true);
    fetch(`${apiBase}/api/tournaments?limit=200`)
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

  const fetchCommunity = () => {
    setCmLoading(true);
    fetch(`${apiBase}/api/user-matches`)
      .then((r) => r.json())
      .then((d: any) => {
        const all = Array.isArray(d) ? d : [];
        const live = all.filter((m: any) => m.effectiveStatus === "active");
        const waiting = all.filter((m: any) => m.effectiveStatus === "waiting" || m.effectiveStatus === "approved");
        setCommunityMatches([...live, ...waiting].slice(0, 4));
      })
      .catch(() => setCommunityMatches([]))
      .finally(() => setCmLoading(false));
  };

  useEffect(() => { fetchCounts(); fetchCommunity(); }, []);

  return (
    <div className="min-h-screen bg-[#080c14] text-white">
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 pt-14 pb-28">

        {/* ── Page header ── */}
        <div className="mt-3 mb-5">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#ff4500]/10 border border-[#ff4500]/20 text-[#ff4500] text-[9px] font-black uppercase tracking-widest mb-2">
            <Trophy className="w-2.5 h-2.5" />
            Official · Admin Curated
          </div>
          <h1
            className="text-xl sm:text-2xl md:text-3xl font-black uppercase mb-1"
            data-testid="heading-tournaments"
          >
            All <span className="text-[#ff4500]">Tournaments</span>
          </h1>
          <p className="text-[#8890a8] text-xs">
            Select a category to view available tournaments
          </p>
        </div>

        {/* ── Category cards ── */}
        <div className="flex flex-col gap-2">
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
        <div className="flex justify-center mt-4">
          <button
            onClick={() => { fetchCounts(); fetchCommunity(); }}
            className="flex items-center gap-1.5 px-3 py-2 bg-[#0d1120] border border-[#1e2238] hover:border-[#2a2a46] rounded-xl text-[#606070] hover:text-[#8890a8] transition-all text-xs font-bold uppercase"
          >
            <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        {/* ── Community Matches preview ── */}
        <div className="mt-8">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="flex items-center gap-1.5 mb-0.5">
                <Swords className="w-3.5 h-3.5 text-[#00b4ff]" />
                <span className="font-black uppercase text-xs text-white">Community Matches</span>
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[#00b4ff]/10 border border-[#00b4ff]/20 text-[#00b4ff]">Player-Hosted</span>
              </div>
              <p className="text-[#606070] text-[10px]">Live and upcoming matches created by players</p>
            </div>
            <Link
              href="/community-matches"
              className="flex items-center gap-0.5 text-[10px] font-black uppercase text-[#ff4500] hover:text-[#ff6633] transition-colors whitespace-nowrap"
            >
              View All <ChevronRight className="w-3 h-3" />
            </Link>
          </div>

          {cmLoading ? (
            <div className="space-y-2">
              {[1, 2].map((i) => (
                <div key={i} className="h-16 bg-[#0d1120] rounded-xl animate-pulse" />
              ))}
            </div>
          ) : communityMatches.length === 0 ? (
            <div className="bg-[#0d1120] border border-[#1e2238] rounded-xl px-5 py-6 text-center">
              <Swords className="w-7 h-7 mx-auto mb-2 text-[#2a2a46]" />
              <p className="text-[#4a4a6a] text-sm font-bold">No active community matches</p>
              <Link href="/community-matches" className="mt-2 inline-block text-xs text-[#ff4500] font-bold hover:underline">
                Create one →
              </Link>
            </div>
          ) : (
            <div className="space-y-1.5">
              {communityMatches.map((m: any) => {
                const color = TYPE_COLOR[m.matchType] ?? "#ff4500";
                const icon  = TYPE_ICON[m.matchType] ?? "🎮";
                const isLive = m.effectiveStatus === "active";
                const startsAt = m.scheduledAt ? new Date(m.scheduledAt) : null;
                const isFull = m.filledSlots >= m.maxSlots;
                return (
                  <Link
                    key={m.id}
                    href="/community-matches"
                    className="relative flex items-center gap-3 bg-[#0d1120] border border-[#1e2238] rounded-xl px-3 py-2.5 hover:border-[#2a2a46] transition-all group overflow-hidden"
                    style={{ textDecoration: "none" }}
                  >
                    <div className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-xl" style={{ background: `${color}55` }} />

                    <div className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-base" style={{ background: `${color}10`, border: `1px solid ${color}20` }}>
                      {isLive ? <Zap className="w-4 h-4" style={{ color }} /> : icon}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                        <span className="font-black text-white text-xs leading-tight">{m.matchName || `${m.matchType} Match`}</span>
                        {isLive && (
                          <span className="flex items-center gap-1 text-[9px] font-black px-1.5 py-0.5 rounded-full bg-[#ff2244]/15 border border-[#ff2244]/30 text-[#ff2244]">
                            <span className="w-1 h-1 rounded-full bg-[#ff2244] animate-pulse" />
                            LIVE
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2.5 text-[10px] text-[#606070]">
                        <span className="flex items-center gap-0.5"><Users className="w-2.5 h-2.5" />{m.filledSlots}/{m.maxSlots}</span>
                        {Number(m.prizePool) > 0 && <span className="text-[#ffd700] font-bold">৳{Number(m.prizePool).toLocaleString()}</span>}
                        {Number(m.entryFee) > 0 && <span>Entry: ৳{Number(m.entryFee)}</span>}
                      </div>
                    </div>

                    <div className="shrink-0 text-right">
                      {isLive ? (
                        <div className="text-[10px] font-black text-[#ff2244] uppercase">🔴 Live</div>
                      ) : startsAt ? (
                        <div>
                          <div className="text-[9px] text-[#606070] uppercase font-bold mb-0.5">Starts in</div>
                          <CountdownTimer targetDate={startsAt} className="text-[9px]" />
                        </div>
                      ) : (
                        <div className="text-[10px] text-[#606070]">Open</div>
                      )}
                      {isFull && <div className="text-[9px] text-[#ff2244] font-bold mt-0.5">Full</div>}
                      <ChevronRight className="w-3 h-3 text-[#3a3a56] group-hover:text-[#606070] mt-0.5 ml-auto transition-colors" />
                    </div>
                  </Link>
                );
              })}

              <Link
                href="/community-matches"
                className="block text-center py-2.5 border border-dashed border-[#1e2238] hover:border-[#2a2a46] rounded-xl text-xs font-bold text-[#4a4a6a] hover:text-[#606070] transition-all"
                style={{ textDecoration: "none" }}
              >
                Browse all community matches →
              </Link>
            </div>
          )}
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
      className="relative block w-full rounded-2xl overflow-hidden transition-all duration-200 active:scale-[0.985] focus:outline-none"
      style={{
        background: "#0d1120",
        border: "1.5px solid #1e2238",
        textDecoration: "none",
      }}
      onMouseEnter={(e: React.MouseEvent<HTMLAnchorElement>) => {
        const el = e.currentTarget;
        el.style.borderColor = `${cat.color}40`;
        el.style.boxShadow = `0 4px 20px ${cat.color}10`;
        el.style.background = `linear-gradient(135deg, ${cat.color}08 0%, #0d1120 55%)`;
      }}
      onMouseLeave={(e: React.MouseEvent<HTMLAnchorElement>) => {
        const el = e.currentTarget;
        el.style.borderColor = "#1e2238";
        el.style.boxShadow = "none";
        el.style.background = "#0d1120";
      }}
    >
      {/* Left accent bar */}
      <div
        className="absolute left-0 top-0 bottom-0 rounded-l-2xl"
        style={{ width: "3px", background: `${cat.color}55` }}
      />

      <div className="relative flex items-center gap-3 pl-5 pr-3 py-3">
        {/* Icon */}
        <div
          className="flex items-center justify-center shrink-0 rounded-xl"
          style={{
            width: "40px",
            height: "40px",
            fontSize: "22px",
            background: `${cat.color}10`,
            border: `1px solid ${cat.color}20`,
          }}
        >
          {cat.icon}
        </div>

        {/* Title + description */}
        <div className="flex-1 min-w-0">
          <p className="font-black uppercase text-xs sm:text-sm leading-tight tracking-tight mb-0.5 text-white">
            {cat.label}
          </p>
          <p className="text-[#606070] text-[10px] leading-snug">
            {cat.desc}
          </p>
        </div>

        {/* Count + chevron */}
        <div className="shrink-0 flex flex-col items-end gap-0 pl-2">
          {loading ? (
            <div className="w-6 h-5 bg-[#1a2040] rounded animate-pulse" />
          ) : (
            <span
              className="text-xl font-black leading-none"
              style={{ color: count > 0 ? cat.color : "#2a2a46" }}
            >
              {count}
            </span>
          )}
          <span className="text-[9px] text-[#3a3a56] uppercase font-bold tracking-wider">
            {loading ? "" : count === 1 ? "match" : "matches"}
          </span>
          <ChevronRight className="w-3 h-3 mt-0.5 text-[#3a3a56]" />
        </div>
      </div>
    </Link>
  );
}
