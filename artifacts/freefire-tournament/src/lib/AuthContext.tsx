import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { setAuthTokenGetter } from "@workspace/api-client-react";

const TOKEN_KEY = "ff_auth_token";
const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export interface AuthUser {
  id: number;
  userId: string;
  email: string;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  isAdmin: boolean;
  isBanned: boolean;
  freefireUid: string | null;
  freefireNickname: string | null;
  totalKills: number;
  totalWins: number;
  tournamentsPlayed: number;
  createdAt: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  register: (email: string, password: string, username: string) => Promise<void>;
  authFetch: (path: string, init?: RequestInit) => Promise<Response>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

async function safeJson(res: Response): Promise<any> {
  const text = await res.text();
  if (!text || text.trim() === "") return {};
  try { return JSON.parse(text); } catch { return {}; }
}

function getStoredToken(): string | null {
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
}

function storeToken(token: string): void {
  try { localStorage.setItem(TOKEN_KEY, token); } catch {}
}

function removeToken(): void {
  try { localStorage.removeItem(TOKEN_KEY); } catch {}
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const authFetch = useCallback((path: string, init: RequestInit = {}): Promise<Response> => {
    const token = getStoredToken();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(init.headers as Record<string, string> ?? {}),
    };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    return fetch(`${BASE}/api${path}`, { ...init, headers });
  }, []);

  const fetchMe = useCallback(async () => {
    const token = getStoredToken();
    if (!token) { setIsLoading(false); return; }
    try {
      const res = await authFetch("/auth/me");
      if (res.ok) {
        const data = await res.json();
        setUser({ ...data, userId: data.clerkId });
      } else {
        removeToken();
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, [authFetch]);

  useEffect(() => {
    setAuthTokenGetter(getStoredToken);
    fetchMe();
  }, [fetchMe]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await fetch(`${BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await safeJson(res);
    if (!res.ok) throw new Error(data?.message ?? data?.error ?? "Login failed");
    storeToken(data.token);
    setUser({ ...data.user, userId: data.user.clerkId });
  }, []);

  const register = useCallback(async (email: string, password: string, username: string) => {
    const res = await fetch(`${BASE}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, username }),
    });
    const data = await safeJson(res);
    if (!res.ok) throw new Error(data?.message ?? data?.error ?? "Registration failed");
    storeToken(data.token);
    setUser({ ...data.user, userId: data.user.clerkId });
  }, []);

  const logout = useCallback(() => {
    removeToken();
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    await fetchMe();
  }, [fetchMe]);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, register, authFetch, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuthContext must be used inside AuthProvider");
  return ctx;
}

export function useAuth() {
  const { user, isLoading } = useAuthContext();
  return {
    isSignedIn: !!user && !user.isBanned,
    isLoaded: !isLoading,
    userId: user?.userId ?? null,
  };
}

export function useUser() {
  const { user } = useAuthContext();
  return { user };
}
