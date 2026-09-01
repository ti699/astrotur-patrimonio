import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  ClipboardCheck, Play, CheckCircle2, XCircle, AlertTriangle, Wrench,
  Clock, FileDown, FileSpreadsheet, Filter, X, Loader2,
} from "lucide-react";
import { exportCSV, exportPDF } from "@/lib/relatorios";

export const Route = createFileRoute("/inventario")({ component: InventarioPage });

const STATUS = ["Encontrado", "Não encontrado", "Danificado", "Em manutenção"] as const;
type StatusT = typeof STATUS[number];

const statusMeta: Record<StatusT, { color: string; icon: any }> = {
  "Encontrado":     { color: "bg-green-600",  icon: CheckCircle2 },
  "Não encontrado": { color: "bg-red-600",    icon: XCircle },
  "Danificado":     { color: "bg-orange-600", icon: AlertTriangle },
  "Em manutenção":  { color: "bg-yellow-600", icon: Wrench },
};

function InventarioPage() {
  const [patrimonios, setPatrimonios] = useState<any[]>([]);
  const [setores, setSetores] = useState<any[]>([]);
  const [responsaveis, setResponsaveis] = useState<any[]>([]);
  const [verificacoes, setVerificacoes] = useState<Record<string, any>>({}); // patrimonio_id -> registro da sessão atual
  const [loading, setLoading] = useState(true);
  const [sessaoId, setSessaoId] = useState<string | null>(null);
  const [sessaoIniciadaEm, setSessaoIniciadaEm] = useState<Date | null>(null);

  // Filtros
  const [fSetor, setFSetor] = useState("");
  const [fCategoria, setFCategoria] = useState("");
  const [fResponsavel, setFResponsavel] = useState("");
  const [busca, setBusca] = useState("");

  // Modal de verificação
  const [open, setOpen] = useState(false);
  const [alvo, setAlvo] = useState<any | null>(null);
  const [statusSel, setStatusSel] = useState<StatusT>("Encontrado");
  const [obs, setObs] = useState("");
  const [salvando, setSalvando] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [{ data: p }, { data: s }, { data: r }] = await Promise.all([
        supabase.from("patrimonios").select("id,codigo,nome,categoria,setor_id,responsavel_id,localizacao,setor:setores(nome),responsavel:responsaveis(nome)").order("codigo"),
        supabase.from("setores").select("id,nome").order("nome"),
        supabase.from("responsaveis").select("id,nome").order("nome"),
      ]);
      setPatrimonios(p ?? []);
      setSetores(s ?? []);
      setResponsaveis(r ?? []);

      // Restaura sessão ativa do localStorage
      const saved = localStorage.getItem("inv_sessao");
      if (saved) {
        const parsed = JSON.parse(saved);
        setSessaoId(parsed.id);
        setSessaoIniciadaEm(new Date(parsed.startedAt));
        const { data: v } = await supabase.from("inventarios").select("*").eq("sessao_id", parsed.id);
        const map: Record<string, any> = {};
        (v ?? []).forEach((x: any) => { map[x.patrimonio_id] = x; });
        setVerificacoes(map);
      }
    } catch {
      // falha silenciosa
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const iniciarInventario = () => {
    const id = crypto.randomUUID();
    const startedAt = new Date().toISOString();
    localStorage.setItem("inv_sessao", JSON.stringify({ id, startedAt }));
    setSessaoId(id);
    setSessaoIniciadaEm(new Date(startedAt));
    setVerificacoes({});
    toast.success("Inventário iniciado");
  };

  const encerrarInventario = () => {
    if (!confirm("Encerrar a sessão de inventário atual? O histórico continuará disponível para relatórios.")) return;
    localStorage.removeItem("inv_sessao");
    setSessaoId(null);
    setSessaoIniciadaEm(null);
    setVerificacoes({});
    toast.success("Inventário encerrado");
  };

  const abrirVerificacao = (item: any) => {
    if (!sessaoId) return toast.error("Inicie um inventário antes de verificar itens");
    const existente = verificacoes[item.id];
    setAlvo(item);
    setStatusSel((existente?.status_verificacao as StatusT) ?? "Encontrado");
    setObs(existente?.observacao ?? "");
    setOpen(true);
  };

  const salvarVerificacao = async () => {
    if (!alvo || !sessaoId) return;
    setSalvando(true);
    const { data: { user } } = await supabase.auth.getUser();
    const existente = verificacoes[alvo.id];
    const payload = {
      patrimonio_id: alvo.id,
      status_verificacao: statusSel,
      observacao: obs || null,
      usuario_responsavel: user?.id ?? null,
      sessao_id: sessaoId,
      data_verificacao: new Date().toISOString(),
    };
    let result;
    if (existente) {
      result = await supabase.from("inventarios").update(payload).eq("id", existente.id).select().single();
    } else {
      result = await supabase.from("inventarios").insert(payload).select().single();
    }
    if (result.error) { setSalvando(false); return toast.error(result.error.message); }
    setVerificacoes({ ...verificacoes, [alvo.id]: result.data });
    setSalvando(false);
    setOpen(false);
    toast.success("Verificação registrada");
  };

  const categorias = useMemo(() => Array.from(new Set(patrimonios.map((p) => p.categoria).filter(Boolean))).sort(), [patrimonios]);

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return patrimonios.filter((p) => {
      if (fSetor && p.setor_id !== fSetor) return false;
      if (fCategoria && p.categoria !== fCategoria) return false;
      if (fResponsavel && p.responsavel_id !== fResponsavel) return false;
      if (q && !(p.codigo?.toLowerCase().includes(q) || p.nome?.toLowerCase().includes(q))) return false;
      return true;
    });
  }, [patrimonios, fSetor, fCategoria, fResponsavel, busca]);

  // Dashboard
  const dashboard = useMemo(() => {
    const verificados = filtrados.filter((p) => verificacoes[p.id]);
    const naoEncontrado = verificados.filter((p) => verificacoes[p.id].status_verificacao === "Não encontrado").length;
    const danificado    = verificados.filter((p) => verificacoes[p.id].status_verificacao === "Danificado").length;
    const emManut       = verificados.filter((p) => verificacoes[p.id].status_verificacao === "Em manutenção").length;
    const encontrado    = verificados.filter((p) => verificacoes[p.id].status_verificacao === "Encontrado").length;
    return {
      total: filtrados.length,
      conferidos: verificados.length,
      pendentes: filtrados.length - verificados.length,
      encontrado, naoEncontrado, danificado, emManut,
    };
  }, [filtrados, verificacoes]);

  const limparFiltros = () => { setFSetor(""); setFCategoria(""); setFResponsavel(""); setBusca(""); };
  const temFiltro = !!(fSetor || fCategoria || fResponsavel || busca);

  const linhasParaExportacao = () => filtrados.map((p) => {
    const v = verificacoes[p.id];
    return {
      Codigo: p.codigo,
      Nome: p.nome,
      Categoria: p.categoria,
      Setor: p.setor?.nome ?? "",
      Responsavel: p.responsavel?.nome ?? "",
      Localizacao: p.localizacao ?? "",
      Status: v?.status_verificacao ?? "Pendente",
      Observacao: v?.observacao ?? "",
      DataVerificacao: v?.data_verificacao ? new Date(v.data_verificacao).toLocaleString("pt-BR") : "",
    };
  });

  const exportarCSV = () => {
    const rows = linhasParaExportacao();
    if (rows.length === 0) return toast.error("Sem dados");
    exportCSV(rows, `inventario_${new Date().toISOString().slice(0,10)}.csv`);
  };

  const exportarPDF = () => {
    const rows = linhasParaExportacao();
    if (rows.length === 0) return toast.error("Sem dados");
    const dash = `
      <h2>Resumo do Inventário</h2>
      <table>
        <tr><th>Total</th><td>${dashboard.total}</td><th>Conferidos</th><td>${dashboard.conferidos}</td><th>Pendentes</th><td>${dashboard.pendentes}</td></tr>
        <tr><th>Encontrado</th><td>${dashboard.encontrado}</td><th>Não encontrado</th><td>${dashboard.naoEncontrado}</td><th>Danificado</th><td>${dashboard.danificado}</td></tr>
        <tr><th>Em manutenção</th><td>${dashboard.emManut}</td><th>Sessão</th><td colspan="3">${sessaoIniciadaEm ? sessaoIniciadaEm.toLocaleString("pt-BR") : "—"}</td></tr>
      </table>
      <h2>Itens</h2>
      <table>
        <thead><tr>
          <th>Código</th><th>Nome</th><th>Categoria</th><th>Setor</th>
          <th>Responsável</th><th>Localização</th><th>Status</th><th>Observação</th><th>Data</th>
        </tr></thead>
        <tbody>
          ${rows.map((r) => `<tr>
            <td>${r.Codigo}</td><td>${r.Nome}</td><td>${r.Categoria}</td><td>${r.Setor}</td>
            <td>${r.Responsavel}</td><td>${r.Localizacao}</td><td>${r.Status}</td>
            <td>${r.Observacao}</td><td>${r.DataVerificacao}</td>
          </tr>`).join("")}
        </tbody>
      </table>`;
    exportPDF("Relatório de Inventário Físico", dash);
  };

  return (
    <AppLayout>
      <div className="flex flex-wrap justify-between items-start gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3"><ClipboardCheck className="h-7 w-7 text-primary" />Inventário Físico</h1>
          <p className="text-sm text-muted-foreground">
            {sessaoId ? (
              <>Sessão ativa desde {sessaoIniciadaEm?.toLocaleString("pt-BR")}</>
            ) : (
              <>Inicie um inventário para conferir os patrimônios</>
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={exportarPDF}><FileDown className="h-4 w-4 mr-2" />PDF</Button>
          <Button variant="outline" onClick={exportarCSV}><FileSpreadsheet className="h-4 w-4 mr-2" />Excel/CSV</Button>
          {sessaoId ? (
            <Button variant="destructive" onClick={encerrarInventario}>Encerrar Inventário</Button>
          ) : (
            <Button className="bg-primary hover:bg-primary/90" onClick={iniciarInventario}>
              <Play className="h-4 w-4 mr-2" />Iniciar Inventário
            </Button>
          )}
        </div>
      </div>

      {/* Dashboard */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <DashCard label="Conferidos"     value={dashboard.conferidos}    total={dashboard.total} color="text-green-500"  Icon={CheckCircle2} />
        <DashCard label="Pendentes"      value={dashboard.pendentes}     total={dashboard.total} color="text-zinc-300"   Icon={Clock} />
        <DashCard label="Não encontrado" value={dashboard.naoEncontrado} total={dashboard.total} color="text-red-500"    Icon={XCircle} />
        <DashCard label="Danificado"     value={dashboard.danificado}    total={dashboard.total} color="text-orange-500" Icon={AlertTriangle} />
      </div>

      {/* Filtros */}
      <Card className="p-4 mb-4 bg-card border-border">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold">Filtros</span>
          {temFiltro && (
            <Button size="sm" variant="ghost" className="ml-auto h-7 text-xs" onClick={limparFiltros}>
              <X className="h-3 w-3 mr-1" />Limpar
            </Button>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div><Label className="text-xs">Setor</Label>
            <Select value={fSetor || "all"} onValueChange={(v) => setFSetor(v === "all" ? "" : v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {setores.map((s) => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div><Label className="text-xs">Categoria</Label>
            <Select value={fCategoria || "all"} onValueChange={(v) => setFCategoria(v === "all" ? "" : v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {categorias.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div><Label className="text-xs">Responsável</Label>
            <Select value={fResponsavel || "all"} onValueChange={(v) => setFResponsavel(v === "all" ? "" : v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {responsaveis.map((r) => <SelectItem key={r.id} value={r.id}>{r.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div><Label className="text-xs">Buscar</Label>
            <Input placeholder="Código ou nome" value={busca} onChange={(e) => setBusca(e.target.value)} />
          </div>
        </div>
      </Card>

      {/* Lista */}
      <Card className="p-0 bg-card border-border overflow-hidden">
        {loading ? <div className="p-10 text-center text-muted-foreground">Carregando...</div> : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead><TableHead>Nome</TableHead>
                <TableHead>Categoria</TableHead><TableHead>Setor</TableHead>
                <TableHead>Responsável</TableHead><TableHead>Status</TableHead>
                <TableHead className="text-right">Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtrados.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Nenhum patrimônio</TableCell></TableRow>
              ) : filtrados.map((p) => {
                const v = verificacoes[p.id];
                const status = v?.status_verificacao as StatusT | undefined;
                const Icon = status ? statusMeta[status].icon : Clock;
                return (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-primary text-xs">{p.codigo}</TableCell>
                    <TableCell className="text-sm font-medium">{p.nome}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{p.categoria}</TableCell>
                    <TableCell className="text-xs">{p.setor?.nome ?? "—"}</TableCell>
                    <TableCell className="text-xs">{p.responsavel?.nome ?? "—"}</TableCell>
                    <TableCell>
                      {status ? (
                        <Badge className={`${statusMeta[status].color} text-white border-0 gap-1`}>
                          <Icon className="h-3 w-3" />{status}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="gap-1"><Clock className="h-3 w-3" />Pendente</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant={v ? "outline" : "default"}
                        className={v ? "" : "bg-primary hover:bg-primary/90"}
                        disabled={!sessaoId}
                        onClick={() => abrirVerificacao(p)}>
                        {v ? "Editar" : "Verificar"}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle>Verificar patrimônio</DialogTitle>
          </DialogHeader>
          {alvo && (
            <div className="space-y-3">
              <div className="text-sm">
                <div className="font-mono text-primary">{alvo.codigo}</div>
                <div className="font-medium">{alvo.nome}</div>
                <div className="text-xs text-muted-foreground">
                  {alvo.setor?.nome ?? "—"} · {alvo.responsavel?.nome ?? "—"} · {alvo.localizacao ?? "—"}
                </div>
              </div>
              <div>
                <Label>Status</Label>
                <Select value={statusSel} onValueChange={(v) => setStatusSel(v as StatusT)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Observação</Label>
                <Textarea rows={3} value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Anotações da conferência" />
              </div>
              <Button onClick={salvarVerificacao} disabled={salvando} className="w-full bg-primary hover:bg-primary/90">
                {salvando && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Salvar verificação
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}

function DashCard({ label, value, total, color, Icon }: { label: string; value: number; total: number; color: string; Icon: any }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <Card className="p-4 bg-card border-border">
      <div className="flex items-center justify-between">
        <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
        <Icon className={`h-4 w-4 ${color}`} />
      </div>
      <div className={`text-3xl font-bold mt-2 ${color}`}>{value}</div>
      <div className="text-xs text-muted-foreground mt-1">{pct}% do total</div>
    </Card>
  );
}
