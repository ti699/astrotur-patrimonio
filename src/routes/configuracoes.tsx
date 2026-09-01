import { createFileRoute } from "@tanstack/react-router";
import { AppLayout, RequireAdmin } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Building2, Users as UsersIcon, Shield, SlidersHorizontal, Database, Download, Plus, CheckCircle2, XCircle } from "lucide-react";
import { exportCSV } from "@/lib/relatorios";

export const Route = createFileRoute("/configuracoes")({ component: ConfigPage });

function ConfigPage() {
  return (
    <AppLayout>
      <RequireAdmin>
        <Config />
      </RequireAdmin>
    </AppLayout>
  );
}

type Settings = {
  id: string;
  company_name: string;
  cnpj: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  logo_url: string | null;
  primary_color: string;
  patrimonio_prefix: string;
  currency: string;
  items_per_page: number;
  dark_mode: boolean;
  website?: string | null;
};

const DEFAULTS = {
  company_name: "Astrotur", primary_color: "#C0392B", patrimonio_prefix: "AST",
  currency: "R$", items_per_page: 20, dark_mode: true,
};

function Config() {
  return (
    <>
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Configurações</h1>
        <p className="text-sm text-muted-foreground">Painel administrativo do sistema</p>
      </div>

      <Tabs defaultValue="empresa" className="w-full">
        <TabsList className="grid grid-cols-2 md:grid-cols-5 h-auto mb-6 bg-card">
          <TabsTrigger value="empresa" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"><Building2 className="h-4 w-4 mr-2" />Empresa</TabsTrigger>
          <TabsTrigger value="usuarios" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"><UsersIcon className="h-4 w-4 mr-2" />Usuários</TabsTrigger>
          <TabsTrigger value="permissoes" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"><Shield className="h-4 w-4 mr-2" />Permissões</TabsTrigger>
          <TabsTrigger value="sistema" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"><SlidersHorizontal className="h-4 w-4 mr-2" />Sistema</TabsTrigger>
          <TabsTrigger value="backup" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"><Database className="h-4 w-4 mr-2" />Backup</TabsTrigger>
        </TabsList>

        <TabsContent value="empresa"><TabEmpresa /></TabsContent>
        <TabsContent value="usuarios"><TabUsuarios /></TabsContent>
        <TabsContent value="permissoes"><TabPermissoes /></TabsContent>
        <TabsContent value="sistema"><TabSistema /></TabsContent>
        <TabsContent value="backup"><TabBackup /></TabsContent>
      </Tabs>
    </>
  );
}

/* ============================ EMPRESA ============================ */
function TabEmpresa() {
  const [s, setS] = useState<Settings | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { (async () => {
    const { data } = await supabase.from("app_settings").select("*").limit(1).maybeSingle();
    setS(data as Settings);
  })(); }, []);

  if (!s) return <div className="text-muted-foreground">Carregando...</div>;

  const save = async () => {
    setSaving(true);
    const { error } = await supabase.from("app_settings").update({
      company_name: s.company_name, cnpj: s.cnpj, email: s.email, phone: s.phone,
      address: s.address, logo_url: s.logo_url, primary_color: s.primary_color,
      website: s.website ?? null,
    }).eq("id", s.id);
    setSaving(false);
    if (error) toast.error(error.message); else toast.success("Dados da empresa atualizados!");
  };

  const upd = (k: keyof Settings) => (v: string) => setS({ ...s, [k]: v });

  return (
    <Card className="p-6 bg-card border-border">
      <h3 className="text-xs uppercase text-primary font-semibold mb-6 tracking-widest">Dados da Empresa</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div><Label>Nome da empresa</Label><Input value={s.company_name} onChange={(e) => upd("company_name")(e.target.value)} /></div>
        <div><Label>CNPJ</Label><Input value={s.cnpj ?? ""} onChange={(e) => upd("cnpj")(e.target.value)} placeholder="00.000.000/0000-00" /></div>
        <div><Label>E-mail</Label><Input type="email" value={s.email ?? ""} onChange={(e) => upd("email")(e.target.value)} /></div>
        <div><Label>Telefone</Label><Input value={s.phone ?? ""} onChange={(e) => upd("phone")(e.target.value)} /></div>
        <div className="md:col-span-2"><Label>Endereço</Label><Input value={s.address ?? ""} onChange={(e) => upd("address")(e.target.value)} /></div>
        <div><Label>Website</Label><Input value={s.website ?? ""} onChange={(e) => upd("website")(e.target.value)} placeholder="https://astrotur.com" /></div>
        <div><Label>URL do Logo</Label><Input value={s.logo_url ?? ""} onChange={(e) => upd("logo_url")(e.target.value)} placeholder="https://..." /></div>
        <div>
          <Label>Cor principal do sistema</Label>
          <div className="flex gap-2 items-center">
            <Input type="color" value={s.primary_color} onChange={(e) => upd("primary_color")(e.target.value)} className="w-16 h-10 p-1" />
            <Input value={s.primary_color} onChange={(e) => upd("primary_color")(e.target.value)} className="flex-1" />
          </div>
        </div>
      </div>
      <Button onClick={save} disabled={saving} className="bg-primary hover:bg-primary/90 mt-6">
        {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Salvar alterações
      </Button>
    </Card>
  );
}

/* ============================ USUÁRIOS ============================ */
type ProfileRow = {
  id: string; user_id: string; nome: string; email: string; cargo: string | null;
  setor: string | null; role: "admin" | "user"; status: string;
};

function TabUsuarios() {
  const [users, setUsers] = useState<ProfileRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<ProfileRow | null>(null);
  const [showNew, setShowNew] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
    setUsers((data as ProfileRow[]) ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const toggleStatus = async (u: ProfileRow) => {
    const next = u.status === "active" ? "inactive" : "active";
    const { error } = await supabase.from("profiles").update({ status: next }).eq("id", u.id);
    if (error) toast.error(error.message); else { toast.success(`Usuário ${next === "active" ? "ativado" : "desativado"}`); load(); }
  };

  const del = async (u: ProfileRow) => {
    const { error } = await supabase.from("profiles").delete().eq("id", u.id);
    if (error) toast.error(error.message); else { toast.success("Usuário removido"); load(); }
  };

  return (
    <Card className="p-6 bg-card border-border">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xs uppercase text-primary font-semibold tracking-widest">Usuários Cadastrados</h3>
        <Button size="sm" onClick={() => setShowNew(true)} className="bg-primary hover:bg-primary/90">
          <Plus className="h-4 w-4 mr-1" />Novo usuário
        </Button>
      </div>

      {loading ? <div className="text-muted-foreground">Carregando...</div> : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead>Cargo</TableHead>
                <TableHead>Setor</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Nenhum usuário cadastrado.</TableCell></TableRow>}
              {users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.nome || "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{u.email}</TableCell>
                  <TableCell>{u.cargo ?? "—"}</TableCell>
                  <TableCell>{u.setor ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant={u.role === "admin" ? "default" : "outline"} className={u.role === "admin" ? "bg-primary" : ""}>
                      {u.role === "admin" ? "Admin" : "Usuário"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {u.status === "active"
                      ? <span className="inline-flex items-center text-emerald-400 text-xs"><CheckCircle2 className="h-3 w-3 mr-1" />Ativo</span>
                      : <span className="inline-flex items-center text-muted-foreground text-xs"><XCircle className="h-3 w-3 mr-1" />Inativo</span>}
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button size="sm" variant="outline" onClick={() => setEditing(u)}>Editar</Button>
                    <Button size="sm" variant="outline" onClick={() => toggleStatus(u)}>
                      {u.status === "active" ? "Desativar" : "Ativar"}
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild><Button size="sm" variant="destructive">Excluir</Button></AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Excluir usuário?</AlertDialogTitle>
                          <AlertDialogDescription>O perfil de {u.email} será removido. O login no sistema permanece até ser revogado pelo administrador da conta.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => del(u)} className="bg-destructive">Excluir</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {editing && <UserEditDialog user={editing} onClose={() => { setEditing(null); load(); }} />}
      {showNew && <NewUserDialog onClose={() => { setShowNew(false); load(); }} />}
    </Card>
  );
}

function UserEditDialog({ user, onClose }: { user: ProfileRow; onClose: () => void }) {
  const [nome, setNome] = useState(user.nome);
  const [cargo, setCargo] = useState(user.cargo ?? "");
  const [setor, setSetor] = useState(user.setor ?? "");
  const [role, setRole] = useState<"admin" | "user">(user.role);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    const { error } = await supabase.from("profiles").update({ nome, cargo, setor, role }).eq("id", user.id);
    setSaving(false);
    if (error) toast.error(error.message); else { toast.success("Usuário atualizado!"); onClose(); }
  };

  return (
    <AlertDialog open onOpenChange={(o) => !o && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader><AlertDialogTitle>Editar usuário</AlertDialogTitle></AlertDialogHeader>
        <div className="space-y-3">
          <div><Label>Nome</Label><Input value={nome} onChange={(e) => setNome(e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Cargo</Label><Input value={cargo} onChange={(e) => setCargo(e.target.value)} /></div>
            <div><Label>Setor</Label><Input value={setor} onChange={(e) => setSetor(e.target.value)} /></div>
          </div>
          <div>
            <Label>Tipo</Label>
            <Select value={role} onValueChange={(v: "admin" | "user") => setRole(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="user">Usuário comum</SelectItem>
                <SelectItem value="admin">Administrador</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={save} disabled={saving} className="bg-primary">
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Salvar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function NewUserDialog({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState({ nome: "", email: "", password: "", cargo: "", setor: "", role: "user" as "admin" | "user" });
  const [saving, setSaving] = useState(false);
  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    if (!form.nome.trim()) return toast.error("Nome é obrigatório");
    if (!/^\S+@\S+\.\S+$/.test(form.email)) return toast.error("E-mail inválido");
    if (form.password.length < 6) return toast.error("Senha mínima 6 caracteres");
    setSaving(true);
    const { error } = await supabase.auth.signUp({
      email: form.email, password: form.password,
      options: { data: { nome: form.nome, cargo: form.cargo, setor: form.setor, role: form.role } },
    });
    setSaving(false);
    if (error) toast.error(error.message);
    else { toast.success("Usuário criado!"); onClose(); }
  };

  return (
    <AlertDialog open onOpenChange={(o) => !o && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader><AlertDialogTitle>Novo usuário</AlertDialogTitle></AlertDialogHeader>
        <div className="space-y-3">
          <div><Label>Nome *</Label><Input value={form.nome} onChange={(e) => set("nome")(e.target.value)} /></div>
          <div><Label>E-mail *</Label><Input type="email" value={form.email} onChange={(e) => set("email")(e.target.value)} /></div>
          <div><Label>Senha provisória *</Label><Input type="password" value={form.password} onChange={(e) => set("password")(e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Cargo</Label><Input value={form.cargo} onChange={(e) => set("cargo")(e.target.value)} /></div>
            <div><Label>Setor</Label><Input value={form.setor} onChange={(e) => set("setor")(e.target.value)} /></div>
          </div>
          <div>
            <Label>Tipo</Label>
            <Select value={form.role} onValueChange={(v: "admin" | "user") => set("role")(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="user">Usuário comum</SelectItem>
                <SelectItem value="admin">Administrador</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={save} disabled={saving} className="bg-primary">
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Criar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/* ============================ PERMISSÕES ============================ */
function TabPermissoes() {
  const items = [
    { label: "Visualizar dashboard", admin: true, user: true },
    { label: "Listar patrimônios", admin: true, user: true },
    { label: "Visualizar detalhes", admin: true, user: true },
    { label: "Gerar relatórios", admin: true, user: true },
    { label: "Cadastrar patrimônios", admin: true, user: false },
    { label: "Editar patrimônios", admin: true, user: false },
    { label: "Excluir patrimônios", admin: true, user: false },
    { label: "Gerenciar setores", admin: true, user: false },
    { label: "Gerenciar responsáveis", admin: true, user: false },
    { label: "Acessar configurações", admin: true, user: false },
    { label: "Gerenciar usuários", admin: true, user: false },
  ];
  return (
    <Card className="p-6 bg-card border-border">
      <h3 className="text-xs uppercase text-primary font-semibold mb-2 tracking-widest">Permissões por tipo de usuário</h3>
      <p className="text-xs text-muted-foreground mb-4">Edição de permissões personalizadas estará disponível em uma próxima versão.</p>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Permissão</TableHead>
            <TableHead className="text-center">Administrador</TableHead>
            <TableHead className="text-center">Usuário comum</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((i) => (
            <TableRow key={i.label}>
              <TableCell>{i.label}</TableCell>
              <TableCell className="text-center">{i.admin ? <CheckCircle2 className="inline h-4 w-4 text-emerald-400" /> : <XCircle className="inline h-4 w-4 text-muted-foreground" />}</TableCell>
              <TableCell className="text-center">{i.user ? <CheckCircle2 className="inline h-4 w-4 text-emerald-400" /> : <XCircle className="inline h-4 w-4 text-muted-foreground" />}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}

/* ============================ SISTEMA ============================ */
function TabSistema() {
  const [s, setS] = useState<Settings | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { (async () => {
    const { data } = await supabase.from("app_settings").select("*").limit(1).maybeSingle();
    setS(data as Settings);
  })(); }, []);

  if (!s) return <div className="text-muted-foreground">Carregando...</div>;

  const save = async () => {
    setSaving(true);
    const { error } = await supabase.from("app_settings").update({
      patrimonio_prefix: s.patrimonio_prefix, currency: s.currency,
      items_per_page: s.items_per_page, dark_mode: s.dark_mode,
    }).eq("id", s.id);
    setSaving(false);
    if (error) toast.error(error.message); else toast.success("Preferências salvas!");
  };

  const restore = async () => {
    const { error } = await supabase.from("app_settings").update(DEFAULTS).eq("id", s.id);
    if (error) toast.error(error.message);
    else { setS({ ...s, ...DEFAULTS }); toast.success("Configurações restauradas!"); }
  };

  return (
    <Card className="p-6 bg-card border-border">
      <h3 className="text-xs uppercase text-primary font-semibold mb-6 tracking-widest">Preferências do Sistema</h3>
      <div className="space-y-5 max-w-xl">
        <div className="flex items-center justify-between p-3 rounded-md bg-muted/30">
          <div>
            <Label className="text-sm">Modo escuro</Label>
            <div className="text-xs text-muted-foreground">Tema padrão da interface</div>
          </div>
          <Switch checked={s.dark_mode} onCheckedChange={(v) => setS({ ...s, dark_mode: v })} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Prefixo do código</Label>
            <Input value={s.patrimonio_prefix} onChange={(e) => setS({ ...s, patrimonio_prefix: e.target.value.toUpperCase() })} maxLength={5} />
            <div className="text-xs text-muted-foreground mt-1">Ex: {s.patrimonio_prefix}-0001</div>
          </div>
          <div>
            <Label>Moeda padrão</Label>
            <Input value={s.currency} onChange={(e) => setS({ ...s, currency: e.target.value })} maxLength={5} />
          </div>
        </div>
        <div>
          <Label>Itens por página</Label>
          <Select value={String(s.items_per_page)} onValueChange={(v) => setS({ ...s, items_per_page: Number(v) })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {[10, 20, 50, 100].map((n) => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2 pt-2">
          <Button onClick={save} disabled={saving} className="bg-primary hover:bg-primary/90">
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Salvar
          </Button>
          <Button onClick={restore} variant="outline">Restaurar padrões</Button>
        </div>
      </div>
    </Card>
  );
}

/* ============================ BACKUP ============================ */
function TabBackup() {
  const [working, setWorking] = useState<string | null>(null);

  const exp = async (table: "patrimonios" | "setores" | "responsaveis", filename: string) => {
    setWorking(table);
    const { data, error } = await supabase.from(table).select("*");
    setWorking(null);
    if (error) return toast.error(error.message);
    if (!data || data.length === 0) return toast.error("Nenhum dado para exportar");
    exportCSV(data, filename);
    toast.success("Arquivo exportado!");
  };

  return (
    <Card className="p-6 bg-card border-border">
      <h3 className="text-xs uppercase text-primary font-semibold mb-2 tracking-widest">Backup e Exportação</h3>
      <p className="text-sm text-muted-foreground mb-6">
        Os dados são salvos automaticamente no banco de dados Lovable Cloud. Exporte cópias em CSV quando desejar.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { key: "patrimonios" as const, label: "Patrimônios", file: "patrimonios.csv" },
          { key: "responsaveis" as const, label: "Responsáveis", file: "responsaveis.csv" },
          { key: "setores" as const, label: "Setores", file: "setores.csv" },
        ].map((b) => (
          <Card key={b.key} className="p-5 bg-muted/20 border-border">
            <div className="flex items-center justify-between mb-3">
              <div className="font-medium">{b.label}</div>
              <Database className="h-4 w-4 text-primary" />
            </div>
            <Button size="sm" className="w-full bg-primary hover:bg-primary/90" disabled={working === b.key} onClick={() => exp(b.key, b.file)}>
              {working === b.key ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Download className="h-4 w-4 mr-2" />}
              Exportar CSV
            </Button>
          </Card>
        ))}
      </div>
    </Card>
  );
}
