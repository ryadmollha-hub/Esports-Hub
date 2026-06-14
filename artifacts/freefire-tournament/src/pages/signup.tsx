import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Flame, Eye, EyeOff, Mail, Lock, User, AlertCircle, CheckCircle } from "lucide-react";
import { useAuthContext } from "@/lib/AuthContext";

export default function SignUpPage() {
  const { register } = useAuthContext();
  const [, setLocation] = useLocation();
  const [form, setForm] = useState({ email: "", username: "", password: "", confirm: "" });
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (form.password !== form.confirm) { setError("Passwords do not match"); return; }
    if (form.password.length < 6) { setError("Password must be at least 6 characters"); return; }
    setLoading(true);
    try {
      await register(form.email, form.password, form.username);
      setLocation("/dashboard");
    } catch (err: any) {
      setError(err.message ?? "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const requirements = [
    { label: "At least 6 characters", met: form.password.length >= 6 },
    { label: "Passwords match", met: form.password === form.confirm && form.confirm.length > 0 },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center px-4 py-12 relative overflow-hidden">
      <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center opacity-10" />
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0f] via-[#0a0a0f]/60 to-transparent" />

      <div className="relative z-10 w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <Flame className="w-8 h-8 text-[#ff6b00]" />
            <span className="text-2xl font-black uppercase text-white">FF <span className="text-[#ff6b00]">Arena</span></span>
          </Link>
          <h1 className="text-3xl font-black uppercase text-white">Create <span className="text-[#ff6b00]">Account</span></h1>
          <p className="text-[#a0a0b0] mt-1">Join the Free Fire tournament community</p>
        </div>

        <div className="bg-[#12121a] rounded-2xl border border-[#ff6b00]/20 p-8 shadow-[0_0_40px_rgba(255,107,0,0.08)]">
          {error && (
            <div className="flex items-center gap-2 bg-[#ff2244]/10 border border-[#ff2244]/30 text-[#ff2244] rounded-xl px-4 py-3 mb-5 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" /> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[#a0a0b0] text-xs uppercase tracking-wider font-bold mb-2">Email Address *</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#a0a0b0]" />
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                  placeholder="you@example.com"
                  className="w-full bg-[#1a1a24] border border-[#2a2a36] rounded-xl pl-10 pr-4 py-3 text-white placeholder-[#a0a0b0] focus:outline-none focus:border-[#ff6b00] transition-colors text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-[#a0a0b0] text-xs uppercase tracking-wider font-bold mb-2">Username <span className="text-[#a0a0b0] font-normal normal-case">(optional)</span></label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#a0a0b0]" />
                <input
                  type="text"
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                  placeholder="ProPlayer99"
                  className="w-full bg-[#1a1a24] border border-[#2a2a36] rounded-xl pl-10 pr-4 py-3 text-white placeholder-[#a0a0b0] focus:outline-none focus:border-[#ff6b00] transition-colors text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-[#a0a0b0] text-xs uppercase tracking-wider font-bold mb-2">Password *</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#a0a0b0]" />
                <input
                  type={showPass ? "text" : "password"}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
                  placeholder="Min. 6 characters"
                  className="w-full bg-[#1a1a24] border border-[#2a2a36] rounded-xl pl-10 pr-11 py-3 text-white placeholder-[#a0a0b0] focus:outline-none focus:border-[#ff6b00] transition-colors text-sm"
                />
                <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#a0a0b0] hover:text-white">
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[#a0a0b0] text-xs uppercase tracking-wider font-bold mb-2">Confirm Password *</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#a0a0b0]" />
                <input
                  type={showPass ? "text" : "password"}
                  value={form.confirm}
                  onChange={(e) => setForm({ ...form, confirm: e.target.value })}
                  required
                  placeholder="Repeat password"
                  className="w-full bg-[#1a1a24] border border-[#2a2a36] rounded-xl pl-10 pr-4 py-3 text-white placeholder-[#a0a0b0] focus:outline-none focus:border-[#ff6b00] transition-colors text-sm"
                />
              </div>
            </div>

            {(form.password.length > 0 || form.confirm.length > 0) && (
              <div className="space-y-1">
                {requirements.map((req) => (
                  <div key={req.label} className={`flex items-center gap-2 text-xs ${req.met ? "text-[#00ff88]" : "text-[#a0a0b0]"}`}>
                    <CheckCircle className={`w-3.5 h-3.5 ${req.met ? "text-[#00ff88]" : "text-[#2a2a36]"}`} />
                    {req.label}
                  </div>
                ))}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-[#ff6b00] text-white font-black uppercase text-sm rounded-xl hover:bg-[#e66000] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-[0_0_20px_rgba(255,107,0,0.3)] mt-2"
            >
              {loading ? "Creating account..." : "Create Account"}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-[#a0a0b0]">
            Already have an account?{" "}
            <Link href="/sign-in" className="text-[#ff6b00] font-bold hover:text-[#ff8533] transition-colors">
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
