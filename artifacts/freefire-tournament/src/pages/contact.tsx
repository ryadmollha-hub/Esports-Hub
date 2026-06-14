import { MessageCircle, Send, Facebook, Mail, Phone, MapPin } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const socials = [
  {
    name: "WhatsApp",
    icon: MessageCircle,
    href: "https://wa.me/your-number",
    color: "text-[#00ff88] border-[#00ff88]/30 hover:border-[#00ff88] hover:bg-[#00ff88]/10",
    desc: "Chat with us directly on WhatsApp for fastest response",
  },
  {
    name: "Telegram",
    icon: Send,
    href: "https://t.me/your-group",
    color: "text-[#229ED9] border-[#229ED9]/30 hover:border-[#229ED9] hover:bg-[#229ED9]/10",
    desc: "Join our Telegram group for updates and announcements",
  },
  {
    name: "Facebook",
    icon: Facebook,
    href: "https://facebook.com/your-page",
    color: "text-[#1877F2] border-[#1877F2]/30 hover:border-[#1877F2] hover:bg-[#1877F2]/10",
    desc: "Follow us on Facebook for news and community posts",
  },
];

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 pt-24 pb-16">
        <h1 className="text-4xl font-black uppercase mb-2" data-testid="heading-contact">
          Contact <span className="text-[#ff6b00]">Us</span>
        </h1>
        <p className="text-[#a0a0b0] mb-10">
          Have questions? Need support? Reach us on any platform below.
        </p>

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
                Contact on {s.name} →
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
