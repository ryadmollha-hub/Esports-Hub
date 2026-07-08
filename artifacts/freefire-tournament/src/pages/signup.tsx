import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Flame, Eye, EyeOff, Mail, Lock, User, AlertCircle, CheckCircle, RefreshCw, Shield } from "lucide-react";
import { useAuthContext } from "@/lib/AuthContext";
import { useLanguage } from "@/lib/LanguageContext";
import { apiBase as BASE } from "@/lib/apiBase";

interface Captcha { token: string; question: string; }

async function fetchCaptcha(): Promise<Captcha> {
  const res = await fetch(`${BASE}/api/captcha`);
  return res.json();
}

export default function SignUpPage() {
  const { register } = useAuthContext();
  const { t } = useLanguage();
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

  const requirements = [
    { key: "req_letters" as const, met: /[a-zA-Z]/.test(form.password) },
    { key: "req_numbers" as const, met: /\d/.test(form.password) },
    { key: "req_match" as const, met: form.password === form.confirm && form.confirm.length > 0 },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (form.password !== form.confirm) { setError("Passwords do not match."); return; }
    if (!/[a-zA-Z]/.test(form.password)) { setError("Password must contain at least one letter."); return; }
    if (!/\d/.test(form.password)) { setError("Password must contain at least one number."); return; }
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
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center px-3 py-5 relative overflow-hidden">
      <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center opacity-10" />
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0f] via-[#0a0a0f]/60 to-transparent" />

      <div className="relative z-10 w-full max-w-sm">
        <div className="text-center mb-3">
          <Link href="/" className="inline-flex items-center gap-1 mb-2.5">
            <Flame className="w-6 h-6 text-[#ff6b00]" />
            <span className="text-xl font-black uppercase text-white">FF <span className="text-[#ff6b00]">Arena</span></span>
          </Link>
          <h1 className="text-2xl font-black uppercase text-white">{t("signup_title")}</h1>
          <p className="text-[#a0a0b0] text-sm mt-0.5">{t("signup_subtitle")}</p>
        </div>

        <div className="bg-[#12121a] rounded-2xl border border-[#ff6b00]/20 p-3.5 shadow-[0_0_30px_rgba(255,107,0,0.08)]">
          {error && (
            <div className="flex items-center gap-1.5 bg-[#ff2244]/10 border border-[#ff2244]/30 text-[#ff2244] rounded-xl px-2.5 py-1.5 mb-2.5 text-xs">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-2.5">
            <div>
              <label className="block text-[#a0a0b0] text-xs uppercase tracking-wider font-bold mb-1">{t("signup_email")} *</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#a0a0b0]" />
                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required placeholder="you@example.com"
                  className="w-full bg-[#1a1a24] border border-[#2a2a36] rounded-xl pl-6 pr-2.5 py-2 text-white placeholder-[#a0a0b0] focus:outline-none focus:border-[#ff6b00] transition-colors text-sm" />
              </div>
            </div>

            <div>
              <label className="block text-[#a0a0b0] text-xs uppercase tracking-wider font-bold mb-1">
                {t("signup_username")} <span className="text-[#a0a0b0] font-normal normal-case">(optional)</span>
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#a0a0b0]" />
                <input type="text" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} placeholder="ProPlayer99"
                  className="w-full bg-[#1a1a24] border border-[#2a2a36] rounded-xl pl-6 pr-2.5 py-2 text-white placeholder-[#a0a0b0] focus:outline-none focus:border-[#ff6b00] transition-colors text-sm" />
              </div>
            </div>

            <div>
              <label className="block text-[#a0a0b0] text-xs uppercase tracking-wider font-bold mb-1">{t("signup_password")} *</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#a0a0b0]" />
                <input type={showPass ? "text" : "password"} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required placeholder="e.g. player123"
                  className="w-full bg-[#1a1a24] border border-[#2a2a36] rounded-xl pl-6 pr-7 py-2 text-white placeholder-[#a0a0b0] focus:outline-none focus:border-[#ff6b00] transition-colors text-sm" />
                <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#a0a0b0] hover:text-white">
                  {showPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[#a0a0b0] text-xs uppercase tracking-wider font-bold mb-1">{t("signup_confirm")} *</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#a0a0b0]" />
                <input type={showPass ? "text" : "password"} value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} required placeholder="Repeat password"
                  className="w-full bg-[#1a1a24] border border-[#2a2a36] rounded-xl pl-6 pr-2.5 py-2 text-white placeholder-[#a0a0b0] focus:outline-none focus:border-[#ff6b00] transition-colors text-sm" />
              </div>
            </div>

            {(form.password.length > 0 || form.confirm.length > 0) && (
              <div className="space-y-0.5 bg-[#1a1a24] rounded-xl p-2">
                {requirements.map((req) => (
                  <div key={req.key} className={`flex items-center gap-1 text-xs ${req.met ? "text-[#00ff88]" : "text-[#a0a0b0]"}`}>
                    <CheckCircle className={`w-3 h-3 shrink-0 ${req.met ? "text-[#00ff88]" : "text-[#2a2a36]"}`} />
                    {t(req.key)}
                  </div>
                ))}
              </div>
            )}

            <div className="bg-[#1a1a24] border border-[#2a2a36] rounded-xl p-2.5">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1 text-xs text-[#a0a0b0] font-bold uppercase tracking-wider">
                  <Shield className="w-3 h-3 text-[#ff6b00]" /> Security Check
                </div>
                <button type="button" onClick={refreshCaptcha} className="text-[#a0a0b0] hover:text-[#ff6b00] transition-colors">
                  <RefreshCw className="w-3 h-3" />
                </button>
              </div>
              {captcha ? (
                <>
                  <p className="text-white text-sm mb-1 font-medium">{captcha.question}</p>
                  <input type="text" inputMode="numeric" value={form.captchaAnswer} onChange={(e) => setForm({ ...form, captchaAnswer: e.target.value })}
                    placeholder="Your answer" required
                    className="w-full bg-[#12121a] border border-[#2a2a36] rounded-lg px-2.5 py-1 text-white placeholder-[#a0a0b0] focus:outline-none focus:border-[#ff6b00] transition-colors text-sm" />
                </>
              ) : (
                <div className="text-[#a0a0b0] text-sm animate-pulse">Loading security check…</div>
              )}
            </div>

            <button type="submit" disabled={loading || !captcha}
              className="w-full py-2 bg-[#ff6b00] text-white font-black uppercase text-sm rounded-xl hover:bg-[#e66000] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-[0_0_15px_rgba(255,107,0,0.3)]">
              {loading ? t("loading") : t("signup_btn")}
            </button>
          </form>

          <div className="mt-3 text-center text-sm text-[#a0a0b0]">
            {t("signup_have_account")}{" "}
            <Link href="/sign-in" className="text-[#ff6b00] font-bold hover:text-[#ff8533] transition-colors">{t("signup_signin")}</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
