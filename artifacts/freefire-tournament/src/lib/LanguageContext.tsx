import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

export type Lang = "en" | "bn";

export const translations = {
  en: {
    // Nav
    nav_tournaments: "Tournaments",
    nav_leaderboard: "Leaderboard",
    nav_schedule: "Schedule",
    nav_results: "Results",
    nav_prizes: "Prizes",
    nav_teams: "Teams",
    nav_support: "Support",
    nav_contact: "Contact",
    nav_signin: "Sign In",
    nav_register: "Register",
    nav_profile: "Profile",
    nav_admin: "Admin",

    // Tournament Card
    tc_join: "Join Now",
    tc_view: "View Details",
    tc_results: "View Results",
    tc_entry: "Entry",
    tc_prize: "Prize Pool",
    tc_slots: "Slots",
    tc_free: "FREE",
    tc_per_kill: "/kill",
    tc_loading: "Loading results…",
    tc_no_results: "No results published yet.",
    tc_match: "Match",
    tc_rank: "Rank",
    tc_player: "Player",
    tc_kills: "Kills",
    tc_points: "Points",
    tc_full: "Full",
    tc_registered: "Registered",

    // Dashboard
    dash_title: "Dashboard",
    dash_profile: "Profile",
    dash_tournaments: "My Tournaments",
    dash_team: "Team",
    dash_deposits: "Deposits",
    dash_withdrawals: "Withdrawals",
    dash_edit: "Edit Profile",
    dash_save: "Save",
    dash_cancel: "Cancel",
    dash_username: "Username",
    dash_display_name: "Display Name",
    dash_ff_uid: "Free Fire UID",
    dash_ff_nick: "Free Fire Nickname",
    dash_email: "Email",
    dash_no_tournaments: "No tournament registrations yet.",
    dash_no_team: "You have not joined a team yet.",
    dash_status_approved: "Approved",
    dash_status_rejected: "Rejected",
    dash_status_pending: "Pending",

    // Wallet
    wallet_title: "Wallet",
    wallet_balance: "Available Balance",
    wallet_deposit: "Deposit",
    wallet_withdraw: "Withdraw",
    wallet_history: "Transaction History",
    wallet_amount: "Amount",
    wallet_method: "Method",
    wallet_tx_id: "Transaction ID",
    wallet_account: "Account Number",
    wallet_submit: "Submit",
    wallet_close: "Close",
    wallet_all: "All",
    wallet_pending: "Pending",
    wallet_approved: "Approved",
    wallet_rejected: "Rejected",
    wallet_no_txs: "No transactions found.",
    wallet_total_deposit: "Total Deposited",
    wallet_total_withdraw: "Total Withdrawn",
    wallet_entry_fees: "Entry Fees",
    wallet_prizes: "Prize Winnings",

    // Signup / Auth
    signup_title: "Create Account",
    signup_subtitle: "Join the Free Fire tournament community",
    signup_email: "Email Address",
    signup_username: "Username",
    signup_password: "Password",
    signup_confirm: "Confirm Password",
    signup_btn: "Create Account",
    signup_have_account: "Already have an account?",
    signup_signin: "Sign in",
    req_letters: "Must contain letters (a–z)",
    req_numbers: "Must contain numbers (0–9)",
    req_match: "Passwords match",

    // Common
    loading: "Loading…",
    error: "Error",
    save: "Save",
    cancel: "Cancel",
    close: "Close",
    refresh: "Refresh",
  },
  bn: {
    // Nav
    nav_tournaments: "টুর্নামেন্ট",
    nav_leaderboard: "লিডারবোর্ড",
    nav_schedule: "সময়সূচি",
    nav_results: "ফলাফল",
    nav_prizes: "পুরস্কার",
    nav_teams: "দল",
    nav_support: "সহায়তা",
    nav_contact: "যোগাযোগ",
    nav_signin: "লগ ইন",
    nav_register: "নিবন্ধন",
    nav_profile: "প্রোফাইল",
    nav_admin: "অ্যাডমিন",

    // Tournament Card
    tc_join: "যোগ দিন",
    tc_view: "বিস্তারিত দেখুন",
    tc_results: "ফলাফল দেখুন",
    tc_entry: "প্রবেশ মূল্য",
    tc_prize: "পুরস্কার পুল",
    tc_slots: "আসন",
    tc_free: "বিনামূল্যে",
    tc_per_kill: "/কিল",
    tc_loading: "ফলাফল লোড হচ্ছে…",
    tc_no_results: "এখনো কোনো ফলাফল প্রকাশিত হয়নি।",
    tc_match: "ম্যাচ",
    tc_rank: "র‍্যাঙ্ক",
    tc_player: "খেলোয়াড়",
    tc_kills: "কিল",
    tc_points: "পয়েন্ট",
    tc_full: "পূর্ণ",
    tc_registered: "নিবন্ধিত",

    // Dashboard
    dash_title: "ড্যাশবোর্ড",
    dash_profile: "প্রোফাইল",
    dash_tournaments: "আমার টুর্নামেন্ট",
    dash_team: "দল",
    dash_deposits: "ডিপোজিট",
    dash_withdrawals: "উত্তোলন",
    dash_edit: "প্রোফাইল সম্পাদনা",
    dash_save: "সংরক্ষণ",
    dash_cancel: "বাতিল",
    dash_username: "ইউজারনেম",
    dash_display_name: "প্রদর্শন নাম",
    dash_ff_uid: "ফ্রি ফায়ার UID",
    dash_ff_nick: "ফ্রি ফায়ার নিকনেম",
    dash_email: "ইমেইল",
    dash_no_tournaments: "এখনো কোনো টুর্নামেন্ট নিবন্ধন নেই।",
    dash_no_team: "আপনি এখনো কোনো দলে যোগ দেননি।",
    dash_status_approved: "অনুমোদিত",
    dash_status_rejected: "প্রত্যাখ্যাত",
    dash_status_pending: "অপেক্ষমাণ",

    // Wallet
    wallet_title: "ওয়ালেট",
    wallet_balance: "উপলব্ধ ব্যালেন্স",
    wallet_deposit: "ডিপোজিট",
    wallet_withdraw: "উত্তোলন",
    wallet_history: "লেনদেনের ইতিহাস",
    wallet_amount: "পরিমাণ",
    wallet_method: "পদ্ধতি",
    wallet_tx_id: "ট্রানজেকশন আইডি",
    wallet_account: "অ্যাকাউন্ট নম্বর",
    wallet_submit: "জমা দিন",
    wallet_close: "বন্ধ করুন",
    wallet_all: "সকল",
    wallet_pending: "অপেক্ষমাণ",
    wallet_approved: "অনুমোদিত",
    wallet_rejected: "প্রত্যাখ্যাত",
    wallet_no_txs: "কোনো লেনদেন পাওয়া যায়নি।",
    wallet_total_deposit: "মোট ডিপোজিট",
    wallet_total_withdraw: "মোট উত্তোলন",
    wallet_entry_fees: "প্রবেশ মূল্য",
    wallet_prizes: "পুরস্কার জয়",

    // Signup / Auth
    signup_title: "অ্যাকাউন্ট তৈরি করুন",
    signup_subtitle: "ফ্রি ফায়ার টুর্নামেন্ট কমিউনিটিতে যোগ দিন",
    signup_email: "ইমেইল ঠিকানা",
    signup_username: "ইউজারনেম",
    signup_password: "পাসওয়ার্ড",
    signup_confirm: "পাসওয়ার্ড নিশ্চিত করুন",
    signup_btn: "অ্যাকাউন্ট তৈরি করুন",
    signup_have_account: "ইতিমধ্যে একটি অ্যাকাউন্ট আছে?",
    signup_signin: "লগ ইন করুন",
    req_letters: "অক্ষর থাকতে হবে (a–z)",
    req_numbers: "সংখ্যা থাকতে হবে (0–9)",
    req_match: "পাসওয়ার্ড মিলছে",

    // Common
    loading: "লোড হচ্ছে…",
    error: "ত্রুটি",
    save: "সংরক্ষণ",
    cancel: "বাতিল",
    close: "বন্ধ করুন",
    refresh: "রিফ্রেশ",
  },
} satisfies Record<Lang, Record<string, string>>;

export type TranslationKey = keyof typeof translations.en;

interface LanguageContextValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: TranslationKey) => string;
}

const LanguageContext = createContext<LanguageContextValue>({
  lang: "en",
  setLang: () => {},
  t: (k) => translations.en[k],
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    try { return (localStorage.getItem("ff_lang") as Lang) ?? "en"; } catch { return "en"; }
  });

  const setLang = (l: Lang) => {
    setLangState(l);
    try { localStorage.setItem("ff_lang", l); } catch {}
  };

  const t = (key: TranslationKey): string => translations[lang][key] ?? translations.en[key] ?? key;

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
