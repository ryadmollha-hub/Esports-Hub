import { useState } from "react";
import { Link, useLocation } from "wouter";
import { UserButton, useAuth } from "@clerk/react";
import { Menu, X, Flame } from "lucide-react";

const navLinks = [
  { href: "/tournaments", label: "Tournaments" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/schedule", label: "Schedule" },
  { href: "/results", label: "Results" },
  { href: "/prizes", label: "Prizes" },
  { href: "/teams", label: "Teams" },
  { href: "/contact", label: "Contact" },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [location] = useLocation();
  const { isSignedIn } = useAuth();
  const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0a0a0f]/90 backdrop-blur-md border-b border-[#ff6b00]/20">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" data-testid="link-home-logo" className="flex items-center gap-2">
          <Flame className="w-7 h-7 text-[#ff6b00]" />
          <span className="text-xl font-bold uppercase tracking-wider text-white">
            FF <span className="text-[#ff6b00]">Arena</span>
          </span>
        </Link>

        <div className="hidden lg:flex items-center gap-6">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              data-testid={`link-nav-${link.label.toLowerCase()}`}
              className={`text-sm font-medium uppercase tracking-wide transition-colors ${
                location === link.href
                  ? "text-[#ff6b00]"
                  : "text-[#a0a0b0] hover:text-white"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="hidden lg:flex items-center gap-3">
          {isSignedIn ? (
            <>
              <Link
                href="/dashboard"
                data-testid="link-nav-dashboard"
                className="text-sm font-medium text-[#a0a0b0] hover:text-white uppercase tracking-wide transition-colors"
              >
                Dashboard
              </Link>
              <UserButton afterSignOutUrl={`${basePath}/`} />
            </>
          ) : (
            <>
              <Link
                href="/sign-in"
                data-testid="link-nav-signin"
                className="px-4 py-2 text-sm font-bold uppercase text-[#a0a0b0] hover:text-white transition-colors"
              >
                Sign In
              </Link>
              <Link
                href="/sign-up"
                data-testid="link-nav-signup"
                className="px-5 py-2 text-sm font-bold uppercase bg-[#ff6b00] text-white rounded-lg hover:bg-[#e66000] transition-all shadow-[0_0_15px_rgba(255,107,0,0.3)]"
              >
                Register
              </Link>
            </>
          )}
        </div>

        <button
          className="lg:hidden text-white p-2"
          onClick={() => setOpen(!open)}
          data-testid="button-menu-toggle"
        >
          {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {open && (
        <div className="lg:hidden bg-[#0a0a0f] border-t border-[#ff6b00]/20 px-4 py-4 flex flex-col gap-4">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              data-testid={`link-mobile-${link.label.toLowerCase()}`}
              onClick={() => setOpen(false)}
              className={`text-sm font-medium uppercase ${
                location === link.href ? "text-[#ff6b00]" : "text-[#a0a0b0]"
              }`}
            >
              {link.label}
            </Link>
          ))}
          <div className="border-t border-[#ff6b00]/10 pt-4 flex flex-col gap-3">
            {isSignedIn ? (
              <>
                <Link href="/dashboard" onClick={() => setOpen(false)} data-testid="link-mobile-dashboard" className="text-sm font-medium text-[#a0a0b0] uppercase">
                  Dashboard
                </Link>
                <div className="flex items-center gap-2">
                  <UserButton afterSignOutUrl={`${basePath}/`} />
                  <span className="text-sm text-[#a0a0b0]">Account</span>
                </div>
              </>
            ) : (
              <>
                <Link href="/sign-in" onClick={() => setOpen(false)} data-testid="link-mobile-signin" className="text-sm text-center font-bold uppercase text-[#a0a0b0] border border-[#2a2a36] rounded-lg py-2">
                  Sign In
                </Link>
                <Link href="/sign-up" onClick={() => setOpen(false)} data-testid="link-mobile-signup" className="text-sm text-center font-bold uppercase bg-[#ff6b00] text-white rounded-lg py-2">
                  Register
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
