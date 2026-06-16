import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { queryClient } from "@/lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/lib/AuthContext";
import { ThemeProvider } from "@/lib/ThemeContext";
import { UserRoute, AdminRoute } from "@/components/ProtectedRoute";
import BottomNav from "@/components/BottomNav";
import PwaInstallBanner from "@/components/PwaInstallBanner";
import AnnouncementPopup from "@/components/AnnouncementPopup";
import { useMaintenanceMode } from "@/lib/useMaintenanceMode";
import { isAdminAuthenticated } from "@/lib/adminAuth";

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
import LoginPage from "@/pages/login";
import SignUpPage from "@/pages/signup";
import ForgotPasswordPage from "@/pages/forgot-password";
import WalletPage from "@/pages/wallet";
import ProfilePage from "@/pages/profile";
import ReferralPage from "@/pages/referral";
import SupportPage from "@/pages/support";
import MyTicketsPage from "@/pages/my-tickets";
import NotFound from "@/pages/not-found";
import MaintenancePage from "@/pages/maintenance";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function MaintenanceGuard({ children }: { children: React.ReactNode }) {
  const maintenance = useMaintenanceMode();
  const [location] = useLocation();

  if (maintenance === null) return null;

  const isAdminArea = location.startsWith("/admin");
  const isAdminLoggedIn = isAdminAuthenticated();

  if (maintenance && !isAdminArea && !isAdminLoggedIn) {
    return <MaintenancePage />;
  }

  return <>{children}</>;
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <WouterRouter base={basePath}>
              <MaintenanceGuard>
                <Switch>
                  {/* Public routes */}
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

                  {/* Admin-only route */}
                  <Route path="/admin">
                    {() => <AdminRoute component={AdminPage} />}
                  </Route>

                  <Route component={NotFound} />
                </Switch>

                <BottomNav />
                <PwaInstallBanner />
                <AnnouncementPopup />
              </MaintenanceGuard>
            </WouterRouter>
            <Toaster />
          </TooltipProvider>
        </QueryClientProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
