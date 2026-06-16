import { useState, useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useLocation } from "wouter";
import { Gift, Copy, Users, DollarSign, Check, Share2 } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useToast } from "@/hooks/use-toast";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface ReferralData {
  referralCode: string;
  totalReferrals: number;
  totalReward: number;
  referrals: Array<{
    id: number;
    referredId: string;
    rewardAmount: string;
    status: string;
    createdAt: string;
  }>;
}

export default function ReferralPage() {
  const { isSignedIn, isLoaded } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [data, setData] = useState<ReferralData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [applyCode, setApplyCode] = useState("");
  const [applying, setApplying] = useState(false);

  const token = typeof window !== "undefined" ? localStorage.getItem("ff_auth_token") : null;

  useEffect(() => {
    if (isLoaded && !isSignedIn) setLocation("/sign-in");
  }, [isLoaded, isSignedIn]);

  useEffect(() => {
    if (!isSignedIn || !token) return;
    fetch(`${BASE}/api/referrals/my`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isSignedIn]);

  const copyCode = () => {
    if (!data?.referralCode) return;
    navigator.clipboard.writeText(data.referralCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({ title: "Copied!", description: "Referral code copied to clipboard." });
    });
  };

  const shareCode = () => {
    if (!data?.referralCode) return;
    const text = `Join FF Arena with my referral code: ${data.referralCode} and get a welcome bonus! Sign up at ${window.location.origin}`;
    if (navigator.share) {
      navigator.share({ title: "FF Arena Referral", text });
    } else {
      copyCode();
    }
  };

  const handleApplyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!applyCode.trim() || !token) return;
    setApplying(true);
    try {
      const res = await fetch(`${BASE}/api/referrals/apply`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ code: applyCode.trim() }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error ?? "Failed to apply code");
      toast({ title: "Referral Applied!", description: `Your friend earned ৳${result.reward} reward!` });
      setApplyCode("");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setApplying(false);
  };

  if (!isLoaded || loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f]">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 pt-16 space-y-4">
          {[1, 2, 3].map((i) => <div key={i} className="h-32 bg-[#12121a] rounded-xl animate-pulse" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 pt-16 pb-20">
        <h1 className="text-2xl sm:text-4xl font-black uppercase mb-2">
          Referral <span className="text-[#ff6b00]">Program</span>
        </h1>
        <p className="text-[#a0a0b0] mb-8">Invite friends and earn ৳50 for every successful referral</p>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-[#12121a] rounded-2xl border border-[#ff6b00]/20 p-5 text-center">
            <Users className="w-8 h-8 text-[#ff6b00] mx-auto mb-2" />
            <div className="text-3xl font-black text-white">{data?.totalReferrals ?? 0}</div>
            <div className="text-[#a0a0b0] text-sm mt-1">Total Referrals</div>
          </div>
          <div className="bg-[#12121a] rounded-2xl border border-[#00ff88]/20 p-5 text-center">
            <DollarSign className="w-8 h-8 text-[#00ff88] mx-auto mb-2" />
            <div className="text-3xl font-black text-[#00ff88]">৳{data?.totalReward ?? 0}</div>
            <div className="text-[#a0a0b0] text-sm mt-1">Total Earned</div>
          </div>
          <div className="bg-[#12121a] rounded-2xl border border-[#ffd700]/20 p-5 text-center">
            <Gift className="w-8 h-8 text-[#ffd700] mx-auto mb-2" />
            <div className="text-3xl font-black text-[#ffd700]">৳50</div>
            <div className="text-[#a0a0b0] text-sm mt-1">Per Referral</div>
          </div>
        </div>

        {/* Referral Code */}
        <div className="bg-[#12121a] rounded-2xl border border-[#ff6b00]/20 p-6 mb-6">
          <h2 className="font-black uppercase text-sm text-[#a0a0b0] mb-4 tracking-wider">Your Referral Code</h2>
          <div className="flex items-center gap-3">
            <div className="flex-1 px-5 py-3 bg-[#1a1a24] border border-[#ff6b00]/30 rounded-xl font-mono text-2xl font-black text-[#ff6b00] tracking-widest text-center">
              {data?.referralCode ?? "Loading..."}
            </div>
            <button
              onClick={copyCode}
              className="px-4 py-3 bg-[#ff6b00]/10 border border-[#ff6b00]/30 text-[#ff6b00] rounded-xl hover:bg-[#ff6b00]/20 transition-colors font-bold"
              title="Copy code"
            >
              {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
            </button>
            <button
              onClick={shareCode}
              className="px-4 py-3 bg-[#ff6b00] text-white rounded-xl hover:bg-[#e66000] transition-colors"
              title="Share"
            >
              <Share2 className="w-5 h-5" />
            </button>
          </div>
          <p className="text-[#a0a0b0] text-xs mt-3">Share this code with friends. You earn ৳50 when they register.</p>
        </div>

        {/* Apply Code */}
        <div className="bg-[#12121a] rounded-2xl border border-[#ff6b00]/20 p-6 mb-6">
          <h2 className="font-black uppercase text-sm text-[#a0a0b0] mb-4 tracking-wider">Apply a Referral Code</h2>
          <form onSubmit={handleApplyCode} className="flex gap-3">
            <input
              type="text"
              value={applyCode}
              onChange={(e) => setApplyCode(e.target.value.toUpperCase())}
              placeholder="Enter referral code"
              className="flex-1 px-4 py-3 bg-[#1a1a24] border border-[#2a2a36] rounded-xl text-white placeholder-[#a0a0b0] focus:outline-none focus:border-[#ff6b00] transition-colors font-mono uppercase"
            />
            <button
              type="submit"
              disabled={applying || !applyCode.trim()}
              className="px-5 py-3 bg-[#ff6b00] text-white font-black uppercase rounded-xl hover:bg-[#e66000] disabled:opacity-50 transition-all"
            >
              {applying ? "Applying..." : "Apply"}
            </button>
          </form>
          <p className="text-[#a0a0b0] text-xs mt-2">Each account can only apply one referral code.</p>
        </div>

        {/* Referral History */}
        {(data?.referrals?.length ?? 0) > 0 && (
          <div className="bg-[#12121a] rounded-2xl border border-[#ff6b00]/20 p-6">
            <h2 className="font-black uppercase text-sm text-[#a0a0b0] mb-4 tracking-wider">Referral History</h2>
            <div className="space-y-3">
              {data?.referrals.map((r) => (
                <div key={r.id} className="flex items-center justify-between py-2 border-b border-[#ff6b00]/5 last:border-0">
                  <div>
                    <div className="text-white font-bold text-sm">New User Referred</div>
                    <div className="text-[#a0a0b0] text-xs">{new Date(r.createdAt).toLocaleDateString()}</div>
                  </div>
                  <span className="text-[#00ff88] font-black">+৳{r.rewardAmount}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
