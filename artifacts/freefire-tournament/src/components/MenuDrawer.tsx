import { useEffect } from "react";
import { Link, useLocation } from "wouter";
import {
  X, User, Wallet, Trophy, History, Settings, HeadphonesIcon,
  LogOut, Shield, Flame, ChevronRight, Gift, Sun, Moon
} from "lucide-react";
import { useAuthContext } from "@/lib/AuthContext";
import { clearAdminSession, isAdminAuthenticated } from "@/lib/adminAuth";
import { useTheme } from "@/lib/ThemeContext";

interface MenuDrawerProps {
  open: boolean;
  onClose: () => void;
}

export default function MenuDrawer({ open, onClose }: MenuDrawerProps) {
  const { user, logout } = useAuthContext();
  const [, setLocation] = useLocation();
  const isAdminSession = isAdminAuthenticated();
  const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const handleLogout = () => {
    logout();
    clearAdminSession();
    onClose();
    window.location.href = basePath || "/";
  };

  const menuItems = [
    ...(user ? [
      { href: "/profile", icon: User, label: "Profile", desc: "View & edit your profile" },
      { href: "/wallet", icon: Wallet, label: "Wallet", desc: "Manage your balance" },
      { href: "/dashboard", icon: Trophy, label: "My Tournaments", desc: "Your tournament history" },
      { href: "/teams/my", icon: Shield, label: "My Team", desc: "Manage your squad" },
      { href: "/referral", icon: Gift, label: "Referral", desc: "Invite friends, earn rewards" },
    ] : []),
    { href: "/leaderboard", icon: History, label: "Leaderboard", desc: "Global rankings" },
    { href: "/support", icon: HeadphonesIcon, label: "Support", desc: "Get help from our team" },
  ];

  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className={`fixed bottom-0 left-0 right-0 z-[70] bg-[#0d0d16] border-t border-[#ff6b00]/20 rounded-t-3xl transition-transform duration-300 ${
          open ? "translate-y-0" : "translate-y-full"
        }`}
        style={{ maxHeight: "90vh", overflowY: "auto" }}
      >
        <div className="w-12 h-1 bg-[#2a2a36] rounded-full mx-auto mt-3 mb-2" />

        <div className="px-4 pb-4">
          <div className="flex items-center justify-between py-3 border-b border-[#ff6b00]/10 mb-3">
            <div className="flex items-center gap-2">
              <Flame className="w-5 h-5 text-[#ff6b00]" />
              <span className="font-black uppercase text-white tracking-wider">
                FF <span className="text-[#ff6b00]">Arena</span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={toggleTheme}
                className="w-8 h-8 rounded-full bg-[#1a1a24] flex items-center justify-center text-[#a0a0b0] hover:text-white transition-colors"
                title={theme === "dark" ? "Light mode" : "Dark mode"}
              >
                {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-[#1a1a24] flex items-center justify-center text-[#a0a0b0] hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {user && (
            <div className="flex items-center gap-3 p-3 bg-[#12121a] rounded-2xl mb-4 border border-[#ff6b00]/10">
              <div className="w-12 h-12 rounded-full bg-[#ff6b00]/20 border-2 border-[#ff6b00]/50 flex items-center justify-center shrink-0">
                <User className="w-6 h-6 text-[#ff6b00]" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-black text-white truncate">
                  {user.displayName ?? user.username ?? "Player"}
                </div>
                <div className="text-[#a0a0b0] text-xs truncate">{user.email}</div>
                {user.isAdmin && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase text-[#ff6b00] bg-[#ff6b00]/10 px-2 py-0.5 rounded-full mt-0.5">
                    <Shield className="w-2.5 h-2.5" /> Admin
                  </span>
                )}
              </div>
            </div>
          )}

          {!user && !isAdminSession && (
            <div className="flex gap-3 mb-4">
              <Link
                href="/sign-in"
                onClick={onClose}
                className="flex-1 text-center py-3 rounded-2xl border border-[#2a2a36] text-white font-bold text-sm uppercase"
              >
                Sign In
              </Link>
              <Link
                href="/sign-up"
                onClick={onClose}
                className="flex-1 text-center py-3 rounded-2xl bg-[#ff6b00] text-white font-bold text-sm uppercase"
              >
                Register
              </Link>
            </div>
          )}

          <div className="space-y-1">
            {menuItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className="flex items-center gap-3 p-3.5 rounded-2xl hover:bg-[#1a1a24] transition-colors group"
              >
                <div className="w-10 h-10 rounded-xl bg-[#12121a] border border-[#2a2a36] flex items-center justify-center group-hover:border-[#ff6b00]/30 transition-colors shrink-0">
                  <item.icon className="w-5 h-5 text-[#ff6b00]" />
                </div>
                <div className="flex-1">
                  <div className="text-white font-bold text-sm">{item.label}</div>
                  <div className="text-[#606070] text-xs">{item.desc}</div>
                </div>
                <ChevronRight className="w-4 h-4 text-[#606070] group-hover:text-[#a0a0b0] transition-colors" />
              </Link>
            ))}

            {(user?.isAdmin || isAdminSession) && (
              <Link
                href="/admin"
                onClick={onClose}
                className="flex items-center gap-3 p-3.5 rounded-2xl hover:bg-[#ff6b00]/5 transition-colors group border border-[#ff6b00]/10"
              >
                <div className="w-10 h-10 rounded-xl bg-[#ff6b00]/10 flex items-center justify-center shrink-0">
                  <Shield className="w-5 h-5 text-[#ff6b00]" />
                </div>
                <div className="flex-1">
                  <div className="text-[#ff6b00] font-bold text-sm">Admin Panel</div>
                  <div className="text-[#606070] text-xs">Manage platform</div>
                </div>
                <ChevronRight className="w-4 h-4 text-[#ff6b00]/60" />
              </Link>
            )}
          </div>

          {(user || isAdminSession) && (
            <button
              onClick={handleLogout}
              className="w-full mt-4 flex items-center justify-center gap-2 py-3.5 rounded-2xl border border-[#ff2244]/20 text-[#ff2244] font-bold text-sm uppercase hover:bg-[#ff2244]/5 transition-colors"
            >
              <LogOut className="w-4 h-4" /> Sign Out
            </button>
          )}
        </div>

        <div className="h-safe-area-inset-bottom h-6" />
      </div>
    </>
  );
}
