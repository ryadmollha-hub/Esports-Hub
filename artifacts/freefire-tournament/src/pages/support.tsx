import { useState, useEffect, useRef } from "react";
import { Link } from "wouter";
import { MessageCircle, Send, Ticket, ChevronRight, AlertCircle, CheckCircle, Upload, X } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useAuthContext } from "@/lib/AuthContext";
import { useToast } from "@/hooks/use-toast";

import { apiBase as BASE } from "@/lib/apiBase";

const CATEGORIES = [
  { value: "payment_issue", label: "Payment Issue" },
  { value: "tournament_issue", label: "Tournament Issue" },
  { value: "match_issue", label: "Match Issue" },
  { value: "account_issue", label: "Account Issue" },
  { value: "technical_issue", label: "Technical Issue" },
  { value: "other", label: "Other" },
];

function useSupportSettings() {
  const [settings, setSettings] = useState({ whatsapp_number: "01768177772", telegram_link: "https://t.me/ayman990" });
  useEffect(() => {
    fetch(`${BASE}/api/support-settings`)
      .then((r) => r.json())
      .then((d) => { if (d?.whatsapp_number) setSettings(d); })
      .catch(() => {});
  }, []);
  return settings;
}

export default function SupportPage() {
  const { user, authFetch } = useAuthContext();
  const { toast } = useToast();
  const settings = useSupportSettings();
  const fileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({ subject: "", category: "", message: "" });
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [screenshotName, setScreenshotName] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const whatsappHref = `https://wa.me/88${settings.whatsapp_number.replace(/^0/, "")}`;

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "File too large", description: "Max 5 MB", variant: "destructive" });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setScreenshot(reader.result as string);
      setScreenshotName(file.name);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!form.subject.trim() || !form.category || !form.message.trim()) {
      toast({ title: "Fill in all required fields", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const res = await authFetch("/support/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, screenshotUrl: screenshot ?? undefined }),
      });
      const data = await res.json();
      if (res.ok) {
        setSubmitted(true);
        setForm({ subject: "", category: "", message: "" });
        setScreenshot(null);
        setScreenshotName(null);
        toast({ title: "Ticket submitted!", description: "We'll respond as soon as possible." });
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
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <Navbar />
      <div className="max-w-4xl mx-auto px-3 pt-16 pb-20">

        <h1 className="text-2xl sm:text-4xl font-black uppercase mb-1.5">
          Support <span className="text-[#ff6b00]">Center</span>
        </h1>
        <p className="text-[#a0a0b0] mb-7">
          Get help instantly via WhatsApp or Telegram, or submit a support ticket.
        </p>

        {/* Quick Contact Buttons */}
        <div className="grid sm:grid-cols-2 gap-3 mb-7">
          <a
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 bg-[#12121a] border border-[#00ff88]/20 hover:border-[#00ff88] rounded-2xl p-3.5 transition-all group"
          >
            <div className="w-12 h-12 bg-[#00ff88]/10 rounded-xl flex items-center justify-center group-hover:bg-[#00ff88]/20 transition-colors shrink-0">
              <MessageCircle className="w-6 h-6 text-[#00ff88]" />
            </div>
            <div className="min-w-0">
              <div className="font-black text-white text-lg">WhatsApp</div>
              <div className="text-[#00ff88] text-sm font-mono">{settings.whatsapp_number}</div>
              <div className="text-[#a0a0b0] text-xs mt-0.5">Fastest response · Usually within minutes</div>
            </div>
            <ChevronRight className="w-5 h-5 text-[#00ff88] ml-auto shrink-0 group-hover:translate-x-1 transition-transform" />
          </a>

          <a
            href={settings.telegram_link}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 bg-[#12121a] border border-[#229ED9]/20 hover:border-[#229ED9] rounded-2xl p-3.5 transition-all group"
          >
            <div className="w-12 h-12 bg-[#229ED9]/10 rounded-xl flex items-center justify-center group-hover:bg-[#229ED9]/20 transition-colors shrink-0">
              <Send className="w-6 h-6 text-[#229ED9]" />
            </div>
            <div className="min-w-0">
              <div className="font-black text-white text-lg">Telegram</div>
              <div className="text-[#229ED9] text-sm truncate">{settings.telegram_link}</div>
              <div className="text-[#a0a0b0] text-xs mt-0.5">Join our group for updates & support</div>
            </div>
            <ChevronRight className="w-5 h-5 text-[#229ED9] ml-auto shrink-0 group-hover:translate-x-1 transition-transform" />
          </a>
        </div>

        {/* Support Ticket Section */}
        <div className="bg-[#12121a] rounded-2xl border border-[#ff6b00]/15 p-4 mb-4">
          <div className="flex items-center justify-between mb-3.5">
            <div className="flex items-center gap-2.5">
              <Ticket className="w-5 h-5 text-[#ff6b00]" />
              <h2 className="font-black text-lg uppercase">Submit a Ticket</h2>
            </div>
            {user && (
              <Link href="/my-tickets" className="text-sm text-[#ff6b00] hover:underline flex items-center gap-1 font-bold">
                My Tickets <ChevronRight className="w-4 h-4" />
              </Link>
            )}
          </div>

          {!user ? (
            <div className="text-center py-7">
              <AlertCircle className="w-12 h-12 text-[#a0a0b0] mx-auto mb-2.5 opacity-30" />
              <p className="text-[#a0a0b0] mb-3">You need to be logged in to submit a support ticket.</p>
              <Link href="/sign-in" className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#ff6b00] text-white font-black uppercase rounded-xl text-sm hover:bg-[#e66000] transition-colors">
                Sign In
              </Link>
            </div>
          ) : submitted ? (
            <div className="text-center py-7">
              <CheckCircle className="w-12 h-12 text-[#00ff88] mx-auto mb-2.5" />
              <h3 className="font-black text-white text-lg mb-1">Ticket Submitted!</h3>
              <p className="text-[#a0a0b0] mb-3.5">We'll review your ticket and respond as soon as possible.</p>
              <div className="flex items-center justify-center gap-2.5">
                <Link href="/my-tickets" className="px-4 py-2 bg-[#ff6b00] text-white font-black uppercase rounded-xl text-sm hover:bg-[#e66000] transition-colors">
                  View My Tickets
                </Link>
                <button
                  onClick={() => setSubmitted(false)}
                  className="px-4 py-2 bg-[#1a1a24] text-[#a0a0b0] font-bold uppercase rounded-xl text-sm hover:text-white transition-colors"
                >
                  New Ticket
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-[#a0a0b0] text-xs uppercase tracking-wider mb-1 font-bold">Subject *</label>
                <input
                  type="text"
                  value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })}
                  required
                  maxLength={200}
                  placeholder="Brief description of your issue"
                  className="w-full bg-[#0a0a0f] border border-[#2a2a36] rounded-xl px-3 py-2 text-white text-sm placeholder-[#4a4a5a] focus:outline-none focus:border-[#ff6b00] transition-colors"
                />
              </div>

              <div>
                <label className="block text-[#a0a0b0] text-xs uppercase tracking-wider mb-1 font-bold">Category *</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  required
                  className="w-full bg-[#0a0a0f] border border-[#2a2a36] rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-[#ff6b00] transition-colors"
                >
                  <option value="">Select a category</option>
                  {CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[#a0a0b0] text-xs uppercase tracking-wider mb-1 font-bold">Message *</label>
                <textarea
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  required
                  maxLength={5000}
                  rows={5}
                  placeholder="Describe your issue in detail..."
                  className="w-full bg-[#0a0a0f] border border-[#2a2a36] rounded-xl px-3 py-2 text-white text-sm placeholder-[#4a4a5a] focus:outline-none focus:border-[#ff6b00] transition-colors resize-none"
                />
                <div className="text-right text-[#4a4a5a] text-xs mt-1">{form.message.length}/5000</div>
              </div>

              <div>
                <label className="block text-[#a0a0b0] text-xs uppercase tracking-wider mb-1 font-bold">Screenshot (Optional)</label>
                {screenshot ? (
                  <div className="flex items-center gap-2.5 bg-[#0a0a0f] border border-[#2a2a36] rounded-xl px-3 py-2">
                    <img src={screenshot} alt="preview" className="w-10 h-10 object-cover rounded-lg" />
                    <span className="text-[#a0a0b0] text-sm flex-1 truncate">{screenshotName}</span>
                    <button type="button" onClick={() => { setScreenshot(null); setScreenshotName(null); if (fileRef.current) fileRef.current.value = ""; }} className="text-[#ff2244] hover:text-red-400">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="w-full bg-[#0a0a0f] border border-dashed border-[#2a2a36] rounded-xl px-3 py-3 text-[#4a4a5a] text-sm flex items-center justify-center gap-1.5 hover:border-[#ff6b00]/50 hover:text-[#a0a0b0] transition-colors"
                  >
                    <Upload className="w-4 h-4" />
                    Upload screenshot (JPEG, PNG, WebP, GIF · max 5 MB)
                  </button>
                )}
                <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={handleFile} />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 bg-[#ff6b00] text-white font-black uppercase rounded-xl text-sm hover:bg-[#e66000] disabled:opacity-50 transition-all"
              >
                {submitting ? "Submitting..." : "Submit Ticket"}
              </button>
            </form>
          )}
        </div>

      </div>
      <Footer />
    </div>
  );
}
