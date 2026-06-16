import { Link, useLocation } from "wouter";
import { Home, Trophy, Wallet, User, Menu, HeadphonesIcon } from "lucide-react";
import { useState } from "react";
import MenuDrawer from "./MenuDrawer";
import { useAuthContext } from "@/lib/AuthContext";

const guestItems = [
  { href: "/", icon: Home, label: "Home" },
  { href: "/support", icon: HeadphonesIcon, label: "Support" },
];

const userItems = [
  { href: "/tournaments", icon: Trophy, label: "Tournament" },
  { href: "/wallet", icon: Wallet, label: "Wallet" },
  { href: "/profile", icon: User, label: "Profile" },
];

export default function BottomNav() {
  const [location] = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const { user } = useAuthContext();

  if (location === "/admin" || location.startsWith("/admin/")) return null;

  const isLoggedIn = !!user;

  const isActive = (href: string) => {
    if (href === "/") return location === "/";
    return location.startsWith(href);
  };

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[#0d0d16]/95 backdrop-blur-md border-t border-[#ff6b00]/20 safe-area-bottom">
        <div className="flex items-center justify-around px-2 py-1 max-w-lg mx-auto">
          {!isLoggedIn ? (
            <>
              {guestItems.map((item) => {
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex flex-col items-center gap-0.5 px-4 py-1 rounded-xl transition-all min-w-[48px] ${
                      active ? "text-[#ff6b00]" : "text-[#606070] hover:text-[#a0a0b0]"
                    }`}
                  >
                    <div className={`p-1 rounded-xl transition-all ${active ? "bg-[#ff6b00]/15" : ""}`}>
                      <item.icon className={`w-4 h-4 ${active ? "stroke-[2.5]" : "stroke-[1.8]"}`} />
                    </div>
                    <span className={`text-[9px] font-bold uppercase tracking-wide ${active ? "text-[#ff6b00]" : ""}`}>
                      {item.label}
                    </span>
                    {active && <div className="w-1 h-0.5 rounded-full bg-[#ff6b00]" />}
                  </Link>
                );
              })}
            </>
          ) : (
            <>
              {userItems.map((item) => {
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-all min-w-[48px] ${
                      active ? "text-[#ff6b00]" : "text-[#606070] hover:text-[#a0a0b0]"
                    }`}
                  >
                    <div className={`p-1 rounded-xl transition-all ${active ? "bg-[#ff6b00]/15" : ""}`}>
                      <item.icon className={`w-4 h-4 ${active ? "stroke-[2.5]" : "stroke-[1.8]"}`} />
                    </div>
                    <span className={`text-[9px] font-bold uppercase tracking-wide ${active ? "text-[#ff6b00]" : ""}`}>
                      {item.label}
                    </span>
                    {active && <div className="w-1 h-0.5 rounded-full bg-[#ff6b00]" />}
                  </Link>
                );
              })}

              <button
                onClick={() => setMenuOpen(true)}
                className="flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl text-[#606070] hover:text-[#a0a0b0] transition-all min-w-[48px]"
              >
                <div className="p-1 rounded-xl">
                  <Menu className="w-4 h-4 stroke-[1.8]" />
                </div>
                <span className="text-[9px] font-bold uppercase tracking-wide">Menu</span>
                <div className="w-1 h-0.5 rounded-full opacity-0" />
              </button>
            </>
          )}
        </div>
      </nav>

      <MenuDrawer open={menuOpen} onClose={() => setMenuOpen(false)} />
    </>
  );
}
