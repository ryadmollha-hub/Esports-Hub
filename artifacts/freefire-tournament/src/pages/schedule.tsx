import { Calendar, Clock, Map } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useGetMatchSchedule, getGetMatchScheduleQueryKey } from "@workspace/api-client-react";

const statusConfig: Record<string, { label: string; color: string; dot: string }> = {
  scheduled: { label: "Scheduled", color: "text-yellow-400 border-yellow-400/30 bg-yellow-400/10", dot: "bg-yellow-400" },
  live: { label: "LIVE", color: "text-green-400 border-green-400/30 bg-green-400/10", dot: "bg-green-400 animate-pulse" },
  completed: { label: "Completed", color: "text-gray-400 border-gray-400/30 bg-gray-400/10", dot: "bg-gray-400" },
};

export default function SchedulePage() {
  const { data: matches = [], isLoading } = useGetMatchSchedule({
    query: { queryKey: getGetMatchScheduleQueryKey() },
  });

  const now = new Date();
  const upcoming = (matches as any[]).filter((m) => m.status === "scheduled" || m.status === "live");
  const past = (matches as any[]).filter((m) => m.status === "completed");

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 pt-24 pb-16">
        <h1 className="text-4xl font-black uppercase mb-2" data-testid="heading-schedule">
          Match <span className="text-[#ff6b00]">Schedule</span>
        </h1>
        <p className="text-[#a0a0b0] mb-10">Upcoming and recent matches</p>

        {isLoading ? (
          <div className="space-y-4">
            {[1,2,3].map((i) => <div key={i} className="h-20 bg-[#12121a] rounded-xl animate-pulse" />)}
          </div>
        ) : matches.length === 0 ? (
          <div className="text-center py-20">
            <Calendar className="w-16 h-16 mx-auto mb-4 text-[#ff6b00]/30" />
            <h3 className="text-xl font-bold mb-2">No matches scheduled</h3>
            <p className="text-[#a0a0b0]">Check back once tournaments begin</p>
          </div>
        ) : (
          <div className="space-y-8">
            {upcoming.length > 0 && (
              <div>
                <h2 className="text-lg font-black uppercase text-[#ff6b00] mb-4 tracking-wider">Upcoming</h2>
                <div className="space-y-3">
                  {upcoming.map((match: any) => (
                    <MatchRow key={match.id} match={match} />
                  ))}
                </div>
              </div>
            )}
            {past.length > 0 && (
              <div>
                <h2 className="text-lg font-black uppercase text-[#a0a0b0] mb-4 tracking-wider">Completed</h2>
                <div className="space-y-3 opacity-75">
                  {past.map((match: any) => (
                    <MatchRow key={match.id} match={match} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}

function MatchRow({ match }: { match: any }) {
  const sc = statusConfig[match.status] ?? statusConfig.scheduled;
  return (
    <div className="bg-[#12121a] rounded-xl border border-[#ff6b00]/10 hover:border-[#ff6b00]/30 transition-colors p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4" data-testid={`row-match-${match.id}`}>
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span className={`text-xs font-bold px-2 py-0.5 rounded border flex items-center gap-1.5 ${sc.color}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
            {sc.label}
          </span>
          <span className="text-[#a0a0b0] text-xs">Match #{match.matchNumber}</span>
        </div>
        <div className="font-bold text-white" data-testid={`text-match-tournament-${match.id}`}>
          {match.tournament?.name ?? "Unknown Tournament"}
        </div>
        {match.mapName && (
          <div className="flex items-center gap-1 text-[#a0a0b0] text-xs mt-1">
            <Map className="w-3 h-3" /> {match.mapName}
          </div>
        )}
      </div>
      <div className="text-right shrink-0">
        <div className="flex items-center gap-1 text-[#a0a0b0] text-sm justify-end" data-testid={`text-match-time-${match.id}`}>
          <Clock className="w-3.5 h-3.5" />
          {new Date(match.scheduledAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </div>
        <div className="text-[#a0a0b0] text-xs">
          {new Date(match.scheduledAt).toLocaleDateString()}
        </div>
      </div>
    </div>
  );
}
