import { Link, useLocation } from "wouter";
import { Home, Trophy, Wallet, User, Menu } from "lucide-react";
import { useState } from "react";
import MenuDrawer from "./MenuDrawer";
import { useAuthContext } from "@/lib/AuthContext";

const navItems = [
  { href: "/", icon: Home, label: "Home" },
  { href: "/tournaments", icon: Trophy, label: "Tournament" },
  { href: "/wallet", icon: Wallet, label: "Wallet" },
  { href: "/profile", icon: User, label: "Profile" },
];

export default function BottomNav() {
  const [location] = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const { user } = useAuthContext();

  if (location === "/admin" || location.startsWith("/admin/")) return null;

  const isActive = (href: string) => {
    if (href === "/") return location === "/";
    return location.startsWith(href);
  };

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[#0d0d16]/95 backdrop-blur-md border-t border-[#ff6b00]/20 safe-area-bottom">
        <div className="flex items-center justify-around px-2 py-2 max-w-lg mx-auto">
          {navItems.map((item) => {
            const active = isActive(item.href);
            const needsAuth = item.href === "/wallet" || item.href === "/profile";
            const href = needsAuth && !user ? "/sign-in" : item.href;

            return (
              <Link
                key={item.href}
                href={href}
                className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all min-w-[56px] ${
                  active
                    ? "text-[#ff6b00]"
                    : "text-[#606070] hover:text-[#a0a0b0]"
                }`}
              >
                <div className={`p-1.5 rounded-xl transition-all ${active ? "bg-[#ff6b00]/15" : ""}`}>
                  <item.icon className={`w-5 h-5 ${active ? "stroke-[2.5]" : "stroke-[1.8]"}`} />
                </div>
                <span className={`text-[10px] font-bold uppercase tracking-wide ${active ? "text-[#ff6b00]" : ""}`}>
                  {item.label}
                </span>
                {active && (
                  <div className="w-1 h-1 rounded-full bg-[#ff6b00] mt-0.5" />
                )}
              </Link>
            );
          })}

          <button
            onClick={() => setMenuOpen(true)}
            className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl text-[#606070] hover:text-[#a0a0b0] transition-all min-w-[56px]"
          >
            <div className="p-1.5 rounded-xl">
              <Menu className="w-5 h-5 stroke-[1.8]" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wide">Menu</span>
            <div className="w-1 h-1 rounded-full opacity-0 mt-0.5" />
          </button>
        </div>
      </nav>

      <MenuDrawer open={menuOpen} onClose={() => setMenuOpen(false)} />
    </>
  );
}
