import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { appPath } from "@/lib/utils";
import { ArrowRight, Loader2 } from "lucide-react";

export const Route = createFileRoute("/login")({ component: Login });

function getSsoErrorMessage(message: string) {
  const normalized = message.toLowerCase();
  if (normalized.includes("ticket") || normalized.includes("expir")) {
    return "O acesso expirou ou não pôde ser validado. Entre novamente pelo Astrotur Hub.";
  }
  if (normalized.includes("desativ") || normalized.includes("permiss")) {
    return "Sua conta não tem permissão para acessar o Patrimônio. Solicite acesso ao administrador.";
  }
  if (normalized.includes("indisponível") || normalized.includes("indisponivel")) {
    return "O Astrotur Hub está temporariamente indisponível. Tente novamente em instantes.";
  }
  return "Não foi possível concluir o acesso corporativo. Tente novamente pelo Astrotur Hub.";
}

function Login() {
  const router = useRouter();
  const { session } = useAuth();
  const [ssoError, setSsoError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (session) {
      void router.navigate({ to: "/" });
      return;
    }

    const storedError = sessionStorage.getItem("astrotur:sso-error");
    if (storedError) {
      sessionStorage.removeItem("astrotur:sso-error");
      setSsoError(getSsoErrorMessage(storedError));
    }
  }, [session, router]);

  const loginWithHub = () => {
    const hubUrl = import.meta.env.VITE_HUB_URL?.trim();
    const hubSsoUrl = import.meta.env.VITE_HUB_SSO_URL?.trim();
    const hubLoginPath = import.meta.env.VITE_HUB_LOGIN_PATH?.trim() || "/login";
    if (!hubUrl && !hubSsoUrl) {
      setSsoError("O endereço do Astrotur Hub não está configurado. Contate o administrador.");
      return;
    }

    let destination: URL;
    try {
      destination = hubSsoUrl
        ? new URL(hubSsoUrl)
        : new URL(hubLoginPath, (hubUrl ?? "").endsWith("/") ? hubUrl ?? "" : `${hubUrl ?? ""}/`);
      const callbackUrl = new URL(appPath("/sso/callback"), window.location.origin).toString();
      destination.searchParams.set("redirect_uri", callbackUrl);
    } catch (error) {
      console.error("URL do Astrotur Hub inválida:", error);
      setSsoError("Não foi possível iniciar o acesso pelo Astrotur Hub. Contate o administrador.");
      return;
    }

    setLoading(true);
    window.location.assign(destination.toString());
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md border-border bg-card p-8">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-extrabold tracking-tight">
            <span className="text-primary">ASTRO</span>
            <span className="text-foreground">TUR</span>
          </h1>
          <p className="mt-1 text-xs uppercase tracking-[0.3em] text-muted-foreground">Patrimônio</p>
        </div>

        <div className="space-y-5 text-center">
          <div>
            <h2 className="text-lg font-semibold">Acesso corporativo</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Entre com sua conta corporativa pelo Astrotur Hub.
            </p>
          </div>

          {ssoError && (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-left text-sm text-destructive" role="alert">
              {ssoError}
            </div>
          )}

          <Button
            type="button"
            onClick={loginWithHub}
            disabled={loading}
            className="w-full bg-primary hover:bg-primary/90"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
            Entrar com Astrotur Hub
          </Button>

          <p className="text-xs text-muted-foreground">
            A autenticação é realizada de forma segura pelo sistema corporativo.
          </p>
        </div>
      </Card>
    </main>
  );
}
