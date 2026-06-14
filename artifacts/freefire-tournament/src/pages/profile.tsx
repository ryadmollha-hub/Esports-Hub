import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import {
  User, Trophy, Wallet, Shield, History, ChevronRight,
  Edit, Save, X, Flame, Star, Target, Swords, Settings,
  Camera, LogOut
} from "lucide-react";
import Navbar from "@/components/Navbar";
import { useAuthContext } from "@/lib/AuthContext";
import { useGetMyProfile, useUpdateMyProfile } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";

type Section = "overview" | "edit";

export default function ProfilePage() {
  const { user: authUser, isLoading, logout, authFetch } = useAuthContext();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [section, setSection] = useState<Section>("overview");
  const [walletBalance, setWalletBalance] = useState<number | null>(null);

  const { data: profile, refetch } = useGetMyProfile();
  const updateProfile = useUpdateMyProfile();
  const prof = profile as any;

  const [pForm, setPForm] = useState({
    username: "", displayName: "", freefireUid: "", freefireNickname: ""
  });

  useEffect(() => {
    if (!isLoading && !authUser) setLocation("/sign-in");
  }, [isLoading, authUser]);

  useEffect(() => {
    if (prof) {
      setPForm({
        username: prof.username ?? "",
        displayName: prof.displayName ?? "",
        freefireUid: prof.freefireUid ?? "",
        freefireNickname: prof.freefireNickname ?? "",
      });
    }
  }, [prof]);

  useEffect(() => {
    if (authUser) {
      authFetch("/wallet/balance").then(async (res) => {
        if (res.ok) {
          const data = await res.json();
          setWalletBalance(data.balance ?? 0);
        }
      }).catch(() => {});
    }
  }, [authUser]);

  const saveProfile = async () => {
    updateProfile.mutate(
      { data: pForm },
      {
        onSuccess: () => {
          toast({ title: "Profile updated successfully!" });
          setSection("overview");
          refetch();
        },
        onError: () => toast({ title: "Failed to update profile", variant: "destructive" }),
      }
    );
  };

  const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

  const handleLogout = () => {
    logout();
    window.location.href = basePath || "/";
  };

  if (isLoading) return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-[#ff6b00] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const displayName = prof?.displayName ?? prof?.username ?? authUser?.username ?? "Player";

  const quickLinks = [
    {
      href: "/wallet", icon: Wallet, label: "Wallet",
      desc: walletBalance !== null ? `৳${Number(walletBalance).toLocaleString()}` : "View balance",
      color: "text-[#00ff88]", iconBg: "bg-[#00ff88]/10 border-[#00ff88]/20"
    },
    {
      href: "/dashboard", icon: Trophy, label: "My Tournaments",
      desc: `${authUser?.tournamentsPlayed ?? 0} played`,
      color: "text-[#ff6b00]", iconBg: "bg-[#ff6b00]/10 border-[#ff6b00]/20"
    },
    {
      href: "/teams/my", icon: Shield, label: "My Team",
      desc: "Manage your squad",
      color: "text-blue-400", iconBg: "bg-blue-400/10 border-blue-400/20"
    },
    {
      href: "/dashboard", icon: History, label: "History",
      desc: "Registration history",
      color: "text-purple-400", iconBg: "bg-purple-400/10 border-purple-400/20"
    },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white pb-24">
      <Navbar />

      <div className="max-w-lg mx-auto px-4 pt-20 pb-6">

        {section === "overview" && (
          <>
            {/* Profile Card */}
            <div className="relative bg-gradient-to-br from-[#12121a] to-[#0d0d16] rounded-3xl border border-[#ff6b00]/20 p-6 mb-4 overflow-hidden">
              <div className="absolute top-0 right-0 w-48 h-48 bg-[#ff6b00]/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
              <div className="relative z-10">
                <div className="flex items-start gap-4">
                  <div className="relative shrink-0">
                    <div className="w-20 h-20 rounded-2xl bg-[#ff6b00]/20 border-2 border-[#ff6b00]/50 flex items-center justify-center">
                      <User className="w-10 h-10 text-[#ff6b00]" />
                    </div>
                    {authUser?.isAdmin && (
                      <div className="absolute -top-1 -right-1 w-6 h-6 bg-[#ff6b00] rounded-full flex items-center justify-center">
                        <Shield className="w-3 h-3 text-white" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h1 className="text-xl font-black text-white truncate">{displayName}</h1>
                    <p className="text-[#a0a0b0] text-sm truncate">{authUser?.email}</p>
                    {prof?.freefireNickname && (
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <Flame className="w-3.5 h-3.5 text-[#ff6b00]" />
                        <span className="text-[#ff6b00] text-sm font-bold">{prof.freefireNickname}</span>
                        <span className="text-[#606070] text-xs font-mono">#{prof.freefireUid}</span>
                      </div>
                    )}
                    {authUser?.isAdmin && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase text-[#ff6b00] bg-[#ff6b00]/10 px-2 py-0.5 rounded-full mt-1 border border-[#ff6b00]/20">
                        <Shield className="w-2.5 h-2.5" /> Admin
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => setSection("edit")}
                    className="w-9 h-9 rounded-xl bg-[#ff6b00]/10 border border-[#ff6b00]/20 flex items-center justify-center text-[#ff6b00] hover:bg-[#ff6b00]/20 transition-colors shrink-0"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-[#ff6b00]/10">
                  {[
                    { label: "Kills", value: prof?.totalKills ?? 0, icon: Target, color: "text-[#ff6b00]" },
                    { label: "Wins", value: prof?.totalWins ?? 0, icon: Star, color: "text-[#ffd700]" },
                    { label: "Played", value: prof?.tournamentsPlayed ?? 0, icon: Swords, color: "text-blue-400" },
                  ].map((stat) => (
                    <div key={stat.label} className="text-center">
                      <stat.icon className={`w-4 h-4 ${stat.color} mx-auto mb-1`} />
                      <div className={`text-xl font-black ${stat.color}`}>{stat.value}</div>
                      <div className="text-[#606070] text-xs uppercase">{stat.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Member Since */}
            <div className="bg-[#12121a] rounded-2xl border border-[#2a2a36] px-4 py-3 mb-4 flex items-center justify-between">
              <span className="text-[#a0a0b0] text-sm">Member Since</span>
              <span className="text-white font-bold text-sm">
                {prof?.createdAt ? new Date(prof.createdAt).toLocaleDateString("en-BD", { day: "numeric", month: "long", year: "numeric" }) : "—"}
              </span>
            </div>

            {/* Quick Links */}
            <div className="space-y-2 mb-4">
              {quickLinks.map((item) => (
                <Link
                  key={item.href + item.label}
                  href={item.href}
                  className="flex items-center gap-3 p-4 bg-[#12121a] rounded-2xl border border-[#2a2a36] hover:border-[#ff6b00]/20 transition-colors group"
                >
                  <div className={`w-11 h-11 rounded-xl border flex items-center justify-center shrink-0 ${item.iconBg}`}>
                    <item.icon className={`w-5 h-5 ${item.color}`} />
                  </div>
                  <div className="flex-1">
                    <div className="text-white font-bold text-sm">{item.label}</div>
                    <div className="text-[#606070] text-xs">{item.desc}</div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#606070] group-hover:text-[#a0a0b0] transition-colors" />
                </Link>
              ))}
            </div>

            {/* Admin Panel link */}
            {authUser?.isAdmin && (
              <Link
                href="/admin"
                className="flex items-center gap-3 p-4 bg-[#ff6b00]/5 rounded-2xl border border-[#ff6b00]/20 mb-2 hover:bg-[#ff6b00]/10 transition-colors group"
              >
                <div className="w-11 h-11 rounded-xl bg-[#ff6b00]/10 flex items-center justify-center shrink-0">
                  <Shield className="w-5 h-5 text-[#ff6b00]" />
                </div>
                <div className="flex-1">
                  <div className="text-[#ff6b00] font-bold text-sm">Admin Panel</div>
                  <div className="text-[#606070] text-xs">Manage tournaments, users & more</div>
                </div>
                <ChevronRight className="w-4 h-4 text-[#ff6b00]/60" />
              </Link>
            )}

            {/* Logout */}
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 py-4 mt-2 rounded-2xl border border-[#ff2244]/20 text-[#ff2244] font-bold uppercase text-sm hover:bg-[#ff2244]/5 transition-colors"
            >
              <LogOut className="w-4 h-4" /> Sign Out
            </button>
          </>
        )}

        {section === "edit" && (
          <div>
            <div className="flex items-center gap-3 mb-6">
              <button
                onClick={() => setSection("overview")}
                className="w-9 h-9 rounded-xl bg-[#12121a] border border-[#2a2a36] flex items-center justify-center text-[#a0a0b0] hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
              <div>
                <h2 className="font-black text-white text-lg">Edit Profile</h2>
                <p className="text-[#a0a0b0] text-xs">Update your information</p>
              </div>
            </div>

            <div className="bg-[#12121a] rounded-3xl border border-[#2a2a36] p-5 space-y-4">
              {[
                { key: "username", label: "Username", placeholder: "your_username" },
                { key: "displayName", label: "Display Name", placeholder: "Your Full Name" },
                { key: "freefireUid", label: "Free Fire UID", placeholder: "123456789" },
                { key: "freefireNickname", label: "FF Nickname", placeholder: "ProPlayer99" },
              ].map(({ key, label, placeholder }) => (
                <div key={key}>
                  <label className="block text-[#a0a0b0] text-xs uppercase tracking-wider mb-2">{label}</label>
                  <input
                    value={pForm[key as keyof typeof pForm]}
                    onChange={(e) => setPForm({ ...pForm, [key]: e.target.value })}
                    placeholder={placeholder}
                    className="w-full bg-[#0d0d16] border border-[#2a2a36] rounded-xl px-4 py-3 text-white placeholder-[#606070] focus:outline-none focus:border-[#ff6b00] transition-colors text-sm"
                  />
                </div>
              ))}

              <div className="pt-2">
                <label className="block text-[#a0a0b0] text-xs uppercase tracking-wider mb-2">Email</label>
                <div className="w-full bg-[#0d0d16]/50 border border-[#2a2a36]/50 rounded-xl px-4 py-3 text-[#606070] text-sm cursor-not-allowed">
                  {authUser?.email}
                </div>
                <p className="text-[#606070] text-xs mt-1">Email cannot be changed</p>
              </div>
            </div>

            <button
              onClick={saveProfile}
              disabled={updateProfile.isPending}
              className="w-full mt-4 flex items-center justify-center gap-2 py-4 bg-[#ff6b00] text-white font-black uppercase rounded-2xl hover:bg-[#e66000] transition-colors disabled:opacity-50 text-sm"
            >
              <Save className="w-4 h-4" />
              {updateProfile.isPending ? "Saving..." : "Save Changes"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
