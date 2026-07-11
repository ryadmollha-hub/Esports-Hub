import { useState, useEffect } from "react";

import { apiBase as BASE } from "@/lib/apiBase";
const POLL_INTERVAL = 30_000;
const FETCH_TIMEOUT_MS = 4_000;

export function useMaintenanceMode() {
  const [maintenance, setMaintenance] = useState<boolean>(false);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
      try {
        const res = await fetch(`${BASE}/api/settings/maintenance`, {
          signal: controller.signal,
        });
        clearTimeout(timer);
        if (cancelled) return;
        if (!res.ok) { setMaintenance(false); return; }
        const data = await res.json();
        setMaintenance(!!data.maintenance);
      } catch {
        clearTimeout(timer);
        if (!cancelled) setMaintenance(false);
      }
    }

    check();
    const interval = setInterval(check, POLL_INTERVAL);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  return maintenance;
}
