import { useState, useEffect, useRef, useCallback } from "react";
import { Bell, Check, CheckCheck, X } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { apiBase as BASE } from "@/lib/apiBase";
import { useToast } from "@/hooks/use-toast";

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
  if (mins < 1) return "এইমাত্র";
  if (mins < 60) return `${mins} মিনিট আগে`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} ঘণ্টা আগে`;
  return `${Math.floor(hrs / 24)} দিন আগে`;
}

const typeDot: Record<string, string> = {
  success: "bg-[#00ff88]",
  error:   "bg-[#ff2244]",
  warning: "bg-[#ffaa00]",
  info:    "bg-[#00aaff]",
};

const typeEmoji: Record<string, string> = {
  success: "✅",
  error:   "🚨",
  warning: "⚠️",
  info:    "🔔",
};

export default function NotificationBell() {
  const { isSignedIn } = useAuth();
  const { toast } = useToast();

  const [open, setOpen]               = useState(false);
  const [notifications, setNotifs]    = useState<Notification[]>([]);
  const [unreadCount, setUnread]       = useState(0);
  const [loading, setLoading]          = useState(false);

  const ref          = useRef<HTMLDivElement>(null);
  const prevUnread   = useRef(0);
  const isFirstPoll  = useRef(true);
  const token        = () => (typeof window !== "undefined" ? localStorage.getItem("ff_auth_token") : null);

  const authHeader = useCallback((): HeadersInit => {
    const t = token();
    return t ? { Authorization: `Bearer ${t}` } : {};
  }, []);

  // ── Fetch full notification list ─────────────────────────────────────────
  const fetchNotifs = useCallback(async () => {
    if (!isSignedIn) return;
    setLoading(true);
    try {
      const res = await fetch(`${BASE}/api/notifications`, { headers: authHeader() });
      if (res.ok) {
        const data: Notification[] = await res.json();
        setNotifs(data);
        const count = data.filter((n) => !n.isRead).length;
        setUnread(count);
        prevUnread.current = count;
      }
    } catch { /* silent */ }
    setLoading(false);
  }, [isSignedIn, authHeader]);

  // ── Poll unread count every 30 s; toast on new notifications ────────────
  const pollUnread = useCallback(async () => {
    if (!isSignedIn) return;
    try {
      const res = await fetch(`${BASE}/api/notifications/unread-count`, { headers: authHeader() });
      if (!res.ok) return;
      const { count = 0 } = await res.json();
      if (!isFirstPoll.current && count > prevUnread.current) {
        toast({
          title: "🔔 নতুন নোটিফিকেশন!",
          description: "বেল আইকনে ক্লিক করুন দেখতে।",
          duration: 5000,
        });
      }
      prevUnread.current = count;
      setUnread(count);
      isFirstPoll.current = false;
    } catch { /* silent */ }
  }, [isSignedIn, authHeader, toast]);

  useEffect(() => {
    if (!isSignedIn) return;
    pollUnread();
    const id = setInterval(pollUnread, 30_000);
    return () => clearInterval(id);
  }, [isSignedIn, pollUnread]);

  // ── Close on outside click ───────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // ── Mark a single notification as read ──────────────────────────────────
  const markRead = useCallback(async (id: number) => {
    try {
      await fetch(`${BASE}/api/notifications/${id}/read`, {
        method: "PATCH",
        headers: authHeader(),
      });
      setNotifs((prev) => prev.map((n) => n.id === id ? { ...n, isRead: true } : n));
      setUnread((c) => Math.max(0, c - 1));
      prevUnread.current = Math.max(0, prevUnread.current - 1);
    } catch { /* silent */ }
  }, [authHeader]);

  // ── Mark all read ────────────────────────────────────────────────────────
  const markAllRead = useCallback(async () => {
    try {
      await fetch(`${BASE}/api/notifications/read-all`, {
        method: "PATCH",
        headers: authHeader(),
      });
      setNotifs((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnread(0);
      prevUnread.current = 0;
    } catch { /* silent */ }
  }, [authHeader]);

  // ── Open bell: fetch + auto-mark all read ───────────────────────────────
  const handleOpen = useCallback(async () => {
    setOpen(true);
    await fetchNotifs();
    if (unreadCount > 0) await markAllRead();
  }, [fetchNotifs, markAllRead, unreadCount]);

  if (!isSignedIn) return null;

  return (
    <div ref={ref} className="relative">
      {/* Bell button */}
      <button
        onClick={open ? () => setOpen(false) : handleOpen}
        className="relative w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#ff6b00]/10 transition-all"
        aria-label="Notifications"
      >
        <Bell className="w-4.5 h-4.5 text-[#a0a0b0] hover:text-white transition-colors" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 flex items-center justify-center bg-[#ff2244] text-white text-[9px] font-black rounded-full px-1 leading-none select-none animate-pulse">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 max-w-[calc(100vw-1rem)] bg-[#12121a] border border-[#ff6b00]/20 rounded-2xl shadow-2xl shadow-black/60 z-[200] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#ff6b00]/10">
            <div className="flex items-center gap-2">
              <Bell className="w-3.5 h-3.5 text-[#ff6b00]" />
              <span className="font-black uppercase text-xs text-white tracking-widest">নোটিফিকেশন</span>
              {unreadCount > 0 && (
                <span className="bg-[#ff2244] text-white text-[9px] font-black rounded-full px-1.5 py-0.5 leading-none">
                  {unreadCount}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-[10px] text-[#ff6b00] hover:text-[#e66000] font-bold flex items-center gap-1 transition-colors"
                  title="সব পড়া হয়েছে"
                >
                  <CheckCheck className="w-3 h-3" /> সব পড়া
                </button>
              )}
              <button onClick={() => setOpen(false)} className="text-[#606070] hover:text-white transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="max-h-[22rem] overflow-y-auto">
            {loading && notifications.length === 0 ? (
              <div className="py-10 flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-[#ff6b00] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-10 flex flex-col items-center gap-2 text-[#606070]">
                <Bell className="w-7 h-7 text-[#ff6b00]/20" />
                <span className="text-xs font-bold uppercase">কোনো নোটিফিকেশন নেই</span>
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={`px-4 py-3 border-b border-[#ff6b00]/5 last:border-0 transition-colors cursor-pointer group ${n.isRead ? "opacity-55" : "bg-[#ff6b00]/5"}`}
                  onClick={() => { if (!n.isRead) markRead(n.id); }}
                >
                  <div className="flex items-start gap-2.5">
                    <span className="text-base shrink-0 mt-0.5">{typeEmoji[n.type] ?? "🔔"}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-1">
                        <div className="font-bold text-white text-xs leading-tight">{n.title}</div>
                        {!n.isRead && (
                          <span className={`w-2 h-2 rounded-full shrink-0 mt-1 ${typeDot[n.type] ?? typeDot.info}`} />
                        )}
                      </div>
                      <div className="text-[#a0a0b0] text-xs mt-0.5 leading-relaxed">{n.message}</div>
                      <div className="text-[#606070] text-[10px] mt-1">{timeAgo(n.createdAt)}</div>
                    </div>
                    {!n.isRead && (
                      <button
                        onClick={(e) => { e.stopPropagation(); markRead(n.id); }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-[#00ff88] hover:bg-[#00ff88]/10 rounded shrink-0"
                        title="পড়া হয়েছে"
                      >
                        <Check className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {notifications.length > 0 && (
            <div className="px-4 py-2 border-t border-[#ff6b00]/10 text-center">
              <span className="text-[#606070] text-[10px]">সর্বশেষ {notifications.length}টি নোটিফিকেশন</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
