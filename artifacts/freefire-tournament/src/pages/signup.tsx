import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Flame, Eye, EyeOff, Mail, Lock, User, AlertCircle, CheckCircle, RefreshCw, Shield } from "lucide-react";
import { useAuthContext } from "@/lib/AuthContext";

import { apiBase as BASE } from "@/lib/apiBase";

interface Captcha { token: string; question: string; }

async function fetchCaptcha(): Promise<Captcha> {
  const res = await fetch(`${BASE}/api/captcha`);
  return res.json();
}

function getPasswordStrength(pw: string): { score: number; label: string; color: string } {
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[a-z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  const labels = ["", "Very Weak", "Weak", "Fair", "Strong", "Very Strong"];
  const colors = ["", "#ff2244", "#ff6b00", "#ffcc00", "#00cc66", "#00ff88"];
  return { score, label: labels[score] ?? "", color: colors[score] ?? "#2a2a36" };
}

export default function SignUpPage() {
  const { register } = useAuthContext();
  const [, setLocation] = useLocation();
  const [form, setForm] = useState({ email: "", username: "", password: "", confirm: "", captchaAnswer: "" });
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

  const strength = getPasswordStrength(form.password);

  const requirements = [
    { label: "At least 8 characters", met: form.password.length >= 8 },
    { label: "Uppercase letter (A-Z)", met: /[A-Z]/.test(form.password) },
    { label: "Lowercase letter (a-z)", met: /[a-z]/.test(form.password) },
    { label: "Number (0-9)", met: /\d/.test(form.password) },
    { label: "Passwords match", met: form.password === form.confirm && form.confirm.length > 0 },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (form.password !== form.confirm) { setError("Passwords do not match."); return; }
    if (!requirements.slice(0, 4).every((r) => r.met)) {
      setError("Password does not meet the requirements."); return;
    }
    if (!captcha) { setError("Security check not loaded. Please wait."); return; }
    if (!form.captchaAnswer.trim()) { setError("Please answer the security question."); return; }
    setLoading(true);
    try {
      await register(form.email, form.password, form.username, captcha.token, form.captchaAnswer);
      setLocation("/dashboard");
    } catch (err: any) {
      setError(err.message ?? "Registration failed. Please try again.");
      refreshCaptcha();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center px-4 py-8 relative overflow-hidden">
      <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center opacity-10" />
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0f] via-[#0a0a0f]/60 to-transparent" />

      <div className="relative z-10 w-full max-w-sm">
        <div className="text-center mb-4">
          <Link href="/" className="inline-flex items-center gap-1.5 mb-3">
            <Flame className="w-6 h-6 text-[#ff6b00]" />
            <span className="text-xl font-black uppercase text-white">FF <span className="text-[#ff6b00]">Arena</span></span>
          </Link>
          <h1 className="text-2xl font-black uppercase text-white">Create <span className="text-[#ff6b00]">Account</span></h1>
          <p className="text-[#a0a0b0] text-sm mt-0.5">Join the Free Fire tournament community</p>
        </div>

        <div className="bg-[#12121a] rounded-2xl border border-[#ff6b00]/20 p-5 shadow-[0_0_30px_rgba(255,107,0,0.08)]">
          {error && (
            <div className="flex items-center gap-2 bg-[#ff2244]/10 border border-[#ff2244]/30 text-[#ff2244] rounded-xl px-3 py-2 mb-3 text-xs">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-[#a0a0b0] text-xs uppercase tracking-wider font-bold mb-1.5">Email Address *</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#a0a0b0]" />
                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required placeholder="you@example.com"
                  className="w-full bg-[#1a1a24] border border-[#2a2a36] rounded-xl pl-9 pr-3 py-2.5 text-white placeholder-[#a0a0b0] focus:outline-none focus:border-[#ff6b00] transition-colors text-sm" />
              </div>
            </div>

            <div>
              <label className="block text-[#a0a0b0] text-xs uppercase tracking-wider font-bold mb-1.5">Username <span className="text-[#a0a0b0] font-normal normal-case">(optional)</span></label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#a0a0b0]" />
                <input type="text" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} placeholder="ProPlayer99"
                  className="w-full bg-[#1a1a24] border border-[#2a2a36] rounded-xl pl-9 pr-3 py-2.5 text-white placeholder-[#a0a0b0] focus:outline-none focus:border-[#ff6b00] transition-colors text-sm" />
              </div>
            </div>

            <div>
              <label className="block text-[#a0a0b0] text-xs uppercase tracking-wider font-bold mb-1.5">Password *</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#a0a0b0]" />
                <input type={showPass ? "text" : "password"} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required placeholder="Min. 8 characters"
                  className="w-full bg-[#1a1a24] border border-[#2a2a36] rounded-xl pl-9 pr-10 py-2.5 text-white placeholder-[#a0a0b0] focus:outline-none focus:border-[#ff6b00] transition-colors text-sm" />
                <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#a0a0b0] hover:text-white">
                  {showPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
              {form.password.length > 0 && (
                <div className="mt-1.5">
                  <div className="flex gap-1 mb-0.5">
                    {[1,2,3,4,5].map((i) => (
                      <div key={i} className="h-0.5 flex-1 rounded-full transition-colors duration-300"
                        style={{ backgroundColor: i <= strength.score ? strength.color : "#2a2a36" }} />
                    ))}
                  </div>
                  <span className="text-xs" style={{ color: strength.color }}>{strength.label}</span>
                </div>
              )}
            </div>

            <div>
              <label className="block text-[#a0a0b0] text-xs uppercase tracking-wider font-bold mb-1.5">Confirm Password *</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#a0a0b0]" />
                <input type={showPass ? "text" : "password"} value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} required placeholder="Repeat password"
                  className="w-full bg-[#1a1a24] border border-[#2a2a36] rounded-xl pl-9 pr-3 py-2.5 text-white placeholder-[#a0a0b0] focus:outline-none focus:border-[#ff6b00] transition-colors text-sm" />
              </div>
            </div>

            {(form.password.length > 0 || form.confirm.length > 0) && (
              <div className="space-y-0.5 bg-[#1a1a24] rounded-xl p-2.5">
                {requirements.map((req) => (
                  <div key={req.label} className={`flex items-center gap-1.5 text-xs ${req.met ? "text-[#00ff88]" : "text-[#a0a0b0]"}`}>
                    <CheckCircle className={`w-3 h-3 shrink-0 ${req.met ? "text-[#00ff88]" : "text-[#2a2a36]"}`} />
                    {req.label}
                  </div>
                ))}
              </div>
            )}

            <div className="bg-[#1a1a24] border border-[#2a2a36] rounded-xl p-3">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5 text-xs text-[#a0a0b0] font-bold uppercase tracking-wider">
                  <Shield className="w-3 h-3 text-[#ff6b00]" /> Security Check
                </div>
                <button type="button" onClick={refreshCaptcha} className="text-[#a0a0b0] hover:text-[#ff6b00] transition-colors">
                  <RefreshCw className="w-3 h-3" />
                </button>
              </div>
              {captcha ? (
                <>
                  <p className="text-white text-sm mb-1.5 font-medium">{captcha.question}</p>
                  <input type="text" inputMode="numeric" value={form.captchaAnswer} onChange={(e) => setForm({ ...form, captchaAnswer: e.target.value })}
                    placeholder="Your answer" required
                    className="w-full bg-[#12121a] border border-[#2a2a36] rounded-lg px-3 py-1.5 text-white placeholder-[#a0a0b0] focus:outline-none focus:border-[#ff6b00] transition-colors text-sm" />
                </>
              ) : (
                <div className="text-[#a0a0b0] text-sm animate-pulse">Loading security check…</div>
              )}
            </div>

            <button type="submit" disabled={loading || !captcha}
              className="w-full py-2.5 bg-[#ff6b00] text-white font-black uppercase text-sm rounded-xl hover:bg-[#e66000] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-[0_0_15px_rgba(255,107,0,0.3)]">
              {loading ? "Creating account…" : "Create Account"}
            </button>
          </form>

          <div className="mt-4 text-center text-sm text-[#a0a0b0]">
            Already have an account?{" "}
            <Link href="/sign-in" className="text-[#ff6b00] font-bold hover:text-[#ff8533] transition-colors">Sign in</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
