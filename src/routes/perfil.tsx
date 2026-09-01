import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, UserCircle } from "lucide-react";

export const Route = createFileRoute("/perfil")({ component: Perfil });

function Perfil() {
  const { profile, user, refreshProfile } = useAuth();
  const [nome, setNome] = useState("");
  const [cargo, setCargo] = useState("");
  const [setor, setSetor] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [pwd, setPwd] = useState("");
  const [saving, setSaving] = useState(false);
  const [savingPwd, setSavingPwd] = useState(false);

  useEffect(() => {
    if (profile) {
      setNome(profile.nome ?? "");
      setCargo(profile.cargo ?? "");
      setSetor(profile.setor ?? "");
      setAvatarUrl(profile.avatar_url ?? "");
    }
  }, [profile]);

  const initials = (nome || user?.email || "?")
    .split(/\s+/).filter(Boolean).slice(0, 2).map((s) => s[0]?.toUpperCase()).join("");

  const save = async () => {
    if (!profile) return;
    if (!nome.trim()) return toast.error("Nome é obrigatório");
    setSaving(true);
    const { error } = await supabase.from("profiles")
      .update({ nome, cargo, setor, avatar_url: avatarUrl || null })
      .eq("id", profile.id);
    setSaving(false);
    if (error) toast.error(error.message);
    else { toast.success("Perfil atualizado!"); await refreshProfile(); }
  };

  const changePwd = async () => {
    if (pwd.length < 6) return toast.error("Mínimo 6 caracteres");
    setSavingPwd(true);
    const { error } = await supabase.auth.updateUser({ password: pwd });
    setSavingPwd(false);
    if (error) toast.error(error.message);
    else { toast.success("Senha alterada!"); setPwd(""); }
  };

  const dataCriacao = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })
    : "—";

  return (
    <AppLayout>
      <div className="mb-6 flex items-center gap-4">
        <div className="h-20 w-20 rounded-full bg-primary/15 text-primary flex items-center justify-center overflow-hidden ring-2 ring-primary/30">
          {avatarUrl ? (
            <img src={avatarUrl} alt={nome} className="h-full w-full object-cover" />
          ) : (
            <span className="text-2xl font-bold">{initials || <UserCircle className="h-10 w-10" />}</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-3xl font-bold truncate">{nome || "Meu Perfil"}</h1>
          <p className="text-sm text-muted-foreground">{user?.email}</p>
        </div>
        {profile && (
          <Badge variant="outline" className="border-primary text-primary">
            {profile.role === "admin" ? "Administrador" : "Usuário"}
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6 bg-card border-border">
          <h3 className="text-xs uppercase text-primary font-semibold mb-4 tracking-widest">Dados Pessoais</h3>
          <div className="space-y-3">
            <div><Label>Nome completo</Label><Input value={nome} onChange={(e) => setNome(e.target.value)} /></div>
            <div><Label>Cargo</Label><Input value={cargo} onChange={(e) => setCargo(e.target.value)} /></div>
            <div><Label>Setor</Label><Input value={setor} onChange={(e) => setSetor(e.target.value)} /></div>
            <div><Label>URL do avatar</Label><Input value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} placeholder="https://..." /></div>
            <Button onClick={save} disabled={saving} className="bg-primary hover:bg-primary/90 mt-2">
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Salvar alterações
            </Button>
          </div>
        </Card>

        <Card className="p-6 bg-card border-border">
          <h3 className="text-xs uppercase text-primary font-semibold mb-4 tracking-widest">Alterar Senha</h3>
          <div className="space-y-3">
            <div><Label>Nova senha</Label><Input type="password" value={pwd} onChange={(e) => setPwd(e.target.value)} placeholder="Mínimo 6 caracteres" /></div>
            <Button onClick={changePwd} disabled={savingPwd} className="bg-primary hover:bg-primary/90">
              {savingPwd && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Atualizar senha
            </Button>
          </div>

          <div className="mt-8 pt-6 border-t border-border">
            <h3 className="text-xs uppercase text-primary font-semibold mb-3 tracking-widest">Informações da Conta</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">E-mail</span><span>{user?.email}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Tipo</span><span>{profile?.role === "admin" ? "Administrador" : "Usuário comum"}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Status</span><span className="text-emerald-400">{profile?.status ?? "—"}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Membro desde</span><span>{dataCriacao}</span></div>
            </div>
          </div>
        </Card>
      </div>
    </AppLayout>
  );
}
