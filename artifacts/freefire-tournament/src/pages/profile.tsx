import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import {
  User, Trophy, Wallet, Shield, History, ChevronRight,
  Edit, X, Flame, Star, Target, Swords, Trash2,
  Clock, CheckCircle, XCircle, LogOut, AlertTriangle, Lock, Plus,
  Medal, Zap, Crown, Sword, TrendingUp
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Navbar from "@/components/Navbar";
import { useAuthContext } from "@/lib/AuthContext";
import { useGetMyProfile, useUpdateMyProfile } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { useCreateMatch } from "@/lib/CreateMatchContext";

type Section = "overview" | "edit" | "my-matches";

// ── Badge definitions ─────────────────────────────────────────────────────────
type Badge = { id: string; icon: string; label: string; desc: string; color: string; glow: string };

function computeBadges(stats: { kills: number; wins: number; played: number; isAdmin: boolean; createdAt?: string }): Badge[] {
  const earned: Badge[] = [];
  if (stats.played >= 1)
    earned.push({ id: "first_blood", icon: "🔰", label: "First Blood", desc: "Joined first tournament", color: "from-orange-500/20 to-red-500/20 border-orange-500/30", glow: "rgba(255,107,0,0.4)" });
  if (stats.wins >= 1)
    earned.push({ id: "champion", icon: "🏆", label: "Champion", desc: "Won a tournament", color: "from-yellow-500/20 to-amber-500/20 border-yellow-400/30", glow: "rgba(255,215,0,0.4)" });
  if (stats.kills >= 10)
    earned.push({ id: "killer", icon: "💀", label: "Killer", desc: "10+ total kills", color: "from-red-500/20 to-pink-500/20 border-red-400/30", glow: "rgba(255,34,68,0.4)" });
  if (stats.kills >= 50)
    earned.push({ id: "kill_machine", icon: "⚡", label: "Kill Machine", desc: "50+ total kills", color: "from-purple-500/20 to-indigo-500/20 border-purple-400/30", glow: "rgba(168,85,247,0.4)" });
  if (stats.wins >= 5)
    earned.push({ id: "legend", icon: "👑", label: "Legend", desc: "5 tournament wins", color: "from-yellow-400/25 to-orange-400/25 border-yellow-300/40", glow: "rgba(250,204,21,0.5)" });
  if (stats.played >= 10)
    earned.push({ id: "veteran", icon: "🔥", label: "Veteran", desc: "10 tournaments played", color: "from-orange-600/20 to-red-600/20 border-orange-500/30", glow: "rgba(234,88,12,0.4)" });
  if (stats.isAdmin)
    earned.push({ id: "admin", icon: "🛡️", label: "Admin", desc: "Platform administrator", color: "from-blue-500/20 to-cyan-500/20 border-blue-400/30", glow: "rgba(59,130,246,0.4)" });
  return earned;
}

// All possible badges (for "locked" display)
const ALL_BADGES: Badge[] = [
  { id: "first_blood", icon: "🔰", label: "First Blood", desc: "Join 1 tournament", color: "from-orange-500/20 to-red-500/20 border-orange-500/30", glow: "rgba(255,107,0,0.4)" },
  { id: "champion", icon: "🏆", label: "Champion", desc: "Win a tournament", color: "from-yellow-500/20 to-amber-500/20 border-yellow-400/30", glow: "rgba(255,215,0,0.4)" },
  { id: "killer", icon: "💀", label: "Killer", desc: "Get 10+ kills", color: "from-red-500/20 to-pink-500/20 border-red-400/30", glow: "rgba(255,34,68,0.4)" },
  { id: "kill_machine", icon: "⚡", label: "Kill Machine", desc: "Get 50+ kills", color: "from-purple-500/20 to-indigo-500/20 border-purple-400/30", glow: "rgba(168,85,247,0.4)" },
  { id: "legend", icon: "👑", label: "Legend", desc: "Win 5 tournaments", color: "from-yellow-400/25 to-orange-400/25 border-yellow-300/40", glow: "rgba(250,204,21,0.5)" },
  { id: "veteran", icon: "🔥", label: "Veteran", desc: "Play 10 tournaments", color: "from-orange-600/20 to-red-600/20 border-orange-500/30", glow: "rgba(234,88,12,0.4)" },
];

function matchStatusBadge(status: string) {
  if (status === "approved")
    return { label: "Approved", color: "text-[#00ff88] bg-[#00ff88]/10 border-[#00ff88]/30", Icon: CheckCircle };
  if (status === "rejected")
    return { label: "Rejected", color: "text-[#ff2244] bg-[#ff2244]/10 border-[#ff2244]/30", Icon: XCircle };
  return { label: "Pending", color: "text-yellow-400 bg-yellow-400/10 border-yellow-400/30", Icon: Clock };
}

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: (i = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.4, delay: i * 0.07, ease: [0.22, 1, 0.36, 1] } }),
};

export default function ProfilePage() {
  const { user: authUser, isLoading, logout, authFetch } = useAuthContext();
  const { openCreateMatch } = useCreateMatch();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [section, setSection] = useState<Section>("overview");
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [myMatches, setMyMatches] = useState<any[]>([]);
  const [myMatchesLoading, setMyMatchesLoading] = useState(false);
  const [deletingMatchId, setDeletingMatchId] = useState<number | null>(null);

  const { data: profile, refetch } = useGetMyProfile();
  const updateProfile = useUpdateMyProfile();
  const prof = profile as any;

  const [pForm, setPForm] = useState({ username: "", displayName: "", freefireUid: "", freefireNickname: "" });

  useEffect(() => { if (!isLoading && !authUser) setLocation("/sign-in"); }, [isLoading, authUser]);
  useEffect(() => {
    if (prof) setPForm({ username: prof.username ?? "", displayName: prof.displayName ?? "", freefireUid: prof.freefireUid ?? "", freefireNickname: prof.freefireNickname ?? "" });
  }, [prof]);
  useEffect(() => {
    if (authUser) authFetch("/wallet/balance").then(async (res) => { if (res.ok) { const d = await res.json(); setWalletBalance(d.balance ?? 0); } }).catch(() => {});
  }, [authUser]);

  const loadMyMatches = async () => {
    setMyMatchesLoading(true);
    try { const res = await authFetch("/user-matches/mine"); if (res.ok) setMyMatches(await res.json()); else setMyMatches([]); }
    catch { setMyMatches([]); } finally { setMyMatchesLoading(false); }
  };

  const deleteMatch = async (id: number) => {
    try {
      const res = await authFetch(`/user-matches/${id}`, { method: "DELETE" });
      if (res.ok) { setMyMatches((p) => p.filter((m) => m.id !== id)); setDeletingMatchId(null); toast({ title: "Match deleted" }); }
      else { const d = await res.json().catch(() => ({})); toast({ title: "Cannot delete", description: d.error ?? "Error", variant: "destructive" }); setDeletingMatchId(null); }
    } catch { toast({ title: "Connection error", variant: "destructive" }); }
  };

  useEffect(() => { if (section === "my-matches" && authUser) loadMyMatches(); }, [section, authUser]);

  const saveProfile = async () => {
    updateProfile.mutate({ data: pForm }, {
      onSuccess: () => { toast({ title: "Profile updated!" }); setSection("overview"); refetch(); },
      onError: () => toast({ title: "Failed to update", variant: "destructive" }),
    });
  };

  const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
  const handleLogout = () => { logout(); window.location.href = basePath || "/"; };

  if (isLoading) return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
      <div className="w-7 h-7 border-2 border-[#ff6b00] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const displayName = prof?.displayName ?? prof?.username ?? authUser?.username ?? "Player";
  const kills = prof?.totalKills ?? 0;
  const wins = prof?.totalWins ?? 0;
  const played = prof?.tournamentsPlayed ?? 0;
  const earnedBadges = computeBadges({ kills, wins, played, isAdmin: authUser?.isAdmin ?? false, createdAt: prof?.createdAt });
  const earnedIds = new Set(earnedBadges.map((b) => b.id));

  const quickLinks = [
    { href: "/wallet", icon: Wallet, label: "Wallet", desc: walletBalance !== null ? `৳${Number(walletBalance).toLocaleString()}` : "View balance", color: "text-[#00ff88]", iconBg: "bg-[#00ff88]/10 border-[#00ff88]/20" },
    { href: "/dashboard", icon: Trophy, label: "Tournaments", desc: `${played} played`, color: "text-[#ff6b00]", iconBg: "bg-[#ff6b00]/10 border-[#ff6b00]/20" },
    { href: "/teams/my", icon: Shield, label: "My Team", desc: "Manage your squad", color: "text-blue-400", iconBg: "bg-blue-400/10 border-blue-400/20" },
    { href: "/dashboard", icon: History, label: "History", desc: "Registration history", color: "text-purple-400", iconBg: "bg-purple-400/10 border-purple-400/20" },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white pb-24">
      <Navbar />

      <div className="max-w-lg mx-auto px-4 pt-16 pb-6">
        <AnimatePresence mode="wait">

          {/* ── OVERVIEW ── */}
          {section === "overview" && (
            <motion.div key="overview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>

              {/* Profile Hero Card */}
              <motion.div variants={fadeUp} initial="hidden" animate="show" custom={0}
                className="relative rounded-2xl overflow-hidden border border-[#ff6b00]/20 mb-4">
                {/* Background gradient */}
                <div className="absolute inset-0 bg-gradient-to-br from-[#ff6b00]/8 via-[#12121a] to-[#0d0d16]" />
                <div className="absolute top-0 right-0 w-40 h-40 bg-[#ff6b00]/6 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-[#ffd700]/4 rounded-full translate-y-1/2 -translate-x-1/2 blur-2xl pointer-events-none" />

                <div className="relative z-10 p-5">
                  {/* Top row */}
                  <div className="flex items-start gap-4">
                    {/* Avatar */}
                    <div className="relative shrink-0">
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#ff6b00]/30 to-[#ff6b00]/10 border-2 border-[#ff6b00]/40 flex items-center justify-center shadow-[0_0_20px_rgba(255,107,0,0.2)]">
                        <User className="w-8 h-8 text-[#ff6b00]" />
                      </div>
                      {authUser?.isAdmin && (
                        <div className="absolute -top-1 -right-1 w-5 h-5 bg-[#ff6b00] rounded-full flex items-center justify-center shadow-[0_0_8px_rgba(255,107,0,0.6)]">
                          <Shield className="w-2.5 h-2.5 text-white" />
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <h1 className="text-lg font-black text-white truncate leading-tight">{displayName}</h1>
                      <p className="text-[#606070] text-xs truncate">{authUser?.email}</p>
                      {prof?.freefireNickname && (
                        <div className="flex items-center gap-1 mt-1">
                          <Flame className="w-3 h-3 text-[#ff6b00] shrink-0" />
                          <span className="text-[#ff6b00] text-xs font-bold truncate">{prof.freefireNickname}</span>
                          {prof?.freefireUid && <span className="text-[#4a4a5a] text-[10px] font-mono shrink-0">#{prof.freefireUid}</span>}
                        </div>
                      )}
                      {authUser?.isAdmin && (
                        <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase text-[#ff6b00] bg-[#ff6b00]/10 px-2 py-0.5 rounded-full mt-1 border border-[#ff6b00]/20">
                          <Shield className="w-2 h-2" /> Admin
                        </span>
                      )}
                    </div>

                    <button onClick={() => setSection("edit")}
                      className="w-8 h-8 rounded-xl bg-[#ff6b00]/10 border border-[#ff6b00]/20 flex items-center justify-center text-[#ff6b00] hover:bg-[#ff6b00]/20 transition-colors shrink-0">
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-white/[0.06]">
                    {[
                      { label: "Kills", value: kills, icon: Target, color: "text-[#ff6b00]", bg: "bg-[#ff6b00]/8" },
                      { label: "Wins", value: wins, icon: Crown, color: "text-[#ffd700]", bg: "bg-[#ffd700]/8" },
                      { label: "Played", value: played, icon: Swords, color: "text-blue-400", bg: "bg-blue-400/8" },
                    ].map((stat) => (
                      <div key={stat.label} className={`${stat.bg} rounded-xl p-2.5 text-center`}>
                        <stat.icon className={`w-3.5 h-3.5 ${stat.color} mx-auto mb-1`} />
                        <div className={`text-lg font-black ${stat.color} leading-none`}>{stat.value}</div>
                        <div className="text-[#606070] text-[9px] uppercase tracking-wide mt-0.5">{stat.label}</div>
                      </div>
                    ))}
                  </div>

                  {/* Member since + rank pill */}
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/[0.06]">
                    <span className="text-[#4a4a5a] text-[10px]">
                      Member since {prof?.createdAt ? new Date(prof.createdAt).toLocaleDateString("en-BD", { month: "short", year: "numeric" }) : "—"}
                    </span>
                    <span className="text-[10px] text-[#ff6b00] font-black bg-[#ff6b00]/10 px-2 py-0.5 rounded-full border border-[#ff6b00]/20">
                      {earnedBadges.length} Badge{earnedBadges.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                </div>
              </motion.div>

              {/* ── BADGES ── */}
              <motion.div variants={fadeUp} initial="hidden" animate="show" custom={1}
                className="bg-[#12121a] rounded-2xl border border-[#ff6b00]/15 p-4 mb-4">
                <div className="flex items-center gap-2 mb-3">
                  <Medal className="w-4 h-4 text-[#ffd700]" />
                  <h3 className="font-black uppercase text-white text-xs tracking-wide">My Badges</h3>
                  <span className="ml-auto text-[9px] text-[#606070]">{earnedBadges.length}/{ALL_BADGES.length} earned</span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {ALL_BADGES.map((badge, i) => {
                    const isEarned = earnedIds.has(badge.id);
                    return (
                      <motion.div key={badge.id} variants={fadeUp} initial="hidden" animate="show" custom={i * 0.5 + 2}
                        title={badge.desc}
                        className={`relative rounded-xl p-2.5 text-center border bg-gradient-to-br transition-all ${
                          isEarned
                            ? `${badge.color} cursor-default`
                            : "from-[#1a1a24]/50 to-[#12121a]/50 border-[#2a2a36]/50 opacity-40 grayscale"
                        }`}
                        style={isEarned ? { boxShadow: `0 0 12px ${badge.glow}30` } : {}}>
                        <div className="text-2xl leading-none mb-1">{badge.icon}</div>
                        <div className={`text-[9px] font-black uppercase tracking-wide ${isEarned ? "text-white" : "text-[#606070]"}`}>
                          {badge.label}
                        </div>
                        {!isEarned && (
                          <div className="absolute inset-0 flex items-center justify-center rounded-xl">
                            <Lock className="w-3 h-3 text-[#4a4a5a]" />
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </div>

                {earnedBadges.length === 0 && (
                  <p className="text-center text-[#4a4a5a] text-xs mt-2">Join a tournament to earn your first badge!</p>
                )}
              </motion.div>

              {/* My Match Requests button */}
              <motion.button variants={fadeUp} initial="hidden" animate="show" custom={3}
                onClick={() => setSection("my-matches")}
                className="w-full flex items-center gap-3 p-3.5 bg-[#12121a] rounded-2xl border border-[#2a2a36] hover:border-[#ff6b00]/25 transition-colors group mb-2">
                <div className="w-9 h-9 rounded-xl border bg-[#ff6b00]/10 border-[#ff6b00]/20 flex items-center justify-center shrink-0">
                  <Swords className="w-4 h-4 text-[#ff6b00]" />
                </div>
                <div className="flex-1 text-left">
                  <div className="text-white font-bold text-sm">My Match Requests</div>
                  <div className="text-[#606070] text-xs">Track pending, approved & rejected</div>
                </div>
                <ChevronRight className="w-4 h-4 text-[#606070] group-hover:text-[#a0a0b0] transition-colors" />
              </motion.button>

              {/* Quick Links */}
              <motion.div variants={fadeUp} initial="hidden" animate="show" custom={4} className="space-y-2 mb-3">
                {quickLinks.map((item) => (
                  <Link key={item.href + item.label} href={item.href}
                    className="flex items-center gap-3 p-3.5 bg-[#12121a] rounded-2xl border border-[#2a2a36] hover:border-[#ff6b00]/25 transition-colors group">
                    <div className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${item.iconBg}`}>
                      <item.icon className={`w-4 h-4 ${item.color}`} />
                    </div>
                    <div className="flex-1">
                      <div className="text-white font-bold text-sm">{item.label}</div>
                      <div className="text-[#606070] text-xs">{item.desc}</div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-[#606070] group-hover:text-[#a0a0b0] transition-colors" />
                  </Link>
                ))}
              </motion.div>

              {/* Admin Panel */}
              {authUser?.isAdmin && (
                <motion.div variants={fadeUp} initial="hidden" animate="show" custom={5}>
                  <Link href="/admin"
                    className="flex items-center gap-3 p-3.5 bg-[#ff6b00]/5 rounded-2xl border border-[#ff6b00]/20 mb-2 hover:bg-[#ff6b00]/10 transition-colors group">
                    <div className="w-9 h-9 rounded-xl bg-[#ff6b00]/15 flex items-center justify-center shrink-0">
                      <Shield className="w-4 h-4 text-[#ff6b00]" />
                    </div>
                    <div className="flex-1">
                      <div className="text-[#ff6b00] font-bold text-sm">Admin Panel</div>
                      <div className="text-[#606070] text-xs">Manage tournaments & users</div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-[#ff6b00]/60" />
                  </Link>
                </motion.div>
              )}

              {/* Logout */}
              <motion.button variants={fadeUp} initial="hidden" animate="show" custom={6}
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 py-3 mt-1 rounded-2xl border border-[#ff2244]/20 text-[#ff2244] font-bold uppercase text-xs hover:bg-[#ff2244]/5 transition-colors">
                <LogOut className="w-3.5 h-3.5" /> Sign Out
              </motion.button>
            </motion.div>
          )}

          {/* ── MY MATCHES ── */}
          {section === "my-matches" && (
            <motion.div key="matches" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25 }}>
              <div className="flex items-center gap-3 mb-5">
                <button onClick={() => setSection("overview")}
                  className="w-8 h-8 rounded-xl bg-[#12121a] border border-[#2a2a36] flex items-center justify-center text-[#a0a0b0] hover:text-white transition-colors">
                  <X className="w-3.5 h-3.5" />
                </button>
                <div className="flex-1">
                  <h2 className="font-black text-white text-base">My Match Requests</h2>
                  <p className="text-[#606070] text-xs">Your submitted match history</p>
                </div>
                <button onClick={openCreateMatch}
                  className="flex items-center gap-1 px-3 py-1.5 bg-[#ff6b00] text-white font-black uppercase rounded-xl text-xs hover:bg-[#e66000] transition-all shadow-[0_0_10px_rgba(255,107,0,0.3)] shrink-0">
                  <Plus className="w-3 h-3" /> New
                </button>
              </div>

              {myMatchesLoading ? (
                <div className="space-y-3">{[1,2,3].map((i) => <div key={i} className="h-24 bg-[#12121a] rounded-2xl animate-pulse" />)}</div>
              ) : myMatches.length === 0 ? (
                <div className="text-center py-14">
                  <Swords className="w-10 h-10 mx-auto mb-3 text-[#ff6b00]/20" />
                  <p className="font-bold text-white text-sm mb-1">No match requests yet</p>
                  <p className="text-[#a0a0b0] text-xs mb-4">Create your first match using the button above.</p>
                  <button onClick={openCreateMatch}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-[#ff6b00] text-white font-black uppercase rounded-xl text-xs hover:bg-[#e66000] transition-colors">
                    <Plus className="w-3.5 h-3.5" /> Create Match
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {myMatches.map((m: any) => {
                    const badge = matchStatusBadge(m.status === "pending_approval" ? "pending" : m.status);
                    const BadgeIcon = badge.Icon;
                    return (
                      <div key={m.id} className="bg-[#12121a] rounded-2xl border border-[#2a2a36] p-4">
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <div className="flex-1 min-w-0">
                            <div className="font-black text-white text-sm truncate">{m.matchName || `${m.matchType} Match`}</div>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <span className="text-[#606070] text-xs">
                                {new Date(m.scheduledAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                              </span>
                              {m.isPasswordProtected && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-yellow-500/10 text-yellow-400 border border-yellow-500/30">
                                  <Lock className="w-2.5 h-2.5" /> Private
                                </span>
                              )}
                            </div>
                          </div>
                          <span className={`inline-flex items-center gap-1 text-[9px] font-black uppercase px-2 py-0.5 rounded-full border shrink-0 ${badge.color}`}>
                            <BadgeIcon className="w-2.5 h-2.5" /> {badge.label}
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <div className="bg-[#0a0a0f] rounded-xl px-2.5 py-2">
                            <div className="text-[#606070] mb-0.5 text-[10px]">Prize Pool</div>
                            <div className="font-black text-[#ffd700] text-sm">৳{Number(m.prizePool).toLocaleString()}</div>
                          </div>
                          <div className="bg-[#0a0a0f] rounded-xl px-2.5 py-2">
                            <div className="text-[#606070] mb-0.5 text-[10px]">Entry Fee</div>
                            {m.status === "approved" && Number(m.entryFee) >= 0 ? (
                              <div className={`font-black text-sm ${Number(m.entryFee) > 0 ? "text-[#00ff88]" : "text-[#a0a0b0]"}`}>
                                {Number(m.entryFee) > 0 ? `৳${Number(m.entryFee).toLocaleString()}` : "Free"}
                              </div>
                            ) : <div className="font-black text-[#4a4a5a] text-sm">Pending</div>}
                          </div>
                          <div className="bg-[#0a0a0f] rounded-xl px-2.5 py-2">
                            <div className="text-[#606070] mb-0.5 text-[10px]">Players</div>
                            <div className="font-black text-white text-sm">{m.filledSlots ?? 0}/{m.maxSlots}</div>
                          </div>
                        </div>
                        {m.adminNote && (
                          <div className="mt-2 text-xs text-[#ff2244] bg-[#ff2244]/5 border border-[#ff2244]/10 rounded-lg px-2.5 py-2">Admin: {m.adminNote}</div>
                        )}
                        {m.description && <p className="text-[#4a4a5a] text-xs mt-2 italic">"{m.description}"</p>}
                        {(m.status === "pending_approval" || m.status === "rejected") && (
                          <div className="mt-3 pt-3 border-t border-[#2a2a36]">
                            {deletingMatchId === m.id ? (
                              <div>
                                <p className="text-xs text-[#ff2244] font-bold mb-2 flex items-center gap-1"><AlertTriangle className="w-3 h-3 shrink-0" /> Delete this match?</p>
                                <div className="flex gap-2">
                                  <button onClick={() => deleteMatch(m.id)} className="px-3 py-1.5 bg-[#ff2244] text-white text-xs font-black rounded-lg hover:bg-[#dd1133] transition-colors">Confirm</button>
                                  <button onClick={() => setDeletingMatchId(null)} className="px-3 py-1.5 text-[#a0a0b0] text-xs font-bold rounded-lg hover:text-white transition-colors">Cancel</button>
                                </div>
                              </div>
                            ) : (
                              <button onClick={() => setDeletingMatchId(m.id)} className="flex items-center gap-1.5 text-[#606070] text-xs font-bold hover:text-[#ff2244] transition-colors">
                                <Trash2 className="w-3 h-3" /> Delete
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}

          {/* ── EDIT PROFILE ── */}
          {section === "edit" && (
            <motion.div key="edit" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25 }}>
              <div className="flex items-center gap-3 mb-5">
                <button onClick={() => setSection("overview")}
                  className="w-8 h-8 rounded-xl bg-[#12121a] border border-[#2a2a36] flex items-center justify-center text-[#a0a0b0] hover:text-white transition-colors">
                  <X className="w-3.5 h-3.5" />
                </button>
                <div className="flex-1">
                  <h2 className="font-black text-white text-base">Edit Profile</h2>
                  <p className="text-[#606070] text-xs">Update your information</p>
                </div>
              </div>

              <div className="bg-[#12121a] rounded-2xl border border-[#2a2a36] p-4 space-y-3.5">
                {[
                  { key: "username", label: "Username", placeholder: "your_username" },
                  { key: "displayName", label: "Display Name", placeholder: "Your Name" },
                  { key: "freefireUid", label: "Free Fire UID", placeholder: "123456789" },
                  { key: "freefireNickname", label: "FF Nickname", placeholder: "ProPlayer99" },
                ].map(({ key, label, placeholder }) => (
                  <div key={key}>
                    <label className="block text-[#a0a0b0] text-[10px] uppercase tracking-wider mb-1.5">{label}</label>
                    <input
                      value={pForm[key as keyof typeof pForm]}
                      onChange={(e) => setPForm({ ...pForm, [key]: e.target.value })}
                      placeholder={placeholder}
                      className="w-full bg-[#0d0d16] border border-[#2a2a36] rounded-xl px-3.5 py-2.5 text-white placeholder-[#4a4a5a] focus:outline-none focus:border-[#ff6b00] transition-colors text-sm"
                    />
                  </div>
                ))}
                <div>
                  <label className="block text-[#a0a0b0] text-[10px] uppercase tracking-wider mb-1.5">Email</label>
                  <div className="w-full bg-[#0d0d16]/50 border border-[#2a2a36]/50 rounded-xl px-3.5 py-2.5 text-[#606070] text-sm cursor-not-allowed">{authUser?.email}</div>
                  <p className="text-[#4a4a5a] text-xs mt-1">Email cannot be changed</p>
                </div>
              </div>

              <button onClick={saveProfile} disabled={updateProfile.isPending}
                className="w-full mt-4 py-3 bg-[#ff6b00] text-white font-black uppercase text-sm rounded-2xl hover:bg-[#e66000] transition-all shadow-[0_0_20px_rgba(255,107,0,0.3)] disabled:opacity-50 disabled:cursor-not-allowed">
                {updateProfile.isPending ? "Saving…" : "Save Changes"}
              </button>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}
