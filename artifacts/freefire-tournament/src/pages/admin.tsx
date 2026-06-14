import { useEffect } from "react";
import { useAuth } from "@clerk/react";
import { useLocation } from "wouter";
import { Users, Trophy, Shield, Clock, DollarSign, AlertCircle, CheckCircle, XCircle, Bell } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import {
  useGetAdminStats, useListRegistrationsForTournament, useApproveRegistration, useRejectRegistration, useListTournaments, useSendNotification,
  getGetAdminStatsQueryKey, getListRegistrationsForTournamentQueryKey,
} from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

export default function AdminPage() {
  const { isSignedIn } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();

  useEffect(() => {
    if (!isSignedIn) setLocation("/sign-in");
  }, [isSignedIn]);

  const { data: stats, isLoading: loadingStats } = useGetAdminStats({
    query: { queryKey: getGetAdminStatsQueryKey() },
  });

  const { data: allTournaments = [] } = useListTournaments({});
  const firstTournament = (allTournaments as any[])[0];

  const { data: registrations = [] } = useListRegistrationsForTournament(
    firstTournament?.id ?? 0,
    { status: "pending" },
    { query: { enabled: !!firstTournament, queryKey: getListRegistrationsForTournamentQueryKey(firstTournament?.id ?? 0, { status: "pending" }) } }
  );

  const approve = useApproveRegistration();
  const reject = useRejectRegistration();
  const sendNotification = useSendNotification();

  const handleApprove = (id: number) => {
    approve.mutate({ id }, {
      onSuccess: () => {
        toast({ title: "Registration approved" });
        qc.invalidateQueries({ queryKey: getGetAdminStatsQueryKey() });
        if (firstTournament) {
          qc.invalidateQueries({ queryKey: getListRegistrationsForTournamentQueryKey(firstTournament.id, { status: "pending" }) });
        }
      },
    });
  };

  const handleReject = (id: number) => {
    reject.mutate({ id }, {
      onSuccess: () => {
        toast({ title: "Registration rejected" });
        qc.invalidateQueries({ queryKey: getGetAdminStatsQueryKey() });
        if (firstTournament) {
          qc.invalidateQueries({ queryKey: getListRegistrationsForTournamentQueryKey(firstTournament.id, { status: "pending" }) });
        }
      },
    });
  };

  const s = stats as any;

  const statCards = [
    { label: "Total Users", value: s?.totalUsers ?? 0, icon: Users, color: "text-blue-400", border: "border-blue-400/20" },
    { label: "Tournaments", value: s?.totalTournaments ?? 0, icon: Trophy, color: "text-[#ff6b00]", border: "border-[#ff6b00]/20" },
    { label: "Teams", value: s?.totalTeams ?? 0, icon: Shield, color: "text-purple-400", border: "border-purple-400/20" },
    { label: "Registrations", value: s?.totalRegistrations ?? 0, icon: Users, color: "text-green-400", border: "border-green-400/20" },
    { label: "Active Tournaments", value: s?.activeTournaments ?? 0, icon: Trophy, color: "text-yellow-400", border: "border-yellow-400/20" },
    { label: "Pending Reviews", value: s?.pendingRegistrations ?? 0, icon: Clock, color: "text-red-400", border: "border-red-400/20" },
    { label: "Total Prize Pool", value: `৳${Number(s?.totalPrizePool ?? 0).toLocaleString()}`, icon: DollarSign, color: "text-[#ffd700]", border: "border-[#ffd700]/20" },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 pt-24 pb-16">
        <h1 className="text-4xl font-black uppercase mb-2" data-testid="heading-admin">
          Admin <span className="text-[#ff6b00]">Dashboard</span>
        </h1>
        <p className="text-[#a0a0b0] mb-10">Manage tournaments, registrations, and users</p>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          {statCards.map((card) => (
            <div key={card.label} className={`bg-[#12121a] rounded-xl border ${card.border} p-4`} data-testid={`stat-admin-${card.label.toLowerCase().replace(/ /g, "-")}`}>
              <card.icon className={`w-5 h-5 ${card.color} mb-2`} />
              <div className={`text-2xl font-black ${card.color}`}>{loadingStats ? "—" : card.value}</div>
              <div className="text-[#a0a0b0] text-xs mt-1">{card.label}</div>
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Pending Registrations */}
          <div>
            <h2 className="text-lg font-black uppercase text-[#ff6b00] mb-4 tracking-wider">Pending Registrations</h2>
            <div className="bg-[#12121a] rounded-xl border border-[#ff6b00]/20 overflow-hidden">
              {(registrations as any[]).length === 0 ? (
                <div className="p-8 text-center">
                  <CheckCircle className="w-10 h-10 mx-auto mb-3 text-[#00ff88]/50" />
                  <p className="text-[#a0a0b0]">No pending registrations</p>
                </div>
              ) : (
                (registrations as any[]).filter((r: any) => r.status === "pending").map((reg: any) => (
                  <div key={reg.id} className="flex items-center gap-3 p-4 border-b border-[#ff6b00]/5 last:border-0 hover:bg-[#ff6b00]/5 transition-colors" data-testid={`row-pending-reg-${reg.id}`}>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-white text-sm truncate" data-testid={`text-pending-player-${reg.id}`}>{reg.playerName}</div>
                      <div className="text-[#a0a0b0] text-xs font-mono">{reg.freefireUid}</div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => handleApprove(reg.id)}
                        disabled={approve.isPending}
                        data-testid={`button-approve-${reg.id}`}
                        className="p-1.5 bg-[#00ff88]/10 border border-[#00ff88]/30 rounded-lg text-[#00ff88] hover:bg-[#00ff88]/20 transition-colors"
                      >
                        <CheckCircle className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleReject(reg.id)}
                        disabled={reject.isPending}
                        data-testid={`button-reject-${reg.id}`}
                        className="p-1.5 bg-[#ff2244]/10 border border-[#ff2244]/30 rounded-lg text-[#ff2244] hover:bg-[#ff2244]/20 transition-colors"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Upcoming Tournaments */}
          <div>
            <h2 className="text-lg font-black uppercase text-[#ff6b00] mb-4 tracking-wider">Upcoming Tournaments</h2>
            <div className="bg-[#12121a] rounded-xl border border-[#ff6b00]/20 overflow-hidden">
              {!s?.upcomingTournaments || s.upcomingTournaments.length === 0 ? (
                <div className="p-8 text-center text-[#a0a0b0]">No upcoming tournaments</div>
              ) : (
                s.upcomingTournaments.map((t: any) => (
                  <div key={t.id} className="p-4 border-b border-[#ff6b00]/5 last:border-0 flex items-center justify-between" data-testid={`row-upcoming-${t.id}`}>
                    <div>
                      <div className="font-bold text-white text-sm" data-testid={`text-upcoming-name-${t.id}`}>{t.name}</div>
                      <div className="text-[#a0a0b0] text-xs">{new Date(t.startDate).toLocaleDateString()} — ৳{Number(t.prizePool).toLocaleString()}</div>
                    </div>
                    <span className="text-xs font-bold text-yellow-400 uppercase px-2 py-0.5 bg-yellow-400/10 border border-yellow-400/20 rounded">
                      {t.status}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
