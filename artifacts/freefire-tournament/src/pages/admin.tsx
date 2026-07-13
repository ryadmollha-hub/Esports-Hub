import { useState, useEffect, useCallback, useRef } from "react";
import { parseBDDate } from "@/lib/bdTime";
import { useLocation, Link } from "wouter";
import {
  Users, Trophy, Shield, Clock, DollarSign, CheckCircle, XCircle, Bell,
  Plus, Trash2, Edit, LogOut, BarChart3, Megaphone, Swords, CreditCard,
  ArrowDownCircle, ArrowUpCircle, Eye, EyeOff, RefreshCw, Home,
  Crown, Shuffle, X as XIcon, Tag, BookOpen, Key, Radio, Lock, Settings, Copy, MessageCircle, Send, Headphones, ChevronRight,
  Search, AlertTriangle, Activity, UserCheck, MapPin, TrendingUp, Flag, FileText
} from "lucide-react";
import { isAdminAuthenticated, clearAdminSession, adminFetch } from "@/lib/adminAuth";
import { useToast } from "@/hooks/use-toast";

import { apiBase as BASE } from "@/lib/apiBase";

async function safeJson(res: Response): Promise<any> {
  try {
    const text = await res.text();
    if (!text || !text.trim()) return {};
    return JSON.parse(text);
  } catch {
    return {};
  }
}

type Tab = "overview" | "tournaments" | "matches" | "room-release" | "rules" | "users" | "registrations" | "announcements" | "deposits" | "withdrawals" | "promo-codes" | "payment-settings" | "maintenance" | "support" | "user-matches" | "reports" | "activity" | "search";

const tabs: { id: Tab; label: string; icon: any; group?: string }[] = [
  { id: "overview", label: "Overview", icon: BarChart3 },
  { id: "tournaments", label: "Create & Manage Tournaments", icon: Trophy, group: "tournament" },
  { id: "matches", label: "Manage Matches", icon: Swords, group: "tournament" },
  { id: "room-release", label: "Room Release Settings", icon: Key, group: "tournament" },
  { id: "rules", label: "Match Rules Config", icon: Settings, group: "tournament" },
  { id: "registrations", label: "Registrations", icon: CheckCircle },
  { id: "users", label: "Users", icon: Users },
  { id: "announcements", label: "Announcements", icon: Megaphone },
  { id: "deposits", label: "Deposits", icon: ArrowDownCircle },
  { id: "withdrawals", label: "Withdrawals", icon: ArrowUpCircle },
  { id: "promo-codes", label: "Promo Codes", icon: Tag },
  { id: "payment-settings", label: "Payment Settings", icon: Settings },
  { id: "maintenance", label: "Maintenance", icon: Lock },
  { id: "support", label: "Support", icon: MessageCircle },
  { id: "user-matches", label: "User Matches", icon: Swords },
  { id: "reports", label: "Reports", icon: Flag },
  { id: "activity", label: "Activity Log", icon: Activity },
  { id: "search", label: "Search", icon: Search },
];

export default function AdminPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [, setTick] = useState(0);
  useEffect(() => { const id = setInterval(() => setTick((n) => n + 1), 30000); return () => clearInterval(id); }, []);
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [walletTxs, setWalletTxs] = useState<any[]>([]);
  const [matches, setMatches] = useState<any[]>([]);
  const [userMatches, setUserMatches] = useState<any[]>([]);
  const [userMatchesLoading, setUserMatchesLoading] = useState(false);
  const [rejectingMatch, setRejectingMatch] = useState<number | null>(null);
  const [rejectNote, setRejectNote] = useState("");
  const [matchEntryFees, setMatchEntryFees] = useState<Record<number, string>>({});
  // User detail modal
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [selectedUserLoading, setSelectedUserLoading] = useState(false);
  // Match players modal
  const [matchPlayersData, setMatchPlayersData] = useState<{ match: any; players: any[] } | null>(null);
  const [matchPlayersLoading, setMatchPlayersLoading] = useState(false);
  // User search
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [userSearchLoading, setUserSearchLoading] = useState(false);
  const userSearchTimeout = useRef<any>(null);
  // Community match status filter
  const [umStatusFilter, setUmStatusFilter] = useState<string>("all");
  const [umTypeFilter, setUmTypeFilter] = useState<string>("all");
  const [expandedReg, setExpandedReg] = useState<Record<number, boolean>>({});
  const [regStatusFilter, setRegStatusFilter] = useState<string>("all");
  // Reports
  const [reports, setReports] = useState<any[]>([]);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [reportsFilter, setReportsFilter] = useState("all");
  const [communityRules, setCommunityRules] = useState("");
  const [communityRulesLoading, setCommunityRulesLoading] = useState(false);
  const [communityRulesSaving, setCommunityRulesSaving] = useState(false);
  const [roomCredentials, setRoomCredentials] = useState<Record<number, { roomId: string; password: string; roomReleaseTime: string; roomHideTime: string }>>({});
  const [submittingCredentials, setSubmittingCredentials] = useState<number | null>(null);
  const [releaseMode, setReleaseMode] = useState<Record<number, "now" | "scheduled">>({});
  const [deletingMatch, setDeletingMatch] = useState<number | null>(null);
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
  const [tForm, setTForm] = useState({ name: "", description: "", mode: "squad", gameMode: "", startDate: "", endDate: "", maxSlots: "", prizePool: "", entryFee: "", perKillReward: "", status: "upcoming", bannerUrl: "", prize1Amt: "", prize2Amt: "", prize3Amt: "" });
  const [editingTournament, setEditingTournament] = useState<any>(null);
  const [showTForm, setShowTForm] = useState(false);

  // Announcement form
  const [annForm, setAnnForm] = useState({ title: "", content: "", type: "info", displayMode: "banner", isPinned: false, isActive: true, expiresAt: "" });
  const [showAnnForm, setShowAnnForm] = useState(false);
  const [editingAnn, setEditingAnn] = useState<any>(null);

  // Match form (tournament matches)
  const [matchForm, setMatchForm] = useState({ matchNumber: "", scheduledAt: "", mapName: "", roomId: "", roomPassword: "", roomReleaseMinutes: "10" });
  const [showMatchForm, setShowMatchForm] = useState(false);

  const [showCommunityRulesModal, setShowCommunityRulesModal] = useState(false);

  // Manage Room modal state: { tournamentId, matchId } or null
  const [manageRoomModal, setManageRoomModal] = useState<{ tournamentId: number; matchId: number } | null>(null);

  // Admin community match creation form
  const [showAdminMatchForm, setShowAdminMatchForm] = useState(false);
  const [adminMatchForm, setAdminMatchForm] = useState({ matchType: "", matchName: "", prizePool: "", entryFee: "", perKill: "", mapName: "", scheduledAt: "", description: "", roomReleaseTime: "", roomHideTime: "" });
  const [adminMatchCreating, setAdminMatchCreating] = useState(false);
  const [matchRoomForm, setMatchRoomForm] = useState<Record<number, { roomId: string; roomPassword: string; releaseMinutes: string; hideMinutes: string }>>({});
  const [settingMatchRoom, setSettingMatchRoom] = useState<Record<number, boolean>>({});
  const [matchRegPlayers, setMatchRegPlayers] = useState<any[]>([]);
  const [loadingMatchRegPlayers, setLoadingMatchRegPlayers] = useState(false);
  const [showMatchRegPlayers, setShowMatchRegPlayers] = useState<Record<number, boolean>>({});
  const [deletingMatchRoom, setDeletingMatchRoom] = useState<Record<number, boolean>>({});
  const [matchNumberInputs, setMatchNumberInputs] = useState<Record<number, string>>({});
  const [settingMatchNumber, setSettingMatchNumber] = useState<Record<number, boolean>>({});
  const [updatingMatchStatus, setUpdatingMatchStatus] = useState<Record<number, boolean>>({});

  // Match result entry state
  const [expandedMatchResult, setExpandedMatchResult] = useState<Record<number, boolean>>({});
  const [matchResultRows, setMatchResultRows] = useState<Record<number, Array<{ playerName: string; rank: string; kills: string; prizeMoney: string }>>>({});
  const [submittingMatchResult, setSubmittingMatchResult] = useState<Record<number, boolean>>({});
  // Team-grouped match result entry (squad-aware)
  const [matchTeamData, setMatchTeamData] = useState<Record<number, { loading: boolean; tournament: any; registrations: any[] }>>({});
  const [matchTeamKills, setMatchTeamKills] = useState<Record<number, Record<string, number>>>({});
  const [matchTeamRanks, setMatchTeamRanks] = useState<Record<number, Record<number, string>>>({});

  // Prize distribution state
  const [expandedPrize, setExpandedPrize] = useState<Record<number, boolean>>({});
  const [prizeRegData, setPrizeRegData] = useState<Record<number, { loading: boolean; tournament: any; registrations: any[] }>>({});
  const [prizePlacements, setPrizePlacements] = useState<Record<number, Record<number, string>>>({});
  const [prizeKills, setPrizeKills] = useState<Record<number, Record<string, number>>>({});
  const [prizePreviewData, setPrizePreviewData] = useState<Record<number, any>>({});
  const [distributing, setDistributing] = useState<Record<number, boolean>>({});
  // Prize distribution report
  const [prizeReport, setPrizeReport] = useState<any[]>([]);
  const [prizeReportLoading, setPrizeReportLoading] = useState(false);
  const [showPrizeReport, setShowPrizeReport] = useState(false);
  const [expandedReportMatch, setExpandedReportMatch] = useState<Record<number, boolean>>({});

  // Room form
  const [roomForm, setRoomForm] = useState<Record<number, { roomId: string; roomPassword: string }>>({});

  // Per-tournament match management (in Tournaments tab)
  const [expandedTournamentMatches, setExpandedTournamentMatches] = useState<Record<number, boolean>>({});
  const [tournamentMatchesList, setTournamentMatchesList] = useState<Record<number, any[]>>({});
  const [tournamentMatchesLoading, setTournamentMatchesLoading] = useState<Record<number, boolean>>({});
  const [showTournamentMatchForm, setShowTournamentMatchForm] = useState<Record<number, boolean>>({});
  const [tournamentMatchForms, setTournamentMatchForms] = useState<Record<number, { matchNumber: string; scheduledAt: string; mapName: string }>>({});
  const [creatingTournamentMatch, setCreatingTournamentMatch] = useState<Record<number, boolean>>({});
  const [tournamentMatchRoomForms, setTournamentMatchRoomForms] = useState<Record<number, { roomId: string; roomPassword: string; releaseMode: "before5" | "before10" | "custom"; hideMinutesAfter: string; customMins: string }>>({});
  const [settingTournamentMatchRoom, setSettingTournamentMatchRoom] = useState<Record<number, boolean>>({});
  const [tournamentsLoading, setTournamentsLoading] = useState(false);
  const [matchesLoading, setMatchesLoading] = useState(false);

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
    setTournamentsLoading(true);
    try {
      const res = await apiFetch("/tournaments?limit=100");
      if (res.ok) {
        const data = await safeJson(res);
        setTournaments(Array.isArray(data) ? data : data.tournaments ?? []);
      }
    } catch {} finally { setTournamentsLoading(false); }
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
    setMatchesLoading(true);
    try {
      const res = await apiFetch(`/tournaments/${selectedTournament}/matches`);
      if (res.ok) setMatches(await res.json());
    } catch {} finally { setMatchesLoading(false); }
  }, [apiFetch, selectedTournament]);

  const loadTournamentMatchesById = useCallback(async (tournamentId: number) => {
    setTournamentMatchesLoading((prev) => ({ ...prev, [tournamentId]: true }));
    try {
      const res = await apiFetch(`/tournaments/${tournamentId}/matches`);
      if (res.ok) {
        const data = await res.json();
        setTournamentMatchesList((prev) => ({ ...prev, [tournamentId]: data }));
      }
    } catch {} finally {
      setTournamentMatchesLoading((prev) => ({ ...prev, [tournamentId]: false }));
    }
  }, [apiFetch]);

  const createMatchForTournament = useCallback(async (tournamentId: number) => {
    const form = tournamentMatchForms[tournamentId];
    const matchNum = parseInt(form?.matchNumber ?? "", 10);
    if (!form?.matchNumber || isNaN(matchNum) || matchNum < 1) {
      toast({ title: "Match number is required", description: "Enter a valid match number (≥ 1).", variant: "destructive" });
      return;
    }
    // Scheduled time must be an explicit admin choice. It must NEVER silently
    // default to "now" — the scheduler auto-flips matchLive once scheduledAt
    // passes, so defaulting to "now" would start the match within seconds of
    // creating it, which is exactly the bug we're preventing here.
    if (!form?.scheduledAt) {
      toast({ title: "Scheduled time is required", description: "Pick a date & time for this match.", variant: "destructive" });
      return;
    }
    setCreatingTournamentMatch((prev) => ({ ...prev, [tournamentId]: true }));
    try {
      // Anchor admin-entered time to Bangladesh timezone (UTC+6).
      const scheduledAtISO = new Date(form.scheduledAt + "+06:00").toISOString();
      const res = await apiFetch(`/tournaments/${tournamentId}/matches`, {
        method: "POST",
        body: JSON.stringify({
          matchNumber: matchNum,
          scheduledAt: scheduledAtISO,
          mapName: form.mapName || undefined,
        }),
      });
      if (res.ok) {
        toast({ title: "✅ Match created" });
        setShowTournamentMatchForm((prev) => ({ ...prev, [tournamentId]: false }));
        setTournamentMatchForms((prev) => ({ ...prev, [tournamentId]: { matchNumber: "", scheduledAt: "", mapName: "" } }));
        loadTournamentMatchesById(tournamentId);
      } else {
        const d = await safeJson(res);
        toast({ title: "Error", description: d.error ?? "Failed to create match", variant: "destructive" });
      }
    } catch {
      toast({ title: "Connection error", variant: "destructive" });
    } finally {
      setCreatingTournamentMatch((prev) => ({ ...prev, [tournamentId]: false }));
    }
  }, [apiFetch, tournamentMatchForms, toast, loadTournamentMatchesById]);

  // Saves room ID/password + a required release-timing choice (5 min before match,
  // 10 min before match, or a custom time). This NEVER reveals credentials or closes
  // registration by itself — saving only sets the informational countdown target the
  // admin picked. The admin must separately click "Release Room" to actually reveal
  // credentials (which is also the ONLY action that closes registration).
  const setTournamentMatchRoomCredentials = useCallback(async (tournamentId: number, matchId: number) => {
    const form = tournamentMatchRoomForms[matchId];
    if (!form?.roomId) {
      toast({ title: "Enter Room ID", variant: "destructive" });
      return;
    }
    const relMode = form.releaseMode ?? "before10";
    const match = (tournamentMatchesList[tournamentId] ?? []).find((m: any) => m.id === matchId);
    const mins = relMode === "before5" ? 5 : relMode === "custom" ? parseInt(form.customMins || "10") : 10;
    let roomReleaseAt: string | undefined;
    if (match?.scheduledAt) {
      roomReleaseAt = new Date(new Date(match.scheduledAt).getTime() - mins * 60 * 1000).toISOString();
    }
    setSettingTournamentMatchRoom((prev) => ({ ...prev, [matchId]: true }));
    try {
      const res = await apiFetch(`/matches/${matchId}/room`, {
        method: "PATCH",
        body: JSON.stringify({
          roomId: form.roomId,
          roomPassword: form.roomPassword ?? "",
          roomReleaseAt,
        }),
      });
      if (res.ok) {
        toast({ title: "✅ Room saved", description: "Not released yet — click \"Release Room\" when you're ready to reveal it to players." });
        setTournamentMatchRoomForms((prev) => { const n = { ...prev }; delete n[matchId]; return n; });
        loadTournamentMatchesById(tournamentId);
      } else {
        const d = await safeJson(res);
        toast({ title: "Error", description: d.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Connection error", variant: "destructive" });
    } finally {
      setSettingTournamentMatchRoom((prev) => ({ ...prev, [matchId]: false }));
    }
  }, [apiFetch, tournamentMatchRoomForms, tournamentMatchesList, toast, loadTournamentMatchesById]);

  // Explicit lifecycle actions — each is a single, independent admin click.
  // Releasing the room is the ONLY action that reveals credentials AND the
  // ONLY action that closes registration (bundled server-side in one explicit
  // admin click — never automatic). Confirm first since it's not reversible
  // from the player's perspective (credentials become visible immediately).
  const releaseMatchRoom = useCallback(async (tournamentId: number, matchId: number) => {
    if (!window.confirm("Release the room now? This will immediately reveal the Room ID & Password to players and close registration for this tournament.")) {
      return;
    }
    setSettingTournamentMatchRoom((prev) => ({ ...prev, [matchId]: true }));
    try {
      const res = await apiFetch(`/matches/${matchId}/release-room`, { method: "POST" });
      if (res.ok) {
        toast({ title: "✅ Room released!", description: "Players can now see the Room ID & Password. Registration is now closed." });
        loadTournamentMatchesById(tournamentId);
        loadTournaments();
      } else {
        const d = await safeJson(res);
        toast({ title: "Error", description: d.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Connection error", variant: "destructive" });
    } finally {
      setSettingTournamentMatchRoom((prev) => ({ ...prev, [matchId]: false }));
    }
  }, [apiFetch, toast, loadTournamentMatchesById, loadTournaments]);

  const hideMatchRoom = useCallback(async (tournamentId: number, matchId: number) => {
    setSettingTournamentMatchRoom((prev) => ({ ...prev, [matchId]: true }));
    try {
      const res = await apiFetch(`/matches/${matchId}/hide-room`, { method: "POST" });
      if (res.ok) {
        toast({ title: "🔒 Room credentials hidden" });
        loadTournamentMatchesById(tournamentId);
      } else {
        const d = await safeJson(res);
        toast({ title: "Error", description: d.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Connection error", variant: "destructive" });
    } finally {
      setSettingTournamentMatchRoom((prev) => ({ ...prev, [matchId]: false }));
    }
  }, [apiFetch, toast, loadTournamentMatchesById]);

  const startMatchNow = useCallback(async (tournamentId: number, matchId: number) => {
    setSettingTournamentMatchRoom((prev) => ({ ...prev, [matchId]: true }));
    try {
      const res = await apiFetch(`/matches/${matchId}/start`, { method: "POST" });
      if (res.ok) {
        toast({ title: "🔴 Match marked LIVE" });
        loadTournamentMatchesById(tournamentId);
      } else {
        const d = await safeJson(res);
        toast({ title: "Error", description: d.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Connection error", variant: "destructive" });
    } finally {
      setSettingTournamentMatchRoom((prev) => ({ ...prev, [matchId]: false }));
    }
  }, [apiFetch, toast, loadTournamentMatchesById]);

  const loadUserMatches = useCallback(async () => {
    setUserMatchesLoading(true);
    try {
      const res = await apiFetch("/admin/user-matches");
      if (res.ok) setUserMatches(await res.json());
    } catch {} finally {
      setUserMatchesLoading(false);
    }
  }, [apiFetch]);

  const loadCommunityRules = useCallback(async () => {
    setCommunityRulesLoading(true);
    try {
      const res = await fetch(`${BASE}/api/settings/community-match-rules`);
      if (res.ok) { const d = await res.json(); setCommunityRules(d.rules ?? ""); }
    } catch {} finally {
      setCommunityRulesLoading(false);
    }
  }, []);

  const loadReports = useCallback(async (filter = "all") => {
    setReportsLoading(true);
    try {
      const res = await apiFetch(`/admin/reports${filter !== "all" ? `?status=${filter}` : ""}`);
      if (res.ok) setReports(await res.json());
    } catch {} finally { setReportsLoading(false); }
  }, [apiFetch]);

  const loadUserDetails = useCallback(async (userId: string) => {
    setSelectedUserLoading(true);
    try {
      const res = await apiFetch(`/admin/users/${userId}/details`);
      if (res.ok) setSelectedUser(await res.json());
    } catch {} finally { setSelectedUserLoading(false); }
  }, [apiFetch]);

  const loadMatchPlayers = useCallback(async (matchId: number) => {
    setMatchPlayersLoading(true);
    try {
      const res = await apiFetch(`/admin/user-matches/${matchId}/players`);
      if (res.ok) setMatchPlayersData(await res.json());
    } catch {} finally { setMatchPlayersLoading(false); }
  }, [apiFetch]);

  const searchUsers = useCallback(async (q: string) => {
    setUserSearchLoading(true);
    try {
      const res = await apiFetch(`/admin/users?search=${encodeURIComponent(q)}&limit=50`);
      if (res.ok) setUsers(await res.json());
    } catch {} finally { setUserSearchLoading(false); }
  }, [apiFetch]);

  const resolveReport = useCallback(async (id: number, status: "resolved" | "dismissed", adminNote?: string) => {
    try {
      const res = await apiFetch(`/admin/reports/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status, adminNote }),
      });
      if (res.ok) {
        toast({ title: status === "resolved" ? "Report resolved" : "Report dismissed" });
        loadReports(reportsFilter);
        loadStats();
      }
    } catch { toast({ title: "Connection error", variant: "destructive" }); }
  }, [apiFetch, reportsFilter, loadStats]);

  const deleteReport = useCallback(async (id: number) => {
    if (!confirm("Delete this report?")) return;
    const res = await apiFetch(`/admin/reports/${id}`, { method: "DELETE" });
    if (res.ok) { toast({ title: "Report deleted" }); loadReports(reportsFilter); }
  }, [apiFetch, reportsFilter]);

  const saveCommunityRules = useCallback(async () => {
    if (!communityRules.trim()) return;
    setCommunityRulesSaving(true);
    try {
      const res = await apiFetch("/admin/settings/community-match-rules", {
        method: "PUT",
        body: JSON.stringify({ rules: communityRules }),
      });
      if (res.ok) {
        toast({ title: "Rules saved", description: "Community match rules updated." });
      } else {
        const d = await res.json();
        toast({ title: "Error", description: d.error ?? "Failed to save", variant: "destructive" });
      }
    } catch {
      toast({ title: "Connection error", variant: "destructive" });
    } finally {
      setCommunityRulesSaving(false);
    }
  }, [apiFetch, communityRules, toast]);

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
    if (activeTab === "users") { setUserSearchQuery(""); loadUsers(); }
    if (activeTab === "registrations") loadRegistrations();
    if (activeTab === "announcements") loadAnnouncements();
    if (activeTab === "deposits" || activeTab === "withdrawals") loadWallet();
    if (activeTab === "matches" || activeTab === "room-release") { loadTournaments(); }
    if (activeTab === "user-matches") { loadUserMatches(); loadCommunityRules(); }
    if (activeTab === "maintenance") loadMaintenance();
    if (activeTab === "reports") loadReports(reportsFilter);
    if (activeTab === "activity") { loadStats(); }
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
    if (!tForm.gameMode) {
      toast({ title: "Category required", description: "Please select a tournament category (BR, CS, Solo, etc.)", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const url = editingTournament ? `/tournaments/${editingTournament.id}` : "/tournaments";
      const method = editingTournament ? "PUT" : "POST";
      const prizePool = parseFloat(tForm.prizePool);
      const prizes = prizePool > 0 && (tForm.prize1Amt || tForm.prize2Amt || tForm.prize3Amt) ? [
        tForm.prize1Amt ? { rank: "1st Place", amount: parseFloat(tForm.prize1Amt), description: "1st Place Prize" } : null,
        tForm.prize2Amt ? { rank: "2nd Place", amount: parseFloat(tForm.prize2Amt), description: "2nd Place Prize" } : null,
        tForm.prize3Amt ? { rank: "3rd Place", amount: parseFloat(tForm.prize3Amt), description: "3rd Place Prize" } : null,
      ].filter(Boolean) : [];
      const res = await apiFetch(url, {
        method,
        body: JSON.stringify({
          name: tForm.name, description: tForm.description, mode: tForm.mode,
          gameMode: tForm.gameMode,
          startDate: tForm.startDate ? new Date(tForm.startDate).toISOString() : undefined,
          endDate: tForm.endDate ? new Date(tForm.endDate).toISOString() : undefined,
          maxSlots: parseInt(tForm.maxSlots), prizePool,
          entryFee: parseFloat(tForm.entryFee),
          perKillReward: parseFloat(tForm.perKillReward),
          status: tForm.status,
          bannerUrl: tForm.bannerUrl || undefined,
          prizes,
        }),
      });
      if (res.ok) {
        toast({ title: editingTournament ? "Tournament updated!" : "Tournament created!" });
        setShowTForm(false); setEditingTournament(null);
        setTForm({ name: "", description: "", mode: "squad", gameMode: "", startDate: "", endDate: "", maxSlots: "", prizePool: "", entryFee: "", perKillReward: "", status: "upcoming", bannerUrl: "", prize1Amt: "", prize2Amt: "", prize3Amt: "" });
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
      gameMode: t.gameMode ?? "",
      startDate: t.startDate?.slice(0, 16) ?? "", endDate: t.endDate?.slice(0, 16) ?? "",
      maxSlots: String(t.maxSlots), prizePool: String(t.prizePool),
      entryFee: String(t.entryFee), perKillReward: String(t.perKillReward ?? "0"),
      status: t.status, bannerUrl: t.bannerUrl ?? "",
      prize1Amt: "", prize2Amt: "", prize3Amt: "",
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
  const deleteReg = async (id: number) => {
    if (!confirm("Permanently delete this registration? This cannot be undone.")) return;
    const res = await apiFetch(`/admin/registrations/${id}`, { method: "DELETE" });
    if (res.ok) { toast({ title: "Registration deleted" }); loadRegistrations(); loadStats(); }
    else { const d = await res.json().catch(() => ({})); toast({ title: "Error", description: d.error || "Failed to delete.", variant: "destructive" }); }
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
      [matchId]: [...(prev[matchId] ?? []), { playerName: "", rank: "", kills: "", prizeMoney: "" }],
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
      prizeMoney: parseFloat((r as any).prizeMoney) || 0,
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

  const loadMatchTeamData = async (matchId: number, tournamentId: number) => {
    setMatchTeamData((prev) => ({ ...prev, [matchId]: { loading: true, tournament: null, registrations: [] } }));
    try {
      const res = await apiFetch(`/admin/tournaments/${tournamentId}/prize-registrations`);
      const d = await safeJson(res);
      if (res.ok) {
        setMatchTeamData((prev) => ({ ...prev, [matchId]: { loading: false, tournament: d.tournament, registrations: d.registrations ?? [] } }));
      } else {
        setMatchTeamData((prev) => ({ ...prev, [matchId]: { loading: false, tournament: null, registrations: [] } }));
        toast({ title: "Failed to load teams", description: d.error, variant: "destructive" });
      }
    } catch {
      setMatchTeamData((prev) => ({ ...prev, [matchId]: { loading: false, tournament: null, registrations: [] } }));
      toast({ title: "Connection error", variant: "destructive" });
    }
  };

  const submitTeamResults = async (matchId: number) => {
    const data = matchTeamData[matchId];
    const regs = data?.registrations ?? [];
    if (regs.length === 0) return toast({ title: "No teams loaded yet", variant: "destructive" });

    const ranks = matchTeamRanks[matchId] ?? {};
    const kills = matchTeamKills[matchId] ?? {};

    const teams = regs.map((reg: any) => ({
      registrationId: reg.id,
      rank: ranks[reg.id] ? parseInt(ranks[reg.id]) : null,
      captainKills: kills[`${reg.id}-0`] ?? 0,
      memberKills: (reg.teamMembersArr ?? []).map((_: any, i: number) => kills[`${reg.id}-${i + 1}`] ?? 0),
    })).filter((t: any) => {
      const totalKills = t.captainKills + (t.memberKills?.reduce((s: number, k: number) => s + k, 0) ?? 0);
      return t.rank !== null || totalKills > 0;
    });

    if (teams.length === 0) return toast({ title: "Enter at least one team's data (rank or kills)", variant: "destructive" });

    setSubmittingMatchResult((prev) => ({ ...prev, [matchId]: true }));
    try {
      const res = await apiFetch(`/admin/matches/${matchId}/team-results`, {
        method: "PATCH",
        body: JSON.stringify({ teams }),
      });
      const d = await safeJson(res);
      if (res.ok) {
        toast({
          title: "✅ Results saved!",
          description: `${d.resultsCount} player rows saved · ৳${Number(d.totalPrize ?? 0).toFixed(2)} credited to ${d.teamsRewarded} team leader${d.teamsRewarded !== 1 ? "s" : ""}.`,
        });
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

  const deleteMatchRoom = async (matchId: number) => {
    setDeletingMatchRoom((prev) => ({ ...prev, [matchId]: true }));
    try {
      const res = await apiFetch(`/matches/${matchId}/room`, { method: "DELETE" });
      if (res.ok) {
        toast({ title: "Room credentials cleared" });
        loadMatches();
      } else {
        const d = await safeJson(res);
        toast({ title: "Error", description: d.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Network error", variant: "destructive" });
    } finally {
      setDeletingMatchRoom((prev) => ({ ...prev, [matchId]: false }));
    }
  };

  // ─── Prize distribution handlers ─────────────────────────────────────────────

  const loadPrizeReport = async () => {
    setPrizeReportLoading(true);
    try {
      const res = await apiFetch("/admin/prize-distributions");
      if (res.ok) setPrizeReport(await res.json());
      else { const d = await safeJson(res); toast({ title: "Failed to load prize report", description: d.error, variant: "destructive" }); }
    } catch {
      toast({ title: "Network error", variant: "destructive" });
    } finally {
      setPrizeReportLoading(false);
    }
  };

  const loadPrizeRegistrations = async (matchId: number, tournamentId: number) => {
    setPrizeRegData((prev) => ({ ...prev, [matchId]: { loading: true, tournament: prev[matchId]?.tournament ?? null, registrations: prev[matchId]?.registrations ?? [] } }));
    try {
      const res = await apiFetch(`/admin/tournaments/${tournamentId}/prize-registrations`);
      if (res.ok) {
        const d = await res.json();
        setPrizeRegData((prev) => ({ ...prev, [matchId]: { loading: false, tournament: d.tournament, registrations: d.registrations } }));
        // Init kills to 0 for all members
        const kills: Record<string, number> = {};
        for (const reg of (d.registrations ?? [])) {
          kills[`${reg.id}-0`] = 0;
          for (let i = 0; i < (reg.teamMembersArr ?? []).length; i++) {
            kills[`${reg.id}-${i + 1}`] = 0;
          }
        }
        setPrizeKills((prev) => ({ ...prev, [matchId]: kills }));
        setPrizePlacements((prev) => ({ ...prev, [matchId]: {} }));
        setPrizePreviewData((prev) => ({ ...prev, [matchId]: null }));
      } else {
        const d = await safeJson(res);
        toast({ title: "Failed to load registrations", description: d.error, variant: "destructive" });
        setPrizeRegData((prev) => ({ ...prev, [matchId]: { loading: false, tournament: null, registrations: [] } }));
      }
    } catch {
      toast({ title: "Network error", variant: "destructive" });
      setPrizeRegData((prev) => ({ ...prev, [matchId]: { loading: false, tournament: null, registrations: [] } }));
    }
  };

  const buildPrizePayload = (matchId: number, preview: boolean) => {
    const data = prizeRegData[matchId];
    const placements = prizePlacements[matchId] ?? {};
    const kills = prizeKills[matchId] ?? {};
    const placementsArr = Object.entries(placements)
      .filter(([, rank]) => rank && rank !== "")
      .map(([regId, rank]) => ({ registrationId: parseInt(regId), rank: parseInt(rank) }));
    const teamKillsArr = (data?.registrations ?? []).map((reg: any) => ({
      registrationId: reg.id,
      captainKills: kills[`${reg.id}-0`] ?? 0,
      memberKills: (reg.teamMembersArr ?? []).map((_: any, i: number) => kills[`${reg.id}-${i + 1}`] ?? 0),
    }));
    return { preview, placements: placementsArr, teamKills: teamKillsArr };
  };

  const previewPrizes = async (matchId: number) => {
    const payload = buildPrizePayload(matchId, true);
    if (payload.placements.length === 0 && !payload.teamKills.some((k: any) => k.captainKills > 0 || k.memberKills.some((m: number) => m > 0))) {
      return toast({ title: "Enter at least one placement or kill count", variant: "destructive" });
    }
    try {
      const res = await apiFetch(`/admin/matches/${matchId}/distribute-prizes`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      const d = await safeJson(res);
      if (res.ok) {
        setPrizePreviewData((prev) => ({ ...prev, [matchId]: d }));
      } else {
        toast({ title: "Preview failed", description: d.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Network error", variant: "destructive" });
    }
  };

  const distributePrizes = async (matchId: number) => {
    const payload = buildPrizePayload(matchId, false);
    if (payload.placements.length === 0 && !payload.teamKills.some((k: any) => k.captainKills > 0 || k.memberKills.some((m: number) => m > 0))) {
      return toast({ title: "Enter at least one placement or kill count", variant: "destructive" });
    }
    setDistributing((prev) => ({ ...prev, [matchId]: true }));
    try {
      const res = await apiFetch(`/admin/matches/${matchId}/distribute-prizes`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      const d = await safeJson(res);
      if (res.ok) {
        toast({ title: "🎉 Prizes distributed!", description: `৳${d.totalDistributed?.toFixed(2)} sent in ${d.transactionsCreated} transactions.` });
        setExpandedPrize((prev) => ({ ...prev, [matchId]: false }));
        loadMatches();
      } else if (d.alreadyDistributed) {
        toast({ title: "Already distributed", description: "Prizes for this match have already been paid out.", variant: "destructive" });
        loadMatches();
      } else {
        toast({ title: "Distribution failed", description: d.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Network error", variant: "destructive" });
    } finally {
      setDistributing((prev) => ({ ...prev, [matchId]: false }));
    }
  };

  const setRegMatchNumber = async (regId: number) => {
    const value = matchNumberInputs[regId];
    setSettingMatchNumber((prev) => ({ ...prev, [regId]: true }));
    try {
      const res = await apiFetch(`/registrations/${regId}/match-number`, {
        method: "PATCH",
        body: JSON.stringify({ matchNumber: value === "" || value == null ? null : parseInt(value) }),
      });
      if (res.ok) {
        toast({ title: value ? `Assigned to Match #${value}` : "Match number cleared" });
        loadRegistrations();
      } else {
        const d = await safeJson(res);
        toast({ title: "Error", description: d.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Network error", variant: "destructive" });
    } finally {
      setSettingMatchNumber((prev) => ({ ...prev, [regId]: false }));
    }
  };

  // Match room management — saves data only; release is a separate explicit action
  // (see releaseMatchRoom/hideMatchRoom/startMatchNow above).
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
        }),
      });
      if (res.ok) {
        toast({ title: "✅ Room saved (not released)", description: "Click Release when you're ready to reveal it to players." });
        loadMatches();
        setMatchRoomForm((prev) => ({ ...prev, [matchId]: { roomId: "", roomPassword: "", releaseMinutes: "10", hideMinutes: "5" } }));
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

  // Admin: create a community match directly
  const createAdminMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminMatchForm.matchType) return toast({ title: "Select a Match Category", variant: "destructive" });
    setAdminMatchCreating(true);
    try {
      const res = await apiFetch("/admin/user-matches", {
        method: "POST",
        body: JSON.stringify({
          matchType: adminMatchForm.matchType,
          matchName: adminMatchForm.matchName || undefined,
          prizePool: adminMatchForm.prizePool || "0",
          entryFee: adminMatchForm.entryFee || "0",
          perKill: adminMatchForm.perKill || "0",
          mapName: adminMatchForm.mapName || undefined,
          scheduledAt: adminMatchForm.scheduledAt ? new Date(adminMatchForm.scheduledAt + "+06:00").toISOString() : undefined,
          description: adminMatchForm.description || undefined,
          isPrivate: false,
          roomReleaseTime: adminMatchForm.roomReleaseTime ? new Date(adminMatchForm.roomReleaseTime + "+06:00").toISOString() : undefined,
          roomHideTime: adminMatchForm.roomHideTime ? new Date(adminMatchForm.roomHideTime + "+06:00").toISOString() : undefined,
        }),
      });
      if (res.ok) {
        toast({ title: "✅ Community match created!", description: "Match is now live in the frontend category view." });
        setAdminMatchForm({ matchType: "", matchName: "", prizePool: "", entryFee: "", perKill: "", mapName: "", scheduledAt: "", description: "", roomReleaseTime: "", roomHideTime: "" });
        setShowAdminMatchForm(false);
        loadUserMatches();
      } else {
        const d = await safeJson(res);
        toast({ title: "Error", description: d.error ?? "Failed to create match", variant: "destructive" });
      }
    } catch {
      toast({ title: "Network error", variant: "destructive" });
    } finally {
      setAdminMatchCreating(false);
    }
  };

  // Match actions (tournament matches)
  const createMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTournament) return;
    const res = await apiFetch(`/tournaments/${selectedTournament}/matches`, {
      method: "POST",
      body: JSON.stringify({
        matchNumber: parseInt(matchForm.matchNumber),
        scheduledAt: matchForm.scheduledAt ? new Date(matchForm.scheduledAt + "+06:00").toISOString() : new Date().toISOString(),
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
    return `inline-flex items-center px-1.5 py-0.5 rounded border text-xs font-bold uppercase ${cls[status] ?? cls.pending}`;
  };

  const matchLifecycle = (m: any) => {
    if (!m.scheduledAt) return null;
    const now = Date.now();
    const scheduledMs = new Date(m.scheduledAt).getTime();
    const releaseMs = scheduledMs - 10 * 60 * 1000;
    const hideMs = scheduledMs + 60 * 60 * 1000;
    if (now >= hideMs) return { label: "ENDED", cls: "text-[#a0a0b0] bg-[#a0a0b0]/10 border-[#a0a0b0]/30", dot: false };
    if (now >= releaseMs) return { label: "ROOM LIVE", cls: "text-[#00ff88] bg-[#00ff88]/10 border-[#00ff88]/30", dot: true };
    const minsToRelease = Math.ceil((releaseMs - now) / 60000);
    return {
      label: minsToRelease <= 120 ? `${minsToRelease}m to room` : "UPCOMING",
      cls: "text-yellow-400 bg-yellow-400/10 border-yellow-400/30",
      dot: false,
    };
  };

  const deposits = walletTxs.filter((t) => t.type === "deposit");
  const withdrawals = walletTxs.filter((t) => t.type === "withdraw");

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white flex">
      {/* Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 bg-[#0d0d16] border-r border-[#ff6b00]/10 fixed inset-y-0 left-0 z-40">
        <div className="p-4 border-b border-[#ff6b00]/10">
          <div className="flex items-center gap-1.5 mb-1">
            <Shield className="w-6 h-6 text-[#ff6b00]" />
            <span className="font-black uppercase text-white">Admin <span className="text-[#ff6b00]">Panel</span></span>
          </div>
          <p className="text-[#a0a0b0] text-xs">BLACKCODE Dashboard</p>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {(() => {
            const items: React.ReactNode[] = [];
            let lastGroup: string | undefined = undefined;
            tabs.forEach((tab) => {
              if (tab.group && tab.group !== lastGroup) {
                items.push(
                  <p key={`group-${tab.group}`} className="text-[10px] font-black uppercase tracking-widest text-[#505060] px-2.5 pt-2.5 pb-1">
                    Tournament Management
                  </p>
                );
                lastGroup = tab.group;
              } else if (!tab.group && lastGroup) {
                items.push(<div key="group-sep" className="h-px bg-[#1a1a24] my-1.5" />);
                lastGroup = undefined;
              }
              items.push(
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-medium transition-colors text-left ${
                    activeTab === tab.id
                      ? "bg-[#ff6b00]/15 text-[#ff6b00] border border-[#ff6b00]/20"
                      : "text-[#a0a0b0] hover:text-white hover:bg-[#ff6b00]/5"
                  }`}
                >
                  <tab.icon className="w-4 h-4 shrink-0" />
                  <span className="truncate text-xs leading-tight">{tab.label}</span>
                  {tab.id === "registrations" && stats?.pendingRegistrations > 0 && (
                    <span className="ml-auto bg-[#ff6b00] text-white text-xs font-bold px-1 py-0.5 rounded-full shrink-0">
                      {stats.pendingRegistrations}
                    </span>
                  )}
                  {(tab.id === "deposits" || tab.id === "withdrawals") && stats?.pendingWalletRequests > 0 && (
                    <span className="ml-auto bg-yellow-500 text-black text-xs font-bold px-1 py-0.5 rounded-full shrink-0">!</span>
                  )}
                  {tab.id === "reports" && stats?.pendingReports > 0 && (
                    <span className="ml-auto bg-[#ff2244] text-white text-xs font-bold px-1 py-0.5 rounded-full shrink-0">
                      {stats.pendingReports}
                    </span>
                  )}
                </button>
              );
            });
            return items;
          })()}
        </nav>

        <div className="p-3 border-t border-[#ff6b00]/10 space-y-1.5">
          <Link href="/" className="w-full flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm text-[#a0a0b0] hover:text-white hover:bg-[#ff6b00]/5 transition-colors">
            <Home className="w-4 h-4" /> View Website
          </Link>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm text-[#ff2244] hover:bg-[#ff2244]/10 transition-colors"
          >
            <LogOut className="w-4 h-4" /> Logout
          </button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-[#0d0d16] border-b border-[#ff6b00]/10 px-3 h-14 flex items-center justify-between">
        <span className="font-black uppercase text-white text-sm">Admin <span className="text-[#ff6b00]">Panel</span></span>
        <div className="flex items-center gap-2.5">
          <Link href="/" className="text-[#a0a0b0] text-xs hover:text-white">Website</Link>
          <button onClick={handleLogout} className="text-[#ff2244] text-xs font-bold">Logout</button>
        </div>
      </div>

      {/* Mobile tabs */}
      <div className="lg:hidden fixed top-14 left-0 right-0 z-40 bg-[#0d0d16] border-b border-[#ff6b00]/10 overflow-x-auto">
        <div className="flex px-3 gap-1 py-1.5 min-w-max">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
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
        <div className="p-3 lg:p-5 mt-7 lg:mt-0">

          {/* OVERVIEW */}
          {activeTab === "overview" && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h1 className="text-2xl font-black uppercase">Admin <span className="text-[#ff6b00]">Overview</span></h1>
                  <p className="text-[#a0a0b0] text-sm">Real-time platform statistics</p>
                </div>
                <button onClick={() => { loadStats(); loadTournaments(); }} className="flex items-center gap-1.5 text-sm text-[#a0a0b0] hover:text-white transition-colors">
                  <RefreshCw className="w-4 h-4" /> Refresh
                </button>
              </div>
              {/* Maintenance mode quick card */}
              <div
                className={`mb-4 rounded-xl border p-3 flex items-center justify-between cursor-pointer transition-all ${maintenanceMode ? "bg-[#ff2244]/10 border-[#ff2244]/30" : "bg-[#12121a] border-[#2a2a36] hover:border-[#ff6b00]/30"}`}
                onClick={() => setActiveTab("maintenance")}
              >
                <div className="flex items-center gap-2.5">
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
                <div className="flex items-center gap-2.5">
                  <span className={`text-xs font-bold uppercase px-1.5 py-1 rounded-full ${maintenanceMode ? "bg-[#ff2244]/20 text-[#ff2244]" : "bg-[#00ff88]/10 text-[#00ff88]"}`}>
                    {maintenanceMode ? "ON" : "OFF"}
                  </span>
                  <svg className="w-4 h-4 text-[#a0a0b0]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>

              {/* Primary stats grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 mb-3">
                {[
                  { label: "Total Users", value: stats?.totalUsers ?? 0, sub: `+${stats?.newUsersToday ?? 0} today`, icon: Users, color: "text-blue-400", border: "border-blue-400/20", onClick: () => setActiveTab("users") },
                  { label: "Tournaments", value: stats?.totalTournaments ?? 0, sub: `${stats?.activeTournaments ?? 0} active`, icon: Trophy, color: "text-[#ff6b00]", border: "border-[#ff6b00]/20", onClick: () => setActiveTab("tournaments") },
                  { label: "Prize Pool", value: `৳${Number(stats?.totalPrizePool ?? 0).toLocaleString()}`, sub: "all tournaments", icon: DollarSign, color: "text-[#ffd700]", border: "border-[#ffd700]/20" },
                  { label: "Pending Regs", value: stats?.pendingRegistrations ?? 0, sub: "awaiting approval", icon: Clock, color: "text-yellow-400", border: "border-yellow-400/20", onClick: () => setActiveTab("registrations") },
                  { label: "Pending Reports", value: stats?.pendingReports ?? 0, sub: "need review", icon: Flag, color: stats?.pendingReports > 0 ? "text-[#ff2244]" : "text-[#a0a0b0]", border: stats?.pendingReports > 0 ? "border-[#ff2244]/30" : "border-[#2a2a36]", onClick: () => setActiveTab("reports") },
                ].map((card) => (
                  <div key={card.label} onClick={card.onClick} className={`bg-[#12121a] rounded-xl border ${card.border} p-3 ${card.onClick ? "cursor-pointer hover:opacity-80 transition-opacity" : ""}`}>
                    <card.icon className={`w-5 h-5 ${card.color} mb-1.5`} />
                    <div className={`text-2xl font-black ${card.color}`}>{stats === null ? "—" : card.value}</div>
                    <div className="text-white text-xs font-bold mt-0.5">{card.label}</div>
                    {card.sub && <div className="text-[#4a4a5a] text-[10px] mt-0.5">{card.sub}</div>}
                  </div>
                ))}
              </div>

              {/* Community match stats row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-4">
                {[
                  { label: "Community Matches", value: stats?.totalCommunityMatches ?? 0, icon: Swords, color: "text-[#00b4ff]", onClick: () => setActiveTab("user-matches") },
                  { label: "Active / Waiting", value: stats?.activeCommunityMatches ?? 0, icon: Activity, color: "text-[#00ff88]", onClick: () => { setActiveTab("user-matches"); setUmStatusFilter("approved"); } },
                  { label: "Completed", value: stats?.completedCommunityMatches ?? 0, icon: CheckCircle, color: "text-[#a0a0b0]" },
                  { label: "Pending Withdrawals", value: stats?.pendingWithdrawals ?? 0, icon: ArrowUpCircle, color: stats?.pendingWithdrawals > 0 ? "text-orange-400" : "text-[#a0a0b0]", onClick: () => setActiveTab("withdrawals") },
                ].map((card) => (
                  <div key={card.label} onClick={card.onClick} className={`bg-[#12121a] rounded-xl border border-[#1e1e2e] p-2.5 flex items-center gap-2.5 ${card.onClick ? "cursor-pointer hover:border-[#2a2a36] transition-colors" : ""}`}>
                    <card.icon className={`w-5 h-5 shrink-0 ${card.color}`} />
                    <div>
                      <div className={`text-xl font-black ${card.color}`}>{stats === null ? "—" : card.value}</div>
                      <div className="text-[#606070] text-[10px] uppercase font-bold">{card.label}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Bottom panels: upcoming + recent regs + recent activity */}
              <div className="grid lg:grid-cols-3 gap-3.5">
                <div>
                  <h2 className="text-xs font-black uppercase text-[#ff6b00] mb-2.5 tracking-wider">Upcoming Tournaments</h2>
                  <div className="bg-[#12121a] rounded-xl border border-[#ff6b00]/10">
                    {!stats?.upcomingTournaments || stats.upcomingTournaments.length === 0 ? (
                      <div className="p-3.5 text-center text-[#a0a0b0] text-sm">No upcoming tournaments</div>
                    ) : stats.upcomingTournaments.map((t: any) => (
                      <div key={t.id} className="p-2.5 border-b border-[#ff6b00]/5 last:border-0 flex items-center justify-between gap-1.5">
                        <div className="min-w-0">
                          <div className="font-bold text-white text-sm truncate">{t.name}</div>
                          <div className="text-[#a0a0b0] text-xs">{new Date(t.startDate).toLocaleDateString()}</div>
                        </div>
                        <span className={statusBadge(t.status)}>{t.status}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h2 className="text-xs font-black uppercase text-[#ff6b00] mb-2.5 tracking-wider">Recent Registrations</h2>
                  <div className="bg-[#12121a] rounded-xl border border-[#ff6b00]/10">
                    {!stats?.recentRegistrations || stats.recentRegistrations.length === 0 ? (
                      <div className="p-3.5 text-center text-[#a0a0b0] text-sm">No registrations yet</div>
                    ) : stats.recentRegistrations.slice(0, 6).map((r: any) => (
                      <div key={r.id} className="p-2.5 border-b border-[#ff6b00]/5 last:border-0 flex items-center justify-between gap-1.5">
                        <div className="min-w-0">
                          <div className="font-bold text-white text-sm truncate">{r.playerName}</div>
                          <div className="text-[#a0a0b0] text-xs font-mono">{r.freefireUid}</div>
                        </div>
                        <span className={statusBadge(r.status)}>{r.status}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h2 className="text-xs font-black uppercase text-[#ff6b00] mb-2.5 tracking-wider">Recent Activity</h2>
                  <div className="bg-[#12121a] rounded-xl border border-[#ff6b00]/10 max-h-[280px] overflow-y-auto">
                    {!stats?.recentActivity || stats.recentActivity.length === 0 ? (
                      <div className="p-3.5 text-center text-[#a0a0b0] text-sm">No activity yet</div>
                    ) : stats.recentActivity.map((a: any) => (
                      <div key={a.id} className="px-2.5 py-2 border-b border-[#ff6b00]/5 last:border-0">
                        <div className="text-white text-xs font-bold truncate">{a.action?.replace(/\./g, " ") ?? "Event"}</div>
                        <div className="text-[#4a4a5a] text-[10px] mt-0.5">{new Date(a.createdAt).toLocaleString()}</div>
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
              <div className="flex items-center justify-between mb-4">
                <h1 className="text-2xl font-black uppercase">Manage <span className="text-[#ff6b00]">Tournaments</span></h1>
                <button
                  onClick={() => { setShowTForm(true); setEditingTournament(null); setTForm({ name: "", description: "", mode: "squad", gameMode: "", startDate: "", endDate: "", maxSlots: "", prizePool: "", entryFee: "", perKillReward: "", status: "upcoming", bannerUrl: "", prize1Amt: "", prize2Amt: "", prize3Amt: "" }); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#ff6b00] text-white font-bold text-sm uppercase rounded-xl hover:bg-[#e66000] transition-colors"
                >
                  <Plus className="w-4 h-4" /> Create Tournament
                </button>
              </div>

              {showTForm && (
                <div className="bg-[#12121a] border border-[#ff6b00]/20 rounded-xl p-4 mb-4">
                  <h2 className="font-black uppercase text-[#ff6b00] mb-3">{editingTournament ? "Edit Tournament" : "New Tournament"}</h2>
                  <form onSubmit={saveTournament} className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="md:col-span-2">
                      <label className="label-sm">Tournament Name *</label>
                      <input value={tForm.name} onChange={(e) => setTForm({ ...tForm, name: e.target.value })} required className="admin-input" />
                    </div>
                    <div className="md:col-span-2">
                      <label className="label-sm">Description</label>
                      <textarea value={tForm.description} onChange={(e) => setTForm({ ...tForm, description: e.target.value })} rows={3} className="admin-input resize-none" />
                    </div>
                    <div>
                      <label className="label-sm">Game Category <span className="text-[#ff2244]">*</span></label>
                      <select required value={tForm.gameMode} onChange={(e) => setTForm({ ...tForm, gameMode: e.target.value })} className={`admin-input ${!tForm.gameMode ? "border-[#ff2244]/40" : ""}`}>
                        <option value="">— Select Category (Required) —</option>
                        <option value="BR">🔥 BR Tournament (Battle Royale)</option>
                        <option value="CS">⚔️ Clash Squad Tournament</option>
                        <option value="SOLO">🎯 Solo Tournament</option>
                        <option value="LONE_WOLF">🐺 Lone Wolf Tournament</option>
                        <option value="FREE">🎁 Free Match Tournament</option>
                      </select>
                      {!tForm.gameMode && <p className="text-[10px] text-[#ff2244] mt-1">Category is required — tournaments without a category won't appear in tabs</p>}
                    </div>
                    <div>
                      <label className="label-sm">Squad Mode</label>
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
                      <input type="number" value={tForm.perKillReward} onChange={(e) => setTForm({ ...tForm, perKillReward: e.target.value })} min="0" step="0.01" className="admin-input" />
                    </div>
                    <div>
                      <label className="label-sm">Banner Image URL</label>
                      <input value={tForm.bannerUrl} onChange={(e) => setTForm({ ...tForm, bannerUrl: e.target.value })} className="admin-input" />
                    </div>
                    {!editingTournament && parseFloat(tForm.prizePool) > 0 && (
                      <div className="md:col-span-2 bg-[#0d0d16] border border-[#ff6b00]/10 rounded-xl p-3">
                        <p className="text-[#ff6b00] text-xs font-black uppercase mb-2.5">Prize Distribution (৳ Fixed Amount)</p>
                        <div className="grid grid-cols-3 gap-2.5">
                          <div>
                            <label className="label-sm">🥇 1st Place (৳)</label>
                            <input type="number" value={tForm.prize1Amt} onChange={(e) => setTForm({ ...tForm, prize1Amt: e.target.value })} min="0" step="1" placeholder="0" className="admin-input" />
                          </div>
                          <div>
                            <label className="label-sm">🥈 2nd Place (৳)</label>
                            <input type="number" value={tForm.prize2Amt} onChange={(e) => setTForm({ ...tForm, prize2Amt: e.target.value })} min="0" step="1" placeholder="0" className="admin-input" />
                          </div>
                          <div>
                            <label className="label-sm">🥉 3rd Place (৳)</label>
                            <input type="number" value={tForm.prize3Amt} onChange={(e) => setTForm({ ...tForm, prize3Amt: e.target.value })} min="0" step="1" placeholder="0" className="admin-input" />
                          </div>
                        </div>
                      </div>
                    )}
                    <div className="md:col-span-2 flex gap-2.5">
                      <button type="submit" disabled={loading} className="px-4 py-2 bg-[#ff6b00] text-white font-bold text-sm uppercase rounded-xl hover:bg-[#e66000] transition-colors disabled:opacity-50">
                        {loading ? "Saving..." : editingTournament ? "Update Tournament" : "Create Tournament"}
                      </button>
                      <button type="button" onClick={() => { setShowTForm(false); setEditingTournament(null); }} className="px-4 py-2 bg-[#1a1a24] text-[#a0a0b0] font-bold text-sm uppercase rounded-xl hover:text-white transition-colors">
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              )}

              <div className="space-y-3">
                {tournamentsLoading ? (
                  [1, 2, 3].map((i) => (
                    <div key={i} className="bg-[#12121a] rounded-xl border border-[#ff6b00]/10 p-3.5 animate-pulse">
                      <div className="flex items-start gap-3">
                        <div className="flex-1 space-y-1.5">
                          <div className="h-5 bg-[#1a1a24] rounded w-64" />
                          <div className="h-4 bg-[#1a1a24] rounded w-80" />
                        </div>
                        <div className="flex gap-1.5">
                          <div className="w-9 h-9 bg-[#1a1a24] rounded-lg" />
                          <div className="w-9 h-9 bg-[#1a1a24] rounded-lg" />
                        </div>
                      </div>
                      <div className="mt-3 pt-3 border-t border-[#ff6b00]/5 space-y-1.5">
                        <div className="h-4 bg-[#1a1a24] rounded w-24" />
                        <div className="flex gap-1.5">
                          <div className="h-8 bg-[#1a1a24] rounded-lg w-32" />
                          <div className="h-8 bg-[#1a1a24] rounded-lg w-28" />
                          <div className="h-8 bg-[#1a1a24] rounded-lg w-20" />
                        </div>
                      </div>
                    </div>
                  ))
                ) : tournaments.length === 0 ? (
                  <div className="bg-[#12121a] rounded-xl border border-[#ff6b00]/10 p-8 text-center text-[#a0a0b0]">
                    <Trophy className="w-12 h-12 mx-auto mb-2.5 opacity-20" />
                    <p>No tournaments yet. Create your first tournament above.</p>
                  </div>
                ) : tournaments.map((t) => (
                  <div key={t.id} className="bg-[#12121a] rounded-xl border border-[#ff6b00]/10 p-3.5">
                    <div className="flex flex-col lg:flex-row lg:items-start gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2.5 mb-1.5 flex-wrap">
                          <span className="font-black text-white">{t.name}</span>
                          <span className={statusBadge(t.status)}>{t.status}</span>
                          <span className="text-[#a0a0b0] text-xs uppercase">{t.mode}</span>
                        </div>
                        <div className="text-[#a0a0b0] text-sm flex flex-wrap gap-3">
                          <span>Start: {new Date(t.startDate).toLocaleString()}</span>
                          <span>Slots: {t.filledSlots}/{t.maxSlots}</span>
                          <span>Prize: ৳{Number(t.prizePool).toLocaleString()}</span>
                          <span>Entry: ৳{Number(t.entryFee).toLocaleString()}</span>
                        </div>
                      </div>
                      <div className="flex gap-1.5 shrink-0 items-start flex-wrap">
                        <button
                          onClick={async () => {
                            const closed = !t.registrationClosed;
                            const res = await apiFetch(`/tournaments/${t.id}/registration`, {
                              method: "PATCH",
                              body: JSON.stringify({ closed }),
                            });
                            if (res.ok) {
                              toast({ title: closed ? "🔒 Registration closed" : "🟢 Registration opened" });
                              loadTournaments();
                            } else {
                              const d = await safeJson(res);
                              toast({ title: "Error", description: d.error, variant: "destructive" });
                            }
                          }}
                          className={`flex items-center gap-1 px-2.5 py-1.5 border rounded-lg text-xs font-black uppercase transition-colors ${
                            t.registrationClosed
                              ? "bg-[#ff2244]/10 border-[#ff2244]/30 text-[#ff2244] hover:bg-[#ff2244]/20"
                              : "bg-[#00ff88]/10 border-[#00ff88]/30 text-[#00ff88] hover:bg-[#00ff88]/20"
                          }`}
                        >
                          {t.registrationClosed ? "🔒 Reg. Closed" : "🟢 Reg. Open"}
                        </button>
                        <button onClick={() => editTournament(t)} className="p-1.5 bg-blue-400/10 border border-blue-400/20 rounded-lg text-blue-400 hover:bg-blue-400/20 transition-colors">
                          <Edit className="w-4 h-4" />
                        </button>
                        <button onClick={() => deleteTournament(t.id)} className="p-1.5 bg-[#ff2244]/10 border border-[#ff2244]/20 rounded-lg text-[#ff2244] hover:bg-[#ff2244]/20 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* ── Tournament Matches ── */}
                    <div className="mt-3 pt-3 border-t border-[#ff6b00]/5">
                      <div className="flex items-center justify-between mb-2.5">
                        <button
                          onClick={() => {
                            const open = !expandedTournamentMatches[t.id];
                            setExpandedTournamentMatches((prev) => ({ ...prev, [t.id]: open }));
                            if (open && !tournamentMatchesList[t.id]) loadTournamentMatchesById(t.id);
                          }}
                          className="flex items-center gap-1.5 text-sm font-bold text-[#a0a0b0] hover:text-white transition-colors flex-wrap"
                        >
                          <span>🗓️</span>
                          <span className="uppercase text-xs tracking-wider">Matches</span>
                          {tournamentMatchesList[t.id] && tournamentMatchesList[t.id].length > 0 ? (
                            tournamentMatchesList[t.id].map((m: any) => (
                              <span key={m.id} className="text-[10px] bg-[#ff6b00]/15 text-[#ff6b00] border border-[#ff6b00]/20 px-1 py-0.5 rounded font-black">
                                Match #{m.matchNumber}
                              </span>
                            ))
                          ) : tournamentMatchesList[t.id] ? (
                            <span className="text-[10px] text-[#606070] italic">No matches yet</span>
                          ) : null}
                          <span className="text-[#404050] text-xs">{expandedTournamentMatches[t.id] ? "▲" : "▼"}</span>
                        </button>
                        <button
                          onClick={() => setShowTournamentMatchForm((prev) => ({ ...prev, [t.id]: !prev[t.id] }))}
                          className="flex items-center gap-1 px-2.5 py-1 bg-[#ff6b00] text-white font-bold text-xs uppercase rounded-lg hover:bg-[#e66000] transition-colors"
                        >
                          <Plus className="w-3 h-3" /> Add Match
                        </button>
                      </div>

                      {showTournamentMatchForm[t.id] && (
                        <div className="bg-[#0a0a14] border border-[#ff6b00]/20 rounded-xl p-3 mb-2.5">
                          <h3 className="text-xs font-black uppercase text-[#ff6b00] mb-2.5">New Match for {t.name}</h3>
                          <div className="text-[10px] text-[#606070] mb-2.5 bg-[#1a1a24] rounded-lg px-2.5 py-1.5 border border-[#2a2a36]">
                            ℹ️ This only creates the match. Registration stays open, and the room/match stay hidden and not live until you take those actions yourself later.
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            <div>
                              <label className="text-[#606070] text-[10px] uppercase block mb-1">Match Number *</label>
                              <input
                                type="number"
                                min="1"
                                placeholder="1"
                                value={tournamentMatchForms[t.id]?.matchNumber ?? ""}
                                onChange={(e) => setTournamentMatchForms((prev) => ({ ...prev, [t.id]: { ...prev[t.id], matchNumber: e.target.value, scheduledAt: prev[t.id]?.scheduledAt ?? "", mapName: prev[t.id]?.mapName ?? "" } }))}
                                className="admin-input"
                              />
                            </div>
                            <div>
                              <label className="text-[#606070] text-[10px] uppercase block mb-1">Match Name</label>
                              <input
                                placeholder="e.g. Bermuda Battle, Finals..."
                                value={tournamentMatchForms[t.id]?.mapName ?? ""}
                                onChange={(e) => setTournamentMatchForms((prev) => ({ ...prev, [t.id]: { ...prev[t.id], matchNumber: prev[t.id]?.matchNumber ?? "", scheduledAt: prev[t.id]?.scheduledAt ?? "", mapName: e.target.value } }))}
                                className="admin-input"
                              />
                            </div>
                            <div className="sm:col-span-2">
                              <label className="text-[#606070] text-[10px] uppercase block mb-1">Scheduled At *</label>
                              <input
                                type="datetime-local"
                                value={tournamentMatchForms[t.id]?.scheduledAt ?? ""}
                                onChange={(e) => setTournamentMatchForms((prev) => ({ ...prev, [t.id]: { ...prev[t.id], matchNumber: prev[t.id]?.matchNumber ?? "", mapName: prev[t.id]?.mapName ?? "", scheduledAt: e.target.value } }))}
                                className="admin-input"
                              />
                              <p className="text-[#606070] text-[10px] mt-1">
                                Match auto-goes-live once this time passes — nothing else (room, registration) is affected by it.
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-1.5 mt-2.5">
                            <button
                              onClick={() => createMatchForTournament(t.id)}
                              disabled={creatingTournamentMatch[t.id]}
                              className="px-3 py-1.5 bg-[#ff6b00] text-white font-bold text-xs uppercase rounded-lg hover:bg-[#e66000] transition-colors disabled:opacity-50"
                            >
                              {creatingTournamentMatch[t.id] ? "Creating..." : "Create Match"}
                            </button>
                            <button
                              onClick={() => setShowTournamentMatchForm((prev) => ({ ...prev, [t.id]: false }))}
                              className="px-3 py-1.5 bg-[#1a1a24] text-[#a0a0b0] font-bold text-xs uppercase rounded-lg hover:text-white transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}

                      {expandedTournamentMatches[t.id] && (
                        <div className="space-y-1.5">
                          {tournamentMatchesLoading[t.id] ? (
                            [1, 2, 3].map((i) => (
                              <div key={i} className="h-20 bg-[#1a1a24] rounded-xl animate-pulse" />
                            ))
                          ) : !tournamentMatchesList[t.id] || tournamentMatchesList[t.id].length === 0 ? (
                            <div className="text-center py-3.5 text-[#a0a0b0] text-xs border border-dashed border-[#2a2a36] rounded-xl">
                              No matches yet — click "Add Match" above to create the first one.
                            </div>
                          ) : tournamentMatchesList[t.id].map((m: any) => (
                            <div key={m.id} className="bg-[#0d0d18] border border-[#2a2a36] rounded-xl p-2.5">
                              <div className="flex items-start justify-between gap-1.5 flex-wrap">
                                <div>
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    {m.serialNumber && (
                                      <span className="text-[#ff6b00] font-mono text-[10px] bg-[#ff6b00]/10 border border-[#ff6b00]/20 px-1 py-0.5 rounded">
                                        {m.serialNumber}
                                      </span>
                                    )}
                                    <span className="text-white text-sm font-bold">Match #{m.matchNumber}</span>
                                    {m.mapName && <span className="text-[#a0a0b0] text-xs">— {m.mapName}</span>}
                                    <span className={statusBadge(m.status)}>{m.status}</span>
                                    {(() => {
                                      const lc = matchLifecycle(m);
                                      if (!lc) return null;
                                      return (
                                        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] font-black uppercase ${lc.cls}`}>
                                          {lc.dot && <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse shrink-0" />}
                                          {lc.label}
                                        </span>
                                      );
                                    })()}
                                  </div>
                                  {m.scheduledAt && (
                                    <div className="text-[#a0a0b0] text-xs mt-0.5">{new Date(m.scheduledAt).toLocaleString()}</div>
                                  )}
                                </div>
                              </div>

                              {/* Room status indicator (read-only in this tab) */}
                              {m.roomId && (
                                <div className="mt-1.5 flex items-center gap-1.5 text-xs">
                                  <Key className="w-3 h-3 text-[#00ff88]" />
                                  <span className="text-[#00ff88] font-mono font-bold">{m.roomId}</span>
                                  <span className="text-[#a0a0b0]">· Manage in <span className="text-[#ff6b00] font-bold">Room Release Settings</span></span>
                                </div>
                              )}
                            </div>
                          ))}
                          <button
                            onClick={() => loadTournamentMatchesById(t.id)}
                            className="flex items-center gap-1 text-xs text-[#a0a0b0] hover:text-white transition-colors mt-1"
                          >
                            <RefreshCw className="w-3 h-3" /> Refresh matches
                          </button>
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
              <div className="mb-4">
                <h1 className="text-2xl font-black uppercase">Manage <span className="text-[#ff6b00]">Matches</span></h1>
                <p className="text-[#a0a0b0] text-sm mt-1">Results entry &amp; prize distribution for all tournament matches. Room details are managed in the <span className="text-[#ff6b00] font-bold">Tournaments</span> tab.</p>
              </div>

              {tournamentsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-20 bg-[#12121a] rounded-xl border border-[#ff6b00]/10 animate-pulse" />
                  ))}
                </div>
              ) : tournaments.length === 0 ? (
                <div className="bg-[#12121a] rounded-xl border border-[#ff6b00]/10 p-7 text-center text-[#a0a0b0] text-sm">
                  <div className="text-4xl mb-2.5">🏆</div>
                  <div className="font-black text-white mb-1">No Tournaments Yet</div>
                  <div>Create a tournament in the <strong className="text-[#ff6b00]">Manage Tournaments</strong> tab first.</div>
                </div>
              ) : (
                <>
                  <div className="space-y-3">
                    {tournaments.map((t: any) => {
                      const isOpen = expandedTournamentMatches[t.id] ?? false;
                      const tMatches = tournamentMatchesList[t.id];
                      return (
                        <div key={t.id} className="bg-[#12121a] rounded-xl border border-[#ff6b00]/10 overflow-hidden">
                          {/* Tournament accordion header */}
                          <button
                            onClick={() => {
                              const open = !isOpen;
                              setExpandedTournamentMatches((prev) => ({ ...prev, [t.id]: open }));
                              if (open && !tMatches) loadTournamentMatchesById(t.id);
                            }}
                            className="w-full flex items-center justify-between px-3.5 py-3 hover:bg-[#16161e] transition-colors text-left"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span className="text-[#ff6b00] text-xl shrink-0">🏆</span>
                              <div className="min-w-0">
                                <div className="font-black text-white text-sm truncate">{t.name}</div>
                                <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                  <span className="text-[10px] text-[#a0a0b0] uppercase tracking-wider">{t.mode}</span>
                                  <span className={statusBadge(t.status)}>{t.status}</span>
                                  {tMatches && tMatches.length > 0 ? (
                                    tMatches.map((m: any) => (
                                      <span key={m.id} className="text-[10px] bg-[#ff6b00]/15 text-[#ff6b00] border border-[#ff6b00]/20 px-1 py-0.5 rounded font-black">
                                        Match #{m.matchNumber}
                                      </span>
                                    ))
                                  ) : tMatches ? (
                                    <span className="text-[10px] text-[#606070] italic">No matches</span>
                                  ) : null}
                                  {t.prizePool > 0 && (
                                    <span className="text-[10px] text-yellow-400 font-bold">৳{Number(t.prizePool).toLocaleString()} pool</span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <span className="text-[#606070] text-xs ml-2.5 shrink-0">{isOpen ? "▲ Collapse" : "▼ Expand"}</span>
                          </button>

                          {isOpen && (
                            <div className="border-t border-[#ff6b00]/10 p-3 space-y-3">
                              {tournamentMatchesLoading[t.id] ? (
                                [1, 2, 3].map((i) => (
                                  <div key={i} className="h-20 bg-[#1a1a24] rounded-xl animate-pulse" />
                                ))
                              ) : !tMatches || tMatches.length === 0 ? (
                                <div className="text-center py-5 text-[#606070] text-xs border border-dashed border-[#2a2a36] rounded-xl">
                                  🎮 No matches for this tournament yet. Go to <strong className="text-[#ff6b00]">Manage Tournaments</strong> → expand this tournament → "Add Match".
                                </div>
                              ) : tMatches.map((m: any) => {
                                const isExpanded = expandedMatchResult[m.id];
                                const rows = matchResultRows[m.id] ?? [];
                                const hasResults = m.results && m.results.length > 0;
                                return (
                                  <div key={m.id} className="bg-[#0d0d18] rounded-xl border border-[#2a2a36] overflow-hidden">
                                    {/* Match header */}
                                    <div className="p-3 flex flex-col sm:flex-row sm:items-start gap-2.5">
                                      <div className="flex-1">
                                        <div className="font-bold text-white text-base flex items-center gap-1.5 flex-wrap">
                                          {m.serialNumber && (
                                            <span className="text-[#ff6b00] font-mono text-xs bg-[#ff6b00]/10 border border-[#ff6b00]/20 px-1 py-0.5 rounded">{m.serialNumber}</span>
                                          )}
                                          Match #{m.matchNumber}
                                          {m.mapName && <span className="text-[#a0a0b0] font-normal text-sm">— {m.mapName}</span>}
                                        </div>
                                        {m.scheduledAt && <div className="text-[#a0a0b0] text-xs mt-0.5">{new Date(m.scheduledAt).toLocaleString()}</div>}
                                        {m.roomId && (
                                          <div className="text-[#00ff88] text-xs mt-1 font-bold flex items-center gap-1">
                                            <Key className="w-3 h-3" /> Room: {m.roomId} · Pass: {m.roomPassword}
                                          </div>
                                        )}
                                        {hasResults && <div className="text-[#00ff88] text-xs mt-1 font-bold">✓ {m.results.length} players ranked</div>}
                                      </div>
                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        <span className={statusBadge(m.status)}>{m.status}</span>
                                        {(() => {
                                          const lc = matchLifecycle(m);
                                          if (!lc) return null;
                                          return (
                                            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] font-black uppercase ${lc.cls}`}>
                                              {lc.dot && <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse shrink-0" />}
                                              {lc.label}
                                            </span>
                                          );
                                        })()}
                                        {(m.status === "scheduled" || m.status === "room_released") && (
                                          <button
                                            onClick={() => updateMatchStatus(m.id, "live")}
                                            disabled={updatingMatchStatus[m.id]}
                                            className="flex items-center gap-1 px-2 py-1 bg-green-500/10 border border-green-500/20 rounded-lg text-green-400 text-xs font-bold hover:bg-green-500/20 transition-colors disabled:opacity-50"
                                          >
                                            <Radio className="w-3 h-3" /> Go Live
                                          </button>
                                        )}
                                        {m.status === "live" && (
                                          <button
                                            onClick={() => updateMatchStatus(m.id, "completed")}
                                            disabled={updatingMatchStatus[m.id]}
                                            className="flex items-center gap-1 px-2 py-1 bg-gray-500/10 border border-gray-500/20 rounded-lg text-gray-400 text-xs font-bold hover:bg-gray-500/20 transition-colors disabled:opacity-50"
                                          >
                                            <CheckCircle className="w-3 h-3" /> Complete
                                          </button>
                                        )}
                                        <button
                                          onClick={() => {
                                            const opening = !expandedMatchResult[m.id];
                                            setExpandedMatchResult((prev) => ({ ...prev, [m.id]: opening }));
                                            if (opening && !matchTeamData[m.id]) {
                                              loadMatchTeamData(m.id, t.id);
                                            }
                                          }}
                                          className="flex items-center gap-1 px-2.5 py-1 bg-[#ff6b00]/10 border border-[#ff6b00]/20 rounded-lg text-[#ff6b00] text-xs font-bold hover:bg-[#ff6b00]/20 transition-colors"
                                        >
                                          {isExpanded ? "▲ Close" : "▼ Publish Results"}
                                        </button>
                                        <button
                                          onClick={() => {
                                            const opening = !expandedPrize[m.id];
                                            setExpandedPrize((prev) => ({ ...prev, [m.id]: opening }));
                                            if (opening && !prizeRegData[m.id]) loadPrizeRegistrations(m.id, t.id);
                                          }}
                                          className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-colors border ${m.prizeDistributed ? "bg-[#00ff88]/10 border-[#00ff88]/30 text-[#00ff88]" : "bg-yellow-500/10 border-yellow-500/20 text-yellow-400 hover:bg-yellow-500/20"}`}
                                        >
                                          {m.prizeDistributed ? "✅ Prizes Paid" : "💰 Prize Distribution"}
                                        </button>
                                      </div>
                                    </div>

                                    {/* ── Publish Results Panel (squad-grouped) ── */}
                                    {isExpanded && (() => {
                                      const teamData = matchTeamData[m.id];
                                      const teamRegs = teamData?.registrations ?? [];
                                      const tKills = matchTeamKills[m.id] ?? {};
                                      const tRanks = matchTeamRanks[m.id] ?? {};
                                      const perKillAmt = Number(teamData?.tournament?.perKillReward ?? 0);
                                      const prizeTiersList: any[] = teamData?.tournament?.prizes ?? [];
                                      const prizeByRankMap: Record<number, number> = {};
                                      prizeTiersList.forEach((p: any, i: number) => { prizeByRankMap[i + 1] = Number(p.amount); });
                                      if (prizeTiersList.length === 0) {
                                        const pool = Number(teamData?.tournament?.prizePool ?? 0);
                                        if (pool > 0) { prizeByRankMap[1] = pool * 0.5; prizeByRankMap[2] = pool * 0.3; prizeByRankMap[3] = pool * 0.2; }
                                      }
                                      return (
                                        <div className="border-t border-[#2a2a36] p-3 bg-[#0a0a12] space-y-3">
                                          <div className="flex items-center justify-between">
                                            <p className="text-[10px] uppercase font-black text-[#ff6b00] tracking-widest">Publish Results — Squad Groups</p>
                                            <button
                                              onClick={() => loadMatchTeamData(m.id, t.id)}
                                              className="flex items-center gap-1 px-2 py-1 bg-[#1a1a26] border border-[#2a2a36] text-[#a0a0b0] font-bold text-[10px] uppercase rounded-lg hover:bg-[#2a2a36] transition-colors"
                                            >
                                              <RefreshCw className={`w-3 h-3 ${teamData?.loading ? "animate-spin" : ""}`} /> Reload Teams
                                            </button>
                                          </div>

                                          {/* Info bar */}
                                          <div className="flex items-center gap-2.5 text-[10px] text-[#606070] bg-[#0d0d18] border border-[#1a1a28] rounded-lg px-2.5 py-1.5">
                                            <span>👑 One RANK per squad</span>
                                            <span>·</span>
                                            <span>⚡ Kills entered per member</span>
                                            <span>·</span>
                                            <span>💰 Prize auto-calculated → Leader wallet</span>
                                          </div>

                                          {teamData?.loading ? (
                                            <div className="flex items-center justify-center gap-1.5 py-5 text-[#606070] text-xs">
                                              <RefreshCw className="w-4 h-4 animate-spin" /> Loading registered teams…
                                            </div>
                                          ) : teamRegs.length === 0 ? (
                                            <div className="text-center py-5 text-[#606070] text-xs border border-dashed border-[#2a2a36] rounded-xl">
                                              {teamData ? "No approved registrations found for this tournament." : "Click Reload Teams to load squads."}
                                            </div>
                                          ) : (
                                            <div className="space-y-2.5 max-h-[60vh] overflow-y-auto pr-1">
                                              {teamRegs.map((reg: any) => {
                                                const allMembers = [
                                                  { name: reg.playerName, uid: reg.freefireUid, idx: 0, isLeader: true },
                                                  ...(reg.teamMembersArr ?? []).map((mem: any, mi: number) => ({
                                                    name: mem.name ?? "?",
                                                    uid: mem.uid ?? "",
                                                    idx: mi + 1,
                                                    isLeader: false,
                                                  })),
                                                ];
                                                const teamTotalKills = allMembers.reduce((s, mem) => s + (tKills[`${reg.id}-${mem.idx}`] ?? 0), 0);
                                                const selectedRank = tRanks[reg.id] ? parseInt(tRanks[reg.id]) : null;
                                                const rankPrize = selectedRank ? (prizeByRankMap[selectedRank] ?? 0) : 0;
                                                const killReward = teamTotalKills * perKillAmt;
                                                const estimated = rankPrize + killReward;
                                                const rankEmoji = selectedRank === 1 ? "🥇" : selectedRank === 2 ? "🥈" : selectedRank === 3 ? "🥉" : null;
                                                return (
                                                  <div key={reg.id} className="bg-[#0e0e1a] border border-[#1e1e2e] rounded-xl overflow-hidden">
                                                    {/* Squad header */}
                                                    <div className="flex items-center gap-2.5 px-3 py-2 bg-[#0a0a14] border-b border-[#1a1a26]">
                                                      <span className="text-sm">👑</span>
                                                      <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-1.5 flex-wrap">
                                                          <span className="text-white text-xs font-black truncate">{reg.playerName}</span>
                                                          {reg.teamMembersArr?.length > 0 && (
                                                            <span className="text-[10px] text-[#606070] bg-[#1a1a26] px-1 py-0.5 rounded-full border border-[#2a2a36]">
                                                              +{reg.teamMembersArr.length}
                                                            </span>
                                                          )}
                                                          {rankEmoji && <span className="text-xs">{rankEmoji}</span>}
                                                        </div>
                                                        {estimated > 0 && (
                                                          <div className="text-[10px] text-[#00ff88] mt-0.5">
                                                            Est. Prize: ৳{estimated.toFixed(2)}
                                                            {rankPrize > 0 && killReward > 0 && ` (৳${rankPrize.toFixed(0)} rank + ৳${killReward.toFixed(0)} kills)`}
                                                          </div>
                                                        )}
                                                      </div>
                                                      {/* Single RANK dropdown per squad */}
                                                      <select
                                                        value={tRanks[reg.id] ?? ""}
                                                        onChange={(e) => setMatchTeamRanks((prev) => ({ ...prev, [m.id]: { ...(prev[m.id] ?? {}), [reg.id]: e.target.value } }))}
                                                        className="bg-[#0d0d16] border border-[#2a2a36] rounded-lg text-white text-xs px-1.5 py-1 focus:outline-none focus:border-[#ff6b00] shrink-0 w-24"
                                                      >
                                                        <option value="">Rank —</option>
                                                        {[1,2,3,4,5,6,7,8,9,10].map((n) => (
                                                          <option key={n} value={n}>{n === 1 ? "🥇 1st" : n === 2 ? "🥈 2nd" : n === 3 ? "🥉 3rd" : `#${n}`}</option>
                                                        ))}
                                                      </select>
                                                    </div>
                                                    {/* Member rows with individual kill inputs */}
                                                    <div className="divide-y divide-[#111120]">
                                                      {allMembers.map((mem) => {
                                                        const killKey = `${reg.id}-${mem.idx}`;
                                                        const memberKills = tKills[killKey] ?? 0;
                                                        return (
                                                          <div key={mem.idx} className={`flex items-center gap-2.5 hover:bg-[#0c0c16] transition-colors py-1.5 ${mem.isLeader ? "px-3" : "px-4 bg-[#08080e]"}`}>
                                                            {mem.isLeader
                                                              ? <span className="text-[10px] shrink-0">👑</span>
                                                              : <span className="text-[10px] text-[#404050] font-black w-4 shrink-0">P{mem.idx + 1}</span>
                                                            }
                                                            <div className="flex-1 min-w-0">
                                                              <div className={`text-xs font-semibold truncate ${mem.isLeader ? "text-white" : "text-[#b0b0c0]"}`}>{mem.name}</div>
                                                              {mem.uid && <div className="text-[#404050] text-[10px] font-mono leading-none">{mem.uid}</div>}
                                                            </div>
                                                            {mem.isLeader && <span className="text-[10px] text-[#ffd700] font-black bg-[#ffd700]/10 border border-[#ffd700]/20 px-1 py-0.5 rounded-full shrink-0">Wallet</span>}
                                                            {perKillAmt > 0 && memberKills > 0 && (
                                                              <span className="text-[10px] text-[#00ff88] shrink-0">+৳{(memberKills * perKillAmt).toFixed(0)}</span>
                                                            )}
                                                            <div className="w-16 shrink-0">
                                                              <input
                                                                type="number" min="0" placeholder="0"
                                                                value={memberKills === 0 ? "" : memberKills}
                                                                onChange={(e) => setMatchTeamKills((prev) => ({
                                                                  ...prev,
                                                                  [m.id]: { ...(prev[m.id] ?? {}), [killKey]: parseInt(e.target.value) || 0 },
                                                                }))}
                                                                className="w-full bg-[#06060f] border border-[#1e1e2e] text-white text-xs font-bold rounded-lg px-1.5 py-1 text-center focus:outline-none focus:border-[#ff6b00] transition-colors"
                                                              />
                                                            </div>
                                                          </div>
                                                        );
                                                      })}
                                                    </div>
                                                    {/* Team kill total footer */}
                                                    <div className="flex items-center justify-between px-3 py-1 bg-[#07070f] border-t border-[#111120]">
                                                      <span className="text-[10px] text-[#404050]">Team Kills</span>
                                                      <span className={`text-[10px] font-black ${teamTotalKills > 0 ? "text-[#00ff88]" : "text-[#303040]"}`}>
                                                        {teamTotalKills}
                                                        {perKillAmt > 0 && teamTotalKills > 0 && <span className="text-[#606060] font-normal"> × ৳{perKillAmt} = ৳{(teamTotalKills * perKillAmt).toFixed(0)}</span>}
                                                      </span>
                                                    </div>
                                                  </div>
                                                );
                                              })}
                                            </div>
                                          )}

                                          <button
                                            onClick={() => submitTeamResults(m.id)}
                                            disabled={submittingMatchResult[m.id] || teamRegs.length === 0}
                                            className="w-full py-2 bg-[#ff6b00] hover:bg-[#e66000] text-white font-black text-xs uppercase rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                                          >
                                            {submittingMatchResult[m.id] ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Saving…</> : "🏆 Save Results & Auto-Distribute Prize"}
                                          </button>
                                        </div>
                                      );
                                    })()}

                                    {/* ── Prize Distribution Panel ── */}
                                    {expandedPrize[m.id] && (() => {
                                      const data = prizeRegData[m.id];
                                      const placements = prizePlacements[m.id] ?? {};
                                      const kills = prizeKills[m.id] ?? {};
                                      const perKill = Number(data?.tournament?.perKillReward ?? 0);
                                      const regs = data?.registrations ?? [];
                                      const placedRegIds = new Set(Object.keys(placements).filter((k) => placements[k as any]).map(Number));
                                      const preview = prizePreviewData[m.id];
                                      return (
                                        <div className="border-t border-yellow-500/10 p-3 bg-[#0a0a0c] space-y-3.5">
                                          <div className="flex items-center justify-between">
                                            <p className="text-[10px] uppercase font-black text-yellow-500 tracking-widest">Prize Distribution</p>
                                            {m.prizeDistributed && (
                                              <span className="text-[#00ff88] text-[10px] font-black uppercase border border-[#00ff88]/30 bg-[#00ff88]/5 px-1.5 py-0.5 rounded-full">✅ Already Paid</span>
                                            )}
                                          </div>
                                          {data?.loading ? (
                                            <div className="text-center py-4 text-[#a0a0b0] text-xs animate-pulse">Loading registrations…</div>
                                          ) : regs.length === 0 ? (
                                            <div className="text-center py-4 text-[#606070] text-xs border border-dashed border-[#2a2a36] rounded-xl">No registrations found for this tournament.</div>
                                          ) : (
                                            <>
                                              {/* Section A — Rankings */}
                                              <div>
                                                <p className="text-[10px] uppercase font-black text-[#505060] tracking-widest mb-2.5">Section A — Rankings</p>
                                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                                                  {([
                                                    { rank: "1", label: "1st Place", medal: "🥇", color: "border-yellow-500/40", badge: "bg-yellow-500/10 text-yellow-400" },
                                                    { rank: "2", label: "2nd Place", medal: "🥈", color: "border-[#9ca3af]/30", badge: "bg-[#9ca3af]/10 text-[#9ca3af]" },
                                                    { rank: "3", label: "3rd Place", medal: "🥉", color: "border-orange-700/30", badge: "bg-orange-800/10 text-orange-500" },
                                                  ] as const).map(({ rank, label, medal, color, badge }) => {
                                                    const selectedRegId = Object.entries(placements).find(([, v]) => v === rank)?.[0];
                                                    return (
                                                      <div key={rank} className={`bg-[#0e0e1a] border ${color} rounded-xl p-2.5`}>
                                                        <div className={`inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full mb-1.5 ${badge}`}>
                                                          {medal} {label}
                                                        </div>
                                                        <select
                                                          value={selectedRegId ?? ""}
                                                          onChange={(e) => {
                                                            const newRegId = e.target.value;
                                                            setPrizePlacements((prev) => {
                                                              const cur = { ...(prev[m.id] ?? {}) };
                                                              Object.keys(cur).forEach((k) => { if ((cur as any)[k] === rank) delete (cur as any)[k]; });
                                                              if (newRegId) cur[parseInt(newRegId)] = rank;
                                                              return { ...prev, [m.id]: cur };
                                                            });
                                                          }}
                                                          className="w-full bg-[#06060f] border border-[#1e1e2e] text-white text-xs rounded-lg px-2.5 py-1.5 focus:outline-none appearance-none cursor-pointer"
                                                        >
                                                          <option value="">— No selection —</option>
                                                          {regs.map((reg: any) => (
                                                            <option key={reg.id} value={reg.id} disabled={placedRegIds.has(reg.id) && String(reg.id) !== selectedRegId}>
                                                              {reg.playerName}{reg.teamMembersArr?.length > 0 ? ` (+${reg.teamMembersArr.length})` : ""}
                                                            </option>
                                                          ))}
                                                        </select>
                                                      </div>
                                                    );
                                                  })}
                                                </div>
                                              </div>

                                              {/* Section B — Kill Counts (grouped by team) */}
                                              <div>
                                                <div className="flex items-center justify-between mb-2.5">
                                                  <p className="text-[10px] uppercase font-black text-[#505060] tracking-widest">Section B — Kill Counts per Member</p>
                                                  <span className="text-[10px] text-[#404050]">Prize credited to 👑 Leader</span>
                                                </div>
                                                <div className="space-y-2.5">
                                                  {regs.map((reg: any) => {
                                                    const teamPlacement = placements[reg.id];
                                                    const placementEmoji = teamPlacement === "1" ? "🥇" : teamPlacement === "2" ? "🥈" : teamPlacement === "3" ? "🥉" : null;
                                                    const allMembers = [
                                                      { name: reg.playerName, uid: reg.freefireUid, idx: 0, isLeader: true },
                                                      ...(reg.teamMembersArr ?? []).map((mem: any, mi: number) => ({
                                                        name: mem.name ?? "?",
                                                        uid: mem.uid ?? "",
                                                        idx: mi + 1,
                                                        isLeader: false,
                                                      })),
                                                    ];
                                                    const teamTotalKills = allMembers.reduce((s, mem) => s + (kills[`${reg.id}-${mem.idx}`] ?? 0), 0);
                                                    return (
                                                      <div key={reg.id} className="bg-[#0e0e1a] border border-[#1e1e2e] rounded-xl overflow-hidden">
                                                        {/* Team header */}
                                                        <div className="flex items-center justify-between px-3 py-1.5 bg-[#0a0a14] border-b border-[#1a1a26]">
                                                          <div className="flex items-center gap-1.5">
                                                            <span className="text-[#ffd700] text-xs">👑</span>
                                                            <span className="text-white text-xs font-black">{reg.playerName}</span>
                                                            {placementEmoji && <span className="text-xs">{placementEmoji}</span>}
                                                            {reg.teamMembersArr?.length > 0 && (
                                                              <span className="text-[10px] text-[#606070] bg-[#1a1a24] px-1 py-0.5 rounded-full border border-[#2a2a36]">
                                                                +{reg.teamMembersArr.length} teammate{reg.teamMembersArr.length > 1 ? "s" : ""}
                                                              </span>
                                                            )}
                                                          </div>
                                                          <div className="flex items-center gap-1 text-[10px] text-[#505060]">
                                                            <span>Team Kills:</span>
                                                            <span className={`font-black ${teamTotalKills > 0 ? "text-[#00ff88]" : "text-[#404050]"}`}>{teamTotalKills}</span>
                                                            {perKill > 0 && teamTotalKills > 0 && (
                                                              <span className="text-[#606070]">= ৳{(teamTotalKills * perKill).toFixed(0)}</span>
                                                            )}
                                                          </div>
                                                        </div>
                                                        {/* Member rows */}
                                                        <div className="divide-y divide-[#111120]">
                                                          {allMembers.map((mem) => {
                                                            const killKey = `${reg.id}-${mem.idx}`;
                                                            return (
                                                              <div key={mem.idx} className={`grid grid-cols-[1fr_auto] gap-3 items-center py-2 hover:bg-[#0c0c16] transition-colors ${mem.isLeader ? "px-3" : "px-4 bg-[#09090f]"}`}>
                                                                <div className="flex items-center gap-1.5 min-w-0">
                                                                  {mem.isLeader
                                                                    ? <span className="shrink-0 text-[10px]">👑</span>
                                                                    : <span className="shrink-0 text-[#303040] text-[10px] font-bold w-4">P{mem.idx + 1}</span>
                                                                  }
                                                                  <div className="min-w-0">
                                                                    <span className={`text-xs font-semibold truncate block ${mem.isLeader ? "text-white" : "text-[#b0b0c0]"}`}>{mem.name}</span>
                                                                    {mem.uid && <span className="text-[#404050] text-[10px] font-mono">{mem.uid}</span>}
                                                                  </div>
                                                                  {mem.isLeader && <span className="shrink-0 text-[10px] text-[#ffd700] bg-[#ffd700]/10 border border-[#ffd700]/20 px-1 py-0.5 rounded-full font-black">Wallet</span>}
                                                                </div>
                                                                <div className="w-20 shrink-0">
                                                                  <input
                                                                    type="number" min="0" placeholder="0"
                                                                    value={kills[killKey] === 0 ? "" : kills[killKey] ?? ""}
                                                                    onChange={(e) => setPrizeKills((prev) => ({ ...prev, [m.id]: { ...(prev[m.id] ?? {}), [killKey]: parseInt(e.target.value) || 0 } }))}
                                                                    className="w-full bg-[#06060f] border border-[#1e1e2e] text-white text-sm font-bold rounded-lg px-2.5 py-1 text-center focus:outline-none focus:border-yellow-500/60 transition-colors"
                                                                  />
                                                                </div>
                                                              </div>
                                                            );
                                                          })}
                                                        </div>
                                                      </div>
                                                    );
                                                  })}
                                                </div>
                                              </div>

                                              {/* Section C — Payout Preview (team-level, all prize → leader) */}
                                              {preview && (
                                                <div>
                                                  <p className="text-[10px] uppercase font-black text-[#505060] tracking-widest mb-2.5">Section C — Payout Preview</p>
                                                  <div className="bg-[#060610] border border-[#00ff88]/20 rounded-xl overflow-hidden">
                                                    <div className="px-3 py-2 border-b border-[#00ff88]/10 bg-[#00ff88]/5 flex items-center justify-between">
                                                      <span className="text-[#00ff88] text-xs font-black uppercase">Receipt — Full Prize → 👑 Leader</span>
                                                      <span className="text-[10px] text-[#00cc66]">{new Date().toLocaleString()}</span>
                                                    </div>
                                                    <div className="divide-y divide-[#0e1a14]">
                                                      {(preview.payouts ?? []).map((payout: any) => {
                                                        const rankEmoji = payout.rank === 1 ? "🥇" : payout.rank === 2 ? "🥈" : payout.rank === 3 ? "🥉" : null;
                                                        const killBreakdown = (payout.members ?? [])
                                                          .filter((mem: any) => mem.kills > 0)
                                                          .map((mem: any) => `${mem.name} ${mem.kills}K`)
                                                          .join(" + ");
                                                        return (
                                                          <div key={payout.registrationId} className="px-3 py-2.5">
                                                            {/* Team header */}
                                                            <div className="flex items-center justify-between mb-1.5">
                                                              <div className="flex items-center gap-1.5 min-w-0">
                                                                <span className="text-xs">👑</span>
                                                                <span className={`text-xs font-black truncate ${payout.leaderFound ? "text-white" : "text-[#606060]"}`}>{payout.teamName}</span>
                                                                {!payout.leaderFound && <span className="text-[10px] text-[#404048] bg-[#1a1a22] border border-[#2a2a30] px-1 py-0.5 rounded-full shrink-0">No Wallet</span>}
                                                                {rankEmoji && <span className="text-xs shrink-0">{rankEmoji}</span>}
                                                              </div>
                                                              <span className={`text-base font-black shrink-0 ml-3 ${payout.leaderFound && payout.grandTotal > 0 ? "text-[#00ff88]" : "text-[#404050]"}`}>
                                                                {payout.leaderFound ? `৳${Number(payout.grandTotal).toFixed(2)}` : "—"}
                                                              </span>
                                                            </div>
                                                            {/* Breakdown */}
                                                            <div className="space-y-1 pl-3.5">
                                                              {payout.rankPrize > 0 && (
                                                                <div className="flex items-center justify-between text-[10px]">
                                                                  <span className="text-[#505060]">{rankEmoji} Rank Prize</span>
                                                                  <span className="text-[#a0a0b0]">৳{Number(payout.rankPrize).toFixed(2)}</span>
                                                                </div>
                                                              )}
                                                              {payout.killReward > 0 && (
                                                                <div className="flex items-center justify-between text-[10px]">
                                                                  <span className="text-[#505060]">⚡ {killBreakdown || `${payout.totalKills}K`} × ৳{perKill}</span>
                                                                  <span className="text-[#a0a0b0]">৳{Number(payout.killReward).toFixed(2)}</span>
                                                                </div>
                                                              )}
                                                              {payout.rankPrize === 0 && payout.killReward === 0 && (
                                                                <div className="text-[10px] text-[#404050]">No earnings this match</div>
                                                              )}
                                                              {/* Member kill stats (display only) */}
                                                              {(payout.members ?? []).length > 1 && (
                                                                <div className="mt-1 pt-1 border-t border-[#111120]">
                                                                  {(payout.members ?? []).map((mem: any, mi: number) => (
                                                                    <div key={mi} className="flex items-center justify-between text-[10px] text-[#404050]">
                                                                      <span>{mem.isLeader ? "👑" : `P${mi + 1}`} {mem.name}</span>
                                                                      <span>{mem.kills}K</span>
                                                                    </div>
                                                                  ))}
                                                                </div>
                                                              )}
                                                            </div>
                                                          </div>
                                                        );
                                                      })}
                                                    </div>
                                                    <div className="px-3 py-2.5 border-t border-[#00ff88]/20 bg-[#00ff88]/5 flex items-center justify-between">
                                                      <span className="text-[#00aa44] text-xs font-bold uppercase">Total Payout to Leaders</span>
                                                      <span className="text-[#00ff88] font-black text-lg">৳{Number(preview.totalDistributed).toFixed(2)}</span>
                                                    </div>
                                                  </div>
                                                </div>
                                              )}

                                              {/* CTAs */}
                                              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 pt-1.5">
                                                <button
                                                  onClick={() => previewPrizes(m.id)}
                                                  className="flex-1 flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-[#0e1e1e] border border-[#00aa66]/40 text-[#00cc88] font-black text-sm uppercase rounded-xl hover:bg-[#122020] hover:border-[#00aa66]/70 transition-colors"
                                                >
                                                  🔍 Preview Prizes
                                                </button>
                                                <button
                                                  onClick={() => distributePrizes(m.id)}
                                                  disabled={distributing[m.id] || m.prizeDistributed}
                                                  className="flex-1 flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-[#ff6b00] text-white font-black text-sm uppercase rounded-xl hover:bg-[#e66000] disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-lg shadow-[#ff6b00]/20"
                                                >
                                                  {distributing[m.id] ? <><span className="animate-spin">⏳</span> Distributing…</> : m.prizeDistributed ? "✅ Already Distributed" : "🏆 Distribute Prizes"}
                                                </button>
                                              </div>
                                              {m.prizeDistributedAt && (
                                                <p className="text-center text-[#404050] text-[11px]">Paid on {new Date(m.prizeDistributedAt).toLocaleString()}</p>
                                              )}
                                            </>
                                          )}
                                        </div>
                                      );
                                    })()}
                                  </div>
                                );
                              })}

                              <button
                                onClick={() => loadTournamentMatchesById(t.id)}
                                className="flex items-center gap-1 text-xs text-[#a0a0b0] hover:text-white transition-colors"
                              >
                                <RefreshCw className="w-3 h-3" /> Refresh matches
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* ─── Prize Distribution History ─────────────────────────── */}
                  <div className="mt-5 border border-[#2a2a36] rounded-xl overflow-hidden">
                    <button
                      onClick={() => {
                        const opening = !showPrizeReport;
                        setShowPrizeReport(opening);
                        if (opening && prizeReport.length === 0) loadPrizeReport();
                      }}
                      className="w-full flex items-center justify-between px-3.5 py-3 bg-[#0e0e18] hover:bg-[#12121a] transition-colors text-left"
                    >
                      <span className="font-black uppercase text-sm text-[#a0a0b0] flex items-center gap-1.5">
                        📊 Prize Distribution History
                        {prizeReport.length > 0 && <span className="text-yellow-400 font-bold text-xs">({prizeReport.length} matches)</span>}
                      </span>
                      <span className="text-[#606070] text-xs">{showPrizeReport ? "▲ Collapse" : "▼ Expand"}</span>
                    </button>
                    {showPrizeReport && (
                      <div className="p-3 border-t border-[#2a2a36] bg-[#0a0a0f]">
                        {prizeReportLoading ? (
                          <div className="text-center py-4 text-[#a0a0b0] text-sm">Loading report…</div>
                        ) : prizeReport.length === 0 ? (
                          <div className="text-center py-4 text-[#a0a0b0] text-sm">No prizes distributed yet.</div>
                        ) : (
                          <div className="space-y-2.5">
                            {prizeReport.map((item: any) => (
                              <div key={item.matchId} className="bg-[#12121a] border border-[#2a2a36] rounded-xl overflow-hidden">
                                <button
                                  onClick={() => setExpandedReportMatch((prev) => ({ ...prev, [item.matchId]: !prev[item.matchId] }))}
                                  className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-[#1a1a24] transition-colors text-left"
                                >
                                  <div>
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className="text-white font-bold text-xs">Match #{item.matchNumber}</span>
                                      {item.serialNumber && <span className="text-[#ff6b00] text-[10px] font-mono">{item.serialNumber}</span>}
                                      <span className="text-[#a0a0b0] text-xs">— {item.tournamentName}</span>
                                      <span className="text-[10px] font-bold text-yellow-400 uppercase border border-yellow-400/20 bg-yellow-400/5 px-1 py-0.5 rounded">{item.tournamentMode}</span>
                                    </div>
                                    <div className="text-[#606070] text-xs mt-0.5">
                                      Distributed: {item.distributedAt ? new Date(item.distributedAt).toLocaleString() : "—"} · ৳{Number(item.totalAmount).toFixed(2)} total · {item.transactions?.length ?? 0} transactions
                                    </div>
                                  </div>
                                  <span className="text-[#00ff88] font-black text-sm shrink-0 ml-2.5">৳{Number(item.totalAmount).toFixed(2)}</span>
                                </button>
                                {expandedReportMatch[item.matchId] && (
                                  <div className="border-t border-[#2a2a36] p-2.5">
                                    {(item.transactions ?? []).length === 0 ? (
                                      <div className="text-xs text-[#606070] text-center py-2.5">No transactions found.</div>
                                    ) : (
                                      <div className="space-y-1">
                                        {item.transactions.map((tx: any) => (
                                          <div key={tx.id} className="flex items-center justify-between text-xs py-1 px-1.5 bg-[#0a0a0f] rounded-lg">
                                            <div>
                                              <span className="text-white font-bold">{tx.userName ?? tx.username ?? tx.userId}</span>
                                              <span className="text-[#606070] ml-1.5">{tx.notes}</span>
                                            </div>
                                            <span className="text-[#00ff88] font-bold shrink-0 ml-2.5">+৳{Number(tx.amount).toFixed(2)}</span>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            ))}
                            <div className="flex justify-end">
                              <button onClick={loadPrizeReport} className="text-xs text-[#a0a0b0] hover:text-white transition-colors">↻ Refresh</button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}


          {/* ROOM RELEASE SETTINGS */}
          {activeTab === "room-release" && (
            <div>
              <div className="mb-4">
                <h1 className="text-2xl font-black uppercase">Room Release <span className="text-[#ff6b00]">Settings</span></h1>
                <p className="text-[#a0a0b0] text-sm mt-1">Set room credentials and release timing for each tournament match.</p>
              </div>

              {tournamentsLoading ? (
                <div className="space-y-3">
                  {[1,2,3].map((i) => <div key={i} className="h-20 bg-[#12121a] rounded-xl border border-[#ff6b00]/10 animate-pulse" />)}
                </div>
              ) : tournaments.length === 0 ? (
                <div className="bg-[#12121a] rounded-xl border border-[#ff6b00]/10 p-7 text-center text-[#a0a0b0] text-sm">
                  <div className="text-4xl mb-2.5">🔑</div>
                  <div className="font-black text-white mb-1">No Tournaments Yet</div>
                  <div>Create a tournament first, then add matches to set room credentials.</div>
                </div>
              ) : (
                <div className="space-y-4">
                  {tournaments.map((t: any) => {
                    const matches = tournamentMatchesList[t.id] ?? [];
                    return (
                      <div key={t.id} className="bg-[#12121a] rounded-2xl border border-[#ff6b00]/10 overflow-hidden">
                        <button
                          onClick={() => {
                            const open = !expandedTournamentMatches[t.id];
                            setExpandedTournamentMatches((prev) => ({ ...prev, [t.id]: open }));
                            if (open && !tournamentMatchesList[t.id]) loadTournamentMatchesById(t.id);
                          }}
                          className="w-full flex items-center justify-between px-4 py-3 hover:bg-[#ff6b00]/5 transition-colors text-left"
                        >
                          <div className="flex items-center gap-2.5">
                            <Trophy className="w-5 h-5 text-[#ff6b00]" />
                            <div>
                              <div className="font-black text-white">{t.name}</div>
                              <div className="text-xs text-[#a0a0b0]">{matches.length} match{matches.length !== 1 ? "es" : ""} · {t.status}</div>
                            </div>
                          </div>
                          <span className="text-[#606070] text-xs">{expandedTournamentMatches[t.id] ? "▲ Collapse" : "▼ Expand"}</span>
                        </button>

                        {expandedTournamentMatches[t.id] && (
                          <div className="border-t border-[#ff6b00]/10 divide-y divide-[#1a1a24]">
                            {tournamentMatchesLoading[t.id] ? (
                              <div className="p-4 text-center text-[#a0a0b0] text-sm">Loading matches…</div>
                            ) : matches.length === 0 ? (
                              <div className="p-5 text-center text-[#a0a0b0] text-sm">
                                No matches yet — add matches in <span className="text-[#ff6b00] font-bold">Create &amp; Manage Tournaments</span>.
                              </div>
                            ) : matches.map((m: any) => {
                              // Every badge below reflects an EXPLICIT admin-controlled flag only —
                              // never a time-based guess.
                              const statusBadge = m.status === "completed"
                                ? <span className="text-[#a0a0b0] text-[10px] font-black border border-[#2a2a36] bg-[#0d0d16] px-1.5 py-0.5 rounded-full">✅ Completed</span>
                                : m.matchLive
                                ? <span className="text-[#00ff88] text-[10px] font-black border border-[#00ff88]/30 bg-[#00ff88]/5 px-1.5 py-0.5 rounded-full">🔴 LIVE</span>
                                : m.roomReleased && !m.roomHidden
                                ? <span className="text-orange-400 text-[10px] font-black border border-orange-400/20 bg-orange-400/5 px-1.5 py-0.5 rounded-full">🔑 Room Released</span>
                                : m.roomHidden
                                ? <span className="text-[#ff2244] text-[10px] font-black border border-[#ff2244]/20 bg-[#ff2244]/5 px-1.5 py-0.5 rounded-full">🔒 Room Hidden</span>
                                : (m.roomSet || m.roomId)
                                ? <span className="text-yellow-400 text-[10px] font-black border border-yellow-400/20 bg-yellow-400/5 px-1.5 py-0.5 rounded-full">⏳ Room Set (Not Released)</span>
                                : <span className="text-[#505060] text-[10px] font-black border border-[#2a2a36] bg-[#0d0d16] px-1.5 py-0.5 rounded-full">No Room Set</span>;
                              const busy = !!settingTournamentMatchRoom[m.id];
                              return (
                                <div key={m.id} className="flex items-center gap-2.5 px-3.5 py-2.5 flex-wrap">
                                  <div className="w-7 h-7 bg-[#ff6b00]/10 border border-[#ff6b00]/20 rounded-lg flex items-center justify-center shrink-0">
                                    <span className="text-[#ff6b00] font-black text-[10px]">#{m.matchNumber}</span>
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="text-white font-bold text-sm truncate">
                                      Match #{m.matchNumber}{m.mapName ? ` — ${m.mapName}` : ""}
                                    </div>
                                    {m.scheduledAt && (
                                      <div className="text-[#a0a0b0] text-xs">{new Date(m.scheduledAt).toLocaleString()}</div>
                                    )}
                                  </div>
                                  {statusBadge}
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <button
                                      onClick={() => {
                                        if (!tournamentMatchRoomForms[m.id]) {
                                          setTournamentMatchRoomForms((prev) => ({
                                            ...prev,
                                            [m.id]: { releaseMode: "before5", hideMinutesAfter: "5", roomId: m.roomId ?? "", roomPassword: m.roomPassword ?? "", customMins: "" },
                                          }));
                                        }
                                        setManageRoomModal({ tournamentId: t.id, matchId: m.id });
                                      }}
                                      className="flex items-center gap-1 px-2.5 py-1 bg-[#ff6b00]/10 border border-[#ff6b00]/30 text-[#ff6b00] font-black text-xs uppercase rounded-lg hover:bg-[#ff6b00]/20 transition-colors shrink-0"
                                    >
                                      <Settings className="w-3 h-3" /> ⚙️ Room
                                    </button>
                                    {!!m.roomId && !m.roomReleased && m.status !== "completed" && (
                                      <button
                                        disabled={busy}
                                        onClick={() => releaseMatchRoom(t.id, m.id)}
                                        className="flex items-center gap-1 px-2.5 py-1 bg-orange-500/10 border border-orange-500/30 text-orange-400 font-black text-xs uppercase rounded-lg hover:bg-orange-500/20 transition-colors shrink-0 disabled:opacity-50"
                                      >
                                        🔑 Release
                                      </button>
                                    )}
                                    {m.roomReleased && !m.roomHidden && m.status !== "completed" && (
                                      <button
                                        disabled={busy}
                                        onClick={() => hideMatchRoom(t.id, m.id)}
                                        className="flex items-center gap-1 px-2.5 py-1 bg-[#1a1a24] border border-[#2a2a36] text-[#a0a0b0] font-black text-xs uppercase rounded-lg hover:text-white transition-colors shrink-0 disabled:opacity-50"
                                      >
                                        🔒 Hide
                                      </button>
                                    )}
                                    {!m.matchLive && m.status !== "completed" && (
                                      <button
                                        disabled={busy}
                                        onClick={() => startMatchNow(t.id, m.id)}
                                        className="flex items-center gap-1 px-2.5 py-1 bg-[#00ff88]/10 border border-[#00ff88]/30 text-[#00ff88] font-black text-xs uppercase rounded-lg hover:bg-[#00ff88]/20 transition-colors shrink-0 disabled:opacity-50"
                                      >
                                        ▶️ Start
                                      </button>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── Manage Room Modal ── */}
          {manageRoomModal && (() => {
            const { tournamentId, matchId } = manageRoomModal;
            const allMatches = Object.values(tournamentMatchesList).flat() as any[];
            const match = allMatches.find((m: any) => m.id === matchId);
            const form = tournamentMatchRoomForms[matchId] ?? { releaseMode: "before5" as const, hideMinutesAfter: "5", roomId: match?.roomId ?? "", roomPassword: match?.roomPassword ?? "", customMins: "" };
            const updateForm = (patch: Partial<typeof form>) =>
              setTournamentMatchRoomForms((prev) => ({ ...prev, [matchId]: { ...form, ...patch } }));
            return (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-3">
                <div className="bg-[#12121a] border border-[#ff6b00]/20 rounded-2xl shadow-2xl w-full max-w-md flex flex-col">
                  {/* Header */}
                  <div className="flex items-center justify-between px-3.5 py-3 border-b border-[#ff6b00]/10">
                    <div>
                      <h2 className="font-black text-white text-sm uppercase flex items-center gap-1.5">
                        <Key className="w-4 h-4 text-[#ff6b00]" /> Manage Room Credentials
                      </h2>
                      {match && (
                        <p className="text-[#606070] text-xs mt-0.5">
                          Match #{match.matchNumber}{match.mapName ? ` — ${match.mapName}` : ""}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => setManageRoomModal(null)}
                      className="w-7 h-7 flex items-center justify-center rounded-lg bg-[#1a1a24] text-[#a0a0b0] hover:text-white hover:bg-[#2a2a34] transition-colors text-sm"
                    >
                      ✕
                    </button>
                  </div>

                  {/* Body */}
                  <div className="p-3.5 space-y-3">
                    {/* Room ID & Password */}
                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="text-[#606070] text-[10px] uppercase font-bold block mb-1">Room ID *</label>
                        <input
                          placeholder="Enter Room ID"
                          value={form.roomId}
                          onChange={(e) => updateForm({ roomId: e.target.value })}
                          className="admin-input w-full"
                        />
                      </div>
                      <div>
                        <label className="text-[#606070] text-[10px] uppercase font-bold block mb-1">Password</label>
                        <input
                          placeholder="Enter Password"
                          value={form.roomPassword}
                          onChange={(e) => updateForm({ roomPassword: e.target.value })}
                          className="admin-input w-full"
                        />
                      </div>
                    </div>

                    {/* Release timing is ONLY a countdown target for players to see. It is
                        never automatic — the admin must still click "Release Room" below
                        (on the match row) once ready. That click is also the only action
                        that reveals credentials and closes registration. */}
                    <div>
                      <label className="text-[#606070] text-[10px] uppercase font-bold block mb-1">Room Release Time</label>
                      <div className="flex gap-1.5 flex-wrap">
                        {(["before5", "before10", "custom"] as const).map((mode) => (
                          <button
                            key={mode}
                            onClick={() => updateForm({ releaseMode: mode })}
                            className={`py-1.5 px-2.5 text-xs font-black uppercase rounded-xl border transition-colors ${
                              form.releaseMode === mode
                                ? "bg-[#ff6b00] border-[#ff6b00] text-white"
                                : "bg-[#0d0d16] border-[#2a2a36] text-[#a0a0b0] hover:border-[#ff6b00]/40"
                            }`}
                          >
                            {mode === "before5" ? "5 Minutes Before Match" : mode === "before10" ? "10 Minutes Before Match" : "✏️ Custom Release Time"}
                          </button>
                        ))}
                      </div>
                      {form.releaseMode === "custom" && (
                        <div className="mt-1.5 flex items-center gap-1.5">
                          <input
                            type="number"
                            min="1"
                            max="1440"
                            placeholder="e.g. 15"
                            value={form.customMins ?? ""}
                            onChange={(e) => updateForm({ customMins: e.target.value })}
                            className="admin-input w-28"
                          />
                          <span className="text-[#a0a0b0] text-xs">mins before match start</span>
                        </div>
                      )}
                      <p className="text-[#606070] text-[11px] mt-1.5 leading-relaxed">
                        This only sets the "Room Releases In" countdown players see. Credentials stay hidden — and registration stays open — until you click <span className="text-orange-400 font-bold">🔑 Release</span> on the match row.
                      </p>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="flex gap-2.5 px-3.5 pb-3.5">
                    <button
                      onClick={() => setManageRoomModal(null)}
                      className="flex-1 py-2 bg-[#1a1a24] text-[#a0a0b0] font-bold text-xs uppercase rounded-xl hover:text-white transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={async () => {
                        await setTournamentMatchRoomCredentials(tournamentId, matchId);
                        setManageRoomModal(null);
                      }}
                      disabled={settingTournamentMatchRoom[matchId]}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-[#ff6b00] text-white font-black text-xs uppercase rounded-xl hover:bg-[#e66000] transition-colors disabled:opacity-50"
                    >
                      {settingTournamentMatchRoom[matchId]
                        ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Saving…</>
                        : "🔑 Save & Close"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* REGISTRATIONS */}
          {activeTab === "registrations" && (() => {
            const filteredRegs = regStatusFilter === "all" ? registrations : registrations.filter((r: any) => r.status === regStatusFilter);
            const grouped: Record<number, any[]> = {};
            for (const r of filteredRegs) {
              if (!grouped[r.tournamentId]) grouped[r.tournamentId] = [];
              grouped[r.tournamentId].push(r);
            }
            const tournamentIds = Object.keys(grouped).map(Number).sort((a, b) => a - b);
            const modeLabel: Record<string, string> = { solo: "Solo", duo: "Duo", squad: "Squad (4v4)" };
            const gameModeLabel: Record<string, string> = { BR: "Battle Royale", CS: "Clash Squad", SOLO: "Solo", LONE_WOLF: "Lone Wolf", FREE: "Free Match" };
            return (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h1 className="text-2xl font-black uppercase">Tournament <span className="text-[#ff6b00]">Registrations</span></h1>
                  <button onClick={loadRegistrations} className="flex items-center gap-1.5 text-sm text-[#a0a0b0] hover:text-white transition-colors">
                    <RefreshCw className="w-4 h-4" /> Refresh
                  </button>
                </div>
                <div className="flex gap-1.5 mb-3.5 flex-wrap">
                  {(["all", "pending", "approved", "rejected"] as const).map((s) => {
                    const count = s === "all" ? registrations.length : registrations.filter((r: any) => r.status === s).length;
                    const colors: Record<string, string> = { all: "text-[#ff6b00] border-[#ff6b00]/30 bg-[#ff6b00]/5", pending: "text-yellow-400 border-yellow-400/30", approved: "text-[#00ff88] border-[#00ff88]/30", rejected: "text-[#ff2244] border-[#ff2244]/30" };
                    return (
                      <button key={s} onClick={() => setRegStatusFilter(s)} className={`px-2.5 py-1 rounded-lg border text-xs font-bold uppercase transition-colors ${colors[s]} ${regStatusFilter === s ? "opacity-100" : "opacity-50 hover:opacity-75"}`}>
                        {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)} ({count})
                      </button>
                    );
                  })}
                </div>
                {filteredRegs.length === 0 ? (
                  <div className="bg-[#12121a] rounded-xl border border-[#ff6b00]/10 p-8 text-center text-[#a0a0b0]">
                    <CheckCircle className="w-12 h-12 mx-auto mb-2.5 opacity-20" />
                    <p>No registrations yet.</p>
                  </div>
                ) : (
                  <div className="space-y-3.5">
                    {tournamentIds.map((tid) => {
                      const rows = grouped[tid];
                      const sample = rows[0];
                      const tName = sample.tournamentName ?? `Tournament #${tid}`;
                      const tMode = modeLabel[sample.tournamentMode] ?? sample.tournamentMode ?? "—";
                      const tGM = gameModeLabel[sample.tournamentGameMode] ?? sample.tournamentGameMode ?? "";
                      const pendingCount = rows.filter((r: any) => r.status === "pending").length;
                      return (
                        <div key={tid} className="bg-[#0e0e18] rounded-xl border border-[#ff6b00]/15 overflow-hidden">
                          <div className="flex items-center justify-between px-3 py-2.5 bg-[#ff6b00]/5 border-b border-[#ff6b00]/10">
                            <div>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-black text-white text-sm">Tournament #{tid}</span>
                                <span className="text-[10px] font-bold text-[#ff6b00] bg-[#ff6b00]/10 border border-[#ff6b00]/20 px-1 py-0.5 rounded uppercase">{tGM || tMode}</span>
                                <span className="text-[10px] text-[#606070] font-mono uppercase">{tMode}</span>
                              </div>
                              <div className="text-[#a0a0b0] text-xs mt-0.5 truncate max-w-[260px]">{tName}</div>
                            </div>
                            <div className="flex items-center gap-1.5">
                              {pendingCount > 0 && <span className="text-[10px] font-bold text-yellow-400 bg-yellow-400/10 border border-yellow-400/20 px-1 py-0.5 rounded">{pendingCount} pending</span>}
                              <span className="text-[10px] text-[#606070] font-bold">{rows.length} team{rows.length !== 1 ? "s" : ""}</span>
                            </div>
                          </div>
                          <div className="divide-y divide-[#1a1a24]">
                            {rows.map((r: any) => {
                              const isExpanded = !!expandedReg[r.id];
                              let extraMembers: Array<{ uid: string; name: string }> = [];
                              try { extraMembers = r.teamMembers ? JSON.parse(r.teamMembers) : []; } catch {}
                              const allMembers = [{ uid: r.freefireUid, name: r.playerName, username: r.username ?? r.displayName ?? null, isLeader: true }, ...extraMembers.map((m) => ({ uid: m.uid, name: m.name, username: null, isLeader: false }))];
                              return (
                                <div key={r.id} className="px-3 py-2.5">
                                  <div className="flex items-center justify-between gap-1.5 cursor-pointer" onClick={() => setExpandedReg((prev) => ({ ...prev, [r.id]: !prev[r.id] }))}>
                                    <div className="flex items-center gap-2.5 min-w-0">
                                      <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${r.status === "approved" ? "bg-[#00ff88]" : r.status === "rejected" ? "bg-[#ff2244]" : "bg-yellow-400"}`} />
                                      <div className="min-w-0">
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                          <span className="font-bold text-white text-sm truncate">{r.playerName}</span>
                                          {r.username && <span className="text-[#606070] text-xs">@{r.username}</span>}
                                          {extraMembers.length > 0 && <span className="text-[10px] text-[#a0a0b0] bg-[#1a1a28] border border-[#2a2a36] px-1 py-0.5 rounded">+{extraMembers.length} member{extraMembers.length !== 1 ? "s" : ""}</span>}
                                          {r.matchNumber != null && <span className="text-[10px] font-bold text-[#00ff88] bg-[#00ff88]/10 border border-[#00ff88]/20 px-1 py-0.5 rounded">Match #{r.matchNumber}</span>}
                                        </div>
                                        <div className="text-[#606070] text-[10px] font-mono">{r.freefireUid}</div>
                                        <div className="text-[#4a4a5a] text-[10px]">{new Date(r.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: true })}</div>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-1.5 shrink-0">
                                      <span className={statusBadge(r.status)}>{r.status}</span>
                                      {r.status === "pending" && (
                                        <>
                                          <button onClick={(e) => { e.stopPropagation(); approveReg(r.id); }} className="p-1 bg-[#00ff88]/10 border border-[#00ff88]/30 rounded-lg text-[#00ff88] hover:bg-[#00ff88]/20 transition-colors" title="Approve">
                                            <CheckCircle className="w-3.5 h-3.5" />
                                          </button>
                                          <button onClick={(e) => { e.stopPropagation(); rejectReg(r.id); }} className="p-1 bg-[#ff2244]/10 border border-[#ff2244]/30 rounded-lg text-[#ff2244] hover:bg-[#ff2244]/20 transition-colors" title="Reject">
                                            <XCircle className="w-3.5 h-3.5" />
                                          </button>
                                        </>
                                      )}
                                      <button onClick={(e) => { e.stopPropagation(); deleteReg(r.id); }} className="p-1 bg-[#ff2244]/5 border border-[#ff2244]/20 rounded-lg text-[#ff2244]/60 hover:bg-[#ff2244]/15 hover:text-[#ff2244] transition-colors" title="Delete registration">
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                      <span className="text-[#4a4a5a] text-xs">{isExpanded ? "▲" : "▼"}</span>
                                    </div>
                                  </div>
                                  {isExpanded && (
                                    <div className="mt-2.5 ml-3 pl-2.5 border-l-2 border-[#ff6b00]/20 space-y-1.5">
                                      {allMembers.map((mem, idx) => (
                                        <div key={idx} className="flex items-start gap-2.5 bg-[#0a0a12] rounded-lg px-2.5 py-1.5">
                                          <div className="w-6 h-6 rounded-full bg-[#ff6b00]/10 border border-[#ff6b00]/20 flex items-center justify-center text-[10px] font-black text-[#ff6b00] shrink-0">{idx + 1}</div>
                                          <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-1 flex-wrap">
                                              <span className="text-white font-bold text-xs">{mem.name}</span>
                                              {mem.isLeader && <span className="text-[9px] font-bold text-[#ffd700] bg-[#ffd700]/10 border border-[#ffd700]/20 px-1 rounded">Leader</span>}
                                              {mem.username && <span className="text-[#606070] text-[10px]">@{mem.username}</span>}
                                            </div>
                                            <div className="text-[#a0a0b0] text-[10px] font-mono mt-0.5">UID: {mem.uid}</div>
                                          </div>
                                        </div>
                                      ))}
                                      {r.paymentScreenshot && (
                                        <a href={r.paymentScreenshot} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[#ff6b00] text-xs hover:underline">
                                          📸 View Payment Screenshot
                                        </a>
                                      )}
                                      <div className="flex items-center gap-1.5 pt-1" onClick={(e) => e.stopPropagation()}>
                                        <span className="text-[#606070] text-[10px] uppercase font-bold">Assign Match #</span>
                                        <input
                                          type="number"
                                          min="1"
                                          placeholder={r.matchNumber != null ? String(r.matchNumber) : "—"}
                                          value={matchNumberInputs[r.id] ?? ""}
                                          onChange={(e) => setMatchNumberInputs((prev) => ({ ...prev, [r.id]: e.target.value }))}
                                          className="w-16 px-1.5 py-1 bg-[#0e0e18] border border-[#2a2a36] rounded text-white text-xs font-mono text-center focus:border-[#ff6b00]/50 outline-none"
                                        />
                                        <button
                                          onClick={() => setRegMatchNumber(r.id)}
                                          disabled={settingMatchNumber[r.id]}
                                          className="px-1.5 py-1 bg-[#ff6b00]/10 border border-[#ff6b00]/30 rounded text-[#ff6b00] text-[10px] font-bold uppercase hover:bg-[#ff6b00]/20 transition-colors disabled:opacity-50"
                                        >
                                          {settingMatchNumber[r.id] ? "…" : "Set"}
                                        </button>
                                        {r.matchNumber != null && (
                                          <button
                                            onClick={() => { setMatchNumberInputs((prev) => ({ ...prev, [r.id]: "" })); setRegMatchNumber(r.id); }}
                                            disabled={settingMatchNumber[r.id]}
                                            className="px-1.5 py-1 bg-[#1a1a24] border border-[#2a2a36] rounded text-[#606070] text-[10px] font-bold uppercase hover:text-[#a0a0b0] transition-colors disabled:opacity-50"
                                          >
                                            Clear
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })()}

          {/* USERS */}
          {activeTab === "users" && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h1 className="text-2xl font-black uppercase">User <span className="text-[#ff6b00]">Management</span></h1>
                <button onClick={loadUsers} className="flex items-center gap-1.5 text-sm text-[#a0a0b0] hover:text-white transition-colors">
                  <RefreshCw className="w-4 h-4" /> Refresh
                </button>
              </div>

              {/* Search bar */}
              <div className="relative mb-3.5">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#4a4a5a]" />
                <input
                  value={userSearchQuery}
                  onChange={(e) => {
                    const q = e.target.value;
                    setUserSearchQuery(q);
                    clearTimeout(userSearchTimeout.current);
                    if (q.trim().length >= 2) {
                      userSearchTimeout.current = setTimeout(() => searchUsers(q.trim()), 400);
                    } else if (q.trim().length === 0) {
                      loadUsers();
                    }
                  }}
                  placeholder="Search by username, email, or user ID…"
                  className="w-full bg-[#0d0d16] border border-[#1e1e2e] rounded-xl pl-7 pr-3 py-2 text-white text-sm placeholder-[#3a3a46] focus:outline-none focus:border-[#ff6b00]/40 transition-colors"
                />
                {userSearchLoading && (
                  <RefreshCw className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#a0a0b0] animate-spin" />
                )}
              </div>
              <p className="text-[#4a4a5a] text-xs mb-3">Click any user row to see detailed profile — wallet balance, match history, and more.</p>

              <div className="space-y-1.5">
                {users.length === 0 ? (
                  <div className="bg-[#12121a] rounded-xl border border-[#ff6b00]/10 p-8 text-center text-[#a0a0b0]">
                    <Users className="w-12 h-12 mx-auto mb-2.5 opacity-20" />
                    <p>{userSearchQuery ? "No users found matching your search." : "No users registered yet."}</p>
                  </div>
                ) : users.map((u: any) => (
                  <div
                    key={u.clerkId ?? u.id}
                    onClick={() => { setSelectedUser(null); loadUserDetails(u.clerkId); }}
                    className="bg-[#12121a] hover:bg-[#14141e] rounded-xl border border-[#1e1e2e] hover:border-[#ff6b00]/20 p-3 flex flex-col sm:flex-row sm:items-center gap-2.5 cursor-pointer transition-all group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-[#ff6b00]/10 border border-[#ff6b00]/20 flex items-center justify-center shrink-0 text-[#ff6b00] font-black text-sm">
                      {(u.displayName ?? u.username ?? "?")[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-white">{u.displayName ?? u.username ?? "Unknown"}</span>
                        {u.username && u.displayName && <span className="text-[#a0a0b0] text-xs">@{u.username}</span>}
                        {u.isAdmin && <span className="text-[10px] font-bold text-[#ff6b00] bg-[#ff6b00]/10 border border-[#ff6b00]/30 px-1 py-0.5 rounded">Admin</span>}
                        {u.isBanned && <span className="text-[10px] font-bold text-[#ff2244] bg-[#ff2244]/10 border border-[#ff2244]/30 px-1 py-0.5 rounded">Banned</span>}
                      </div>
                      <div className="text-[#a0a0b0] text-xs mt-0.5">{u.email ?? "No email"} · Joined {new Date(u.createdAt).toLocaleDateString()}</div>
                    </div>
                    <div className="flex gap-1.5 items-center shrink-0">
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleBan(u.clerkId, u.isBanned); }}
                        className={`px-2.5 py-1 font-bold text-xs uppercase rounded-lg transition-colors border ${
                          u.isBanned
                            ? "bg-[#00ff88]/10 border-[#00ff88]/30 text-[#00ff88] hover:bg-[#00ff88]/20"
                            : "bg-[#ff2244]/10 border-[#ff2244]/30 text-[#ff2244] hover:bg-[#ff2244]/20"
                        }`}
                      >
                        {u.isBanned ? "Unban" : "Ban"}
                      </button>
                      <ChevronRight className="w-4 h-4 text-[#3a3a46] group-hover:text-[#ff6b00] transition-colors" />
                    </div>
                  </div>
                ))}
              </div>
              {users.length >= 50 && (
                <p className="text-center text-[#4a4a5a] text-xs mt-3">Showing first 50 users. Use the search bar to find specific users.</p>
              )}
            </div>
          )}

          {/* ANNOUNCEMENTS */}
          {activeTab === "announcements" && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h1 className="text-2xl font-black uppercase">Manage <span className="text-[#ff6b00]">Announcements</span></h1>
                <button
                  onClick={() => { setEditingAnn(null); setAnnForm(emptyAnnForm); setShowAnnForm((v) => !v); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#ff6b00] text-white font-bold text-sm uppercase rounded-xl hover:bg-[#e66000] transition-colors"
                >
                  <Plus className="w-4 h-4" /> New Announcement
                </button>
              </div>

              {showAnnForm && (
                <div className="bg-[#12121a] border border-[#ff6b00]/20 rounded-xl p-4 mb-4">
                  <h2 className="font-black uppercase text-[#ff6b00] mb-3">{editingAnn ? "Edit Announcement" : "Post Announcement"}</h2>
                  <form onSubmit={saveAnnouncement} className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
                      <div className="flex gap-4 items-center pt-3.5">
                        <label className="flex items-center gap-1.5 cursor-pointer select-none">
                          <input type="checkbox" checked={annForm.isPinned} onChange={(e) => setAnnForm({ ...annForm, isPinned: e.target.checked })}
                            className="w-4 h-4 accent-[#ff6b00]" />
                          <span className="text-sm font-bold text-white">📌 Pin to top</span>
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer select-none">
                          <input type="checkbox" checked={annForm.isActive} onChange={(e) => setAnnForm({ ...annForm, isActive: e.target.checked })}
                            className="w-4 h-4 accent-[#00ff88]" />
                          <span className="text-sm font-bold text-white">✅ Active</span>
                        </label>
                      </div>
                    </div>
                    <div className="flex gap-2.5 pt-1.5">
                      <button type="submit" className="px-4 py-2 bg-[#ff6b00] text-white font-bold text-sm uppercase rounded-xl hover:bg-[#e66000] transition-colors">
                        {editingAnn ? "Update Announcement" : "Post Announcement"}
                      </button>
                      <button type="button" onClick={() => { setShowAnnForm(false); setEditingAnn(null); setAnnForm(emptyAnnForm); }}
                        className="px-4 py-2 bg-[#1a1a24] text-[#a0a0b0] font-bold text-sm uppercase rounded-xl hover:text-white transition-colors">Cancel</button>
                    </div>
                  </form>
                </div>
              )}

              <div className="space-y-2.5">
                {announcements.length === 0 ? (
                  <div className="bg-[#12121a] rounded-xl border border-[#ff6b00]/10 p-8 text-center text-[#a0a0b0]">
                    <Bell className="w-12 h-12 mx-auto mb-2.5 opacity-20" />
                    <p>No announcements yet. Click "New Announcement" to create one.</p>
                  </div>
                ) : announcements.map((a: any) => (
                  <div key={a.id} className={`bg-[#12121a] rounded-xl border p-3 ${a.isPinned ? "border-[#ffd700]/30" : a.isActive ? "border-[#ff6b00]/10" : "border-[#2a2a36] opacity-60"}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5 mb-1">
                          {a.isPinned && <span className="text-[#ffd700] text-xs">📌</span>}
                          <span className="font-bold text-white truncate">{a.title}</span>
                          <span className={`text-xs px-1.5 py-0.5 rounded border font-bold uppercase shrink-0 ${
                            a.type === "urgent" ? "text-[#ff2244] border-[#ff2244]/30 bg-[#ff2244]/10" :
                            a.type === "warning" ? "text-yellow-400 border-yellow-400/30 bg-yellow-400/10" :
                            a.type === "success" ? "text-[#00ff88] border-[#00ff88]/30 bg-[#00ff88]/10" :
                            "text-blue-400 border-blue-400/30 bg-blue-400/10"
                          }`}>{a.type}</span>
                          <span className={`text-xs px-1.5 py-0.5 rounded border font-bold uppercase shrink-0 ${
                            a.displayMode === "popup" ? "text-purple-400 border-purple-400/30 bg-purple-400/10" : "text-[#a0a0b0] border-[#2a2a36] bg-[#1a1a24]"
                          }`}>{a.displayMode ?? "banner"}</span>
                          {!a.isActive && <span className="text-xs px-1.5 py-0.5 rounded border font-bold uppercase text-[#a0a0b0] border-[#2a2a36] bg-[#1a1a24]">Inactive</span>}
                        </div>
                        <p className="text-[#a0a0b0] text-sm line-clamp-2">{a.content}</p>
                        <div className="flex flex-wrap gap-2.5 mt-1 text-xs text-[#a0a0b0]">
                          <span>{new Date(a.createdAt).toLocaleString()}</span>
                          {a.expiresAt && <span>Expires: {new Date(a.expiresAt).toLocaleString()}</span>}
                        </div>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <button onClick={() => pinAnnouncement(a.id)} title={a.isPinned ? "Unpin" : "Pin"} className={`p-1.5 rounded-lg border transition-colors ${a.isPinned ? "bg-[#ffd700]/20 border-[#ffd700]/30 text-[#ffd700]" : "bg-[#1a1a24] border-[#2a2a36] text-[#a0a0b0] hover:text-[#ffd700]"}`}>
                          📌
                        </button>
                        <button onClick={() => editAnnouncement(a)} title="Edit" className="p-1.5 bg-[#1a1a24] border border-[#2a2a36] rounded-lg text-[#a0a0b0] hover:text-[#ff6b00] hover:border-[#ff6b00]/30 transition-colors">
                          <Edit className="w-4 h-4" />
                        </button>
                        <button onClick={() => deleteAnnouncement(a.id)} title="Delete" className="p-1.5 bg-[#ff2244]/10 border border-[#ff2244]/20 rounded-lg text-[#ff2244] hover:bg-[#ff2244]/20 transition-colors">
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
              <div className="flex items-center justify-between mb-4">
                <h1 className="text-2xl font-black uppercase">Deposit <span className="text-[#ff6b00]">Requests</span></h1>
                <button onClick={loadWallet} className="flex items-center gap-1.5 text-sm text-[#a0a0b0] hover:text-white transition-colors">
                  <RefreshCw className="w-4 h-4" /> Refresh
                </button>
              </div>
              <div className="space-y-2.5">
                {deposits.length === 0 ? (
                  <div className="bg-[#12121a] rounded-xl border border-[#ff6b00]/10 p-8 text-center text-[#a0a0b0]">
                    <ArrowDownCircle className="w-12 h-12 mx-auto mb-2.5 opacity-20" />
                    <p>No deposit requests yet.</p>
                  </div>
                ) : deposits.map((tx: any) => (
                  <div key={tx.id} className="bg-[#12121a] rounded-xl border border-[#ff6b00]/10 p-3 flex flex-col sm:flex-row sm:items-center gap-2.5">
                    <div className="flex-1">
                      <div className="font-bold text-white">৳{Number(tx.amount).toLocaleString()} via {(tx.method || 'BKASH').toUpperCase()}</div>
                      <div className="text-[#a0a0b0] text-sm">Account: <span className="font-mono">{tx.accountNumber}</span></div>
                      {tx.transactionId && <div className="text-[#a0a0b0] text-xs font-mono">TX: {tx.transactionId}</div>}
                      <div className="text-[#a0a0b0] text-xs">{new Date(tx.createdAt).toLocaleString()}</div>
                      {tx.screenshot && <a href={tx.screenshot} target="_blank" rel="noopener noreferrer" className="text-[#ff6b00] text-xs hover:underline">View Screenshot</a>}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className={statusBadge(tx.status)}>{tx.status}</span>
                      {tx.status === "pending" && (
                        <>
                          <button onClick={() => approveWallet(tx.id)} className="p-1 bg-[#00ff88]/10 border border-[#00ff88]/30 rounded-lg text-[#00ff88] hover:bg-[#00ff88]/20"><CheckCircle className="w-4 h-4" /></button>
                          <button onClick={() => rejectWallet(tx.id)} className="p-1 bg-[#ff2244]/10 border border-[#ff2244]/30 rounded-lg text-[#ff2244] hover:bg-[#ff2244]/20"><XCircle className="w-4 h-4" /></button>
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
              <div className="flex items-center justify-between mb-4">
                <h1 className="text-2xl font-black uppercase">Withdrawal <span className="text-[#ff6b00]">Requests</span></h1>
                <button onClick={loadWallet} className="flex items-center gap-1.5 text-sm text-[#a0a0b0] hover:text-white transition-colors">
                  <RefreshCw className="w-4 h-4" /> Refresh
                </button>
              </div>
              <div className="space-y-2.5">
                {withdrawals.length === 0 ? (
                  <div className="bg-[#12121a] rounded-xl border border-[#ff6b00]/10 p-8 text-center text-[#a0a0b0]">
                    <ArrowUpCircle className="w-12 h-12 mx-auto mb-2.5 opacity-20" />
                    <p>No withdrawal requests yet.</p>
                  </div>
                ) : withdrawals.map((tx: any) => (
                  <div key={tx.id} className="bg-[#12121a] rounded-xl border border-[#ff6b00]/10 p-3 flex flex-col sm:flex-row sm:items-center gap-2.5">
                    <div className="flex-1">
                      <div className="font-bold text-white">৳{Number(tx.amount).toLocaleString()} via {(tx.method || 'BKASH').toUpperCase()}</div>
                      <div className="text-[#a0a0b0] text-sm">To: <span className="font-mono">{tx.accountNumber}</span></div>
                      <div className="text-[#a0a0b0] text-xs">{new Date(tx.createdAt).toLocaleString()}</div>
                      {tx.adminNote && <div className="text-[#ff2244] text-xs mt-1">Note: {tx.adminNote}</div>}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className={statusBadge(tx.status)}>{tx.status}</span>
                      {tx.status === "pending" && (
                        <>
                          <button onClick={() => approveWallet(tx.id)} className="p-1 bg-[#00ff88]/10 border border-[#00ff88]/30 rounded-lg text-[#00ff88] hover:bg-[#00ff88]/20"><CheckCircle className="w-4 h-4" /></button>
                          <button onClick={() => rejectWallet(tx.id)} className="p-1 bg-[#ff2244]/10 border border-[#ff2244]/30 rounded-lg text-[#ff2244] hover:bg-[#ff2244]/20"><XCircle className="w-4 h-4" /></button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* MATCH RULES CONFIG */}
          {activeTab === "rules" && (
            <div>
              <div className="mb-4">
                <h1 className="text-2xl font-black uppercase">Category <span className="text-[#ff6b00]">Rules</span></h1>
                <p className="text-[#a0a0b0] text-sm mt-1">Set one global rule block per game category. All players in that category will see these rules.</p>
              </div>
              <CategoryRulesTab apiFetch={apiFetch} toast={toast} />
            </div>
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

          {/* USER MATCHES */}
          {activeTab === "user-matches" && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h1 className="text-2xl font-black uppercase">Community <span className="text-[#ff6b00]">Matches</span></h1>
                  <p className="text-[#a0a0b0] text-sm mt-1">Create matches directly or review user-submitted matches</p>
                </div>
                <div className="flex items-center gap-2.5">
                  <button
                    onClick={() => setShowAdminMatchForm((v) => !v)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#ff6b00] text-white font-bold text-sm uppercase rounded-xl hover:bg-[#e66000] transition-colors"
                  >
                    <Plus className="w-4 h-4" /> Create Match
                  </button>
                  <button onClick={() => { loadUserMatches(); loadCommunityRules(); }} className="flex items-center gap-1.5 text-sm text-[#a0a0b0] hover:text-white transition-colors">
                    <RefreshCw className="w-4 h-4" /> Refresh
                  </button>
                </div>
              </div>

              {/* Admin: Create Community Match Form */}
              {showAdminMatchForm && (
                <div className="bg-[#0d0d16] border border-[#ff6b00]/30 rounded-2xl p-4 mb-4">
                  <div className="flex items-center gap-1.5 mb-3.5">
                    <div className="w-8 h-8 bg-[#ff6b00]/15 rounded-xl flex items-center justify-center">
                      <Plus className="w-4 h-4 text-[#ff6b00]" />
                    </div>
                    <div>
                      <h2 className="font-black text-white text-sm uppercase">Create Community Match</h2>
                      <p className="text-[#606070] text-xs">Match goes live immediately in the selected category view</p>
                    </div>
                  </div>
                  <form onSubmit={createAdminMatch} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {/* Match Category */}
                    <div className="sm:col-span-2 lg:col-span-1">
                      <label className="label-sm">MATCH CATEGORY <span className="text-[#ff2244]">*</span></label>
                      <select
                        value={adminMatchForm.matchType}
                        onChange={(e) => setAdminMatchForm({ ...adminMatchForm, matchType: e.target.value })}
                        required
                        className="admin-input"
                      >
                        <option value="">— Select Category —</option>
                        <option value="BR">BR MATCH (Battle Royale · 48 slots)</option>
                        <option value="CS">CLASH SQUAD (CS Mode · 8 slots)</option>
                        <option value="LONE_WOLF">LONE WOLF (1v1 Elimination · 12 slots)</option>
                        <option value="FREE">FREE MATCH (Giveaway · 20 slots)</option>
                        <option value="SOLO">SOLO SURVIVAL (Solo · 12 slots)</option>
                      </select>
                    </div>
                    {/* Match Name */}
                    <div>
                      <label className="label-sm">Match Name</label>
                      <input
                        value={adminMatchForm.matchName}
                        onChange={(e) => setAdminMatchForm({ ...adminMatchForm, matchName: e.target.value })}
                        placeholder="e.g. Weekend BR Cup"
                        className="admin-input"
                      />
                    </div>
                    {/* Scheduled At */}
                    <div>
                      <label className="label-sm">Scheduled At</label>
                      <input
                        type="datetime-local"
                        value={adminMatchForm.scheduledAt}
                        onChange={(e) => setAdminMatchForm({ ...adminMatchForm, scheduledAt: e.target.value })}
                        className="admin-input"
                      />
                    </div>
                    {/* Prize Pool */}
                    <div>
                      <label className="label-sm">Prize Pool (৳)</label>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={adminMatchForm.prizePool}
                        onChange={(e) => setAdminMatchForm({ ...adminMatchForm, prizePool: e.target.value })}
                        placeholder="0"
                        className="admin-input"
                      />
                    </div>
                    {/* Entry Fee */}
                    <div>
                      <label className="label-sm">Entry Fee (৳)</label>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={adminMatchForm.entryFee}
                        onChange={(e) => setAdminMatchForm({ ...adminMatchForm, entryFee: e.target.value })}
                        placeholder="0"
                        className="admin-input"
                      />
                    </div>
                    {/* Per Kill */}
                    <div>
                      <label className="label-sm">Per Kill (৳)</label>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={adminMatchForm.perKill}
                        onChange={(e) => setAdminMatchForm({ ...adminMatchForm, perKill: e.target.value })}
                        placeholder="0"
                        className="admin-input"
                      />
                    </div>
                    {/* Map Name */}
                    <div>
                      <label className="label-sm">Map Name</label>
                      <input
                        value={adminMatchForm.mapName}
                        onChange={(e) => setAdminMatchForm({ ...adminMatchForm, mapName: e.target.value })}
                        placeholder="Bermuda, Purgatory…"
                        className="admin-input"
                      />
                    </div>
                    {/* Description */}
                    <div className="sm:col-span-2">
                      <label className="label-sm">Description</label>
                      <input
                        value={adminMatchForm.description}
                        onChange={(e) => setAdminMatchForm({ ...adminMatchForm, description: e.target.value })}
                        placeholder="Optional match description shown to players"
                        className="admin-input"
                      />
                    </div>
                    {/* Room Release Time */}
                    <div>
                      <label className="label-sm">Room Opens At <span className="font-normal normal-case text-[#a0a0b0]">(room visible from)</span></label>
                      <input
                        type="datetime-local"
                        value={adminMatchForm.roomReleaseTime}
                        onChange={(e) => setAdminMatchForm({ ...adminMatchForm, roomReleaseTime: e.target.value })}
                        className="admin-input"
                      />
                    </div>
                    {/* Room Hide Time */}
                    <div>
                      <label className="label-sm">Room Closes At <span className="font-normal normal-case text-[#a0a0b0]">(auto-expire)</span></label>
                      <input
                        type="datetime-local"
                        value={adminMatchForm.roomHideTime}
                        onChange={(e) => setAdminMatchForm({ ...adminMatchForm, roomHideTime: e.target.value })}
                        className="admin-input"
                      />
                    </div>
                    {/* Actions */}
                    <div className="sm:col-span-2 lg:col-span-3 flex gap-2.5 pt-1">
                      <button
                        type="submit"
                        disabled={adminMatchCreating || !adminMatchForm.matchType}
                        className="px-4 py-2 bg-[#ff6b00] text-white font-black text-sm uppercase rounded-xl hover:bg-[#e66000] disabled:opacity-50 transition-colors"
                      >
                        {adminMatchCreating ? "Creating…" : "Create & Publish Match"}
                      </button>
                      <button
                        type="button"
                        onClick={() => { setShowAdminMatchForm(false); setAdminMatchForm({ matchType: "", matchName: "", prizePool: "", entryFee: "", perKill: "", mapName: "", scheduledAt: "", description: "", roomReleaseTime: "", roomHideTime: "" }); }}
                        className="px-4 py-2 bg-[#1a1a24] text-[#a0a0b0] font-bold text-sm uppercase rounded-xl hover:text-white transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Community Match Rules — compact trigger */}
              <div className="flex items-center justify-between bg-[#0d0d16] border border-[#ff6b00]/20 rounded-2xl px-3 py-2.5 mb-4">
                <div className="flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4 text-[#ff6b00]" />
                  <span className="text-white text-sm font-bold">Community Match Rules</span>
                </div>
                <button
                  onClick={() => { loadCommunityRules(); setShowCommunityRulesModal(true); }}
                  className="flex items-center gap-1 px-2.5 py-1 bg-[#ff6b00]/10 border border-[#ff6b00]/30 text-[#ff6b00] text-xs font-black uppercase rounded-lg hover:bg-[#ff6b00]/20 transition-colors"
                >
                  📝 Edit Rules
                </button>
              </div>

              {/* Community Rules Modal */}
              {showCommunityRulesModal && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 bg-black/70 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) setShowCommunityRulesModal(false); }}>
                  <div className="w-full max-w-lg bg-[#0e0e17] border border-[#ff6b00]/25 rounded-2xl shadow-[0_0_40px_rgba(255,107,0,0.15)] overflow-hidden">
                    <div className="flex items-center justify-between px-3.5 py-3 border-b border-[#1a1a28]">
                      <div className="flex items-center gap-1.5">
                        <BookOpen className="w-4 h-4 text-[#ff6b00]" />
                        <h2 className="font-black text-white text-sm uppercase">Community Match Rules</h2>
                      </div>
                      <button onClick={() => setShowCommunityRulesModal(false)} className="w-7 h-7 flex items-center justify-center rounded-lg bg-[#1a1a24] text-[#a0a0b0] hover:text-white transition-colors">✕</button>
                    </div>
                    <div className="p-3.5">
                      <p className="text-[#606070] text-xs mb-2.5">Shown to users before creating a match. One rule per line.</p>
                      {communityRulesLoading ? (
                        <div className="space-y-1.5 mb-3">{[1,2,3].map(i => <div key={i} className="h-4 bg-[#1a1a24] rounded animate-pulse" />)}</div>
                      ) : (
                        <textarea
                          value={communityRules}
                          onChange={(e) => setCommunityRules(e.target.value)}
                          rows={8}
                          placeholder={"1. Be respectful to all players.\n2. No cheating or hacking.\n3. Room ID shared before match starts."}
                          className="w-full bg-[#0a0a0f] border border-[#2a2a36] rounded-xl px-3 py-2.5 text-white text-sm placeholder-[#4a4a5a] focus:outline-none focus:border-[#ff6b00] transition-colors resize-none font-mono mb-3"
                        />
                      )}
                      <div className="flex gap-1.5 justify-end">
                        <button onClick={() => setShowCommunityRulesModal(false)} className="px-3 py-1.5 bg-[#1a1a24] text-[#a0a0b0] font-bold text-sm rounded-xl hover:text-white transition-colors">Cancel</button>
                        <button
                          onClick={async () => { await saveCommunityRules(); setShowCommunityRulesModal(false); }}
                          disabled={communityRulesSaving || communityRulesLoading || !communityRules.trim()}
                          className="px-3.5 py-1.5 bg-[#ff6b00] text-white font-black uppercase rounded-xl text-sm hover:bg-[#e66000] disabled:opacity-50 transition-all"
                        >
                          {communityRulesSaving ? "Saving…" : "Save Rules"}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Category (match type) filter tabs */}
              <div className="flex gap-1.5 mb-2.5 flex-wrap">
                {[
                  { key: "all", label: "All Types", icon: "⚡" },
                  { key: "BR", label: "BR Match", icon: "🔥" },
                  { key: "CS", label: "Clash Squad", icon: "⚔️" },
                  { key: "SOLO", label: "Solo", icon: "🎯" },
                  { key: "LONE_WOLF", label: "Lone Wolf", icon: "🐺" },
                  { key: "FREE", label: "Free Match", icon: "🎁" },
                ].map(({ key, label, icon }) => {
                  const count = key === "all" ? userMatches.length : userMatches.filter((m) => (m?.matchType ?? "").toUpperCase() === key).length;
                  const isActive = umTypeFilter === key;
                  return (
                    <button
                      key={key}
                      onClick={() => setUmTypeFilter(key)}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border text-xs font-bold uppercase transition-colors ${isActive ? "border-[#ff6b00]/60 text-[#ff6b00] bg-[#ff6b00]/10" : "border-[#2a2a36] text-[#a0a0b0] hover:border-[#3a3a46] hover:text-white"}`}
                    >
                      <span>{icon}</span> {label} <span className="text-[10px] opacity-70">({count})</span>
                    </button>
                  );
                })}
              </div>

              {/* Status filter tabs */}
              <div className="flex gap-1.5 mb-3.5 flex-wrap">
                {["all", "pending_approval", "approved", "waiting", "active", "ended", "cancelled", "archived"].map((s) => {
                  const typeFiltered = umTypeFilter === "all" ? userMatches : userMatches.filter((m) => (m?.matchType ?? "").toUpperCase() === umTypeFilter);
                  const count = s === "all" ? typeFiltered.length : typeFiltered.filter((m) => m.status === s).length;
                  const labels: Record<string, string> = { all: "All", pending_approval: "Pending", approved: "Approved", waiting: "Waiting", active: "Active", ended: "Ended", cancelled: "Cancelled", archived: "📦 Archive" };
                  const colors: Record<string, string> = {
                    all: "border-[#ff6b00]/30 text-[#ff6b00] bg-[#ff6b00]/5",
                    pending_approval: "border-yellow-400/30 text-yellow-400",
                    approved: "border-[#00b4ff]/30 text-[#00b4ff]",
                    waiting: "border-[#00ff88]/30 text-[#00ff88]",
                    active: "border-[#00ff88]/50 text-[#00ff88] bg-[#00ff88]/5",
                    ended: "border-[#a0a0b0]/30 text-[#a0a0b0]",
                    cancelled: "border-[#ff2244]/30 text-[#ff2244]",
                    archived: "border-[#606070]/30 text-[#606070]",
                  };
                  if (count === 0 && s !== "all" && s !== "pending_approval" && s !== "archived") return null;
                  return (
                    <button
                      key={s}
                      onClick={() => setUmStatusFilter(s)}
                      className={`px-2.5 py-1 rounded-lg border text-xs font-bold uppercase transition-colors ${colors[s] ?? "border-[#2a2a36] text-[#a0a0b0]"} ${umStatusFilter === s ? "opacity-100" : "opacity-50 hover:opacity-75"}`}
                    >
                      {labels[s]} ({count})
                    </button>
                  );
                })}
              </div>

              {userMatchesLoading ? (
                <div className="space-y-2.5">{[1,2,3].map(i => <div key={i} className="h-28 bg-[#12121a] rounded-xl animate-pulse" />)}</div>
              ) : userMatches.filter((m) => (umTypeFilter === "all" || (m?.matchType ?? "").toUpperCase() === umTypeFilter) && (umStatusFilter === "all" || m.status === umStatusFilter)).length === 0 ? (
                <div className="text-center py-16 text-[#a0a0b0]">
                  <Swords className="w-12 h-12 mx-auto mb-2.5 opacity-20" />
                  <p className="font-bold">No matches in this category</p>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[720px] overflow-y-auto pr-1">
                  {userMatches.filter((m) => (umTypeFilter === "all" || (m?.matchType ?? "").toUpperCase() === umTypeFilter) && (umStatusFilter === "all" || m.status === umStatusFilter)).map((m: any) => (
                    <div key={m.id} className="bg-[#12121a] rounded-xl border border-[#ff6b00]/10 p-3">
                      <div className="flex flex-col gap-2.5">
                        {/* Top row: info + delete button */}
                        <div className="flex items-start justify-between gap-1.5">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap mb-1">
                              <span className="font-black text-white text-base">{m.matchType} Match</span>
                              <span className={statusBadge(m.status === "pending_approval" ? "pending" : m.status)}>{m.status === "pending_approval" ? "Pending" : m.status}</span>
                              {m.isPrivate && <span className="text-[10px] font-bold text-[#a0a0b0] bg-[#1a1a28] border border-[#2a2a36] px-1 py-0.5 rounded">Private</span>}
                            </div>
                            <div className="text-[#a0a0b0] text-xs space-y-0.5">
                              <div className="flex items-center gap-1"><UserCheck className="w-3 h-3 text-[#ff6b00]" /> Host: <span className="text-white font-bold">{m.creatorName ?? "Unknown"}</span>{m.creatorPhone && <span className="text-[#606070] ml-1">{m.creatorPhone}</span>}</div>
                              <div>Prize Pool: <span className="text-[#ffd700] font-bold">৳{Number(m.prizePool).toLocaleString()}</span> · Slots: <span className="text-white font-bold">{m.filledSlots}/{m.maxSlots}</span></div>
                              {m.status !== "pending_approval" && (
                                <div>Entry Fee: <span className="text-[#00ff88] font-bold">৳{Number(m.entryFee).toLocaleString()}</span></div>
                              )}
                              {m.scheduledAt && <div>Scheduled: <span className="text-white">{new Date(m.scheduledAt).toLocaleString()}</span></div>}
                              {m.description && <div className="text-[#a0a0b0] mt-1 italic">"{m.description}"</div>}
                              {m.adminNote && <div className="text-[#ff2244] mt-1">Note: {m.adminNote}</div>}
                            </div>
                          </div>
                          <div className="flex flex-col gap-1.5 shrink-0">
                            <button
                              onClick={() => { setMatchPlayersData(null); loadMatchPlayers(m.id); }}
                              className="flex items-center gap-1 px-2.5 py-1 bg-[#00b4ff]/10 border border-[#00b4ff]/30 text-[#00b4ff] text-xs font-bold rounded-lg hover:bg-[#00b4ff]/20 transition-colors whitespace-nowrap"
                            >
                              <Users className="w-3.5 h-3.5" /> Players ({m.filledSlots ?? 0})
                            </button>
                            {m.status !== "archived" && (
                              <button
                                onClick={async () => {
                                  if (!confirm("Archive this match? It will be hidden from active listings but all data is preserved. Players with paid entry fees will be refunded.")) return;
                                  const res = await apiFetch(`/admin/user-matches/${m.id}/archive`, { method: "PATCH" });
                                  if (res.ok) { toast({ title: "📦 Match archived", description: "Moved to archive. Data is preserved." }); loadUserMatches(); }
                                  else { const d = await safeJson(res); toast({ title: "Error", description: d.error, variant: "destructive" }); }
                                }}
                                className="flex items-center gap-1 px-2.5 py-1 bg-[#606070]/10 border border-[#606070]/30 text-[#a0a0b0] text-xs font-bold rounded-lg hover:bg-[#606070]/20 transition-colors whitespace-nowrap"
                              >
                                Archive
                              </button>
                            )}
                            <button
                              onClick={() => { setDeletingMatch(m.id); setRejectingMatch(null); }}
                              className="flex items-center gap-1 px-2.5 py-1 bg-[#ff2244]/10 border border-[#ff2244]/30 text-[#ff2244] text-xs font-bold rounded-lg hover:bg-[#ff2244]/20 transition-colors whitespace-nowrap"
                            >
                              <Trash2 className="w-3.5 h-3.5" /> Delete
                            </button>
                          </div>
                        </div>

                        {/* Approval controls — full width on all screens */}
                        {m.status === "pending_approval" && (
                          <div className="flex flex-col sm:flex-row gap-1.5 pt-1.5 border-t border-[#2a2a36]">
                            <div className="flex-1">
                              <label className="text-[#a0a0b0] text-xs font-bold uppercase block mb-1">Entry Fee (৳) <span className="text-[#ff2244]">*</span></label>
                              <input
                                type="number"
                                min="1"
                                step="1"
                                placeholder="e.g. 100"
                                value={matchEntryFees[m.id] ?? ""}
                                onChange={(e) => setMatchEntryFees((prev) => ({ ...prev, [m.id]: e.target.value }))}
                                className="w-full bg-[#0a0a0f] border border-[#2a2a36] rounded-lg px-2.5 py-1.5 text-white text-sm placeholder-[#4a4a5a] focus:outline-none focus:border-[#ff6b00]"
                              />
                            </div>
                            <div className="flex gap-1.5 sm:items-end">
                              <button
                                onClick={async () => {
                                  const fee = parseFloat(matchEntryFees[m.id] ?? "");
                                  if (!fee || fee <= 0) {
                                    toast({ title: "Entry Fee required", description: "Please set an Entry Fee before approving this match.", variant: "destructive" });
                                    return;
                                  }
                                  const res = await apiFetch(`/admin/user-matches/${m.id}/approve`, {
                                    method: "PATCH",
                                    body: JSON.stringify({ entryFee: fee }),
                                  });
                                  if (res.ok) {
                                    toast({ title: "Match approved!", description: `Entry Fee set to ৳${fee.toLocaleString()}` });
                                    setMatchEntryFees((prev) => { const n = { ...prev }; delete n[m.id]; return n; });
                                    loadUserMatches();
                                  } else {
                                    const d = await safeJson(res);
                                    toast({ title: "Error", description: d.error, variant: "destructive" });
                                  }
                                }}
                                className="flex-1 sm:flex-none flex items-center justify-center gap-1 px-3 py-1.5 bg-[#00ff88]/10 border border-[#00ff88]/30 text-[#00ff88] text-xs font-bold rounded-lg hover:bg-[#00ff88]/20 transition-colors whitespace-nowrap"
                              >
                                <CheckCircle className="w-3.5 h-3.5" /> Approve
                              </button>
                              <button
                                onClick={() => { setRejectingMatch(m.id); setRejectNote(""); setDeletingMatch(null); }}
                                className="flex-1 sm:flex-none flex items-center justify-center gap-1 px-3 py-1.5 bg-[#ff2244]/10 border border-[#ff2244]/30 text-[#ff2244] text-xs font-bold rounded-lg hover:bg-[#ff2244]/20 transition-colors whitespace-nowrap"
                              >
                                <XCircle className="w-3.5 h-3.5" /> Reject
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Room Credentials — shown for all approved/active matches */}
                      {m.status !== "pending_approval" && m.status !== "rejected" && (
                        <div className="mt-2.5 pt-2.5 border-t border-[#ff6b00]/10">
                          {/* Section header */}
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-1.5">
                              <Key className="w-3.5 h-3.5 text-[#ff6b00]" />
                              <span className="text-[#a0a0b0] text-xs font-black uppercase">Room Password Release</span>
                            </div>
                            {m.adminRoomId ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#00ff88] bg-[#00ff88]/10 border border-[#00ff88]/30 px-1.5 py-0.5 rounded-full">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#00ff88] animate-pulse" />
                                RELEASED
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold text-[#ff6b00]/70 bg-[#ff6b00]/8 border border-[#ff6b00]/20 px-1.5 py-0.5 rounded-full uppercase">Pending</span>
                            )}
                          </div>

                          {/* Currently set credentials */}
                          {m.adminRoomId && (
                            <div className="bg-[#0a0a0f] border border-[#00ff88]/15 rounded-lg px-2.5 py-1.5 mb-2 flex flex-wrap gap-2.5 text-xs">
                              <span className="text-[#606070]">Room ID: <span className="text-[#00ff88] font-mono font-bold">{m.adminRoomId}</span></span>
                              {m.adminRoomPassword && (
                                <span className="text-[#606070]">Password: <span className="text-yellow-400 font-mono font-bold">{m.adminRoomPassword}</span></span>
                              )}
                            </div>
                          )}

                          {/* Release mode toggle */}
                          <div className="flex items-center gap-1.5 mb-1.5">
                            <span className="text-[#606070] text-[10px] uppercase font-bold tracking-wider shrink-0">Release:</span>
                            <button
                              type="button"
                              onClick={() => setReleaseMode((prev) => ({ ...prev, [m.id]: "now" }))}
                              className={`text-[10px] px-2 py-0.5 rounded-full border font-bold transition-colors ${(releaseMode[m.id] ?? "now") === "now" ? "bg-[#ff6b00]/20 border-[#ff6b00]/50 text-[#ff6b00]" : "bg-transparent border-[#2a2a36] text-[#606070] hover:text-[#a0a0b0]"}`}
                            >
                              Manually (now)
                            </button>
                            <button
                              type="button"
                              onClick={() => setReleaseMode((prev) => ({ ...prev, [m.id]: "scheduled" }))}
                              className={`text-[10px] px-2 py-0.5 rounded-full border font-bold transition-colors ${releaseMode[m.id] === "scheduled" ? "bg-[#ff6b00]/20 border-[#ff6b00]/50 text-[#ff6b00]" : "bg-transparent border-[#2a2a36] text-[#606070] hover:text-[#a0a0b0]"}`}
                            >
                              10 min before
                            </button>
                          </div>
                          {releaseMode[m.id] === "scheduled" && (
                            <div className="text-[10px] text-[#ff6b00]/70 mb-1.5 pl-1">
                              {m.scheduledAt
                                ? `Players see credentials at: ${new Date(new Date(m.scheduledAt).getTime() - 10 * 60 * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} on ${new Date(m.scheduledAt).toLocaleDateString()}`
                                : "No scheduled time set — credentials reveal immediately upon release."}
                            </div>
                          )}

                          {/* Input fields + Release button */}
                          <div className="flex flex-col gap-2.5 w-full">
                            <div className="flex flex-col gap-2.5 md:flex-row">
                              <input
                                type="text"
                                placeholder="Room ID *"
                                value={roomCredentials[m.id]?.roomId ?? ""}
                                onChange={(e) => setRoomCredentials((prev) => ({ ...prev, [m.id]: { ...prev[m.id], roomId: e.target.value, password: prev[m.id]?.password ?? "", roomReleaseTime: prev[m.id]?.roomReleaseTime ?? "", roomHideTime: prev[m.id]?.roomHideTime ?? "" } }))}
                                className="w-full md:flex-1 bg-[#0a0a0f] border border-[#2a2a36] rounded-lg px-2.5 py-1.5 text-white text-xs font-mono placeholder-[#4a4a5a] focus:outline-none focus:border-[#ff6b00]"
                              />
                              <input
                                type="text"
                                placeholder="Room Password"
                                value={roomCredentials[m.id]?.password ?? ""}
                                onChange={(e) => setRoomCredentials((prev) => ({ ...prev, [m.id]: { ...prev[m.id], roomId: prev[m.id]?.roomId ?? "", password: e.target.value, roomReleaseTime: prev[m.id]?.roomReleaseTime ?? "", roomHideTime: prev[m.id]?.roomHideTime ?? "" } }))}
                                className="w-full md:flex-1 bg-[#0a0a0f] border border-[#2a2a36] rounded-lg px-2.5 py-1.5 text-white text-xs font-mono placeholder-[#4a4a5a] focus:outline-none focus:border-[#ff6b00]"
                              />
                            </div>
                            <div className="flex flex-col gap-1.5 sm:flex-row">
                              <div className="flex-1">
                                <div className="flex items-center justify-between mb-1">
                                  <label className="text-[#606070] text-[10px] uppercase font-bold">Room Opens At <span className="normal-case font-normal">(15 min before start)</span></label>
                                  {m.scheduledAt && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        // Convert to datetime-local format using browser LOCAL time so display matches what admin expects
                                        const pad = (n: number) => String(n).padStart(2, "0");
                                        const toLocalDT = (epochMs: number) => {
                                          const d = new Date(epochMs);
                                          return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
                                        };
                                        const baseMs = parseBDDate(m.scheduledAt).getTime();
                                        const rel = toLocalDT(baseMs - 15 * 60 * 1000);
                                        const hid = toLocalDT(baseMs + 5 * 60 * 1000);
                                        setRoomCredentials((prev) => ({ ...prev, [m.id]: { ...prev[m.id], roomId: prev[m.id]?.roomId ?? "", password: prev[m.id]?.password ?? "", roomReleaseTime: rel, roomHideTime: hid } }));
                                      }}
                                      className="text-[9px] font-bold text-[#00b4ff] hover:text-[#33c9ff] uppercase transition-colors"
                                    >
                                      ⚡ Auto-fill from schedule
                                    </button>
                                  )}
                                </div>
                                <input
                                  type="datetime-local"
                                  value={roomCredentials[m.id]?.roomReleaseTime ?? (m.roomReleaseTime ? new Date(m.roomReleaseTime).toISOString().slice(0, 16) : "")}
                                  onChange={(e) => setRoomCredentials((prev) => ({ ...prev, [m.id]: { ...prev[m.id], roomId: prev[m.id]?.roomId ?? "", password: prev[m.id]?.password ?? "", roomReleaseTime: e.target.value, roomHideTime: prev[m.id]?.roomHideTime ?? "" } }))}
                                  className="w-full bg-[#0a0a0f] border border-[#2a2a36] rounded-lg px-2.5 py-1.5 text-white text-xs focus:outline-none focus:border-[#00cc66]"
                                />
                              </div>
                              <div className="flex-1">
                                <label className="text-[#606070] text-[10px] uppercase font-bold block mb-1">Room Closes At <span className="normal-case font-normal">(5 min after start)</span></label>
                                <input
                                  type="datetime-local"
                                  value={roomCredentials[m.id]?.roomHideTime ?? (m.roomHideTime ? new Date(m.roomHideTime).toISOString().slice(0, 16) : "")}
                                  onChange={(e) => setRoomCredentials((prev) => ({ ...prev, [m.id]: { ...prev[m.id], roomId: prev[m.id]?.roomId ?? "", password: prev[m.id]?.password ?? "", roomReleaseTime: prev[m.id]?.roomReleaseTime ?? "", roomHideTime: e.target.value } }))}
                                  className="w-full bg-[#0a0a0f] border border-[#2a2a36] rounded-lg px-2.5 py-1.5 text-white text-xs focus:outline-none focus:border-[#ff2244]"
                                />
                              </div>
                            </div>
                            {(m.roomReleaseTime || m.roomHideTime) && (
                              <div className="text-[10px] text-[#606070] space-y-0.5 px-1">
                                {m.roomReleaseTime && <div>🟢 Visible from: <span className="text-[#00ff88]">{new Date(m.roomReleaseTime).toLocaleString()}</span></div>}
                                {m.roomHideTime && <div>🔴 Auto-expires: <span className="text-[#ff2244]">{new Date(m.roomHideTime).toLocaleString()}</span></div>}
                              </div>
                            )}
                            <button
                              disabled={submittingCredentials === m.id || !roomCredentials[m.id]?.roomId?.trim()}
                              onClick={async () => {
                                const creds = roomCredentials[m.id];
                                if (!creds?.roomId?.trim()) return;
                                setSubmittingCredentials(m.id);
                                try {
                                  // Compute release time: manual input → UTC ISO; toggle → compute from scheduledAt
                                  let roomReleaseTimeISO: string | undefined;
                                  if (creds.roomReleaseTime) {
                                    // datetime-local string: browser interprets as local time → convert to UTC ISO
                                    roomReleaseTimeISO = new Date(creds.roomReleaseTime).toISOString();
                                  } else if (releaseMode[m.id] === "scheduled" && m.scheduledAt) {
                                    // "10 min before" toggle with no manual time: use scheduledAt - 10 min (BD-aware)
                                    roomReleaseTimeISO = new Date(parseBDDate(m.scheduledAt).getTime() - 10 * 60 * 1000).toISOString();
                                  }
                                  let roomHideTimeISO: string | undefined;
                                  if (creds.roomHideTime) {
                                    roomHideTimeISO = new Date(creds.roomHideTime).toISOString();
                                  }
                                  const res = await apiFetch(`/admin/user-matches/${m.id}/room-credentials`, {
                                    method: "PATCH",
                                    body: JSON.stringify({
                                      adminRoomId: creds.roomId.trim(),
                                      adminRoomPassword: creds.password?.trim() || undefined,
                                      roomReleaseTime: roomReleaseTimeISO,
                                      roomHideTime: roomHideTimeISO,
                                    }),
                                  });
                                  if (res.ok) {
                                    toast({ title: "🔓 Room Credentials Set!", description: "Room ID saved. Players see it based on the release schedule." });
                                    setRoomCredentials((prev) => { const n = { ...prev }; delete n[m.id]; return n; });
                                    loadUserMatches();
                                  } else {
                                    const d = await safeJson(res);
                                    toast({ title: "Error", description: d.error, variant: "destructive" });
                                  }
                                } catch { toast({ title: "Connection error", variant: "destructive" }); }
                                finally { setSubmittingCredentials(null); }
                              }}
                              className="w-full md:w-auto self-start px-3 py-1.5 bg-[#00cc66] hover:bg-[#00aa55] text-white text-xs font-black rounded-lg disabled:opacity-50 transition-colors whitespace-nowrap flex items-center justify-center gap-1"
                            >
                              <Key className="w-3 h-3" />
                              {submittingCredentials === m.id ? "Saving..." : "Save Credentials & Timing"}
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Reject note form */}
                      {rejectingMatch === m.id && (
                        <div className="mt-2.5 pt-2.5 border-t border-[#ff2244]/10">
                          <input
                            type="text"
                            value={rejectNote}
                            onChange={(e) => setRejectNote(e.target.value)}
                            placeholder="Optional rejection reason..."
                            className="w-full bg-[#0a0a0f] border border-[#2a2a36] rounded-lg px-2.5 py-1.5 text-white text-sm placeholder-[#4a4a5a] focus:outline-none focus:border-[#ff2244] mb-1.5"
                          />
                          <div className="flex gap-1.5">
                            <button
                              onClick={async () => {
                                const res = await apiFetch(`/admin/user-matches/${m.id}/reject`, {
                                  method: "PATCH",
                                  body: JSON.stringify({ adminNote: rejectNote }),
                                });
                                if (res.ok) { toast({ title: "Match rejected" }); setRejectingMatch(null); loadUserMatches(); }
                                else { const d = await safeJson(res); toast({ title: "Error", description: d.error, variant: "destructive" }); }
                              }}
                              className="px-2.5 py-1 bg-[#ff2244]/10 border border-[#ff2244]/30 text-[#ff2244] text-xs font-bold rounded-lg hover:bg-[#ff2244]/20 transition-colors"
                            >
                              Confirm Reject
                            </button>
                            <button onClick={() => setRejectingMatch(null)} className="px-2.5 py-1 text-[#a0a0b0] text-xs font-bold rounded-lg hover:text-white transition-colors">Cancel</button>
                          </div>
                        </div>
                      )}

                      {/* Delete confirmation */}
                      {deletingMatch === m.id && (
                        <div className="mt-2.5 pt-2.5 border-t border-[#ff2244]/20">
                          <p className="text-sm font-bold text-[#ff2244] mb-1.5">⚠ Permanently delete this match and all join records? Players who paid will be refunded automatically.</p>
                          <div className="flex gap-1.5">
                            <button
                              onClick={async () => {
                                const res = await apiFetch(`/admin/user-matches/${m.id}`, { method: "DELETE" });
                                if (res.ok) { toast({ title: "Match deleted" }); setDeletingMatch(null); loadUserMatches(); }
                                else { const d = await safeJson(res); toast({ title: "Error", description: d.error, variant: "destructive" }); }
                              }}
                              className="px-2.5 py-1 bg-[#ff2244] text-white text-xs font-bold rounded-lg hover:bg-[#dd1133] transition-colors"
                            >
                              Confirm Delete
                            </button>
                            <button onClick={() => setDeletingMatch(null)} className="px-2.5 py-1 text-[#a0a0b0] text-xs font-bold rounded-lg hover:text-white transition-colors">Cancel</button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "maintenance" && (
            <div className="max-w-xl">
              <div className="mb-4">
                <h1 className="text-2xl font-black uppercase">
                  Maintenance <span className="text-[#ff6b00]">Mode</span>
                </h1>
                <p className="text-[#a0a0b0] text-sm mt-1">
                  Control site-wide availability. When enabled, only admins can access the platform.
                </p>
              </div>

              {/* Status card */}
              <div className={`rounded-2xl border p-4 mb-4 transition-all ${maintenanceMode ? "bg-[#ff2244]/8 border-[#ff2244]/30" : "bg-[#00ff88]/5 border-[#00ff88]/20"}`}>
                <div className="flex items-center gap-3 mb-3.5">
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
                  <div className={`ml-auto px-2.5 py-1 rounded-full text-xs font-black uppercase ${maintenanceMode ? "bg-[#ff2244]/20 text-[#ff2244]" : "bg-[#00ff88]/15 text-[#00ff88]"}`}>
                    {maintenanceMode ? "ON" : "OFF"}
                  </div>
                </div>

                {/* Toggle */}
                <div className="flex gap-2.5">
                  <button
                    onClick={() => toggleMaintenance(true)}
                    disabled={maintenanceLoading || maintenanceMode}
                    className="flex-1 py-2.5 rounded-xl font-black uppercase text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-[#ff2244] text-white hover:bg-[#e61f3c] shadow-[0_0_20px_rgba(255,34,68,0.3)]"
                  >
                    {maintenanceLoading && maintenanceMode === false ? "Enabling…" : "Enable Maintenance"}
                  </button>
                  <button
                    onClick={() => toggleMaintenance(false)}
                    disabled={maintenanceLoading || !maintenanceMode}
                    className="flex-1 py-2.5 rounded-xl font-black uppercase text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-[#00ff88] text-[#0a0a0f] hover:bg-[#00e07a]"
                  >
                    {maintenanceLoading && maintenanceMode === true ? "Disabling…" : "Disable Maintenance"}
                  </button>
                </div>
              </div>

              {/* What happens card */}
              <div className="bg-[#12121a] rounded-xl border border-[#2a2a36] p-3.5">
                <div className="text-xs font-black uppercase text-[#ff6b00] tracking-wider mb-3">What happens when maintenance is ON</div>
                <ul className="space-y-2.5">
                  {[
                    { icon: "🚫", text: "Regular users are redirected to the maintenance page" },
                    { icon: "✅", text: "Admins can still access all admin panel features" },
                    { icon: "🔐", text: "Admin login page remains accessible" },
                    { icon: "⚡", text: "Changes take effect within 10 seconds (cached)" },
                    { icon: "💾", text: "Status is persisted in the database — survives restarts" },
                  ].map((item) => (
                    <li key={item.text} className="flex items-start gap-2.5 text-sm text-[#a0a0b0]">
                      <span className="text-base leading-none mt-0.5">{item.icon}</span>
                      {item.text}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* REPORTS */}
          {activeTab === "reports" && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h1 className="text-2xl font-black uppercase">Report <span className="text-[#ff6b00]">Management</span></h1>
                <button onClick={() => loadReports(reportsFilter)} className="flex items-center gap-1.5 text-sm text-[#a0a0b0] hover:text-white transition-colors">
                  <RefreshCw className="w-4 h-4" /> Refresh
                </button>
              </div>

              {/* Filter tabs */}
              <div className="flex gap-1.5 mb-3.5 flex-wrap">
                {["all", "pending", "resolved", "dismissed"].map((f) => {
                  const labels: Record<string, string> = { all: "All", pending: "Pending", resolved: "Resolved", dismissed: "Dismissed" };
                  const colors: Record<string, string> = {
                    all: "text-[#ff6b00] border-[#ff6b00]/30",
                    pending: "text-yellow-400 border-yellow-400/30",
                    resolved: "text-[#00ff88] border-[#00ff88]/30",
                    dismissed: "text-[#a0a0b0] border-[#a0a0b0]/30",
                  };
                  return (
                    <button
                      key={f}
                      onClick={() => { setReportsFilter(f); loadReports(f); }}
                      className={`px-2.5 py-1 rounded-lg border text-xs font-bold uppercase transition-opacity ${colors[f]} ${reportsFilter === f ? "opacity-100" : "opacity-40 hover:opacity-70"}`}
                    >
                      {labels[f]}
                    </button>
                  );
                })}
              </div>

              {reportsLoading ? (
                <div className="space-y-2.5">{[1,2,3].map(i => <div key={i} className="h-24 bg-[#12121a] rounded-xl animate-pulse" />)}</div>
              ) : reports.length === 0 ? (
                <div className="bg-[#12121a] rounded-xl border border-[#ff6b00]/10 p-8 text-center text-[#a0a0b0]">
                  <Flag className="w-12 h-12 mx-auto mb-2.5 opacity-20" />
                  <p className="font-bold">No reports in this category</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {reports.map((r: any) => (
                    <div key={r.id} className={`bg-[#12121a] rounded-xl border p-3 ${r.status === "pending" ? "border-yellow-400/20" : "border-[#1e1e2e]"}`}>
                      <div className="flex flex-col sm:flex-row sm:items-start gap-2.5">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap mb-1">
                            <span className={`text-xs font-black px-1.5 py-0.5 rounded border uppercase ${r.status === "pending" ? "text-yellow-400 border-yellow-400/30 bg-yellow-400/10" : r.status === "resolved" ? "text-[#00ff88] border-[#00ff88]/30 bg-[#00ff88]/10" : "text-[#a0a0b0] border-[#a0a0b0]/30 bg-[#a0a0b0]/10"}`}>{r.status}</span>
                            <span className="text-xs text-[#606070] bg-[#1a1a28] border border-[#2a2a36] px-1.5 py-0.5 rounded uppercase font-bold">{r.targetType}</span>
                          </div>
                          <div className="text-white font-bold text-sm">{r.reason}</div>
                          {r.targetName && <div className="text-[#a0a0b0] text-xs mt-0.5">Target: <span className="text-white">{r.targetName}</span></div>}
                          {r.description && <div className="text-[#a0a0b0] text-xs mt-1 italic">"{r.description}"</div>}
                          <div className="text-[#4a4a5a] text-[10px] mt-1.5">
                            Reported by <span className="text-[#606070]">{r.reporterName ?? "Anonymous"}</span> · {new Date(r.createdAt).toLocaleDateString()}
                          </div>
                          {r.adminNote && <div className="text-[#ff6b00] text-xs mt-1 border-t border-[#2a2a36] pt-1">Admin note: {r.adminNote}</div>}
                        </div>
                        {r.status === "pending" && (
                          <div className="flex gap-1.5 shrink-0">
                            <button
                              onClick={() => resolveReport(r.id, "resolved")}
                              className="px-2.5 py-1 bg-[#00ff88]/10 border border-[#00ff88]/30 text-[#00ff88] text-xs font-bold rounded-lg hover:bg-[#00ff88]/20 transition-colors"
                            >
                              <CheckCircle className="w-3.5 h-3.5 inline mr-1" />Resolve
                            </button>
                            <button
                              onClick={() => resolveReport(r.id, "dismissed")}
                              className="px-2.5 py-1 bg-[#a0a0b0]/10 border border-[#a0a0b0]/30 text-[#a0a0b0] text-xs font-bold rounded-lg hover:bg-[#a0a0b0]/20 transition-colors"
                            >
                              Dismiss
                            </button>
                            <button
                              onClick={() => deleteReport(r.id)}
                              className="p-1 bg-[#ff2244]/10 border border-[#ff2244]/30 text-[#ff2244] rounded-lg hover:bg-[#ff2244]/20 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ACTIVITY LOG */}
          {activeTab === "activity" && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h1 className="text-2xl font-black uppercase">Activity <span className="text-[#ff6b00]">Log</span></h1>
                <button onClick={loadStats} className="flex items-center gap-1.5 text-sm text-[#a0a0b0] hover:text-white transition-colors">
                  <RefreshCw className="w-4 h-4" /> Refresh
                </button>
              </div>
              <div className="bg-[#12121a] rounded-xl border border-[#ff6b00]/10 divide-y divide-[#ff6b00]/5">
                {!stats?.recentActivity || stats.recentActivity.length === 0 ? (
                  <div className="p-8 text-center text-[#a0a0b0]">
                    <Activity className="w-12 h-12 mx-auto mb-2.5 opacity-20" />
                    <p className="font-bold">No activity recorded yet</p>
                  </div>
                ) : stats.recentActivity.map((a: any) => (
                  <div key={a.id} className="px-3.5 py-2.5 flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#ff6b00]/10 border border-[#ff6b00]/20 flex items-center justify-center shrink-0 mt-0.5">
                      <Activity className="w-3.5 h-3.5 text-[#ff6b00]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-white text-sm font-bold">{a.action?.replace(/\./g, " ") ?? "Event"}</div>
                      {a.details && <div className="text-[#a0a0b0] text-xs mt-0.5 truncate">{typeof a.details === "string" ? a.details : JSON.stringify(a.details)}</div>}
                    </div>
                    <div className="text-[#4a4a5a] text-xs shrink-0">{new Date(a.createdAt).toLocaleString()}</div>
                  </div>
                ))}
              </div>
              {stats?.recentActivity?.length >= 50 && (
                <p className="text-center text-[#4a4a5a] text-xs mt-3">Showing latest 50 events. Older entries are archived in the database.</p>
              )}
            </div>
          )}

          {/* GLOBAL SEARCH */}
          {activeTab === "search" && (
            <div>
              <div className="mb-4">
                <h1 className="text-2xl font-black uppercase">Global <span className="text-[#ff6b00]">Search</span></h1>
                <p className="text-[#a0a0b0] text-sm mt-1">Search across users, tournaments, and community matches.</p>
              </div>
              <GlobalSearchTab apiFetch={apiFetch} />
            </div>
          )}

        </div>
      </main>

      {/* USER DETAIL MODAL */}
      {(selectedUserLoading || selectedUser) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-3" onClick={() => { setSelectedUser(null); }}>
          <div className="bg-[#12121a] border border-[#ff6b00]/20 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-3.5 border-b border-[#ff6b00]/10">
              <h2 className="font-black uppercase text-white flex items-center gap-1.5"><UserCheck className="w-5 h-5 text-[#ff6b00]" /> User Detail</h2>
              <button onClick={() => setSelectedUser(null)} className="p-1 rounded-lg text-[#a0a0b0] hover:text-white hover:bg-[#1e1e2e] transition-colors"><XIcon className="w-4 h-4" /></button>
            </div>
            {selectedUserLoading && !selectedUser ? (
              <div className="p-7 text-center">
                <RefreshCw className="w-8 h-8 text-[#ff6b00] animate-spin mx-auto mb-2.5" />
                <p className="text-[#a0a0b0] text-sm">Loading user details…</p>
              </div>
            ) : selectedUser && (
              <div className="p-3.5 space-y-3.5">
                {/* Basic info */}
                <div className="flex items-start gap-3">
                  <div className="w-14 h-14 rounded-xl bg-[#ff6b00]/10 border border-[#ff6b00]/20 flex items-center justify-center text-[#ff6b00] font-black text-xl shrink-0">
                    {(selectedUser.displayName ?? selectedUser.username ?? "?")[0]?.toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-black text-white text-lg">{selectedUser.displayName ?? selectedUser.username}</span>
                      {selectedUser.isAdmin && <span className="text-[10px] font-bold text-[#ff6b00] bg-[#ff6b00]/10 border border-[#ff6b00]/30 px-1 py-0.5 rounded">Admin</span>}
                      {selectedUser.isBanned && <span className="text-[10px] font-bold text-[#ff2244] bg-[#ff2244]/10 border border-[#ff2244]/30 px-1 py-0.5 rounded">Banned</span>}
                    </div>
                    <div className="text-[#a0a0b0] text-sm mt-0.5">{selectedUser.email}</div>
                    <div className="text-[#4a4a5a] text-xs mt-0.5">Joined {new Date(selectedUser.createdAt).toLocaleDateString()}</div>
                  </div>
                </div>

                {/* Wallet */}
                <div className="bg-[#0d0d16] rounded-xl border border-[#1e1e2e] p-3">
                  <div className="text-xs font-black uppercase text-[#ff6b00] mb-2.5 tracking-wider">Wallet</div>
                  <div className="grid grid-cols-2 gap-2.5">
                    <div><div className="text-[#00ff88] text-xl font-black">৳{Number(selectedUser.wallet?.balance ?? 0).toLocaleString()}</div><div className="text-[#606070] text-[10px] uppercase">Balance</div></div>
                    <div><div className="text-blue-400 text-xl font-black">৳{Number(selectedUser.wallet?.totalDeposit ?? 0).toLocaleString()}</div><div className="text-[#606070] text-[10px] uppercase">Total Deposits</div></div>
                    <div><div className="text-orange-400 text-xl font-black">৳{Number(selectedUser.wallet?.totalWithdraw ?? 0).toLocaleString()}</div><div className="text-[#606070] text-[10px] uppercase">Total Withdrawals</div></div>
                    <div><div className="text-[#ffd700] text-xl font-black">{selectedUser.wallet?.txCount ?? 0}</div><div className="text-[#606070] text-[10px] uppercase">Transactions</div></div>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-2.5">
                  {[
                    { label: "Registrations", value: selectedUser.registrationCount ?? 0, color: "text-blue-400" },
                    { label: "Community Matches", value: selectedUser.matchCount ?? 0, color: "text-[#00b4ff]" },
                    { label: "Teams", value: selectedUser.teamCount ?? 0, color: "text-purple-400" },
                  ].map((s) => (
                    <div key={s.label} className="bg-[#0d0d16] rounded-xl border border-[#1e1e2e] p-2.5 text-center">
                      <div className={`text-2xl font-black ${s.color}`}>{s.value}</div>
                      <div className="text-[#606070] text-[10px] uppercase mt-0.5">{s.label}</div>
                    </div>
                  ))}
                </div>

                {/* Recent transactions */}
                {selectedUser.recentTransactions?.length > 0 && (
                  <div>
                    <div className="text-xs font-black uppercase text-[#a0a0b0] mb-1.5 tracking-wider">Recent Transactions</div>
                    <div className="space-y-1">
                      {selectedUser.recentTransactions.slice(0, 5).map((tx: any) => (
                        <div key={tx.id} className="flex items-center justify-between bg-[#0d0d16] rounded-lg border border-[#1e1e2e] px-2.5 py-1.5">
                          <div>
                            <span className={`text-xs font-bold uppercase ${tx.type === "deposit" ? "text-[#00ff88]" : "text-orange-400"}`}>{tx.type}</span>
                            <span className="text-[#4a4a5a] text-xs ml-1.5">{new Date(tx.createdAt).toLocaleDateString()}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-white text-sm font-bold">৳{Number(tx.amount).toLocaleString()}</span>
                            <span className={`text-[10px] font-bold px-1 py-0.5 rounded border uppercase ${tx.status === "approved" ? "text-[#00ff88] border-[#00ff88]/30" : tx.status === "pending" ? "text-yellow-400 border-yellow-400/30" : "text-[#ff2244] border-[#ff2244]/30"}`}>{tx.status}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2.5 pt-1.5 border-t border-[#1e1e2e]">
                  <button
                    onClick={() => { toggleBan(selectedUser.clerkId, selectedUser.isBanned); setSelectedUser(null); }}
                    className={`flex-1 py-2 font-bold text-sm uppercase rounded-xl transition-colors border ${selectedUser.isBanned ? "bg-[#00ff88]/10 border-[#00ff88]/30 text-[#00ff88] hover:bg-[#00ff88]/20" : "bg-[#ff2244]/10 border-[#ff2244]/30 text-[#ff2244] hover:bg-[#ff2244]/20"}`}
                  >
                    {selectedUser.isBanned ? "Unban User" : "Ban User"}
                  </button>
                  <button onClick={() => setSelectedUser(null)} className="px-3 py-2 text-sm text-[#a0a0b0] hover:text-white border border-[#2a2a36] rounded-xl transition-colors">Close</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MATCH PLAYERS MODAL */}
      {(matchPlayersLoading || matchPlayersData) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-3" onClick={() => setMatchPlayersData(null)}>
          <div className="bg-[#12121a] border border-[#00b4ff]/20 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-3.5 border-b border-[#00b4ff]/10">
              <h2 className="font-black uppercase text-white flex items-center gap-1.5"><Users className="w-5 h-5 text-[#00b4ff]" /> Match Players</h2>
              <button onClick={() => setMatchPlayersData(null)} className="p-1 rounded-lg text-[#a0a0b0] hover:text-white hover:bg-[#1e1e2e] transition-colors"><XIcon className="w-4 h-4" /></button>
            </div>
            {matchPlayersLoading && !matchPlayersData ? (
              <div className="p-7 text-center">
                <RefreshCw className="w-8 h-8 text-[#00b4ff] animate-spin mx-auto mb-2.5" />
                <p className="text-[#a0a0b0] text-sm">Loading players…</p>
              </div>
            ) : matchPlayersData && (
              <div className="p-3.5">
                <div className="bg-[#0d0d16] rounded-xl border border-[#1e1e2e] p-2.5 mb-3">
                  <div className="text-white font-black text-sm">{matchPlayersData.match?.matchType} Match</div>
                  <div className="text-[#a0a0b0] text-xs mt-0.5">Slots: {matchPlayersData.match?.filledSlots}/{matchPlayersData.match?.maxSlots} · Prize: ৳{Number(matchPlayersData.match?.prizePool ?? 0).toLocaleString()}</div>
                </div>
                {matchPlayersData.players.length === 0 ? (
                  <div className="text-center py-5 text-[#a0a0b0]">
                    <Users className="w-10 h-10 mx-auto mb-1.5 opacity-20" />
                    <p className="text-sm">No players have joined yet</p>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <div className="grid grid-cols-12 gap-1.5 text-[#606070] text-[10px] uppercase px-1 mb-1">
                      <div className="col-span-1">#</div>
                      <div className="col-span-4">Username</div>
                      <div className="col-span-4">In-Game Name</div>
                      <div className="col-span-3">UID</div>
                    </div>
                    {matchPlayersData.players.map((p: any, idx: number) => (
                      <div key={p.id} className="grid grid-cols-12 gap-1.5 items-center bg-[#0d0d16] rounded-lg border border-[#1e1e2e] px-2.5 py-2 text-sm">
                        <div className="col-span-1 text-[#4a4a5a] font-bold text-xs">{idx + 1}</div>
                        <div className="col-span-4 text-white font-bold truncate">{p.username}</div>
                        <div className="col-span-4 text-[#a0a0b0] truncate">{p.inGameName}</div>
                        <div className="col-span-3 text-[#606070] font-mono text-xs truncate">{p.gameUid}</div>
                      </div>
                    ))}
                  </div>
                )}
                <div className="mt-3 pt-3 border-t border-[#1e1e2e] flex justify-end">
                  <button onClick={() => setMatchPlayersData(null)} className="px-3 py-1.5 text-sm text-[#a0a0b0] hover:text-white border border-[#2a2a36] rounded-xl transition-colors">Close</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const CS_DEFAULT_RULES = `🎯 Clash Squad (CS) Match Rules & Regulations:
• 🚫 HACKS & CHEATS: Strictly prohibited. Use of any third-party configuration, macro, or cheat will result in an immediate permanent ban and wallet forfeiture.
• 🕒 TIMING: Players must join the room 5 minutes before the match start time. Late entries will not be accommodated or refunded.
• 📱 DEVICE RESTRICTION: Emulator play is not allowed unless explicitly mentioned in the title. Mobile/Tablet devices only.
• 🛡️ FAIR PLAY: Friendly fire exploits, teaming up with opponents, or abusive language in chat will cause instant disqualification.`;

const CATEGORY_OPTIONS = [
  { value: "BR",        label: "BR — Battle Royale" },
  { value: "CS",        label: "CS — Clash Squad" },
  { value: "LONE_WOLF", label: "LONE WOLF — 1v1 Elimination" },
  { value: "FREE",      label: "FREE — Free Match / Giveaway" },
  { value: "SOLO",      label: "SOLO — Solo Survival" },
];

function CategoryRulesTab({ apiFetch, toast }: { apiFetch: any; toast: any }) {
  const [selectedCategory, setSelectedCategory] = useState("");
  const [rules, setRules] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [allRules, setAllRules] = useState<any[]>([]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/admin/category-rules");
      if (res.ok) setAllRules(await res.json());
    } catch {} finally { setLoading(false); }
  }, [apiFetch]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const handleCategoryChange = (cat: string) => {
    setSelectedCategory(cat);
    const existing = allRules.find((r) => r.category === cat);
    setRules(existing ? existing.rules : cat === "CS" ? CS_DEFAULT_RULES : "");
  };

  const handleSave = async () => {
    if (!selectedCategory) return toast({ title: "Select a category first", variant: "destructive" });
    if (!rules.trim()) return toast({ title: "Rules cannot be empty", variant: "destructive" });
    setSaving(true);
    try {
      const res = await apiFetch("/admin/category-rules", {
        method: "POST",
        body: JSON.stringify({ category: selectedCategory, rules: rules.trim() }),
      });
      if (res.ok) {
        toast({ title: "✅ Rules saved!", description: `${selectedCategory} category rules updated.` });
        loadAll();
      } else {
        const d = await safeJson(res);
        toast({ title: "Error", description: d.error ?? "Save failed", variant: "destructive" });
      }
    } catch {
      toast({ title: "Connection error", variant: "destructive" });
    } finally { setSaving(false); }
  };

  return (
    <div className="space-y-4 max-w-2xl">
      {/* Category selector */}
      <div className="bg-[#12121a] rounded-2xl border border-[#ff6b00]/10 p-4 space-y-3">
        <div>
          <label className="label-sm mb-1.5 block">Game Category</label>
          <select
            value={selectedCategory}
            onChange={(e) => handleCategoryChange(e.target.value)}
            className="admin-input max-w-sm"
          >
            <option value="">— Select a category —</option>
            {CATEGORY_OPTIONS.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>

        {selectedCategory && (
          <>
            <div>
              <label className="label-sm mb-1.5 block">
                Rules for <span className="text-[#ff6b00]">{selectedCategory}</span>
                <span className="ml-1.5 text-[10px] text-[#606070] normal-case">(shown to all players in this category)</span>
              </label>
              <textarea
                value={rules}
                onChange={(e) => setRules(e.target.value)}
                rows={10}
                placeholder="Enter rules for this category..."
                className="admin-input resize-y font-mono text-xs leading-relaxed"
              />
            </div>
            <div className="flex items-center gap-2.5">
              <button
                onClick={handleSave}
                disabled={saving || !rules.trim()}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-[#ff6b00] text-white font-bold text-sm uppercase rounded-xl hover:bg-[#e66000] disabled:opacity-50 transition-colors"
              >
                {saving ? "Saving..." : "💾 Save Rules"}
              </button>
              {selectedCategory === "CS" && !allRules.find((r) => r.category === "CS") && (
                <span className="text-xs text-[#a0a0b0]">Pre-filled with default CS rules — edit as needed.</span>
              )}
            </div>
          </>
        )}
      </div>

      {/* Saved rules list */}
      <div>
        <h2 className="font-black uppercase text-sm text-[#a0a0b0] mb-2.5">Saved Categories</h2>
        {loading ? (
          <div className="space-y-1.5">
            {[1,2,3].map((i) => <div key={i} className="h-12 bg-[#12121a] rounded-xl animate-pulse" />)}
          </div>
        ) : allRules.length === 0 ? (
          <div className="bg-[#12121a] rounded-xl border border-[#ff6b00]/10 p-5 text-center text-[#a0a0b0] text-sm">
            <BookOpen className="w-10 h-10 mx-auto mb-1.5 opacity-20" />
            <p>No category rules saved yet.</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {allRules.map((r) => (
              <div key={r.category} className="bg-[#12121a] rounded-xl border border-[#ff6b00]/10 px-3.5 py-2.5 flex items-center justify-between gap-3">
                <div>
                  <span className="font-black text-white text-sm">{r.category}</span>
                  <span className="ml-2.5 text-[#a0a0b0] text-xs line-clamp-1">{r.rules.slice(0, 80)}{r.rules.length > 80 ? "…" : ""}</span>
                </div>
                <button
                  onClick={() => handleCategoryChange(r.category)}
                  className="shrink-0 text-xs px-2.5 py-1 bg-[#ff6b00]/10 border border-[#ff6b00]/20 text-[#ff6b00] rounded-lg hover:bg-[#ff6b00]/20 transition-colors font-bold"
                >
                  Edit
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
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
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-black uppercase">Promo <span className="text-[#ff6b00]">Codes</span></h1>
        <div className="flex items-center gap-1.5">
          <button onClick={load} className="flex items-center gap-1.5 text-sm text-[#a0a0b0] hover:text-white transition-colors">
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
          <button
            onClick={() => { setEditingCode(null); setForm({ code: "", bonusAmount: "", usageLimit: "100", expiresAt: "", isActive: true }); setShowForm(true); }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#ff6b00] text-white rounded-xl text-sm font-bold uppercase hover:bg-[#e66000] transition-colors"
          >
            <Plus className="w-4 h-4" /> New Code
          </button>
        </div>
      </div>

      {showForm && (
        <div className="bg-[#12121a] border border-[#ff6b00]/20 rounded-2xl p-4 mb-4">
          <h3 className="font-black uppercase text-sm text-[#ff6b00] mb-3">{editingCode ? "Edit Promo Code" : "Create Promo Code"}</h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
            <div className="flex items-center gap-2.5">
              <input type="checkbox" id="isActive" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="w-4 h-4 accent-[#ff6b00]" />
              <label htmlFor="isActive" className="text-white text-sm font-bold">Active</label>
            </div>
            <div className="flex gap-1.5 sm:col-span-2">
              <button type="submit" disabled={submitting} className="px-3.5 py-1.5 bg-[#ff6b00] text-white font-black uppercase rounded-xl text-sm hover:bg-[#e66000] disabled:opacity-50 transition-all">
                {submitting ? "Saving..." : (editingCode ? "Save Changes" : "Create Code")}
              </button>
              <button type="button" onClick={() => { setShowForm(false); setEditingCode(null); }} className="px-3.5 py-1.5 bg-[#1a1a24] text-[#a0a0b0] font-bold uppercase rounded-xl text-sm hover:text-white transition-colors">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="space-y-2.5">{[1,2,3].map((i) => <div key={i} className="h-16 bg-[#12121a] rounded-xl animate-pulse" />)}</div>
      ) : codes.length === 0 ? (
        <div className="bg-[#12121a] rounded-xl border border-[#ff6b00]/10 p-8 text-center text-[#a0a0b0]">
          <Tag className="w-12 h-12 mx-auto mb-2.5 opacity-20" />
          <p>No promo codes yet. Create one above.</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {codes.map((code: any) => (
            <div key={code.id} className="bg-[#12121a] rounded-xl border border-[#ff6b00]/10 p-3 flex flex-col sm:flex-row sm:items-center gap-2.5">
              <div className="flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-mono font-black text-white text-lg">{code.code}</span>
                  <span className={`text-xs font-bold uppercase px-1.5 py-0.5 rounded-full border ${code.isActive ? "text-[#00ff88] bg-[#00ff88]/10 border-[#00ff88]/30" : "text-[#a0a0b0] bg-[#1a1a24] border-[#2a2a36]"}`}>
                    {code.isActive ? "Active" : "Inactive"}
                  </span>
                </div>
                <div className="text-[#ff6b00] font-bold mt-1">৳{Number(code.bonusAmount).toLocaleString()} bonus</div>
                <div className="text-[#a0a0b0] text-xs mt-0.5">
                  Used {code.usageCount}/{code.usageLimit} times
                  {code.expiresAt && ` · Expires ${new Date(code.expiresAt).toLocaleDateString()}`}
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button onClick={() => startEdit(code)} className="p-1 bg-[#ff6b00]/10 border border-[#ff6b00]/30 rounded-lg text-[#ff6b00] hover:bg-[#ff6b00]/20">
                  <Edit className="w-4 h-4" />
                </button>
                <button onClick={() => handleDelete(code.id)} className="p-1 bg-[#ff2244]/10 border border-[#ff2244]/30 rounded-lg text-[#ff2244] hover:bg-[#ff2244]/20">
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
    <div className="space-y-4">
      <div className="flex items-center gap-2.5 mb-1.5">
        <Settings className="w-5 h-5 text-[#ff6b00]" />
        <h2 className="text-white font-black uppercase tracking-wide text-lg">Payment Settings</h2>
      </div>
      <p className="text-[#a0a0b0] text-sm -mt-2.5">Set the payment numbers users see when depositing. Only admins can update these.</p>

      <div className="bg-[#12121a] rounded-xl border border-[#ff6b00]/15 p-3.5">
        <h3 className="text-white font-black uppercase text-xs tracking-widest mb-3 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[#00ff88]" /> Current Active Numbers
        </h3>
        {loading ? (
          <div className="space-y-2.5">{[1,2,3].map(i => <div key={i} className="h-12 bg-[#0a0a0f] rounded-xl animate-pulse" />)}</div>
        ) : (
          <div className="space-y-2.5">
            {methods.map((m) => (
              <div key={m.key} className={`flex items-center justify-between rounded-xl border px-3 py-2.5 ${m.color}`}>
                <div className="flex items-center gap-2.5">
                  <span className={`w-2 h-2 rounded-full ${m.dot}`} />
                  <span className="font-black text-xs uppercase tracking-wider">{m.label}</span>
                </div>
                <div className="flex items-center gap-1.5">
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

      <div className="bg-[#12121a] rounded-xl border border-[#ff6b00]/15 p-3.5">
        <h3 className="text-white font-black uppercase text-xs tracking-widest mb-3.5 flex items-center gap-1.5">
          <Edit className="w-3.5 h-3.5 text-[#ff6b00]" /> Update Payment Numbers
        </h3>
        {loading ? (
          <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-16 bg-[#0a0a0f] rounded-xl animate-pulse" />)}</div>
        ) : (
          <form onSubmit={handleSave} className="space-y-3">
            {methods.map((m) => (
              <div key={m.key}>
                <label className="block text-[#a0a0b0] text-xs uppercase tracking-wider mb-1 font-bold">
                  <span className={`inline-block w-2 h-2 rounded-full mr-1 ${m.dot}`} />
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
            <div className="bg-yellow-500/8 border border-yellow-500/20 rounded-xl px-3 py-2.5 flex items-start gap-1.5">
              <Shield className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
              <p className="text-yellow-400 text-xs">These numbers are shown to all users on the payment screen. Only admins can change them. Users cannot modify payment numbers.</p>
            </div>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2.5 bg-[#ff6b00] text-white font-black uppercase rounded-xl text-sm hover:bg-[#e66000] disabled:opacity-50 transition-all"
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
  return <span className={`inline-flex items-center px-1.5 py-0.5 rounded border text-xs font-bold uppercase ${cfg.cls}`}>{cfg.label}</span>;
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
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <Headphones className="w-5 h-5 text-[#ff6b00]" />
          <h1 className="text-2xl font-black uppercase">Support <span className="text-[#ff6b00]">Dashboard</span></h1>
        </div>
        <div className="flex gap-1.5">
          <button
            onClick={() => setActiveView("tickets")}
            className={`px-3 py-1.5 rounded-xl text-sm font-bold uppercase transition-colors ${activeView === "tickets" ? "bg-[#ff6b00]/15 text-[#ff6b00] border border-[#ff6b00]/30" : "text-[#a0a0b0] hover:text-white"}`}
          >
            Tickets
          </button>
          <button
            onClick={() => setActiveView("settings")}
            className={`px-3 py-1.5 rounded-xl text-sm font-bold uppercase transition-colors ${activeView === "settings" ? "bg-[#ff6b00]/15 text-[#ff6b00] border border-[#ff6b00]/30" : "text-[#a0a0b0] hover:text-white"}`}
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
        <button onClick={() => setSelectedTicket(null)} className="flex items-center gap-1.5 text-[#a0a0b0] hover:text-white text-sm mb-3.5 transition-colors">
          ← Back to All Tickets
        </button>

        <div className="grid lg:grid-cols-3 gap-3.5">
          <div className="lg:col-span-2 space-y-3">
            <div className="bg-[#12121a] rounded-2xl border border-[#ff6b00]/15 p-3.5">
              <div className="flex items-start justify-between gap-2.5 mb-3">
                <div>
                  <h2 className="font-black text-white text-lg">{selectedTicket.subject}</h2>
                  <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                    <TicketStatusBadge status={selectedTicket.status} />
                    <span className="text-[#4a4a5a] text-xs">{TICKET_CATEGORY_LABELS[selectedTicket.category] ?? selectedTicket.category}</span>
                    <span className="text-[#4a4a5a] text-xs">#{selectedTicket.id}</span>
                  </div>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <button onClick={() => deleteTicket(selectedTicket.id)} className="p-1 bg-[#ff2244]/10 border border-[#ff2244]/20 rounded-lg text-[#ff2244] hover:bg-[#ff2244]/20">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-[#229ED9]/20 flex items-center justify-center shrink-0 text-xs font-black text-[#229ED9]">U</div>
                  <div className="flex-1 bg-[#0a0a0f] rounded-xl p-2.5">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-white text-xs font-bold">
                        {selectedTicket.user?.displayName ?? selectedTicket.user?.username ?? "User"}
                        {selectedTicket.user?.email && <span className="text-[#4a4a5a] font-normal ml-1.5">{selectedTicket.user.email}</span>}
                      </span>
                      <span className="text-[#4a4a5a] text-xs">{ticketTimeAgo(selectedTicket.createdAt)}</span>
                    </div>
                    <p className="text-[#a0a0b0] text-sm leading-relaxed whitespace-pre-wrap">{selectedTicket.message}</p>
                    {selectedTicket.screenshotUrl && (
                      <img src={selectedTicket.screenshotUrl} alt="screenshot" className="mt-2.5 rounded-lg max-w-xs max-h-48 object-contain" />
                    )}
                  </div>
                </div>

                {(selectedTicket.replies ?? []).map((reply: any) => (
                  <div key={reply.id} className={`flex gap-2.5 ${reply.isAdmin ? "flex-row-reverse" : ""}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-black ${reply.isAdmin ? "bg-[#ff6b00]/20 text-[#ff6b00]" : "bg-[#229ED9]/20 text-[#229ED9]"}`}>
                      {reply.isAdmin ? "A" : "U"}
                    </div>
                    <div className={`flex-1 rounded-xl p-2.5 ${reply.isAdmin ? "bg-[#ff6b00]/8 border border-[#ff6b00]/15" : "bg-[#0a0a0f]"}`}>
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
              <div className="bg-[#12121a] rounded-2xl border border-[#ff6b00]/15 p-3">
                <label className="block text-[#a0a0b0] text-xs uppercase tracking-wider mb-1.5 font-bold">Admin Reply</label>
                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  rows={3}
                  placeholder="Write your reply to the user..."
                  className="admin-input resize-none mb-2.5"
                />
                <button
                  onClick={sendReply}
                  disabled={sendingReply || !replyText.trim()}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-[#ff6b00] text-white font-black uppercase rounded-xl text-sm hover:bg-[#e66000] disabled:opacity-50 transition-all"
                >
                  <Send className="w-4 h-4" />
                  {sendingReply ? "Sending..." : "Send Reply & Notify User"}
                </button>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <div className="bg-[#12121a] rounded-2xl border border-[#ff6b00]/15 p-3">
              <h3 className="text-xs font-black uppercase tracking-widest text-[#a0a0b0] mb-2.5">Change Status</h3>
              <div className="space-y-1.5">
                {Object.entries(TICKET_STATUS_CFG).map(([status, cfg]) => (
                  <button
                    key={status}
                    onClick={() => changeStatus(selectedTicket.id, status)}
                    disabled={selectedTicket.status === status}
                    className={`w-full px-2.5 py-1.5 rounded-xl text-xs font-bold uppercase border transition-all disabled:opacity-50 disabled:cursor-not-allowed ${cfg.cls}`}
                  >
                    {selectedTicket.status === status ? `● ${cfg.label} (Current)` : cfg.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-[#12121a] rounded-2xl border border-[#ff6b00]/15 p-3">
              <h3 className="text-xs font-black uppercase tracking-widest text-[#a0a0b0] mb-2.5">Ticket Info</h3>
              <div className="space-y-1.5 text-xs">
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
      <div className="flex items-center justify-between mb-3.5">
        <div className="flex gap-1.5 flex-wrap">
          {["all", "open", "in_progress", "resolved", "closed"].map((f) => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase transition-colors ${statusFilter === f ? "bg-[#ff6b00]/15 text-[#ff6b00] border border-[#ff6b00]/30" : "text-[#a0a0b0] hover:text-white border border-transparent"}`}
            >
              {f === "all" ? "All" : TICKET_STATUS_CFG[f]?.label ?? f}
              {f === "all" ? ` (${tickets.length})` : ` (${tickets.filter((t) => t.status === f).length})`}
            </button>
          ))}
        </div>
        <button onClick={loadTickets} className="flex items-center gap-1.5 text-sm text-[#a0a0b0] hover:text-white transition-colors">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {loading ? (
        <div className="space-y-2.5">{[1,2,3,4].map((i) => <div key={i} className="h-20 bg-[#12121a] rounded-xl animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="bg-[#12121a] rounded-2xl border border-[#ff6b00]/10 p-14 text-center">
          <MessageCircle className="w-12 h-12 text-[#a0a0b0] mx-auto mb-2.5 opacity-20" />
          <p className="text-[#a0a0b0]">{statusFilter === "all" ? "No support tickets yet." : `No ${TICKET_STATUS_CFG[statusFilter]?.label.toLowerCase()} tickets.`}</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filtered.map((ticket: any) => (
            <div
              key={ticket.id}
              onClick={() => openTicket(ticket.id)}
              className="bg-[#12121a] border border-[#ff6b00]/10 hover:border-[#ff6b00]/30 rounded-xl p-3 cursor-pointer transition-colors flex items-center gap-3"
            >
              <div className="w-10 h-10 rounded-xl bg-[#ff6b00]/10 flex items-center justify-center shrink-0">
                <MessageCircle className="w-5 h-5 text-[#ff6b00]" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-1.5">
                  <span className="font-bold text-white text-sm truncate">{ticket.subject}</span>
                  <span className="text-[#4a4a5a] text-xs whitespace-nowrap shrink-0">{ticketTimeAgo(ticket.createdAt)}</span>
                </div>
                <div className="flex items-center gap-1.5 mt-1 flex-wrap">
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
    <div className="max-w-lg space-y-4">
      <div className="flex items-center gap-2.5 mb-1.5">
        <MessageCircle className="w-5 h-5 text-[#ff6b00]" />
        <h2 className="text-white font-black uppercase tracking-wide text-lg">Support Contact Settings</h2>
      </div>
      <p className="text-[#a0a0b0] text-sm -mt-2.5">Update the WhatsApp number and Telegram link shown to all users.</p>

      <div className="bg-[#12121a] rounded-xl border border-[#ff6b00]/15 p-3.5">
        <h3 className="text-white font-black uppercase text-xs tracking-widest mb-3 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[#00ff88]" /> Current Live Links
        </h3>
        {loading ? (
          <div className="space-y-2.5">{[1,2].map(i => <div key={i} className="h-12 bg-[#0a0a0f] rounded-xl animate-pulse" />)}</div>
        ) : (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between rounded-xl border border-[#00ff88]/20 bg-[#00ff88]/5 px-3 py-2.5">
              <div className="flex items-center gap-2.5">
                <MessageCircle className="w-4 h-4 text-[#00ff88]" />
                <span className="font-black text-xs uppercase text-[#00ff88] tracking-wider">WhatsApp</span>
              </div>
              <a href={waHref} target="_blank" rel="noopener noreferrer" className="font-mono font-bold text-white hover:text-[#00ff88] text-sm">
                {form.whatsapp_number || "—"}
              </a>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-[#229ED9]/20 bg-[#229ED9]/5 px-3 py-2.5">
              <div className="flex items-center gap-2.5">
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

      <div className="bg-[#12121a] rounded-xl border border-[#ff6b00]/15 p-3.5">
        <h3 className="text-white font-black uppercase text-xs tracking-widest mb-3.5 flex items-center gap-1.5">
          <Edit className="w-3.5 h-3.5 text-[#ff6b00]" /> Update Support Contacts
        </h3>
        {loading ? (
          <div className="space-y-3">{[1,2].map(i => <div key={i} className="h-16 bg-[#0a0a0f] rounded-xl animate-pulse" />)}</div>
        ) : (
          <form onSubmit={handleSave} className="space-y-3">
            <div>
              <label className="block text-[#a0a0b0] text-xs uppercase tracking-wider mb-1 font-bold">
                <span className="inline-block w-2 h-2 rounded-full mr-1 bg-[#00ff88]" />
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
              <label className="block text-[#a0a0b0] text-xs uppercase tracking-wider mb-1 font-bold">
                <span className="inline-block w-2 h-2 rounded-full mr-1 bg-[#229ED9]" />
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
            <div className="bg-yellow-500/8 border border-yellow-500/20 rounded-xl px-3 py-2.5 flex items-start gap-1.5">
              <Shield className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
              <p className="text-yellow-400 text-xs">These contacts are shown to all users on the Support page, Contact page, and Footer. Only admins can update them.</p>
            </div>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2.5 bg-[#ff6b00] text-white font-black uppercase rounded-xl text-sm hover:bg-[#e66000] disabled:opacity-50 transition-all"
            >
              {saving ? "Saving..." : "Save Support Settings"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

function GlobalSearchTab({ apiFetch }: { apiFetch: any }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const timeoutRef = useRef<any>(null);

  const doSearch = async (q: string) => {
    if (!q.trim()) { setResults(null); return; }
    setLoading(true);
    try {
      const res = await apiFetch(`/admin/global-search?q=${encodeURIComponent(q)}`);
      if (res.ok) setResults(await res.json());
    } catch {} finally { setLoading(false); }
  };

  return (
    <div>
      <div className="relative mb-4">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#4a4a5a]" />
        <input
          value={query}
          onChange={(e) => {
            const q = e.target.value;
            setQuery(q);
            clearTimeout(timeoutRef.current);
            timeoutRef.current = setTimeout(() => doSearch(q), 400);
          }}
          placeholder="Search users, tournaments, community matches…"
          className="w-full bg-[#0d0d16] border border-[#1e1e2e] rounded-xl pl-8 pr-3 py-2.5 text-white text-sm placeholder-[#3a3a46] focus:outline-none focus:border-[#ff6b00]/40 transition-colors"
        />
        {loading && <RefreshCw className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#a0a0b0] animate-spin" />}
      </div>

      {!results && !loading && (
        <div className="text-center py-16 text-[#4a4a5a]">
          <Search className="w-12 h-12 mx-auto mb-2.5 opacity-30" />
          <p className="text-sm">Type at least 2 characters to search</p>
        </div>
      )}

      {results && (
        <div className="space-y-4">
          {results.users?.length > 0 && (
            <div>
              <h3 className="text-xs font-black uppercase text-[#ff6b00] mb-2.5 tracking-wider flex items-center gap-1.5"><Users className="w-3.5 h-3.5" /> Users ({results.users.length})</h3>
              <div className="space-y-1.5">
                {results.users.map((u: any) => (
                  <div key={u.clerkId} className="bg-[#12121a] rounded-xl border border-[#1e1e2e] p-3 flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-[#ff6b00]/10 border border-[#ff6b00]/20 flex items-center justify-center text-[#ff6b00] font-black text-sm shrink-0">
                      {(u.displayName ?? u.username ?? "?")[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-white text-sm">{u.displayName ?? u.username}</span>
                        {u.isAdmin && <span className="text-[10px] font-bold text-[#ff6b00] bg-[#ff6b00]/10 border border-[#ff6b00]/30 px-1 py-0.5 rounded">Admin</span>}
                        {u.isBanned && <span className="text-[10px] font-bold text-[#ff2244] bg-[#ff2244]/10 border border-[#ff2244]/30 px-1 py-0.5 rounded">Banned</span>}
                      </div>
                      <div className="text-[#a0a0b0] text-xs">{u.email}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {results.tournaments?.length > 0 && (
            <div>
              <h3 className="text-xs font-black uppercase text-[#ff6b00] mb-2.5 tracking-wider flex items-center gap-1.5"><Trophy className="w-3.5 h-3.5" /> Tournaments ({results.tournaments.length})</h3>
              <div className="space-y-1.5">
                {results.tournaments.map((t: any) => (
                  <div key={t.id} className="bg-[#12121a] rounded-xl border border-[#1e1e2e] p-3 flex items-center justify-between gap-2.5">
                    <div className="min-w-0">
                      <div className="font-bold text-white text-sm truncate">{t.name}</div>
                      <div className="text-[#a0a0b0] text-xs">৳{Number(t.prizePool).toLocaleString()} · {new Date(t.startDate).toLocaleDateString()}</div>
                    </div>
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded border text-xs font-bold uppercase ${t.status === "live" || t.status === "ongoing" ? "text-[#00ff88] border-[#00ff88]/30" : "text-[#a0a0b0] border-[#a0a0b0]/30"}`}>{t.status}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {results.matches?.length > 0 && (
            <div>
              <h3 className="text-xs font-black uppercase text-[#ff6b00] mb-2.5 tracking-wider flex items-center gap-1.5"><Swords className="w-3.5 h-3.5" /> Community Matches ({results.matches.length})</h3>
              <div className="space-y-1.5">
                {results.matches.map((m: any) => (
                  <div key={m.id} className="bg-[#12121a] rounded-xl border border-[#1e1e2e] p-3 flex items-center justify-between gap-2.5">
                    <div className="min-w-0">
                      <div className="font-bold text-white text-sm">{m.matchType} Match</div>
                      <div className="text-[#a0a0b0] text-xs">By {m.creatorName ?? "Unknown"} · {m.filledSlots}/{m.maxSlots} slots</div>
                    </div>
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded border text-xs font-bold uppercase ${m.status === "active" ? "text-[#00ff88] border-[#00ff88]/30" : m.status === "pending_approval" ? "text-yellow-400 border-yellow-400/30" : "text-[#a0a0b0] border-[#a0a0b0]/30"}`}>{m.status === "pending_approval" ? "Pending" : m.status}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {results.users?.length === 0 && results.tournaments?.length === 0 && results.matches?.length === 0 && (
            <div className="text-center py-8 text-[#a0a0b0]">
              <Search className="w-10 h-10 mx-auto mb-2.5 opacity-20" />
              <p className="font-bold">No results for "{query}"</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
