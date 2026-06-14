import { useState } from "react";
import { Search, Trophy, Filter } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import TournamentCard from "@/components/TournamentCard";
import { useListTournaments, getListTournamentsQueryKey } from "@workspace/api-client-react";

const MODES = ["", "solo", "duo", "squad"];
const STATUSES = ["", "upcoming", "ongoing", "completed"];

export default function TournamentsPage() {
  const [search, setSearch] = useState("");
  const [mode, setMode] = useState("");
  const [status, setStatus] = useState("");

  const params = {
    ...(search && { search }),
    ...(mode && { mode }),
    ...(status && { status }),
  };

  const { data: tournaments = [], isLoading } = useListTournaments(params, {
    query: { queryKey: getListTournamentsQueryKey(params) },
  });

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 pt-24 pb-16">
        <div className="mb-10">
          <h1 className="text-4xl md:text-5xl font-black uppercase mb-2" data-testid="heading-tournaments">
            All <span className="text-[#ff6b00]">Tournaments</span>
          </h1>
          <p className="text-[#a0a0b0]">Find and join the hottest Free Fire competitions</p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#a0a0b0]" />
            <input
              type="text"
              placeholder="Search tournaments..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              data-testid="input-search-tournaments"
              className="w-full pl-10 pr-4 py-3 bg-[#12121a] border border-[#2a2a36] rounded-xl text-white placeholder-[#a0a0b0] focus:outline-none focus:border-[#ff6b00] transition-colors"
            />
          </div>
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value)}
            data-testid="select-filter-mode"
            className="px-4 py-3 bg-[#12121a] border border-[#2a2a36] rounded-xl text-white focus:outline-none focus:border-[#ff6b00] transition-colors"
          >
            <option value="">All Modes</option>
            <option value="solo">Solo</option>
            <option value="duo">Duo</option>
            <option value="squad">Squad</option>
          </select>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            data-testid="select-filter-status"
            className="px-4 py-3 bg-[#12121a] border border-[#2a2a36] rounded-xl text-white focus:outline-none focus:border-[#ff6b00] transition-colors"
          >
            <option value="">All Status</option>
            <option value="upcoming">Upcoming</option>
            <option value="ongoing">Ongoing</option>
            <option value="completed">Completed</option>
          </select>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1,2,3,4,5,6].map((i) => (
              <div key={i} className="h-64 bg-[#12121a] rounded-xl animate-pulse" data-testid={`skeleton-card-${i}`} />
            ))}
          </div>
        ) : tournaments.length === 0 ? (
          <div className="text-center py-24">
            <Trophy className="w-16 h-16 mx-auto mb-4 text-[#ff6b00]/30" />
            <h3 className="text-xl font-bold text-white mb-2">No tournaments found</h3>
            <p className="text-[#a0a0b0]">Try adjusting your filters or check back later</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tournaments.map((t: any) => <TournamentCard key={t.id} t={t} />)}
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
