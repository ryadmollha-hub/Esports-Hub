import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { UserButton, useAuth } from "@clerk/react";
import { Menu, X, Flame, Shield, LayoutDashboard, LogOut } from "lucide-react";
import { useRole } from "@/lib/useRole";
import { clearAdminSession } from "@/lib/adminAuth";

const guestNavLinks = [
  { href: "/tournaments", label: "Tournaments" },
  { href: "/prizes", label: "Prizes" },
  { href: "/contact", label: "Contact" },
];

const userNavLinks = [
  { href: "/tournaments", label: "Tournaments" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/schedule", label: "Schedule" },
  { href: "/results", label: "Results" },
  { href: "/prizes", label: "Prizes" },
  { href: "/teams", label: "Teams" },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [location] = useLocation();
  const { isSignedIn } = useAuth();
  const { isAdmin, isAdminSession, isUser } = useRole();
  const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

  const navLinks = isUser || isAdmin ? userNavLinks : guestNavLinks;

  const handleAdminLogout = () => {
    clearAdminSession();
    window.location.href = basePath || "/";
  };

  const isActive = (href: string) => location === href;

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0a0a0f]/95 backdrop-blur-md border-b border-[#ff6b00]/20">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <Flame className="w-7 h-7 text-[#ff6b00]" />
          <span className="text-xl font-black uppercase tracking-wider text-white">
            FF <span className="text-[#ff6b00]">Arena</span>
          </span>
        </Link>

        {/* Desktop nav links */}
        <div className="hidden lg:flex items-center gap-5">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`text-sm font-medium uppercase tracking-wide transition-colors ${
                isActive(link.href)
                  ? "text-[#ff6b00]"
                  : "text-[#a0a0b0] hover:text-white"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Desktop action buttons */}
        <div className="hidden lg:flex items-center gap-3">
          {isAdmin && (
            <Link
              href="/admin"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#ff6b00]/10 border border-[#ff6b00]/30 text-[#ff6b00] text-xs font-black uppercase rounded-lg hover:bg-[#ff6b00]/20 transition-colors"
            >
              <Shield className="w-3.5 h-3.5" /> Admin Panel
            </Link>
          )}

          {isUser && !isAdminSession && (
            <>
              <Link
                href="/dashboard"
                className={`flex items-center gap-1.5 text-sm font-medium uppercase tracking-wide transition-colors ${
                  isActive("/dashboard") ? "text-[#ff6b00]" : "text-[#a0a0b0] hover:text-white"
                }`}
              >
                <LayoutDashboard className="w-4 h-4" /> Dashboard
              </Link>
              <UserButton afterSignOutUrl={`${basePath}/`} />
            </>
          )}

          {isAdminSession && !isSignedIn && (
            <button
              onClick={handleAdminLogout}
              className="flex items-center gap-1.5 text-sm font-medium text-[#a0a0b0] hover:text-white uppercase tracking-wide transition-colors"
            >
              <LogOut className="w-4 h-4" /> Log Out
            </button>
          )}

          {isAdminSession && isSignedIn && (
            <>
              <Link href="/dashboard" className={`flex items-center gap-1.5 text-sm font-medium uppercase tracking-wide transition-colors ${isActive("/dashboard") ? "text-[#ff6b00]" : "text-[#a0a0b0] hover:text-white"}`}>
                <LayoutDashboard className="w-4 h-4" /> Dashboard
              </Link>
              <UserButton afterSignOutUrl={`${basePath}/`} />
            </>
          )}

          {!isUser && !isAdmin && (
            <>
              <Link
                href="/sign-in"
                className="px-4 py-2 text-sm font-bold uppercase text-[#a0a0b0] hover:text-white transition-colors"
              >
                Sign In
              </Link>
              <Link
                href="/sign-up"
                className="px-5 py-2 text-sm font-bold uppercase bg-[#ff6b00] text-white rounded-lg hover:bg-[#e66000] transition-all shadow-[0_0_15px_rgba(255,107,0,0.3)]"
              >
                Register
              </Link>
              <Link
                href="/admin-login"
                className="flex items-center gap-1 px-2 py-1.5 text-xs font-bold uppercase text-[#a0a0b0]/50 hover:text-[#ff6b00]/70 transition-colors"
              >
                <Shield className="w-3 h-3" />
              </Link>
            </>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          className="lg:hidden text-white p-2"
          onClick={() => setOpen(!open)}
        >
          {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="lg:hidden bg-[#0a0a0f] border-t border-[#ff6b00]/20 px-4 py-4 flex flex-col gap-3">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className={`text-sm font-medium uppercase tracking-wide py-1 ${
                isActive(link.href) ? "text-[#ff6b00]" : "text-[#a0a0b0]"
              }`}
            >
              {link.label}
            </Link>
          ))}

          <div className="border-t border-[#ff6b00]/10 pt-3 flex flex-col gap-3">
            {isAdmin && (
              <Link
                href="/admin"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 text-sm font-black uppercase text-[#ff6b00]"
              >
                <Shield className="w-4 h-4" /> Admin Panel
              </Link>
            )}

            {isUser && (
              <>
                <Link
                  href="/dashboard"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2 text-sm font-medium uppercase text-[#a0a0b0]"
                >
                  <LayoutDashboard className="w-4 h-4" /> Dashboard
                </Link>
                <div className="flex items-center gap-2">
                  <UserButton afterSignOutUrl={`${basePath}/`} />
                  <span className="text-sm text-[#a0a0b0]">Account</span>
                </div>
              </>
            )}

            {isAdminSession && !isSignedIn && (
              <button
                onClick={handleAdminLogout}
                className="flex items-center gap-2 text-sm font-medium uppercase text-[#a0a0b0]"
              >
                <LogOut className="w-4 h-4" /> Log Out
              </button>
            )}

            {!isUser && !isAdmin && (
              <>
                <Link
                  href="/sign-in"
                  onClick={() => setOpen(false)}
                  className="text-sm text-center font-bold uppercase text-[#a0a0b0] border border-[#2a2a36] rounded-lg py-2"
                >
                  Sign In
                </Link>
                <Link
                  href="/sign-up"
                  onClick={() => setOpen(false)}
                  className="text-sm text-center font-bold uppercase bg-[#ff6b00] text-white rounded-lg py-2"
                >
                  Register
                </Link>
                <Link
                  href="/admin-login"
                  onClick={() => setOpen(false)}
                  className="flex items-center justify-center gap-2 text-xs font-bold uppercase text-[#a0a0b0]/60 py-1"
                >
                  <Shield className="w-3 h-3" /> Admin Login
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
