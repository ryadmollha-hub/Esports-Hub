import { Link, useLocation } from "wouter";
import { Home, Trophy, Wallet, User, Menu, HeadphonesIcon, Plus } from "lucide-react";
import { useState } from "react";
import MenuDrawer from "./MenuDrawer";
import { useAuthContext } from "@/lib/AuthContext";
import { useCreateMatch } from "@/lib/CreateMatchContext";
import { useLanguage } from "@/lib/LanguageContext";

export default function BottomNav() {
  const [location] = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const { user } = useAuthContext();
  const { openCreateMatch } = useCreateMatch();
  const { t } = useLanguage();

  if (location === "/admin" || location.startsWith("/admin/")) return null;

  const isLoggedIn = !!user;
  const isActive = (href: string) => href === "/" ? location === "/" : location.startsWith(href);

  const NavLink = ({ href, icon: Icon, label }: { href: string; icon: React.ElementType; label: string }) => {
    const active = isActive(href);
    return (
      <Link href={href} className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-xl transition-all min-w-[44px] ${active ? "text-[#ff6b00]" : "text-[#606070] hover:text-[#a0a0b0]"}`}>
        <div className={`p-1 rounded-xl transition-all ${active ? "bg-[#ff6b00]/15" : ""}`}>
          <Icon className={`w-4 h-4 ${active ? "stroke-[2.5]" : "stroke-[1.8]"}`} />
        </div>
        <span className={`text-[9px] font-bold uppercase tracking-wide ${active ? "text-[#ff6b00]" : ""}`}>{label}</span>
        {active ? <div className="w-1 h-0.5 rounded-full bg-[#ff6b00]" /> : <div className="w-1 h-0.5 rounded-full opacity-0" />}
      </Link>
    );
  };

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[#0d0d16]/95 backdrop-blur-md border-t border-[#ff6b00]/20 safe-area-bottom">
        <div className="flex items-center justify-around px-1 py-1 max-w-lg mx-auto">
          {!isLoggedIn ? (
            <>
              <NavLink href="/" icon={Home} label={t("bn_home")} />
              <NavLink href="/support" icon={HeadphonesIcon} label={t("nav_support")} />
            </>
          ) : (
            <>
              <NavLink href="/" icon={Home} label={t("bn_home")} />
              <NavLink href="/tournaments" icon={Trophy} label={t("bn_tournament")} />
              <NavLink href="/wallet" icon={Wallet} label={t("bn_wallet")} />

              <button onClick={openCreateMatch} className="flex flex-col items-center gap-0.5 px-2 py-1 rounded-xl transition-all min-w-[44px] group" aria-label="Create Match">
                <div className="p-1 rounded-xl bg-[#ff6b00]/15 group-hover:bg-[#ff6b00]/25 transition-colors">
                  <Plus className="w-4 h-4 text-[#ff6b00] stroke-[2.5]" />
                </div>
                <span className="text-[9px] font-bold uppercase tracking-wide text-[#ff6b00]">{t("bn_create")}</span>
                <div className="w-1 h-0.5 rounded-full opacity-0" />
              </button>

              <NavLink href="/profile" icon={User} label={t("bn_profile")} />

              <button onClick={() => setMenuOpen(true)} className="flex flex-col items-center gap-0.5 px-2 py-1 rounded-xl text-[#606070] hover:text-[#a0a0b0] transition-all min-w-[44px]">
                <div className="p-1 rounded-xl">
                  <Menu className="w-4 h-4 stroke-[1.8]" />
                </div>
                <span className="text-[9px] font-bold uppercase tracking-wide">{t("bn_menu")}</span>
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
