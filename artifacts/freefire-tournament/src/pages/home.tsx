import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import { Trophy, Users, Zap, ChevronRight, Flame, Lock, Swords, Star, Shield, Target } from "lucide-react";
import { motion, useInView, useMotionValue, useSpring } from "framer-motion";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import TournamentCard from "@/components/TournamentCard";
import CountdownTimer from "@/components/CountdownTimer";
import { useGetFeaturedTournaments, useListAnnouncements, useGetGlobalLeaderboard } from "@workspace/api-client-react";
import { apiBase } from "@/lib/apiBase";
import { useAuthContext } from "@/lib/AuthContext";
import { useLanguage } from "@/lib/LanguageContext";

const announcementTypeColors: Record<string, string> = {
  info: "border-l-blue-400 bg-blue-400/5",
  warning: "border-l-yellow-400 bg-yellow-400/5",
  success: "border-l-[#00ff88] bg-[#00ff88]/5",
  urgent: "border-l-[#ff2244] bg-[#ff2244]/5",
};

const rankColors = ["text-[#ffd700]", "text-gray-300", "text-amber-600"];

// Animated counter hook
function useCounter(target: number, duration = 1500) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    if (!inView) return;
    let start = 0;
    const step = target / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= target) { setCount(target); clearInterval(timer); }
      else setCount(Math.floor(start));
    }, 16);
    return () => clearInterval(timer);
  }, [inView, target, duration]);

  return { count, ref };
}

// Fade-up animation variant
const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] },
  }),
};

const fadeIn = {
  hidden: { opacity: 0 },
  show: (i = 0) => ({
    opacity: 1,
    transition: { duration: 0.5, delay: i * 0.1 },
  }),
};

// Floating orb component
function FloatingOrb({ x, y, size, color, delay }: { x: string; y: string; size: number; color: string; delay: number }) {
  return (
    <motion.div
      className="absolute rounded-full pointer-events-none"
      style={{ left: x, top: y, width: size, height: size, background: color, filter: `blur(${size * 0.6}px)` }}
      animate={{ y: [0, -20, 0], opacity: [0.4, 0.7, 0.4] }}
      transition={{ duration: 4 + delay, repeat: Infinity, ease: "easeInOut", delay }}
    />
  );
}

export default function Home() {
  const { user } = useAuthContext();
  const [, setLocation] = useLocation();
  const { t } = useLanguage();

  useEffect(() => { if (user) setLocation("/tournaments/all"); }, [user]);

  const { data: _featured, isLoading: loadingFeatured } = useGetFeaturedTournaments();
  const { data: _announcements, isLoading: loadingAnn } = useListAnnouncements();
  const { data: _leaderboard, isLoading: loadingLb } = useGetGlobalLeaderboard();
  const featured = Array.isArray(_featured) ? _featured : [];
  const announcements = Array.isArray(_announcements) ? _announcements : [];
  const leaderboard = Array.isArray(_leaderboard) ? _leaderboard : [];

  const [communityMatches, setCommunityMatches] = useState<any[]>([]);
  const [loadingCommunity, setLoadingCommunity] = useState(true);
  useEffect(() => {
    fetch(`${apiBase}/api/user-matches`)
      .then((r) => r.json())
      .then((d) => setCommunityMatches(Array.isArray(d) ? d : []))
      .catch(() => setCommunityMatches([]))
      .finally(() => setLoadingCommunity(false));
  }, []);

  const nextTournament = featured[0];

  return (
    <div className="min-h-screen bg-[#080c14] text-white">
      <Navbar />

      {/* ── HERO ── */}
      <section className="relative min-h-[75dvh] flex flex-col items-center justify-center text-center px-4 overflow-hidden pt-12">
        {/* BG image */}
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center opacity-[0.06]" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#080c14]/70 via-[#080c14]/20 to-[#080c14]" />

        {/* Grid pattern */}
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "linear-gradient(rgba(255,69,0,1) 1px,transparent 1px),linear-gradient(90deg,rgba(255,69,0,1) 1px,transparent 1px)", backgroundSize: "44px 44px" }} />

        {/* Floating orbs */}
        <FloatingOrb x="8%" y="18%" size={180} color="rgba(255,69,0,0.09)" delay={0} />
        <FloatingOrb x="78%" y="12%" size={140} color="rgba(255,215,0,0.06)" delay={1.5} />
        <FloatingOrb x="55%" y="65%" size={100} color="rgba(0,180,255,0.05)" delay={2.5} />
        <FloatingOrb x="3%" y="70%" size={120} color="rgba(120,60,255,0.05)" delay={1} />

        <div className="relative z-10 max-w-3xl mx-auto flex flex-col items-center gap-3.5">
          {/* Badge */}
          <motion.div variants={fadeUp} initial="hidden" animate="show" custom={0}
            className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#ff4500]/10 border border-[#ff4500]/25 rounded-full text-[#ff4500] text-[10px] font-black uppercase tracking-[0.2em]">
            <motion.div animate={{ scale: [1, 1.3, 1] }} transition={{ duration: 1.5, repeat: Infinity }}>
              <Flame className="w-2.5 h-2.5" />
            </motion.div>
            {t("home_badge")}
          </motion.div>

          {/* Heading */}
          <motion.h1 variants={fadeUp} initial="hidden" animate="show" custom={1}
            className="text-3xl sm:text-4xl md:text-5xl font-black uppercase leading-none tracking-tighter">
            <span className="text-white">{t("home_hero_1")} </span>
            <span className="text-[#ff4500]" style={{ textShadow: "0 0 36px rgba(255,69,0,0.55),0 0 72px rgba(255,69,0,0.2)" }}>
              {t("home_hero_2")}
            </span>
            <br />
            <span className="text-white">{t("home_hero_3")}</span>
          </motion.h1>

          <motion.p variants={fadeUp} initial="hidden" animate="show" custom={2}
            className="text-sm text-[#8890a8] max-w-md mx-auto leading-relaxed">
            {t("home_hero_desc")}
          </motion.p>

          {/* Countdown + Stats row */}
          <motion.div variants={fadeUp} initial="hidden" animate="show" custom={3} className="w-full max-w-lg flex flex-col sm:flex-row gap-2.5">
            {nextTournament && (
              <div className="relative flex-1 rounded-xl overflow-hidden border border-[#ff4500]/20 bg-[#0d1120]/90 backdrop-blur-xl p-3">
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#ff4500]/60 to-transparent" />
                <p className="text-[#ff4500] text-[9px] font-black uppercase tracking-[0.22em] mb-1">{t("home_next_tournament")}</p>
                <CountdownTimer targetDate={nextTournament.countdownTo ?? nextTournament.startDate} className="text-lg justify-center font-black" />
                <p className="text-white/40 font-semibold mt-1 truncate text-[10px]">{nextTournament.name}</p>
              </div>
            )}

            {/* Stats */}
            <div className="relative flex-1 rounded-xl overflow-hidden border border-white/[0.06] bg-[#0d1120]/80 backdrop-blur-2xl">
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#ff4500]/40 to-transparent" />
              <div className="flex items-center gap-1.5 px-3 py-1.5 border-b border-white/[0.04]">
                <span className="relative flex">
                  <span className="animate-ping absolute inline-flex h-1.5 w-1.5 rounded-full bg-[#00ff88] opacity-75" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#00ff88]" />
                </span>
                <span className="text-[#00ff88] text-[9px] font-black uppercase tracking-[0.2em]">Live Stats</span>
              </div>
              <div className="grid grid-cols-3 divide-x divide-white/[0.04]">
                {[
                  { icon: <Trophy className="w-3 h-3 text-[#ffd700]" />, color: "#ffd700", value: "৳৫০K+", label: "Prize" },
                  { icon: <Users className="w-3 h-3 text-[#00ff88]" />, color: "#00ff88", value: "১৪২০+", label: "Players" },
                  { icon: <Swords className="w-3 h-3 text-[#ff4500]" />, color: "#ff4500", value: "৪৫০+", label: "Matches" },
                ].map((s, i) => (
                  <div key={i} className="flex flex-col items-center gap-0.5 px-2 py-2.5">
                    <div className="mb-0.5">{s.icon}</div>
                    <div className="font-black text-sm leading-none" style={{ color: s.color }}>{s.value}</div>
                    <div className="text-[#8890a8] text-[8px] font-bold uppercase tracking-wide">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* CTA Buttons */}
          <motion.div variants={fadeUp} initial="hidden" animate="show" custom={4}
            className="flex flex-col sm:flex-row gap-2 justify-center">
            <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
              <Link href="/tournaments"
                className="px-5 py-2.5 bg-[#ff4500] text-white font-black uppercase text-xs rounded-xl hover:bg-[#e03d00] transition-all shadow-[0_0_20px_rgba(255,69,0,0.4)] hover:shadow-[0_0_36px_rgba(255,69,0,0.6)] flex items-center justify-center gap-2">
                <Trophy className="w-3.5 h-3.5" /> {t("home_find_tournaments")}
              </Link>
            </motion.div>
            <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
              <Link href="/leaderboard"
                className="px-5 py-2.5 bg-transparent text-white font-black uppercase text-xs rounded-xl border border-[#ff4500]/35 hover:border-[#ff4500] hover:bg-[#ff4500]/8 transition-all flex items-center justify-center gap-2">
                <Zap className="w-3.5 h-3.5" /> {t("home_view_leaderboard")}
              </Link>
            </motion.div>
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2 }}
          className="absolute bottom-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 text-[#8890a8]">
          <motion.div animate={{ y: [0, 6, 0] }} transition={{ duration: 1.6, repeat: Infinity }} className="w-px h-6 bg-gradient-to-b from-transparent to-[#ff4500]/40" />
          <span className="text-[9px] uppercase tracking-widest">{t("home_scroll")}</span>
        </motion.div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <SectionWrapper>
        <SectionHeader left={t("home_how_it")} right={t("home_works")} />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
          {[
            { step: "01", icon: <Shield className="w-3.5 h-3.5" />, title: t("home_step1_title"), desc: t("home_step1_desc") },
            { step: "02", icon: <Trophy className="w-3.5 h-3.5" />, title: t("home_step2_title"), desc: t("home_step2_desc") },
            { step: "03", icon: <Target className="w-3.5 h-3.5" />, title: t("home_step3_title"), desc: t("home_step3_desc") },
            { step: "04", icon: <Star className="w-3.5 h-3.5" />, title: t("home_step4_title"), desc: t("home_step4_desc") },
          ].map((item, i) => (
            <motion.div key={item.step} variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} custom={i}
              whileHover={{ y: -2, borderColor: "rgba(255,69,0,0.4)" }}
              className="bg-[#0d1120] border border-[#ff4500]/10 rounded-xl p-3 text-center transition-colors group cursor-default">
              <div className="text-[#ff4500]/12 font-black text-2xl leading-none mb-1 group-hover:text-[#ff4500]/22 transition-colors">{item.step}</div>
              <div className="w-6 h-6 rounded-lg bg-[#ff4500]/10 border border-[#ff4500]/20 flex items-center justify-center text-[#ff4500] mx-auto mb-1.5">
                {item.icon}
              </div>
              <h3 className="font-black uppercase text-white text-[10px] mb-0.5">{item.title}</h3>
              <p className="text-[#8890a8] text-[10px] leading-relaxed">{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </SectionWrapper>

      {/* ── FEATURED TOURNAMENTS ── */}
      <SectionWrapper>
        <SectionHeader left={t("home_featured")} right={t("home_tournaments")} link={{ href: "/tournaments", label: t("home_view_all") }} />
        {loadingFeatured ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
            {[1,2,3].map((i) => <div key={i} className="h-36 bg-[#0d1120] rounded-xl animate-pulse" />)}
          </div>
        ) : featured.length === 0 ? (
          <EmptyState icon={<Trophy className="w-9 h-9 opacity-20" />} title={t("home_no_tournaments")} desc={t("home_no_tournaments_desc")} />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {featured.map((item, i) => (
              <motion.div key={item.id} variants={fadeIn} initial="hidden" whileInView="show" viewport={{ once: true }} custom={i}>
                <TournamentCard t={item as any} featured />
              </motion.div>
            ))}
          </div>
        )}
      </SectionWrapper>

      {/* ── COMMUNITY MATCHES ── */}
      <SectionWrapper>
        <SectionHeader left={t("home_community")} right={t("home_matches")} link={{ href: "/matches", label: t("home_view_all") }} />
        {loadingCommunity ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {[1,2,3].map((i) => <div key={i} className="h-24 bg-[#0d1120] rounded-xl animate-pulse" />)}
          </div>
        ) : communityMatches.length === 0 ? (
          <div className="text-center py-7 text-[#8890a8] bg-[#0d1120] rounded-xl border border-[#ff4500]/10">
            <Swords className="w-8 h-8 mx-auto mb-2 opacity-20" />
            <p className="text-sm font-bold text-white/30">{t("home_no_community")}</p>
            <p className="text-xs mt-1">{t("home_no_community_desc")}</p>
            <Link href="/matches" className="inline-block mt-3 px-4 py-1.5 bg-[#ff4500] text-white font-bold text-xs rounded-lg hover:bg-[#e03d00] transition-colors">
              {t("home_host_match")}
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {communityMatches.slice(0, 6).map((m: any, i: number) => {
              const isFree = !m.entryFee || parseFloat(m.entryFee) === 0;
              const prize = m.prizePool ? parseFloat(m.prizePool) : 0;
              const scheduledAt = m.scheduledAt ? new Date(m.scheduledAt) : null;
              return (
                <motion.div key={m.id} variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} custom={i}>
                  <Link href="/matches">
                    <motion.div whileHover={{ y: -2, borderColor: "rgba(255,69,0,0.3)" }}
                      className="bg-[#0d1120] border border-[#ff4500]/10 rounded-xl p-3 transition-all cursor-pointer group">
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-1.5 min-w-0">
                          {m.serialNumber && (
                            <span className="shrink-0 text-[#ff4500] font-mono text-[10px] bg-[#ff4500]/10 border border-[#ff4500]/20 px-1 py-0.5 rounded">{m.serialNumber}</span>
                          )}
                          <span className="text-white font-bold text-xs truncate group-hover:text-[#ff4500] transition-colors">{m.matchName || m.matchType}</span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {m.isPrivate && <Lock className="w-2.5 h-2.5 text-[#8890a8]" />}
                          <span className="text-[9px] font-bold px-1 py-0.5 rounded bg-[#ff4500]/10 text-[#ff4500] uppercase">{m.matchMode ?? m.matchType}</span>
                        </div>
                      </div>
                      <p className="text-[#8890a8] text-[10px] mb-1.5">
                        {t("by")} <span className="text-white font-semibold">{m.creatorName}</span>
                      </p>
                      <div className="flex items-center gap-2.5 text-[10px]">
                        <span className={isFree ? "text-[#00ff88] font-bold" : "text-white font-bold"}>
                          {isFree ? t("free") : `৳${m.entryFee}`}
                        </span>
                        {prize > 0 && <span className="text-yellow-400 font-bold flex items-center gap-0.5">🏆 ৳{prize.toFixed(0)}</span>}
                        <span className="text-[#8890a8] ml-auto flex items-center gap-1">
                          <Users className="w-2.5 h-2.5" /> {m.filledSlots ?? 0}/{m.maxSlots}
                        </span>
                      </div>
                      {scheduledAt && (
                        <div className="mt-1 text-[9px] text-[#606070]">
                          {scheduledAt.toLocaleDateString(undefined, { month: "short", day: "numeric" })} · {scheduledAt.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
                        </div>
                      )}
                    </motion.div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        )}
      </SectionWrapper>

      {/* ── TOP PLAYERS ── */}
      <SectionWrapper>
        <SectionHeader left={t("home_top")} right={t("home_players")} link={{ href: "/leaderboard", label: t("home_full_leaderboard") }} />
        <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}
          className="bg-[#0d1120] rounded-xl border border-[#ff4500]/12 overflow-hidden">
          {loadingLb ? (
            <div className="p-4 text-center text-[#8890a8] text-sm">{t("home_loading_rankings")}</div>
          ) : leaderboard.length === 0 ? (
            <EmptyState icon={<Users className="w-8 h-8 opacity-20" />} title={t("home_no_rankings")} desc={t("home_no_rankings_desc")} />
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#ff4500]/8">
                  <th className="text-left text-[#8890a8] text-[10px] uppercase py-2 px-3">{t("th_rank")}</th>
                  <th className="text-left text-[#8890a8] text-[10px] uppercase py-2 px-3">{t("th_player")}</th>
                  <th className="text-right text-[#8890a8] text-[10px] uppercase py-2 px-3">{t("th_kills")}</th>
                  <th className="text-right text-[#8890a8] text-[10px] uppercase py-2 px-3">{t("th_points")}</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.slice(0, 5).map((entry: any, i: number) => (
                  <motion.tr key={entry.rank} variants={fadeIn} initial="hidden" whileInView="show" viewport={{ once: true }} custom={i}
                    className="border-b border-[#ff4500]/5 hover:bg-[#ff4500]/4 transition-colors">
                    <td className="py-1.5 px-3">
                      <span className={`font-black text-xs ${rankColors[entry.rank - 1] ?? "text-white"}`}>
                        {entry.rank <= 3 ? ["🥇","🥈","🥉"][entry.rank - 1] : `#${entry.rank}`}
                      </span>
                    </td>
                    <td className="py-1.5 px-3 font-medium text-white text-xs">{entry.playerName}</td>
                    <td className="py-1.5 px-3 text-right text-[#ff4500] font-bold text-xs">{entry.kills}</td>
                    <td className="py-1.5 px-3 text-right text-white font-bold text-xs">{entry.points}</td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          )}
        </motion.div>
      </SectionWrapper>

      {/* ── ANNOUNCEMENTS ── */}
      {(loadingAnn || announcements.length > 0) && (
        <SectionWrapper>
          <SectionHeader left={t("home_latest")} right={t("home_announcements")} />
          <div className="flex flex-col gap-2">
            {loadingAnn
              ? [1,2].map((i) => <div key={i} className="h-12 bg-[#0d1120] rounded-xl animate-pulse" />)
              : announcements.slice(0, 5).map((a: any, i: number) => (
                <motion.div key={a.id} variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} custom={i}
                  className={`rounded-xl border-l-4 px-3 py-2.5 bg-[#0d1120] ${announcementTypeColors[a.type] ?? announcementTypeColors.info}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className="font-bold text-white text-xs">{a.title}</h4>
                      <p className="text-[#8890a8] text-[10px] mt-0.5 line-clamp-2">{a.content}</p>
                    </div>
                    <span className="text-[#8890a8] text-[9px] whitespace-nowrap">{new Date(a.createdAt).toLocaleDateString()}</span>
                  </div>
                </motion.div>
              ))
            }
          </div>
        </SectionWrapper>
      )}

      <Footer />
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function SectionWrapper({ children }: { children: React.ReactNode }) {
  return <section className="max-w-6xl mx-auto px-4 py-5">{children}</section>;
}

function SectionHeader({ left, right, link }: { left: string; right: string; link?: { href: string; label: string } }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className="text-sm md:text-base font-black uppercase">
        {left} <span className="text-[#ff4500]">{right}</span>
      </h2>
      {link && (
        <Link href={link.href} className="flex items-center gap-0.5 text-[#ff4500] text-[10px] font-bold hover:gap-1.5 transition-all">
          {link.label} <ChevronRight className="w-3 h-3" />
        </Link>
      )}
    </div>
  );
}

function EmptyState({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="text-center py-10 text-[#a0a0b0]">
      <div className="flex justify-center mb-2">{icon}</div>
      <p className="text-sm font-bold text-white/30">{title}</p>
      <p className="text-xs mt-1">{desc}</p>
    </div>
  );
}
