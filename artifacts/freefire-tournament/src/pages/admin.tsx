import { useState, useEffect, useCallback } from "react";
import { useLocation, Link } from "wouter";
import {
  Users, Trophy, Shield, Clock, DollarSign, CheckCircle, XCircle, Bell,
  Plus, Trash2, Edit, LogOut, BarChart3, Megaphone, Swords, CreditCard,
  ArrowDownCircle, ArrowUpCircle, Eye, EyeOff, RefreshCw, Home,
  Crown, Shuffle, X as XIcon, Tag
} from "lucide-react";
import { isAdminAuthenticated, clearAdminSession, adminFetch } from "@/lib/adminAuth";
import { useToast } from "@/hooks/use-toast";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

type Tab = "overview" | "tournaments" | "matches" | "users" | "registrations" | "announcements" | "deposits" | "withdrawals" | "promo-codes";

const tabs: { id: Tab; label: string; icon: any }[] = [
  { id: "overview", label: "Overview", icon: BarChart3 },
  { id: "tournaments", label: "Tournaments", icon: Trophy },
  { id: "matches", label: "Matches", icon: Swords },
  { id: "registrations", label: "Registrations", icon: CheckCircle },
  { id: "users", label: "Users", icon: Users },
  { id: "announcements", label: "Announcements", icon: Megaphone },
  { id: "deposits", label: "Deposits", icon: ArrowDownCircle },
  { id: "withdrawals", label: "Withdrawals", icon: ArrowUpCircle },
  { id: "promo-codes", label: "Promo Codes", icon: Tag },
];

export default function AdminPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [walletTxs, setWalletTxs] = useState<any[]>([]);
  const [matches, setMatches] = useState<any[]>([]);
  const [selectedTournament, setSelectedTournament] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [showRoomPass, setShowRoomPass] = useState<Record<number, boolean>>({});
  const [tournamentParticipants, setTournamentParticipants] = useState<Record<number, any[]>>({});
  const [loadingParticipants, setLoadingParticipants] = useState<Record<number, boolean>>({});
  const [expandedWinner, setExpandedWinner] = useState<Record<number, boolean>>({});
  const [winnerLoading, setWinnerLoading] = useState<Record<number, boolean>>({});
  // Results state: { [tournamentId]: { [registrationId]: { kills, rank } } }
  const [resultInputs, setResultInputs] = useState<Record<number, Record<number, { kills: string; rank: string }>>>({});
  const [publishingResults, setPublishingResults] = useState<Record<number, boolean>>({});
  const [resultMode, setResultMode] = useState<Record<number, "winner" | "results">>({}); // toggle between winner-select and results-entry

  // Tournament form
  const [tForm, setTForm] = useState({ name: "", description: "", mode: "squad", startDate: "", endDate: "", maxSlots: "100", prizePool: "0", entryFee: "0", perKillReward: "0", status: "upcoming", bannerUrl: "", prize1Pct: "50", prize2Pct: "30", prize3Pct: "20" });
  const [editingTournament, setEditingTournament] = useState<any>(null);
  const [showTForm, setShowTForm] = useState(false);

  // Announcement form
  const [annForm, setAnnForm] = useState({ title: "", content: "", type: "info" });
  const [showAnnForm, setShowAnnForm] = useState(false);

  // Match form
  const [matchForm, setMatchForm] = useState({ matchNumber: "", scheduledAt: "", mapName: "" });
  const [showMatchForm, setShowMatchForm] = useState(false);

  // Match result entry state
  const [expandedMatchResult, setExpandedMatchResult] = useState<Record<number, boolean>>({});
  const [matchResultRows, setMatchResultRows] = useState<Record<number, Array<{ playerName: string; rank: string; kills: string; points: string }>>>({});
  const [submittingMatchResult, setSubmittingMatchResult] = useState<Record<number, boolean>>({});

  // Room form
  const [roomForm, setRoomForm] = useState<Record<number, { roomId: string; roomPassword: string }>>({});

  useEffect(() => {
    if (!isAdminAuthenticated()) {
      setLocation("/admin-login");
    }
  }, []);

  const apiFetch = useCallback(async (path: string, init: RequestInit = {}) => {
    return adminFetch(path, init);
  }, []);

  const loadStats = useCallback(async () => {
    try {
      const res = await apiFetch("/admin/stats");
      if (res.ok) setStats(await res.json());
    } catch {}
  }, [apiFetch]);

  const loadTournaments = useCallback(async () => {
    try {
      const res = await apiFetch("/tournaments?limit=100");
      const data = await res.json();
      setTournaments(Array.isArray(data) ? data : data.tournaments ?? []);
    } catch {}
  }, [apiFetch]);

  const loadUsers = useCallback(async () => {
    try {
      const res = await apiFetch("/admin/users?limit=100");
      if (res.ok) setUsers(await res.json());
    } catch {}
  }, [apiFetch]);

  const loadRegistrations = useCallback(async () => {
    try {
      const res = await apiFetch("/admin/registrations");
      if (res.ok) setRegistrations(await res.json());
    } catch {}
  }, [apiFetch]);

  const loadAnnouncements = useCallback(async () => {
    try {
      const res = await apiFetch("/announcements");
      if (res.ok) setAnnouncements(await res.json());
    } catch {}
  }, [apiFetch]);

  const loadWallet = useCallback(async () => {
    try {
      const res = await apiFetch("/admin/wallet-transactions");
      if (res.ok) setWalletTxs(await res.json());
    } catch {}
  }, [apiFetch]);

  const loadMatches = useCallback(async () => {
    if (!selectedTournament) return;
    try {
      const res = await apiFetch(`/tournaments/${selectedTournament}/matches`);
      if (res.ok) setMatches(await res.json());
    } catch {}
  }, [apiFetch, selectedTournament]);

  useEffect(() => {
    if (!isAdminAuthenticated()) return;
    loadStats();
    loadTournaments();
  }, []);

  useEffect(() => {
    if (activeTab === "users") loadUsers();
    if (activeTab === "registrations") loadRegistrations();
    if (activeTab === "announcements") loadAnnouncements();
    if (activeTab === "deposits" || activeTab === "withdrawals") loadWallet();
    if (activeTab === "matches") { loadTournaments(); if (selectedTournament) loadMatches(); }
  }, [activeTab]);

  useEffect(() => {
    if (selectedTournament) loadMatches();
  }, [selectedTournament]);

  const handleLogout = () => {
    clearAdminSession();
    setLocation("/");
  };

  // Tournament CRUD
  const saveTournament = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const url = editingTournament ? `/tournaments/${editingTournament.id}` : "/tournaments";
      const method = editingTournament ? "PUT" : "POST";
      const prizePool = parseFloat(tForm.prizePool);
      const prizes = prizePool > 0 ? [
        { rank: "1st Place", amount: prizePool * (parseFloat(tForm.prize1Pct) / 100), percentage: parseFloat(tForm.prize1Pct), description: `${tForm.prize1Pct}% of prize pool` },
        { rank: "2nd Place", amount: prizePool * (parseFloat(tForm.prize2Pct) / 100), percentage: parseFloat(tForm.prize2Pct), description: `${tForm.prize2Pct}% of prize pool` },
        { rank: "3rd Place", amount: prizePool * (parseFloat(tForm.prize3Pct) / 100), percentage: parseFloat(tForm.prize3Pct), description: `${tForm.prize3Pct}% of prize pool` },
      ] : [];
      const res = await apiFetch(url, {
        method,
        body: JSON.stringify({
          name: tForm.name, description: tForm.description, mode: tForm.mode,
          startDate: tForm.startDate, endDate: tForm.endDate || undefined,
          maxSlots: parseInt(tForm.maxSlots), prizePool,
          entryFee: parseFloat(tForm.entryFee),
          perKillReward: parseFloat(tForm.perKillReward),
          status: tForm.status,
          bannerUrl: tForm.bannerUrl || undefined,
          prizes: editingTournament ? undefined : prizes,
        }),
      });
      if (res.ok) {
        toast({ title: editingTournament ? "Tournament updated!" : "Tournament created!" });
        setShowTForm(false); setEditingTournament(null);
        setTForm({ name: "", description: "", mode: "squad", startDate: "", endDate: "", maxSlots: "100", prizePool: "0", entryFee: "0", perKillReward: "0", status: "upcoming", bannerUrl: "", prize1Pct: "50", prize2Pct: "30", prize3Pct: "20" });
        loadTournaments(); loadStats();
      } else {
        const d = await res.json();
        toast({ title: "Error", description: d.error ?? "Failed", variant: "destructive" });
      }
    } finally { setLoading(false); }
  };

  const deleteTournament = async (id: number) => {
    if (!confirm("Delete this tournament? This cannot be undone.")) return;
    const res = await apiFetch(`/tournaments/${id}`, { method: "DELETE" });
    if (res.ok) { toast({ title: "Tournament deleted" }); loadTournaments(); loadStats(); }
  };

  const editTournament = (t: any) => {
    setEditingTournament(t);
    setTForm({
      name: t.name, description: t.description ?? "", mode: t.mode,
      startDate: t.startDate?.slice(0, 16) ?? "", endDate: t.endDate?.slice(0, 16) ?? "",
      maxSlots: String(t.maxSlots), prizePool: String(t.prizePool),
      entryFee: String(t.entryFee), perKillReward: String(t.perKillReward ?? "0"),
      status: t.status, bannerUrl: t.bannerUrl ?? "",
      prize1Pct: "50", prize2Pct: "30", prize3Pct: "20",
    });
    setShowTForm(true);
  };

  const updateRoom = async (id: number) => {
    const form = roomForm[id];
    if (!form?.roomId || !form?.roomPassword) return toast({ title: "Enter Room ID and Password", variant: "destructive" });
    const res = await apiFetch(`/tournaments/${id}/room`, {
      method: "PATCH",
      body: JSON.stringify({ roomId: form.roomId, roomPassword: form.roomPassword }),
    });
    if (res.ok) { toast({ title: "Room details updated" }); loadTournaments(); }
  };

  // Registration actions
  const approveReg = async (id: number) => {
    const res = await apiFetch(`/registrations/${id}/approve`, { method: "PATCH" });
    if (res.ok) { toast({ title: "Registration approved" }); loadRegistrations(); loadStats(); }
  };
  const rejectReg = async (id: number) => {
    const res = await apiFetch(`/registrations/${id}/reject`, { method: "PATCH" });
    if (res.ok) { toast({ title: "Registration rejected" }); loadRegistrations(); loadStats(); }
  };

  // User actions
  const toggleBan = async (id: string, isBanned: boolean) => {
    const res = await apiFetch(`/admin/users/${id}/ban`, { method: "POST" });
    if (res.ok) { toast({ title: isBanned ? "User unbanned" : "User banned" }); loadUsers(); }
  };

  // Announcement actions
  const createAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await apiFetch("/announcements", {
      method: "POST",
      body: JSON.stringify(annForm),
    });
    if (res.ok) {
      toast({ title: "Announcement posted" });
      setAnnForm({ title: "", content: "", type: "info" });
      setShowAnnForm(false); loadAnnouncements();
    }
  };
  const deleteAnnouncement = async (id: number) => {
    if (!confirm("Delete this announcement?")) return;
    const res = await apiFetch(`/announcements/${id}`, { method: "DELETE" });
    if (res.ok) { toast({ title: "Announcement deleted" }); loadAnnouncements(); }
  };

  // Match result actions
  const addMatchResultRow = (matchId: number) => {
    setMatchResultRows((prev) => ({
      ...prev,
      [matchId]: [...(prev[matchId] ?? []), { playerName: "", rank: "", kills: "", points: "" }],
    }));
  };

  const removeMatchResultRow = (matchId: number, idx: number) => {
    setMatchResultRows((prev) => ({
      ...prev,
      [matchId]: (prev[matchId] ?? []).filter((_, i) => i !== idx),
    }));
  };

  const updateMatchResultRow = (matchId: number, idx: number, field: string, value: string) => {
    setMatchResultRows((prev) => ({
      ...prev,
      [matchId]: (prev[matchId] ?? []).map((row, i) =>
        i === idx ? { ...row, [field]: value } : row
      ),
    }));
  };

  const submitMatchResults = async (matchId: number) => {
    const rows = matchResultRows[matchId] ?? [];
    if (rows.length === 0) return toast({ title: "Add at least one result row", variant: "destructive" });
    const results = rows.map((r, i) => ({
      playerName: r.playerName,
      rank: parseInt(r.rank) || i + 1,
      kills: parseInt(r.kills) || 0,
      points: parseInt(r.points) || 0,
    }));
    setSubmittingMatchResult((prev) => ({ ...prev, [matchId]: true }));
    try {
      const res = await apiFetch(`/matches/${matchId}/results`, {
        method: "PATCH",
        body: JSON.stringify({ results }),
      });
      const d = await res.json();
      if (res.ok) {
        toast({ title: "✅ Match results saved!", description: `${results.length} players ranked.` });
        setExpandedMatchResult((prev) => ({ ...prev, [matchId]: false }));
        loadMatches();
      } else {
        toast({ title: "Error", description: d.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Connection error", variant: "destructive" });
    } finally {
      setSubmittingMatchResult((prev) => ({ ...prev, [matchId]: false }));
    }
  };

  // Match actions
  const createMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTournament) return;
    const res = await apiFetch(`/tournaments/${selectedTournament}/matches`, {
      method: "POST",
      body: JSON.stringify({
        matchNumber: parseInt(matchForm.matchNumber),
        scheduledAt: matchForm.scheduledAt,
        mapName: matchForm.mapName || undefined,
      }),
    });
    if (res.ok) {
      toast({ title: "Match created" });
      setMatchForm({ matchNumber: "", scheduledAt: "", mapName: "" });
      setShowMatchForm(false); loadMatches();
    }
  };

  // Winner / Participants actions
  const loadTournamentParticipants = async (id: number) => {
    setLoadingParticipants((prev) => ({ ...prev, [id]: true }));
    try {
      const res = await apiFetch(`/tournaments/${id}/participants`);
      if (res.ok) {
        const data = await res.json();
        setTournamentParticipants((prev) => ({ ...prev, [id]: data }));
      }
    } catch {} finally {
      setLoadingParticipants((prev) => ({ ...prev, [id]: false }));
    }
  };

  const setWinner = async (tournamentId: number, userId: string, playerName: string) => {
    setWinnerLoading((prev) => ({ ...prev, [tournamentId]: true }));
    try {
      const res = await apiFetch(`/tournaments/${tournamentId}/winner`, {
        method: "POST",
        body: JSON.stringify({ userId, playerName }),
      });
      if (res.ok) {
        toast({ title: `👑 Winner set: ${playerName}` });
        loadTournaments();
      } else {
        const d = await res.json();
        toast({ title: "Error", description: d.error, variant: "destructive" });
      }
    } catch {} finally {
      setWinnerLoading((prev) => ({ ...prev, [tournamentId]: false }));
    }
  };

  const autoWinner = async (tournamentId: number) => {
    if (!confirm("Randomly select a winner from all participants?")) return;
    setWinnerLoading((prev) => ({ ...prev, [tournamentId]: true }));
    try {
      const res = await apiFetch(`/tournaments/${tournamentId}/auto-winner`, { method: "POST" });
      const d = await res.json();
      if (res.ok) {
        toast({ title: `🎲 Auto-winner: ${d.winnerName}` });
        loadTournaments();
      } else {
        toast({ title: "Error", description: d.error, variant: "destructive" });
      }
    } catch {} finally {
      setWinnerLoading((prev) => ({ ...prev, [tournamentId]: false }));
    }
  };

  const clearWinner = async (tournamentId: number) => {
    if (!confirm("Clear the winner for this tournament?")) return;
    const res = await apiFetch(`/tournaments/${tournamentId}/winner`, { method: "DELETE" });
    if (res.ok) { toast({ title: "Winner cleared" }); loadTournaments(); }
  };

  const updateResultInput = (tournamentId: number, regId: number, field: "kills" | "rank", value: string) => {
    setResultInputs((prev) => ({
      ...prev,
      [tournamentId]: {
        ...prev[tournamentId],
        [regId]: { ...prev[tournamentId]?.[regId], [field]: value },
      },
    }));
  };

  const publishResults = async (tournamentId: number) => {
    const inputs = resultInputs[tournamentId] ?? {};
    const participants = tournamentParticipants[tournamentId] ?? [];
    if (participants.length === 0) return toast({ title: "No participants to publish results for.", variant: "destructive" });

    const results = participants.map((p: any) => ({
      registrationId: p.id,
      kills: parseInt(inputs[p.id]?.kills ?? "0") || 0,
      resultRank: inputs[p.id]?.rank ? parseInt(inputs[p.id].rank) : null,
    }));

    setPublishingResults((prev) => ({ ...prev, [tournamentId]: true }));
    try {
      const res = await apiFetch(`/tournaments/${tournamentId}/publish-results`, {
        method: "POST",
        body: JSON.stringify({ results }),
      });
      const d = await res.json();
      if (res.ok) {
        toast({ title: "✅ Results published!", description: `${d.participantsUpdated} players updated. Prizes distributed.` });
        loadTournaments();
        loadTournamentParticipants(tournamentId);
      } else {
        toast({ title: "Error", description: d.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Connection error", variant: "destructive" });
    } finally {
      setPublishingResults((prev) => ({ ...prev, [tournamentId]: false }));
    }
  };

  // Wallet actions
  const approveWallet = async (id: number) => {
    const res = await apiFetch(`/admin/wallet-transactions/${id}/approve`, { method: "PATCH" });
    if (res.ok) { toast({ title: "Transaction approved" }); loadWallet(); loadStats(); }
  };
  const rejectWallet = async (id: number) => {
    const res = await apiFetch(`/admin/wallet-transactions/${id}/reject`, {
      method: "PATCH",
      body: JSON.stringify({ adminNote: "Rejected by admin" }),
    });
    if (res.ok) { toast({ title: "Transaction rejected" }); loadWallet(); }
  };

  const statusBadge = (status: string) => {
    const cls: Record<string, string> = {
      pending: "text-yellow-400 bg-yellow-400/10 border-yellow-400/30",
      approved: "text-[#00ff88] bg-[#00ff88]/10 border-[#00ff88]/30",
      rejected: "text-[#ff2244] bg-[#ff2244]/10 border-[#ff2244]/30",
      upcoming: "text-blue-400 bg-blue-400/10 border-blue-400/30",
      live: "text-[#00ff88] bg-[#00ff88]/10 border-[#00ff88]/30",
      ongoing: "text-[#00ff88] bg-[#00ff88]/10 border-[#00ff88]/30",
      ended: "text-[#a0a0b0] bg-[#a0a0b0]/10 border-[#a0a0b0]/30",
      completed: "text-[#a0a0b0] bg-[#a0a0b0]/10 border-[#a0a0b0]/30",
      cancelled: "text-[#ff2244] bg-[#ff2244]/10 border-[#ff2244]/30",
    };
    return `inline-flex items-center px-2 py-0.5 rounded border text-xs font-bold uppercase ${cls[status] ?? cls.pending}`;
  };

  const deposits = walletTxs.filter((t) => t.type === "deposit");
  const withdrawals = walletTxs.filter((t) => t.type === "withdraw");

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white flex">
      {/* Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 bg-[#0d0d16] border-r border-[#ff6b00]/10 fixed inset-y-0 left-0 z-40">
        <div className="p-6 border-b border-[#ff6b00]/10">
          <div className="flex items-center gap-2 mb-1">
            <Shield className="w-6 h-6 text-[#ff6b00]" />
            <span className="font-black uppercase text-white">Admin <span className="text-[#ff6b00]">Panel</span></span>
          </div>
          <p className="text-[#a0a0b0] text-xs">BLACKCODE Dashboard</p>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left ${
                activeTab === tab.id
                  ? "bg-[#ff6b00]/15 text-[#ff6b00] border border-[#ff6b00]/20"
                  : "text-[#a0a0b0] hover:text-white hover:bg-[#ff6b00]/5"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
              {tab.id === "registrations" && stats?.pendingRegistrations > 0 && (
                <span className="ml-auto bg-[#ff6b00] text-white text-xs font-bold px-1.5 py-0.5 rounded-full">
                  {stats.pendingRegistrations}
                </span>
              )}
              {(tab.id === "deposits" || tab.id === "withdrawals") && stats?.pendingWalletRequests > 0 && (
                <span className="ml-auto bg-yellow-500 text-black text-xs font-bold px-1.5 py-0.5 rounded-full">
                  !
                </span>
              )}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-[#ff6b00]/10 space-y-2">
          <Link href="/" className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-[#a0a0b0] hover:text-white hover:bg-[#ff6b00]/5 transition-colors">
            <Home className="w-4 h-4" /> View Website
          </Link>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-[#ff2244] hover:bg-[#ff2244]/10 transition-colors"
          >
            <LogOut className="w-4 h-4" /> Logout
          </button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-[#0d0d16] border-b border-[#ff6b00]/10 px-4 h-14 flex items-center justify-between">
        <span className="font-black uppercase text-white text-sm">Admin <span className="text-[#ff6b00]">Panel</span></span>
        <div className="flex items-center gap-3">
          <Link href="/" className="text-[#a0a0b0] text-xs hover:text-white">Website</Link>
          <button onClick={handleLogout} className="text-[#ff2244] text-xs font-bold">Logout</button>
        </div>
      </div>

      {/* Mobile tabs */}
      <div className="lg:hidden fixed top-14 left-0 right-0 z-40 bg-[#0d0d16] border-b border-[#ff6b00]/10 overflow-x-auto">
        <div className="flex px-4 gap-1 py-2 min-w-max">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                activeTab === tab.id ? "bg-[#ff6b00]/15 text-[#ff6b00]" : "text-[#a0a0b0]"
              }`}
            >
              <tab.icon className="w-3 h-3" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main content */}
      <main className="flex-1 lg:ml-64 pt-14 lg:pt-0 min-h-screen">
        <div className="p-4 lg:p-8 mt-10 lg:mt-0">

          {/* OVERVIEW */}
          {activeTab === "overview" && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h1 className="text-2xl font-black uppercase">Admin <span className="text-[#ff6b00]">Overview</span></h1>
                  <p className="text-[#a0a0b0] text-sm">Real-time platform statistics</p>
                </div>
                <button onClick={() => { loadStats(); loadTournaments(); }} className="flex items-center gap-2 text-sm text-[#a0a0b0] hover:text-white transition-colors">
                  <RefreshCw className="w-4 h-4" /> Refresh
                </button>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {[
                  { label: "Total Users", value: stats?.totalUsers ?? 0, icon: Users, color: "text-blue-400", border: "border-blue-400/20" },
                  { label: "Tournaments", value: stats?.totalTournaments ?? 0, icon: Trophy, color: "text-[#ff6b00]", border: "border-[#ff6b00]/20" },
                  { label: "Active", value: stats?.activeTournaments ?? 0, icon: Swords, color: "text-[#00ff88]", border: "border-[#00ff88]/20" },
                  { label: "Registrations", value: stats?.totalRegistrations ?? 0, icon: Users, color: "text-purple-400", border: "border-purple-400/20" },
                  { label: "Pending Regs", value: stats?.pendingRegistrations ?? 0, icon: Clock, color: "text-yellow-400", border: "border-yellow-400/20" },
                  { label: "Teams", value: stats?.totalTeams ?? 0, icon: Shield, color: "text-pink-400", border: "border-pink-400/20" },
                  { label: "Prize Pool", value: `৳${Number(stats?.totalPrizePool ?? 0).toLocaleString()}`, icon: DollarSign, color: "text-[#ffd700]", border: "border-[#ffd700]/20" },
                  { label: "Wallet Pending", value: stats?.pendingWalletRequests ?? 0, icon: CreditCard, color: "text-orange-400", border: "border-orange-400/20" },
                ].map((card) => (
                  <div key={card.label} className={`bg-[#12121a] rounded-xl border ${card.border} p-4`}>
                    <card.icon className={`w-5 h-5 ${card.color} mb-2`} />
                    <div className={`text-2xl font-black ${card.color}`}>{stats === null ? "—" : card.value}</div>
                    <div className="text-[#a0a0b0] text-xs mt-1">{card.label}</div>
                  </div>
                ))}
              </div>
              <div className="grid lg:grid-cols-2 gap-6">
                <div>
                  <h2 className="text-sm font-black uppercase text-[#ff6b00] mb-3 tracking-wider">Upcoming Tournaments</h2>
                  <div className="bg-[#12121a] rounded-xl border border-[#ff6b00]/10">
                    {!stats?.upcomingTournaments || stats.upcomingTournaments.length === 0 ? (
                      <div className="p-6 text-center text-[#a0a0b0] text-sm">No upcoming tournaments</div>
                    ) : stats.upcomingTournaments.map((t: any) => (
                      <div key={t.id} className="p-4 border-b border-[#ff6b00]/5 last:border-0 flex items-center justify-between">
                        <div>
                          <div className="font-bold text-white text-sm">{t.name}</div>
                          <div className="text-[#a0a0b0] text-xs">{new Date(t.startDate).toLocaleDateString()} · ৳{Number(t.prizePool).toLocaleString()}</div>
                        </div>
                        <span className={statusBadge(t.status)}>{t.status}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h2 className="text-sm font-black uppercase text-[#ff6b00] mb-3 tracking-wider">Recent Registrations</h2>
                  <div className="bg-[#12121a] rounded-xl border border-[#ff6b00]/10">
                    {!stats?.recentRegistrations || stats.recentRegistrations.length === 0 ? (
                      <div className="p-6 text-center text-[#a0a0b0] text-sm">No registrations yet</div>
                    ) : stats.recentRegistrations.slice(0, 6).map((r: any) => (
                      <div key={r.id} className="p-3 border-b border-[#ff6b00]/5 last:border-0 flex items-center justify-between">
                        <div>
                          <div className="font-bold text-white text-sm">{r.playerName}</div>
                          <div className="text-[#a0a0b0] text-xs font-mono">{r.freefireUid}</div>
                        </div>
                        <span className={statusBadge(r.status)}>{r.status}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TOURNAMENTS */}
          {activeTab === "tournaments" && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-black uppercase">Manage <span className="text-[#ff6b00]">Tournaments</span></h1>
                <button
                  onClick={() => { setShowTForm(true); setEditingTournament(null); setTForm({ name: "", description: "", mode: "squad", startDate: "", endDate: "", maxSlots: "100", prizePool: "0", entryFee: "0", status: "upcoming", bannerUrl: "" }); }}
                  className="flex items-center gap-2 px-4 py-2 bg-[#ff6b00] text-white font-bold text-sm uppercase rounded-xl hover:bg-[#e66000] transition-colors"
                >
                  <Plus className="w-4 h-4" /> Create Tournament
                </button>
              </div>

              {showTForm && (
                <div className="bg-[#12121a] border border-[#ff6b00]/20 rounded-xl p-6 mb-6">
                  <h2 className="font-black uppercase text-[#ff6b00] mb-4">{editingTournament ? "Edit Tournament" : "New Tournament"}</h2>
                  <form onSubmit={saveTournament} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="label-sm">Tournament Name *</label>
                      <input value={tForm.name} onChange={(e) => setTForm({ ...tForm, name: e.target.value })} required placeholder="e.g. FF Arena Grand Championship S1" className="admin-input" />
                    </div>
                    <div className="md:col-span-2">
                      <label className="label-sm">Description</label>
                      <textarea value={tForm.description} onChange={(e) => setTForm({ ...tForm, description: e.target.value })} rows={3} className="admin-input resize-none" placeholder="Tournament details..." />
                    </div>
                    <div>
                      <label className="label-sm">Mode *</label>
                      <select value={tForm.mode} onChange={(e) => setTForm({ ...tForm, mode: e.target.value })} className="admin-input">
                        <option value="solo">Solo</option>
                        <option value="duo">Duo</option>
                        <option value="squad">Squad</option>
                      </select>
                    </div>
                    <div>
                      <label className="label-sm">Status</label>
                      <select value={tForm.status} onChange={(e) => setTForm({ ...tForm, status: e.target.value })} className="admin-input">
                        <option value="upcoming">Upcoming</option>
                        <option value="live">🔴 Live</option>
                        <option value="ended">Ended</option>
                        <option value="ongoing">Ongoing (legacy)</option>
                        <option value="completed">Completed (legacy)</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </div>
                    <div>
                      <label className="label-sm">Start Date *</label>
                      <input type="datetime-local" value={tForm.startDate} onChange={(e) => setTForm({ ...tForm, startDate: e.target.value })} required className="admin-input" />
                    </div>
                    <div>
                      <label className="label-sm">End Date</label>
                      <input type="datetime-local" value={tForm.endDate} onChange={(e) => setTForm({ ...tForm, endDate: e.target.value })} className="admin-input" />
                    </div>
                    <div>
                      <label className="label-sm">Max Slots *</label>
                      <input type="number" value={tForm.maxSlots} onChange={(e) => setTForm({ ...tForm, maxSlots: e.target.value })} required min="1" className="admin-input" />
                    </div>
                    <div>
                      <label className="label-sm">Entry Fee (৳)</label>
                      <input type="number" value={tForm.entryFee} onChange={(e) => setTForm({ ...tForm, entryFee: e.target.value })} min="0" step="0.01" className="admin-input" />
                    </div>
                    <div>
                      <label className="label-sm">Prize Pool (৳)</label>
                      <input type="number" value={tForm.prizePool} onChange={(e) => setTForm({ ...tForm, prizePool: e.target.value })} min="0" step="0.01" className="admin-input" />
                    </div>
                    <div>
                      <label className="label-sm">Per Kill Reward (৳)</label>
                      <input type="number" value={tForm.perKillReward} onChange={(e) => setTForm({ ...tForm, perKillReward: e.target.value })} min="0" step="0.01" placeholder="0" className="admin-input" />
                    </div>
                    <div>
                      <label className="label-sm">Banner Image URL</label>
                      <input value={tForm.bannerUrl} onChange={(e) => setTForm({ ...tForm, bannerUrl: e.target.value })} placeholder="https://..." className="admin-input" />
                    </div>
                    {!editingTournament && parseFloat(tForm.prizePool) > 0 && (
                      <div className="md:col-span-2 bg-[#0d0d16] border border-[#ff6b00]/10 rounded-xl p-4">
                        <p className="text-[#ff6b00] text-xs font-black uppercase mb-3">Prize Distribution (%)</p>
                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <label className="label-sm">🥇 1st Place %</label>
                            <input type="number" value={tForm.prize1Pct} onChange={(e) => setTForm({ ...tForm, prize1Pct: e.target.value })} min="0" max="100" className="admin-input" />
                            <p className="text-[#a0a0b0] text-xs mt-1">৳{(parseFloat(tForm.prizePool) * parseFloat(tForm.prize1Pct || "0") / 100).toFixed(0)}</p>
                          </div>
                          <div>
                            <label className="label-sm">🥈 2nd Place %</label>
                            <input type="number" value={tForm.prize2Pct} onChange={(e) => setTForm({ ...tForm, prize2Pct: e.target.value })} min="0" max="100" className="admin-input" />
                            <p className="text-[#a0a0b0] text-xs mt-1">৳{(parseFloat(tForm.prizePool) * parseFloat(tForm.prize2Pct || "0") / 100).toFixed(0)}</p>
                          </div>
                          <div>
                            <label className="label-sm">🥉 3rd Place %</label>
                            <input type="number" value={tForm.prize3Pct} onChange={(e) => setTForm({ ...tForm, prize3Pct: e.target.value })} min="0" max="100" className="admin-input" />
                            <p className="text-[#a0a0b0] text-xs mt-1">৳{(parseFloat(tForm.prizePool) * parseFloat(tForm.prize3Pct || "0") / 100).toFixed(0)}</p>
                          </div>
                        </div>
                        {(parseFloat(tForm.prize1Pct || "0") + parseFloat(tForm.prize2Pct || "0") + parseFloat(tForm.prize3Pct || "0")) !== 100 && (
                          <p className="text-yellow-400 text-xs mt-2">⚠ Percentages should add up to 100% (currently: {parseFloat(tForm.prize1Pct || "0") + parseFloat(tForm.prize2Pct || "0") + parseFloat(tForm.prize3Pct || "0")}%)</p>
                        )}
                      </div>
                    )}
                    <div className="md:col-span-2 flex gap-3">
                      <button type="submit" disabled={loading} className="px-6 py-2.5 bg-[#ff6b00] text-white font-bold text-sm uppercase rounded-xl hover:bg-[#e66000] transition-colors disabled:opacity-50">
                        {loading ? "Saving..." : editingTournament ? "Update Tournament" : "Create Tournament"}
                      </button>
                      <button type="button" onClick={() => { setShowTForm(false); setEditingTournament(null); }} className="px-6 py-2.5 bg-[#1a1a24] text-[#a0a0b0] font-bold text-sm uppercase rounded-xl hover:text-white transition-colors">
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              )}

              <div className="space-y-4">
                {tournaments.length === 0 ? (
                  <div className="bg-[#12121a] rounded-xl border border-[#ff6b00]/10 p-12 text-center text-[#a0a0b0]">
                    <Trophy className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    <p>No tournaments yet. Create your first tournament above.</p>
                  </div>
                ) : tournaments.map((t) => (
                  <div key={t.id} className="bg-[#12121a] rounded-xl border border-[#ff6b00]/10 p-5">
                    <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2 flex-wrap">
                          <span className="font-black text-white">{t.name}</span>
                          <span className={statusBadge(t.status)}>{t.status}</span>
                          <span className="text-[#a0a0b0] text-xs uppercase">{t.mode}</span>
                        </div>
                        <div className="text-[#a0a0b0] text-sm flex flex-wrap gap-4">
                          <span>Start: {new Date(t.startDate).toLocaleString()}</span>
                          <span>Slots: {t.filledSlots}/{t.maxSlots}</span>
                          <span>Prize: ৳{Number(t.prizePool).toLocaleString()}</span>
                          <span>Entry: ৳{Number(t.entryFee).toLocaleString()}</span>
                        </div>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <button onClick={() => editTournament(t)} className="p-2 bg-blue-400/10 border border-blue-400/20 rounded-lg text-blue-400 hover:bg-blue-400/20 transition-colors">
                          <Edit className="w-4 h-4" />
                        </button>
                        <button onClick={() => deleteTournament(t.id)} className="p-2 bg-[#ff2244]/10 border border-[#ff2244]/20 rounded-lg text-[#ff2244] hover:bg-[#ff2244]/20 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Room ID & Password */}
                    {/* Room Details */}
                    <div className="mt-4 pt-4 border-t border-[#ff6b00]/5">
                      <p className="text-xs text-[#a0a0b0] uppercase tracking-wider mb-2 font-bold">Room Details</p>
                      {t.roomId ? (
                        <div className="flex items-center gap-4 text-sm mb-3">
                          <span className="text-[#a0a0b0]">Room ID: <span className="text-white font-mono font-bold">{t.roomId}</span></span>
                          <span className="text-[#a0a0b0]">Password:
                            <span className="text-white font-mono font-bold ml-1">
                              {showRoomPass[t.id] ? t.roomPassword : "••••••"}
                            </span>
                            <button onClick={() => setShowRoomPass({ ...showRoomPass, [t.id]: !showRoomPass[t.id] })} className="ml-2 text-[#a0a0b0] hover:text-white">
                              {showRoomPass[t.id] ? <EyeOff className="w-3 h-3 inline" /> : <Eye className="w-3 h-3 inline" />}
                            </button>
                          </span>
                        </div>
                      ) : (
                        <p className="text-xs text-[#a0a0b0] mb-3">No room details set yet.</p>
                      )}
                      <div className="flex gap-2 flex-wrap">
                        <input
                          placeholder="Room ID"
                          value={roomForm[t.id]?.roomId ?? ""}
                          onChange={(e) => setRoomForm({ ...roomForm, [t.id]: { ...roomForm[t.id], roomId: e.target.value } })}
                          className="admin-input-sm w-36"
                        />
                        <input
                          placeholder="Password"
                          value={roomForm[t.id]?.roomPassword ?? ""}
                          onChange={(e) => setRoomForm({ ...roomForm, [t.id]: { ...roomForm[t.id], roomPassword: e.target.value } })}
                          className="admin-input-sm w-32"
                        />
                        <button onClick={() => updateRoom(t.id)} className="px-3 py-1.5 bg-[#ff6b00] text-white font-bold text-xs uppercase rounded-lg hover:bg-[#e66000] transition-colors">
                          Set Room
                        </button>
                      </div>
                    </div>

                    {/* Participants + Results + Winner Panel */}
                    <div className="mt-4 pt-4 border-t border-[#ff6b00]/5">
                      {/* Status badges */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          {t.winnerId && (
                            <span className="flex items-center gap-1 text-xs text-[#ffd700] bg-[#ffd700]/10 border border-[#ffd700]/20 px-2 py-0.5 rounded-full font-bold">
                              <Crown className="w-3 h-3" /> {t.winnerName}
                            </span>
                          )}
                          {t.resultsPublished && (
                            <span className="text-xs text-purple-400 bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded-full font-bold">
                              ✅ Results Published
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => {
                            const newState = !expandedWinner[t.id];
                            setExpandedWinner((prev) => ({ ...prev, [t.id]: newState }));
                            if (newState && !tournamentParticipants[t.id]) loadTournamentParticipants(t.id);
                          }}
                          className="text-xs text-[#a0a0b0] hover:text-white flex items-center gap-1 transition-colors"
                        >
                          <Users className="w-3 h-3" />
                          {expandedWinner[t.id] ? "Hide" : `Players & Results (${t.filledSlots})`}
                        </button>
                      </div>

                      {expandedWinner[t.id] && (
                        <div className="bg-[#0d0d16] rounded-xl border border-[#ff6b00]/10 p-4 space-y-4">
                          {/* Mode switcher */}
                          <div className="flex gap-2">
                            <button
                              onClick={() => setResultMode((prev) => ({ ...prev, [t.id]: "winner" }))}
                              className={`flex-1 py-1.5 text-xs font-bold uppercase rounded-lg transition-colors ${
                                (resultMode[t.id] ?? "winner") === "winner"
                                  ? "bg-[#ffd700]/20 text-[#ffd700] border border-[#ffd700]/30"
                                  : "bg-[#1a1a24] text-[#a0a0b0] hover:text-white"
                              }`}
                            >
                              👑 Quick Winner
                            </button>
                            <button
                              onClick={() => {
                                setResultMode((prev) => ({ ...prev, [t.id]: "results" }));
                                loadTournamentParticipants(t.id);
                              }}
                              className={`flex-1 py-1.5 text-xs font-bold uppercase rounded-lg transition-colors ${
                                resultMode[t.id] === "results"
                                  ? "bg-purple-500/20 text-purple-400 border border-purple-500/30"
                                  : "bg-[#1a1a24] text-[#a0a0b0] hover:text-white"
                              }`}
                            >
                              📊 Publish Results
                            </button>
                          </div>

                          {/* Refresh */}
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-[#a0a0b0]">
                              {loadingParticipants[t.id] ? "Loading..." : `${tournamentParticipants[t.id]?.length ?? 0} participants`}
                            </span>
                            <button onClick={() => loadTournamentParticipants(t.id)} className="text-[#a0a0b0] hover:text-white">
                              <RefreshCw className="w-3 h-3" />
                            </button>
                          </div>

                          {loadingParticipants[t.id] ? (
                            <div className="space-y-2">
                              {[1,2,3].map((i) => <div key={i} className="h-10 bg-[#1a1a24] rounded-lg animate-pulse" />)}
                            </div>
                          ) : !tournamentParticipants[t.id] || tournamentParticipants[t.id].length === 0 ? (
                            <p className="text-[#a0a0b0] text-sm text-center py-4">No participants yet</p>
                          ) : (resultMode[t.id] ?? "winner") === "winner" ? (
                            /* ── Quick Winner Mode ── */
                            <div className="space-y-2">
                              <div className="flex justify-end gap-2 mb-1">
                                <button
                                  onClick={() => autoWinner(t.id)}
                                  disabled={winnerLoading[t.id]}
                                  className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-500/20 border border-purple-500/30 text-purple-400 font-bold text-xs uppercase rounded-lg hover:bg-purple-500/30 disabled:opacity-50"
                                >
                                  <Shuffle className="w-3 h-3" /> Auto Pick
                                </button>
                                {t.winnerId && (
                                  <button onClick={() => clearWinner(t.id)} className="text-xs text-[#ff2244]/70 hover:text-[#ff2244] px-2">
                                    Clear
                                  </button>
                                )}
                              </div>
                              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                                {tournamentParticipants[t.id].map((p: any) => (
                                  <div key={p.id} className={`flex items-center justify-between gap-2 px-3 py-2 rounded-lg ${
                                    p.userId === t.winnerId ? "bg-[#ffd700]/10 border border-[#ffd700]/30" : "bg-[#1a1a24]"
                                  }`}>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-1.5">
                                        {p.userId === t.winnerId && <Crown className="w-3 h-3 text-[#ffd700]" />}
                                        <span className="text-white text-sm font-bold truncate">{p.playerName}</span>
                                      </div>
                                      <span className="text-[#a0a0b0] text-xs font-mono">UID: {p.freefireUid}</span>
                                    </div>
                                    {p.userId !== t.winnerId ? (
                                      <button
                                        onClick={() => setWinner(t.id, p.userId, p.playerName)}
                                        disabled={winnerLoading[t.id]}
                                        className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 bg-[#ffd700]/15 border border-[#ffd700]/30 text-[#ffd700] font-bold text-xs rounded-lg hover:bg-[#ffd700]/25 disabled:opacity-50"
                                      >
                                        <Crown className="w-3 h-3" /> Set
                                      </button>
                                    ) : (
                                      <span className="text-[10px] font-black uppercase text-[#ffd700] bg-[#ffd700]/10 px-2 py-1 rounded border border-[#ffd700]/30">Winner</span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : (
                            /* ── Publish Results Mode ── */
                            <div className="space-y-3">
                              <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-3 text-xs text-purple-300">
                                Enter kills for each player. Set rank (1/2/3) for top 3 placements. Click Publish to distribute prizes and end the tournament.
                              </div>
                              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                                {/* Table header */}
                                <div className="grid grid-cols-[1fr_80px_80px] gap-2 px-2 text-xs text-[#a0a0b0] uppercase font-bold">
                                  <span>Player</span>
                                  <span className="text-center">Kills</span>
                                  <span className="text-center">Rank</span>
                                </div>
                                {tournamentParticipants[t.id].map((p: any) => (
                                  <div key={p.id} className="grid grid-cols-[1fr_80px_80px] gap-2 items-center bg-[#1a1a24] rounded-lg px-3 py-2">
                                    <div className="min-w-0">
                                      <div className="text-white text-xs font-bold truncate">{p.playerName}</div>
                                      <div className="text-[#a0a0b0] text-[10px] font-mono">{p.freefireUid}</div>
                                    </div>
                                    <input
                                      type="number"
                                      min="0"
                                      placeholder="0"
                                      value={resultInputs[t.id]?.[p.id]?.kills ?? ""}
                                      onChange={(e) => updateResultInput(t.id, p.id, "kills", e.target.value)}
                                      className="w-full bg-[#0d0d16] border border-[#2a2a36] rounded-lg px-2 py-1.5 text-white text-xs text-center focus:outline-none focus:border-[#ff6b00]"
                                    />
                                    <select
                                      value={resultInputs[t.id]?.[p.id]?.rank ?? ""}
                                      onChange={(e) => updateResultInput(t.id, p.id, "rank", e.target.value)}
                                      className="w-full bg-[#0d0d16] border border-[#2a2a36] rounded-lg px-1 py-1.5 text-white text-xs text-center focus:outline-none focus:border-[#ff6b00]"
                                    >
                                      <option value="">—</option>
                                      <option value="1">🥇 1st</option>
                                      <option value="2">🥈 2nd</option>
                                      <option value="3">🥉 3rd</option>
                                    </select>
                                  </div>
                                ))}
                              </div>
                              <button
                                onClick={() => publishResults(t.id)}
                                disabled={publishingResults[t.id]}
                                className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-black text-xs uppercase rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                              >
                                {publishingResults[t.id] ? (
                                  <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Publishing...</>
                                ) : (
                                  <>🏆 Publish Results & Distribute Prizes</>
                                )}
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* MATCHES */}
          {activeTab === "matches" && (
            <div>
              <h1 className="text-2xl font-black uppercase mb-6">Manage <span className="text-[#ff6b00]">Matches</span></h1>
              <div className="mb-6">
                <label className="label-sm mb-2 block">Select Tournament</label>
                <select
                  value={selectedTournament ?? ""}
                  onChange={(e) => setSelectedTournament(e.target.value ? parseInt(e.target.value) : null)}
                  className="admin-input max-w-sm"
                >
                  <option value="">-- Select a tournament --</option>
                  {tournaments.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>

              {selectedTournament && (
                <>
                  <button
                    onClick={() => setShowMatchForm(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-[#ff6b00] text-white font-bold text-sm uppercase rounded-xl hover:bg-[#e66000] transition-colors mb-4"
                  >
                    <Plus className="w-4 h-4" /> Add Match
                  </button>

                  {showMatchForm && (
                    <div className="bg-[#12121a] border border-[#ff6b00]/20 rounded-xl p-6 mb-4">
                      <h2 className="font-black uppercase text-[#ff6b00] mb-4">New Match</h2>
                      <form onSubmit={createMatch} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="label-sm">Match Number *</label>
                          <input type="number" value={matchForm.matchNumber} onChange={(e) => setMatchForm({ ...matchForm, matchNumber: e.target.value })} required min="1" className="admin-input" />
                        </div>
                        <div>
                          <label className="label-sm">Scheduled At *</label>
                          <input type="datetime-local" value={matchForm.scheduledAt} onChange={(e) => setMatchForm({ ...matchForm, scheduledAt: e.target.value })} required className="admin-input" />
                        </div>
                        <div>
                          <label className="label-sm">Map Name</label>
                          <input value={matchForm.mapName} onChange={(e) => setMatchForm({ ...matchForm, mapName: e.target.value })} placeholder="Bermuda, Purgatory..." className="admin-input" />
                        </div>
                        <div className="md:col-span-3 flex gap-3">
                          <button type="submit" className="px-6 py-2.5 bg-[#ff6b00] text-white font-bold text-sm uppercase rounded-xl hover:bg-[#e66000] transition-colors">
                            Create Match
                          </button>
                          <button type="button" onClick={() => setShowMatchForm(false)} className="px-6 py-2.5 bg-[#1a1a24] text-[#a0a0b0] font-bold text-sm uppercase rounded-xl hover:text-white transition-colors">
                            Cancel
                          </button>
                        </div>
                      </form>
                    </div>
                  )}

                  <div className="space-y-4">
                    {matches.length === 0 ? (
                      <div className="bg-[#12121a] rounded-xl border border-[#ff6b00]/10 p-8 text-center text-[#a0a0b0] text-sm">No matches for this tournament yet.</div>
                    ) : matches.map((m: any) => {
                      const isExpanded = expandedMatchResult[m.id];
                      const rows = matchResultRows[m.id] ?? [];
                      const hasResults = m.results && m.results.length > 0;
                      return (
                        <div key={m.id} className="bg-[#12121a] rounded-xl border border-[#ff6b00]/10 overflow-hidden">
                          {/* Match header */}
                          <div className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                            <div className="flex-1">
                              <div className="font-bold text-white text-base">Match #{m.matchNumber} — {m.mapName ?? "TBD"}</div>
                              <div className="text-[#a0a0b0] text-sm">{new Date(m.scheduledAt).toLocaleString()}</div>
                              {hasResults && (
                                <div className="text-[#00ff88] text-xs mt-1 font-bold">✓ {m.results.length} players ranked</div>
                              )}
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={statusBadge(m.status)}>{m.status}</span>
                              <button
                                onClick={() => {
                                  setExpandedMatchResult((prev) => ({ ...prev, [m.id]: !prev[m.id] }));
                                  if (!matchResultRows[m.id]) {
                                    if (hasResults) {
                                      setMatchResultRows((prev) => ({
                                        ...prev,
                                        [m.id]: m.results.map((r: any) => ({
                                          playerName: r.playerName,
                                          rank: String(r.rank),
                                          kills: String(r.kills),
                                          points: String(r.points),
                                        })),
                                      }));
                                    } else {
                                      setMatchResultRows((prev) => ({ ...prev, [m.id]: [] }));
                                    }
                                  }
                                }}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#ff6b00]/10 border border-[#ff6b00]/20 rounded-lg text-[#ff6b00] text-xs font-bold hover:bg-[#ff6b00]/20 transition-colors"
                              >
                                {isExpanded ? "▲ Close" : "▼ Enter Results"}
                              </button>
                            </div>
                          </div>

                          {/* Result entry panel */}
                          {isExpanded && (
                            <div className="border-t border-[#ff6b00]/10 bg-[#0d0d16] p-4">
                              <div className="flex items-center justify-between mb-4">
                                <h3 className="font-black uppercase text-[#ff6b00] text-sm">Enter Rankings</h3>
                                <button
                                  onClick={() => addMatchResultRow(m.id)}
                                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#ff6b00] text-white font-bold text-xs uppercase rounded-lg hover:bg-[#e66000] transition-colors"
                                >
                                  <Plus className="w-3.5 h-3.5" /> Add Row
                                </button>
                              </div>

                              {rows.length === 0 ? (
                                <div className="text-center py-6 text-[#a0a0b0] text-sm">
                                  Click "Add Row" to enter player results, or pre-fill from existing results above.
                                </div>
                              ) : (
                                <div className="space-y-2 mb-4">
                                  {/* Header */}
                                  <div className="grid grid-cols-12 gap-2 text-[#606070] text-[10px] uppercase px-1">
                                    <div className="col-span-4">Player Name *</div>
                                    <div className="col-span-2">Rank *</div>
                                    <div className="col-span-2">Kills</div>
                                    <div className="col-span-2">Points</div>
                                    <div className="col-span-2" />
                                  </div>
                                  {rows.map((row, idx) => (
                                    <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                                      <div className="col-span-4">
                                        <input
                                          value={row.playerName}
                                          onChange={(e) => updateMatchResultRow(m.id, idx, "playerName", e.target.value)}
                                          placeholder="Player / Team"
                                          className="w-full bg-[#12121a] border border-[#2a2a36] rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-[#ff6b00] transition-colors"
                                        />
                                      </div>
                                      <div className="col-span-2">
                                        <input
                                          type="number"
                                          value={row.rank}
                                          onChange={(e) => updateMatchResultRow(m.id, idx, "rank", e.target.value)}
                                          placeholder={String(idx + 1)}
                                          min="1"
                                          className="w-full bg-[#12121a] border border-[#2a2a36] rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-[#ff6b00] transition-colors"
                                        />
                                      </div>
                                      <div className="col-span-2">
                                        <input
                                          type="number"
                                          value={row.kills}
                                          onChange={(e) => updateMatchResultRow(m.id, idx, "kills", e.target.value)}
                                          placeholder="0"
                                          min="0"
                                          className="w-full bg-[#12121a] border border-[#2a2a36] rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-[#ff6b00] transition-colors"
                                        />
                                      </div>
                                      <div className="col-span-2">
                                        <input
                                          type="number"
                                          value={row.points}
                                          onChange={(e) => updateMatchResultRow(m.id, idx, "points", e.target.value)}
                                          placeholder="0"
                                          min="0"
                                          className="w-full bg-[#12121a] border border-[#2a2a36] rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-[#ff6b00] transition-colors"
                                        />
                                      </div>
                                      <div className="col-span-2 flex justify-center">
                                        <button
                                          onClick={() => removeMatchResultRow(m.id, idx)}
                                          className="w-8 h-8 rounded-lg bg-[#ff2244]/10 text-[#ff2244] hover:bg-[#ff2244]/20 flex items-center justify-center transition-colors"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {rows.length > 0 && (
                                <div className="flex items-center gap-3 pt-3 border-t border-[#2a2a36]">
                                  <button
                                    onClick={() => submitMatchResults(m.id)}
                                    disabled={submittingMatchResult[m.id]}
                                    className="flex items-center gap-2 px-5 py-2.5 bg-[#00ff88] text-[#0a0a0f] font-black text-xs uppercase rounded-xl hover:bg-[#00cc70] disabled:opacity-50 transition-colors"
                                  >
                                    {submittingMatchResult[m.id] ? "Saving..." : "💾 Save Results & Mark Complete"}
                                  </button>
                                  <button
                                    onClick={() => addMatchResultRow(m.id)}
                                    className="flex items-center gap-1.5 px-4 py-2.5 bg-[#1a1a24] text-[#a0a0b0] font-bold text-xs uppercase rounded-xl hover:text-white transition-colors"
                                  >
                                    <Plus className="w-3.5 h-3.5" /> Add Row
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}

          {/* REGISTRATIONS */}
          {activeTab === "registrations" && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-black uppercase">Tournament <span className="text-[#ff6b00]">Registrations</span></h1>
                <button onClick={loadRegistrations} className="flex items-center gap-2 text-sm text-[#a0a0b0] hover:text-white transition-colors">
                  <RefreshCw className="w-4 h-4" /> Refresh
                </button>
              </div>
              <div className="space-y-3">
                {registrations.length === 0 ? (
                  <div className="bg-[#12121a] rounded-xl border border-[#ff6b00]/10 p-12 text-center text-[#a0a0b0]">
                    <CheckCircle className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    <p>No registrations yet.</p>
                  </div>
                ) : registrations.map((r: any) => (
                  <div key={r.id} className="bg-[#12121a] rounded-xl border border-[#ff6b00]/10 p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex-1">
                      <div className="font-bold text-white">{r.playerName}</div>
                      <div className="text-[#a0a0b0] text-sm font-mono">{r.freefireUid}</div>
                      <div className="text-[#a0a0b0] text-xs mt-1">Tournament #{r.tournamentId} · {new Date(r.createdAt).toLocaleDateString()}</div>
                      {r.paymentScreenshot && (
                        <a href={r.paymentScreenshot} target="_blank" rel="noopener noreferrer" className="text-[#ff6b00] text-xs hover:underline mt-1 inline-block">
                          View Payment Screenshot
                        </a>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={statusBadge(r.status)}>{r.status}</span>
                      {r.status === "pending" && (
                        <>
                          <button onClick={() => approveReg(r.id)} className="p-1.5 bg-[#00ff88]/10 border border-[#00ff88]/30 rounded-lg text-[#00ff88] hover:bg-[#00ff88]/20 transition-colors">
                            <CheckCircle className="w-4 h-4" />
                          </button>
                          <button onClick={() => rejectReg(r.id)} className="p-1.5 bg-[#ff2244]/10 border border-[#ff2244]/30 rounded-lg text-[#ff2244] hover:bg-[#ff2244]/20 transition-colors">
                            <XCircle className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* USERS */}
          {activeTab === "users" && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-black uppercase">User <span className="text-[#ff6b00]">Management</span></h1>
                <button onClick={loadUsers} className="flex items-center gap-2 text-sm text-[#a0a0b0] hover:text-white transition-colors">
                  <RefreshCw className="w-4 h-4" /> Refresh
                </button>
              </div>
              <div className="space-y-3">
                {users.length === 0 ? (
                  <div className="bg-[#12121a] rounded-xl border border-[#ff6b00]/10 p-12 text-center text-[#a0a0b0]">
                    <Users className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    <p>No users registered yet.</p>
                  </div>
                ) : users.map((u: any) => (
                  <div key={u.id} className="bg-[#12121a] rounded-xl border border-[#ff6b00]/10 p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white">{u.displayName ?? u.username ?? "Unknown"}</span>
                        {u.isAdmin && <span className="text-xs font-bold text-[#ff6b00] bg-[#ff6b00]/10 border border-[#ff6b00]/30 px-2 py-0.5 rounded">Admin</span>}
                        {u.isBanned && <span className="text-xs font-bold text-[#ff2244] bg-[#ff2244]/10 border border-[#ff2244]/30 px-2 py-0.5 rounded">Banned</span>}
                      </div>
                      <div className="text-[#a0a0b0] text-sm">{u.email ?? "No email"}</div>
                      {u.freefireUid && <div className="text-[#a0a0b0] text-xs font-mono">FF UID: {u.freefireUid}</div>}
                      <div className="text-[#a0a0b0] text-xs">Joined: {new Date(u.createdAt).toLocaleDateString()}</div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => toggleBan(u.clerkId, u.isBanned)}
                        className={`px-3 py-1.5 font-bold text-xs uppercase rounded-lg transition-colors border ${
                          u.isBanned
                            ? "bg-[#00ff88]/10 border-[#00ff88]/30 text-[#00ff88] hover:bg-[#00ff88]/20"
                            : "bg-[#ff2244]/10 border-[#ff2244]/30 text-[#ff2244] hover:bg-[#ff2244]/20"
                        }`}
                      >
                        {u.isBanned ? "Unban" : "Ban"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ANNOUNCEMENTS */}
          {activeTab === "announcements" && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-black uppercase">Manage <span className="text-[#ff6b00]">Announcements</span></h1>
                <button onClick={() => setShowAnnForm(true)} className="flex items-center gap-2 px-4 py-2 bg-[#ff6b00] text-white font-bold text-sm uppercase rounded-xl hover:bg-[#e66000] transition-colors">
                  <Plus className="w-4 h-4" /> New Announcement
                </button>
              </div>

              {showAnnForm && (
                <div className="bg-[#12121a] border border-[#ff6b00]/20 rounded-xl p-6 mb-6">
                  <h2 className="font-black uppercase text-[#ff6b00] mb-4">Post Announcement</h2>
                  <form onSubmit={createAnnouncement} className="space-y-4">
                    <div>
                      <label className="label-sm">Title *</label>
                      <input value={annForm.title} onChange={(e) => setAnnForm({ ...annForm, title: e.target.value })} required placeholder="Announcement title..." className="admin-input" />
                    </div>
                    <div>
                      <label className="label-sm">Content *</label>
                      <textarea value={annForm.content} onChange={(e) => setAnnForm({ ...annForm, content: e.target.value })} required rows={4} placeholder="Announcement content..." className="admin-input resize-none" />
                    </div>
                    <div>
                      <label className="label-sm">Type</label>
                      <select value={annForm.type} onChange={(e) => setAnnForm({ ...annForm, type: e.target.value })} className="admin-input">
                        <option value="info">Info (Blue)</option>
                        <option value="success">Success (Green)</option>
                        <option value="warning">Warning (Yellow)</option>
                        <option value="urgent">Urgent (Red)</option>
                      </select>
                    </div>
                    <div className="flex gap-3">
                      <button type="submit" className="px-6 py-2.5 bg-[#ff6b00] text-white font-bold text-sm uppercase rounded-xl hover:bg-[#e66000] transition-colors">Post Announcement</button>
                      <button type="button" onClick={() => setShowAnnForm(false)} className="px-6 py-2.5 bg-[#1a1a24] text-[#a0a0b0] font-bold text-sm uppercase rounded-xl hover:text-white transition-colors">Cancel</button>
                    </div>
                  </form>
                </div>
              )}

              <div className="space-y-3">
                {announcements.length === 0 ? (
                  <div className="bg-[#12121a] rounded-xl border border-[#ff6b00]/10 p-12 text-center text-[#a0a0b0]">
                    <Bell className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    <p>No announcements yet.</p>
                  </div>
                ) : announcements.map((a: any) => (
                  <div key={a.id} className="bg-[#12121a] rounded-xl border border-[#ff6b00]/10 p-4 flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-white">{a.title}</span>
                        <span className={`text-xs px-2 py-0.5 rounded border font-bold uppercase ${
                          a.type === "urgent" ? "text-[#ff2244] border-[#ff2244]/30 bg-[#ff2244]/10" :
                          a.type === "warning" ? "text-yellow-400 border-yellow-400/30 bg-yellow-400/10" :
                          a.type === "success" ? "text-[#00ff88] border-[#00ff88]/30 bg-[#00ff88]/10" :
                          "text-blue-400 border-blue-400/30 bg-blue-400/10"
                        }`}>{a.type}</span>
                      </div>
                      <p className="text-[#a0a0b0] text-sm">{a.content}</p>
                      <p className="text-[#a0a0b0] text-xs mt-1">{new Date(a.createdAt).toLocaleString()}</p>
                    </div>
                    <button onClick={() => deleteAnnouncement(a.id)} className="p-2 bg-[#ff2244]/10 border border-[#ff2244]/20 rounded-lg text-[#ff2244] hover:bg-[#ff2244]/20 transition-colors shrink-0">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* DEPOSITS */}
          {activeTab === "deposits" && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-black uppercase">Deposit <span className="text-[#ff6b00]">Requests</span></h1>
                <button onClick={loadWallet} className="flex items-center gap-2 text-sm text-[#a0a0b0] hover:text-white transition-colors">
                  <RefreshCw className="w-4 h-4" /> Refresh
                </button>
              </div>
              <div className="space-y-3">
                {deposits.length === 0 ? (
                  <div className="bg-[#12121a] rounded-xl border border-[#ff6b00]/10 p-12 text-center text-[#a0a0b0]">
                    <ArrowDownCircle className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    <p>No deposit requests yet.</p>
                  </div>
                ) : deposits.map((tx: any) => (
                  <div key={tx.id} className="bg-[#12121a] rounded-xl border border-[#ff6b00]/10 p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex-1">
                      <div className="font-bold text-white">৳{Number(tx.amount).toLocaleString()} via {tx.method.toUpperCase()}</div>
                      <div className="text-[#a0a0b0] text-sm">Account: <span className="font-mono">{tx.accountNumber}</span></div>
                      {tx.transactionId && <div className="text-[#a0a0b0] text-xs font-mono">TX: {tx.transactionId}</div>}
                      <div className="text-[#a0a0b0] text-xs">{new Date(tx.createdAt).toLocaleString()}</div>
                      {tx.screenshot && <a href={tx.screenshot} target="_blank" rel="noopener noreferrer" className="text-[#ff6b00] text-xs hover:underline">View Screenshot</a>}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={statusBadge(tx.status)}>{tx.status}</span>
                      {tx.status === "pending" && (
                        <>
                          <button onClick={() => approveWallet(tx.id)} className="p-1.5 bg-[#00ff88]/10 border border-[#00ff88]/30 rounded-lg text-[#00ff88] hover:bg-[#00ff88]/20"><CheckCircle className="w-4 h-4" /></button>
                          <button onClick={() => rejectWallet(tx.id)} className="p-1.5 bg-[#ff2244]/10 border border-[#ff2244]/30 rounded-lg text-[#ff2244] hover:bg-[#ff2244]/20"><XCircle className="w-4 h-4" /></button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* WITHDRAWALS */}
          {activeTab === "withdrawals" && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-black uppercase">Withdrawal <span className="text-[#ff6b00]">Requests</span></h1>
                <button onClick={loadWallet} className="flex items-center gap-2 text-sm text-[#a0a0b0] hover:text-white transition-colors">
                  <RefreshCw className="w-4 h-4" /> Refresh
                </button>
              </div>
              <div className="space-y-3">
                {withdrawals.length === 0 ? (
                  <div className="bg-[#12121a] rounded-xl border border-[#ff6b00]/10 p-12 text-center text-[#a0a0b0]">
                    <ArrowUpCircle className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    <p>No withdrawal requests yet.</p>
                  </div>
                ) : withdrawals.map((tx: any) => (
                  <div key={tx.id} className="bg-[#12121a] rounded-xl border border-[#ff6b00]/10 p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex-1">
                      <div className="font-bold text-white">৳{Number(tx.amount).toLocaleString()} via {tx.method.toUpperCase()}</div>
                      <div className="text-[#a0a0b0] text-sm">To: <span className="font-mono">{tx.accountNumber}</span></div>
                      <div className="text-[#a0a0b0] text-xs">{new Date(tx.createdAt).toLocaleString()}</div>
                      {tx.adminNote && <div className="text-[#ff2244] text-xs mt-1">Note: {tx.adminNote}</div>}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={statusBadge(tx.status)}>{tx.status}</span>
                      {tx.status === "pending" && (
                        <>
                          <button onClick={() => approveWallet(tx.id)} className="p-1.5 bg-[#00ff88]/10 border border-[#00ff88]/30 rounded-lg text-[#00ff88] hover:bg-[#00ff88]/20"><CheckCircle className="w-4 h-4" /></button>
                          <button onClick={() => rejectWallet(tx.id)} className="p-1.5 bg-[#ff2244]/10 border border-[#ff2244]/30 rounded-lg text-[#ff2244] hover:bg-[#ff2244]/20"><XCircle className="w-4 h-4" /></button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* PROMO CODES */}
          {activeTab === "promo-codes" && (
            <PromoCodesTab apiFetch={apiFetch} toast={toast} />
          )}

        </div>
      </main>
    </div>
  );
}

function PromoCodesTab({ apiFetch, toast }: { apiFetch: any; toast: any }) {
  const [codes, setCodes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingCode, setEditingCode] = useState<any>(null);
  const [form, setForm] = useState({ code: "", bonusAmount: "", usageLimit: "100", expiresAt: "", isActive: true });
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/admin/promo-codes");
      if (res.ok) setCodes(await res.json());
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const url = editingCode ? `/admin/promo-codes/${editingCode.id}` : "/admin/promo-codes";
      const method = editingCode ? "PUT" : "POST";
      const res = await apiFetch(url, {
        method,
        body: JSON.stringify({
          code: form.code.toUpperCase(),
          bonusAmount: parseFloat(form.bonusAmount),
          usageLimit: parseInt(form.usageLimit),
          expiresAt: form.expiresAt || null,
          isActive: form.isActive,
        }),
      });
      if (res.ok) {
        toast({ title: editingCode ? "Promo code updated!" : "Promo code created!" });
        setShowForm(false);
        setEditingCode(null);
        setForm({ code: "", bonusAmount: "", usageLimit: "100", expiresAt: "", isActive: true });
        load();
      } else {
        const d = await res.json();
        toast({ title: "Error", description: d.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Connection error", variant: "destructive" });
    } finally { setSubmitting(false); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this promo code?")) return;
    const res = await apiFetch(`/admin/promo-codes/${id}`, { method: "DELETE" });
    if (res.ok) { toast({ title: "Deleted." }); load(); }
  };

  const startEdit = (code: any) => {
    setEditingCode(code);
    setForm({
      code: code.code,
      bonusAmount: String(code.bonusAmount),
      usageLimit: String(code.usageLimit),
      expiresAt: code.expiresAt ? new Date(code.expiresAt).toISOString().slice(0, 16) : "",
      isActive: code.isActive,
    });
    setShowForm(true);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-black uppercase">Promo <span className="text-[#ff6b00]">Codes</span></h1>
        <div className="flex items-center gap-2">
          <button onClick={load} className="flex items-center gap-2 text-sm text-[#a0a0b0] hover:text-white transition-colors">
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
          <button
            onClick={() => { setEditingCode(null); setForm({ code: "", bonusAmount: "", usageLimit: "100", expiresAt: "", isActive: true }); setShowForm(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-[#ff6b00] text-white rounded-xl text-sm font-bold uppercase hover:bg-[#e66000] transition-colors"
          >
            <Plus className="w-4 h-4" /> New Code
          </button>
        </div>
      </div>

      {showForm && (
        <div className="bg-[#12121a] border border-[#ff6b00]/20 rounded-2xl p-6 mb-6">
          <h3 className="font-black uppercase text-sm text-[#ff6b00] mb-4">{editingCode ? "Edit Promo Code" : "Create Promo Code"}</h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label-sm">Code *</label>
              <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} required placeholder="FFARENA100" className="admin-input font-mono" disabled={!!editingCode} />
            </div>
            <div>
              <label className="label-sm">Bonus Amount (৳) *</label>
              <input type="number" value={form.bonusAmount} onChange={(e) => setForm({ ...form, bonusAmount: e.target.value })} required min="1" placeholder="100" className="admin-input" />
            </div>
            <div>
              <label className="label-sm">Usage Limit</label>
              <input type="number" value={form.usageLimit} onChange={(e) => setForm({ ...form, usageLimit: e.target.value })} min="1" className="admin-input" />
            </div>
            <div>
              <label className="label-sm">Expires At</label>
              <input type="datetime-local" value={form.expiresAt} onChange={(e) => setForm({ ...form, expiresAt: e.target.value })} className="admin-input" />
            </div>
            <div className="flex items-center gap-3">
              <input type="checkbox" id="isActive" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="w-4 h-4 accent-[#ff6b00]" />
              <label htmlFor="isActive" className="text-white text-sm font-bold">Active</label>
            </div>
            <div className="flex gap-2 sm:col-span-2">
              <button type="submit" disabled={submitting} className="px-5 py-2 bg-[#ff6b00] text-white font-black uppercase rounded-xl text-sm hover:bg-[#e66000] disabled:opacity-50 transition-all">
                {submitting ? "Saving..." : (editingCode ? "Save Changes" : "Create Code")}
              </button>
              <button type="button" onClick={() => { setShowForm(false); setEditingCode(null); }} className="px-5 py-2 bg-[#1a1a24] text-[#a0a0b0] font-bold uppercase rounded-xl text-sm hover:text-white transition-colors">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">{[1,2,3].map((i) => <div key={i} className="h-16 bg-[#12121a] rounded-xl animate-pulse" />)}</div>
      ) : codes.length === 0 ? (
        <div className="bg-[#12121a] rounded-xl border border-[#ff6b00]/10 p-12 text-center text-[#a0a0b0]">
          <Tag className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p>No promo codes yet. Create one above.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {codes.map((code: any) => (
            <div key={code.id} className="bg-[#12121a] rounded-xl border border-[#ff6b00]/10 p-4 flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono font-black text-white text-lg">{code.code}</span>
                  <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded-full border ${code.isActive ? "text-[#00ff88] bg-[#00ff88]/10 border-[#00ff88]/30" : "text-[#a0a0b0] bg-[#1a1a24] border-[#2a2a36]"}`}>
                    {code.isActive ? "Active" : "Inactive"}
                  </span>
                </div>
                <div className="text-[#ff6b00] font-bold mt-1">৳{Number(code.bonusAmount).toLocaleString()} bonus</div>
                <div className="text-[#a0a0b0] text-xs mt-0.5">
                  Used {code.usageCount}/{code.usageLimit} times
                  {code.expiresAt && ` · Expires ${new Date(code.expiresAt).toLocaleDateString()}`}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => startEdit(code)} className="p-1.5 bg-[#ff6b00]/10 border border-[#ff6b00]/30 rounded-lg text-[#ff6b00] hover:bg-[#ff6b00]/20">
                  <Edit className="w-4 h-4" />
                </button>
                <button onClick={() => handleDelete(code.id)} className="p-1.5 bg-[#ff2244]/10 border border-[#ff2244]/30 rounded-lg text-[#ff2244] hover:bg-[#ff2244]/20">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
