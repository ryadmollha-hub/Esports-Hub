import { useState, useEffect, useRef } from "react";
import { Bell, Check, CheckCheck, X } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface Notification {
  id: number;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const typeColor: Record<string, string> = {
  success: "bg-[#00ff88]/10 border-[#00ff88]/30 text-[#00ff88]",
  error: "bg-[#ff2244]/10 border-[#ff2244]/30 text-[#ff2244]",
  warning: "bg-[#ffaa00]/10 border-[#ffaa00]/30 text-[#ffaa00]",
  info: "bg-[#00aaff]/10 border-[#00aaff]/30 text-[#00aaff]",
};

const typeDot: Record<string, string> = {
  success: "bg-[#00ff88]",
  error: "bg-[#ff2244]",
  warning: "bg-[#ffaa00]",
  info: "bg-[#00aaff]",
};

export default function NotificationBell() {
  const { isSignedIn } = useAuth();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const token = typeof window !== "undefined" ? localStorage.getItem("ff_auth_token") : null;

  const fetchNotifications = async () => {
    if (!isSignedIn || !token) return;
    setLoading(true);
    try {
      const res = await fetch(`${BASE}/api/notifications`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
        setUnreadCount(data.filter((n: Notification) => !n.isRead).length);
      }
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    if (!isSignedIn) return;
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [isSignedIn]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const markRead = async (id: number) => {
    if (!token) return;
    await fetch(`${BASE}/api/notifications/${id}/read`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}` },
    });
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, isRead: true } : n));
    setUnreadCount((c) => Math.max(0, c - 1));
  };

  const markAllRead = async () => {
    if (!token) return;
    await fetch(`${BASE}/api/notifications/read-all`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}` },
    });
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
  };

  if (!isSignedIn) return null;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => { setOpen((o) => !o); if (!open) fetchNotifications(); }}
        className="relative p-2 rounded-xl text-[#a0a0b0] hover:text-white hover:bg-[#ff6b00]/10 transition-all"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-[#ff6b00] text-white text-[10px] font-black rounded-full flex items-center justify-center px-1 animate-pulse">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-[#12121a] border border-[#ff6b00]/20 rounded-2xl shadow-2xl z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#ff6b00]/10">
            <span className="font-black uppercase text-sm text-white tracking-wide">Notifications</span>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-xs text-[#ff6b00] hover:text-[#e66000] font-bold flex items-center gap-1"
                  title="Mark all as read"
                >
                  <CheckCheck className="w-3.5 h-3.5" /> All Read
                </button>
              )}
              <button onClick={() => setOpen(false)} className="text-[#a0a0b0] hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {loading && notifications.length === 0 ? (
              <div className="py-8 text-center text-[#a0a0b0] text-sm">Loading...</div>
            ) : notifications.length === 0 ? (
              <div className="py-8 text-center">
                <Bell className="w-8 h-8 mx-auto mb-2 text-[#ff6b00]/30" />
                <p className="text-[#a0a0b0] text-sm">No notifications yet</p>
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={`px-4 py-3 border-b border-[#ff6b00]/5 last:border-0 transition-colors cursor-pointer group ${n.isRead ? "opacity-60" : "bg-[#ff6b00]/5"}`}
                  onClick={() => { if (!n.isRead) markRead(n.id); }}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${typeDot[n.type] ?? typeDot.info} ${n.isRead ? "opacity-30" : ""}`} />
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-white text-sm leading-tight">{n.title}</div>
                      <div className="text-[#a0a0b0] text-xs mt-0.5 leading-relaxed">{n.message}</div>
                      <div className="text-[#606070] text-xs mt-1">{timeAgo(n.createdAt)}</div>
                    </div>
                    {!n.isRead && (
                      <button
                        onClick={(e) => { e.stopPropagation(); markRead(n.id); }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-[#00ff88] hover:bg-[#00ff88]/10 rounded"
                        title="Mark as read"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
