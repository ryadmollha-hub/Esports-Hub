import { Wrench, Clock, Flame } from "lucide-react";

export default function MaintenancePage() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center px-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center opacity-5" />
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#ff6b00]/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#ff2244]/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 text-center max-w-lg mx-auto">
        <div className="flex items-center justify-center gap-3 mb-8">
          <Flame className="w-8 h-8 text-[#ff6b00]" />
          <span className="text-2xl font-black uppercase text-white tracking-wider">
            FF <span className="text-[#ff6b00]">Arena</span>
          </span>
        </div>

        <div className="relative mb-8">
          <div className="w-24 h-24 mx-auto bg-[#ff6b00]/10 border border-[#ff6b00]/30 rounded-2xl flex items-center justify-center">
            <Wrench className="w-12 h-12 text-[#ff6b00] animate-bounce" />
          </div>
          <div className="absolute -top-2 -right-2 w-8 h-8 bg-[#ff2244]/20 border border-[#ff2244]/40 rounded-full flex items-center justify-center">
            <div className="w-2.5 h-2.5 rounded-full bg-[#ff2244] animate-pulse" />
          </div>
        </div>

        <h1 className="text-4xl font-black uppercase text-white mb-3 leading-tight">
          Under <span className="text-[#ff6b00]">Maintenance</span>
        </h1>
        <p className="text-[#a0a0b0] text-lg mb-8 leading-relaxed">
          We're upgrading the arena for a better experience.<br />
          Please check back soon.
        </p>

        <div className="flex items-center justify-center gap-2 text-[#606070] text-sm mb-10">
          <Clock className="w-4 h-4" />
          <span>Estimated downtime: a few minutes</span>
        </div>

        <div className="flex justify-center gap-2 mb-10">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-2 h-2 rounded-full bg-[#ff6b00]"
              style={{ animation: `bounce 1.4s ease-in-out ${i * 0.16}s infinite` }}
            />
          ))}
        </div>

        <a
          href="/admin-login"
          className="inline-flex items-center gap-1.5 text-xs text-[#404050] hover:text-[#a0a0b0] transition-colors"
        >
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          Admin Login
        </a>
      </div>

      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: scale(0); opacity: 0.4; }
          40% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
