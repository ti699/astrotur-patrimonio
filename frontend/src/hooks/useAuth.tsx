import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api } from "@/services/api";

export type Profile = {
  id: string;
  nome: string;
  email: string;
  cargo?: string | null;
  setor?: string | null;
  role: "admin" | "user";
  status?: string;
  avatar_url?: string | null;
};

type Ctx = {
  session: boolean;
  user: Profile | null;
  profile: Profile | null;
  loading: boolean;
  isAdmin: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<Ctx>({
  session: false,
  user: null,
  profile: null,
  loading: true,
  isAdmin: false,
  refreshProfile: async () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = async () => {
    // Proteção contra SSR
    if (typeof window === "undefined") {
      setLoading(false);
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      setProfile(null);
      setLoading(false);
      return;
    }

    try {
      // Tenta buscar os dados do utilizador atualizados na API
      const response = await api.get("/auth/me");
      setProfile(response.data);
      localStorage.setItem("user", JSON.stringify(response.data));
    } catch (error) {
      // Fallback: se a API falhar offline, lê do localStorage
      const cachedUser = localStorage.getItem("user");
      if (cachedUser) {
        try {
          setProfile(JSON.parse(cachedUser));
        } catch {
          setProfile(null);
        }
      } else {
        setProfile(null);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadProfile();
  }, []);

  const refreshProfile = async () => {
    await loadProfile();
  };

  const signOut = async () => {
    if (typeof window === "undefined") return;

    setLoading(true);
    try {
      await api.post("/auth/logout");
    } catch {
      // segue com o logout local mesmo se a API falhar
    }
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setProfile(null);
    setLoading(false);
    window.location.href = "/login";
  };

  // Checagem segura de localStorage no browser/SSR
  const hasToken = typeof window !== "undefined" ? !!localStorage.getItem("token") : false;
  const hasSession = !!profile || hasToken;

  return (
    <AuthContext.Provider
      value={{
        session: hasSession,
        user: profile,
        profile,
        loading,
        isAdmin: profile?.role === "admin",
        refreshProfile,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);