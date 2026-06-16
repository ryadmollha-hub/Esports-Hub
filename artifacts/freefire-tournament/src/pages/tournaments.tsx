import { useState, useEffect } from "react";
import { Search, Trophy, Filter, Plus, X, ChevronDown, Users, Calendar, Swords, CheckCircle } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import TournamentCard from "@/components/TournamentCard";
import { useListTournaments, getListTournamentsQueryKey } from "@workspace/api-client-react";
import { useAuthContext } from "@/lib/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const MODES = ["", "solo", "duo", "squad"];
const STATUSES = ["", "upcoming", "ongoing", "completed"];

const MATCH_TYPES = ["1v1", "2v2", "3v3", "4v4"];
const PRIZE_PRESETS = [1000, 5000, 10000, 15000, 20000];
const SLOTS_FOR_TYPE: Record<string, number> = { "1v1": 2, "2v2": 4, "3v3": 6, "4v4": 8 };

function CreateMatchModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const { authFetch } = useAuthContext();
  const { toast } = useToast();
  const [form, setForm] = useState({ matchType: "1v1", prizePool: "", customPrize: "", scheduledAt: "", description: "" });
  const [useCustomPrize, setUseCustomPrize] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const prizeValue = useCustomPrize ? form.customPrize : form.prizePool;
  const slots = SLOTS_FOR_TYPE[form.matchType] ?? 2;
  const entryFee = prizeValue ? (parseFloat(prizeValue) / slots).toFixed(2) : "—";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prizeValue || parseFloat(prizeValue) <= 0) {
      toast({ title: "Select or enter a prize pool", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const res = await authFetch("/api/user-matches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matchType: form.matchType,
          prizePool: parseFloat(prizeValue),
          scheduledAt: form.scheduledAt,
          description: form.description || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setSubmitted(true);
        onSuccess();
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
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-lg bg-[#0d0d16] border border-[#ff6b00]/20 rounded-t-3xl sm:rounded-2xl max-h-[95vh] overflow-y-auto z-10">
        {/* Handle bar (mobile) */}
        <div className="sm:hidden w-12 h-1 bg-[#2a2a36] rounded-full mx-auto mt-3" />

        <div className="px-5 pt-4 pb-6">
          {/* Header */}
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
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-[#1a1a24] flex items-center justify-center text-[#a0a0b0] hover:text-white transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          {submitted ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-[#00ff88]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-[#00ff88]" />
              </div>
              <h3 className="font-black text-white text-lg mb-1">Submitted!</h3>
              <p className="text-[#a0a0b0] text-sm mb-6">Your match is pending admin approval. Once approved, it will appear in the tournament list.</p>
              <button onClick={onClose} className="px-6 py-2.5 bg-[#ff6b00] text-white font-black uppercase rounded-xl text-sm hover:bg-[#e66000] transition-colors">
                Done
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
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
                {prizeValue && parseFloat(prizeValue) > 0 && (
                  <p className="text-[#a0a0b0] text-xs mt-1.5">
                    Entry fee per player: <span className="text-[#00ff88] font-bold">৳{entryFee}</span>
                  </p>
                )}
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

              {/* Info box */}
              <div className="bg-[#ff6b00]/5 border border-[#ff6b00]/15 rounded-xl px-4 py-3 text-xs text-[#a0a0b0]">
                <span className="text-[#ff6b00] font-bold">Note: </span>
                After submission your match is locked and sent for admin review. Once approved, it becomes public and other players can join by paying the entry fee from their wallet.
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

function CommunityMatchCard({ match, onJoin }: { match: any; onJoin: (id: number) => void }) {
  const { user } = useAuthContext();
  const slots = match.maxSlots ?? 2;
  const filled = match.filledSlots ?? 0;
  const pct = slots > 0 ? (filled / slots) * 100 : 0;
  const isFull = filled >= slots;

  return (
    <div className="bg-[#12121a] border border-[#ff6b00]/10 hover:border-[#ff6b00]/30 rounded-2xl p-4 transition-all group">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 bg-[#ff6b00]/10 rounded-xl flex items-center justify-center shrink-0">
            <Swords className="w-4 h-4 text-[#ff6b00]" />
          </div>
          <div>
            <div className="font-black text-white text-sm">{match.matchType} Community Match</div>
            <div className="text-[#606070] text-xs">by {match.creatorName ?? "Unknown"}</div>
          </div>
        </div>
        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-[#00ff88]/10 text-[#00ff88] border border-[#00ff88]/20 shrink-0">Open</span>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
        <div className="bg-[#0a0a0f] rounded-xl px-3 py-2">
          <div className="text-[#606070] mb-0.5">Prize Pool</div>
          <div className="font-black text-[#ffd700]">৳{Number(match.prizePool).toLocaleString()}</div>
        </div>
        <div className="bg-[#0a0a0f] rounded-xl px-3 py-2">
          <div className="text-[#606070] mb-0.5">Entry Fee</div>
          <div className="font-black text-[#00ff88]">৳{Number(match.entryFee).toLocaleString()}</div>
        </div>
      </div>

      <div className="mb-3">
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="text-[#606070] flex items-center gap-1"><Users className="w-3 h-3" /> Players</span>
          <span className="text-white font-bold">{filled}/{slots}</span>
        </div>
        <div className="h-1.5 bg-[#0a0a0f] rounded-full overflow-hidden">
          <div className="h-full bg-[#ff6b00] rounded-full transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1 text-[#606070] text-xs">
          <Calendar className="w-3 h-3" />
          <span>{new Date(match.scheduledAt).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
        </div>
        {!user ? (
          <Link href="/sign-in" className="px-3 py-1.5 bg-[#ff6b00] text-white font-black uppercase rounded-lg text-xs hover:bg-[#e66000] transition-colors">
            Sign in to join
          </Link>
        ) : isFull ? (
          <span className="px-3 py-1.5 bg-[#2a2a36] text-[#606070] font-black uppercase rounded-lg text-xs">Full</span>
        ) : (
          <button
            onClick={() => onJoin(match.id)}
            className="px-3 py-1.5 bg-[#ff6b00] text-white font-black uppercase rounded-lg text-xs hover:bg-[#e66000] transition-colors shadow-[0_0_12px_rgba(255,107,0,0.25)]"
          >
            Join · ৳{Number(match.entryFee).toLocaleString()}
          </button>
        )}
      </div>

      {match.description && (
        <p className="text-[#4a4a5a] text-xs mt-2.5 italic">"{match.description}"</p>
      )}
    </div>
  );
}

export default function TournamentsPage() {
  const [search, setSearch] = useState("");
  const [mode, setMode] = useState("");
  const [status, setStatus] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [communityMatches, setCommunityMatches] = useState<any[]>([]);
  const [communityLoading, setCommunityLoading] = useState(true);
  const { user, authFetch } = useAuthContext();
  const { toast } = useToast();

  const params = {
    ...(search && { search }),
    ...(mode && { mode: mode as "solo" | "duo" | "squad" }),
    ...(status && { status: status as "upcoming" | "ongoing" | "completed" }),
  };

  const { data: tournamentsData, isLoading } = useListTournaments(params, {
    query: { queryKey: getListTournamentsQueryKey(params) },
  });
  const tournaments: any[] = (tournamentsData as any)?.tournaments ?? (Array.isArray(tournamentsData) ? tournamentsData : []);

  const fetchCommunityMatches = () => {
    setCommunityLoading(true);
    fetch(`${BASE}/api/user-matches`)
      .then((r) => r.json())
      .then((d) => Array.isArray(d) ? setCommunityMatches(d) : setCommunityMatches([]))
      .catch(() => setCommunityMatches([]))
      .finally(() => setCommunityLoading(false));
  };

  useEffect(() => { fetchCommunityMatches(); }, []);

  const handleJoin = async (matchId: number) => {
    if (!user) return;
    try {
      const res = await authFetch(`/api/user-matches/${matchId}/join`, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        toast({ title: "Joined!", description: data.message });
        fetchCommunityMatches();
      } else {
        toast({ title: "Could not join", description: data.error ?? "Failed", variant: "destructive" });
      }
    } catch {
      toast({ title: "Connection error", variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 pt-16 pb-24">

        {/* Header + Create Match button */}
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <h1 className="text-3xl md:text-4xl font-black uppercase mb-1" data-testid="heading-tournaments">
              All <span className="text-[#ff6b00]">Tournaments</span>
            </h1>
            <p className="text-[#a0a0b0] text-sm">Find and join the hottest Free Fire competitions</p>
          </div>
          {user && (
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#ff6b00] text-white font-black uppercase rounded-xl text-sm hover:bg-[#e66000] transition-all shadow-[0_0_20px_rgba(255,107,0,0.3)] shrink-0 whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Create Match</span>
              <span className="sm:hidden">+ Match</span>
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-2.5 mb-5">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#a0a0b0]" />
            <input
              type="text"
              placeholder="Search tournaments..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              data-testid="input-search-tournaments"
              className="w-full pl-9 pr-3 py-2 bg-[#12121a] border border-[#2a2a36] rounded-xl text-white placeholder-[#a0a0b0] focus:outline-none focus:border-[#ff6b00] transition-colors text-sm"
            />
          </div>
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value)}
            data-testid="select-filter-mode"
            className="px-3 py-2 bg-[#12121a] border border-[#2a2a36] rounded-xl text-white focus:outline-none focus:border-[#ff6b00] transition-colors text-sm"
          >
            <option value="">All Modes</option>
            <option value="solo">Solo</option>
            <option value="duo">Duo</option>
            <option value="squad">Squad</option>
          </select>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            data-testid="select-filter-status"
            className="px-3 py-2 bg-[#12121a] border border-[#2a2a36] rounded-xl text-white focus:outline-none focus:border-[#ff6b00] transition-colors text-sm"
          >
            <option value="">All Status</option>
            <option value="upcoming">Upcoming</option>
            <option value="ongoing">Ongoing</option>
            <option value="completed">Completed</option>
          </select>
        </div>

        {/* Official Tournaments */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1,2,3,4,5,6].map((i) => (
              <div key={i} className="h-48 bg-[#12121a] rounded-xl animate-pulse" data-testid={`skeleton-card-${i}`} />
            ))}
          </div>
        ) : tournaments.length === 0 ? (
          <div className="text-center py-16">
            <Trophy className="w-12 h-12 mx-auto mb-3 text-[#ff6b00]/30" />
            <h3 className="text-lg font-bold text-white mb-1">No tournaments found</h3>
            <p className="text-[#a0a0b0] text-sm">Try adjusting your filters or check back later</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tournaments.map((t: any) => <TournamentCard key={t.id} t={t} />)}
          </div>
        )}

        {/* Community Matches Section */}
        <div className="mt-12">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-black uppercase">
                Community <span className="text-[#ff6b00]">Matches</span>
              </h2>
              <p className="text-[#a0a0b0] text-xs mt-0.5">Player-created matches — join and compete</p>
            </div>
            {!user && (
              <Link href="/sign-up" className="text-xs text-[#ff6b00] font-bold hover:underline">
                Sign up to create
              </Link>
            )}
          </div>

          {communityLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1,2,3].map((i) => <div key={i} className="h-44 bg-[#12121a] rounded-2xl animate-pulse" />)}
            </div>
          ) : communityMatches.length === 0 ? (
            <div className="bg-[#12121a] border border-[#ff6b00]/10 rounded-2xl p-10 text-center">
              <Swords className="w-10 h-10 mx-auto mb-3 text-[#ff6b00]/20" />
              <h3 className="font-bold text-white mb-1">No community matches yet</h3>
              <p className="text-[#a0a0b0] text-sm mb-4">Be the first to create a match!</p>
              {user ? (
                <button
                  onClick={() => setShowCreate(true)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#ff6b00] text-white font-black uppercase rounded-xl text-sm hover:bg-[#e66000] transition-colors"
                >
                  <Plus className="w-4 h-4" /> Create Match
                </button>
              ) : (
                <Link href="/sign-in" className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#ff6b00] text-white font-black uppercase rounded-xl text-sm hover:bg-[#e66000] transition-colors">
                  Sign in to create
                </Link>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {communityMatches.map((m) => (
                <CommunityMatchCard key={m.id} match={m} onJoin={handleJoin} />
              ))}
            </div>
          )}
        </div>

      </div>
      <Footer />

      {/* Create Match Modal */}
      {showCreate && (
        <CreateMatchModal
          onClose={() => setShowCreate(false)}
          onSuccess={fetchCommunityMatches}
        />
      )}
    </div>
  );
}
