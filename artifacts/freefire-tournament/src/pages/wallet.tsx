import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import {
  Wallet, ArrowDownCircle, ArrowUpCircle, Clock, CheckCircle,
  XCircle, TrendingUp, TrendingDown, RefreshCw, ChevronRight,
  AlertCircle, X, History
} from "lucide-react";
import Navbar from "@/components/Navbar";
import { useAuthContext } from "@/lib/AuthContext";
import { useToast } from "@/hooks/use-toast";

type TxStatus = "pending" | "approved" | "rejected";
type TxType = "deposit" | "withdraw";

interface WalletBalance {
  balance: number;
  totalDeposit: number;
  totalWithdraw: number;
  pendingDeposit: number;
  pendingWithdraw: number;
}

interface Transaction {
  id: number;
  type: TxType;
  amount: string;
  method: string;
  accountNumber: string;
  transactionId?: string;
  status: TxStatus;
  adminNote?: string;
  createdAt: string;
}

const statusConfig = {
  approved: { color: "text-[#00ff88]", bg: "bg-[#00ff88]/10", border: "border-[#00ff88]/30", icon: CheckCircle },
  rejected: { color: "text-[#ff2244]", bg: "bg-[#ff2244]/10", border: "border-[#ff2244]/30", icon: XCircle },
  pending: { color: "text-yellow-400", bg: "bg-yellow-400/10", border: "border-yellow-400/30", icon: Clock },
};

export default function WalletPage() {
  const { user, isLoading, authFetch } = useAuthContext();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [balance, setBalance] = useState<WalletBalance | null>(null);
  const [txs, setTxs] = useState<Transaction[]>([]);
  const [loadingBalance, setLoadingBalance] = useState(true);
  const [loadingTxs, setLoadingTxs] = useState(true);
  const [activeModal, setActiveModal] = useState<"deposit" | "withdraw" | null>(null);
  const [activeFilter, setActiveFilter] = useState<"all" | "deposit" | "withdraw">("all");
  const [submitting, setSubmitting] = useState(false);

  const [depositForm, setDepositForm] = useState({
    amount: "", method: "bkash", accountNumber: "", transactionId: "", screenshot: ""
  });
  const [withdrawForm, setWithdrawForm] = useState({
    amount: "", method: "bkash", accountNumber: ""
  });

  useEffect(() => {
    if (!isLoading && !user) setLocation("/sign-in");
  }, [isLoading, user]);

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
      const data = await res.json();
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
      const data = await res.json();
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

  if (isLoading) return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-[#ff6b00] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white pb-24">
      <Navbar />

      <div className="max-w-lg mx-auto px-4 pt-20 pb-6">

        {/* Balance Card */}
        <div className="relative bg-gradient-to-br from-[#ff6b00]/20 to-[#1a1a24] rounded-3xl border border-[#ff6b00]/30 p-6 mb-4 overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#ff6b00]/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl" />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Wallet className="w-5 h-5 text-[#ff6b00]" />
                <span className="text-[#a0a0b0] text-sm font-medium">Total Balance</span>
              </div>
              <button onClick={refresh} className="text-[#a0a0b0] hover:text-white transition-colors">
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
            <div className="text-4xl font-black text-white mb-1">
              {loadingBalance ? (
                <div className="h-10 w-32 bg-[#1a1a24] rounded-xl animate-pulse" />
              ) : (
                <>৳{Number(balance?.balance ?? 0).toLocaleString("en-BD", { minimumFractionDigits: 2 })}</>
              )}
            </div>
            <p className="text-[#a0a0b0] text-xs">Available to withdraw</p>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          {[
            { label: "Total Deposited", value: balance?.totalDeposit, icon: TrendingUp, color: "text-[#00ff88]", pending: balance?.pendingDeposit },
            { label: "Total Withdrawn", value: balance?.totalWithdraw, icon: TrendingDown, color: "text-[#ff6b00]", pending: balance?.pendingWithdraw },
          ].map((s) => (
            <div key={s.label} className="bg-[#12121a] rounded-2xl border border-[#2a2a36] p-4">
              <div className="flex items-center gap-2 mb-2">
                <s.icon className={`w-4 h-4 ${s.color}`} />
                <span className="text-[#a0a0b0] text-xs">{s.label}</span>
              </div>
              {loadingBalance ? (
                <div className="h-6 w-20 bg-[#1a1a24] rounded animate-pulse" />
              ) : (
                <div className={`text-xl font-black ${s.color}`}>
                  ৳{Number(s.value ?? 0).toLocaleString()}
                </div>
              )}
              {!loadingBalance && s.pending! > 0 && (
                <div className="text-yellow-400 text-xs mt-1 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  ৳{Number(s.pending).toLocaleString()} pending
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <button
            onClick={() => setActiveModal("deposit")}
            className="flex items-center justify-center gap-2 py-4 bg-[#00ff88]/10 border border-[#00ff88]/30 rounded-2xl text-[#00ff88] font-black uppercase text-sm hover:bg-[#00ff88]/20 transition-colors"
          >
            <ArrowDownCircle className="w-5 h-5" /> Deposit
          </button>
          <button
            onClick={() => setActiveModal("withdraw")}
            className="flex items-center justify-center gap-2 py-4 bg-[#ff6b00]/10 border border-[#ff6b00]/30 rounded-2xl text-[#ff6b00] font-black uppercase text-sm hover:bg-[#ff6b00]/20 transition-colors"
          >
            <ArrowUpCircle className="w-5 h-5" /> Withdraw
          </button>
        </div>

        {/* Transaction History */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-[#ff6b00]" />
              <h2 className="font-black uppercase text-white text-sm">Transaction History</h2>
            </div>
          </div>

          <div className="flex gap-2 mb-4">
            {(["all", "deposit", "withdraw"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setActiveFilter(f)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase transition-colors ${
                  activeFilter === f
                    ? "bg-[#ff6b00]/15 text-[#ff6b00] border border-[#ff6b00]/30"
                    : "bg-[#12121a] text-[#a0a0b0] border border-transparent"
                }`}
              >
                {f === "all" ? "All" : f === "deposit" ? "Deposits" : "Withdrawals"}
              </button>
            ))}
          </div>

          {loadingTxs ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <div key={i} className="h-20 bg-[#12121a] rounded-2xl animate-pulse" />)}
            </div>
          ) : filteredTxs.length === 0 ? (
            <div className="bg-[#12121a] rounded-2xl border border-[#2a2a36] p-10 text-center">
              <Wallet className="w-10 h-10 mx-auto mb-3 text-[#ff6b00]/30" />
              <p className="text-[#a0a0b0] text-sm">No transactions yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredTxs.map((tx) => {
                const s = statusConfig[tx.status] ?? statusConfig.pending;
                const StatusIcon = s.icon;
                const isDeposit = tx.type === "deposit";
                return (
                  <div key={tx.id} className="bg-[#12121a] rounded-2xl border border-[#2a2a36] p-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full ${isDeposit ? "bg-[#00ff88]/10" : "bg-[#ff6b00]/10"} flex items-center justify-center shrink-0`}>
                        {isDeposit
                          ? <ArrowDownCircle className="w-5 h-5 text-[#00ff88]" />
                          : <ArrowUpCircle className="w-5 h-5 text-[#ff6b00]" />
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-black text-white text-base">
                            {isDeposit ? "+" : "-"}৳{Number(tx.amount).toLocaleString()}
                          </span>
                          <span className={`inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full border uppercase ${s.color} ${s.bg} ${s.border}`}>
                            <StatusIcon className="w-3 h-3" />
                            {tx.status}
                          </span>
                        </div>
                        <div className="text-[#a0a0b0] text-xs mt-0.5">
                          {tx.method.toUpperCase()} · {tx.accountNumber}
                          {tx.transactionId && <> · <span className="font-mono">{tx.transactionId}</span></>}
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
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-[#0d0d16] border-t border-[#ff6b00]/20 rounded-t-3xl p-6 pb-10">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="font-black uppercase text-white text-lg">Deposit Money</h3>
                <p className="text-[#a0a0b0] text-xs mt-0.5">Send via BKash/Nagad, then submit this form</p>
              </div>
              <button onClick={() => setActiveModal(null)} className="w-8 h-8 rounded-full bg-[#1a1a24] flex items-center justify-center text-[#a0a0b0]">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={submitDeposit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#a0a0b0] text-xs uppercase tracking-wider mb-1.5">Amount (৳) *</label>
                  <input type="number" value={depositForm.amount} onChange={(e) => setDepositForm({ ...depositForm, amount: e.target.value })} required min="1" placeholder="100" className="w-full bg-[#12121a] border border-[#2a2a36] rounded-xl px-4 py-3 text-white placeholder-[#606070] focus:outline-none focus:border-[#ff6b00] text-sm" />
                </div>
                <div>
                  <label className="block text-[#a0a0b0] text-xs uppercase tracking-wider mb-1.5">Method *</label>
                  <select value={depositForm.method} onChange={(e) => setDepositForm({ ...depositForm, method: e.target.value })} className="w-full bg-[#12121a] border border-[#2a2a36] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#ff6b00] text-sm">
                    <option value="bkash">BKash</option>
                    <option value="nagad">Nagad</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[#a0a0b0] text-xs uppercase tracking-wider mb-1.5">Your Account Number *</label>
                <input value={depositForm.accountNumber} onChange={(e) => setDepositForm({ ...depositForm, accountNumber: e.target.value })} required placeholder="01XXXXXXXXX" className="w-full bg-[#12121a] border border-[#2a2a36] rounded-xl px-4 py-3 text-white placeholder-[#606070] focus:outline-none focus:border-[#ff6b00] text-sm" />
              </div>
              <div>
                <label className="block text-[#a0a0b0] text-xs uppercase tracking-wider mb-1.5">Transaction ID *</label>
                <input value={depositForm.transactionId} onChange={(e) => setDepositForm({ ...depositForm, transactionId: e.target.value })} placeholder="TX ID from payment app" className="w-full bg-[#12121a] border border-[#2a2a36] rounded-xl px-4 py-3 text-white placeholder-[#606070] focus:outline-none focus:border-[#ff6b00] text-sm" />
              </div>
              <button type="submit" disabled={submitting} className="w-full py-4 bg-[#00ff88] text-[#0a0a0f] font-black uppercase rounded-xl hover:bg-[#00cc70] transition-colors disabled:opacity-50 text-sm">
                {submitting ? "Submitting..." : "Submit Deposit Request"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Withdraw Modal */}
      {activeModal === "withdraw" && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-[#0d0d16] border-t border-[#ff6b00]/20 rounded-t-3xl p-6 pb-10">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="font-black uppercase text-white text-lg">Withdraw Money</h3>
                <p className="text-[#a0a0b0] text-xs mt-0.5">
                  Available: <span className="text-[#ff6b00] font-bold">৳{Number(balance?.balance ?? 0).toLocaleString()}</span>
                </p>
              </div>
              <button onClick={() => setActiveModal(null)} className="w-8 h-8 rounded-full bg-[#1a1a24] flex items-center justify-center text-[#a0a0b0]">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={submitWithdraw} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#a0a0b0] text-xs uppercase tracking-wider mb-1.5">Amount (৳) *</label>
                  <input type="number" value={withdrawForm.amount} onChange={(e) => setWithdrawForm({ ...withdrawForm, amount: e.target.value })} required min="1" max={balance?.balance} placeholder="100" className="w-full bg-[#12121a] border border-[#2a2a36] rounded-xl px-4 py-3 text-white placeholder-[#606070] focus:outline-none focus:border-[#ff6b00] text-sm" />
                </div>
                <div>
                  <label className="block text-[#a0a0b0] text-xs uppercase tracking-wider mb-1.5">Method *</label>
                  <select value={withdrawForm.method} onChange={(e) => setWithdrawForm({ ...withdrawForm, method: e.target.value })} className="w-full bg-[#12121a] border border-[#2a2a36] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#ff6b00] text-sm">
                    <option value="bkash">BKash</option>
                    <option value="nagad">Nagad</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[#a0a0b0] text-xs uppercase tracking-wider mb-1.5">Your Account Number *</label>
                <input value={withdrawForm.accountNumber} onChange={(e) => setWithdrawForm({ ...withdrawForm, accountNumber: e.target.value })} required placeholder="01XXXXXXXXX" className="w-full bg-[#12121a] border border-[#2a2a36] rounded-xl px-4 py-3 text-white placeholder-[#606070] focus:outline-none focus:border-[#ff6b00] text-sm" />
              </div>
              <button type="submit" disabled={submitting} className="w-full py-4 bg-[#ff6b00] text-white font-black uppercase rounded-xl hover:bg-[#e66000] transition-colors disabled:opacity-50 text-sm">
                {submitting ? "Submitting..." : "Submit Withdrawal Request"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
