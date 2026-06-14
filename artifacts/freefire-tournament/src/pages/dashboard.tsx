import { useEffect } from "react";
import { useAuth, useUser } from "@clerk/react";
import { useLocation, Link } from "wouter";
import { Trophy, Users, Calendar, Shield, Clock, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useGetMyRegistrations, useGetMyTeam, getGetMyRegistrationsQueryKey, getGetMyTeamQueryKey } from "@workspace/api-client-react";

const statusIcon: Record<string, JSX.Element> = {
  approved: <CheckCircle className="w-4 h-4 text-[#00ff88]" />,
  rejected: <XCircle className="w-4 h-4 text-[#ff2244]" />,
  pending: <Clock className="w-4 h-4 text-yellow-400" />,
};

const statusColors: Record<string, string> = {
  approved: "text-[#00ff88] bg-[#00ff88]/10 border-[#00ff88]/30",
  rejected: "text-[#ff2244] bg-[#ff2244]/10 border-[#ff2244]/30",
  pending: "text-yellow-400 bg-yellow-400/10 border-yellow-400/30",
};

export default function DashboardPage() {
  const { isSignedIn } = useAuth();
  const { user } = useUser();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isSignedIn) setLocation("/sign-in");
  }, [isSignedIn]);

  const { data: registrations = [], isLoading: loadingRegs } = useGetMyRegistrations({
    query: { queryKey: getGetMyRegistrationsQueryKey() },
  });
  const { data: myTeam } = useGetMyTeam({
    query: { queryKey: getGetMyTeamQueryKey() },
  });

  const team = myTeam as any;
  const regs = registrations as any[];

  const approved = regs.filter((r) => r.status === "approved").length;
  const pending = regs.filter((r) => r.status === "pending").length;

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 pt-24 pb-16">
        {/* Profile header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 mb-10">
          {user?.imageUrl && (
            <img src={user.imageUrl} alt={user.fullName ?? ""} className="w-16 h-16 rounded-full border-2 border-[#ff6b00]" data-testid="img-user-avatar" />
          )}
          <div>
            <h1 className="text-3xl font-black" data-testid="text-welcome">
              Welcome, <span className="text-[#ff6b00]">{user?.firstName ?? "Player"}</span>
            </h1>
            <p className="text-[#a0a0b0]">{user?.primaryEmailAddress?.emailAddress}</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          {[
            { label: "Total Registered", value: regs.length, icon: Trophy, color: "text-[#ff6b00]" },
            { label: "Approved", value: approved, icon: CheckCircle, color: "text-[#00ff88]" },
            { label: "Pending", value: pending, icon: Clock, color: "text-yellow-400" },
            { label: "Team", value: team ? "Active" : "None", icon: Shield, color: "text-[#a0a0b0]" },
          ].map((stat) => (
            <div key={stat.label} className="bg-[#12121a] rounded-xl border border-[#ff6b00]/20 p-4" data-testid={`stat-card-${stat.label.toLowerCase().replace(/ /g, "-")}`}>
              <stat.icon className={`w-5 h-5 ${stat.color} mb-2`} />
              <div className={`text-2xl font-black ${stat.color}`}>{stat.value}</div>
              <div className="text-[#a0a0b0] text-xs mt-1">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* My Team */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-black uppercase">My <span className="text-[#ff6b00]">Team</span></h2>
            <Link href="/teams/my" data-testid="link-dashboard-my-team" className="text-[#ff6b00] text-sm font-bold hover:underline">Manage Team →</Link>
          </div>
          {team ? (
            <div className="bg-[#12121a] rounded-xl border border-[#ff6b00]/20 p-5 flex items-center gap-4" data-testid="card-my-team">
              <Shield className="w-10 h-10 text-[#ff6b00]" />
              <div>
                <div className="font-black text-white text-lg" data-testid="text-dashboard-team-name">{team.name}</div>
                {team.tag && <div className="text-[#a0a0b0] text-xs">[{team.tag}] — {team.members?.filter((m: any) => m.status === "active").length ?? 0} active members</div>}
              </div>
            </div>
          ) : (
            <div className="bg-[#12121a] rounded-xl border border-[#ff6b00]/10 p-5 text-center">
              <p className="text-[#a0a0b0] mb-3">You're not part of a team yet</p>
              <Link href="/teams/my" data-testid="link-create-or-join" className="text-[#ff6b00] font-bold text-sm hover:underline">Create or join a team →</Link>
            </div>
          )}
        </div>

        {/* Registrations */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-black uppercase">My <span className="text-[#ff6b00]">Registrations</span></h2>
            <Link href="/tournaments" data-testid="link-find-more" className="text-[#ff6b00] text-sm font-bold hover:underline">Find More →</Link>
          </div>

          {loadingRegs ? (
            <div className="space-y-3">
              {[1,2].map((i) => <div key={i} className="h-20 bg-[#12121a] rounded-xl animate-pulse" />)}
            </div>
          ) : regs.length === 0 ? (
            <div className="bg-[#12121a] rounded-xl border border-[#ff6b00]/10 p-8 text-center">
              <Trophy className="w-10 h-10 mx-auto mb-3 text-[#ff6b00]/30" />
              <p className="text-[#a0a0b0] mb-4">You haven't registered for any tournaments yet</p>
              <Link href="/tournaments" data-testid="link-browse-tournaments" className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#ff6b00] text-white font-bold uppercase text-sm rounded-xl hover:bg-[#e66000] transition-all">
                Browse Tournaments
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {regs.map((reg: any) => (
                <div key={reg.id} className="bg-[#12121a] rounded-xl border border-[#ff6b00]/10 hover:border-[#ff6b00]/30 transition-colors p-4 flex items-center gap-4" data-testid={`card-registration-${reg.id}`}>
                  <div className="flex-1">
                    <div className="font-bold text-white" data-testid={`text-reg-tournament-${reg.id}`}>
                      {reg.tournament?.name ?? `Tournament #${reg.tournamentId}`}
                    </div>
                    <div className="text-[#a0a0b0] text-xs mt-0.5">
                      UID: <span className="font-mono">{reg.freefireUid}</span> — {reg.playerName}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded border uppercase ${statusColors[reg.status] ?? statusColors.pending}`} data-testid={`badge-reg-status-${reg.id}`}>
                      {statusIcon[reg.status]}
                      {reg.status}
                    </span>
                    <div className="text-[#a0a0b0] text-xs mt-1">{new Date(reg.createdAt).toLocaleDateString()}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
}
