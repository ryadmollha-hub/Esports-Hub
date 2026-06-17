import { useState, useEffect, useCallback } from "react";
import { useAuthContext } from "@/lib/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CountdownTimer from "@/components/CountdownTimer";
import {
  Swords, Clock, Users, Lock, Globe, ChevronRight, CheckCircle,
  XCircle, Timer, Copy, Eye, EyeOff, Trash2, Plus, RefreshCw,
  Trophy, AlertCircle, Shield,
} from "lucide-react";
import { useCreateMatch } from "@/lib/CreateMatchContext";

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  pending_approval: { label: "Pending Approval", className: "bg-yellow-500/10 text-yellow-400 border-yellow-500/30" },
  waiting:  { label: "Waiting",   className: "bg-blue-500/10 text-blue-400 border-blue-400/30" },
  active:   { label: "LIVE",      className: "bg-[#00ff88]/10 text-[#00ff88] border-[#00ff88]/30" },
  ended:    { label: "Ended",     className: "bg-[#606070]/10 text-[#606070] border-[#606070]/30" },
  cancelled:{ label: "Cancelled", className: "bg-[#ff2244]/10 text-[#ff2244] border-[#ff2244]/30" },
  approved: { label: "Waiting",   className: "bg-blue-500/10 text-blue-400 border-blue-400/30" },
};

const REQUEST_STATUS: Record<string, { label: string; className: string }> = {
  pending:  { label: "Pending",   className: "bg-yellow-500/10 text-yellow-400 border-yellow-500/30" },
  accepted: { label: "Accepted",  className: "bg-[#00ff88]/10 text-[#00ff88] border-[#00ff88]/30" },
  rejected: { label: "Rejected",  className: "bg-[#ff2244]/10 text-[#ff2244] border-[#ff2244]/30" },
};

function getEffectiveStatus(match: any): string {
  if (match.effectiveStatus) return match.effectiveStatus;
  if (match.status === "pending_approval") return "pending_approval";
  if (match.status === "active" || match.status === "ended" || match.status === "cancelled") return match.status;
  if (match.timerStartedAt && match.startDelayMinutes) {
    const startMs = new Date(match.timerStartedAt).getTime() + match.startDelayMinutes * 60 * 1000;
    if (Date.now() >= startMs) return "active";
  }
  return match.status === "approved" ? "waiting" : (match.status || "waiting");
}

function getStartsAt(match: any): Date | null {
  if (!match.timerStartedAt || !match.startDelayMinutes) return null;
  return new Date(new Date(match.timerStartedAt).getTime() + match.startDelayMinutes * 60 * 1000);
}

function copyToClipboard(text: string, toast: any) {
  navigator.clipboard.writeText(text).then(() => toast({ title: "Copied!" })).catch(() => {});
}

// ── My Created Match Card ──────────────────────────────────────────────────────

function MyMatchCard({ match, onRefresh }: { match: any; onRefresh: () => void }) {
  const { authFetch } = useAuthContext();
  const { toast } = useToast();
  const [expanded, setExpanded] = useState(false);
  const [editRoomId, setEditRoomId] = useState("");
  const [showRoomEdit, setShowRoomEdit] = useState(false);
  const [timerDelay, setTimerDelay] = useState(5);
  const [customDelay, setCustomDelay] = useState("");
  const [useCustom, setUseCustom] = useState(false);
  const [requests, setRequests] = useState<any[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [saving, setSaving] = useState(false);
  const [startingTimer, setStartingTimer] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [matchPassword, setMatchPassword] = useState("");
  const [showPasswordEdit, setShowPasswordEdit] = useState(false);

  const effStatus = getEffectiveStatus(match);
  const startsAt = getStartsAt(match);
  const isActive = effStatus === "active";
  const isTimerRunning = match.timerStartedAt && !isActive;

  const loadRequests = useCallback(async () => {
    setLoadingRequests(true);
    try {
      const res = await authFetch(`/user-matches/${match.id}/join-requests`);
      if (res.ok) setRequests(await res.json());
    } catch {}
    finally { setLoadingRequests(false); }
  }, [match.id, authFetch]);

  useEffect(() => {
    if (expanded) loadRequests();
  }, [expanded, loadRequests]);

  const handleSaveRoomId = async () => {
    setSaving(true);
    try {
      const res = await authFetch(`/user-matches/${match.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId: editRoomId.trim() }),
      });
      if (res.ok) {
        toast({ title: "Room ID saved!" });
        setShowRoomEdit(false);
        onRefresh();
      } else {
        const d = await res.json();
        toast({ title: "Error", description: d.error, variant: "destructive" });
      }
    } catch { toast({ title: "Connection error", variant: "destructive" }); }
    finally { setSaving(false); }
  };

  const handleSavePassword = async () => {
    setSaving(true);
    try {
      const res = await authFetch(`/user-matches/${match.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: matchPassword }),
      });
      if (res.ok) {
        toast({ title: "Password updated!" });
        setShowPasswordEdit(false);
        setMatchPassword("");
        onRefresh();
      } else {
        const d = await res.json();
        toast({ title: "Error", description: d.error, variant: "destructive" });
      }
    } catch { toast({ title: "Connection error", variant: "destructive" }); }
    finally { setSaving(false); }
  };

  const handleStartTimer = async () => {
    const delay = useCustom ? parseInt(customDelay) : timerDelay;
    if (!delay || delay < 1 || delay > 120) {
      toast({ title: "Enter a valid delay (1–120 min)", variant: "destructive" }); return;
    }
    setStartingTimer(true);
    try {
      const res = await authFetch(`/user-matches/${match.id}/start-timer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ delayMinutes: delay }),
      });
      if (res.ok) {
        toast({ title: `Timer started! Match starts in ${delay} minute${delay > 1 ? "s" : ""}.` });
        onRefresh();
      } else {
        const d = await res.json();
        toast({ title: "Error", description: d.error, variant: "destructive" });
      }
    } catch { toast({ title: "Connection error", variant: "destructive" }); }
    finally { setStartingTimer(false); }
  };

  const handleApprove = async (joinId: number) => {
    try {
      const res = await authFetch(`/user-matches/${match.id}/join-requests/${joinId}/approve`, { method: "PATCH" });
      if (res.ok) { toast({ title: "Approved!" }); loadRequests(); onRefresh(); }
      else { const d = await res.json(); toast({ title: "Error", description: d.error, variant: "destructive" }); }
    } catch { toast({ title: "Connection error", variant: "destructive" }); }
  };

  const handleReject = async (joinId: number) => {
    try {
      const res = await authFetch(`/user-matches/${match.id}/join-requests/${joinId}/reject`, { method: "PATCH" });
      if (res.ok) { toast({ title: "Rejected" }); loadRequests(); onRefresh(); }
      else { const d = await res.json(); toast({ title: "Error", description: d.error, variant: "destructive" }); }
    } catch { toast({ title: "Connection error", variant: "destructive" }); }
  };

  const handleDelete = async () => {
    if (!confirm("Cancel and delete this match?")) return;
    setDeleting(true);
    try {
      const res = await authFetch(`/user-matches/${match.id}`, { method: "DELETE" });
      if (res.ok) { toast({ title: "Match cancelled" }); onRefresh(); }
      else { const d = await res.json(); toast({ title: "Error", description: d.error, variant: "destructive" }); }
    } catch { toast({ title: "Connection error", variant: "destructive" }); }
    finally { setDeleting(false); }
  };

  const statusInfo = STATUS_BADGE[effStatus] ?? STATUS_BADGE.waiting;
  const pendingReqs = requests.filter((r) => r.status === "pending");
  const acceptedReqs = requests.filter((r) => r.status === "accepted");

  return (
    <div className="bg-[#12121a] rounded-2xl border border-[#2a2a36] hover:border-[#ff6b00]/20 transition-colors">
      {/* Header */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="font-black text-white text-sm truncate max-w-[200px]">
                {match.matchName || `${match.matchType} Match`}
              </span>
              <span className={`inline-flex items-center gap-1 text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${statusInfo.className}`}>
                {isActive && <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse inline-block mr-0.5" />}
                {statusInfo.label}
              </span>
              {match.isPrivate ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-400 border border-yellow-500/30">
                  <Lock className="w-2.5 h-2.5" /> Private
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#00ff88]/10 text-[#00ff88] border border-[#00ff88]/30">
                  <Globe className="w-2.5 h-2.5" /> Public
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 text-xs text-[#606070]">
              <span className="flex items-center gap-1"><Swords className="w-3 h-3" /> {match.matchType}</span>
              <span className="flex items-center gap-1"><Trophy className="w-3 h-3 text-[#ffd700]" /> ৳{Number(match.prizePool).toLocaleString()}</span>
              <span className="flex items-center gap-1"><Users className="w-3 h-3" />
                <span className={match.filledSlots >= match.maxSlots ? "text-[#ff2244] font-bold" : "text-[#00ff88] font-bold"}>
                  {match.filledSlots}/{match.maxSlots}
                </span>
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {match.pendingRequests > 0 && (
              <span className="w-5 h-5 rounded-full bg-[#ff6b00] text-white text-[10px] font-black flex items-center justify-center">
                {match.pendingRequests}
              </span>
            )}
            <button onClick={() => setExpanded(!expanded)}
              className={`w-8 h-8 rounded-xl bg-[#1a1a24] flex items-center justify-center text-[#a0a0b0] hover:text-white transition-all ${expanded ? "rotate-90" : ""}`}>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Pending approval banner */}
        {effStatus === "pending_approval" && (
          <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-xl px-3 py-2 text-xs text-yellow-400 font-bold flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            Awaiting admin approval — your match will go live once reviewed
          </div>
        )}
        {/* Timer display */}
        {isTimerRunning && startsAt && (
          <div className="bg-[#0a0a0f] rounded-xl px-3 py-2 flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs text-[#a0a0b0]">
              <Timer className="w-3.5 h-3.5 text-[#ff6b00]" /> Match starts in:
            </div>
            <CountdownTimer targetDate={startsAt} className="text-xs" />
          </div>
        )}
        {isActive && (
          <div className="bg-[#00ff88]/5 border border-[#00ff88]/20 rounded-xl px-3 py-2 text-xs text-[#00ff88] font-bold flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#00ff88] animate-pulse" />
            Match is LIVE — Room details visible to accepted players
          </div>
        )}
      </div>

      {/* Expanded Controls */}
      {expanded && (
        <div className="border-t border-[#2a2a36] p-4 space-y-4">

          {/* Room ID */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[#a0a0b0] text-xs uppercase tracking-wider font-bold">Room ID</label>
              <button onClick={() => { setShowRoomEdit(!showRoomEdit); setEditRoomId(match.roomId || ""); }}
                className="text-[10px] text-[#ff6b00] font-bold uppercase hover:underline">
                {showRoomEdit ? "Cancel" : match.roomId ? "Edit" : "Set Room ID"}
              </button>
            </div>
            {match.roomId && !showRoomEdit && (
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-[#0a0a0f] border border-[#2a2a36] rounded-xl px-3 py-2 text-[#00ff88] font-mono text-sm">
                  {match.roomId}
                </code>
                <button onClick={() => copyToClipboard(match.roomId, toast)}
                  className="w-8 h-8 bg-[#1a1a24] rounded-xl flex items-center justify-center text-[#a0a0b0] hover:text-white transition-colors">
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
            {!match.roomId && !showRoomEdit && (
              <p className="text-[#4a4a5a] text-xs">No Room ID set yet. Click "Set Room ID" above.</p>
            )}
            {showRoomEdit && (
              <div className="flex gap-2">
                <input type="text" placeholder="e.g. FF123456" value={editRoomId}
                  onChange={(e) => setEditRoomId(e.target.value)} maxLength={50}
                  className="flex-1 bg-[#0a0a0f] border border-[#2a2a36] rounded-xl px-3 py-2 text-white text-sm font-mono placeholder-[#4a4a5a] focus:outline-none focus:border-[#ff6b00] transition-colors"
                />
                <button onClick={handleSaveRoomId} disabled={saving}
                  className="px-3 py-2 bg-[#ff6b00] text-white text-xs font-black rounded-xl hover:bg-[#e66000] disabled:opacity-50 transition-colors">
                  {saving ? "..." : "Save"}
                </button>
              </div>
            )}
          </div>

          {/* Password */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[#a0a0b0] text-xs uppercase tracking-wider font-bold">Password</label>
              <button onClick={() => { setShowPasswordEdit(!showPasswordEdit); setMatchPassword(""); }}
                className="text-[10px] text-[#ff6b00] font-bold uppercase hover:underline">
                {showPasswordEdit ? "Cancel" : match.isPasswordProtected ? "Change" : "Set Password"}
              </button>
            </div>
            {match.isPasswordProtected && !showPasswordEdit && (
              <p className="text-xs text-[#a0a0b0]">Password is set. Players need it to join.</p>
            )}
            {!match.isPasswordProtected && !showPasswordEdit && (
              <p className="text-[#4a4a5a] text-xs">No password. Anyone can join.</p>
            )}
            {showPasswordEdit && (
              <div className="space-y-2">
                <div className="relative">
                  <input type={showPassword ? "text" : "password"} placeholder="New password (blank to remove)"
                    value={matchPassword} onChange={(e) => setMatchPassword(e.target.value)}
                    className="w-full bg-[#0a0a0f] border border-yellow-500/30 rounded-xl px-3 py-2 text-white text-sm placeholder-[#4a4a5a] focus:outline-none focus:border-yellow-400 transition-colors pr-9"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#606070] hover:text-[#a0a0b0]">
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <button onClick={handleSavePassword} disabled={saving}
                  className="w-full py-2 bg-yellow-500/20 border border-yellow-500/30 text-yellow-400 text-xs font-black rounded-xl hover:bg-yellow-500/30 disabled:opacity-50 transition-colors">
                  {saving ? "Saving..." : "Update Password"}
                </button>
              </div>
            )}
          </div>

          {/* Timer controls */}
          {!isActive && effStatus !== "ended" && effStatus !== "cancelled" && effStatus !== "pending_approval" && (
            <div>
              <label className="block text-[#a0a0b0] text-xs uppercase tracking-wider mb-2 font-bold flex items-center gap-1">
                <Timer className="w-3 h-3" />
                {isTimerRunning ? "Timer Running" : "Start Match Timer"}
              </label>
              {isTimerRunning && startsAt ? (
                <div className="bg-[#0a0a0f] rounded-xl px-3 py-2 text-xs text-[#a0a0b0] flex items-center justify-between">
                  <span>Starts at {startsAt.toLocaleTimeString()}</span>
                  <CountdownTimer targetDate={startsAt} className="text-xs" />
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    {[5, 10, 15].map((d) => (
                      <button key={d} type="button" onClick={() => { setTimerDelay(d); setUseCustom(false); }}
                        className={`flex-1 py-2 rounded-xl border text-xs font-black transition-all ${!useCustom && timerDelay === d ? "bg-[#ff6b00]/15 border-[#ff6b00] text-[#ff6b00]" : "bg-[#0a0a0f] border-[#2a2a36] text-[#a0a0b0] hover:border-[#ff6b00]/40"}`}>
                        {d} min
                      </button>
                    ))}
                    <button type="button" onClick={() => setUseCustom(!useCustom)}
                      className={`flex-1 py-2 rounded-xl border text-xs font-black transition-all ${useCustom ? "bg-[#ff6b00]/15 border-[#ff6b00] text-[#ff6b00]" : "bg-[#0a0a0f] border-[#2a2a36] text-[#a0a0b0] hover:border-[#ff6b00]/40"}`}>
                      Custom
                    </button>
                  </div>
                  {useCustom && (
                    <input type="number" min="1" max="120" placeholder="Minutes..."
                      value={customDelay} onChange={(e) => setCustomDelay(e.target.value)}
                      className="w-full bg-[#0a0a0f] border border-[#2a2a36] rounded-xl px-3 py-2 text-white text-sm placeholder-[#4a4a5a] focus:outline-none focus:border-[#ff6b00] transition-colors"
                    />
                  )}
                  <button onClick={handleStartTimer} disabled={startingTimer}
                    className="w-full py-2.5 bg-[#ff6b00]/15 border border-[#ff6b00]/40 text-[#ff6b00] text-xs font-black uppercase rounded-xl hover:bg-[#ff6b00]/25 disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5">
                    <Timer className="w-3.5 h-3.5" />
                    {startingTimer ? "Starting..." : `Start ${useCustom ? (customDelay || "?") : timerDelay}-Minute Countdown`}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Join Requests */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[#a0a0b0] text-xs uppercase tracking-wider font-bold flex items-center gap-1">
                <Users className="w-3 h-3" /> Join Requests
                {pendingReqs.length > 0 && (
                  <span className="ml-1 w-4 h-4 rounded-full bg-[#ff6b00] text-white text-[9px] font-black flex items-center justify-center">
                    {pendingReqs.length}
                  </span>
                )}
              </label>
              <button onClick={loadRequests} disabled={loadingRequests} className="text-[#606070] hover:text-[#a0a0b0] transition-colors">
                <RefreshCw className={`w-3 h-3 ${loadingRequests ? "animate-spin" : ""}`} />
              </button>
            </div>

            {loadingRequests ? (
              <div className="text-center py-3 text-[#606070] text-xs">Loading...</div>
            ) : requests.length === 0 ? (
              <p className="text-[#4a4a5a] text-xs">No requests yet.</p>
            ) : (
              <div className="space-y-2">
                {requests.map((r) => (
                  <div key={r.id} className="bg-[#0a0a0f] rounded-xl p-3 flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-white text-xs font-bold truncate">{r.username || "Unknown"}</div>
                      {r.teamPlayers ? (
                        (() => {
                          try {
                            const players = JSON.parse(r.teamPlayers);
                            return (
                              <div className="text-[#606070] text-[10px] space-y-0.5 mt-0.5">
                                {players.map((p: any, i: number) => (
                                  <div key={i}>P{i + 1}: <span className="text-[#a0a0b0]">{p.name}</span> · UID: <span className="font-mono">{p.uid}</span></div>
                                ))}
                              </div>
                            );
                          } catch { return <div className="text-[#606070] text-[10px]">IGN: {r.inGameName} · UID: {r.gameUid}</div>; }
                        })()
                      ) : (
                        <div className="text-[#606070] text-[10px]">IGN: {r.inGameName} · UID: {r.gameUid}</div>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${REQUEST_STATUS[r.status]?.className ?? ""}`}>
                        {REQUEST_STATUS[r.status]?.label ?? r.status}
                      </span>
                      {r.status === "pending" && (
                        <>
                          <button onClick={() => handleApprove(r.id)}
                            className="w-6 h-6 rounded-lg bg-[#00ff88]/10 text-[#00ff88] flex items-center justify-center hover:bg-[#00ff88]/20 transition-colors">
                            <CheckCircle className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => handleReject(r.id)}
                            className="w-6 h-6 rounded-lg bg-[#ff2244]/10 text-[#ff2244] flex items-center justify-center hover:bg-[#ff2244]/20 transition-colors">
                            <XCircle className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Accepted participants */}
          {acceptedReqs.length > 0 && (
            <div>
              <label className="block text-[#a0a0b0] text-xs uppercase tracking-wider mb-2 font-bold">
                Participants ({acceptedReqs.length})
              </label>
              <div className="space-y-1.5">
                {acceptedReqs.map((r) => (
                  <div key={r.id} className="bg-[#0a0a0f] rounded-lg px-3 py-2 flex items-center justify-between">
                    <div className="text-white text-xs font-bold">{r.username || "Unknown"}</div>
                    <div className="text-[#606070] text-[10px]">{r.inGameName}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Cancel */}
          {effStatus !== "ended" && effStatus !== "cancelled" && (
            <button onClick={handleDelete} disabled={deleting}
              className="w-full py-2 border border-[#ff2244]/20 text-[#ff2244] text-xs font-black uppercase rounded-xl hover:bg-[#ff2244]/5 disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5">
              <Trash2 className="w-3.5 h-3.5" />
              {deleting ? "Cancelling..." : "Cancel & Delete Match"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── My Request Card ───────────────────────────────────────────────────────────

function MyRequestCard({ req }: { req: any }) {
  const { authFetch } = useAuthContext();
  const { toast } = useToast();
  const [roomDetails, setRoomDetails] = useState<any>(null);
  const [loadingRoom, setLoadingRoom] = useState(false);

  const effStatus = getEffectiveStatus(req);
  const isActive = effStatus === "active";
  const canSeeRoom = req.status === "accepted" && isActive;

  const loadRoomDetails = async () => {
    setLoadingRoom(true);
    try {
      const res = await authFetch(`/user-matches/${req.matchId}/details`);
      if (res.ok) setRoomDetails(await res.json());
      else { const d = await res.json(); toast({ title: d.error, variant: "destructive" }); }
    } catch { toast({ title: "Connection error", variant: "destructive" }); }
    finally { setLoadingRoom(false); }
  };

  const reqStatus = REQUEST_STATUS[req.status] ?? REQUEST_STATUS.pending;
  const matchStatusInfo = STATUS_BADGE[effStatus] ?? STATUS_BADGE.waiting;
  const startsAt = getStartsAt(req);

  return (
    <div className="bg-[#12121a] rounded-2xl border border-[#2a2a36] p-4">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <div className="font-black text-white text-sm truncate mb-1">{req.matchName}</div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[#606070] text-xs">by {req.creatorName}</span>
            <span className="text-[#2a2a36]">·</span>
            <span className="text-xs text-[#a0a0b0]">{req.matchType}</span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <span className={`inline-flex items-center text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${reqStatus.className}`}>
            {reqStatus.label}
          </span>
          <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${matchStatusInfo.className}`}>
            {isActive && <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse inline-block" />}
            {matchStatusInfo.label}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-4 text-xs text-[#606070] mb-3">
        <span className="flex items-center gap-1"><Trophy className="w-3 h-3 text-[#ffd700]" /> ৳{Number(req.prizePool).toLocaleString()}</span>
        <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {req.filledSlots}/{req.maxSlots}</span>
        {req.entryFee && Number(req.entryFee) > 0 && (
          <span className="text-[#ff6b00] font-bold">৳{Number(req.entryFee).toLocaleString()} fee</span>
        )}
      </div>

      {/* Timer countdown */}
      {req.timerStartedAt && !isActive && startsAt && (
        <div className="bg-[#0a0a0f] rounded-xl px-3 py-2 flex items-center justify-between mb-3 text-xs">
          <span className="text-[#a0a0b0] flex items-center gap-1"><Timer className="w-3 h-3 text-[#ff6b00]" /> Starts in:</span>
          <CountdownTimer targetDate={startsAt} className="text-xs" />
        </div>
      )}

      {/* Request pending info */}
      {req.status === "pending" && (
        <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-xl px-3 py-2 text-xs text-yellow-400 flex items-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          Waiting for the match creator to approve your request.
        </div>
      )}

      {/* Rejected info */}
      {req.status === "rejected" && (
        <div className="bg-[#ff2244]/5 border border-[#ff2244]/20 rounded-xl px-3 py-2 text-xs text-[#ff2244] flex items-center gap-1.5">
          <XCircle className="w-3.5 h-3.5 shrink-0" />
          Your request was rejected by the creator.
        </div>
      )}

      {/* Accepted but waiting */}
      {req.status === "accepted" && !isActive && (
        <div className="bg-[#00ff88]/5 border border-[#00ff88]/20 rounded-xl px-3 py-2 text-xs text-[#00ff88] flex items-center gap-1.5">
          <CheckCircle className="w-3.5 h-3.5 shrink-0" />
          Accepted! Room details will be shown once the match goes LIVE.
        </div>
      )}

      {/* Accepted + Active → show room details */}
      {canSeeRoom && (
        <div className="mt-3 space-y-2">
          {roomDetails ? (
            <div className="bg-[#0a0a0f] border border-[#00ff88]/20 rounded-xl p-3 space-y-2">
              <div className="text-xs font-bold text-[#00ff88] uppercase flex items-center gap-1">
                <Shield className="w-3.5 h-3.5" /> Room Details
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#a0a0b0] text-xs">Room ID</span>
                <div className="flex items-center gap-2">
                  <code className="text-[#00ff88] font-mono text-sm font-bold">{roomDetails.roomId || "Not set yet"}</code>
                  {roomDetails.roomId && (
                    <button onClick={() => copyToClipboard(roomDetails.roomId, toast)}
                      className="text-[#606070] hover:text-[#a0a0b0] transition-colors">
                      <Copy className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
              {roomDetails.hasPassword && (
                <div className="text-xs text-[#a0a0b0] flex items-center gap-1">
                  <Lock className="w-3 h-3" /> Password was set at creation
                </div>
              )}
            </div>
          ) : (
            <button onClick={loadRoomDetails} disabled={loadingRoom}
              className="w-full py-2.5 bg-[#00ff88]/10 border border-[#00ff88]/30 text-[#00ff88] text-xs font-black uppercase rounded-xl hover:bg-[#00ff88]/20 disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5">
              <Eye className="w-3.5 h-3.5" />
              {loadingRoom ? "Loading..." : "View Room ID & Details"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function MyMatchesPage() {
  const { user, authFetch } = useAuthContext();
  const { openCreateMatch } = useCreateMatch();
  const [tab, setTab] = useState<"mine" | "requests">("mine");
  const [myMatches, setMyMatches] = useState<any[]>([]);
  const [myRequests, setMyRequests] = useState<any[]>([]);
  const [loadingMine, setLoadingMine] = useState(true);
  const [loadingRequests, setLoadingRequests] = useState(true);

  const loadMine = useCallback(async () => {
    setLoadingMine(true);
    try {
      const res = await authFetch("/user-matches/mine");
      if (res.ok) setMyMatches(await res.json());
    } catch {}
    finally { setLoadingMine(false); }
  }, [authFetch]);

  const loadRequests = useCallback(async () => {
    setLoadingRequests(true);
    try {
      const res = await authFetch("/user-matches/my-requests");
      if (res.ok) setMyRequests(await res.json());
    } catch {}
    finally { setLoadingRequests(false); }
  }, [authFetch]);

  useEffect(() => { if (user) { loadMine(); loadRequests(); } }, [user, loadMine, loadRequests]);

  if (!user) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] text-white">
        <Navbar />
        <div className="max-w-2xl mx-auto px-4 pt-28 pb-24 text-center">
          <Swords className="w-12 h-12 text-[#ff6b00]/30 mx-auto mb-4" />
          <h1 className="text-2xl font-black text-white mb-2">My Matches</h1>
          <p className="text-[#a0a0b0] mb-6">Sign in to view and manage your matches.</p>
          <Link href="/sign-in" className="inline-block px-6 py-3 bg-[#ff6b00] text-white font-black uppercase rounded-xl text-sm hover:bg-[#e66000] transition-colors">
            Sign In
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 pt-16 pb-28">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 mb-5 mt-4">
          <div>
            <h1 className="text-2xl font-black uppercase">
              My <span className="text-[#ff6b00]">Matches</span>
            </h1>
            <p className="text-[#a0a0b0] text-sm">Manage your matches and join requests</p>
          </div>
          <button onClick={openCreateMatch}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#ff6b00] text-white font-black uppercase rounded-xl text-sm hover:bg-[#e66000] transition-all shadow-[0_0_16px_rgba(255,107,0,0.3)]">
            <Plus className="w-4 h-4" /> Create
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-[#12121a] rounded-2xl p-1 mb-5 border border-[#2a2a36]">
          <button onClick={() => setTab("mine")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-black uppercase transition-all ${tab === "mine" ? "bg-[#ff6b00] text-white" : "text-[#606070] hover:text-[#a0a0b0]"}`}>
            <Swords className="w-4 h-4" />
            My Matches
            {myMatches.length > 0 && (
              <span className={`w-5 h-5 rounded-full text-[10px] font-black flex items-center justify-center ${tab === "mine" ? "bg-white/20 text-white" : "bg-[#2a2a36] text-[#a0a0b0]"}`}>
                {myMatches.length}
              </span>
            )}
          </button>
          <button onClick={() => setTab("requests")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-black uppercase transition-all ${tab === "requests" ? "bg-[#ff6b00] text-white" : "text-[#606070] hover:text-[#a0a0b0]"}`}>
            <Users className="w-4 h-4" />
            My Requests
            {myRequests.filter((r) => r.status === "pending").length > 0 && (
              <span className="w-5 h-5 rounded-full bg-yellow-500 text-black text-[10px] font-black flex items-center justify-center">
                {myRequests.filter((r) => r.status === "pending").length}
              </span>
            )}
          </button>
        </div>

        {/* Tab: My Created Matches */}
        {tab === "mine" && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-[#a0a0b0] text-xs">Matches you created — set room ID, start timer, manage requests</p>
              <button onClick={loadMine} disabled={loadingMine} className="text-[#606070] hover:text-[#a0a0b0] transition-colors">
                <RefreshCw className={`w-3.5 h-3.5 ${loadingMine ? "animate-spin" : ""}`} />
              </button>
            </div>
            {loadingMine ? (
              <div className="space-y-3">
                {[1, 2].map((i) => <div key={i} className="h-24 bg-[#12121a] rounded-2xl animate-pulse" />)}
              </div>
            ) : myMatches.length === 0 ? (
              <div className="bg-[#12121a] border border-[#ff6b00]/10 rounded-2xl p-10 text-center">
                <Swords className="w-10 h-10 mx-auto mb-3 text-[#ff6b00]/20" />
                <h3 className="font-bold text-white mb-1">No matches yet</h3>
                <p className="text-[#a0a0b0] text-sm mb-4">Create your first match to get started.</p>
                <button onClick={openCreateMatch}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#ff6b00] text-white font-black uppercase rounded-xl text-sm hover:bg-[#e66000] transition-colors">
                  <Plus className="w-4 h-4" /> Create Match
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {myMatches.map((m) => (
                  <MyMatchCard key={m.id} match={m} onRefresh={loadMine} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab: My Join Requests */}
        {tab === "requests" && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-[#a0a0b0] text-xs">Matches you requested to join — track your request status</p>
              <button onClick={loadRequests} disabled={loadingRequests} className="text-[#606070] hover:text-[#a0a0b0] transition-colors">
                <RefreshCw className={`w-3.5 h-3.5 ${loadingRequests ? "animate-spin" : ""}`} />
              </button>
            </div>
            {loadingRequests ? (
              <div className="space-y-3">
                {[1, 2].map((i) => <div key={i} className="h-28 bg-[#12121a] rounded-2xl animate-pulse" />)}
              </div>
            ) : myRequests.length === 0 ? (
              <div className="bg-[#12121a] border border-[#ff6b00]/10 rounded-2xl p-10 text-center">
                <Users className="w-10 h-10 mx-auto mb-3 text-[#ff6b00]/20" />
                <h3 className="font-bold text-white mb-1">No requests yet</h3>
                <p className="text-[#a0a0b0] text-sm mb-4">Join private matches to see your requests here.</p>
                <Link href="/tournaments"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#ff6b00] text-white font-black uppercase rounded-xl text-sm hover:bg-[#e66000] transition-colors">
                  Browse Matches
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {myRequests.map((r) => (
                  <MyRequestCard key={r.joinId} req={r} />
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
