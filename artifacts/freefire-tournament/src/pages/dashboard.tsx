import { useEffect, useState } from "react";
import { useLocation, Link } from "wouter";
import {
  Trophy, Users, Calendar, Shield, Clock, CheckCircle, XCircle,
  Edit, Save, X, ArrowDownCircle, ArrowUpCircle, CreditCard, User
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useGetMyRegistrations, useGetMyTeam, useGetMyProfile, useUpdateMyProfile } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { useAuthContext } from "@/lib/AuthContext";

type DashTab = "profile" | "tournaments" | "team" | "deposits" | "withdrawals";

const statusColors: Record<string, string> = {
  approved: "text-[#00ff88] bg-[#00ff88]/10 border-[#00ff88]/30",
  rejected: "text-[#ff2244] bg-[#ff2244]/10 border-[#ff2244]/30",
  pending: "text-yellow-400 bg-yellow-400/10 border-yellow-400/30",
};

const statusIcon: Record<string, JSX.Element> = {
  approved: <CheckCircle className="w-3.5 h-3.5" />,
  rejected: <XCircle className="w-3.5 h-3.5" />,
  pending: <Clock className="w-3.5 h-3.5" />,
};

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function DashboardPage() {
  const { user: authUser, isLoading, authFetch } = useAuthContext();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
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

  const [editing, setEditing] = useState(false);
  const [pForm, setPForm] = useState({ username: "", displayName: "", freefireUid: "", freefireNickname: "" });

  const [showDepositForm, setShowDepositForm] = useState(false);
  const [depositForm, setDepositForm] = useState({ amount: "", method: "bkash", accountNumber: "", transactionId: "", screenshot: "" });

  const [showWithdrawForm, setShowWithdrawForm] = useState(false);
  const [withdrawForm, setWithdrawForm] = useState({ amount: "", method: "bkash", accountNumber: "" });

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

  const submitDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await authFetch("/wallet/deposit", {
        method: "POST",
        body: JSON.stringify({ ...depositForm, amount: parseFloat(depositForm.amount) }),
      });
      if (res.ok) {
        toast({ title: "Deposit request submitted", description: "Admin will review within 24 hours." });
        setShowDepositForm(false);
        setDepositForm({ amount: "", method: "bkash", accountNumber: "", transactionId: "", screenshot: "" });
        loadWallet();
      } else {
        const d = await res.json();
        toast({ title: "Error", description: d.error, variant: "destructive" });
      }
    } catch { toast({ title: "Connection error", variant: "destructive" }); }
  };

  const submitWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await authFetch("/wallet/withdraw", {
        method: "POST",
        body: JSON.stringify({ ...withdrawForm, amount: parseFloat(withdrawForm.amount) }),
      });
      if (res.ok) {
        toast({ title: "Withdrawal request submitted", description: "Admin will process within 24 hours." });
        setShowWithdrawForm(false);
        setWithdrawForm({ amount: "", method: "bkash", accountNumber: "" });
        loadWallet();
      } else {
        const d = await res.json();
        toast({ title: "Error", description: d.error, variant: "destructive" });
      }
    } catch { toast({ title: "Connection error", variant: "destructive" }); }
  };

  const approved = regs.filter((r) => r.status === "approved").length;
  const pending = regs.filter((r) => r.status === "pending").length;
  const deposits = walletTxs.filter((t) => t.type === "deposit");
  const withdrawals = walletTxs.filter((t) => t.type === "withdraw");

  const dashTabs: { id: DashTab; label: string; icon: any }[] = [
    { id: "profile", label: "Profile", icon: User },
    { id: "tournaments", label: "Tournaments", icon: Trophy },
    { id: "team", label: "Team", icon: Shield },
    { id: "deposits", label: "Deposits", icon: ArrowDownCircle },
    { id: "withdrawals", label: "Withdrawals", icon: ArrowUpCircle },
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
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 pt-24 pb-16">

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 mb-8">
          <div className="w-16 h-16 rounded-full bg-[#ff6b00]/20 border-2 border-[#ff6b00] flex items-center justify-center">
            <User className="w-8 h-8 text-[#ff6b00]" />
          </div>
          <div>
            <h1 className="text-2xl font-black">
              Welcome, <span className="text-[#ff6b00]">{prof?.displayName ?? prof?.username ?? authUser?.username ?? "Player"}</span>
            </h1>
            <p className="text-[#a0a0b0] text-sm">{authUser?.email}</p>
            {prof?.freefireNickname && <p className="text-[#a0a0b0] text-sm">FF: {prof.freefireNickname} <span className="font-mono">({prof.freefireUid})</span></p>}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          {[
            { label: "Registered", value: regs.length, icon: Trophy, color: "text-[#ff6b00]" },
            { label: "Approved", value: approved, icon: CheckCircle, color: "text-[#00ff88]" },
            { label: "Pending", value: pending, icon: Clock, color: "text-yellow-400" },
            { label: "Team", value: team ? "Active" : "None", icon: Shield, color: team ? "text-[#ff6b00]" : "text-[#a0a0b0]" },
          ].map((stat) => (
            <div key={stat.label} className="bg-[#12121a] rounded-xl border border-[#ff6b00]/10 p-4">
              <stat.icon className={`w-5 h-5 ${stat.color} mb-2`} />
              <div className={`text-2xl font-black ${stat.color}`}>{stat.value}</div>
              <div className="text-[#a0a0b0] text-xs mt-1">{stat.label}</div>
            </div>
          ))}
        </div>

        <div className="flex gap-1 overflow-x-auto pb-1 mb-6">
          {dashTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold uppercase whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? "bg-[#ff6b00]/15 text-[#ff6b00] border border-[#ff6b00]/30"
                  : "text-[#a0a0b0] hover:text-white bg-[#12121a] border border-transparent"
              }`}
            >
              <tab.icon className="w-4 h-4" /> {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "profile" && (
          <div className="bg-[#12121a] rounded-xl border border-[#ff6b00]/10 p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-black uppercase">My <span className="text-[#ff6b00]">Profile</span></h2>
              {!editing ? (
                <button onClick={() => setEditing(true)} className="flex items-center gap-2 px-4 py-2 bg-[#ff6b00]/10 border border-[#ff6b00]/30 text-[#ff6b00] text-sm font-bold rounded-lg hover:bg-[#ff6b00]/20 transition-colors">
                  <Edit className="w-4 h-4" /> Edit Profile
                </button>
              ) : (
                <div className="flex gap-2">
                  <button onClick={saveProfile} disabled={updateProfile.isPending} className="flex items-center gap-2 px-4 py-2 bg-[#ff6b00] text-white text-sm font-bold rounded-lg hover:bg-[#e66000] transition-colors disabled:opacity-50">
                    <Save className="w-4 h-4" /> Save
                  </button>
                  <button onClick={() => { setEditing(false); if (prof) setPForm({ username: prof.username ?? "", displayName: prof.displayName ?? "", freefireUid: prof.freefireUid ?? "", freefireNickname: prof.freefireNickname ?? "" }); }} className="flex items-center gap-2 px-4 py-2 bg-[#1a1a24] text-[#a0a0b0] text-sm font-bold rounded-lg hover:text-white transition-colors">
                    <X className="w-4 h-4" /> Cancel
                  </button>
                </div>
              )}
            </div>

            {editing ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { key: "username", label: "Username", placeholder: "your_username" },
                  { key: "displayName", label: "Display Name", placeholder: "Your Name" },
                  { key: "freefireUid", label: "Free Fire UID", placeholder: "123456789" },
                  { key: "freefireNickname", label: "Free Fire Nickname", placeholder: "ProPlayer99" },
                ].map(({ key, label, placeholder }) => (
                  <div key={key}>
                    <label className="block text-[#a0a0b0] text-xs uppercase tracking-wider mb-1.5">{label}</label>
                    <input
                      value={pForm[key as keyof typeof pForm]}
                      onChange={(e) => setPForm({ ...pForm, [key]: e.target.value })}
                      placeholder={placeholder}
                      className="w-full bg-[#1a1a24] border border-[#2a2a36] rounded-xl px-4 py-2.5 text-white placeholder-[#a0a0b0] focus:outline-none focus:border-[#ff6b00] transition-colors text-sm"
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  <div key={label} className="border border-[#2a2a36] rounded-xl p-3">
                    <div className="text-[#a0a0b0] text-xs uppercase tracking-wider mb-1">{label}</div>
                    <div className="text-white font-medium">{value}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "tournaments" && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-black uppercase">Tournament <span className="text-[#ff6b00]">History</span></h2>
              <Link href="/tournaments" className="text-[#ff6b00] text-sm font-bold hover:underline">Find More →</Link>
            </div>
            {loadingRegs ? (
              <div className="space-y-3">{[1,2].map((i) => <div key={i} className="h-20 bg-[#12121a] rounded-xl animate-pulse" />)}</div>
            ) : regs.length === 0 ? (
              <div className="bg-[#12121a] rounded-xl border border-[#ff6b00]/10 p-10 text-center">
                <Trophy className="w-10 h-10 mx-auto mb-3 text-[#ff6b00]/30" />
                <p className="text-[#a0a0b0] mb-4">No tournament registrations yet</p>
                <Link href="/tournaments" className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#ff6b00] text-white font-bold uppercase text-sm rounded-xl hover:bg-[#e66000] transition-all">Browse Tournaments</Link>
              </div>
            ) : (
              <div className="space-y-3">
                {regs.map((reg: any) => (
                  <div key={reg.id} className="bg-[#12121a] rounded-xl border border-[#ff6b00]/10 hover:border-[#ff6b00]/30 transition-colors p-4 flex items-center gap-4">
                    <div className="flex-1">
                      <div className="font-bold text-white">{reg.tournament?.name ?? `Tournament #${reg.tournamentId}`}</div>
                      <div className="text-[#a0a0b0] text-xs mt-0.5">UID: <span className="font-mono">{reg.freefireUid}</span> — {reg.playerName}</div>
                      <div className="text-[#a0a0b0] text-xs">{new Date(reg.createdAt).toLocaleDateString()}</div>
                    </div>
                    <div className="shrink-0">{txStatusBadge(reg.status)}</div>
                  </div>
                ))}
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
              <button onClick={() => setShowDepositForm(!showDepositForm)} className="flex items-center gap-2 px-4 py-2 bg-[#ff6b00] text-white font-bold text-sm uppercase rounded-xl hover:bg-[#e66000] transition-colors">
                <ArrowDownCircle className="w-4 h-4" /> Request Deposit
              </button>
            </div>
            {showDepositForm && (
              <div className="bg-[#12121a] border border-[#ff6b00]/20 rounded-xl p-6 mb-4">
                <h3 className="font-black uppercase text-[#ff6b00] mb-4">New Deposit Request</h3>
                <p className="text-[#a0a0b0] text-sm mb-4">Send money via BKash or Nagad, then submit this form. Admin will approve within 24 hours.</p>
                <form onSubmit={submitDeposit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><label className="block text-[#a0a0b0] text-xs uppercase tracking-wider mb-1.5">Amount (৳) *</label><input type="number" value={depositForm.amount} onChange={(e) => setDepositForm({ ...depositForm, amount: e.target.value })} required min="1" placeholder="100" className="dash-input" /></div>
                  <div><label className="block text-[#a0a0b0] text-xs uppercase tracking-wider mb-1.5">Payment Method *</label><select value={depositForm.method} onChange={(e) => setDepositForm({ ...depositForm, method: e.target.value })} className="dash-input"><option value="bkash">BKash</option><option value="nagad">Nagad</option></select></div>
                  <div><label className="block text-[#a0a0b0] text-xs uppercase tracking-wider mb-1.5">Your Account Number *</label><input value={depositForm.accountNumber} onChange={(e) => setDepositForm({ ...depositForm, accountNumber: e.target.value })} required placeholder="01XXXXXXXXX" className="dash-input" /></div>
                  <div><label className="block text-[#a0a0b0] text-xs uppercase tracking-wider mb-1.5">Transaction ID</label><input value={depositForm.transactionId} onChange={(e) => setDepositForm({ ...depositForm, transactionId: e.target.value })} placeholder="TX ID from payment app" className="dash-input" /></div>
                  <div className="md:col-span-2"><label className="block text-[#a0a0b0] text-xs uppercase tracking-wider mb-1.5">Screenshot URL (optional)</label><input value={depositForm.screenshot} onChange={(e) => setDepositForm({ ...depositForm, screenshot: e.target.value })} placeholder="https://..." className="dash-input" /></div>
                  <div className="md:col-span-2 flex gap-3">
                    <button type="submit" className="px-6 py-2.5 bg-[#ff6b00] text-white font-bold text-sm uppercase rounded-xl hover:bg-[#e66000] transition-colors">Submit Request</button>
                    <button type="button" onClick={() => setShowDepositForm(false)} className="px-6 py-2.5 bg-[#1a1a24] text-[#a0a0b0] font-bold text-sm uppercase rounded-xl hover:text-white transition-colors">Cancel</button>
                  </div>
                </form>
              </div>
            )}
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
                      <div className="font-bold text-white">৳{Number(tx.amount).toLocaleString()} via {tx.method.toUpperCase()}</div>
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
              <button onClick={() => setShowWithdrawForm(!showWithdrawForm)} className="flex items-center gap-2 px-4 py-2 bg-[#ff6b00] text-white font-bold text-sm uppercase rounded-xl hover:bg-[#e66000] transition-colors">
                <ArrowUpCircle className="w-4 h-4" /> Request Withdrawal
              </button>
            </div>
            {showWithdrawForm && (
              <div className="bg-[#12121a] border border-[#ff6b00]/20 rounded-xl p-6 mb-4">
                <h3 className="font-black uppercase text-[#ff6b00] mb-4">New Withdrawal Request</h3>
                <p className="text-[#a0a0b0] text-sm mb-4">Admin will send money to your account within 24 hours after approval.</p>
                <form onSubmit={submitWithdraw} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><label className="block text-[#a0a0b0] text-xs uppercase tracking-wider mb-1.5">Amount (৳) *</label><input type="number" value={withdrawForm.amount} onChange={(e) => setWithdrawForm({ ...withdrawForm, amount: e.target.value })} required min="1" placeholder="100" className="dash-input" /></div>
                  <div><label className="block text-[#a0a0b0] text-xs uppercase tracking-wider mb-1.5">Payment Method *</label><select value={withdrawForm.method} onChange={(e) => setWithdrawForm({ ...withdrawForm, method: e.target.value })} className="dash-input"><option value="bkash">BKash</option><option value="nagad">Nagad</option></select></div>
                  <div className="md:col-span-2"><label className="block text-[#a0a0b0] text-xs uppercase tracking-wider mb-1.5">Your Account Number *</label><input value={withdrawForm.accountNumber} onChange={(e) => setWithdrawForm({ ...withdrawForm, accountNumber: e.target.value })} required placeholder="01XXXXXXXXX" className="dash-input" /></div>
                  <div className="md:col-span-2 flex gap-3">
                    <button type="submit" className="px-6 py-2.5 bg-[#ff6b00] text-white font-bold text-sm uppercase rounded-xl hover:bg-[#e66000] transition-colors">Submit Request</button>
                    <button type="button" onClick={() => setShowWithdrawForm(false)} className="px-6 py-2.5 bg-[#1a1a24] text-[#a0a0b0] font-bold text-sm uppercase rounded-xl hover:text-white transition-colors">Cancel</button>
                  </div>
                </form>
              </div>
            )}
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
                      <div className="font-bold text-white">৳{Number(tx.amount).toLocaleString()} via {tx.method.toUpperCase()}</div>
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
