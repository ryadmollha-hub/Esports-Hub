import { useState } from "react";
import { useLocation } from "wouter";
import { Flame, Lock, User, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { setAdminSession } from "@/lib/adminAuth";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function AdminLoginPage() {
  const [, setLocation] = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`${BASE}/api/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? data.message ?? "Invalid credentials");
        return;
      }
      setAdminSession(data.token, username);
      setLocation("/admin");
    } catch {
      setError("Connection error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center px-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center opacity-5" />
      <div className="absolute inset-0 bg-gradient-radial from-[#ff6b00]/5 via-transparent to-transparent" />

      <div className="relative z-10 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Flame className="w-8 h-8 text-[#ff6b00]" />
            <span className="text-2xl font-black uppercase tracking-wider text-white">
              FF <span className="text-[#ff6b00]">Arena</span>
            </span>
          </div>
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-[#ff6b00]/10 border border-[#ff6b00]/30 rounded-full text-[#ff6b00] text-sm font-bold uppercase tracking-wider mb-4">
            <ShieldCheck className="w-4 h-4" />
            Admin Access Only
          </div>
          <h1 className="text-3xl font-black text-white uppercase">Admin <span className="text-[#ff6b00]">Login</span></h1>
          <p className="text-[#a0a0b0] mt-2 text-sm">Restricted area. Authorized personnel only.</p>
        </div>

        <div className="bg-[#12121a] border border-[#ff6b00]/20 rounded-2xl p-8 shadow-[0_0_40px_rgba(255,107,0,0.1)]">
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-[#a0a0b0] text-xs uppercase tracking-wider mb-2">Admin Username</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#a0a0b0]" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter username"
                  required
                  autoComplete="username"
                  className="w-full bg-[#1a1a24] border border-[#2a2a36] rounded-xl pl-10 pr-4 py-3 text-white placeholder-[#a0a0b0] focus:outline-none focus:border-[#ff6b00] transition-colors text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-[#a0a0b0] text-xs uppercase tracking-wider mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#a0a0b0]" />
                <input
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  required
                  autoComplete="current-password"
                  className="w-full bg-[#1a1a24] border border-[#2a2a36] rounded-xl pl-10 pr-12 py-3 text-white placeholder-[#a0a0b0] focus:outline-none focus:border-[#ff6b00] transition-colors text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#a0a0b0] hover:text-white transition-colors"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-[#ff2244]/10 border border-[#ff2244]/30 rounded-xl px-4 py-3 text-[#ff2244] text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-[#ff6b00] hover:bg-[#e66000] text-white font-black uppercase text-sm rounded-xl transition-all shadow-[0_0_20px_rgba(255,107,0,0.3)] hover:shadow-[0_0_30px_rgba(255,107,0,0.5)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  Access Admin Panel
                </>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-[#a0a0b0] text-xs mt-6">
          Not an admin?{" "}
          <a href="/" className="text-[#ff6b00] hover:underline">Return to homepage</a>
        </p>
      </div>
    </div>
  );
}
