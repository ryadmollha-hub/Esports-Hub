import { useState } from "react";
import { Link } from "wouter";
import { Flame, Mail, Lock, Eye, EyeOff, AlertCircle, CheckCircle, ArrowLeft } from "lucide-react";

import { apiBase as BASE } from "@/lib/apiBase";

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<"email" | "reset" | "done">("email");
  const [email, setEmail] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`${BASE}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Request failed"); return; }
      if (data.resetToken) {
        setResetToken(data.resetToken);
      }
      setStep("reset");
    } catch {
      setError("Connection error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password !== confirm) { setError("Passwords do not match"); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters"); return; }
    setLoading(true);
    try {
      const res = await fetch(`${BASE}/api/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: resetToken, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Reset failed"); return; }
      setStep("done");
    } catch {
      setError("Connection error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center px-3 relative overflow-hidden">
      <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center opacity-10" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f] via-[#0a0a0f]/60 to-transparent" />

      <div className="relative z-10 w-full max-w-md">
        <div className="text-center mb-5">
          <Link href="/" className="inline-flex items-center gap-1.5 mb-4">
            <Flame className="w-8 h-8 text-[#ff6b00]" />
            <span className="text-2xl font-black uppercase text-white">FF <span className="text-[#ff6b00]">Arena</span></span>
          </Link>
          <h1 className="text-3xl font-black uppercase text-white">
            {step === "done" ? "Password Reset" : "Forgot Password"}
          </h1>
          <p className="text-[#a0a0b0] mt-1">
            {step === "email" && "Enter your email to get a reset token"}
            {step === "reset" && "Enter your new password"}
            {step === "done" && "Your password has been reset"}
          </p>
        </div>

        <div className="bg-[#12121a] rounded-2xl border border-[#ff6b00]/20 p-5 shadow-[0_0_40px_rgba(255,107,0,0.08)]">
          {error && (
            <div className="flex items-center gap-1.5 bg-[#ff2244]/10 border border-[#ff2244]/30 text-[#ff2244] rounded-xl px-3 py-2.5 mb-3.5 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" /> {error}
            </div>
          )}

          {step === "email" && (
            <form onSubmit={handleEmailSubmit} className="space-y-3">
              <div>
                <label className="block text-[#a0a0b0] text-xs uppercase tracking-wider font-bold mb-1.5">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#a0a0b0]" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="you@example.com"
                    className="w-full bg-[#1a1a24] border border-[#2a2a36] rounded-xl pl-7 pr-3 py-2.5 text-white placeholder-[#a0a0b0] focus:outline-none focus:border-[#ff6b00] transition-colors text-sm"
                  />
                </div>
              </div>
              <button type="submit" disabled={loading} className="w-full py-2.5 bg-[#ff6b00] text-white font-black uppercase text-sm rounded-xl hover:bg-[#e66000] disabled:opacity-50 transition-all shadow-[0_0_20px_rgba(255,107,0,0.3)]">
                {loading ? "Sending..." : "Get Reset Token"}
              </button>
            </form>
          )}

          {step === "reset" && (
            <form onSubmit={handleReset} className="space-y-3">
              <div>
                <label className="block text-[#a0a0b0] text-xs uppercase tracking-wider font-bold mb-1.5">Reset Token</label>
                <input
                  value={resetToken}
                  onChange={(e) => setResetToken(e.target.value)}
                  required
                  placeholder="Paste reset token here"
                  className="w-full bg-[#1a1a24] border border-[#2a2a36] rounded-xl px-3 py-2.5 text-white placeholder-[#a0a0b0] focus:outline-none focus:border-[#ff6b00] transition-colors text-sm font-mono"
                />
                <p className="text-[#a0a0b0] text-xs mt-1">Check the API response or your email for the token.</p>
              </div>
              <div>
                <label className="block text-[#a0a0b0] text-xs uppercase tracking-wider font-bold mb-1.5">New Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#a0a0b0]" />
                  <input
                    type={showPass ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="Min. 6 characters"
                    className="w-full bg-[#1a1a24] border border-[#2a2a36] rounded-xl pl-7 pr-8 py-2.5 text-white placeholder-[#a0a0b0] focus:outline-none focus:border-[#ff6b00] transition-colors text-sm"
                  />
                  <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#a0a0b0] hover:text-white">
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-[#a0a0b0] text-xs uppercase tracking-wider font-bold mb-1.5">Confirm Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#a0a0b0]" />
                  <input
                    type={showPass ? "text" : "password"}
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    required
                    placeholder="Repeat password"
                    className="w-full bg-[#1a1a24] border border-[#2a2a36] rounded-xl pl-7 pr-3 py-2.5 text-white placeholder-[#a0a0b0] focus:outline-none focus:border-[#ff6b00] transition-colors text-sm"
                  />
                </div>
              </div>
              <button type="submit" disabled={loading} className="w-full py-2.5 bg-[#ff6b00] text-white font-black uppercase text-sm rounded-xl hover:bg-[#e66000] disabled:opacity-50 transition-all shadow-[0_0_20px_rgba(255,107,0,0.3)]">
                {loading ? "Resetting..." : "Reset Password"}
              </button>
            </form>
          )}

          {step === "done" && (
            <div className="text-center space-y-3">
              <div className="w-16 h-16 rounded-full bg-[#00ff88]/10 border border-[#00ff88]/30 flex items-center justify-center mx-auto">
                <CheckCircle className="w-8 h-8 text-[#00ff88]" />
              </div>
              <p className="text-[#a0a0b0] text-sm">Your password has been reset. You can now sign in with your new password.</p>
              <Link href="/sign-in" className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-[#ff6b00] text-white font-black uppercase text-sm rounded-xl hover:bg-[#e66000] transition-all">
                Go to Sign In
              </Link>
            </div>
          )}

          {step !== "done" && (
            <div className="mt-3.5 text-center">
              <Link href="/sign-in" className="inline-flex items-center gap-1 text-sm text-[#a0a0b0] hover:text-white transition-colors">
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
