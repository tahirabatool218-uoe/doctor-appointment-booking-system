"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { TOKEN_KEY } from "@/lib/axios";
import { authService } from "@/services";
import type { LoginPayload, RegisterPayload, Role, User } from "@/types";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (p: LoginPayload) => Promise<User>;
  register: (p: RegisterPayload) => Promise<User>;
  logout: () => void;
  setUser: (u: User) => void;
}
const AuthContext = createContext<AuthContextValue | null>(null);

export const homeFor = (role: Role) => (role === "admin" ? "/admin" : role === "doctor" ? "/doctor" : "/patient");

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Registered unconditionally so a 401 after a *later* login also clears the session.
    const onUnauthorized = () => setUserState(null);
    window.addEventListener("auth:unauthorized", onUnauthorized);

    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) setLoading(false);
    else {
      authService.me().then(setUserState)
        .catch((err) => {
          // Only drop the token when the server says it is invalid; keep it on network errors.
          if (err?.response?.status === 401) localStorage.removeItem(TOKEN_KEY);
        })
        .finally(() => setLoading(false));
    }
    return () => window.removeEventListener("auth:unauthorized", onUnauthorized);
  }, []);

  const login = useCallback(async (p: LoginPayload) => {
    const { user, token } = await authService.login(p);
    localStorage.setItem(TOKEN_KEY, token); setUserState(user); return user;
  }, []);
  const register = useCallback(async (p: RegisterPayload) => {
    const { user, token } = await authService.register(p);
    localStorage.setItem(TOKEN_KEY, token); setUserState(user); return user;
  }, []);
  const logout = useCallback(() => { localStorage.removeItem(TOKEN_KEY); setUserState(null); }, []);

  const value = useMemo(() => ({ user, loading, login, register, logout, setUser: setUserState }), [user, loading, login, register, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
