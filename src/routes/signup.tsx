import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/signup")({ component: SignUp });

function SignUp() {
  const router = useRouter();
  const [form, setForm] = useState({
    nome: "", email: "", password: "", confirm: "",
    cargo: "", setor: "", role: "user" as "admin" | "user",
  });
  const [loading, setLoading] = useState(false);
  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nome.trim()) return toast.error("Informe seu nome completo");
    if (!/^\S+@\S+\.\S+$/.test(form.email)) return toast.error("E-mail inválido");
    if (form.password.length < 6) return toast.error("A senha deve ter pelo menos 6 caracteres");
    if (form.password !== form.confirm) return toast.error("As senhas não coincidem");

    setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email: form.email, password: form.password,
        options: {
          data: { nome: form.nome, cargo: form.cargo, setor: form.setor, role: form.role },
          emailRedirectTo: typeof window !== "undefined" ? window.location.origin : undefined,
        },
      });
      if (error) throw error;
      // Tentar login automático (auto-confirm está ativo)
      const { error: e2 } = await supabase.auth.signInWithPassword({ email: form.email, password: form.password });
      if (e2) {
        toast.success("Conta criada! Faça login.");
        router.navigate({ to: "/login" });
      } else {
        toast.success("Conta criada com sucesso!");
        router.navigate({ to: "/" });
      }
    } catch (err: any) {
      const m = err.message ?? "";
      if (m.includes("already registered")) toast.error("Este e-mail já está cadastrado");
      else if (m.includes("Password")) toast.error("Senha não atende aos requisitos mínimos");
      else toast.error(m || "Erro ao criar conta");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-lg p-8 bg-card border-border">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-extrabold tracking-tight">
            <span className="text-primary">ASTRO</span>
            <span className="text-foreground">TUR</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-1 uppercase tracking-widest">Criar conta</p>
        </div>

        <form onSubmit={submit} className="space-y-3">
          <div>
            <Label>Nome completo *</Label>
            <Input value={form.nome} onChange={(e) => set("nome")(e.target.value)} required />
          </div>
          <div>
            <Label>E-mail *</Label>
            <Input type="email" value={form.email} onChange={(e) => set("email")(e.target.value)} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Senha *</Label>
              <Input type="password" value={form.password} onChange={(e) => set("password")(e.target.value)} required minLength={6} />
            </div>
            <div>
              <Label>Confirmar senha *</Label>
              <Input type="password" value={form.confirm} onChange={(e) => set("confirm")(e.target.value)} required minLength={6} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Cargo</Label>
              <Input value={form.cargo} onChange={(e) => set("cargo")(e.target.value)} placeholder="Ex: Analista" />
            </div>
            <div>
              <Label>Setor</Label>
              <Input value={form.setor} onChange={(e) => set("setor")(e.target.value)} placeholder="Ex: TI" />
            </div>
          </div>
          <div>
            <Label>Tipo de usuário</Label>
            <Select value={form.role} onValueChange={(v) => set("role")(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="user">Usuário comum</SelectItem>
                <SelectItem value="admin">Administrador</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button type="submit" disabled={loading} className="w-full bg-primary hover:bg-primary/90 mt-4">
            {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Criar conta
          </Button>
          <Link to="/login" className="block text-center text-sm text-muted-foreground hover:text-foreground">
            Já tem conta? <span className="text-primary">Entrar</span>
          </Link>
        </form>
      </Card>
    </div>
  );
}
