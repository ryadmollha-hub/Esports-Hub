import { useState } from "react";
import { X, Swords, CheckCircle, Lock, Globe } from "lucide-react";
import { useAuthContext } from "@/lib/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useCreateMatch } from "@/lib/CreateMatchContext";
import { useLocation } from "wouter";

const MATCH_TYPES = ["1v1", "2v2", "3v3", "4v4"];
const PRIZE_PRESETS = [1000, 5000, 10000, 15000, 20000];
const SLOTS_FOR_TYPE: Record<string, number> = { "1v1": 2, "2v2": 4, "3v3": 6, "4v4": 8 };

export default function CreateMatchModal() {
  const { authFetch, user } = useAuthContext();
  const { toast } = useToast();
  const { open, closeCreateMatch } = useCreateMatch();
  const [, setLocation] = useLocation();

  const [form, setForm] = useState({
    matchName: "",
    matchType: "1v1",
    prizePool: "",
    customPrize: "",
    scheduledAt: "",
    description: "",
    isPrivate: false,
    password: "",
  });
  const [useCustomPrize, setUseCustomPrize] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (!open) return null;

  const prizeValue = useCustomPrize ? form.customPrize : form.prizePool;
  const slots = SLOTS_FOR_TYPE[form.matchType] ?? 2;

  const handleClose = () => {
    closeCreateMatch();
    setForm({ matchName: "", matchType: "1v1", prizePool: "", customPrize: "", scheduledAt: "", description: "", isPrivate: false, password: "" });
    setUseCustomPrize(false);
    setSubmitted(false);
  };

  const handleDone = () => {
    handleClose();
    setLocation("/profile");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { toast({ title: "Sign in required", variant: "destructive" }); return; }
    if (!prizeValue || parseFloat(prizeValue) <= 0) {
      toast({ title: "Select or enter a prize pool", variant: "destructive" });
      return;
    }
    if (form.isPrivate && !form.password.trim()) {
      toast({ title: "Password required", description: "Please set a password for your private match.", variant: "destructive" });
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
          prizePool: parseFloat(prizeValue),
          scheduledAt: form.scheduledAt,
          description: form.description || undefined,
          password: form.isPrivate ? form.password.trim() : undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setSubmitted(true);
      } else {
        toast({ title: "Error", description: data.error ?? "Failed to submit", variant: "destructive" });
      }
    } catch {
      toast({ title: "Connection error", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
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
                <p className="text-[#606070] text-xs">Submit for admin approval</p>
              </div>
            </div>
            <button onClick={handleClose} className="w-8 h-8 rounded-full bg-[#1a1a24] flex items-center justify-center text-[#a0a0b0] hover:text-white transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          {submitted ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-[#00ff88]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-[#00ff88]" />
              </div>
              <h3 className="font-black text-white text-lg mb-1">Submitted!</h3>
              <p className="text-[#a0a0b0] text-sm mb-6">Your match is pending admin approval. Track its status in your profile under <strong className="text-white">My Match Requests</strong>.</p>
              <button onClick={handleDone} className="px-6 py-2.5 bg-[#ff6b00] text-white font-black uppercase rounded-xl text-sm hover:bg-[#e66000] transition-colors">
                View My Requests
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">

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

              {/* Match Type */}
              <div>
                <label className="block text-[#a0a0b0] text-xs uppercase tracking-wider mb-2 font-bold">Match Type</label>
                <div className="grid grid-cols-4 gap-2">
                  {MATCH_TYPES.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setForm({ ...form, matchType: t })}
                      className={`py-2.5 rounded-xl border text-sm font-black uppercase transition-all ${
                        form.matchType === t
                          ? "bg-[#ff6b00]/15 border-[#ff6b00] text-[#ff6b00]"
                          : "bg-[#12121a] border-[#2a2a36] text-[#a0a0b0] hover:border-[#ff6b00]/40"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
                <p className="text-[#4a4a5a] text-xs mt-1.5">{slots} players total · {slots} slots to fill</p>
              </div>

              {/* Prize Pool */}
              <div>
                <label className="block text-[#a0a0b0] text-xs uppercase tracking-wider mb-2 font-bold">Prize Pool (৳)</label>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mb-2">
                  {PRIZE_PRESETS.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => { setForm({ ...form, prizePool: String(p) }); setUseCustomPrize(false); }}
                      className={`py-2 rounded-xl border text-xs font-black transition-all ${
                        !useCustomPrize && form.prizePool === String(p)
                          ? "bg-[#ff6b00]/15 border-[#ff6b00] text-[#ff6b00]"
                          : "bg-[#12121a] border-[#2a2a36] text-[#a0a0b0] hover:border-[#ff6b00]/40"
                      }`}
                    >
                      ৳{p.toLocaleString()}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setUseCustomPrize(!useCustomPrize)}
                    className={`text-xs font-bold uppercase px-3 py-1.5 rounded-lg border transition-colors ${useCustomPrize ? "border-[#ff6b00]/40 text-[#ff6b00] bg-[#ff6b00]/10" : "border-[#2a2a36] text-[#606070] hover:text-[#a0a0b0]"}`}
                  >
                    Custom
                  </button>
                  {useCustomPrize && (
                    <input
                      type="number"
                      min="1"
                      placeholder="Enter amount..."
                      value={form.customPrize}
                      onChange={(e) => setForm({ ...form, customPrize: e.target.value })}
                      className="flex-1 bg-[#0a0a0f] border border-[#2a2a36] rounded-xl px-3 py-1.5 text-white text-sm placeholder-[#4a4a5a] focus:outline-none focus:border-[#ff6b00] transition-colors"
                    />
                  )}
                </div>
              </div>

              {/* Date & Time */}
              <div>
                <label className="block text-[#a0a0b0] text-xs uppercase tracking-wider mb-1.5 font-bold">Match Date & Time *</label>
                <input
                  type="datetime-local"
                  value={form.scheduledAt}
                  onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })}
                  required
                  min={new Date(Date.now() + 60000).toISOString().slice(0, 16)}
                  className="w-full bg-[#0a0a0f] border border-[#2a2a36] rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#ff6b00] transition-colors"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-[#a0a0b0] text-xs uppercase tracking-wider mb-1.5 font-bold">Description <span className="normal-case text-[#4a4a5a]">(optional)</span></label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  maxLength={500}
                  rows={3}
                  placeholder="Any extra details about this match..."
                  className="w-full bg-[#0a0a0f] border border-[#2a2a36] rounded-xl px-4 py-2.5 text-white text-sm placeholder-[#4a4a5a] focus:outline-none focus:border-[#ff6b00] transition-colors resize-none"
                />
              </div>

              {/* Privacy */}
              <div>
                <label className="block text-[#a0a0b0] text-xs uppercase tracking-wider mb-2 font-bold">Match Visibility</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, isPrivate: false, password: "" })}
                    className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-bold transition-all ${
                      !form.isPrivate
                        ? "bg-[#00ff88]/10 border-[#00ff88]/50 text-[#00ff88]"
                        : "bg-[#12121a] border-[#2a2a36] text-[#a0a0b0] hover:border-[#2a2a36]/80"
                    }`}
                  >
                    <Globe className="w-4 h-4" /> Public
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, isPrivate: true })}
                    className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-bold transition-all ${
                      form.isPrivate
                        ? "bg-yellow-500/10 border-yellow-500/50 text-yellow-400"
                        : "bg-[#12121a] border-[#2a2a36] text-[#a0a0b0] hover:border-[#2a2a36]/80"
                    }`}
                  >
                    <Lock className="w-4 h-4" /> Private
                  </button>
                </div>
                {form.isPrivate && (
                  <div className="mt-2">
                    <input
                      type="password"
                      placeholder="Set a match password..."
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      className="w-full bg-[#0a0a0f] border border-yellow-500/30 rounded-xl px-4 py-2.5 text-white text-sm placeholder-[#4a4a5a] focus:outline-none focus:border-yellow-400 transition-colors"
                    />
                    <p className="text-[#606070] text-xs mt-1">Players must enter this password to join.</p>
                  </div>
                )}
              </div>

              <div className="bg-[#ff6b00]/5 border border-[#ff6b00]/15 rounded-xl px-4 py-3 text-xs text-[#a0a0b0]">
                <span className="text-[#ff6b00] font-bold">Note: </span>
                After submission your match is sent for admin review. Once approved, it becomes visible and players can join. The entry fee is set by the admin.
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 bg-[#ff6b00] text-white font-black uppercase rounded-xl text-sm hover:bg-[#e66000] disabled:opacity-50 transition-all shadow-[0_0_20px_rgba(255,107,0,0.3)]"
              >
                {submitting ? "Submitting..." : "Submit for Approval"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
