import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type Profile = {
  id: string;
  user_id: string;
  nome: string;
  email: string;
  cargo: string | null;
  setor: string | null;
  role: "admin" | "user";
  status: string;
  avatar_url?: string | null;
  created_at?: string;
};

type Ctx = {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  isAdmin: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<Ctx>({
  session: null, user: null, profile: null, loading: true, isAdmin: false,
  refreshProfile: async () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = async (uid: string, currentUser?: User) => {
    const { data, error } = await supabase.from("profiles").select("*").eq("user_id", uid).maybeSingle();
    if (error) {
      console.error("[Auth] Erro ao carregar perfil:", error);
      setProfile(null);
      return;
    }

    if (data) {
      setProfile(data as Profile);
      return;
    }

    // Fallback for users created before the profile trigger was installed.
    if (currentUser) {
      const { data: created, error: createError } = await supabase
        .from("profiles")
        .insert({ user_id: uid, email: currentUser.email ?? "", nome: currentUser.user_metadata?.nome ?? "", role: "user" })
        .select("*")
        .single();
      if (createError) console.error("[Auth] Erro ao criar perfil:", createError);
      setProfile((created as Profile) ?? null);
    }
  };

  useEffect(() => {
    let active = true;
    let initialized = false;
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      if (!active || !initialized) return;
      setSession(s);
      if (s?.user) {
        setTimeout(() => {
          if (active) void loadProfile(s.user.id, s.user);
        }, 0);
      } else {
        setProfile(null);
      }
    });

    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return;
      setSession(data.session);
      if (data.session?.user) await loadProfile(data.session.user.id, data.session.user);
      initialized = true;
      setLoading(false);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const refreshProfile = async () => {
    if (session?.user) await loadProfile(session.user.id, session.user);
  };

  const signOut = async () => {
    setLoading(true);
    if (typeof window !== "undefined") {
      const keys = Object.keys(localStorage).filter((key) =>
        key.startsWith("sb-") || key.startsWith("supabase") || key.includes("auth-token")
      );
      keys.forEach((key) => localStorage.removeItem(key));
    }
    setSession(null);
    setProfile(null);
    try {
      const { error } = await supabase.auth.signOut({ scope: "global" });
      if (error) throw error;
    } catch (error) {
      console.error("[Auth] Erro no logout:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{
      session, user: (session?.user as User) ?? null, profile, loading,
      isAdmin: profile?.role === "admin",
      refreshProfile,
      signOut,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
