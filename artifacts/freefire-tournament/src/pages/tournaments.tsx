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
            onClick={() => { fetchCounts(); fetchCommunity(); }}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#0e0e18] border border-[#1e1e2e] hover:border-[#2a2a36] rounded-xl text-[#606070] hover:text-[#a0a0b0] transition-all text-xs font-bold uppercase"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh Counts
          </button>
        </div>

        {/* ── Community Matches preview ── */}
        <div className="mt-10">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Swords className="w-4 h-4 text-[#00b4ff]" />
                <span className="font-black uppercase text-sm text-white">Community Matches</span>
                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-[#00b4ff]/10 border border-[#00b4ff]/20 text-[#00b4ff]">Player-Hosted</span>
              </div>
              <p className="text-[#606070] text-[11px]">Live and upcoming matches created by players</p>
            </div>
            <Link
              href="/community-matches"
              className="flex items-center gap-1 text-[11px] font-black uppercase text-[#ff6b00] hover:text-[#ff8833] transition-colors whitespace-nowrap"
            >
              View All <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {cmLoading ? (
            <div className="space-y-2">
              {[1, 2].map((i) => (
                <div key={i} className="h-20 bg-[#0e0e18] rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : communityMatches.length === 0 ? (
            <div className="bg-[#0e0e18] border border-[#1e1e2e] rounded-2xl px-6 py-8 text-center">
              <Swords className="w-8 h-8 mx-auto mb-2 text-[#2a2a36]" />
              <p className="text-[#4a4a5a] text-sm font-bold">No active community matches</p>
              <Link href="/community-matches" className="mt-2 inline-block text-xs text-[#ff6b00] font-bold hover:underline">
                Create one →
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {communityMatches.map((m: any) => {
                const color = TYPE_COLOR[m.matchType] ?? "#ff6b00";
                const icon  = TYPE_ICON[m.matchType] ?? "🎮";
                const isLive = m.effectiveStatus === "active";
                const startsAt = m.scheduledAt ? new Date(m.scheduledAt) : null;
                const isFull = m.filledSlots >= m.maxSlots;
                return (
                  <Link
                    key={m.id}
                    href="/community-matches"
                    className="relative flex items-center gap-3 bg-[#0e0e18] border border-[#1e1e2e] rounded-2xl px-4 py-3 hover:border-[#2a2a36] transition-all group overflow-hidden"
                    style={{ textDecoration: "none" }}
                  >
                    {/* Left accent bar */}
                    <div className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-2xl" style={{ background: `${color}60` }} />

                    {/* Icon */}
                    <div className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-lg" style={{ background: `${color}12`, border: `1px solid ${color}22` }}>
                      {isLive ? <Zap className="w-5 h-5" style={{ color }} /> : icon}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                        <span className="font-black text-white text-[13px] leading-tight">{m.matchName || `${m.matchType} Match`}</span>
                        {isLive && (
                          <span className="flex items-center gap-1 text-[9px] font-black px-2 py-0.5 rounded-full bg-[#ff2244]/15 border border-[#ff2244]/30 text-[#ff2244]">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#ff2244] animate-pulse" />
                            LIVE
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-[10px] text-[#606070]">
                        <span className="flex items-center gap-1"><Users className="w-3 h-3" />{m.filledSlots}/{m.maxSlots}</span>
                        {Number(m.prizePool) > 0 && <span className="text-[#ffd700] font-bold">৳{Number(m.prizePool).toLocaleString()}</span>}
                        {Number(m.entryFee) > 0 && <span>Entry: ৳{Number(m.entryFee)}</span>}
                      </div>
                    </div>

                    {/* Countdown / status */}
                    <div className="shrink-0 text-right">
                      {isLive ? (
                        <div className="text-[10px] font-black text-[#ff2244] uppercase">🔴 Live Now</div>
                      ) : startsAt ? (
                        <div>
                          <div className="text-[9px] text-[#606070] uppercase font-bold mb-0.5">Starts in</div>
                          <CountdownTimer targetDate={startsAt} className="text-[10px]" />
                        </div>
                      ) : (
                        <div className="text-[10px] text-[#606070]">Open</div>
                      )}
                      {isFull && <div className="text-[9px] text-[#ff2244] font-bold mt-0.5">Full</div>}
                      <ChevronRight className="w-3 h-3 text-[#3a3a46] group-hover:text-[#606070] mt-0.5 ml-auto transition-colors" />
                    </div>
                  </Link>
                );
              })}

              <Link
                href="/community-matches"
                className="block text-center py-3 border border-dashed border-[#1e1e2e] hover:border-[#2a2a36] rounded-2xl text-xs font-bold text-[#4a4a5a] hover:text-[#606070] transition-all"
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
