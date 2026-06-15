import { useState, useEffect } from "react";
import { Download, X, Flame } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function PwaInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    const dismissed = sessionStorage.getItem("pwa_banner_dismissed");
    if (dismissed) return;

    const isPWA = window.matchMedia("(display-mode: standalone)").matches || (window.navigator as any).standalone;
    if (isPWA) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowBanner(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    setInstalling(true);
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setShowBanner(false);
    }
    setInstalling(false);
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowBanner(false);
    sessionStorage.setItem("pwa_banner_dismissed", "1");
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-40 max-w-sm mx-auto">
      <div className="bg-[#12121a] border border-[#ff6b00]/40 rounded-2xl p-4 shadow-2xl flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#ff6b00] flex items-center justify-center shrink-0">
          <Flame className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-black text-white text-sm">Install FF Arena</div>
          <div className="text-[#a0a0b0] text-xs mt-0.5">Add to home screen for the best experience</div>
        </div>
        <button
          onClick={handleInstall}
          disabled={installing}
          className="px-3 py-1.5 bg-[#ff6b00] text-white text-xs font-black uppercase rounded-lg hover:bg-[#e66000] transition-colors disabled:opacity-50 shrink-0"
        >
          {installing ? "..." : <Download className="w-4 h-4" />}
        </button>
        <button onClick={handleDismiss} className="text-[#a0a0b0] hover:text-white shrink-0">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
