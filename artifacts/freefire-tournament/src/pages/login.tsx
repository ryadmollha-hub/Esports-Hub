import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Flame, Eye, EyeOff, Mail, Lock, AlertCircle, RefreshCw, Shield } from "lucide-react";
import { useAuthContext } from "@/lib/AuthContext";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface Captcha { token: string; question: string; }

async function fetchCaptcha(): Promise<Captcha> {
  const res = await fetch(`${BASE}/api/captcha`);
  return res.json();
}

export default function LoginPage() {
  const { login } = useAuthContext();
  const [, setLocation] = useLocation();
  const [form, setForm] = useState({ email: "", password: "", captchaAnswer: "" });
  const [captcha, setCaptcha] = useState<Captcha | null>(null);
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchCaptcha().then(setCaptcha).catch(() => {});
  }, []);

  const refreshCaptcha = async () => {
    setCaptcha(null);
    setForm((f) => ({ ...f, captchaAnswer: "" }));
    try { setCaptcha(await fetchCaptcha()); } catch {}
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!captcha) { setError("Security check not loaded. Please wait."); return; }
    if (!form.captchaAnswer.trim()) { setError("Please answer the security question."); return; }
    setLoading(true);
    try {
      await login(form.email, form.password, captcha.token, form.captchaAnswer);
      setLocation("/dashboard");
    } catch (err: any) {
      setError(err.message ?? "Login failed. Please try again.");
      refreshCaptcha();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center px-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center opacity-10" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f] via-[#0a0a0f]/60 to-transparent" />

      <div className="relative z-10 w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <Flame className="w-8 h-8 text-[#ff6b00]" />
            <span className="text-2xl font-black uppercase text-white">FF <span className="text-[#ff6b00]">Arena</span></span>
          </Link>
          <h1 className="text-3xl font-black uppercase text-white">Sign <span className="text-[#ff6b00]">In</span></h1>
          <p className="text-[#a0a0b0] mt-1">Welcome back, champion</p>
        </div>

        <div className="bg-[#12121a] rounded-2xl border border-[#ff6b00]/20 p-8 shadow-[0_0_40px_rgba(255,107,0,0.08)]">
          {error && (
            <div className="flex items-center gap-2 bg-[#ff2244]/10 border border-[#ff2244]/30 text-[#ff2244] rounded-xl px-4 py-3 mb-5 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" /> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[#a0a0b0] text-xs uppercase tracking-wider font-bold mb-2">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#a0a0b0]" />
                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required placeholder="you@example.com"
                  className="w-full bg-[#1a1a24] border border-[#2a2a36] rounded-xl pl-10 pr-4 py-3 text-white placeholder-[#a0a0b0] focus:outline-none focus:border-[#ff6b00] transition-colors text-sm" />
              </div>
            </div>

            <div>
              <label className="block text-[#a0a0b0] text-xs uppercase tracking-wider font-bold mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#a0a0b0]" />
                <input type={showPass ? "text" : "password"} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required placeholder="Your password"
                  className="w-full bg-[#1a1a24] border border-[#2a2a36] rounded-xl pl-10 pr-11 py-3 text-white placeholder-[#a0a0b0] focus:outline-none focus:border-[#ff6b00] transition-colors text-sm" />
                <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#a0a0b0] hover:text-white transition-colors">
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="text-right">
              <Link href="/forgot-password" className="text-xs text-[#ff6b00] hover:text-[#ff8533] transition-colors">Forgot password?</Link>
            </div>

            <div className="bg-[#1a1a24] border border-[#2a2a36] rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-xs text-[#a0a0b0] font-bold uppercase tracking-wider">
                  <Shield className="w-3.5 h-3.5 text-[#ff6b00]" /> Security Check
                </div>
                <button type="button" onClick={refreshCaptcha} className="text-[#a0a0b0] hover:text-[#ff6b00] transition-colors">
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>
              {captcha ? (
                <>
                  <p className="text-white text-sm mb-2 font-medium">{captcha.question}</p>
                  <input type="text" inputMode="numeric" value={form.captchaAnswer} onChange={(e) => setForm({ ...form, captchaAnswer: e.target.value })}
                    placeholder="Your answer" required
                    className="w-full bg-[#12121a] border border-[#2a2a36] rounded-lg px-3 py-2 text-white placeholder-[#a0a0b0] focus:outline-none focus:border-[#ff6b00] transition-colors text-sm" />
                </>
              ) : (
                <div className="text-[#a0a0b0] text-sm animate-pulse">Loading security check…</div>
              )}
            </div>

            <button type="submit" disabled={loading || !captcha}
              className="w-full py-3.5 bg-[#ff6b00] text-white font-black uppercase text-sm rounded-xl hover:bg-[#e66000] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-[0_0_20px_rgba(255,107,0,0.3)] mt-2">
              {loading ? "Signing in…" : "Sign In"}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-[#a0a0b0]">
            Don't have an account?{" "}
            <Link href="/sign-up" className="text-[#ff6b00] font-bold hover:text-[#ff8533] transition-colors">Register now</Link>
          </div>
        </div>

        <div className="mt-4 text-center">
          <Link href="/admin-login" className="inline-flex items-center gap-1.5 text-xs text-[#606070] hover:text-[#a0a0b0] transition-colors">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            Admin Login
          </Link>
        </div>
      </div>
    </div>
  );
}
