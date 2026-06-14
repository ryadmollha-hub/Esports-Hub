import { useEffect, useRef } from "react";
import { ClerkProvider, SignIn, SignUp, useClerk } from "@clerk/react";
import { publishableKeyFromHost } from "@clerk/react/internal";
import { dark } from "@clerk/themes";
import { Switch, Route, useLocation, Router as WouterRouter } from "wouter";
import { queryClient } from "@/lib/queryClient";
import { QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { UserRoute, AdminRoute } from "@/components/ProtectedRoute";

import Home from "@/pages/home";
import TournamentsPage from "@/pages/tournaments";
import TournamentDetailPage from "@/pages/tournament-detail";
import RegisterPage from "@/pages/register";
import LeaderboardPage from "@/pages/leaderboard";
import SchedulePage from "@/pages/schedule";
import ResultsPage from "@/pages/results";
import PrizesPage from "@/pages/prizes";
import ContactPage from "@/pages/contact";
import TeamsPage from "@/pages/teams";
import MyTeamPage from "@/pages/my-team";
import DashboardPage from "@/pages/dashboard";
import AdminPage from "@/pages/admin";
import AdminLoginPage from "@/pages/admin-login";
import NotFound from "@/pages/not-found";

const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);

const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

if (!clerkPubKey) {
  throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY");
}

const clerkAppearance = {
  theme: dark,
  cssLayerName: "clerk",
  options: {
    logoPlacement: "inside" as const,
    logoLinkUrl: basePath || "/",
  },
  variables: {
    colorPrimary: "#ff6b00",
    colorForeground: "#ffffff",
    colorMutedForeground: "#a0a0b0",
    colorDanger: "#ff2244",
    colorBackground: "#12121a",
    colorInput: "#1a1a24",
    colorInputForeground: "#ffffff",
    colorNeutral: "#2a2a36",
    fontFamily: "Outfit, sans-serif",
    borderRadius: "0.5rem",
  },
  elements: {
    rootBox: "w-full flex justify-center",
    cardBox: "bg-[#12121a] rounded-2xl w-[440px] max-w-full overflow-hidden border border-[#ff6b00]/20 shadow-[0_0_20px_rgba(255,107,0,0.1)]",
    card: "!shadow-none !border-0 !bg-transparent !rounded-none",
    footer: "!shadow-none !border-0 !bg-transparent !rounded-none",
    headerTitle: "text-2xl font-bold uppercase text-white",
    headerSubtitle: "text-[#a0a0b0]",
    formButtonPrimary: "bg-[#ff6b00] hover:bg-[#e66000] text-white font-bold uppercase transition-all",
    formFieldInput: "bg-[#1a1a24] border-[#2a2a36] text-white focus:border-[#ff6b00]",
    footerActionLink: "text-[#ff6b00] hover:text-[#ff8533]",
    footerActionText: "text-[#a0a0b0]",
    dividerText: "text-[#a0a0b0]",
    socialButtonsBlockButton: "bg-[#1a1a24] border border-[#2a2a36] hover:bg-[#2a2a36] transition-colors",
    footerAction: "border-t border-[#2a2a36] pt-6",
    dividerLine: "bg-[#2a2a36]",
  },
};

function SignInPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-[#0a0a0f] px-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center opacity-10" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f] via-transparent to-transparent" />
      <SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} />
    </div>
  );
}

function SignUpPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-[#0a0a0f] px-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center opacity-10" />
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0f] via-transparent to-transparent" />
      <SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} />
    </div>
  );
}

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const qc = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (prevUserIdRef.current !== undefined && prevUserIdRef.current !== userId) {
        qc.clear();
      }
      prevUserIdRef.current = userId;
    });
    return unsubscribe;
  }, [addListener, qc]);

  return null;
}

function App() {
  const [, setLocation] = useLocation();

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkQueryClientCacheInvalidator />
        <TooltipProvider>
          <WouterRouter base={basePath}>
            <Switch>
              {/* Public routes — accessible to everyone */}
              <Route path="/" component={Home} />
              <Route path="/tournaments" component={TournamentsPage} />
              <Route path="/tournaments/:id" component={TournamentDetailPage} />
              <Route path="/leaderboard" component={LeaderboardPage} />
              <Route path="/schedule" component={SchedulePage} />
              <Route path="/results" component={ResultsPage} />
              <Route path="/prizes" component={PrizesPage} />
              <Route path="/contact" component={ContactPage} />
              <Route path="/teams" component={TeamsPage} />
              <Route path="/admin-login" component={AdminLoginPage} />
              <Route path="/sign-in/*?" component={SignInPage} />
              <Route path="/sign-up/*?" component={SignUpPage} />

              {/* User-only routes — require Clerk login */}
              <Route path="/register">
                {() => <UserRoute component={RegisterPage} />}
              </Route>
              <Route path="/teams/my">
                {() => <UserRoute component={MyTeamPage} />}
              </Route>
              <Route path="/dashboard">
                {() => <UserRoute component={DashboardPage} />}
              </Route>

              {/* Admin-only route — requires admin session token */}
              <Route path="/admin">
                {() => <AdminRoute component={AdminPage} />}
              </Route>

              <Route component={NotFound} />
            </Switch>
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

export default App;
