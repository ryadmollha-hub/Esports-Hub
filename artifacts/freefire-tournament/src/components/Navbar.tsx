import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Flame, Shield, LayoutDashboard } from "lucide-react";
import { useRole } from "@/lib/useRole";
import { useAuthContext } from "@/lib/AuthContext";
import { useLanguage } from "@/lib/LanguageContext";
import NotificationBell from "./NotificationBell";
import ThemeToggle from "./ThemeToggle";

export default function Navbar() {
  const [location] = useLocation();
  const { isAdmin, isAdminSession, isUser } = useRole();
  const { user } = useAuthContext();
  const { lang, setLang, t } = useLanguage();

  const guestNavLinks = [
    { href: "/tournaments", label: t("nav_tournaments") },
    { href: "/rankings",    label: "🏅 Rankings" },
    { href: "/prizes", label: t("nav_prizes") },
    { href: "/contact", label: t("nav_contact") },
    { href: "/support", label: t("nav_support") },
  ];

  const userNavLinks = [
    { href: "/tournaments", label: t("nav_tournaments") },
    { href: "/rankings",    label: "🏅 Rankings" },
    { href: "/leaderboard", label: t("nav_leaderboard") },
    { href: "/schedule", label: t("nav_schedule") },
    { href: "/results", label: t("nav_results") },
    { href: "/prizes", label: t("nav_prizes") },
    { href: "/teams", label: t("nav_teams") },
    { href: "/support", label: t("nav_support") },
  ];

  const navLinks = isUser || isAdmin ? userNavLinks : guestNavLinks;
  const isActive = (href: string) => location === href;

  const LangToggle = () => (
    <button
      onClick={() => setLang(lang === "en" ? "bn" : "en")}
      className="flex items-center gap-1 px-2 py-1 rounded-lg bg-[#1a1a24] border border-[#2a2a36] text-[10px] font-black uppercase tracking-wide text-[#a0a0b0] hover:text-white hover:border-[#ff6b00]/40 transition-colors shrink-0"
      title="Toggle language"
    >
      {lang === "en" ? "🇧🇩 বাংলা" : "🇺🇸 EN"}
    </button>
  );

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0a0a0f]/95 backdrop-blur-md border-b border-[#ff6b00]/20 light:bg-white/95 light:border-[#ff6b00]/30">
      <div className="max-w-7xl mx-auto px-4 h-12 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-1.5 shrink-0">
          <Flame className="w-5 h-5 text-[#ff6b00]" />
          <span className="text-base font-black uppercase tracking-wider text-white light:text-gray-900">
            FF <span className="text-[#ff6b00]">Arena</span>
          </span>
        </Link>

        {/* Desktop nav links */}
        <div className="hidden lg:flex items-center gap-4">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`text-xs font-medium uppercase tracking-wide transition-colors ${
                isActive(link.href) ? "text-[#ff6b00]" : "text-[#a0a0b0] hover:text-white"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Desktop right side */}
        <div className="hidden lg:flex items-center gap-1.5">
          <LangToggle />
          <ThemeToggle />
          <NotificationBell />

          {isAdmin && (
            <Link
              href="/admin"
              className="flex items-center gap-1 px-2.5 py-1 bg-[#ff6b00]/10 border border-[#ff6b00]/30 text-[#ff6b00] text-xs font-black uppercase rounded-lg hover:bg-[#ff6b00]/20 transition-colors"
            >
              <Shield className="w-3 h-3" /> {t("nav_admin")}
            </Link>
          )}

          {isUser && (
            <Link
              href="/profile"
              className={`flex items-center gap-1 text-xs font-medium uppercase tracking-wide transition-colors ${
                isActive("/profile") ? "text-[#ff6b00]" : "text-[#a0a0b0] hover:text-white"
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              {user?.displayName ?? user?.username ?? t("nav_profile")}
            </Link>
          )}

          {!isUser && !isAdmin && !isAdminSession && (
            <>
              <Link href="/sign-in" className="px-3 py-1.5 text-xs font-bold uppercase text-[#a0a0b0] hover:text-white transition-colors">
                {t("nav_signin")}
              </Link>
              <Link href="/sign-up" className="px-4 py-1.5 text-xs font-bold uppercase bg-[#ff6b00] text-white rounded-lg hover:bg-[#e66000] transition-all shadow-[0_0_15px_rgba(255,107,0,0.3)]">
                {t("nav_register")}
              </Link>
            </>
          )}

          {isAdminSession && !isUser && (
            <Link
              href="/admin"
              className="flex items-center gap-1 px-2.5 py-1 bg-[#ff6b00]/10 border border-[#ff6b00]/30 text-[#ff6b00] text-xs font-black uppercase rounded-lg hover:bg-[#ff6b00]/20 transition-colors"
            >
              <Shield className="w-3 h-3" /> {t("nav_admin")}
            </Link>
          )}
        </div>

        {/* Mobile right side */}
        <div className="lg:hidden flex items-center gap-1">
          <LangToggle />
          <ThemeToggle />
          <NotificationBell />
          {isUser && (
            <Link href="/profile" className="w-7 h-7 rounded-full bg-[#ff6b00]/20 border border-[#ff6b00]/40 flex items-center justify-center">
              <span className="text-[#ff6b00] text-xs font-black">
                {(user?.displayName ?? user?.username ?? "P")[0].toUpperCase()}
              </span>
            </Link>
          )}
          {(isAdmin || isAdminSession) && (
            <Link href="/admin" className="w-7 h-7 rounded-full bg-[#ff6b00]/10 border border-[#ff6b00]/30 flex items-center justify-center">
              <Shield className="w-3.5 h-3.5 text-[#ff6b00]" />
            </Link>
          )}
          {!isUser && !isAdmin && !isAdminSession && (
            <Link href="/sign-in" className="px-2.5 py-1 text-xs font-bold uppercase bg-[#ff6b00] text-white rounded-lg">
              {t("nav_signin")}
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
