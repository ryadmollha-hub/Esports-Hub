import { useState, useEffect } from "react";
import { X, Swords, CheckCircle, Lock, Globe, Clock, BookOpen, AlertCircle, Map, Globe2 } from "lucide-react";
import { useAuthContext } from "@/lib/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useCreateMatch } from "@/lib/CreateMatchContext";
import { useLocation } from "wouter";

const MATCH_TYPES: { key: string; label: string; sub: string; icon: string; slots: number }[] = [
  { key: "BR",        label: "BR Match",      sub: "Battle Royale",    icon: "🔥", slots: 48 },
  { key: "CS",        label: "Clash Squad",   sub: "CS Mode · 4v4",    icon: "⚔️",  slots: 8 },
  { key: "SOLO",      label: "Solo",          sub: "Solo Survival",    icon: "🎯", slots: 12 },
  { key: "LONE_WOLF", label: "Lone Wolf",     sub: "1v1 Elimination",  icon: "🐺", slots: 12 },
  { key: "FREE",      label: "Free Match",    sub: "Giveaway / Open",  icon: "🎁", slots: 20 },
];

const MAP_OPTIONS = ["Bermuda", "Kalahari", "Alpine", "Purgatory", "Nexterra", "Other"];
const VERSION_OPTIONS = ["Global", "India (OB)", "BD Server", "Custom"];

export default function CreateMatchModal() {
  const { authFetch, user } = useAuthContext();
  const { toast } = useToast();
  const { open, closeCreateMatch } = useCreateMatch();
  const [, setLocation] = useLocation();

  const [form, setForm] = useState({
    matchName: "",
    matchType: "BR",
    scheduledAt: "",
    description: "",
    isPrivate: false,
    password: "",
    prizePool: "",
    mapName: "",
    version: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [created, setCreated] = useState<any>(null);
  const [showRules, setShowRules] = useState(false);
  const [rules, setRules] = useState<string>("");
  const [rulesLoading, setRulesLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setRulesLoading(true);
      fetch("/api/settings/community-match-rules")
        .then((r) => r.json())
        .then((d) => setRules(d.rules ?? ""))
        .catch(() => {})
        .finally(() => setRulesLoading(false));
    }
  }, [open]);

  if (!open) return null;

  const selectedType = MATCH_TYPES.find((t) => t.key === form.matchType) ?? MATCH_TYPES[0];

  const handleClose = () => {
    closeCreateMatch();
    setForm({ matchName: "", matchType: "BR", scheduledAt: "", description: "", isPrivate: false, password: "", prizePool: "", mapName: "", version: "" });
    setCreated(null);
    setShowRules(false);
  };

  const handleManage = () => {
    handleClose();
    setLocation("/my-matches");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { toast({ title: "Sign in required", variant: "destructive" }); return; }
    if (form.isPrivate && !form.password.trim()) {
      toast({ title: "Password required for private match", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      const res = await authFetch("/user-matches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matchName: form.matchName.trim() || undefined,
          matchType: form.matchType,
          scheduledAt: form.scheduledAt || undefined,
          description: form.description || undefined,
          password: form.password.trim() || undefined,
          isPrivate: form.isPrivate,
          prizePool: form.prizePool ? parseFloat(form.prizePool) : undefined,
          mapName: form.mapName || undefined,
          version: form.version || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setCreated(data);
      } else {
        toast({ title: "Error", description: data.error ?? "Failed to create match", variant: "destructive" });
      }
    } catch {
      toast({ title: "Connection error", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-0 sm:p-4">
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={handleClose} />
        <div className="relative w-full sm:max-w-lg bg-[#0d0d16] border border-[#ff6b00]/20 rounded-t-3xl sm:rounded-2xl max-h-[95vh] overflow-y-auto z-10">
          <div className="sm:hidden w-12 h-1 bg-[#2a2a36] rounded-full mx-auto mt-3" />

          <div className="px-5 pt-4 pb-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-[#ff6b00]/15 rounded-xl flex items-center justify-center">
                  <Swords className="w-4 h-4 text-[#ff6b00]" />
                </div>
                <div>
                  <h2 className="font-black text-white text-base uppercase">Create Match</h2>
                  <p className="text-[#606070] text-xs">Submitted for admin review before going live</p>
                </div>
              </div>
              <button onClick={handleClose} className="w-8 h-8 rounded-full bg-[#1a1a24] flex items-center justify-center text-[#a0a0b0] hover:text-white transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {created ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-yellow-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-yellow-400" />
                </div>
                <h3 className="font-black text-white text-lg mb-1">Match Submitted!</h3>
                <p className="text-[#a0a0b0] text-sm mb-2">
                  <span className="font-bold text-white">{created.matchName || `${selectedType.label} Match`}</span> is pending admin approval.
                </p>
                <p className="text-[#606070] text-xs mb-6">Once approved, your match will appear in the <strong className="text-[#ff6b00]">{selectedType.label}</strong> category. Go to <strong className="text-white">My Matches</strong> to manage it.</p>
                <div className="flex gap-3 justify-center">
                  <button onClick={handleClose} className="px-4 py-2.5 bg-[#1a1a24] border border-[#2a2a36] text-white font-bold uppercase rounded-xl text-sm hover:bg-[#2a2a36] transition-colors">
                    Done
                  </button>
                  <button onClick={handleManage} className="px-6 py-2.5 bg-[#ff6b00] text-white font-black uppercase rounded-xl text-sm hover:bg-[#e66000] transition-colors">
                    My Matches →
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">

                {/* Match Type Grid */}
                <div>
                  <label className="block text-[#a0a0b0] text-xs uppercase tracking-wider mb-2 font-bold">Match Format</label>
                  <div className="grid grid-cols-5 gap-1.5">
                    {MATCH_TYPES.map((t) => (
                      <button
                        key={t.key}
                        type="button"
                        onClick={() => setForm({ ...form, matchType: t.key })}
                        className={`flex flex-col items-center gap-1 py-2.5 px-1 rounded-xl border text-center transition-all ${
                          form.matchType === t.key
                            ? "bg-[#ff6b00]/15 border-[#ff6b00] text-[#ff6b00]"
                            : "bg-[#12121a] border-[#2a2a36] text-[#a0a0b0] hover:border-[#ff6b00]/40"
                        }`}
                      >
                        <span className="text-xl leading-none">{t.icon}</span>
                        <span className="text-[10px] font-black uppercase leading-tight">{t.label}</span>
                      </button>
                    ))}
                  </div>
                  <p className="text-[#4a4a5a] text-xs mt-1.5">{selectedType.sub} · {selectedType.slots} slots max</p>
                </div>

                {/* Match Name */}
                <div>
                  <label className="block text-[#a0a0b0] text-xs uppercase tracking-wider mb-1.5 font-bold">
                    Match Name <span className="normal-case text-[#4a4a5a]">(optional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Sunday Showdown, Squad Wars..."
                    value={form.matchName}
                    onChange={(e) => setForm({ ...form, matchName: e.target.value })}
                    maxLength={80}
                    className="w-full bg-[#0a0a0f] border border-[#2a2a36] rounded-xl px-4 py-2.5 text-white text-sm placeholder-[#4a4a5a] focus:outline-none focus:border-[#ff6b00] transition-colors"
                  />
                </div>

                {/* Prize Pool */}
                <div>
                  <label className="block text-[#a0a0b0] text-xs uppercase tracking-wider mb-1.5 font-bold">
                    Prize Pool (৳) <span className="normal-case text-[#4a4a5a]">(optional)</span>
                  </label>
                  <input
                    type="number" placeholder="e.g. 10000" value={form.prizePool}
                    onChange={(e) => setForm({ ...form, prizePool: e.target.value })}
                    min="0" step="1"
                    className="w-full bg-[#0a0a0f] border border-[#2a2a36] rounded-xl px-3 py-2.5 text-white text-sm placeholder-[#4a4a5a] focus:outline-none focus:border-[#ff6b00] transition-colors"
                  />
                </div>

                {/* Map + Version */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[#a0a0b0] text-xs uppercase tracking-wider mb-1.5 font-bold flex items-center gap-1">
                      <Map className="w-3 h-3" /> Map
                    </label>
                    <select value={form.mapName} onChange={(e) => setForm({ ...form, mapName: e.target.value })}
                      className="w-full bg-[#0a0a0f] border border-[#2a2a36] rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#ff6b00] transition-colors">
                      <option value="">Any</option>
                      {MAP_OPTIONS.map((m) => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[#a0a0b0] text-xs uppercase tracking-wider mb-1.5 font-bold flex items-center gap-1">
                      <Globe2 className="w-3 h-3" /> Version
                    </label>
                    <select value={form.version} onChange={(e) => setForm({ ...form, version: e.target.value })}
                      className="w-full bg-[#0a0a0f] border border-[#2a2a36] rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#ff6b00] transition-colors">
                      <option value="">Any</option>
                      {VERSION_OPTIONS.map((v) => <option key={v} value={v}>{v}</option>)}
                    </select>
                  </div>
                </div>

                {/* Match Start Time */}
                <div>
                  <label className="block text-[#a0a0b0] text-xs uppercase tracking-wider mb-1.5 font-bold">
                    Match Start Time <span className="normal-case text-[#4a4a5a]">(optional)</span>
                  </label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#4a4a5a] pointer-events-none" />
                    <input
                      type="datetime-local"
                      value={form.scheduledAt}
                      onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })}
                      className="w-full bg-[#0a0a0f] border border-[#2a2a36] rounded-xl pl-10 pr-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#ff6b00] transition-colors [color-scheme:dark]"
                    />
                  </div>
                </div>

                {/* Visibility */}
                <div>
                  <label className="block text-[#a0a0b0] text-xs uppercase tracking-wider mb-2 font-bold">Match Visibility</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button type="button" onClick={() => setForm({ ...form, isPrivate: false, password: "" })}
                      className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-bold transition-all ${!form.isPrivate ? "bg-[#00ff88]/10 border-[#00ff88]/50 text-[#00ff88]" : "bg-[#12121a] border-[#2a2a36] text-[#a0a0b0] hover:border-[#2a2a36]/80"}`}>
                      <Globe className="w-4 h-4" /> Public
                    </button>
                    <button type="button" onClick={() => setForm({ ...form, isPrivate: true })}
                      className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-bold transition-all ${form.isPrivate ? "bg-yellow-500/10 border-yellow-500/50 text-yellow-400" : "bg-[#12121a] border-[#2a2a36] text-[#a0a0b0] hover:border-[#2a2a36]/80"}`}>
                      <Lock className="w-4 h-4" /> Private
                    </button>
                  </div>
                  <p className="text-[#4a4a5a] text-xs mt-1.5">
                    {form.isPrivate ? "Only visible in your My Matches — invite only." : "Visible in the public community match category."}
                  </p>
                  {form.isPrivate && (
                    <div className="mt-2">
                      <input type="password" placeholder="Set a match password..."
                        value={form.password}
                        onChange={(e) => setForm({ ...form, password: e.target.value })}
                        className="w-full bg-[#0a0a0f] border border-yellow-500/30 rounded-xl px-4 py-2.5 text-white text-sm placeholder-[#4a4a5a] focus:outline-none focus:border-yellow-400 transition-colors"
                      />
                    </div>
                  )}
                </div>

                {/* Description */}
                <div>
                  <label className="block text-[#a0a0b0] text-xs uppercase tracking-wider mb-1.5 font-bold">
                    Description <span className="normal-case text-[#4a4a5a]">(optional)</span>
                  </label>
                  <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                    maxLength={500} rows={2} placeholder="Notes, requirements, rules..."
                    className="w-full bg-[#0a0a0f] border border-[#2a2a36] rounded-xl px-4 py-2.5 text-white text-sm placeholder-[#4a4a5a] focus:outline-none focus:border-[#ff6b00] transition-colors resize-none"
                  />
                </div>

                {/* Info bar */}
                <div className="bg-[#ff6b00]/5 border border-[#ff6b00]/15 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
                  <div className="flex items-start gap-2 flex-1 min-w-0">
                    <AlertCircle className="w-3.5 h-3.5 text-[#ff6b00] mt-0.5 shrink-0" />
                    <span className="text-xs text-[#a0a0b0]">Set Room ID and start countdown from <strong className="text-white">My Matches</strong>. Room details auto-reveal 10 min before start.</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowRules(true)}
                    className="flex items-center gap-1.5 text-xs font-black text-[#ff6b00] uppercase hover:text-[#e66000] shrink-0 border border-[#ff6b00]/30 rounded-lg px-2.5 py-1.5 hover:bg-[#ff6b00]/10 transition-all"
                  >
                    <BookOpen className="w-3.5 h-3.5" /> Rules
                  </button>
                </div>

                <button type="submit" disabled={submitting}
                  className="w-full py-3 bg-[#ff6b00] text-white font-black uppercase rounded-xl text-sm hover:bg-[#e66000] disabled:opacity-50 transition-all shadow-[0_0_20px_rgba(255,107,0,0.3)]">
                  {submitting ? "Submitting..." : "Submit for Approval"}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* Rules Modal */}
      {showRules && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/85 backdrop-blur-sm" onClick={() => setShowRules(false)} />
          <div className="relative w-full max-w-md bg-[#0d0d16] border border-[#ff6b00]/20 rounded-2xl z-10 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-[#2a2a36]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-[#ff6b00]/15 rounded-xl flex items-center justify-center">
                  <BookOpen className="w-4 h-4 text-[#ff6b00]" />
                </div>
                <div>
                  <h3 className="font-black text-white text-sm uppercase">Match Rules</h3>
                  <p className="text-[#606070] text-xs">Community match guidelines</p>
                </div>
              </div>
              <button onClick={() => setShowRules(false)} className="w-7 h-7 rounded-full bg-[#1a1a24] flex items-center justify-center text-[#a0a0b0] hover:text-white transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="p-5 overflow-y-auto">
              {rulesLoading ? (
                <div className="space-y-2">
                  {[1,2,3,4].map(i => <div key={i} className="h-4 bg-[#1a1a24] rounded animate-pulse" />)}
                </div>
              ) : rules ? (
                <div className="space-y-2">
                  {rules.split("\n").filter(Boolean).map((line, i) => (
                    <div key={i} className="flex items-start gap-2.5 text-sm">
                      <span className="text-[#ff6b00] font-black shrink-0 mt-0.5">›</span>
                      <span className="text-[#c0c0d0] leading-relaxed">{line.replace(/^\d+\.\s*/, "")}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[#606070] text-sm text-center py-4">No rules set yet.</p>
              )}
            </div>
            <div className="p-4 border-t border-[#2a2a36]">
              <button onClick={() => setShowRules(false)}
                className="w-full py-2.5 bg-[#ff6b00] text-white font-black uppercase rounded-xl text-sm hover:bg-[#e66000] transition-colors">
                Got It
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
