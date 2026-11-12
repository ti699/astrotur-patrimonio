import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";
import axios from "axios";
import { api } from "@/services/api";
import { useAuth, type Profile } from "@/hooks/useAuth";
import { appPath } from "@/lib/utils";

type SsoSearch = { ticket?: string };
type SsoResponse = { token: string; user: Profile };

export const Route = createFileRoute("/sso")({
  validateSearch: (search: Record<string, unknown>): SsoSearch => ({
    ticket:
      typeof search.ticket === "string" && search.ticket.trim() ? search.ticket.trim() : undefined,
  }),
  component: SsoReceiver,
});

function clearSession() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
}

function redirectToLogin(message: string) {
  clearSession();
  sessionStorage.setItem("astrotur:sso-error", message);
  window.location.replace(appPath("/login"));
}

function SsoReceiver() {
  const { ticket } = Route.useSearch();
  const { refreshProfile } = useAuth();
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return; // evita dupla execução (StrictMode)
    started.current = true;

    // Remove o ticket da barra de endereço e do histórico (replace, sem nova entrada)
    window.history.replaceState(null, "", appPath("/sso"));

    const finish = async () => {
      if (!ticket) {
        redirectToLogin("O Hub não enviou o ticket de autenticação.");
        return;
      }

      try {
        const { data } = await api.post<SsoResponse>("/auth/sso", { ticket });
        if (!data?.token) throw new Error("Resposta SSO sem token");
        localStorage.setItem("token", data.token);
        if (data.user) localStorage.setItem("user", JSON.stringify(data.user));
        await refreshProfile();
        window.location.replace(appPath("/"));
      } catch (error: unknown) {
        const message =
          axios.isAxiosError<{ message?: string }>(error) && error.response?.data?.message
            ? error.response.data.message
            : "Não foi possível concluir o login pelo Hub. Tente novamente.";
        redirectToLogin(message);
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
