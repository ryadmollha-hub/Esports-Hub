import { useState, useEffect, useCallback } from "react";
import { useLocation, Link } from "wouter";
import {
  Users, Trophy, Shield, Clock, DollarSign, CheckCircle, XCircle, Bell,
  Plus, Trash2, Edit, LogOut, BarChart3, Megaphone, Swords, CreditCard,
  ArrowDownCircle, ArrowUpCircle, Eye, EyeOff, RefreshCw, Home,
  Crown, Shuffle, X as XIcon, Tag, BookOpen, Key, Radio, Lock, Settings, Copy, MessageCircle, Send, Headphones, ChevronRight
} from "lucide-react";
import { isAdminAuthenticated, clearAdminSession, adminFetch } from "@/lib/adminAuth";
import { useToast } from "@/hooks/use-toast";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

async function safeJson(res: Response): Promise<any> {
  try {
    const text = await res.text();
    if (!text || !text.trim()) return {};
    return JSON.parse(text);
  } catch {
    return {};
  }
}

type Tab = "overview" | "tournaments" | "matches" | "users" | "registrations" | "announcements" | "deposits" | "withdrawals" | "promo-codes" | "rules" | "payment-settings" | "maintenance" | "support";

const tabs: { id: Tab; label: string; icon: any }[] = [
  { id: "overview", label: "Overview", icon: BarChart3 },
  { id: "tournaments", label: "Tournaments", icon: Trophy },
  { id: "matches", label: "Matches", icon: Swords },
  { id: "rules", label: "Game Rules", icon: BookOpen },
  { id: "registrations", label: "Registrations", icon: CheckCircle },
  { id: "users", label: "Users", icon: Users },
  { id: "announcements", label: "Announcements", icon: Megaphone },
  { id: "deposits", label: "Deposits", icon: ArrowDownCircle },
  { id: "withdrawals", label: "Withdrawals", icon: ArrowUpCircle },
  { id: "promo-codes", label: "Promo Codes", icon: Tag },
  { id: "payment-settings", label: "Payment Settings", icon: Settings },
  { id: "maintenance", label: "Maintenance", icon: Lock },
  { id: "support", label: "Support", icon: MessageCircle },
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
  const [annForm, setAnnForm] = useState({ title: "", content: "", type: "info", displayMode: "banner", isPinned: false, isActive: true, expiresAt: "" });
  const [showAnnForm, setShowAnnForm] = useState(false);
  const [editingAnn, setEditingAnn] = useState<any>(null);

  // Match form
  const [matchForm, setMatchForm] = useState({ matchNumber: "", scheduledAt: "", mapName: "", roomId: "", roomPassword: "", roomReleaseMinutes: "10" });
  const [showMatchForm, setShowMatchForm] = useState(false);
  const [matchRoomForm, setMatchRoomForm] = useState<Record<number, { roomId: string; roomPassword: string; releaseMinutes: string }>>({});
  const [settingMatchRoom, setSettingMatchRoom] = useState<Record<number, boolean>>({});
  const [updatingMatchStatus, setUpdatingMatchStatus] = useState<Record<number, boolean>>({});

  // Match result entry state
  const [expandedMatchResult, setExpandedMatchResult] = useState<Record<number, boolean>>({});
  const [matchResultRows, setMatchResultRows] = useState<Record<number, Array<{ playerName: string; rank: string; kills: string; points: string }>>>({});
  const [submittingMatchResult, setSubmittingMatchResult] = useState<Record<number, boolean>>({});

  // Room form
  const [roomForm, setRoomForm] = useState<Record<number, { roomId: string; roomPassword: string }>>({});

  // Maintenance mode
  const [maintenanceMode, setMaintenanceModeState] = useState<boolean>(false);
  const [maintenanceLoading, setMaintenanceLoading] = useState(false);

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
      if (res.ok) {
        const data = await safeJson(res);
        setTournaments(Array.isArray(data) ? data : data.tournaments ?? []);
      }
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
      const res = await apiFetch("/announcements/all");
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

  const loadMaintenance = useCallback(async () => {
    try {
      const res = await apiFetch("/settings/maintenance");
      if (res.ok) {
        const data = await safeJson(res);
        setMaintenanceModeState(!!data.maintenance);
      }
    } catch {}
  }, [apiFetch]);

  const toggleMaintenance = useCallback(async (enabled: boolean) => {
    setMaintenanceLoading(true);
    try {
      const res = await apiFetch("/admin/maintenance", {
        method: "POST",
        body: JSON.stringify({ enabled }),
      });
      if (res.ok) {
        setMaintenanceModeState(enabled);
        toast({ title: enabled ? "Maintenance mode enabled" : "Maintenance mode disabled", description: enabled ? "Users will see the maintenance page." : "Site is live for all users." });
      } else {
        const d = await safeJson(res);
        toast({ title: "Error", description: d.error ?? "Failed to update", variant: "destructive" });
      }
    } catch {
      toast({ title: "Connection error", variant: "destructive" });
    } finally {
      setMaintenanceLoading(false);
    }
  }, [apiFetch, toast]);

  useEffect(() => {
    if (!isAdminAuthenticated()) return;
    loadStats();
    loadTournaments();
    loadMaintenance();
  }, []);

  useEffect(() => {
    if (activeTab === "users") loadUsers();
    if (activeTab === "registrations") loadRegistrations();
    if (activeTab === "announcements") loadAnnouncements();
    if (activeTab === "deposits" || activeTab === "withdrawals") loadWallet();
    if (activeTab === "matches") { loadTournaments(); if (selectedTournament) loadMatches(); }
    if (activeTab === "maintenance") loadMaintenance();
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
        const d = await safeJson(res);
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
  const emptyAnnForm = { title: "", content: "", type: "info", displayMode: "banner", isPinned: false, isActive: true, expiresAt: "" };

  const saveAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      title: annForm.title,
      content: annForm.content,
      type: annForm.type,
      displayMode: annForm.displayMode,
      isPinned: annForm.isPinned,
      isActive: annForm.isActive,
      expiresAt: annForm.expiresAt || null,
    };
    const isEdit = !!editingAnn;
    const res = await apiFetch(isEdit ? `/announcements/${editingAnn.id}` : "/announcements", {
      method: isEdit ? "PUT" : "POST",
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      toast({ title: isEdit ? "Announcement updated" : "Announcement posted" });
      setAnnForm(emptyAnnForm);
      setShowAnnForm(false);
      setEditingAnn(null);
      loadAnnouncements();
    } else {
      const d = await safeJson(res);
      toast({ title: "Error", description: d.error ?? "Failed", variant: "destructive" });
    }
  };

  const editAnnouncement = (a: any) => {
    setEditingAnn(a);
    setAnnForm({
      title: a.title,
      content: a.content,
      type: a.type,
      displayMode: a.displayMode ?? "banner",
      isPinned: a.isPinned ?? false,
      isActive: a.isActive !== false,
      expiresAt: a.expiresAt ? new Date(a.expiresAt).toISOString().slice(0, 16) : "",
    });
    setShowAnnForm(true);
  };

  const pinAnnouncement = async (id: number) => {
    const res = await apiFetch(`/announcements/${id}/pin`, { method: "PATCH" });
    if (res.ok) { toast({ title: "Pin status updated" }); loadAnnouncements(); }
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
      const d = await safeJson(res);
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

  // Match room management
  const setMatchRoom = async (matchId: number) => {
    const form = matchRoomForm[matchId];
    if (!form?.roomId || !form?.roomPassword) {
      return toast({ title: "Enter Room ID and Password", variant: "destructive" });
    }
    setSettingMatchRoom((prev) => ({ ...prev, [matchId]: true }));
    try {
      const res = await apiFetch(`/matches/${matchId}/room`, {
        method: "PATCH",
        body: JSON.stringify({
          roomId: form.roomId,
          roomPassword: form.roomPassword,
          roomReleaseMinutesBefore: parseInt(form.releaseMinutes || "10"),
        }),
      });
      if (res.ok) {
        toast({ title: "✅ Room set! Status → Live", description: `Room details will be visible ${form.releaseMinutes || "10"} min before match time.` });
        loadMatches();
        setMatchRoomForm((prev) => ({ ...prev, [matchId]: { roomId: "", roomPassword: "", releaseMinutes: "10" } }));
      } else {
        const d = await safeJson(res);
        toast({ title: "Error", description: d.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Connection error", variant: "destructive" });
    } finally {
      setSettingMatchRoom((prev) => ({ ...prev, [matchId]: false }));
    }
  };

  const updateMatchStatus = async (matchId: number, status: string) => {
    setUpdatingMatchStatus((prev) => ({ ...prev, [matchId]: true }));
    try {
      const res = await apiFetch(`/matches/${matchId}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        toast({ title: `Match status → ${status}` });
        loadMatches();
      } else {
        const d = await safeJson(res);
        toast({ title: "Error", description: d.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Connection error", variant: "destructive" });
    } finally {
      setUpdatingMatchStatus((prev) => ({ ...prev, [matchId]: false }));
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
        roomId: matchForm.roomId || undefined,
        roomPassword: matchForm.roomPassword || undefined,
      }),
    });
    if (res.ok) {
      toast({ title: "Match created" });
      setMatchForm({ matchNumber: "", scheduledAt: "", mapName: "", roomId: "", roomPassword: "", roomReleaseMinutes: "10" });
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
        const d = await safeJson(res);
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
      const d = await safeJson(res);
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
      const d = await safeJson(res);
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
              {/* Maintenance mode quick card */}
              <div
                className={`mb-6 rounded-xl border p-4 flex items-center justify-between cursor-pointer transition-all ${maintenanceMode ? "bg-[#ff2244]/10 border-[#ff2244]/30" : "bg-[#12121a] border-[#2a2a36] hover:border-[#ff6b00]/30"}`}
                onClick={() => setActiveTab("maintenance")}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${maintenanceMode ? "bg-[#ff2244]/20" : "bg-[#1a1a24]"}`}>
                    <Lock className={`w-5 h-5 ${maintenanceMode ? "text-[#ff2244]" : "text-[#a0a0b0]"}`} />
                  </div>
                  <div>
                    <div className="font-bold text-white text-sm">Maintenance Mode</div>
                    <div className={`text-xs ${maintenanceMode ? "text-[#ff2244]" : "text-[#00ff88]"}`}>
                      {maintenanceMode ? "⚠ Site is offline for regular users" : "✓ Site is live and accessible"}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-bold uppercase px-2 py-1 rounded-full ${maintenanceMode ? "bg-[#ff2244]/20 text-[#ff2244]" : "bg-[#00ff88]/10 text-[#00ff88]"}`}>
                    {maintenanceMode ? "ON" : "OFF"}
                  </span>
                  <svg className="w-4 h-4 text-[#a0a0b0]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </div>
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
                  onClick={() => { setShowTForm(true); setEditingTournament(null); setTForm({ name: "", description: "", mode: "squad", startDate: "", endDate: "", maxSlots: "100", prizePool: "0", entryFee: "0", perKillReward: "0", status: "upcoming", bannerUrl: "", prize1Pct: "50", prize2Pct: "30", prize3Pct: "20" }); }}
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
                        <div>
                          <label className="label-sm">Room ID (optional)</label>
                          <input value={matchForm.roomId} onChange={(e) => setMatchForm({ ...matchForm, roomId: e.target.value })} placeholder="Room ID" className="admin-input" />
                        </div>
                        <div>
                          <label className="label-sm">Room Password (optional)</label>
                          <input value={matchForm.roomPassword} onChange={(e) => setMatchForm({ ...matchForm, roomPassword: e.target.value })} placeholder="Password" className="admin-input" />
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
                              {m.roomId && (
                                <div className="text-[#00ff88] text-xs mt-1 font-bold flex items-center gap-1">
                                  <Key className="w-3 h-3" /> Room: {m.roomId} · Pass: {m.roomPassword}
                                </div>
                              )}
                              {hasResults && (
                                <div className="text-[#00ff88] text-xs mt-1 font-bold">✓ {m.results.length} players ranked</div>
                              )}
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={statusBadge(m.status)}>{m.status}</span>
                              {m.status === "scheduled" && (
                                <button
                                  onClick={() => updateMatchStatus(m.id, "live")}
                                  disabled={updatingMatchStatus[m.id]}
                                  className="flex items-center gap-1 px-2.5 py-1.5 bg-green-500/10 border border-green-500/20 rounded-lg text-green-400 text-xs font-bold hover:bg-green-500/20 transition-colors disabled:opacity-50"
                                >
                                  <Radio className="w-3 h-3" /> Go Live
                                </button>
                              )}
                              {m.status === "live" && (
                                <button
                                  onClick={() => updateMatchStatus(m.id, "completed")}
                                  disabled={updatingMatchStatus[m.id]}
                                  className="flex items-center gap-1 px-2.5 py-1.5 bg-gray-500/10 border border-gray-500/20 rounded-lg text-gray-400 text-xs font-bold hover:bg-gray-500/20 transition-colors disabled:opacity-50"
                                >
                                  <CheckCircle className="w-3 h-3" /> Complete
                                </button>
                              )}
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

                          {/* Room Management Section */}
                          {m.status !== "completed" && (
                            <div className="border-t border-[#ff6b00]/5 bg-[#0d0d16]/60 px-4 py-3">
                              <p className="text-xs text-[#a0a0b0] uppercase font-bold mb-2 flex items-center gap-1.5">
                                <Key className="w-3 h-3" /> Room Details
                              </p>
                              {m.roomId ? (
                                <div className="flex items-center gap-4 text-xs mb-2">
                                  <span className="text-[#a0a0b0]">ID: <span className="text-white font-mono font-bold">{m.roomId}</span></span>
                                  <span className="text-[#a0a0b0]">Pass: <span className="text-white font-mono font-bold">{m.roomPassword}</span></span>
                                  <span className="text-[#00ff88] font-bold">✓ Visible to joined players</span>
                                </div>
                              ) : (
                                <p className="text-xs text-[#a0a0b0] mb-2">No room details set.</p>
                              )}
                              <div className="flex gap-2 flex-wrap items-end">
                                <div>
                                  <label className="text-[#606070] text-[10px] uppercase block mb-1">Room ID</label>
                                  <input
                                    placeholder="Room ID"
                                    value={matchRoomForm[m.id]?.roomId ?? ""}
                                    onChange={(e) => setMatchRoomForm({ ...matchRoomForm, [m.id]: { ...matchRoomForm[m.id], roomId: e.target.value } })}
                                    className="admin-input-sm w-28"
                                  />
                                </div>
                                <div>
                                  <label className="text-[#606070] text-[10px] uppercase block mb-1">Password</label>
                                  <input
                                    placeholder="Password"
                                    value={matchRoomForm[m.id]?.roomPassword ?? ""}
                                    onChange={(e) => setMatchRoomForm({ ...matchRoomForm, [m.id]: { ...matchRoomForm[m.id], roomPassword: e.target.value } })}
                                    className="admin-input-sm w-28"
                                  />
                                </div>
                                <div>
                                  <label className="text-[#606070] text-[10px] uppercase block mb-1">Release (min before)</label>
                                  <select
                                    value={matchRoomForm[m.id]?.releaseMinutes ?? "10"}
                                    onChange={(e) => setMatchRoomForm({ ...matchRoomForm, [m.id]: { ...matchRoomForm[m.id], releaseMinutes: e.target.value } })}
                                    className="admin-input-sm w-24"
                                  >
                                    <option value="5">5 min</option>
                                    <option value="10">10 min</option>
                                    <option value="15">15 min</option>
                                    <option value="30">30 min</option>
                                    <option value="0">Immediately</option>
                                  </select>
                                </div>
                                <button
                                  onClick={() => setMatchRoom(m.id)}
                                  disabled={settingMatchRoom[m.id]}
                                  className="px-3 py-1.5 bg-[#ff6b00] text-white font-bold text-xs uppercase rounded-lg hover:bg-[#e66000] transition-colors disabled:opacity-50"
                                >
                                  {settingMatchRoom[m.id] ? "Setting..." : "Set Room & Go Live"}
                                </button>
                              </div>
                            </div>
                          )}

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
                <button
                  onClick={() => { setEditingAnn(null); setAnnForm(emptyAnnForm); setShowAnnForm((v) => !v); }}
                  className="flex items-center gap-2 px-4 py-2 bg-[#ff6b00] text-white font-bold text-sm uppercase rounded-xl hover:bg-[#e66000] transition-colors"
                >
                  <Plus className="w-4 h-4" /> New Announcement
                </button>
              </div>

              {showAnnForm && (
                <div className="bg-[#12121a] border border-[#ff6b00]/20 rounded-xl p-6 mb-6">
                  <h2 className="font-black uppercase text-[#ff6b00] mb-4">{editingAnn ? "Edit Announcement" : "Post Announcement"}</h2>
                  <form onSubmit={saveAnnouncement} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="md:col-span-2">
                        <label className="label-sm">Title *</label>
                        <input value={annForm.title} onChange={(e) => setAnnForm({ ...annForm, title: e.target.value })} required placeholder="Announcement title..." className="admin-input" />
                      </div>
                      <div className="md:col-span-2">
                        <label className="label-sm">Content *</label>
                        <textarea value={annForm.content} onChange={(e) => setAnnForm({ ...annForm, content: e.target.value })} required rows={4} placeholder="Write the announcement content here..." className="admin-input resize-none" />
                      </div>
                      <div>
                        <label className="label-sm">Type</label>
                        <select value={annForm.type} onChange={(e) => setAnnForm({ ...annForm, type: e.target.value })} className="admin-input">
                          <option value="info">ℹ️ Info (Blue)</option>
                          <option value="success">✅ Success (Green)</option>
                          <option value="warning">⚠️ Warning (Yellow)</option>
                          <option value="urgent">🚨 Urgent (Red)</option>
                        </select>
                      </div>
                      <div>
                        <label className="label-sm">Display Mode</label>
                        <select value={annForm.displayMode} onChange={(e) => setAnnForm({ ...annForm, displayMode: e.target.value })} className="admin-input">
                          <option value="banner">🔔 Banner (Homepage feed)</option>
                          <option value="popup">💬 Popup (Login notification)</option>
                        </select>
                      </div>
                      <div>
                        <label className="label-sm">Expiry Date <span className="font-normal normal-case text-[#a0a0b0]">(optional)</span></label>
                        <input type="datetime-local" value={annForm.expiresAt} onChange={(e) => setAnnForm({ ...annForm, expiresAt: e.target.value })} className="admin-input" />
                      </div>
                      <div className="flex gap-6 items-center pt-5">
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                          <input type="checkbox" checked={annForm.isPinned} onChange={(e) => setAnnForm({ ...annForm, isPinned: e.target.checked })}
                            className="w-4 h-4 accent-[#ff6b00]" />
                          <span className="text-sm font-bold text-white">📌 Pin to top</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                          <input type="checkbox" checked={annForm.isActive} onChange={(e) => setAnnForm({ ...annForm, isActive: e.target.checked })}
                            className="w-4 h-4 accent-[#00ff88]" />
                          <span className="text-sm font-bold text-white">✅ Active</span>
                        </label>
                      </div>
                    </div>
                    <div className="flex gap-3 pt-2">
                      <button type="submit" className="px-6 py-2.5 bg-[#ff6b00] text-white font-bold text-sm uppercase rounded-xl hover:bg-[#e66000] transition-colors">
                        {editingAnn ? "Update Announcement" : "Post Announcement"}
                      </button>
                      <button type="button" onClick={() => { setShowAnnForm(false); setEditingAnn(null); setAnnForm(emptyAnnForm); }}
                        className="px-6 py-2.5 bg-[#1a1a24] text-[#a0a0b0] font-bold text-sm uppercase rounded-xl hover:text-white transition-colors">Cancel</button>
                    </div>
                  </form>
                </div>
              )}

              <div className="space-y-3">
                {announcements.length === 0 ? (
                  <div className="bg-[#12121a] rounded-xl border border-[#ff6b00]/10 p-12 text-center text-[#a0a0b0]">
                    <Bell className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    <p>No announcements yet. Click "New Announcement" to create one.</p>
                  </div>
                ) : announcements.map((a: any) => (
                  <div key={a.id} className={`bg-[#12121a] rounded-xl border p-4 ${a.isPinned ? "border-[#ffd700]/30" : a.isActive ? "border-[#ff6b00]/10" : "border-[#2a2a36] opacity-60"}`}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          {a.isPinned && <span className="text-[#ffd700] text-xs">📌</span>}
                          <span className="font-bold text-white truncate">{a.title}</span>
                          <span className={`text-xs px-2 py-0.5 rounded border font-bold uppercase shrink-0 ${
                            a.type === "urgent" ? "text-[#ff2244] border-[#ff2244]/30 bg-[#ff2244]/10" :
                            a.type === "warning" ? "text-yellow-400 border-yellow-400/30 bg-yellow-400/10" :
                            a.type === "success" ? "text-[#00ff88] border-[#00ff88]/30 bg-[#00ff88]/10" :
                            "text-blue-400 border-blue-400/30 bg-blue-400/10"
                          }`}>{a.type}</span>
                          <span className={`text-xs px-2 py-0.5 rounded border font-bold uppercase shrink-0 ${
                            a.displayMode === "popup" ? "text-purple-400 border-purple-400/30 bg-purple-400/10" : "text-[#a0a0b0] border-[#2a2a36] bg-[#1a1a24]"
                          }`}>{a.displayMode ?? "banner"}</span>
                          {!a.isActive && <span className="text-xs px-2 py-0.5 rounded border font-bold uppercase text-[#a0a0b0] border-[#2a2a36] bg-[#1a1a24]">Inactive</span>}
                        </div>
                        <p className="text-[#a0a0b0] text-sm line-clamp-2">{a.content}</p>
                        <div className="flex flex-wrap gap-3 mt-1 text-xs text-[#a0a0b0]">
                          <span>{new Date(a.createdAt).toLocaleString()}</span>
                          {a.expiresAt && <span>Expires: {new Date(a.expiresAt).toLocaleString()}</span>}
                        </div>
                      </div>
                      <div className="flex gap-1.5 shrink-0">
                        <button onClick={() => pinAnnouncement(a.id)} title={a.isPinned ? "Unpin" : "Pin"} className={`p-2 rounded-lg border transition-colors ${a.isPinned ? "bg-[#ffd700]/20 border-[#ffd700]/30 text-[#ffd700]" : "bg-[#1a1a24] border-[#2a2a36] text-[#a0a0b0] hover:text-[#ffd700]"}`}>
                          📌
                        </button>
                        <button onClick={() => editAnnouncement(a)} title="Edit" className="p-2 bg-[#1a1a24] border border-[#2a2a36] rounded-lg text-[#a0a0b0] hover:text-[#ff6b00] hover:border-[#ff6b00]/30 transition-colors">
                          <Edit className="w-4 h-4" />
                        </button>
                        <button onClick={() => deleteAnnouncement(a.id)} title="Delete" className="p-2 bg-[#ff2244]/10 border border-[#ff2244]/20 rounded-lg text-[#ff2244] hover:bg-[#ff2244]/20 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
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

          {/* GAME RULES */}
          {activeTab === "rules" && (
            <RulesTab apiFetch={apiFetch} toast={toast} tournaments={tournaments} />
          )}

          {/* PROMO CODES */}
          {activeTab === "promo-codes" && (
            <PromoCodesTab apiFetch={apiFetch} toast={toast} />
          )}

          {/* PAYMENT SETTINGS */}
          {activeTab === "payment-settings" && (
            <PaymentSettingsTab apiFetch={apiFetch} toast={toast} />
          )}

          {/* MAINTENANCE */}
          {activeTab === "support" && (
            <SupportAdminTab apiFetch={apiFetch} toast={toast} />
          )}

          {activeTab === "maintenance" && (
            <div className="max-w-xl">
              <div className="mb-6">
                <h1 className="text-2xl font-black uppercase">
                  Maintenance <span className="text-[#ff6b00]">Mode</span>
                </h1>
                <p className="text-[#a0a0b0] text-sm mt-1">
                  Control site-wide availability. When enabled, only admins can access the platform.
                </p>
              </div>

              {/* Status card */}
              <div className={`rounded-2xl border p-6 mb-6 transition-all ${maintenanceMode ? "bg-[#ff2244]/8 border-[#ff2244]/30" : "bg-[#00ff88]/5 border-[#00ff88]/20"}`}>
                <div className="flex items-center gap-4 mb-5">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${maintenanceMode ? "bg-[#ff2244]/15" : "bg-[#00ff88]/10"}`}>
                    <Lock className={`w-7 h-7 ${maintenanceMode ? "text-[#ff2244]" : "text-[#00ff88]"}`} />
                  </div>
                  <div>
                    <div className="text-white font-black text-lg">
                      {maintenanceMode ? "Site is in Maintenance" : "Site is Live"}
                    </div>
                    <div className={`text-sm ${maintenanceMode ? "text-[#ff2244]" : "text-[#00ff88]"}`}>
                      {maintenanceMode
                        ? "Regular users see the maintenance page"
                        : "All users can access the platform normally"}
                    </div>
                  </div>
                  <div className={`ml-auto px-3 py-1.5 rounded-full text-xs font-black uppercase ${maintenanceMode ? "bg-[#ff2244]/20 text-[#ff2244]" : "bg-[#00ff88]/15 text-[#00ff88]"}`}>
                    {maintenanceMode ? "ON" : "OFF"}
                  </div>
                </div>

                {/* Toggle */}
                <div className="flex gap-3">
                  <button
                    onClick={() => toggleMaintenance(true)}
                    disabled={maintenanceLoading || maintenanceMode}
                    className="flex-1 py-3 rounded-xl font-black uppercase text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-[#ff2244] text-white hover:bg-[#e61f3c] shadow-[0_0_20px_rgba(255,34,68,0.3)]"
                  >
                    {maintenanceLoading && maintenanceMode === false ? "Enabling…" : "Enable Maintenance"}
                  </button>
                  <button
                    onClick={() => toggleMaintenance(false)}
                    disabled={maintenanceLoading || !maintenanceMode}
                    className="flex-1 py-3 rounded-xl font-black uppercase text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-[#00ff88] text-[#0a0a0f] hover:bg-[#00e07a]"
                  >
                    {maintenanceLoading && maintenanceMode === true ? "Disabling…" : "Disable Maintenance"}
                  </button>
                </div>
              </div>

              {/* What happens card */}
              <div className="bg-[#12121a] rounded-xl border border-[#2a2a36] p-5">
                <div className="text-xs font-black uppercase text-[#ff6b00] tracking-wider mb-4">What happens when maintenance is ON</div>
                <ul className="space-y-3">
                  {[
                    { icon: "🚫", text: "Regular users are redirected to the maintenance page" },
                    { icon: "✅", text: "Admins can still access all admin panel features" },
                    { icon: "🔐", text: "Admin login page remains accessible" },
                    { icon: "⚡", text: "Changes take effect within 10 seconds (cached)" },
                    { icon: "💾", text: "Status is persisted in the database — survives restarts" },
                  ].map((item) => (
                    <li key={item.text} className="flex items-start gap-3 text-sm text-[#a0a0b0]">
                      <span className="text-base leading-none mt-0.5">{item.icon}</span>
                      {item.text}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}

function RulesTab({ apiFetch, toast, tournaments }: { apiFetch: any; toast: any; tournaments: any[] }) {
  const [selectedTournament, setSelectedTournament] = useState<number | null>(null);
  const [rules, setRules] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingRule, setEditingRule] = useState<any>(null);
  const [form, setForm] = useState({ title: "", content: "", orderIndex: "0" });
  const [submitting, setSubmitting] = useState(false);

  const loadRules = async (tid: number) => {
    setLoading(true);
    try {
      const res = await apiFetch(`/tournaments/${tid}/rules`);
      if (res.ok) setRules(await res.json());
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => {
    if (selectedTournament) loadRules(selectedTournament);
  }, [selectedTournament]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTournament) return;
    setSubmitting(true);
    try {
      const url = editingRule ? `/rules/${editingRule.id}` : `/tournaments/${selectedTournament}/rules`;
      const method = editingRule ? "PATCH" : "POST";
      const res = await apiFetch(url, {
        method,
        body: JSON.stringify({
          title: form.title,
          content: form.content,
          orderIndex: parseInt(form.orderIndex) || 0,
        }),
      });
      if (res.ok) {
        toast({ title: editingRule ? "Rule updated!" : "Rule added!" });
        setShowForm(false);
        setEditingRule(null);
        setForm({ title: "", content: "", orderIndex: "0" });
        loadRules(selectedTournament);
      } else {
        const d = await safeJson(res);
        toast({ title: "Error", description: d.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Connection error", variant: "destructive" });
    } finally { setSubmitting(false); }
  };

  const deleteRule = async (id: number) => {
    if (!confirm("Delete this rule?")) return;
    if (!selectedTournament) return;
    const res = await apiFetch(`/rules/${id}`, { method: "DELETE" });
    if (res.ok) { toast({ title: "Rule deleted" }); loadRules(selectedTournament); }
  };

  const startEdit = (rule: any) => {
    setEditingRule(rule);
    setForm({ title: rule.title, content: rule.content, orderIndex: String(rule.orderIndex) });
    setShowForm(true);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-black uppercase">Game <span className="text-[#ff6b00]">Rules</span></h1>
        {selectedTournament && (
          <button
            onClick={() => { setEditingRule(null); setForm({ title: "", content: "", orderIndex: String(rules.length) }); setShowForm(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-[#ff6b00] text-white rounded-xl text-sm font-bold uppercase hover:bg-[#e66000] transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Rule
          </button>
        )}
      </div>

      <div className="mb-6">
        <label className="label-sm mb-2 block">Select Tournament</label>
        <select
          value={selectedTournament ?? ""}
          onChange={(e) => {
            const tid = e.target.value ? parseInt(e.target.value) : null;
            setSelectedTournament(tid);
            setShowForm(false);
            setEditingRule(null);
          }}
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
          {showForm && (
            <div className="bg-[#12121a] border border-[#ff6b00]/20 rounded-xl p-6 mb-4">
              <h2 className="font-black uppercase text-[#ff6b00] mb-4">{editingRule ? "Edit Rule" : "Add New Rule"}</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="md:col-span-3">
                    <label className="label-sm">Rule Title *</label>
                    <input
                      value={form.title}
                      onChange={(e) => setForm({ ...form, title: e.target.value })}
                      required
                      placeholder="e.g. No Hacking / Cheating"
                      className="admin-input"
                    />
                  </div>
                  <div>
                    <label className="label-sm">Order #</label>
                    <input
                      type="number"
                      value={form.orderIndex}
                      onChange={(e) => setForm({ ...form, orderIndex: e.target.value })}
                      min="0"
                      className="admin-input"
                    />
                  </div>
                </div>
                <div>
                  <label className="label-sm">Rule Content *</label>
                  <textarea
                    value={form.content}
                    onChange={(e) => setForm({ ...form, content: e.target.value })}
                    required
                    rows={3}
                    placeholder="Describe the rule in detail..."
                    className="admin-input resize-none"
                  />
                </div>
                <div className="flex gap-3">
                  <button type="submit" disabled={submitting} className="px-6 py-2.5 bg-[#ff6b00] text-white font-bold text-sm uppercase rounded-xl hover:bg-[#e66000] disabled:opacity-50 transition-colors">
                    {submitting ? "Saving..." : editingRule ? "Update Rule" : "Add Rule"}
                  </button>
                  <button type="button" onClick={() => { setShowForm(false); setEditingRule(null); }} className="px-6 py-2.5 bg-[#1a1a24] text-[#a0a0b0] font-bold text-sm uppercase rounded-xl hover:text-white transition-colors">
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {loading ? (
            <div className="space-y-3">
              {[1,2,3].map((i) => <div key={i} className="h-16 bg-[#12121a] rounded-xl animate-pulse" />)}
            </div>
          ) : rules.length === 0 ? (
            <div className="bg-[#12121a] rounded-xl border border-[#ff6b00]/10 p-12 text-center text-[#a0a0b0]">
              <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p>No rules added for this tournament yet.</p>
              <p className="text-xs mt-1">Click "Add Rule" to create the first rule.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {rules.map((rule: any, i: number) => (
                <div key={rule.id} className="bg-[#12121a] rounded-xl border border-[#ff6b00]/10 p-4 flex items-start gap-4">
                  <div className="w-7 h-7 rounded-full bg-[#ff6b00]/15 border border-[#ff6b00]/30 text-[#ff6b00] text-xs font-black flex items-center justify-center shrink-0 mt-0.5">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-white text-sm mb-1">{rule.title}</div>
                    <div className="text-[#a0a0b0] text-sm leading-relaxed whitespace-pre-line">{rule.content}</div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => startEdit(rule)} className="p-2 bg-blue-400/10 border border-blue-400/20 rounded-lg text-blue-400 hover:bg-blue-400/20 transition-colors">
                      <Edit className="w-4 h-4" />
                    </button>
                    <button onClick={() => deleteRule(rule.id)} className="p-2 bg-[#ff2244]/10 border border-[#ff2244]/20 rounded-lg text-[#ff2244] hover:bg-[#ff2244]/20 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
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
        const d = await safeJson(res);
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

function PaymentSettingsTab({ apiFetch, toast }: { apiFetch: any; toast: any }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ bkash_number: "", nagad_number: "", rocket_number: "" });
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    apiFetch("/payment-settings")
      .then((r: Response) => r.json())
      .then((d: any) => {
        if (d?.bkash_number) setForm({ bkash_number: d.bkash_number, nagad_number: d.nagad_number, rocket_number: d.rocket_number });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.bkash_number.trim() || !form.nagad_number.trim() || !form.rocket_number.trim()) {
      toast({ title: "All payment numbers are required.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const res = await apiFetch("/admin/payment-settings", {
        method: "PUT",
        body: JSON.stringify(form),
      });
      if (res.ok) {
        toast({ title: "Payment numbers updated!", description: "Users will see the new numbers immediately." });
      } else {
        const d = await safeJson(res);
        toast({ title: "Error", description: d.error ?? "Failed to save", variant: "destructive" });
      }
    } catch {
      toast({ title: "Connection error", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const copyNum = (num: string, label: string) => {
    navigator.clipboard.writeText(num);
    setCopied(label);
    setTimeout(() => setCopied(null), 1500);
  };

  const methods = [
    { key: "bkash_number" as const, label: "bKash", color: "text-pink-400 border-pink-500/30 bg-pink-500/8", dot: "bg-pink-400" },
    { key: "nagad_number" as const, label: "Nagad", color: "text-orange-400 border-orange-500/30 bg-orange-500/8", dot: "bg-orange-400" },
    { key: "rocket_number" as const, label: "Rocket", color: "text-purple-400 border-purple-500/30 bg-purple-500/8", dot: "bg-purple-400" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <Settings className="w-5 h-5 text-[#ff6b00]" />
        <h2 className="text-white font-black uppercase tracking-wide text-lg">Payment Settings</h2>
      </div>
      <p className="text-[#a0a0b0] text-sm -mt-3">Set the payment numbers users see when depositing. Only admins can update these.</p>

      <div className="bg-[#12121a] rounded-xl border border-[#ff6b00]/15 p-5">
        <h3 className="text-white font-black uppercase text-xs tracking-widest mb-4 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[#00ff88]" /> Current Active Numbers
        </h3>
        {loading ? (
          <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-12 bg-[#0a0a0f] rounded-xl animate-pulse" />)}</div>
        ) : (
          <div className="space-y-3">
            {methods.map((m) => (
              <div key={m.key} className={`flex items-center justify-between rounded-xl border px-4 py-3 ${m.color}`}>
                <div className="flex items-center gap-3">
                  <span className={`w-2 h-2 rounded-full ${m.dot}`} />
                  <span className="font-black text-xs uppercase tracking-wider">{m.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-white">{form[m.key] || "—"}</span>
                  <button
                    type="button"
                    onClick={() => copyNum(form[m.key], m.key)}
                    className="w-7 h-7 rounded-lg bg-[#1a1a24] border border-[#2a2a36] flex items-center justify-center text-[#a0a0b0] hover:text-white transition-colors"
                  >
                    {copied === m.key ? <CheckCircle className="w-3.5 h-3.5 text-[#00ff88]" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-[#12121a] rounded-xl border border-[#ff6b00]/15 p-5">
        <h3 className="text-white font-black uppercase text-xs tracking-widest mb-5 flex items-center gap-2">
          <Edit className="w-3.5 h-3.5 text-[#ff6b00]" /> Update Payment Numbers
        </h3>
        {loading ? (
          <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="h-16 bg-[#0a0a0f] rounded-xl animate-pulse" />)}</div>
        ) : (
          <form onSubmit={handleSave} className="space-y-4">
            {methods.map((m) => (
              <div key={m.key}>
                <label className="block text-[#a0a0b0] text-xs uppercase tracking-wider mb-1.5 font-bold">
                  <span className={`inline-block w-2 h-2 rounded-full mr-1.5 ${m.dot}`} />
                  {m.label} Number *
                </label>
                <input
                  type="text"
                  value={form[m.key]}
                  onChange={(e) => setForm({ ...form, [m.key]: e.target.value })}
                  required
                  placeholder="01XXXXXXXXX"
                  className="admin-input font-mono"
                />
              </div>
            ))}
            <div className="bg-yellow-500/8 border border-yellow-500/20 rounded-xl px-4 py-3 flex items-start gap-2">
              <Shield className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
              <p className="text-yellow-400 text-xs">These numbers are shown to all users on the payment screen. Only admins can change them. Users cannot modify payment numbers.</p>
            </div>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-3 bg-[#ff6b00] text-white font-black uppercase rounded-xl text-sm hover:bg-[#e66000] disabled:opacity-50 transition-all"
            >
              {saving ? "Saving..." : "Save Payment Numbers"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

const TICKET_CATEGORY_LABELS: Record<string, string> = {
  payment_issue: "Payment Issue",
  tournament_issue: "Tournament Issue",
  match_issue: "Match Issue",
  account_issue: "Account Issue",
  technical_issue: "Technical Issue",
  other: "Other",
};

const TICKET_STATUS_CFG: Record<string, { label: string; cls: string }> = {
  open: { label: "Open", cls: "text-yellow-400 bg-yellow-400/10 border-yellow-400/30" },
  in_progress: { label: "In Progress", cls: "text-[#ff6b00] bg-[#ff6b00]/10 border-[#ff6b00]/30" },
  resolved: { label: "Resolved", cls: "text-[#00ff88] bg-[#00ff88]/10 border-[#00ff88]/30" },
  closed: { label: "Closed", cls: "text-[#a0a0b0] bg-[#a0a0b0]/10 border-[#a0a0b0]/30" },
};

function TicketStatusBadge({ status }: { status: string }) {
  const cfg = TICKET_STATUS_CFG[status] ?? TICKET_STATUS_CFG.open;
  return <span className={`inline-flex items-center px-2 py-0.5 rounded border text-xs font-bold uppercase ${cfg.cls}`}>{cfg.label}</span>;
}

function ticketTimeAgo(dateStr: string) {
  const ms = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function SupportAdminTab({ apiFetch, toast }: { apiFetch: any; toast: any }) {
  const [activeView, setActiveView] = useState<"tickets" | "settings">("tickets");

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Headphones className="w-5 h-5 text-[#ff6b00]" />
          <h1 className="text-2xl font-black uppercase">Support <span className="text-[#ff6b00]">Dashboard</span></h1>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setActiveView("tickets")}
            className={`px-4 py-2 rounded-xl text-sm font-bold uppercase transition-colors ${activeView === "tickets" ? "bg-[#ff6b00]/15 text-[#ff6b00] border border-[#ff6b00]/30" : "text-[#a0a0b0] hover:text-white"}`}
          >
            Tickets
          </button>
          <button
            onClick={() => setActiveView("settings")}
            className={`px-4 py-2 rounded-xl text-sm font-bold uppercase transition-colors ${activeView === "settings" ? "bg-[#ff6b00]/15 text-[#ff6b00] border border-[#ff6b00]/30" : "text-[#a0a0b0] hover:text-white"}`}
          >
            Settings
          </button>
        </div>
      </div>

      {activeView === "tickets" ? (
        <SupportTicketsView apiFetch={apiFetch} toast={toast} />
      ) : (
        <SupportSettingsView apiFetch={apiFetch} toast={toast} />
      )}
    </div>
  );
}

function SupportTicketsView({ apiFetch, toast }: { apiFetch: any; toast: any }) {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [loadingTicket, setLoadingTicket] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [sendingReply, setSendingReply] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");

  const loadTickets = async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/admin/support/tickets");
      if (res.ok) setTickets(await res.json());
    } catch {}
    finally { setLoading(false); }
  };

  const openTicket = async (id: number) => {
    setLoadingTicket(true);
    try {
      const res = await apiFetch(`/admin/support/tickets/${id}`);
      if (res.ok) setSelectedTicket(await res.json());
    } catch {}
    finally { setLoadingTicket(false); }
  };

  const sendReply = async () => {
    if (!replyText.trim() || !selectedTicket) return;
    setSendingReply(true);
    try {
      const res = await apiFetch(`/admin/support/tickets/${selectedTicket.id}/replies`, {
        method: "POST",
        body: JSON.stringify({ message: replyText }),
      });
      if (res.ok) {
        setReplyText("");
        await openTicket(selectedTicket.id);
        loadTickets();
        toast({ title: "Reply sent", description: "User has been notified." });
      } else {
        const d = await safeJson(res);
        toast({ title: "Error", description: d.error ?? "Failed", variant: "destructive" });
      }
    } catch {
      toast({ title: "Connection error", variant: "destructive" });
    } finally { setSendingReply(false); }
  };

  const changeStatus = async (id: number, status: string) => {
    try {
      const res = await apiFetch(`/admin/support/tickets/${id}/status`, {
        method: "PUT",
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        toast({ title: "Status updated" });
        if (selectedTicket?.id === id) {
          await openTicket(id);
        }
        loadTickets();
      }
    } catch {}
  };

  const deleteTicket = async (id: number) => {
    if (!confirm("Delete this ticket permanently? This cannot be undone.")) return;
    try {
      const res = await apiFetch(`/admin/support/tickets/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast({ title: "Ticket deleted" });
        setSelectedTicket(null);
        loadTickets();
      }
    } catch {}
  };

  useEffect(() => { loadTickets(); }, []);

  const filtered = statusFilter === "all" ? tickets : tickets.filter((t) => t.status === statusFilter);

  if (selectedTicket) {
    return (
      <div>
        <button onClick={() => setSelectedTicket(null)} className="flex items-center gap-2 text-[#a0a0b0] hover:text-white text-sm mb-5 transition-colors">
          ← Back to All Tickets
        </button>

        <div className="grid lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-[#12121a] rounded-2xl border border-[#ff6b00]/15 p-5">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <h2 className="font-black text-white text-lg">{selectedTicket.subject}</h2>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <TicketStatusBadge status={selectedTicket.status} />
                    <span className="text-[#4a4a5a] text-xs">{TICKET_CATEGORY_LABELS[selectedTicket.category] ?? selectedTicket.category}</span>
                    <span className="text-[#4a4a5a] text-xs">#{selectedTicket.id}</span>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => deleteTicket(selectedTicket.id)} className="p-1.5 bg-[#ff2244]/10 border border-[#ff2244]/20 rounded-lg text-[#ff2244] hover:bg-[#ff2244]/20">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#229ED9]/20 flex items-center justify-center shrink-0 text-xs font-black text-[#229ED9]">U</div>
                  <div className="flex-1 bg-[#0a0a0f] rounded-xl p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-white text-xs font-bold">
                        {selectedTicket.user?.displayName ?? selectedTicket.user?.username ?? "User"}
                        {selectedTicket.user?.email && <span className="text-[#4a4a5a] font-normal ml-2">{selectedTicket.user.email}</span>}
                      </span>
                      <span className="text-[#4a4a5a] text-xs">{ticketTimeAgo(selectedTicket.createdAt)}</span>
                    </div>
                    <p className="text-[#a0a0b0] text-sm leading-relaxed whitespace-pre-wrap">{selectedTicket.message}</p>
                    {selectedTicket.screenshotUrl && (
                      <img src={selectedTicket.screenshotUrl} alt="screenshot" className="mt-3 rounded-lg max-w-xs max-h-48 object-contain" />
                    )}
                  </div>
                </div>

                {(selectedTicket.replies ?? []).map((reply: any) => (
                  <div key={reply.id} className={`flex gap-3 ${reply.isAdmin ? "flex-row-reverse" : ""}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-black ${reply.isAdmin ? "bg-[#ff6b00]/20 text-[#ff6b00]" : "bg-[#229ED9]/20 text-[#229ED9]"}`}>
                      {reply.isAdmin ? "A" : "U"}
                    </div>
                    <div className={`flex-1 rounded-xl p-3 ${reply.isAdmin ? "bg-[#ff6b00]/8 border border-[#ff6b00]/15" : "bg-[#0a0a0f]"}`}>
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-xs font-bold ${reply.isAdmin ? "text-[#ff6b00]" : "text-white"}`}>
                          {reply.isAdmin ? "Support Team (Admin)" : (selectedTicket.user?.displayName ?? selectedTicket.user?.username ?? "User")}
                        </span>
                        <span className="text-[#4a4a5a] text-xs">{ticketTimeAgo(reply.createdAt)}</span>
                      </div>
                      <p className="text-[#a0a0b0] text-sm leading-relaxed whitespace-pre-wrap">{reply.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {selectedTicket.status !== "closed" && (
              <div className="bg-[#12121a] rounded-2xl border border-[#ff6b00]/15 p-4">
                <label className="block text-[#a0a0b0] text-xs uppercase tracking-wider mb-2 font-bold">Admin Reply</label>
                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  rows={3}
                  placeholder="Write your reply to the user..."
                  className="admin-input resize-none mb-3"
                />
                <button
                  onClick={sendReply}
                  disabled={sendingReply || !replyText.trim()}
                  className="flex items-center gap-2 px-5 py-2.5 bg-[#ff6b00] text-white font-black uppercase rounded-xl text-sm hover:bg-[#e66000] disabled:opacity-50 transition-all"
                >
                  <Send className="w-4 h-4" />
                  {sendingReply ? "Sending..." : "Send Reply & Notify User"}
                </button>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="bg-[#12121a] rounded-2xl border border-[#ff6b00]/15 p-4">
              <h3 className="text-xs font-black uppercase tracking-widest text-[#a0a0b0] mb-3">Change Status</h3>
              <div className="space-y-2">
                {Object.entries(TICKET_STATUS_CFG).map(([status, cfg]) => (
                  <button
                    key={status}
                    onClick={() => changeStatus(selectedTicket.id, status)}
                    disabled={selectedTicket.status === status}
                    className={`w-full px-3 py-2 rounded-xl text-xs font-bold uppercase border transition-all disabled:opacity-50 disabled:cursor-not-allowed ${cfg.cls}`}
                  >
                    {selectedTicket.status === status ? `● ${cfg.label} (Current)` : cfg.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-[#12121a] rounded-2xl border border-[#ff6b00]/15 p-4">
              <h3 className="text-xs font-black uppercase tracking-widest text-[#a0a0b0] mb-3">Ticket Info</h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-[#a0a0b0]">Ticket ID</span>
                  <span className="text-white font-mono">#{selectedTicket.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#a0a0b0]">Category</span>
                  <span className="text-white">{TICKET_CATEGORY_LABELS[selectedTicket.category]}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#a0a0b0]">Replies</span>
                  <span className="text-white">{(selectedTicket.replies ?? []).length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#a0a0b0]">Created</span>
                  <span className="text-white">{new Date(selectedTicket.createdAt).toLocaleDateString()}</span>
                </div>
                {selectedTicket.user?.email && (
                  <div className="flex justify-between">
                    <span className="text-[#a0a0b0]">User Email</span>
                    <span className="text-white truncate max-w-[120px]">{selectedTicket.user.email}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div className="flex gap-2 flex-wrap">
          {["all", "open", "in_progress", "resolved", "closed"].map((f) => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-colors ${statusFilter === f ? "bg-[#ff6b00]/15 text-[#ff6b00] border border-[#ff6b00]/30" : "text-[#a0a0b0] hover:text-white border border-transparent"}`}
            >
              {f === "all" ? "All" : TICKET_STATUS_CFG[f]?.label ?? f}
              {f === "all" ? ` (${tickets.length})` : ` (${tickets.filter((t) => t.status === f).length})`}
            </button>
          ))}
        </div>
        <button onClick={loadTickets} className="flex items-center gap-2 text-sm text-[#a0a0b0] hover:text-white transition-colors">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">{[1,2,3,4].map((i) => <div key={i} className="h-20 bg-[#12121a] rounded-xl animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="bg-[#12121a] rounded-2xl border border-[#ff6b00]/10 p-14 text-center">
          <MessageCircle className="w-12 h-12 text-[#a0a0b0] mx-auto mb-3 opacity-20" />
          <p className="text-[#a0a0b0]">{statusFilter === "all" ? "No support tickets yet." : `No ${TICKET_STATUS_CFG[statusFilter]?.label.toLowerCase()} tickets.`}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((ticket: any) => (
            <div
              key={ticket.id}
              onClick={() => openTicket(ticket.id)}
              className="bg-[#12121a] border border-[#ff6b00]/10 hover:border-[#ff6b00]/30 rounded-xl p-4 cursor-pointer transition-colors flex items-center gap-4"
            >
              <div className="w-10 h-10 rounded-xl bg-[#ff6b00]/10 flex items-center justify-center shrink-0">
                <MessageCircle className="w-5 h-5 text-[#ff6b00]" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <span className="font-bold text-white text-sm truncate">{ticket.subject}</span>
                  <span className="text-[#4a4a5a] text-xs whitespace-nowrap shrink-0">{ticketTimeAgo(ticket.createdAt)}</span>
                </div>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <TicketStatusBadge status={ticket.status} />
                  <span className="text-[#4a4a5a] text-xs">{TICKET_CATEGORY_LABELS[ticket.category] ?? ticket.category}</span>
                  <span className="text-[#4a4a5a] text-xs">#{ticket.id}</span>
                  {ticket.user && (
                    <span className="text-[#4a4a5a] text-xs">· {ticket.user.displayName ?? ticket.user.username ?? ticket.user.email ?? "User"}</span>
                  )}
                  {ticket.replyCount > 0 && (
                    <span className="text-[#4a4a5a] text-xs">· {ticket.replyCount} {ticket.replyCount === 1 ? "reply" : "replies"}</span>
                  )}
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-[#4a4a5a] shrink-0" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SupportSettingsView({ apiFetch, toast }: { apiFetch: any; toast: any }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ whatsapp_number: "", telegram_link: "" });

  useEffect(() => {
    setLoading(true);
    apiFetch("/support-settings")
      .then((r: Response) => r.json())
      .then((d: any) => {
        if (d?.whatsapp_number) setForm({ whatsapp_number: d.whatsapp_number, telegram_link: d.telegram_link });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.whatsapp_number.trim() || !form.telegram_link.trim()) {
      toast({ title: "Both fields are required.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const res = await apiFetch("/admin/support-settings", {
        method: "PUT",
        body: JSON.stringify(form),
      });
      if (res.ok) {
        toast({ title: "Support settings updated!", description: "Changes are live immediately." });
      } else {
        const d = await safeJson(res);
        toast({ title: "Error", description: d.error ?? "Failed to save", variant: "destructive" });
      }
    } catch {
      toast({ title: "Connection error", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const waHref = form.whatsapp_number ? `https://wa.me/88${form.whatsapp_number.replace(/^0/, "")}` : "#";

  return (
    <div className="max-w-lg space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <MessageCircle className="w-5 h-5 text-[#ff6b00]" />
        <h2 className="text-white font-black uppercase tracking-wide text-lg">Support Contact Settings</h2>
      </div>
      <p className="text-[#a0a0b0] text-sm -mt-3">Update the WhatsApp number and Telegram link shown to all users.</p>

      <div className="bg-[#12121a] rounded-xl border border-[#ff6b00]/15 p-5">
        <h3 className="text-white font-black uppercase text-xs tracking-widest mb-4 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[#00ff88]" /> Current Live Links
        </h3>
        {loading ? (
          <div className="space-y-3">{[1,2].map(i => <div key={i} className="h-12 bg-[#0a0a0f] rounded-xl animate-pulse" />)}</div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-xl border border-[#00ff88]/20 bg-[#00ff88]/5 px-4 py-3">
              <div className="flex items-center gap-3">
                <MessageCircle className="w-4 h-4 text-[#00ff88]" />
                <span className="font-black text-xs uppercase text-[#00ff88] tracking-wider">WhatsApp</span>
              </div>
              <a href={waHref} target="_blank" rel="noopener noreferrer" className="font-mono font-bold text-white hover:text-[#00ff88] text-sm">
                {form.whatsapp_number || "—"}
              </a>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-[#229ED9]/20 bg-[#229ED9]/5 px-4 py-3">
              <div className="flex items-center gap-3">
                <Send className="w-4 h-4 text-[#229ED9]" />
                <span className="font-black text-xs uppercase text-[#229ED9] tracking-wider">Telegram</span>
              </div>
              <a href={form.telegram_link} target="_blank" rel="noopener noreferrer" className="font-bold text-white hover:text-[#229ED9] text-sm truncate max-w-[180px]">
                {form.telegram_link || "—"}
              </a>
            </div>
          </div>
        )}
      </div>

      <div className="bg-[#12121a] rounded-xl border border-[#ff6b00]/15 p-5">
        <h3 className="text-white font-black uppercase text-xs tracking-widest mb-5 flex items-center gap-2">
          <Edit className="w-3.5 h-3.5 text-[#ff6b00]" /> Update Support Contacts
        </h3>
        {loading ? (
          <div className="space-y-4">{[1,2].map(i => <div key={i} className="h-16 bg-[#0a0a0f] rounded-xl animate-pulse" />)}</div>
        ) : (
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-[#a0a0b0] text-xs uppercase tracking-wider mb-1.5 font-bold">
                <span className="inline-block w-2 h-2 rounded-full mr-1.5 bg-[#00ff88]" />
                WhatsApp Number *
              </label>
              <input
                type="text"
                value={form.whatsapp_number}
                onChange={(e) => setForm({ ...form, whatsapp_number: e.target.value })}
                required
                placeholder="01768177772"
                className="admin-input font-mono"
              />
              <p className="text-[#4a4a5a] text-xs mt-1">Enter the number without country code (e.g. 01768177772)</p>
            </div>
            <div>
              <label className="block text-[#a0a0b0] text-xs uppercase tracking-wider mb-1.5 font-bold">
                <span className="inline-block w-2 h-2 rounded-full mr-1.5 bg-[#229ED9]" />
                Telegram Link *
              </label>
              <input
                type="url"
                value={form.telegram_link}
                onChange={(e) => setForm({ ...form, telegram_link: e.target.value })}
                required
                placeholder="https://t.me/ayman990"
                className="admin-input"
              />
            </div>
            <div className="bg-yellow-500/8 border border-yellow-500/20 rounded-xl px-4 py-3 flex items-start gap-2">
              <Shield className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
              <p className="text-yellow-400 text-xs">These contacts are shown to all users on the Support page, Contact page, and Footer. Only admins can update them.</p>
            </div>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-3 bg-[#ff6b00] text-white font-black uppercase rounded-xl text-sm hover:bg-[#e66000] disabled:opacity-50 transition-all"
            >
              {saving ? "Saving..." : "Save Support Settings"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
