import { lazy, Suspense } from "react";
import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { queryClient } from "@/lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/lib/AuthContext";
import { ThemeProvider } from "@/lib/ThemeContext";
import { LanguageProvider } from "@/lib/LanguageContext";
import { CreateMatchProvider } from "@/lib/CreateMatchContext";
import { UserRoute, AdminRoute } from "@/components/ProtectedRoute";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import BottomNav from "@/components/BottomNav";
import PwaInstallBanner from "@/components/PwaInstallBanner";
import AnnouncementPopup from "@/components/AnnouncementPopup";
import CreateMatchModal from "@/components/CreateMatchModal";
import { useMaintenanceMode } from "@/lib/useMaintenanceMode";
import { isAdminAuthenticated } from "@/lib/adminAuth";

// Eagerly loaded — used on first paint or before router is mounted
import NotFound from "@/pages/not-found";
import MaintenancePage from "@/pages/maintenance";

// Lazily loaded — each page becomes its own JS chunk for faster initial load
const Home = lazy(() => import("@/pages/home"));
const TournamentsPage = lazy(() => import("@/pages/tournaments"));
const TournamentDetailPage = lazy(() => import("@/pages/tournament-detail"));
const TournamentCategoryPage = lazy(() => import("@/pages/tournament-category"));
const RegisterPage = lazy(() => import("@/pages/register"));
const LeaderboardPage = lazy(() => import("@/pages/leaderboard"));
const SchedulePage = lazy(() => import("@/pages/schedule"));
const ResultsPage = lazy(() => import("@/pages/results"));
const PrizesPage = lazy(() => import("@/pages/prizes"));
const ContactPage = lazy(() => import("@/pages/contact"));
const TeamsPage = lazy(() => import("@/pages/teams"));
const MyTeamPage = lazy(() => import("@/pages/my-team"));
const DashboardPage = lazy(() => import("@/pages/dashboard"));
const AdminPage = lazy(() => import("@/pages/admin"));
const AdminLoginPage = lazy(() => import("@/pages/admin-login"));
const LoginPage = lazy(() => import("@/pages/login"));
const SignUpPage = lazy(() => import("@/pages/signup"));
const ForgotPasswordPage = lazy(() => import("@/pages/forgot-password"));
const WalletPage = lazy(() => import("@/pages/wallet"));
const ProfilePage = lazy(() => import("@/pages/profile"));
const ReferralPage = lazy(() => import("@/pages/referral"));
const SupportPage = lazy(() => import("@/pages/support"));
const MyTicketsPage = lazy(() => import("@/pages/my-tickets"));
const MyMatchesPage = lazy(() => import("@/pages/my-matches"));
const RankingsPage  = lazy(() => import("@/pages/rankings"));
const MatchCategoryPage = lazy(() => import("@/pages/match-category"));
const CommunityMatchesPage = lazy(() => import("@/pages/community-matches"));

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function PageLoader() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-[#ff6b00] border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function MaintenanceGuard({ children }: { children: React.ReactNode }) {
  const maintenance = useMaintenanceMode();
  const [location] = useLocation();

  const isAdminArea = location.startsWith("/admin");
  const isAdminLoggedIn = isAdminAuthenticated();

  if (maintenance && !isAdminArea && !isAdminLoggedIn) {
    return <MaintenancePage />;
  }

  return <>{children}</>;
}

function App() {
  return (
    <ErrorBoundary>
      <LanguageProvider>
      <ThemeProvider>
        <AuthProvider>
          <CreateMatchProvider>
            <QueryClientProvider client={queryClient}>
              <TooltipProvider>
                <WouterRouter base={basePath}>
                  <MaintenanceGuard>
                    <Suspense fallback={<PageLoader />}>
                      <Switch>
                        {/* Public routes */}
                        <Route path="/" component={Home} />
                        <Route path="/tournaments" component={TournamentsPage} />
                        {/* Category pages — must come BEFORE the :id catch-all */}
                        <Route path="/tournaments/all">
                          {() => <TournamentCategoryPage gameMode={null} slug="all" />}
                        </Route>
                        <Route path="/tournaments/br">
                          {() => <TournamentCategoryPage gameMode="BR" slug="br" />}
                        </Route>
                        <Route path="/tournaments/cs">
                          {() => <TournamentCategoryPage gameMode="CS" slug="cs" />}
                        </Route>
                        <Route path="/tournaments/solo">
                          {() => <TournamentCategoryPage gameMode="SOLO" slug="solo" />}
                        </Route>
                        <Route path="/tournaments/lonewolf">
                          {() => <TournamentCategoryPage gameMode="LONE_WOLF" slug="lonewolf" />}
                        </Route>
                        <Route path="/tournaments/free">
                          {() => <TournamentCategoryPage gameMode="FREE" slug="free" />}
                        </Route>
                        <Route path="/tournaments/:id" component={TournamentDetailPage} />
                        <Route path="/leaderboard" component={LeaderboardPage} />
                        <Route path="/rankings"   component={RankingsPage} />
                        <Route path="/schedule" component={SchedulePage} />
                        <Route path="/results" component={ResultsPage} />
                        <Route path="/prizes" component={PrizesPage} />
                        <Route path="/contact" component={ContactPage} />
                        <Route path="/teams" component={TeamsPage} />
                        <Route path="/admin-login" component={AdminLoginPage} />
                        <Route path="/sign-in" component={LoginPage} />
                        <Route path="/sign-up" component={SignUpPage} />
                        <Route path="/forgot-password" component={ForgotPasswordPage} />

                        {/* User-only routes */}
                        <Route path="/register">
                          {() => <UserRoute component={RegisterPage} />}
                        </Route>
                        <Route path="/teams/my">
                          {() => <UserRoute component={MyTeamPage} />}
                        </Route>
                        <Route path="/dashboard">
                          {() => <UserRoute component={DashboardPage} />}
                        </Route>
                        <Route path="/wallet">
                          {() => <UserRoute component={WalletPage} />}
                        </Route>
                        <Route path="/profile">
                          {() => <UserRoute component={ProfilePage} />}
                        </Route>
                        <Route path="/referral">
                          {() => <UserRoute component={ReferralPage} />}
                        </Route>
                        <Route path="/support" component={SupportPage} />
                        <Route path="/my-tickets">
                          {() => <UserRoute component={MyTicketsPage} />}
                        </Route>
                        <Route path="/my-matches">
                          {() => <UserRoute component={MyMatchesPage} />}
                        </Route>
                        <Route path="/matches" component={CommunityMatchesPage} />
                        <Route path="/matches/:category" component={MatchCategoryPage} />

                        {/* Admin-only route */}
                        <Route path="/admin">
                          {() => <AdminRoute component={AdminPage} />}
                        </Route>

                        <Route component={NotFound} />
                      </Switch>
                    </Suspense>

                    <BottomNav />
                    <PwaInstallBanner />
                    <AnnouncementPopup />
                    <CreateMatchModal />
                  </MaintenanceGuard>
                </WouterRouter>
                <Toaster />
              </TooltipProvider>
            </QueryClientProvider>
          </CreateMatchProvider>
        </AuthProvider>
      </ThemeProvider>
      </LanguageProvider>
    </ErrorBoundary>
  );
}

export default App;
