import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Ticket, ChevronLeft, ChevronRight, MessageCircle, Clock, CheckCircle, XCircle, AlertCircle, RefreshCw, Send, ArrowLeft } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useAuth } from "@/lib/AuthContext";
import { useToast } from "@/hooks/use-toast";

const CATEGORY_LABELS: Record<string, string> = {
  payment_issue: "Payment Issue",
  tournament_issue: "Tournament Issue",
  match_issue: "Match Issue",
  account_issue: "Account Issue",
  technical_issue: "Technical Issue",
  other: "Other",
};

const STATUS_CONFIG: Record<string, { label: string; cls: string; icon: any }> = {
  open: { label: "Open", cls: "text-yellow-400 bg-yellow-400/10 border-yellow-400/30", icon: Clock },
  in_progress: { label: "In Progress", cls: "text-[#ff6b00] bg-[#ff6b00]/10 border-[#ff6b00]/30", icon: AlertCircle },
  resolved: { label: "Resolved", cls: "text-[#00ff88] bg-[#00ff88]/10 border-[#00ff88]/30", icon: CheckCircle },
  closed: { label: "Closed", cls: "text-[#a0a0b0] bg-[#a0a0b0]/10 border-[#a0a0b0]/30", icon: XCircle },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.open;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-xs font-bold uppercase ${cfg.cls}`}>
      <Icon className="w-3 h-3" />
      {cfg.label}
    </span>
  );
}

function timeAgo(dateStr: string) {
  const ms = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function MyTicketsPage() {
  const { user, authFetch } = useAuth();
  const { toast } = useToast();

  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [loadingTicket, setLoadingTicket] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [sendingReply, setSendingReply] = useState(false);

  const loadTickets = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await authFetch("/api/support/tickets");
      if (res.ok) setTickets(await res.json());
    } catch {}
    finally { setLoading(false); }
  };

  const openTicket = async (id: number) => {
    setLoadingTicket(true);
    try {
      const res = await authFetch(`/api/support/tickets/${id}`);
      if (res.ok) setSelectedTicket(await res.json());
    } catch {}
    finally { setLoadingTicket(false); }
  };

  const sendReply = async () => {
    if (!replyText.trim() || !selectedTicket) return;
    setSendingReply(true);
    try {
      const res = await authFetch(`/api/support/tickets/${selectedTicket.id}/replies`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: replyText }),
      });
      if (res.ok) {
        setReplyText("");
        await openTicket(selectedTicket.id);
        toast({ title: "Reply sent" });
      } else {
        const d = await res.json();
        toast({ title: "Error", description: d.error ?? "Failed", variant: "destructive" });
      }
    } catch {
      toast({ title: "Connection error", variant: "destructive" });
    } finally {
      setSendingReply(false);
    }
  };

  useEffect(() => { loadTickets(); }, [user]);

  if (!user) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] text-white">
        <Navbar />
        <div className="max-w-2xl mx-auto px-4 pt-24 text-center">
          <AlertCircle className="w-12 h-12 text-[#a0a0b0] mx-auto mb-3 opacity-30" />
          <p className="text-[#a0a0b0] mb-4">Sign in to view your tickets.</p>
          <Link href="/sign-in" className="px-6 py-2.5 bg-[#ff6b00] text-white font-black uppercase rounded-xl text-sm hover:bg-[#e66000] transition-colors">Sign In</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 pt-16 pb-20">

        {selectedTicket ? (
          <div>
            <button onClick={() => setSelectedTicket(null)} className="flex items-center gap-2 text-[#a0a0b0] hover:text-white text-sm mb-6 transition-colors">
              <ArrowLeft className="w-4 h-4" /> Back to My Tickets
            </button>

            <div className="bg-[#12121a] rounded-2xl border border-[#ff6b00]/15 p-6 mb-4">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <h2 className="font-black text-white text-lg leading-tight">{selectedTicket.subject}</h2>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <StatusBadge status={selectedTicket.status} />
                    <span className="text-[#4a4a5a] text-xs">{CATEGORY_LABELS[selectedTicket.category] ?? selectedTicket.category}</span>
                    <span className="text-[#4a4a5a] text-xs">#{selectedTicket.id}</span>
                  </div>
                </div>
                <span className="text-[#4a4a5a] text-xs whitespace-nowrap shrink-0">{timeAgo(selectedTicket.createdAt)}</span>
              </div>

              <div className="border-t border-[#ff6b00]/10 pt-4 mt-2">
                <div className="flex gap-3 mb-4">
                  <div className="w-8 h-8 rounded-full bg-[#ff6b00]/20 flex items-center justify-center shrink-0 text-xs font-black text-[#ff6b00]">
                    {user.username?.[0]?.toUpperCase() ?? "U"}
                  </div>
                  <div className="flex-1 bg-[#0a0a0f] rounded-xl p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-white text-xs font-bold">{user.displayName ?? user.username ?? "You"}</span>
                      <span className="text-[#4a4a5a] text-xs">{timeAgo(selectedTicket.createdAt)}</span>
                    </div>
                    <p className="text-[#a0a0b0] text-sm leading-relaxed whitespace-pre-wrap">{selectedTicket.message}</p>
                    {selectedTicket.screenshotUrl && (
                      <img src={selectedTicket.screenshotUrl} alt="screenshot" className="mt-3 rounded-lg max-w-xs max-h-48 object-contain" />
                    )}
                  </div>
                </div>

                {(selectedTicket.replies ?? []).map((reply: any) => (
                  <div key={reply.id} className={`flex gap-3 mb-4 ${reply.isAdmin ? "" : "flex-row-reverse"}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-black ${reply.isAdmin ? "bg-[#ff6b00]/20 text-[#ff6b00]" : "bg-[#229ED9]/20 text-[#229ED9]"}`}>
                      {reply.isAdmin ? "A" : (user.username?.[0]?.toUpperCase() ?? "U")}
                    </div>
                    <div className={`flex-1 rounded-xl p-3 ${reply.isAdmin ? "bg-[#ff6b00]/8 border border-[#ff6b00]/15" : "bg-[#0a0a0f]"}`}>
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-xs font-bold ${reply.isAdmin ? "text-[#ff6b00]" : "text-white"}`}>
                          {reply.isAdmin ? "Support Team" : (user.displayName ?? user.username ?? "You")}
                        </span>
                        <span className="text-[#4a4a5a] text-xs">{timeAgo(reply.createdAt)}</span>
                      </div>
                      <p className="text-[#a0a0b0] text-sm leading-relaxed whitespace-pre-wrap">{reply.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {selectedTicket.status !== "closed" && (
              <div className="bg-[#12121a] rounded-2xl border border-[#ff6b00]/15 p-4">
                <label className="block text-[#a0a0b0] text-xs uppercase tracking-wider mb-2 font-bold">Reply</label>
                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  rows={3}
                  placeholder="Add a reply to your ticket..."
                  className="w-full bg-[#0a0a0f] border border-[#2a2a36] rounded-xl px-4 py-2.5 text-white text-sm placeholder-[#4a4a5a] focus:outline-none focus:border-[#ff6b00] transition-colors resize-none mb-3"
                />
                <button
                  onClick={sendReply}
                  disabled={sendingReply || !replyText.trim()}
                  className="flex items-center gap-2 px-5 py-2.5 bg-[#ff6b00] text-white font-black uppercase rounded-xl text-sm hover:bg-[#e66000] disabled:opacity-50 transition-all"
                >
                  <Send className="w-4 h-4" />
                  {sendingReply ? "Sending..." : "Send Reply"}
                </button>
              </div>
            )}
            {selectedTicket.status === "closed" && (
              <div className="text-center py-4 text-[#a0a0b0] text-sm bg-[#12121a] rounded-2xl border border-[#a0a0b0]/10">
                This ticket is closed. <Link href="/support" className="text-[#ff6b00] hover:underline">Open a new ticket</Link> if you need more help.
              </div>
            )}
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-3xl font-black uppercase">My <span className="text-[#ff6b00]">Tickets</span></h1>
                <p className="text-[#a0a0b0] text-sm mt-1">Track your support requests</p>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={loadTickets} className="flex items-center gap-2 text-sm text-[#a0a0b0] hover:text-white transition-colors">
                  <RefreshCw className="w-4 h-4" /> Refresh
                </button>
                <Link href="/support" className="flex items-center gap-2 px-4 py-2 bg-[#ff6b00] text-white font-black uppercase rounded-xl text-sm hover:bg-[#e66000] transition-colors">
                  <Ticket className="w-4 h-4" /> New Ticket
                </Link>
              </div>
            </div>

            {loading ? (
              <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-20 bg-[#12121a] rounded-xl animate-pulse" />)}</div>
            ) : tickets.length === 0 ? (
              <div className="bg-[#12121a] rounded-2xl border border-[#ff6b00]/10 p-14 text-center">
                <Ticket className="w-12 h-12 text-[#a0a0b0] mx-auto mb-3 opacity-20" />
                <h3 className="text-white font-black text-lg mb-1">No tickets yet</h3>
                <p className="text-[#a0a0b0] text-sm mb-5">Submit a support ticket and we'll help you out.</p>
                <Link href="/support" className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#ff6b00] text-white font-black uppercase rounded-xl text-sm hover:bg-[#e66000] transition-colors">
                  Submit a Ticket
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {tickets.map((ticket: any) => (
                  <button
                    key={ticket.id}
                    onClick={() => openTicket(ticket.id)}
                    className="w-full bg-[#12121a] border border-[#ff6b00]/10 hover:border-[#ff6b00]/30 rounded-xl p-4 text-left transition-colors flex items-center gap-4"
                  >
                    <div className="w-10 h-10 rounded-xl bg-[#ff6b00]/10 flex items-center justify-center shrink-0">
                      <MessageCircle className="w-5 h-5 text-[#ff6b00]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-bold text-white text-sm truncate">{ticket.subject}</span>
                        <span className="text-[#4a4a5a] text-xs whitespace-nowrap shrink-0">{timeAgo(ticket.createdAt)}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <StatusBadge status={ticket.status} />
                        <span className="text-[#4a4a5a] text-xs">{CATEGORY_LABELS[ticket.category] ?? ticket.category}</span>
                        <span className="text-[#4a4a5a] text-xs">#{ticket.id}</span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-[#4a4a5a] shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
