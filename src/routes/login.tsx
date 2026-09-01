import { createFileRoute, useRouter, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Info, Eye, EyeOff, Zap } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

export const Route = createFileRoute("/login")({ component: Login });

const TEST_EMAIL = "admin@astrotur.com";
const TEST_PASS = "admin123";

function Login() {
  const router = useRouter();
  const { session, localLogin } = useAuth();
  const [email, setEmail] = useState(() => (typeof window !== "undefined" ? localStorage.getItem("astrotur:remember-email") ?? "" : ""));
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [remember, setRemember] = useState(() => typeof window !== "undefined" && !!localStorage.getItem("astrotur:remember-email"));

  useEffect(() => {
    if (session) router.navigate({ to: "/" });
  }, [session, router]);

  const doLogin = async (e: string, p: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email: e, password: p });
    if (error) throw error;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await doLogin(email, password);
      if (remember) localStorage.setItem("astrotur:remember-email", email);
      else localStorage.removeItem("astrotur:remember-email");
      toast.success("Bem-vindo!");
    } catch (err: any) {
      toast.error(traduzirErro(err.message));
    } finally {
      setLoading(false);
    }
  };

  const useTestAdmin = async () => {
    setLoading(true);
    try {
      try {
        await doLogin(TEST_EMAIL, TEST_PASS);
        toast.success("Acesso de teste liberado!");
      } catch {
        // Não existe ainda — cria
        const { error } = await supabase.auth.signUp({
          email: TEST_EMAIL,
          password: TEST_PASS,
          options: {
            data: { nome: "Administrador de Teste", cargo: "Administrador", setor: "TI", role: "admin" },
            emailRedirectTo: typeof window !== "undefined" ? window.location.origin : undefined,
          },
        });
        if (error) throw error;
        await doLogin(TEST_EMAIL, TEST_PASS);
        toast.success("Usuário admin criado e autenticado!");
      }
    } catch (err: any) {
      toast.error(traduzirErro(err.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md p-8 bg-card border-border">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold tracking-tight">
            <span className="text-primary">ASTRO</span>
            <span className="text-foreground">TUR</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-1 uppercase tracking-[0.3em]">Patrimônio</p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" />
          </div>
          <div>
            <Label htmlFor="password">Senha</Label>
            <div className="relative">
              <Input id="password" type={showPwd ? "text" : "password"} required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="pr-10" />
              <button type="button" onClick={() => setShowPwd((v) => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" aria-label="Mostrar/ocultar senha">
                {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div className="flex items-center justify-between -mt-1">
            <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
              <Checkbox checked={remember} onCheckedChange={(v) => setRemember(!!v)} />
              Lembrar de mim
            </label>
            <Link to="/forgot-password" className="text-xs text-muted-foreground hover:text-primary">
              Esqueci minha senha
            </Link>
          </div>

          <Button type="submit" disabled={loading} className="w-full bg-primary hover:bg-primary/90">
            {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Entrar
          </Button>

          <Link to="/signup" className="block w-full text-center text-sm text-muted-foreground hover:text-foreground">
            Não tem conta? <span className="text-primary font-medium">Criar uma</span>
          </Link>
        </form>

        <div className="mt-6 rounded-md border border-primary/40 bg-primary/5 p-3">
          <div className="flex items-start gap-2 mb-2">
            <Info className="h-4 w-4 text-primary mt-0.5 shrink-0" />
            <div className="text-xs text-muted-foreground">
              <div className="font-semibold text-foreground mb-1">Usuário de teste</div>
              <div className="font-mono">admin@astrotur.com</div>
              <div className="font-mono">Senha: admin123</div>
            </div>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={useTestAdmin} disabled={loading} className="w-full mb-2">
            Entrar como administrador de teste
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => { localLogin(); router.navigate({ to: "/" }); }}
            className="w-full bg-primary/80 hover:bg-primary gap-2"
          >
            <Zap className="h-3.5 w-3.5" />
            Entrar sem internet (modo local)
          </Button>
        </div>
      </Card>
    </div>
  );
}

function traduzirErro(msg: string) {
  if (!msg) return "Erro ao autenticar";
  if (msg.includes("Invalid login")) return "E-mail ou senha incorretos";
  if (msg.includes("already registered")) return "Este e-mail já está cadastrado";
  if (msg.includes("Password should")) return "A senha deve ter pelo menos 6 caracteres";
  if (msg.includes("Email")) return "E-mail inválido";
  return msg;
}
