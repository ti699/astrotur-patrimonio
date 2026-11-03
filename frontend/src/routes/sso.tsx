import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";
import { api } from "@/services/api";
import { useAuth, type Profile } from "@/hooks/useAuth";

type SsoSearch = { ticket?: string };
type SsoResponse = { token: string; user: Profile };

export const Route = createFileRoute("/sso")({
  validateSearch: (search: Record<string, unknown>): SsoSearch => ({
    ticket: typeof search.ticket === "string" && search.ticket.trim() ? search.ticket.trim() : undefined,
  }),
  component: SsoReceiver,
});

function clearSession() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
}

function SsoReceiver() {
  const { ticket } = Route.useSearch();
  const { refreshProfile } = useAuth();
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return; // evita dupla execução (StrictMode)
    started.current = true;

    // Remove o ticket da barra de endereço e do histórico (replace, sem nova entrada)
    window.history.replaceState(null, "", "/sso");

    const finish = async () => {
      if (!ticket) {
        clearSession();
        window.location.replace("/login");
        return;
      }

      try {
        const { data } = await api.post<SsoResponse>("/auth/sso", { ticket });
        if (!data?.token) throw new Error("Resposta SSO sem token");
        localStorage.setItem("token", data.token);
        if (data.user) localStorage.setItem("user", JSON.stringify(data.user));
        await refreshProfile();
        window.location.replace("/");
      } catch {
        clearSession();
        window.location.replace("/login");
      }
    };

    void finish();
  }, [ticket, refreshProfile]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin" aria-label="Autenticando..." />
    </div>
  );
}
