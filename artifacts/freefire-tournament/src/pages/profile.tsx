import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import {
  User, Trophy, Wallet, Shield, History, ChevronRight,
  Edit, Save, X, Flame, Star, Target, Swords, Trash2,
  Clock, CheckCircle, XCircle, LogOut, AlertTriangle, Lock, Plus
} from "lucide-react";
import Navbar from "@/components/Navbar";
import { useAuthContext } from "@/lib/AuthContext";
import { useGetMyProfile, useUpdateMyProfile } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { useCreateMatch } from "@/lib/CreateMatchContext";

type Section = "overview" | "edit" | "my-matches";

function matchStatusBadge(status: string) {
  if (status === "approved")
    return { label: "Approved", color: "text-[#00ff88] bg-[#00ff88]/10 border-[#00ff88]/30", Icon: CheckCircle };
  if (status === "rejected")
    return { label: "Rejected", color: "text-[#ff2244] bg-[#ff2244]/10 border-[#ff2244]/30", Icon: XCircle };
  return { label: "Pending Review", color: "text-yellow-400 bg-yellow-400/10 border-yellow-400/30", Icon: Clock };
}

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

  const [pForm, setPForm] = useState({
    username: "", displayName: "", freefireUid: "", freefireNickname: ""
  });

  useEffect(() => {
    if (!isLoading && !authUser) setLocation("/sign-in");
  }, [isLoading, authUser]);

  useEffect(() => {
    if (prof) {
      setPForm({
        username: prof.username ?? "",
        displayName: prof.displayName ?? "",
        freefireUid: prof.freefireUid ?? "",
        freefireNickname: prof.freefireNickname ?? "",
      });
    }
  }, [prof]);

  useEffect(() => {
    if (authUser) {
      authFetch("/wallet/balance").then(async (res) => {
        if (res.ok) {
          const data = await res.json();
          setWalletBalance(data.balance ?? 0);
        }
      }).catch(() => {});
    }
  }, [authUser]);

  const loadMyMatches = async () => {
    setMyMatchesLoading(true);
    try {
      const res = await authFetch("/user-matches/mine");
      if (res.ok) setMyMatches(await res.json());
      else setMyMatches([]);
    } catch {
      setMyMatches([]);
    } finally {
      setMyMatchesLoading(false);
    }
  };

  const deleteMatch = async (id: number) => {
    try {
      const res = await authFetch(`/user-matches/${id}`, { method: "DELETE" });
      if (res.ok) {
        setMyMatches((prev) => prev.filter((m) => m.id !== id));
        setDeletingMatchId(null);
        toast({ title: "Match request deleted" });
      } else {
        const data = await res.json().catch(() => ({}));
        toast({ title: "Cannot delete", description: data.error ?? "Error deleting match", variant: "destructive" });
        setDeletingMatchId(null);
      }
    } catch {
      toast({ title: "Connection error", variant: "destructive" });
    }
  };

  useEffect(() => {
    if (section === "my-matches" && authUser) loadMyMatches();
  }, [section, authUser]);

  const saveProfile = async () => {
    updateProfile.mutate(
      { data: pForm },
      {
        onSuccess: () => {
          toast({ title: "Profile updated successfully!" });
          setSection("overview");
          refetch();
        },
        onError: () => toast({ title: "Failed to update profile", variant: "destructive" }),
      }
    );
  };

  const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

  const handleLogout = () => {
    logout();
    window.location.href = basePath || "/";
  };

  if (isLoading) return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-[#ff6b00] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const displayName = prof?.displayName ?? prof?.username ?? authUser?.username ?? "Player";

  const quickLinks = [
    {
      href: "/wallet", icon: Wallet, label: "Wallet",
      desc: walletBalance !== null ? `৳${Number(walletBalance).toLocaleString()}` : "View balance",
      color: "text-[#00ff88]", iconBg: "bg-[#00ff88]/10 border-[#00ff88]/20"
    },
    {
      href: "/dashboard", icon: Trophy, label: "My Tournaments",
      desc: `${authUser?.tournamentsPlayed ?? 0} played`,
      color: "text-[#ff6b00]", iconBg: "bg-[#ff6b00]/10 border-[#ff6b00]/20"
    },
    {
      href: "/teams/my", icon: Shield, label: "My Team",
      desc: "Manage your squad",
      color: "text-blue-400", iconBg: "bg-blue-400/10 border-blue-400/20"
    },
    {
      href: "/dashboard", icon: History, label: "History",
      desc: "Registration history",
      color: "text-purple-400", iconBg: "bg-purple-400/10 border-purple-400/20"
    },
  ];

  const BackButton = () => (
    <button
      onClick={() => setSection("overview")}
      className="w-9 h-9 rounded-xl bg-[#12121a] border border-[#2a2a36] flex items-center justify-center text-[#a0a0b0] hover:text-white transition-colors mb-6"
    >
      <X className="w-4 h-4" />
    </button>
  );

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white pb-24">
      <Navbar />

      <div className="max-w-lg mx-auto px-4 pt-16 pb-6">

        {/* ── OVERVIEW ─────────────────────────────────────────── */}
        {section === "overview" && (
          <>
            {/* Profile Card */}
            <div className="relative bg-gradient-to-br from-[#12121a] to-[#0d0d16] rounded-3xl border border-[#ff6b00]/20 p-6 mb-4 overflow-hidden">
              <div className="absolute top-0 right-0 w-48 h-48 bg-[#ff6b00]/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
              <div className="relative z-10">
                <div className="flex items-start gap-4">
                  <div className="relative shrink-0">
                    <div className="w-20 h-20 rounded-2xl bg-[#ff6b00]/20 border-2 border-[#ff6b00]/50 flex items-center justify-center">
                      <User className="w-10 h-10 text-[#ff6b00]" />
                    </div>
                    {authUser?.isAdmin && (
                      <div className="absolute -top-1 -right-1 w-6 h-6 bg-[#ff6b00] rounded-full flex items-center justify-center">
                        <Shield className="w-3 h-3 text-white" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0 overflow-hidden">
                    <h1 className="text-xl font-black text-white truncate">{displayName}</h1>
                    <p className="text-[#a0a0b0] text-sm truncate">{authUser?.email}</p>
                    {prof?.freefireNickname && (
                      <div className="flex items-center gap-1.5 mt-1.5 min-w-0">
                        <Flame className="w-3.5 h-3.5 text-[#ff6b00] shrink-0" />
                        <span className="text-[#ff6b00] text-sm font-bold truncate">{prof.freefireNickname}</span>
                        {prof?.freefireUid && (
                          <span className="text-[#606070] text-xs font-mono shrink-0">#{prof.freefireUid}</span>
                        )}
                      </div>
                    )}
                    {!prof?.freefireNickname && prof?.freefireUid && (
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <Flame className="w-3.5 h-3.5 text-[#ff6b00] shrink-0" />
                        <span className="text-[#606070] text-xs font-mono">UID: {prof.freefireUid}</span>
                      </div>
                    )}
                    {authUser?.isAdmin && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase text-[#ff6b00] bg-[#ff6b00]/10 px-2 py-0.5 rounded-full mt-1 border border-[#ff6b00]/20">
                        <Shield className="w-2.5 h-2.5" /> Admin
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => setSection("edit")}
                    className="w-9 h-9 rounded-xl bg-[#ff6b00]/10 border border-[#ff6b00]/20 flex items-center justify-center text-[#ff6b00] hover:bg-[#ff6b00]/20 transition-colors shrink-0"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-[#ff6b00]/10">
                  {[
                    { label: "Kills", value: prof?.totalKills ?? 0, icon: Target, color: "text-[#ff6b00]" },
                    { label: "Wins", value: prof?.totalWins ?? 0, icon: Star, color: "text-[#ffd700]" },
                    { label: "Played", value: prof?.tournamentsPlayed ?? 0, icon: Swords, color: "text-blue-400" },
                  ].map((stat) => (
                    <div key={stat.label} className="text-center">
                      <stat.icon className={`w-4 h-4 ${stat.color} mx-auto mb-1`} />
                      <div className={`text-xl font-black ${stat.color}`}>{stat.value}</div>
                      <div className="text-[#606070] text-xs uppercase">{stat.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Member Since */}
            <div className="bg-[#12121a] rounded-2xl border border-[#2a2a36] px-4 py-3 mb-4 flex items-center justify-between">
              <span className="text-[#a0a0b0] text-sm">Member Since</span>
              <span className="text-white font-bold text-sm">
                {prof?.createdAt
                  ? new Date(prof.createdAt).toLocaleDateString("en-BD", { day: "numeric", month: "long", year: "numeric" })
                  : "—"}
              </span>
            </div>

            {/* My Match Requests */}
            <button
              onClick={() => setSection("my-matches")}
              className="w-full flex items-center gap-3 p-4 bg-[#12121a] rounded-2xl border border-[#2a2a36] hover:border-[#ff6b00]/20 transition-colors group mb-2"
            >
              <div className="w-11 h-11 rounded-xl border bg-[#ff6b00]/10 border-[#ff6b00]/20 flex items-center justify-center shrink-0">
                <Swords className="w-5 h-5 text-[#ff6b00]" />
              </div>
              <div className="flex-1 text-left">
                <div className="text-white font-bold text-sm">My Match Requests</div>
                <div className="text-[#606070] text-xs">Track pending, approved & rejected</div>
              </div>
              <ChevronRight className="w-4 h-4 text-[#606070] group-hover:text-[#a0a0b0] transition-colors" />
            </button>

            {/* Quick Links */}
            <div className="space-y-2 mb-4">
              {quickLinks.map((item) => (
                <Link
                  key={item.href + item.label}
                  href={item.href}
                  className="flex items-center gap-3 p-4 bg-[#12121a] rounded-2xl border border-[#2a2a36] hover:border-[#ff6b00]/20 transition-colors group"
                >
                  <div className={`w-11 h-11 rounded-xl border flex items-center justify-center shrink-0 ${item.iconBg}`}>
                    <item.icon className={`w-5 h-5 ${item.color}`} />
                  </div>
                  <div className="flex-1">
                    <div className="text-white font-bold text-sm">{item.label}</div>
                    <div className="text-[#606070] text-xs">{item.desc}</div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#606070] group-hover:text-[#a0a0b0] transition-colors" />
                </Link>
              ))}
            </div>

            {/* Admin Panel link */}
            {authUser?.isAdmin && (
              <Link
                href="/admin"
                className="flex items-center gap-3 p-4 bg-[#ff6b00]/5 rounded-2xl border border-[#ff6b00]/20 mb-2 hover:bg-[#ff6b00]/10 transition-colors group"
              >
                <div className="w-11 h-11 rounded-xl bg-[#ff6b00]/10 flex items-center justify-center shrink-0">
                  <Shield className="w-5 h-5 text-[#ff6b00]" />
                </div>
                <div className="flex-1">
                  <div className="text-[#ff6b00] font-bold text-sm">Admin Panel</div>
                  <div className="text-[#606070] text-xs">Manage tournaments, users & more</div>
                </div>
                <ChevronRight className="w-4 h-4 text-[#ff6b00]/60" />
              </Link>
            )}

            {/* Logout */}
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 py-4 mt-2 rounded-2xl border border-[#ff2244]/20 text-[#ff2244] font-bold uppercase text-sm hover:bg-[#ff2244]/5 transition-colors"
            >
              <LogOut className="w-4 h-4" /> Sign Out
            </button>
          </>
        )}

        {/* ── MY MATCH REQUESTS ────────────────────────────────── */}
        {section === "my-matches" && (
          <div>
            <div className="flex items-center gap-3 mb-6">
              <BackButton />
              <div className="-mt-6 flex-1">
                <h2 className="font-black text-white text-lg">My Match Requests</h2>
                <p className="text-[#a0a0b0] text-xs">Your submitted match history</p>
              </div>
              <button
                onClick={openCreateMatch}
                className="-mt-6 flex items-center gap-1.5 px-3 py-2 bg-[#ff6b00] text-white font-black uppercase rounded-xl text-xs hover:bg-[#e66000] transition-all shadow-[0_0_12px_rgba(255,107,0,0.3)] shrink-0"
              >
                <Plus className="w-3.5 h-3.5" /> New Match
              </button>
            </div>

            {myMatchesLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-28 bg-[#12121a] rounded-2xl animate-pulse" />
                ))}
              </div>
            ) : myMatches.length === 0 ? (
              <div className="text-center py-16">
                <Swords className="w-12 h-12 mx-auto mb-3 text-[#ff6b00]/20" />
                <p className="font-bold text-white mb-1">No match requests yet</p>
                <p className="text-[#a0a0b0] text-sm mb-5">Create your first match using the button above.</p>
                <button
                  onClick={openCreateMatch}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#ff6b00] text-white font-black uppercase rounded-xl text-sm hover:bg-[#e66000] transition-colors"
                >
                  <Plus className="w-4 h-4" /> Create Match
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {myMatches.map((m: any) => {
                  const badge = matchStatusBadge(m.status === "pending_approval" ? "pending" : m.status);
                  const BadgeIcon = badge.Icon;
                  return (
                    <div key={m.id} className="bg-[#12121a] rounded-2xl border border-[#2a2a36] p-4">
                      {/* Header row */}
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="flex-1 min-w-0">
                          <div className="font-black text-white text-sm truncate">{m.matchName || `${m.matchType} Match`}</div>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <span className="text-[#606070] text-xs">
                              {new Date(m.scheduledAt).toLocaleDateString(undefined, {
                                month: "short", day: "numeric", year: "numeric",
                                hour: "2-digit", minute: "2-digit",
                              })}
                            </span>
                            {m.isPasswordProtected && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-yellow-500/10 text-yellow-400 border border-yellow-500/30">
                                <Lock className="w-2.5 h-2.5" /> Private
                              </span>
                            )}
                          </div>
                        </div>
                        <span className={`inline-flex items-center gap-1 text-[10px] font-black uppercase px-2 py-0.5 rounded-full border shrink-0 ${badge.color}`}>
                          <BadgeIcon className="w-2.5 h-2.5" />
                          {badge.label}
                        </span>
                      </div>

                      {/* Stats row */}
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div className="bg-[#0a0a0f] rounded-xl px-3 py-2">
                          <div className="text-[#606070] mb-0.5">Prize Pool</div>
                          <div className="font-black text-[#ffd700]">৳{Number(m.prizePool).toLocaleString()}</div>
                        </div>
                        <div className="bg-[#0a0a0f] rounded-xl px-3 py-2">
                          <div className="text-[#606070] mb-0.5">Entry Fee</div>
                          {m.status === "approved" && Number(m.entryFee) >= 0 ? (
                            <div className={`font-black ${Number(m.entryFee) > 0 ? "text-[#00ff88]" : "text-[#a0a0b0]"}`}>
                              {Number(m.entryFee) > 0 ? `৳${Number(m.entryFee).toLocaleString()}` : "Free"}
                            </div>
                          ) : (
                            <div className="font-black text-[#4a4a5a]">Pending</div>
                          )}
                        </div>
                        <div className="bg-[#0a0a0f] rounded-xl px-3 py-2">
                          <div className="text-[#606070] mb-0.5">Players</div>
                          <div className="font-black text-white">{m.filledSlots ?? 0}/{m.maxSlots}</div>
                        </div>
                      </div>

                      {/* Admin note */}
                      {m.adminNote && (
                        <div className="mt-2 text-xs text-[#ff2244] bg-[#ff2244]/5 border border-[#ff2244]/10 rounded-lg px-3 py-2">
                          Admin: {m.adminNote}
                        </div>
                      )}

                      {/* Description */}
                      {m.description && (
                        <p className="text-[#4a4a5a] text-xs mt-2 italic">"{m.description}"</p>
                      )}

                      {/* Delete button — only for pending/rejected */}
                      {(m.status === "pending_approval" || m.status === "rejected") && (
                        <div className="mt-3 pt-3 border-t border-[#2a2a36]">
                          {deletingMatchId === m.id ? (
                            <div>
                              <p className="text-xs text-[#ff2244] font-bold mb-2 flex items-center gap-1.5">
                                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                                Are you sure you want to delete this match request?
                              </p>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => deleteMatch(m.id)}
                                  className="px-3 py-1.5 bg-[#ff2244] text-white text-xs font-black rounded-lg hover:bg-[#dd1133] transition-colors"
                                >
                                  Confirm Delete
                                </button>
                                <button
                                  onClick={() => setDeletingMatchId(null)}
                                  className="px-3 py-1.5 text-[#a0a0b0] text-xs font-bold rounded-lg hover:text-white transition-colors"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button
                              onClick={() => setDeletingMatchId(m.id)}
                              className="flex items-center gap-1.5 text-[#606070] text-xs font-bold hover:text-[#ff2244] transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" /> Delete Request
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── EDIT PROFILE ─────────────────────────────────────── */}
        {section === "edit" && (
          <div>
            <div className="flex items-center gap-3 mb-6">
              <BackButton />
              <div className="-mt-6">
                <h2 className="font-black text-white text-lg">Edit Profile</h2>
                <p className="text-[#a0a0b0] text-xs">Update your information</p>
              </div>
            </div>

            <div className="bg-[#12121a] rounded-3xl border border-[#2a2a36] p-5 space-y-4">
              {[
                { key: "username", label: "Username", placeholder: "your_username" },
                { key: "displayName", label: "Display Name", placeholder: "Your Full Name" },
                { key: "freefireUid", label: "Free Fire UID", placeholder: "123456789" },
                { key: "freefireNickname", label: "FF Nickname", placeholder: "ProPlayer99" },
              ].map(({ key, label, placeholder }) => (
                <div key={key}>
                  <label className="block text-[#a0a0b0] text-xs uppercase tracking-wider mb-2">{label}</label>
                  <input
                    value={pForm[key as keyof typeof pForm]}
                    onChange={(e) => setPForm({ ...pForm, [key]: e.target.value })}
                    placeholder={placeholder}
                    className="w-full bg-[#0d0d16] border border-[#2a2a36] rounded-xl px-4 py-3 text-white placeholder-[#606070] focus:outline-none focus:border-[#ff6b00] transition-colors text-sm"
                  />
                </div>
              ))}

              <div className="pt-2">
                <label className="block text-[#a0a0b0] text-xs uppercase tracking-wider mb-2">Email</label>
                <div className="w-full bg-[#0d0d16]/50 border border-[#2a2a36]/50 rounded-xl px-4 py-3 text-[#606070] text-sm cursor-not-allowed">
                  {authUser?.email}
                </div>
                <p className="text-[#606070] text-xs mt-1">Email cannot be changed</p>
              </div>
            </div>

            <button
              onClick={saveProfile}
              disabled={updateProfile.isPending}
              className="w-full mt-4 flex items-center justify-center gap-2 py-4 bg-[#ff6b00] text-white font-black uppercase rounded-2xl hover:bg-[#e66000] transition-colors disabled:opacity-50 text-sm"
            >
              <Save className="w-4 h-4" />
              {updateProfile.isPending ? "Saving..." : "Save Changes"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
