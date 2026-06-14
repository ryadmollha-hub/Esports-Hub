import { Link } from "wouter";
import { Flame, MessageCircle, Send, Facebook } from "lucide-react";

export default function Footer() {
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
            <div className="flex gap-4 mt-6">
              <a
                href="https://wa.me/your-number"
                target="_blank"
                rel="noopener noreferrer"
                data-testid="link-footer-whatsapp"
                className="w-10 h-10 bg-[#12121a] border border-[#2a2a36] rounded-lg flex items-center justify-center text-[#00ff88] hover:border-[#00ff88] transition-colors"
              >
                <MessageCircle className="w-5 h-5" />
              </a>
              <a
                href="https://t.me/your-group"
                target="_blank"
                rel="noopener noreferrer"
                data-testid="link-footer-telegram"
                className="w-10 h-10 bg-[#12121a] border border-[#2a2a36] rounded-lg flex items-center justify-center text-[#229ED9] hover:border-[#229ED9] transition-colors"
              >
                <Send className="w-5 h-5" />
              </a>
              <a
                href="https://facebook.com/your-page"
                target="_blank"
                rel="noopener noreferrer"
                data-testid="link-footer-facebook"
                className="w-10 h-10 bg-[#12121a] border border-[#2a2a36] rounded-lg flex items-center justify-center text-[#1877F2] hover:border-[#1877F2] transition-colors"
              >
                <Facebook className="w-5 h-5" />
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
            <h4 className="text-white font-bold uppercase text-sm mb-4 tracking-wider">Community</h4>
            <div className="flex flex-col gap-2">
              {[
                ["Teams", "/teams"],
                ["Dashboard", "/dashboard"],
                ["Contact", "/contact"],
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
        href="https://wa.me/your-number"
        target="_blank"
        rel="noopener noreferrer"
        data-testid="button-whatsapp-float"
        className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-[#00ff88] rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(0,255,136,0.4)] hover:scale-110 transition-transform"
      >
        <MessageCircle className="w-7 h-7 text-[#0a0a0f]" />
      </a>
    </footer>
  );
}
