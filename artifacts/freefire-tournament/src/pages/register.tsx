import { useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import { useAuth } from "@clerk/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod/v4";
import { useQueryClient } from "@tanstack/react-query";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useRegisterForTournament, useListTournaments, getGetMyRegistrationsQueryKey } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { Trophy, AlertCircle } from "lucide-react";

const schema = z.object({
  tournamentId: z.coerce.number().min(1, "Select a tournament"),
  freefireUid: z.string().min(1, "Free Fire UID is required"),
  playerName: z.string().min(1, "Player name is required"),
  paymentScreenshot: z.string().url("Must be a valid URL").optional().or(z.literal("")),
});

type FormData = z.infer<typeof schema>;

export default function RegisterPage() {
  const { isSignedIn } = useAuth();
  const [, setLocation] = useLocation();
  const search = useSearch();
  const params = new URLSearchParams(search);
  const preselectedId = parseInt(params.get("tournament") ?? "0");
  const { toast } = useToast();
  const qc = useQueryClient();

  useEffect(() => {
    if (!isSignedIn) setLocation("/sign-in");
  }, [isSignedIn]);

  const { data: tournaments = [], isLoading: loadingTournaments } = useListTournaments({ status: "upcoming" });
  const register = useRegisterForTournament();

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      tournamentId: preselectedId || 0,
      freefireUid: "",
      playerName: "",
      paymentScreenshot: "",
    },
  });

  const onSubmit = (data: FormData) => {
    register.mutate(
      { id: data.tournamentId, data: { freefireUid: data.freefireUid, playerName: data.playerName, paymentScreenshot: data.paymentScreenshot || undefined } },
      {
        onSuccess: () => {
          toast({ title: "Registration submitted!", description: "Your registration is pending approval." });
          qc.invalidateQueries({ queryKey: getGetMyRegistrationsQueryKey() });
          setLocation("/dashboard");
        },
        onError: (err: any) => {
          toast({ title: "Registration failed", description: err?.response?.data?.error ?? "Please try again.", variant: "destructive" });
        },
      }
    );
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 pt-24 pb-16">
        <h1 className="text-4xl font-black uppercase mb-2" data-testid="heading-register">
          Tournament <span className="text-[#ff6b00]">Registration</span>
        </h1>
        <p className="text-[#a0a0b0] mb-8">Fill in your details to join the tournament</p>

        <div className="bg-[#12121a] rounded-2xl border border-[#ff6b00]/20 p-8">
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div>
              <label className="block text-sm font-bold uppercase tracking-wide text-[#a0a0b0] mb-2">Tournament</label>
              <select
                {...form.register("tournamentId", { valueAsNumber: true })}
                data-testid="select-tournament"
                className="w-full px-4 py-3 bg-[#1a1a24] border border-[#2a2a36] rounded-xl text-white focus:outline-none focus:border-[#ff6b00] transition-colors"
              >
                <option value={0}>Select a tournament...</option>
                {(tournaments as any[]).map((t: any) => (
                  <option key={t.id} value={t.id}>{t.name} — ৳{Number(t.entryFee)} entry</option>
                ))}
              </select>
              {form.formState.errors.tournamentId && (
                <p className="text-[#ff2244] text-sm mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />{form.formState.errors.tournamentId.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-bold uppercase tracking-wide text-[#a0a0b0] mb-2">Free Fire UID</label>
              <input
                {...form.register("freefireUid")}
                placeholder="Enter your FF UID"
                data-testid="input-freefire-uid"
                className="w-full px-4 py-3 bg-[#1a1a24] border border-[#2a2a36] rounded-xl text-white placeholder-[#a0a0b0] focus:outline-none focus:border-[#ff6b00] transition-colors font-mono"
              />
              {form.formState.errors.freefireUid && (
                <p className="text-[#ff2244] text-sm mt-1">{form.formState.errors.freefireUid.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-bold uppercase tracking-wide text-[#a0a0b0] mb-2">In-Game Name</label>
              <input
                {...form.register("playerName")}
                placeholder="Your Free Fire nickname"
                data-testid="input-player-name"
                className="w-full px-4 py-3 bg-[#1a1a24] border border-[#2a2a36] rounded-xl text-white placeholder-[#a0a0b0] focus:outline-none focus:border-[#ff6b00] transition-colors"
              />
              {form.formState.errors.playerName && (
                <p className="text-[#ff2244] text-sm mt-1">{form.formState.errors.playerName.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-bold uppercase tracking-wide text-[#a0a0b0] mb-2">
                Payment Screenshot URL <span className="text-[#a0a0b0] font-normal normal-case text-xs">(optional)</span>
              </label>
              <input
                {...form.register("paymentScreenshot")}
                placeholder="https://..."
                data-testid="input-payment-screenshot"
                className="w-full px-4 py-3 bg-[#1a1a24] border border-[#2a2a36] rounded-xl text-white placeholder-[#a0a0b0] focus:outline-none focus:border-[#ff6b00] transition-colors"
              />
              {form.formState.errors.paymentScreenshot && (
                <p className="text-[#ff2244] text-sm mt-1">{form.formState.errors.paymentScreenshot.message}</p>
              )}
              <p className="text-[#a0a0b0] text-xs mt-2">Upload your bKash/Nagad payment screenshot to an image host and paste the link here.</p>
            </div>

            <div className="bg-[#ff6b00]/10 border border-[#ff6b00]/20 rounded-xl p-4 flex gap-3">
              <Trophy className="w-5 h-5 text-[#ff6b00] shrink-0 mt-0.5" />
              <p className="text-[#a0a0b0] text-sm">
                After submitting, your registration will be reviewed by the admin. You'll be notified once approved. Room details will be shared before the match starts.
              </p>
            </div>

            <button
              type="submit"
              disabled={register.isPending}
              data-testid="button-submit-registration"
              className="w-full py-4 bg-[#ff6b00] text-white font-black uppercase text-lg rounded-xl hover:bg-[#e66000] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-[0_0_20px_rgba(255,107,0,0.3)]"
            >
              {register.isPending ? "Submitting..." : "Submit Registration"}
            </button>
          </form>
        </div>
      </div>
      <Footer />
    </div>
  );
}
