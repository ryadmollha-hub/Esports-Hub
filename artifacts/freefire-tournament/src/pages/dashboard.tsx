import React, { useEffect, useState, useCallback } from "react";
import { useLocation, Link } from "wouter";
import {
  Trophy, Shield, Clock, CheckCircle, XCircle,
  Edit, Save, X, ArrowDownCircle, ArrowUpCircle, User,
  Key, EyeOff, Eye, BarChart2, Swords, Star, Copy
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useGetMyRegistrations, useGetMyTeam, useGetMyProfile, useUpdateMyProfile } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { useAuthContext } from "@/lib/AuthContext";
import { useLanguage } from "@/lib/LanguageContext";
import { apiBase as BASE } from "@/lib/apiBase";

type DashTab = "profile" | "tournaments" | "team" | "deposits" | "withdrawals";

const statusColors: Record<string, string> = {
  approved: "text-[#00ff88] bg-[#00ff88]/10 border-[#00ff88]/30",
  rejected: "text-[#ff2244] bg-[#ff2244]/10 border-[#ff2244]/30",
  pending: "text-yellow-400 bg-yellow-400/10 border-yellow-400/30",
};

const statusIcon: Record<string, React.ReactElement> = {
  approved: <CheckCircle className="w-3.5 h-3.5" />,
  rejected: <XCircle className="w-3.5 h-3.5" />,
  pending: <Clock className="w-3.5 h-3.5" />,
};

export default function DashboardPage() {
  const { user: authUser, isLoading, authFetch } = useAuthContext();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<DashTab>("profile");

  useEffect(() => {
    if (!isLoading && !authUser) setLocation("/sign-in");
  }, [isLoading, authUser]);

  const { data: registrations = [], isLoading: loadingRegs } = useGetMyRegistrations();
  const { data: myTeam } = useGetMyTeam();
  const { data: profile } = useGetMyProfile();
  const updateProfile = useUpdateMyProfile();

  const team = myTeam as any;
  const regs = registrations as any[];
  const prof = profile as any;

  const [walletTxs, setWalletTxs] = useState<any[]>([]);
  const [loadingWallet, setLoadingWallet] = useState(false);
  const [matchesByTournament, setMatchesByTournament] = useState<Record<number, any[]>>({});
  const [roomPassVisible, setRoomPassVisible] = useState<Record<string, boolean>>({});

  const fetchMatchesForTournament = useCallback(async (tournamentId: number) => {
    try {
      const res = await fetch(`${BASE}/api/tournaments/${tournamentId}/matches`);
      if (res.ok) {
        const data = await res.json();
        setMatchesByTournament((prev) => ({ ...prev, [tournamentId]: data }));
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (activeTab === "tournaments" && regs.length > 0) {
      const approvedRegs = regs.filter((r: any) => r.status === "approved");
      approvedRegs.forEach((r: any) => {
        if (!matchesByTournament[r.tournamentId]) {
          fetchMatchesForTournament(r.tournamentId);
        }
      });
    }
  }, [activeTab, regs]);

  const [editing, setEditing] = useState(false);
  const [pForm, setPForm] = useState({ username: "", displayName: "", freefireUid: "", freefireNickname: "" });

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

  const loadWallet = async () => {
    setLoadingWallet(true);
    try {
      const res = await authFetch("/wallet/my-transactions");
      if (res.ok) setWalletTxs(await res.json());
    } catch {} finally { setLoadingWallet(false); }
  };

  useEffect(() => {
    if (activeTab === "deposits" || activeTab === "withdrawals") loadWallet();
  }, [activeTab]);

  const saveProfile = async () => {
    updateProfile.mutate(
      { data: pForm },
      {
        onSuccess: () => { toast({ title: "Profile updated" }); setEditing(false); },
        onError: () => toast({ title: "Failed to update profile", variant: "destructive" }),
      }
    );
  };

  const approved = regs.filter((r) => r.status === "approved").length;
  const pending = regs.filter((r) => r.status === "pending").length;
  const deposits = walletTxs.filter((t) => t.type === "deposit");
  const withdrawals = walletTxs.filter((t) => t.type === "withdraw");

  const dashTabs: { id: DashTab; label: string; icon: any }[] = [
    { id: "profile", label: t("dash_profile"), icon: User },
    { id: "tournaments", label: t("dash_tournaments"), icon: Trophy },
    { id: "team", label: t("dash_team"), icon: Shield },
    { id: "deposits", label: t("dash_deposits"), icon: ArrowDownCircle },
    { id: "withdrawals", label: t("dash_withdrawals"), icon: ArrowUpCircle },
  ];

  const txStatusBadge = (status: string) => (
    <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded border uppercase ${statusColors[status] ?? statusColors.pending}`}>
      {statusIcon[status]} {status}
    </span>
  );

  if (isLoading) return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
      <div className="text-[#a0a0b0] animate-pulse">Loading...</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white pb-24">
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 pt-16 pb-6">

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-5">
          <div className="w-12 h-12 rounded-full bg-[#ff6b00]/20 border-2 border-[#ff6b00] flex items-center justify-center shrink-0">
            <User className="w-6 h-6 text-[#ff6b00]" />
          </div>
          <div>
            <h1 className="text-xl font-black">
              Welcome, <span className="text-[#ff6b00]">{prof?.displayName ?? prof?.username ?? authUser?.username ?? "Player"}</span>
            </h1>
            <p className="text-[#a0a0b0] text-xs">{authUser?.email}</p>
            {prof?.freefireNickname && <p className="text-[#a0a0b0] text-xs">FF: {prof.freefireNickname} <span className="font-mono">({prof.freefireUid})</span></p>}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 mb-5">
          {[
            { label: "Registered", value: regs.length, icon: Trophy, color: "text-[#ff6b00]" },
            { label: "Approved", value: approved, icon: CheckCircle, color: "text-[#00ff88]" },
            { label: "Pending", value: pending, icon: Clock, color: "text-yellow-400" },
            { label: "Team", value: team ? "Active" : "None", icon: Shield, color: team ? "text-[#ff6b00]" : "text-[#a0a0b0]" },
          ].map((stat) => (
            <div key={stat.label} className="bg-[#12121a] rounded-xl border border-[#ff6b00]/10 p-3">
              <stat.icon className={`w-4 h-4 ${stat.color} mb-1.5`} />
              <div className={`text-xl font-black ${stat.color}`}>{stat.value}</div>
              <div className="text-[#a0a0b0] text-xs mt-0.5">{stat.label}</div>
            </div>
          ))}
        </div>

        <div className="flex gap-1 overflow-x-auto pb-1 mb-4">
          {dashTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold uppercase whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? "bg-[#ff6b00]/15 text-[#ff6b00] border border-[#ff6b00]/30"
                  : "text-[#a0a0b0] hover:text-white bg-[#12121a] border border-transparent"
              }`}
            >
              <tab.icon className="w-3.5 h-3.5" /> {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "profile" && (
          <div className="bg-[#12121a] rounded-xl border border-[#ff6b00]/10 p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-black uppercase">My <span className="text-[#ff6b00]">Profile</span></h2>
              {!editing ? (
                <button onClick={() => setEditing(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-[#ff6b00]/10 border border-[#ff6b00]/30 text-[#ff6b00] text-xs font-bold rounded-lg hover:bg-[#ff6b00]/20 transition-colors">
                  <Edit className="w-3.5 h-3.5" /> Edit Profile
                </button>
              ) : (
                <div className="flex gap-1.5">
                  <button onClick={saveProfile} disabled={updateProfile.isPending} className="flex items-center gap-1.5 px-3 py-1.5 bg-[#ff6b00] text-white text-xs font-bold rounded-lg hover:bg-[#e66000] transition-colors disabled:opacity-50">
                    <Save className="w-3.5 h-3.5" /> Save
                  </button>
                  <button onClick={() => { setEditing(false); if (prof) setPForm({ username: prof.username ?? "", displayName: prof.displayName ?? "", freefireUid: prof.freefireUid ?? "", freefireNickname: prof.freefireNickname ?? "" }); }} className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1a1a24] text-[#a0a0b0] text-xs font-bold rounded-lg hover:text-white transition-colors">
                    <X className="w-3.5 h-3.5" /> Cancel
                  </button>
                </div>
              )}
            </div>

            {editing ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[
                  { key: "username", label: "Username", placeholder: "your_username" },
                  { key: "displayName", label: "Display Name", placeholder: "Your Name" },
                  { key: "freefireUid", label: "Free Fire UID", placeholder: "123456789" },
                  { key: "freefireNickname", label: "Free Fire Nickname", placeholder: "ProPlayer99" },
                ].map(({ key, label, placeholder }) => (
                  <div key={key}>
                    <label className="block text-[#a0a0b0] text-xs uppercase tracking-wider mb-1">{label}</label>
                    <input
                      value={pForm[key as keyof typeof pForm]}
                      onChange={(e) => setPForm({ ...pForm, [key]: e.target.value })}
                      placeholder={placeholder}
                      className="w-full bg-[#1a1a24] border border-[#2a2a36] rounded-xl px-3 py-2 text-white placeholder-[#a0a0b0] focus:outline-none focus:border-[#ff6b00] transition-colors text-sm"
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                {[
                  { label: "Username", value: prof?.username ?? "Not set" },
                  { label: "Display Name", value: prof?.displayName ?? "Not set" },
                  { label: "Email", value: authUser?.email ?? "Not set" },
                  { label: "Free Fire UID", value: prof?.freefireUid ?? "Not set" },
                  { label: "FF Nickname", value: prof?.freefireNickname ?? "Not set" },
                  { label: "Member Since", value: prof?.createdAt ? new Date(prof.createdAt).toLocaleDateString() : "—" },
                  { label: "Total Kills", value: prof?.totalKills ?? 0 },
                  { label: "Total Wins", value: prof?.totalWins ?? 0 },
                ].map(({ label, value }) => (
                  <div key={label} className="border border-[#2a2a36] rounded-lg p-2.5">
                    <div className="text-[#a0a0b0] text-[10px] uppercase tracking-wider mb-0.5">{label}</div>
                    <div className="text-white font-medium text-sm">{value}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "tournaments" && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-black uppercase">My <span className="text-[#ff6b00]">Tournaments</span></h2>
              <Link href="/tournaments" className="text-[#ff6b00] text-sm font-bold hover:underline">Browse More →</Link>
            </div>
            {loadingRegs ? (
              <div className="space-y-4">{[1,2].map((i) => <div key={i} className="h-32 bg-[#12121a] rounded-xl animate-pulse" />)}</div>
            ) : regs.length === 0 ? (
              <div className="bg-[#12121a] rounded-xl border border-[#ff6b00]/10 p-10 text-center">
                <Trophy className="w-10 h-10 mx-auto mb-3 text-[#ff6b00]/30" />
                <p className="text-[#a0a0b0] mb-4">No tournament registrations yet</p>
                <Link href="/tournaments" className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#ff6b00] text-white font-bold uppercase text-sm rounded-xl hover:bg-[#e66000] transition-all">Browse Tournaments</Link>
              </div>
            ) : (
              <div className="space-y-4">
                {regs.map((reg: any) => {
                  const tId = reg.tournamentId;
                  const tMatches: any[] = matchesByTournament[tId] ?? [];
                  const tName = reg.tournament?.name ?? `Tournament #${tId}`;
                  const tPrize = reg.tournament?.prizePool;
                  const visibleMatches = tMatches.filter((m: any) => m.roomVisible || m.roomId);

                  return (
                    <div key={reg.id} className="bg-[#12121a] rounded-xl border border-[#ff6b00]/10 hover:border-[#ff6b00]/25 transition-colors overflow-hidden">
                      {/* Header */}
                      <div className="p-4 flex items-start gap-3">
                        <div className="w-9 h-9 rounded-lg bg-[#ff6b00]/15 border border-[#ff6b00]/20 flex items-center justify-center shrink-0 mt-0.5">
                          <Trophy className="w-4.5 h-4.5 text-[#ff6b00]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <Link href={`/tournaments/${tId}`} className="font-black text-white hover:text-[#ff6b00] transition-colors truncate block text-sm">
                            {tName}
                          </Link>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <span className="text-[#a0a0b0] text-[10px] font-mono">UID: {reg.freefireUid}</span>
                            {tMatches.length > 0 && tMatches.map((m: any) => (
                              <span key={m.id} className="text-[10px] font-black px-1.5 py-0.5 rounded border bg-[#ff6b00]/10 text-[#ff6b00] border-[#ff6b00]/20">
                                Match #{m.matchNumber}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="shrink-0">{txStatusBadge(reg.status)}</div>
                      </div>

                      {/* Match Action Links — only for approved registrations */}
                      {reg.status === "approved" && (
                        <div className="border-t border-[#ff6b00]/8 px-4 pb-4">
                          {/* Room Credentials */}
                          {visibleMatches.length > 0 ? visibleMatches.map((m: any) => (
                            <div key={m.id} className="mt-3 bg-[#0a0a14] rounded-xl border border-[#00ff88]/20 p-3">
                              <div className="flex items-center gap-1.5 mb-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#00ff88] animate-pulse" />
                                <span className="text-[#00ff88] text-[10px] font-black uppercase tracking-wider">Match #{m.matchNumber} — Room Open</span>
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <div className="bg-[#12121a] rounded-lg p-2">
                                  <div className="text-[#606070] text-[9px] uppercase mb-0.5 flex items-center gap-1"><Key className="w-2.5 h-2.5" /> Room ID</div>
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-white font-mono font-bold text-xs">{m.roomId}</span>
                                    <button onClick={() => navigator.clipboard.writeText(m.roomId)} className="text-[#606070] hover:text-[#ff6b00] transition-colors shrink-0">
                                      <Copy className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>
                                <div className="bg-[#12121a] rounded-lg p-2">
                                  <div className="text-[#606070] text-[9px] uppercase mb-0.5 flex items-center justify-between">
                                    <span className="flex items-center gap-1"><Key className="w-2.5 h-2.5" /> Password</span>
                                    <button onClick={() => setRoomPassVisible(prev => ({ ...prev, [m.id]: !prev[m.id] }))} className="text-[#606070] hover:text-[#ff6b00] transition-colors">
                                      {roomPassVisible[m.id] ? <EyeOff className="w-2.5 h-2.5" /> : <Eye className="w-2.5 h-2.5" />}
                                    </button>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-white font-mono font-bold text-xs">
                                      {roomPassVisible[m.id] ? m.roomPassword : "••••••"}
                                    </span>
                                    {roomPassVisible[m.id] && (
                                      <button onClick={() => navigator.clipboard.writeText(m.roomPassword)} className="text-[#606070] hover:text-[#ff6b00] transition-colors shrink-0">
                                        <Copy className="w-3 h-3" />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )) : (
                            <div className="mt-3 bg-[#0a0a14] rounded-xl border border-[#2a2a36] p-3 text-center">
                              <Key className="w-4 h-4 text-[#404050] mx-auto mb-1" />
                              <p className="text-[#606070] text-[10px]">Room credentials will appear here when released</p>
                            </div>
                          )}

                          {/* Quick action links */}
                          <div className="grid grid-cols-3 gap-2 mt-3">
                            <Link
                              href={`/tournaments/${tId}`}
                              className="flex flex-col items-center gap-1 p-2.5 bg-[#1a1a24] hover:bg-[#ff6b00]/10 border border-[#2a2a36] hover:border-[#ff6b00]/30 rounded-xl transition-all group"
                            >
                              <BarChart2 className="w-4 h-4 text-[#a0a0b0] group-hover:text-[#ff6b00] transition-colors" />
                              <span className="text-[9px] text-[#a0a0b0] group-hover:text-white font-bold uppercase">Leaderboard</span>
                            </Link>
                            <Link
                              href={`/tournaments/${tId}`}
                              className="flex flex-col items-center gap-1 p-2.5 bg-[#1a1a24] hover:bg-[#ffd700]/10 border border-[#2a2a36] hover:border-[#ffd700]/30 rounded-xl transition-all group"
                            >
                              <Trophy className="w-4 h-4 text-[#a0a0b0] group-hover:text-[#ffd700] transition-colors" />
                              <span className="text-[9px] text-[#a0a0b0] group-hover:text-white font-bold uppercase">
                                {tPrize ? `৳${Number(tPrize).toLocaleString()}` : "Prize Pool"}
                              </span>
                            </Link>
                            <Link
                              href={`/tournaments/${tId}`}
                              className="flex flex-col items-center gap-1 p-2.5 bg-[#1a1a24] hover:bg-[#00ff88]/10 border border-[#2a2a36] hover:border-[#00ff88]/30 rounded-xl transition-all group"
                            >
                              <Swords className="w-4 h-4 text-[#a0a0b0] group-hover:text-[#00ff88] transition-colors" />
                              <span className="text-[9px] text-[#a0a0b0] group-hover:text-white font-bold uppercase">Match Stats</span>
                            </Link>
                          </div>
                        </div>
                      )}

                      {/* Pending/rejected notice */}
                      {reg.status !== "approved" && (
                        <div className="border-t border-[#2a2a36] px-4 pb-3 pt-2">
                          <p className="text-[#606070] text-[10px]">
                            {reg.status === "pending" ? "⏳ Registration pending approval — match access will unlock once approved." : "❌ Registration rejected."}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === "team" && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-black uppercase">Team <span className="text-[#ff6b00]">History</span></h2>
              <Link href="/teams/my" className="text-[#ff6b00] text-sm font-bold hover:underline">Manage Team →</Link>
            </div>
            {team ? (
              <div className="bg-[#12121a] rounded-xl border border-[#ff6b00]/20 p-6">
                <div className="flex items-center gap-4 mb-4">
                  <Shield className="w-12 h-12 text-[#ff6b00]" />
                  <div>
                    <div className="font-black text-white text-xl">{team.name}</div>
                    {team.tag && <div className="text-[#a0a0b0] text-sm">[{team.tag}]</div>}
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { label: "Total Wins", value: team.totalWins ?? 0 },
                    { label: "Total Kills", value: team.totalKills ?? 0 },
                    { label: "Members", value: team.members?.filter((m: any) => m.status === "active").length ?? 0 },
                    { label: "Status", value: "Active" },
                  ].map(({ label, value }) => (
                    <div key={label} className="border border-[#2a2a36] rounded-xl p-3 text-center">
                      <div className="text-[#ff6b00] font-black text-xl">{value}</div>
                      <div className="text-[#a0a0b0] text-xs uppercase mt-1">{label}</div>
                    </div>
                  ))}
                </div>
                {team.members && team.members.length > 0 && (
                  <div className="mt-4">
                    <h3 className="text-sm font-black uppercase text-[#a0a0b0] mb-2">Members</h3>
                    <div className="space-y-2">
                      {team.members.map((m: any) => (
                        <div key={m.id} className="flex items-center justify-between bg-[#1a1a24] rounded-lg px-3 py-2">
                          <span className="text-white text-sm">{m.playerName ?? m.userId}</span>
                          <div className="flex gap-2">
                            <span className="text-xs text-[#a0a0b0] capitalize">{m.role}</span>
                            <span className={`text-xs px-2 py-0.5 rounded font-bold uppercase ${m.status === "active" ? "text-[#00ff88] bg-[#00ff88]/10" : "text-yellow-400 bg-yellow-400/10"}`}>{m.status}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-[#12121a] rounded-xl border border-[#ff6b00]/10 p-10 text-center">
                <Shield className="w-10 h-10 mx-auto mb-3 text-[#ff6b00]/30" />
                <p className="text-[#a0a0b0] mb-4">You are not part of a team yet</p>
                <Link href="/teams/my" className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#ff6b00] text-white font-bold uppercase text-sm rounded-xl hover:bg-[#e66000] transition-all">Create or Join a Team</Link>
              </div>
            )}
          </div>
        )}

        {activeTab === "deposits" && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-black uppercase">Deposit <span className="text-[#ff6b00]">History</span></h2>
              <Link href="/wallet" className="flex items-center gap-2 px-4 py-2 bg-[#ff6b00] text-white font-bold text-sm uppercase rounded-xl hover:bg-[#e66000] transition-colors">
                <ArrowDownCircle className="w-4 h-4" /> Go to Wallet
              </Link>
            </div>
            {loadingWallet ? (
              <div className="space-y-3">{[1,2].map((i) => <div key={i} className="h-16 bg-[#12121a] rounded-xl animate-pulse" />)}</div>
            ) : deposits.length === 0 ? (
              <div className="bg-[#12121a] rounded-xl border border-[#ff6b00]/10 p-10 text-center"><ArrowDownCircle className="w-10 h-10 mx-auto mb-3 text-[#ff6b00]/30" /><p className="text-[#a0a0b0]">No deposit requests yet</p></div>
            ) : (
              <div className="space-y-3">
                {deposits.map((tx: any) => (
                  <div key={tx.id} className="bg-[#12121a] rounded-xl border border-[#ff6b00]/10 p-4 flex items-center gap-4">
                    <ArrowDownCircle className="w-8 h-8 text-[#00ff88] shrink-0" />
                    <div className="flex-1">
                      <div className="font-bold text-white">৳{Number(tx.amount).toLocaleString()}{tx.method ? ` via ${tx.method.toUpperCase()}` : ""}</div>
                      <div className="text-[#a0a0b0] text-xs font-mono">{tx.accountNumber} {tx.transactionId ? `· TX: ${tx.transactionId}` : ""}</div>
                      <div className="text-[#a0a0b0] text-xs">{new Date(tx.createdAt).toLocaleString()}</div>
                    </div>
                    {txStatusBadge(tx.status)}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "withdrawals" && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-black uppercase">Withdrawal <span className="text-[#ff6b00]">History</span></h2>
              <Link href="/wallet" className="flex items-center gap-2 px-4 py-2 bg-[#ff6b00] text-white font-bold text-sm uppercase rounded-xl hover:bg-[#e66000] transition-colors">
                <ArrowUpCircle className="w-4 h-4" /> Go to Wallet
              </Link>
            </div>
            {loadingWallet ? (
              <div className="space-y-3">{[1,2].map((i) => <div key={i} className="h-16 bg-[#12121a] rounded-xl animate-pulse" />)}</div>
            ) : withdrawals.length === 0 ? (
              <div className="bg-[#12121a] rounded-xl border border-[#ff6b00]/10 p-10 text-center"><ArrowUpCircle className="w-10 h-10 mx-auto mb-3 text-[#ff6b00]/30" /><p className="text-[#a0a0b0]">No withdrawal requests yet</p></div>
            ) : (
              <div className="space-y-3">
                {withdrawals.map((tx: any) => (
                  <div key={tx.id} className="bg-[#12121a] rounded-xl border border-[#ff6b00]/10 p-4 flex items-center gap-4">
                    <ArrowUpCircle className="w-8 h-8 text-[#ff6b00] shrink-0" />
                    <div className="flex-1">
                      <div className="font-bold text-white">৳{Number(tx.amount).toLocaleString()}{tx.method ? ` via ${tx.method.toUpperCase()}` : ""}</div>
                      <div className="text-[#a0a0b0] text-xs font-mono">{tx.accountNumber}</div>
                      <div className="text-[#a0a0b0] text-xs">{new Date(tx.createdAt).toLocaleString()}</div>
                      {tx.adminNote && <div className="text-[#ff2244] text-xs mt-0.5">Note: {tx.adminNote}</div>}
                    </div>
                    {txStatusBadge(tx.status)}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
