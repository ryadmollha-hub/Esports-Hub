import { useState } from "react";
import { Trophy, Flame, Target, Swords, Crown, TrendingUp, Medal, Info } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import RankBadge, { TIERS, getTierInfo, getTierProgress } from "@/components/RankBadge";
import { useQuery } from "@tanstack/react-query";
import { apiBase } from "@/lib/apiBase";

interface RankedPlayer {
  position:     number;
  userId:       string;
  playerName:   string;
  rating:       number;
  tier:         string;
  totalMatches: number;
  totalKills:   number;
  totalWins:    number;
  bestRank:     number | null;
}

async function fetchRankings(): Promise<RankedPlayer[]> {
  const res = await fetch(`${apiBase}/api/ratings/leaderboard`);
  if (!res.ok) throw new Error("Failed to fetch rankings");
  return res.json();
}

const podiumOrder = [1, 0, 2]; // 2nd, 1st, 3rd visual layout

export default function RankingsPage() {
  const [tab, setTab] = useState<"leaderboard" | "tiers">("leaderboard");

  const { data: players = [], isLoading } = useQuery({
    queryKey: ["ratings-leaderboard"],
    queryFn: fetchRankings,
    refetchInterval: 60_000,
  });

  const top3 = players.slice(0, 3);
  const rest  = players.slice(3);

  const podiumHeight = ["h-24", "h-32", "h-20"];
  const podiumColors = [
    "from-gray-400/20 to-gray-300/10 border-gray-400/30",
    "from-yellow-500/20 to-amber-400/10 border-yellow-400/30",
    "from-amber-700/20 to-amber-600/10 border-amber-600/30",
  ];
  const podiumGlow = ["rgba(148,163,184,0.3)", "rgba(251,191,36,0.5)", "rgba(180,83,9,0.35)"];
  const positionLabel = ["2nd", "1st", "3rd"];

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <Navbar />
      <div className="max-w-4xl mx-auto px-3 pt-16 pb-24">

        {/* ── Header ── */}
        <div className="mt-4 mb-5 text-center">
          <div className="inline-flex items-center gap-1.5 bg-[#ff6b00]/10 border border-[#ff6b00]/30 rounded-full px-3 py-1 text-[#ff6b00] text-xs font-black uppercase tracking-widest mb-2.5">
            <Flame className="w-3 h-3" /> FF Arena Exclusive
          </div>
          <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tight">
            <span className="text-[#ff6b00]">Skill</span> Rankings
          </h1>
          <p className="text-[#a0a0b0] text-sm mt-1.5 max-w-md mx-auto">
            The only verified custom-room skill rating in Bangladesh. Earn rating points from every tournament match — placement + kills.
          </p>
        </div>

        {/* ── Tab toggle ── */}
        <div className="flex gap-1.5 mb-4 bg-[#12121a] rounded-2xl p-1 border border-[#2a2a36] max-w-xs mx-auto">
          {(["leaderboard", "tiers"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-1.5 rounded-xl text-xs font-black uppercase tracking-wide transition-all ${
                tab === t
                  ? "bg-[#ff6b00] text-white shadow-[0_0_12px_rgba(255,107,0,0.4)]"
                  : "text-[#a0a0b0] hover:text-white"
              }`}
            >
              {t === "leaderboard" ? "🏆 Top Players" : "🎖️ Tier Guide"}
            </button>
          ))}
        </div>

        {/* ══ LEADERBOARD TAB ══ */}
        {tab === "leaderboard" && (
          <>
            {isLoading ? (
              <div className="flex items-center justify-center h-40">
                <div className="w-8 h-8 border-2 border-[#ff6b00] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : players.length === 0 ? (
              <div className="text-center py-16">
                <Trophy className="w-12 h-12 text-[#2a2a36] mx-auto mb-2.5" />
                <div className="text-[#a0a0b0] font-bold">No rankings yet</div>
                <div className="text-[#606070] text-sm mt-1">Rankings appear after the first match results are published.</div>
              </div>
            ) : (
              <>
                {/* Podium — top 3 */}
                {top3.length >= 1 && (
                  <div className="flex items-end justify-center gap-2.5 mb-5">
                    {podiumOrder.map((i, vi) => {
                      const p = top3[i];
                      if (!p) return <div key={vi} className="w-24" />;
                      const tier = getTierInfo(p.rating);
                      return (
                        <div key={i} className="flex flex-col items-center gap-1.5" style={{ flex: i === 0 ? "0 0 120px" : "0 0 96px" }}>
                          {/* Crown for 1st */}
                          {i === 0 && <Crown className="w-5 h-5 text-yellow-400" />}

                          {/* Avatar */}
                          <div
                            className="rounded-full flex items-center justify-center font-black text-white border-2"
                            style={{
                              width: i === 0 ? 56 : 44,
                              height: i === 0 ? 56 : 44,
                              background: `${tier.color}25`,
                              borderColor: `${tier.color}70`,
                              boxShadow: `0 0 16px ${podiumGlow[vi]}`,
                              fontSize: i === 0 ? 22 : 18,
                            }}
                          >
                            {tier.emoji}
                          </div>

                          <div className="text-center">
                            <div className={`font-black truncate max-w-[100px] ${i === 0 ? "text-sm text-white" : "text-xs text-[#c0c0c8]"}`}>
                              {p.playerName}
                            </div>
                            <div className="text-[10px] text-[#a0a0b0] font-bold">{p.rating.toLocaleString()} RP</div>
                          </div>

                          {/* Podium block */}
                          <div
                            className={`w-full rounded-t-xl border bg-gradient-to-b ${podiumColors[vi]} ${podiumHeight[vi]} flex items-center justify-center`}
                            style={{ boxShadow: `0 0 12px ${podiumGlow[vi]}` }}
                          >
                            <span className="text-2xl font-black" style={{ color: tier.color }}>{positionLabel[vi]}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Ranks 4–100 table */}
                {rest.length > 0 && (
                  <div className="rounded-2xl border border-[#2a2a36] bg-[#12121a] overflow-hidden">
                    <div className="grid grid-cols-12 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-[#606070] border-b border-[#1a1a24]">
                      <span className="col-span-1">#</span>
                      <span className="col-span-4">Player</span>
                      <span className="col-span-3">Tier</span>
                      <span className="col-span-2 text-right">Kills</span>
                      <span className="col-span-2 text-right">RP</span>
                    </div>
                    {rest.map((p) => {
                      const tier = getTierInfo(p.rating);
                      return (
                        <div
                          key={p.userId}
                          className="grid grid-cols-12 px-3 py-2.5 border-b border-[#1a1a24] last:border-0 hover:bg-[#1a1a24]/50 transition-colors items-center"
                        >
                          <span className="col-span-1 text-[#606070] text-xs font-black">{p.position}</span>
                          <span className="col-span-4 text-white text-xs font-bold truncate">{p.playerName}</span>
                          <span className="col-span-3">
                            <RankBadge rating={p.rating} size="xs" />
                          </span>
                          <span className="col-span-2 text-right text-[#a0a0b0] text-xs font-bold flex items-center justify-end gap-1">
                            <Target className="w-3 h-3" />{p.totalKills}
                          </span>
                          <span className="col-span-2 text-right font-black text-xs" style={{ color: tier.color }}>
                            {p.rating.toLocaleString()}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}

            {/* How RP is earned */}
            <div className="mt-5 bg-[#12121a] border border-[#2a2a36] rounded-2xl p-3.5">
              <div className="flex items-center gap-1.5 text-white font-black uppercase text-sm mb-3">
                <Info className="w-4 h-4 text-[#ff6b00]" /> How Rating Points are Earned
              </div>
              <div className="grid grid-cols-2 gap-2.5 text-sm">
                <div>
                  <div className="text-[#a0a0b0] text-xs uppercase font-black mb-1.5 flex items-center gap-1">
                    <Medal className="w-3 h-3 text-[#ff6b00]" /> Placement
                  </div>
                  {[
                    ["🥇 1st Place", "+15 RP"],
                    ["🥈 2nd Place", "+12 RP"],
                    ["🥉 3rd Place", "+10 RP"],
                    ["4th Place",   "+8 RP"],
                    ["5th Place",   "+6 RP"],
                    ["6th–10th",   "+1–5 RP"],
                    ["11th+",      "+0 RP"],
                  ].map(([label, pts]) => (
                    <div key={label} className="flex justify-between text-xs py-1 border-b border-[#1a1a24] last:border-0">
                      <span className="text-[#c0c0c8]">{label}</span>
                      <span className="text-[#ff6b00] font-black">{pts}</span>
                    </div>
                  ))}
                </div>
                <div>
                  <div className="text-[#a0a0b0] text-xs uppercase font-black mb-1.5 flex items-center gap-1">
                    <Swords className="w-3 h-3 text-red-400" /> Per Kill
                  </div>
                  <div className="flex justify-between text-xs py-1.5 border-b border-[#1a1a24]">
                    <span className="text-[#c0c0c8]">Each kill</span>
                    <span className="text-red-400 font-black">+3 RP</span>
                  </div>
                  <div className="flex justify-between text-xs py-1.5">
                    <span className="text-[#c0c0c8]">Kill cap</span>
                    <span className="text-[#606070] font-black">20 kills max</span>
                  </div>

                  <div className="mt-3 text-[#a0a0b0] text-xs uppercase font-black mb-1.5 flex items-center gap-1">
                    <TrendingUp className="w-3 h-3 text-green-400" /> Rating never drops
                  </div>
                  <div className="text-[#606070] text-xs leading-relaxed">
                    FF Arena rating is additive — it only goes up. Every match you play, you gain rating. Consistent players climb faster.
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ══ TIERS TAB ══ */}
        {tab === "tiers" && (
          <div className="space-y-2.5">
            {[...TIERS].reverse().map((tier, idx) => {
              const next = [...TIERS].reverse()[idx + 1];
              const range = next ? `${tier.min.toLocaleString()} – ${(next.min - 1).toLocaleString()} RP` : `${tier.min.toLocaleString()}+ RP`;
              return (
                <div
                  key={tier.name}
                  className="flex items-center gap-3 p-3 rounded-2xl border"
                  style={{ background: `${tier.color}0d`, borderColor: `${tier.color}30` }}
                >
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shrink-0 border"
                    style={{ background: `${tier.color}18`, borderColor: `${tier.color}40` }}
                  >
                    {tier.emoji}
                  </div>
                  <div className="flex-1">
                    <div className="font-black text-white uppercase tracking-wide" style={{ textShadow: `0 0 12px ${tier.color}60` }}>
                      {tier.name}
                    </div>
                    <div className="text-xs mt-0.5" style={{ color: tier.color }}>{range}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xs text-[#606070] font-bold">From</div>
                    <div className="font-black" style={{ color: tier.color }}>{tier.min.toLocaleString()}</div>
                    <div className="text-[10px] text-[#606070]">RP</div>
                  </div>
                </div>
              );
            })}
            <div className="mt-3 bg-[#12121a] border border-[#ff6b00]/20 rounded-2xl p-3 text-center">
              <Flame className="w-6 h-6 text-[#ff6b00] mx-auto mb-1.5" />
              <div className="text-white font-black text-sm">Rating Never Resets</div>
              <div className="text-[#a0a0b0] text-xs mt-1">Your FF Arena rank is permanent. Play more tournaments to keep climbing.</div>
            </div>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
