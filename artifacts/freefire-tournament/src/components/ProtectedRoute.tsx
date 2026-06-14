import { useEffect } from "react";
import { useLocation } from "wouter";
import { isAdminAuthenticated } from "@/lib/adminAuth";
import { useAuthContext } from "@/lib/AuthContext";
import { Flame, Ban } from "lucide-react";

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] flex flex-col items-center justify-center gap-4">
      <Flame className="w-10 h-10 text-[#ff6b00] animate-pulse" />
      <p className="text-[#a0a0b0] text-sm uppercase tracking-widest animate-pulse">Loading...</p>
    </div>
  );
}

function BannedScreen() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] flex flex-col items-center justify-center gap-6 px-4">
      <div className="w-20 h-20 rounded-full bg-[#ff2244]/10 border-2 border-[#ff2244]/40 flex items-center justify-center">
        <Ban className="w-10 h-10 text-[#ff2244]" />
      </div>
      <div className="text-center">
        <h1 className="text-2xl font-black uppercase text-white mb-2">
          Account <span className="text-[#ff2244]">Suspended</span>
        </h1>
        <p className="text-[#a0a0b0] max-w-sm">
          Your account has been suspended. If you believe this is an error, please contact support.
        </p>
      </div>
      <a href="/contact" className="px-6 py-2.5 border border-[#2a2a36] text-[#a0a0b0] rounded-lg hover:border-[#ff6b00]/40 hover:text-white transition-colors text-sm uppercase font-bold">
        Contact Support
      </a>
    </div>
  );
}

export function UserRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, isLoading } = useAuthContext();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && !user) setLocation("/sign-in");
  }, [isLoading, user]);

  if (isLoading) return <LoadingScreen />;
  if (!user) return null;
  if (user.isBanned) return <BannedScreen />;
  return <Component />;
}

export function AdminRoute({ component: Component }: { component: React.ComponentType }) {
  const [, setLocation] = useLocation();
  const { user, isLoading } = useAuthContext();

  const isAdminSession = isAdminAuthenticated();
  const isJwtAdmin = user?.isAdmin === true;
  const isAdmin = isAdminSession || isJwtAdmin;

  useEffect(() => {
    if (!isLoading && !isAdmin) {
      setLocation("/admin-login");
    }
  }, [isLoading, isAdmin]);

  if (isLoading && !isAdminSession) return <LoadingScreen />;
  if (!isAdmin) return null;
  return <Component />;
}
