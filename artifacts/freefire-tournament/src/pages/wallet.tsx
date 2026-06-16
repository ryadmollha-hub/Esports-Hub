import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import {
  Wallet, ArrowDownCircle, ArrowUpCircle, Clock, CheckCircle,
  XCircle, TrendingUp, TrendingDown, RefreshCw, AlertCircle,
  X, History, Trophy, Zap, Tag, Copy, Info, ImagePlus
} from "lucide-react";
import Navbar from "@/components/Navbar";
import { useAuthContext } from "@/lib/AuthContext";
import { useToast } from "@/hooks/use-toast";

async function safeJson(res: Response): Promise<any> {
  try {
    const text = await res.text();
    if (!text || !text.trim()) return {};
    return JSON.parse(text);
  } catch {
    return {};
  }
}

type TxStatus = "pending" | "approved" | "rejected";
type TxType = "deposit" | "withdraw" | "tournament_entry" | "tournament_prize";

interface WalletBalance {
  balance: number;
  totalDeposit: number;
  totalWithdraw: number;
  totalEntryFees?: number;
  totalPrizes?: number;
  pendingDeposit: number;
  pendingWithdraw: number;
}

interface Transaction {
  id: number;
  type: TxType;
  amount: string;
  method?: string | null;
  accountNumber?: string | null;
  transactionId?: string | null;
  status: TxStatus;
  adminNote?: string | null;
  notes?: string | null;
  tournamentId?: number | null;
  createdAt: string;
}

const statusConfig = {
  approved: { color: "text-[#00ff88]", bg: "bg-[#00ff88]/10", border: "border-[#00ff88]/30", icon: CheckCircle, label: "Approved" },
  rejected: { color: "text-[#ff2244]", bg: "bg-[#ff2244]/10", border: "border-[#ff2244]/30", icon: XCircle, label: "Rejected" },
  pending:  { color: "text-yellow-400",  bg: "bg-yellow-400/10",  border: "border-yellow-400/30",  icon: Clock,        label: "Pending" },
};

const txTypeConfig: Record<TxType, { label: string; icon: any; color: string; bg: string; sign: string }> = {
  deposit:          { label: "Deposit",      icon: ArrowDownCircle, color: "text-[#00ff88]", bg: "bg-[#00ff88]/10", sign: "+" },
  withdraw:         { label: "Withdrawal",   icon: ArrowUpCircle,   color: "text-[#ff6b00]", bg: "bg-[#ff6b00]/10", sign: "-" },
  tournament_entry: { label: "Entry Fee",    icon: Trophy,          color: "text-[#ff2244]", bg: "bg-[#ff2244]/10", sign: "-" },
  tournament_prize: { label: "Prize Won",    icon: Zap,             color: "text-[#ffd700]", bg: "bg-[#ffd700]/10", sign: "+" },
};

type FilterType = "all" | "deposit" | "withdraw" | "tournament_entry" | "tournament_prize";

export default function WalletPage() {
  const { user, isLoading, authFetch } = useAuthContext();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [balance, setBalance] = useState<WalletBalance | null>(null);
  const [txs, setTxs] = useState<Transaction[]>([]);
  const [loadingBalance, setLoadingBalance] = useState(true);
  const [loadingTxs, setLoadingTxs] = useState(true);
  const [activeModal, setActiveModal] = useState<"deposit" | "withdraw" | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const [submitting, setSubmitting] = useState(false);

  const [depositForm, setDepositForm] = useState({
    amount: "", method: "bkash", accountNumber: "", transactionId: "", screenshot: ""
  });
  const [withdrawForm, setWithdrawForm] = useState({
    amount: "", method: "bkash", accountNumber: ""
  });
  const [promoCode, setPromoCode] = useState("");
  const [applyingPromo, setApplyingPromo] = useState(false);
  const [paymentSettings, setPaymentSettings] = useState<Record<string, string>>({
    bkash_number: "01606622867",
    nagad_number: "01606622867",
    rocket_number: "01606622867",
  });

  useEffect(() => {
    if (!isLoading && !user) setLocation("/sign-in");
  }, [isLoading, user]);

  useEffect(() => {
    const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
    fetch(`${BASE}/api/payment-settings`)
      .then(async (r) => {
        if (!r.ok) return;
        const d = await safeJson(r);
        if (d && d.bkash_number) setPaymentSettings(d);
      })
      .catch(() => {});
  }, []);

  const loadBalance = useCallback(async () => {
    setLoadingBalance(true);
    try {
      const res = await authFetch("/wallet/balance");
      if (res.ok) setBalance(await res.json());
    } catch {} finally { setLoadingBalance(false); }
  }, [authFetch]);

  const loadTxs = useCallback(async () => {
    setLoadingTxs(true);
    try {
      const res = await authFetch("/wallet/my-transactions");
      if (res.ok) setTxs(await res.json());
    } catch {} finally { setLoadingTxs(false); }
  }, [authFetch]);

  useEffect(() => {
    if (user) { loadBalance(); loadTxs(); }
  }, [user]);

  const refresh = () => { loadBalance(); loadTxs(); };

  const submitDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await authFetch("/wallet/deposit", {
        method: "POST",
        body: JSON.stringify({ ...depositForm, amount: parseFloat(depositForm.amount) }),
      });
      const data = await safeJson(res);
      if (res.ok) {
        toast({ title: "Deposit Requested!", description: "Admin will review within 24 hours." });
        setActiveModal(null);
        setDepositForm({ amount: "", method: "bkash", accountNumber: "", transactionId: "", screenshot: "" });
        refresh();
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Connection error. Please try again.", variant: "destructive" });
    } finally { setSubmitting(false); }
  };

  const submitWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await authFetch("/wallet/withdraw", {
        method: "POST",
        body: JSON.stringify({ ...withdrawForm, amount: parseFloat(withdrawForm.amount) }),
      });
      const data = await safeJson(res);
      if (res.ok) {
        toast({ title: "Withdrawal Requested!", description: "Admin will process within 24 hours." });
        setActiveModal(null);
        setWithdrawForm({ amount: "", method: "bkash", accountNumber: "" });
        refresh();
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Connection error. Please try again.", variant: "destructive" });
    } finally { setSubmitting(false); }
  };

  const filteredTxs = txs.filter((t) => activeFilter === "all" || t.type === activeFilter);

  const submitPromoCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promoCode.trim()) return;
    setApplyingPromo(true);
    try {
      const res = await authFetch("/promo-codes/apply", {
        method: "POST",
        body: JSON.stringify({ code: promoCode.trim().toUpperCase() }),
      });
      const data = await safeJson(res);
      if (res.ok) {
        toast({ title: "Promo Applied!", description: `You received ৳${data.bonusAmount} bonus from code ${data.code}.` });
        setPromoCode("");
        refresh();
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Connection error.", variant: "destructive" });
    } finally { setApplyingPromo(false); }
  };

  if (isLoading) return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-[#ff6b00] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const filters: { key: FilterType; label: string }[] = [
    { key: "all", label: "All" },
    { key: "deposit", label: "Deposits" },
    { key: "withdraw", label: "Withdrawals" },
    { key: "tournament_prize", label: "Prizes" },
    { key: "tournament_entry", label: "Entry Fees" },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white pb-24">
      <Navbar />

      <div className="max-w-lg mx-auto px-4 pt-16 pb-6">

        {/* Balance Card */}
        <div className="relative bg-gradient-to-br from-[#1a1014] via-[#1a1218] to-[#12121a] rounded-2xl border border-[#ff6b00]/30 p-4 mb-3 overflow-hidden shadow-[0_0_30px_rgba(255,107,0,0.08)]">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#ff6b00]/8 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#ff6b00]/15 border border-[#ff6b00]/30 flex items-center justify-center">
                  <Wallet className="w-4 h-4 text-[#ff6b00]" />
                </div>
                <div className="text-[#a0a0b0] text-xs uppercase tracking-widest font-bold">Total Balance</div>
              </div>
              <button onClick={refresh} className="w-7 h-7 rounded-lg bg-[#1a1a24] border border-[#2a2a36] flex items-center justify-center text-[#a0a0b0] hover:text-white hover:border-[#ff6b00]/30 transition-all">
                <RefreshCw className="w-3 h-3" />
              </button>
            </div>
            {loadingBalance ? (
              <div className="h-9 w-36 bg-[#1a1a24] rounded-xl animate-pulse mb-0.5" />
            ) : (
              <div className="text-3xl sm:text-4xl font-black text-white mb-0.5 tracking-tight">
                ৳{Number(balance?.balance ?? 0).toLocaleString("en-BD", { minimumFractionDigits: 2 })}
              </div>
            )}
            <p className="text-[#606070] text-xs">Available balance</p>

            {/* Mini stats */}
            {!loadingBalance && (
              <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-[#ff6b00]/10">
                <div className="flex items-center gap-1.5">
                  <TrendingUp className="w-3 h-3 text-[#00ff88]" />
                  <div>
                    <div className="text-[#00ff88] font-black text-sm">৳{Number(balance?.totalDeposit ?? 0).toLocaleString()}</div>
                    <div className="text-[#606070] text-[10px] uppercase">Deposited</div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <TrendingDown className="w-3 h-3 text-[#ff6b00]" />
                  <div>
                    <div className="text-[#ff6b00] font-black text-sm">৳{Number(balance?.totalWithdraw ?? 0).toLocaleString()}</div>
                    <div className="text-[#606070] text-[10px] uppercase">Withdrawn</div>
                  </div>
                </div>
                {(balance?.totalPrizes ?? 0) > 0 && (
                  <div className="flex items-center gap-1.5">
                    <Trophy className="w-3 h-3 text-[#ffd700]" />
                    <div>
                      <div className="text-[#ffd700] font-black text-sm">৳{Number(balance?.totalPrizes ?? 0).toLocaleString()}</div>
                      <div className="text-[#606070] text-[10px] uppercase">Prizes</div>
                    </div>
                  </div>
                )}
                {(balance?.totalEntryFees ?? 0) > 0 && (
                  <div className="flex items-center gap-1.5">
                    <Zap className="w-3 h-3 text-[#ff2244]" />
                    <div>
                      <div className="text-[#ff2244] font-black text-sm">৳{Number(balance?.totalEntryFees ?? 0).toLocaleString()}</div>
                      <div className="text-[#606070] text-[10px] uppercase">Entry Fees</div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Pending notice */}
        {!loadingBalance && (balance?.pendingDeposit ?? 0) > 0 && (
          <div className="flex items-center gap-2.5 bg-yellow-400/8 border border-yellow-400/20 rounded-xl px-4 py-2.5 mb-4">
            <Clock className="w-4 h-4 text-yellow-400 shrink-0" />
            <span className="text-yellow-400 text-xs font-medium">
              ৳{Number(balance!.pendingDeposit).toLocaleString()} pending deposit awaiting admin approval
            </span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2.5 mb-4">
          <button
            onClick={() => setActiveModal("deposit")}
            className="group flex items-center justify-center gap-2 py-3 bg-[#00ff88]/8 border border-[#00ff88]/25 rounded-xl text-[#00ff88] font-black uppercase text-sm hover:bg-[#00ff88]/15 hover:border-[#00ff88]/40 transition-all"
          >
            <ArrowDownCircle className="w-4 h-4 group-hover:scale-110 transition-transform" /> Deposit
          </button>
          <button
            onClick={() => setActiveModal("withdraw")}
            className="group flex items-center justify-center gap-2 py-3 bg-[#ff6b00]/8 border border-[#ff6b00]/25 rounded-xl text-[#ff6b00] font-black uppercase text-sm hover:bg-[#ff6b00]/15 hover:border-[#ff6b00]/40 transition-all"
          >
            <ArrowUpCircle className="w-4 h-4 group-hover:scale-110 transition-transform" /> Withdraw
          </button>
        </div>

        {/* Promo Code */}
        <div className="bg-[#12121a] rounded-xl border border-[#ff6b00]/20 p-3 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <Tag className="w-4 h-4 text-[#ff6b00]" />
            <h2 className="font-black uppercase text-white text-sm tracking-wide">Promo Code</h2>
          </div>
          <form onSubmit={submitPromoCode} className="flex gap-2">
            <input
              type="text"
              value={promoCode}
              onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
              placeholder="Enter promo code"
              className="flex-1 bg-[#0a0a0f] border border-[#2a2a36] rounded-xl px-4 py-2.5 text-white placeholder-[#606070] focus:outline-none focus:border-[#ff6b00] text-sm transition-colors font-mono uppercase"
            />
            <button
              type="submit"
              disabled={applyingPromo || !promoCode.trim()}
              className="px-4 py-2.5 bg-[#ff6b00] text-white font-black uppercase text-sm rounded-xl hover:bg-[#e66000] disabled:opacity-50 transition-all whitespace-nowrap"
            >
              {applyingPromo ? "..." : "Apply"}
            </button>
          </form>
          <p className="text-[#606070] text-xs mt-2">Example codes: FFARENA100, WELCOME50</p>
        </div>

        {/* Transaction History */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-[#ff6b00]" />
              <h2 className="font-black uppercase text-white text-sm tracking-wide">Transaction History</h2>
            </div>
            <span className="text-[#606070] text-xs">{txs.length} total</span>
          </div>

          {/* Filter tabs */}
          <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1 no-scrollbar">
            {filters.map((f) => (
              <button
                key={f.key}
                onClick={() => setActiveFilter(f.key)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase whitespace-nowrap transition-all ${
                  activeFilter === f.key
                    ? "bg-[#ff6b00]/15 text-[#ff6b00] border border-[#ff6b00]/30"
                    : "bg-[#12121a] text-[#606070] border border-transparent hover:text-[#a0a0b0]"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {loadingTxs ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <div key={i} className="h-20 bg-[#12121a] rounded-2xl animate-pulse" />)}
            </div>
          ) : filteredTxs.length === 0 ? (
            <div className="bg-[#12121a] rounded-2xl border border-[#2a2a36] p-12 text-center">
              <Wallet className="w-10 h-10 mx-auto mb-3 text-[#ff6b00]/20" />
              <p className="text-white/40 font-bold text-sm">No transactions yet</p>
              <p className="text-[#606070] text-xs mt-1">Your transaction history will appear here</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredTxs.map((tx) => {
                const s = statusConfig[tx.status] ?? statusConfig.pending;
                const StatusIcon = s.icon;
                const tc = txTypeConfig[tx.type] ?? txTypeConfig.deposit;
                const TxIcon = tc.icon;
                const isCredit = tx.type === "deposit" || tx.type === "tournament_prize";
                const methodStr = tx.method ? tx.method.toUpperCase() : null;
                const noteStr = tx.notes ?? null;
                return (
                  <div key={tx.id} className="bg-[#12121a] rounded-xl border border-[#2a2a36] hover:border-[#ff6b00]/15 transition-colors p-3">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-9 h-9 rounded-lg ${tc.bg} flex items-center justify-center shrink-0 border ${tc.color.replace("text-", "border-")}/20`}>
                        <TxIcon className={`w-4 h-4 ${tc.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`font-black text-base ${isCredit ? "text-[#00ff88]" : "text-white"}`}>
                            {tc.sign}৳{Number(tx.amount).toLocaleString()}
                          </span>
                          <span className={`inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full border uppercase ${s.color} ${s.bg} ${s.border}`}>
                            <StatusIcon className="w-2.5 h-2.5" />
                            {s.label}
                          </span>
                          <span className="text-[10px] font-bold text-[#606070] uppercase bg-[#1a1a24] px-2 py-0.5 rounded-full">
                            {tc.label}
                          </span>
                        </div>
                        <div className="text-[#606070] text-xs mt-0.5 truncate">
                          {methodStr && <span>{methodStr}</span>}
                          {methodStr && tx.accountNumber && <span> · {tx.accountNumber}</span>}
                          {!methodStr && noteStr && <span className="text-[#a0a0b0]/70">{noteStr}</span>}
                          {tx.transactionId && <span className="ml-1 font-mono"> · {tx.transactionId}</span>}
                        </div>
                        <div className="text-[#606070] text-xs">{new Date(tx.createdAt).toLocaleString()}</div>
                        {tx.adminNote && (
                          <div className="flex items-center gap-1 mt-1 text-[#ff2244] text-xs">
                            <AlertCircle className="w-3 h-3" />
                            {tx.adminNote}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Deposit Modal */}
      {activeModal === "deposit" && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/70 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) setActiveModal(null); }}>
          <div className="w-full max-w-lg bg-[#0d0d16] border-t border-[#ff6b00]/20 rounded-t-3xl p-6 pb-10 shadow-2xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="font-black uppercase text-white text-lg">Deposit Money</h3>
                <p className="text-[#a0a0b0] text-xs mt-0.5">Send payment, then submit this form</p>
              </div>
              <button onClick={() => setActiveModal(null)} className="w-8 h-8 rounded-full bg-[#1a1a24] flex items-center justify-center text-[#a0a0b0] hover:text-white transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Step 1: Select Method & See Payment Info */}
            <div className="mb-4">
              <label className="block text-[#a0a0b0] text-xs uppercase tracking-wider mb-2 font-bold">Step 1 — Select Payment Method *</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "bkash", label: "bKash", color: "text-pink-400 border-pink-500/40 bg-pink-500/10", activeColor: "border-pink-400 bg-pink-500/20 shadow-[0_0_12px_rgba(236,72,153,0.2)]" },
                  { id: "nagad", label: "Nagad", color: "text-orange-400 border-orange-500/40 bg-orange-500/10", activeColor: "border-orange-400 bg-orange-500/20 shadow-[0_0_12px_rgba(249,115,22,0.2)]" },
                  { id: "rocket", label: "Rocket", color: "text-purple-400 border-purple-500/40 bg-purple-500/10", activeColor: "border-purple-400 bg-purple-500/20 shadow-[0_0_12px_rgba(168,85,247,0.2)]" },
                ].map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setDepositForm({ ...depositForm, method: m.id })}
                    className={`py-3 rounded-xl border font-black text-sm uppercase transition-all ${depositForm.method === m.id ? m.activeColor : m.color} ${m.color}`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Payment Info Box */}
            <div className="bg-[#0a0a14] border border-[#ff6b00]/25 rounded-xl p-4 mb-4">
              <div className="flex items-center gap-2 mb-3">
                <Info className="w-4 h-4 text-[#ff6b00] shrink-0" />
                <span className="text-[#ff6b00] font-black text-xs uppercase tracking-wider">Payment Instructions</span>
              </div>
              <div className="space-y-2 text-sm text-[#a0a0b0]">
                <p>1. Open your <span className="text-white font-bold capitalize">{depositForm.method}</span> app.</p>
                <p>2. Send money to this number:</p>
                <div className="flex items-center gap-2 bg-[#12121a] border border-[#ff6b00]/30 rounded-xl px-4 py-3 mt-1">
                  <span className="text-[#ff6b00] font-mono font-black text-lg flex-1">
                    {paymentSettings[`${depositForm.method}_number`] ?? "01606622867"}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const num = paymentSettings[`${depositForm.method}_number`] ?? "01606622867";
                      navigator.clipboard.writeText(num);
                      toast({ title: "Copied!", description: `${num} copied to clipboard.` });
                    }}
                    className="w-8 h-8 rounded-lg bg-[#ff6b00]/10 border border-[#ff6b00]/30 flex items-center justify-center text-[#ff6b00] hover:bg-[#ff6b00]/20 transition-colors"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
                <p>3. Note the <span className="text-white font-bold">Transaction ID (TrxID)</span> shown after payment.</p>
                <p>4. Fill the form below and submit.</p>
              </div>
            </div>

            <form onSubmit={submitDeposit} className="space-y-4">
              <div>
                <label className="block text-[#a0a0b0] text-xs uppercase tracking-wider mb-1.5 font-bold">Step 2 — Amount Sent (৳) *</label>
                <input type="number" value={depositForm.amount} onChange={(e) => setDepositForm({ ...depositForm, amount: e.target.value })} required min="1" placeholder="Enter the amount you sent" className="w-full bg-[#12121a] border border-[#2a2a36] rounded-xl px-4 py-3 text-white placeholder-[#606070] focus:outline-none focus:border-[#ff6b00] text-sm transition-colors" />
              </div>
              <div>
                <label className="block text-[#a0a0b0] text-xs uppercase tracking-wider mb-1.5 font-bold">Transaction ID (TrxID) *</label>
                <input value={depositForm.transactionId} onChange={(e) => setDepositForm({ ...depositForm, transactionId: e.target.value })} required placeholder="e.g. ABC1234XYZ" className="w-full bg-[#12121a] border border-[#2a2a36] rounded-xl px-4 py-3 text-white placeholder-[#606070] focus:outline-none focus:border-[#ff6b00] text-sm font-mono transition-colors" />
              </div>
              <div>
                <label className="block text-[#a0a0b0] text-xs uppercase tracking-wider mb-1.5 font-bold">Your Sender Number *</label>
                <input value={depositForm.accountNumber} onChange={(e) => setDepositForm({ ...depositForm, accountNumber: e.target.value })} required placeholder="01XXXXXXXXX (number you sent from)" className="w-full bg-[#12121a] border border-[#2a2a36] rounded-xl px-4 py-3 text-white placeholder-[#606070] focus:outline-none focus:border-[#ff6b00] text-sm transition-colors" />
              </div>
              <div>
                <label className="block text-[#a0a0b0] text-xs uppercase tracking-wider mb-1.5 font-bold">Screenshot <span className="text-[#606070] normal-case font-normal">(optional but recommended)</span></label>
                <div className="relative">
                  {depositForm.screenshot ? (
                    <div className="flex items-center gap-3 bg-[#12121a] border border-[#00ff88]/30 rounded-xl px-4 py-3">
                      <CheckCircle className="w-4 h-4 text-[#00ff88] shrink-0" />
                      <span className="text-[#00ff88] text-sm font-bold flex-1 truncate">Screenshot uploaded</span>
                      <button type="button" onClick={() => setDepositForm({ ...depositForm, screenshot: "" })} className="text-[#606070] hover:text-white">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <label className="flex items-center gap-3 bg-[#12121a] border border-dashed border-[#2a2a36] rounded-xl px-4 py-3 cursor-pointer hover:border-[#ff6b00]/40 transition-colors">
                      <ImagePlus className="w-4 h-4 text-[#606070]" />
                      <span className="text-[#606070] text-sm">Click to upload payment screenshot</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          if (file.size > 4 * 1024 * 1024) { toast({ title: "File too large", description: "Max 4MB", variant: "destructive" }); return; }
                          const reader = new FileReader();
                          reader.onload = () => setDepositForm({ ...depositForm, screenshot: reader.result as string });
                          reader.readAsDataURL(file);
                        }}
                      />
                    </label>
                  )}
                </div>
              </div>
              <button type="submit" disabled={submitting} className="w-full py-4 bg-[#00ff88] text-[#0a0a0f] font-black uppercase rounded-xl hover:bg-[#00cc70] transition-colors disabled:opacity-50 text-sm shadow-[0_0_20px_rgba(0,255,136,0.2)]">
                {submitting ? "Submitting..." : "Submit Deposit Request"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Withdraw Modal */}
      {activeModal === "withdraw" && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-[#0d0d16] border-t border-[#ff6b00]/20 rounded-t-3xl p-6 pb-10 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="font-black uppercase text-white text-lg">Withdraw Money</h3>
                <p className="text-[#a0a0b0] text-xs mt-0.5">
                  Available: <span className="text-[#ff6b00] font-bold">৳{Number(balance?.balance ?? 0).toLocaleString()}</span>
                </p>
              </div>
              <button onClick={() => setActiveModal(null)} className="w-8 h-8 rounded-full bg-[#1a1a24] flex items-center justify-center text-[#a0a0b0] hover:text-white transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={submitWithdraw} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#a0a0b0] text-xs uppercase tracking-wider mb-1.5 font-bold">Amount (৳) *</label>
                  <input type="number" value={withdrawForm.amount} onChange={(e) => setWithdrawForm({ ...withdrawForm, amount: e.target.value })} required min="1" max={balance?.balance} placeholder="100" className="w-full bg-[#12121a] border border-[#2a2a36] rounded-xl px-4 py-3 text-white placeholder-[#606070] focus:outline-none focus:border-[#ff6b00] text-sm transition-colors" />
                </div>
                <div>
                  <label className="block text-[#a0a0b0] text-xs uppercase tracking-wider mb-1.5 font-bold">Method *</label>
                  <select value={withdrawForm.method} onChange={(e) => setWithdrawForm({ ...withdrawForm, method: e.target.value })} className="w-full bg-[#12121a] border border-[#2a2a36] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#ff6b00] text-sm transition-colors">
                    <option value="bkash">BKash</option>
                    <option value="nagad">Nagad</option>
                    <option value="rocket">Rocket</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[#a0a0b0] text-xs uppercase tracking-wider mb-1.5 font-bold">Your Account Number *</label>
                <input value={withdrawForm.accountNumber} onChange={(e) => setWithdrawForm({ ...withdrawForm, accountNumber: e.target.value })} required placeholder="01XXXXXXXXX" className="w-full bg-[#12121a] border border-[#2a2a36] rounded-xl px-4 py-3 text-white placeholder-[#606070] focus:outline-none focus:border-[#ff6b00] text-sm transition-colors" />
              </div>
              <button type="submit" disabled={submitting} className="w-full py-4 bg-[#ff6b00] text-white font-black uppercase rounded-xl hover:bg-[#e66000] transition-colors disabled:opacity-50 text-sm shadow-[0_0_20px_rgba(255,107,0,0.2)]">
                {submitting ? "Submitting..." : "Submit Withdrawal Request"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
