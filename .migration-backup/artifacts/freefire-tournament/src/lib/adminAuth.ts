const STORAGE_KEY = "ff_admin_session";

export interface AdminSession {
  token: string;
  username: string;
  loginAt: number;
}

export function getAdminSession(): AdminSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const session: AdminSession = JSON.parse(raw);
    const twelveHours = 12 * 60 * 60 * 1000;
    if (Date.now() - session.loginAt > twelveHours) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

export function setAdminSession(token: string, username: string): void {
  const session: AdminSession = { token, username, loginAt: Date.now() };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function clearAdminSession(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function isAdminAuthenticated(): boolean {
  return getAdminSession() !== null;
}

export function getAdminToken(): string | null {
  return getAdminSession()?.token ?? null;
}

import { apiBase as BASE } from "@/lib/apiBase";

export function adminFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const token = getAdminToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init.headers as Record<string, string> ?? {}),
  };
  if (token) headers["x-admin-token"] = token;
  return fetch(`${BASE}/api${path}`, { ...init, headers });
}
