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

export const LOCAL_SESSION_KEY = "astrotur:local-session";

const MOCK_PROFILE: Profile = {
  id: "local-admin",
  user_id: "local-admin",
  nome: "Administrador Local",
  email: "admin@astrotur.com",
  cargo: "Administrador",
  setor: "TI",
  role: "admin",
  status: "active",
};

const MOCK_SESSION = {
  user: { id: "local-admin", email: "admin@astrotur.com" },
} as Session;

type Ctx = {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  isAdmin: boolean;
  refreshProfile: () => Promise<void>;
  localLogin: () => void;
};

const AuthContext = createContext<Ctx>({
  session: null, user: null, profile: null, loading: true, isAdmin: false,
  refreshProfile: async () => {},
  localLogin: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const isLocal = () => typeof window !== "undefined" && !!localStorage.getItem(LOCAL_SESSION_KEY);

  const [localMode, setLocalMode] = useState(isLocal);
  const [session, setSession] = useState<Session | null>(() => isLocal() ? MOCK_SESSION : null);
  const [profile, setProfile] = useState<Profile | null>(() => isLocal() ? MOCK_PROFILE : null);
  const [loading, setLoading] = useState(true);

  const localLogin = () => {
    localStorage.setItem(LOCAL_SESSION_KEY, "1");
    setLocalMode(true);
    setSession(MOCK_SESSION);
    setProfile(MOCK_PROFILE);
    setLoading(false);
  };

  const loadProfile = async (uid: string) => {
    const { data } = await supabase.from("profiles").select("*").eq("user_id", uid).maybeSingle();
    setProfile((data as Profile) ?? null);
  };

  useEffect(() => {
    if (localMode) {
      setLoading(false);
      return;
    }

    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      if (s?.user) {
        setTimeout(() => loadProfile(s.user.id), 0);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session?.user) loadProfile(data.session.user.id);
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, [localMode]);

  const refreshProfile = async () => {
    if (localMode) return;
    if (session?.user) await loadProfile(session.user.id);
  };

  return (
    <AuthContext.Provider value={{
      session, user: (session?.user as User) ?? null, profile, loading,
      isAdmin: profile?.role === "admin",
      refreshProfile,
      localLogin,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
