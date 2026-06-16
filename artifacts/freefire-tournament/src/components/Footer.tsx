import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Flame, MessageCircle, Send, Facebook } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

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

export default function Footer() {
  const settings = useSupportSettings();
  const whatsappHref = `https://wa.me/88${settings.whatsapp_number.replace(/^0/, "")}`;

  return (
    <footer className="bg-[#0a0a0f] border-t border-[#ff6b00]/20 mt-20">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <Flame className="w-6 h-6 text-[#ff6b00]" />
              <span className="text-lg font-bold uppercase text-white">
                FF <span className="text-[#ff6b00]">Arena</span>
              </span>
            </div>
            <p className="text-[#a0a0b0] text-sm leading-relaxed max-w-xs">
              The premier Free Fire tournament platform. Compete, climb the ranks, and claim your prize.
            </p>
            <div className="flex gap-3 mt-6">
              <a
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                data-testid="link-footer-whatsapp"
                title={`WhatsApp: ${settings.whatsapp_number}`}
                className="flex items-center gap-2 px-3 py-2 bg-[#00ff88]/10 border border-[#00ff88]/20 rounded-lg text-[#00ff88] hover:bg-[#00ff88]/20 hover:border-[#00ff88]/50 transition-all text-xs font-bold"
              >
                <MessageCircle className="w-4 h-4" />
                WhatsApp
              </a>
              <a
                href={settings.telegram_link}
                target="_blank"
                rel="noopener noreferrer"
                data-testid="link-footer-telegram"
                title="Telegram Support"
                className="flex items-center gap-2 px-3 py-2 bg-[#229ED9]/10 border border-[#229ED9]/20 rounded-lg text-[#229ED9] hover:bg-[#229ED9]/20 hover:border-[#229ED9]/50 transition-all text-xs font-bold"
              >
                <Send className="w-4 h-4" />
                Telegram
              </a>
              <a
                href="https://facebook.com/your-page"
                target="_blank"
                rel="noopener noreferrer"
                data-testid="link-footer-facebook"
                className="w-9 h-9 bg-[#12121a] border border-[#2a2a36] rounded-lg flex items-center justify-center text-[#1877F2] hover:border-[#1877F2] transition-colors"
              >
                <Facebook className="w-4 h-4" />
              </a>
            </div>
          </div>

          <div>
            <h4 className="text-white font-bold uppercase text-sm mb-4 tracking-wider">Platform</h4>
            <div className="flex flex-col gap-2">
              {[
                ["Tournaments", "/tournaments"],
                ["Leaderboard", "/leaderboard"],
                ["Schedule", "/schedule"],
                ["Results", "/results"],
                ["Prizes", "/prizes"],
              ].map(([label, href]) => (
                <Link key={href} href={href} data-testid={`link-footer-${label.toLowerCase()}`} className="text-[#a0a0b0] hover:text-[#ff6b00] text-sm transition-colors">
                  {label}
                </Link>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-white font-bold uppercase text-sm mb-4 tracking-wider">Support</h4>
            <div className="flex flex-col gap-2">
              {[
                ["Support Center", "/support"],
                ["My Tickets", "/my-tickets"],
                ["Contact Us", "/contact"],
                ["Teams", "/teams"],
                ["Dashboard", "/dashboard"],
              ].map(([label, href]) => (
                <Link key={href} href={href} data-testid={`link-footer-community-${label.toLowerCase()}`} className="text-[#a0a0b0] hover:text-[#ff6b00] text-sm transition-colors">
                  {label}
                </Link>
              ))}
            </div>
          </div>
        </div>

        <div className="border-t border-[#ff6b00]/10 mt-8 pt-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-[#a0a0b0] text-xs">
            &copy; {new Date().getFullYear()} FF Arena. All rights reserved.
          </p>
          <p className="text-[#a0a0b0] text-xs">
            Not affiliated with Garena Free Fire.
          </p>
        </div>
      </div>

      <a
        href={whatsappHref}
        target="_blank"
        rel="noopener noreferrer"
        data-testid="button-whatsapp-float"
        title={`WhatsApp: ${settings.whatsapp_number}`}
        className="fixed bottom-20 right-4 z-40 w-12 h-12 bg-[#00ff88] rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(0,255,136,0.4)] hover:scale-110 transition-transform"
      >
        <MessageCircle className="w-6 h-6 text-[#0a0a0f]" />
      </a>
    </footer>
  );
}
