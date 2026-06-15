import { useEffect, useRef } from "react";

const INACTIVITY_MS = 30 * 60 * 1000;

export function useInactivityLogout(onLogout: () => void, isLoggedIn: boolean) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!isLoggedIn) {
      if (timer.current) clearTimeout(timer.current);
      return;
    }

    const reset = () => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        onLogout();
      }, INACTIVITY_MS);
    };

    const events = ["mousemove", "keydown", "click", "scroll", "touchstart"] as const;
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    reset();

    return () => {
      if (timer.current) clearTimeout(timer.current);
      events.forEach((e) => window.removeEventListener(e, reset));
    };
  }, [isLoggedIn, onLogout]);
}
