import { useState, useEffect } from "react";
import { MessageCircle, Send, Facebook, Mail, ChevronRight } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Link } from "wouter";

import { apiBase as BASE } from "@/lib/apiBase";

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

export default function ContactPage() {
  const settings = useSupportSettings();
  const whatsappHref = `https://wa.me/88${settings.whatsapp_number.replace(/^0/, "")}`;

  const socials = [
    {
      name: "WhatsApp",
      icon: MessageCircle,
      href: whatsappHref,
      color: "text-[#00ff88] border-[#00ff88]/30 hover:border-[#00ff88] hover:bg-[#00ff88]/10",
      desc: `Chat with us on WhatsApp — ${settings.whatsapp_number}`,
      cta: "Chat on WhatsApp",
    },
    {
      name: "Telegram",
      icon: Send,
      href: settings.telegram_link,
      color: "text-[#229ED9] border-[#229ED9]/30 hover:border-[#229ED9] hover:bg-[#229ED9]/10",
      desc: "Join our Telegram group for updates and support",
      cta: "Open Telegram",
    },
    {
      name: "Facebook",
      icon: Facebook,
      href: "https://facebook.com/your-page",
      color: "text-[#1877F2] border-[#1877F2]/30 hover:border-[#1877F2] hover:bg-[#1877F2]/10",
      desc: "Follow us on Facebook for news and community posts",
      cta: "Open Facebook",
    },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 pt-16 pb-16">
        <h1 className="text-2xl sm:text-4xl font-black uppercase mb-2" data-testid="heading-contact">
          Contact <span className="text-[#ff6b00]">Us</span>
        </h1>
        <p className="text-[#a0a0b0] mb-10">
          Have questions? Need support? Reach us on any platform below.
        </p>

        {/* Quick Action Buttons */}
        <div className="grid sm:grid-cols-2 gap-4 mb-8">
          <a
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-4 bg-[#00ff88] rounded-2xl p-5 transition-all hover:bg-[#00e87a] group"
          >
            <div className="w-12 h-12 bg-black/10 rounded-xl flex items-center justify-center shrink-0">
              <MessageCircle className="w-7 h-7 text-[#0a0a0f]" />
            </div>
            <div className="min-w-0">
              <div className="font-black text-[#0a0a0f] text-lg leading-tight">WhatsApp Support</div>
              <div className="text-[#0a0a0f]/70 text-sm font-mono mt-0.5">{settings.whatsapp_number}</div>
            </div>
            <ChevronRight className="w-5 h-5 text-[#0a0a0f] ml-auto shrink-0 group-hover:translate-x-1 transition-transform" />
          </a>

          <a
            href={settings.telegram_link}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-4 bg-[#229ED9] rounded-2xl p-5 transition-all hover:bg-[#1a8ec9] group"
          >
            <div className="w-12 h-12 bg-black/10 rounded-xl flex items-center justify-center shrink-0">
              <Send className="w-7 h-7 text-white" />
            </div>
            <div className="min-w-0">
              <div className="font-black text-white text-lg leading-tight">Telegram Support</div>
              <div className="text-white/70 text-sm mt-0.5 truncate">{settings.telegram_link}</div>
            </div>
            <ChevronRight className="w-5 h-5 text-white ml-auto shrink-0 group-hover:translate-x-1 transition-transform" />
          </a>
        </div>

        {/* Support Ticket CTA */}
        <Link
          href="/support"
          className="block w-full bg-[#12121a] border border-[#ff6b00]/20 hover:border-[#ff6b00]/50 rounded-2xl p-5 mb-10 transition-all group"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-[#ff6b00]/10 rounded-xl flex items-center justify-center shrink-0 group-hover:bg-[#ff6b00]/20 transition-colors">
              <Mail className="w-6 h-6 text-[#ff6b00]" />
            </div>
            <div className="flex-1">
              <div className="font-black text-white text-lg">Submit a Support Ticket</div>
              <div className="text-[#a0a0b0] text-sm">For complex issues — track status and get a written response</div>
            </div>
            <ChevronRight className="w-5 h-5 text-[#ff6b00] shrink-0 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {socials.map((s) => (
            <a
              key={s.name}
              href={s.href}
              target="_blank"
              rel="noopener noreferrer"
              data-testid={`link-contact-${s.name.toLowerCase()}`}
              className={`block bg-[#12121a] border rounded-2xl p-6 transition-all ${s.color}`}
            >
              <s.icon className="w-8 h-8 mb-4" />
              <h3 className="font-black text-lg text-white mb-2">{s.name}</h3>
              <p className="text-[#a0a0b0] text-sm leading-relaxed">{s.desc}</p>
              <div className="mt-4 text-sm font-bold flex items-center gap-1">
                {s.cta} →
              </div>
            </a>
          ))}
        </div>

        <div className="bg-[#12121a] rounded-2xl border border-[#ff6b00]/20 p-8">
          <h2 className="text-xl font-black uppercase mb-6 text-[#ff6b00]">Frequently Asked Questions</h2>
          <div className="space-y-6">
            {[
              {
                q: "How do I join a tournament?",
                a: "Create an account, find a tournament that's open for registration, and click Register Now. Fill in your Free Fire UID and player name, then submit.",
              },
              {
                q: "How is the prize money paid?",
                a: "Prize money is paid via bKash, Nagad, or bank transfer within 48 hours of the tournament conclusion.",
              },
              {
                q: "What happens if I don't get approved?",
                a: "If your registration is rejected (usually due to payment verification failure), you'll be notified and can re-apply after resolving the issue.",
              },
              {
                q: "Can I participate in multiple tournaments?",
                a: "Yes! You can register for multiple tournaments as long as they don't overlap in schedule.",
              },
            ].map((faq, i) => (
              <div key={i} className="border-b border-[#ff6b00]/10 pb-6 last:border-0 last:pb-0" data-testid={`faq-item-${i}`}>
                <h4 className="font-bold text-white mb-2" data-testid={`text-faq-q-${i}`}>{faq.q}</h4>
                <p className="text-[#a0a0b0] text-sm leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
