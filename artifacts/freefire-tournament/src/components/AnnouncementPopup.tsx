import { useEffect, useState } from "react";
import { X, Megaphone, Bell, AlertTriangle, CheckCircle, Info } from "lucide-react";
import { useAuthContext } from "@/lib/AuthContext";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const DISMISSED_KEY = "ff_dismissed_announcements";

interface Announcement {
  id: number;
  title: string;
  content: string;
  type: string;
  displayMode: string;
  isPinned: boolean;
  createdAt: string;
}

function getDismissed(): number[] {
  try {
    return JSON.parse(localStorage.getItem(DISMISSED_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function addDismissed(id: number) {
  const dismissed = getDismissed();
  if (!dismissed.includes(id)) {
    dismissed.push(id);
    // keep last 50 only
    const trimmed = dismissed.slice(-50);
    localStorage.setItem(DISMISSED_KEY, JSON.stringify(trimmed));
  }
}

const typeConfig: Record<string, { icon: any; border: string; bg: string; badge: string; iconColor: string }> = {
  urgent: {
    icon: AlertTriangle,
    border: "border-[#ff2244]/40",
    bg: "from-[#ff2244]/10 via-[#0d0d16] to-[#0d0d16]",
    badge: "bg-[#ff2244]/20 text-[#ff2244] border-[#ff2244]/30",
    iconColor: "text-[#ff2244]",
  },
  warning: {
    icon: AlertTriangle,
    border: "border-yellow-500/40",
    bg: "from-yellow-500/10 via-[#0d0d16] to-[#0d0d16]",
    badge: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    iconColor: "text-yellow-400",
  },
  success: {
    icon: CheckCircle,
    border: "border-[#00ff88]/40",
    bg: "from-[#00ff88]/10 via-[#0d0d16] to-[#0d0d16]",
    badge: "bg-[#00ff88]/20 text-[#00ff88] border-[#00ff88]/30",
    iconColor: "text-[#00ff88]",
  },
  info: {
    icon: Info,
    border: "border-blue-500/40",
    bg: "from-blue-500/10 via-[#0d0d16] to-[#0d0d16]",
    badge: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    iconColor: "text-blue-400",
  },
};

export default function AnnouncementPopup() {
  const { user } = useAuthContext();
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      try {
        const res = await fetch(`${BASE}/api/announcements`);
        if (!res.ok) return;
        const data: Announcement[] = await res.json();
        const dismissed = getDismissed();
        const popup = data.find(
          (a) => a.displayMode === "popup" && !dismissed.includes(a.id)
        );
        if (popup) {
          setAnnouncement(popup);
          setTimeout(() => setVisible(true), 600);
        }
      } catch {}
    };
    load();
  }, [user?.userId]);

  const dismiss = () => {
    if (announcement) addDismissed(announcement.id);
    setVisible(false);
    setTimeout(() => setAnnouncement(null), 300);
  };

  if (!announcement || !visible) return null;

  const cfg = typeConfig[announcement.type] ?? typeConfig.info;
  const Icon = cfg.icon;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) dismiss(); }}
    >
      <div
        className={`w-full max-w-md bg-gradient-to-b ${cfg.bg} border ${cfg.border} rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-300`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-3">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl bg-[#0a0a0f]/60 border ${cfg.border} flex items-center justify-center`}>
              <Icon className={`w-5 h-5 ${cfg.iconColor}`} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <Megaphone className="w-3.5 h-3.5 text-[#a0a0b0]" />
                <span className="text-[#a0a0b0] text-xs font-bold uppercase tracking-wider">Announcement</span>
              </div>
              <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded border ${cfg.badge} mt-0.5 inline-block`}>
                {announcement.type}
              </span>
            </div>
          </div>
          <button
            onClick={dismiss}
            className="w-8 h-8 rounded-lg bg-[#1a1a24] hover:bg-[#2a2a36] flex items-center justify-center text-[#a0a0b0] hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 pb-2">
          <h2 className="text-white font-black text-xl mb-2 leading-tight">{announcement.title}</h2>
          <p className="text-[#a0a0b0] text-sm leading-relaxed whitespace-pre-line">{announcement.content}</p>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 mt-2 border-t border-[#1a1a24] flex items-center justify-between">
          <span className="text-[#a0a0b0] text-xs">
            {new Date(announcement.createdAt).toLocaleDateString()}
          </span>
          <button
            onClick={dismiss}
            className="px-5 py-2 bg-[#ff6b00] hover:bg-[#e66000] text-white font-black uppercase text-sm rounded-xl transition-all"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
