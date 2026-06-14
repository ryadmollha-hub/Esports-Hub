import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@clerk/react";
import { isAdminAuthenticated } from "@/lib/adminAuth";
import { useGetMyProfile } from "@workspace/api-client-react";
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
  const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
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
          Your account has been suspended by an administrator. If you believe this is an error, please contact support.
        </p>
      </div>
      <a
        href={`${basePath}/contact`}
        className="px-6 py-2.5 border border-[#2a2a36] text-[#a0a0b0] rounded-lg hover:border-[#ff6b00]/40 hover:text-white transition-colors text-sm uppercase font-bold"
      >
        Contact Support
      </a>
    </div>
  );
}

export function UserRoute({ component: Component }: { component: React.ComponentType }) {
  const { isSignedIn, isLoaded } = useAuth();
  const [, setLocation] = useLocation();

  const { data: profile } = useGetMyProfile({
    query: { enabled: isSignedIn === true },
  });

  const isBanned = (profile as any)?.isBanned === true;

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      setLocation("/sign-in");
    }
  }, [isLoaded, isSignedIn]);

  if (!isLoaded) return <LoadingScreen />;
  if (!isSignedIn) return null;
  if (isBanned) return <BannedScreen />;
  return <Component />;
}

export function AdminRoute({ component: Component }: { component: React.ComponentType }) {
  const [, setLocation] = useLocation();
  const isAdmin = isAdminAuthenticated();

  useEffect(() => {
    if (!isAdmin) {
      setLocation("/admin-login");
    }
  }, [isAdmin]);

  if (!isAdmin) return <LoadingScreen />;
  return <Component />;
}

export function GuestOnlyRoute({ component: Component }: { component: React.ComponentType }) {
  const { isSignedIn, isLoaded } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      setLocation("/dashboard");
    }
  }, [isLoaded, isSignedIn]);

  if (!isLoaded) return <LoadingScreen />;
  if (isSignedIn) return null;
  return <Component />;
}
