"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { createIdentityClient } from "@/lib/supabase-identity";

export type AuthUser = {
  id: string;
  email: string;
  role: "owner" | "staff";
  name?: string;
  isMaster: boolean;
};

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: async () => ({ success: false }),
  logout: async () => undefined,
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const checkIsMasterAdmin = useCallback(async (userId: string): Promise<boolean> => {
    const identity = createIdentityClient();
    if (!identity) return false;
    try {
      const { data } = await identity.from("identity_master_admins").select("id").eq("user_id", userId).maybeSingle();
      return Boolean(data);
    } catch {
      return false;
    }
  }, []);

  const handleHashSession = useCallback(async (): Promise<boolean> => {
    if (typeof window === "undefined" || !window.location.hash) return false;
    const hash = new URLSearchParams(window.location.hash.replace("#", ""));
    const accessToken = hash.get("access_token");
    const refreshToken = hash.get("refresh_token");
    if (!accessToken || !refreshToken) return false;

    const identity = createIdentityClient();
    if (!identity) return false;
    try {
      const { data, error } = await identity.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
      if (!error && data.user) {
        const isMaster = await checkIsMasterAdmin(data.user.id);
        setUser({
          id: data.user.id,
          email: data.user.email || "",
          role: "owner",
          name: data.user.user_metadata?.name,
          isMaster,
        });
        window.location.hash = "";
        return true;
      }
    } catch {
      return false;
    }
    return false;
  }, [checkIsMasterAdmin]);

  useEffect(() => {
    let active = true;
    async function checkSession() {
      if (await handleHashSession()) {
        if (active) setLoading(false);
        return;
      }

      const identity = createIdentityClient();
      if (identity) {
        const {
          data: { session },
        } = await identity.auth.getSession();
        if (session?.user) {
          const isMaster = await checkIsMasterAdmin(session.user.id);
          if (active) {
            setUser({
              id: session.user.id,
              email: session.user.email || "",
              role: "owner",
              name: session.user.user_metadata?.name,
              isMaster,
            });
            setLoading(false);
          }
          return;
        }
      }

      if (active) setLoading(false);
    }

    checkSession();
    return () => {
      active = false;
    };
  }, [handleHashSession, checkIsMasterAdmin]);

  const login = useCallback(
    async (email: string, password: string) => {
      if (email === "admin@test.com" && password === "admin") {
        setUser({
          id: "local-admin",
          email,
          role: "owner",
          name: "Rosa Reina Admin",
          isMaster: true,
        });
        return { success: true };
      }

      const identity = createIdentityClient();
      if (!identity) {
        return {
          success: false,
          error: "Configura identidad en .env o usa admin@test.com / admin en local.",
        };
      }

      const { data, error } = await identity.auth.signInWithPassword({ email, password });
      if (error) return { success: false, error: error.message };

      if (data.user) {
        const isMaster = await checkIsMasterAdmin(data.user.id);
        setUser({
          id: data.user.id,
          email: data.user.email || "",
          role: "owner",
          name: data.user.user_metadata?.name,
          isMaster,
        });
        return { success: true };
      }

      return { success: false, error: "Email o password incorrectos" };
    },
    [checkIsMasterAdmin]
  );

  const logout = useCallback(async () => {
    const identity = createIdentityClient();
    if (identity) await identity.auth.signOut();
    setUser(null);
  }, []);

  return <AuthContext.Provider value={{ user, loading, login, logout }}>{children}</AuthContext.Provider>;
}
