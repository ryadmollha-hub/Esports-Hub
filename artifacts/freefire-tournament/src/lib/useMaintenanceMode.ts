import { useState, useEffect } from "react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const POLL_INTERVAL = 30_000;

export function useMaintenanceMode() {
  const [maintenance, setMaintenance] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      try {
        const res = await fetch(`${BASE}/api/settings/maintenance`);
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setMaintenance(!!data.maintenance);
      } catch {
        if (!cancelled) setMaintenance(false);
      }
    }

    check();
    const interval = setInterval(check, POLL_INTERVAL);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  return maintenance;
}
