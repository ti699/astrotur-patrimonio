import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ArrowRightLeft, Plus, Loader2, Filter, X } from "lucide-react";

export const Route = createFileRoute("/movimentacoes")({ component: MovPage });

function MovPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [patrimonios, setPatrimonios] = useState<any[]>([]);
  const [setores, setSetores] = useState<any[]>([]);
  const [responsaveis, setResponsaveis] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<any>({ patrimonio_id: "", setor_destino_id: "", responsavel_destino_id: "", localizacao_destino: "", motivo: "", observacoes: "" });

  // Filtros
  const [fPatrimonio, setFPatrimonio] = useState<string>("");
  const [fResponsavel, setFResponsavel] = useState<string>("");
  const [fSetor, setFSetor] = useState<string>("");
  const [fDataIni, setFDataIni] = useState<string>("");
  const [fDataFim, setFDataFim] = useState<string>("");

  const load = async () => {
    setLoading(true);
    try {
      const [{ data: m }, { data: p }, { data: s }, { data: r }] = await Promise.all([
        supabase.from("movimentacoes").select("*, patrimonios(codigo,nome), origem:setor_origem_id(nome), destino:setor_destino_id(nome), resp_origem:responsavel_origem_id(nome), resp_destino:responsavel_destino_id(nome)").order("data_movimentacao", { ascending: false }),
        supabase.from("patrimonios").select("id,codigo,nome,setor_id,responsavel_id,localizacao").order("codigo"),
        supabase.from("setores").select("id,nome").order("nome"),
        supabase.from("responsaveis").select("id,nome").order("nome"),
      ]);
      setRows(m ?? []); setPatrimonios(p ?? []); setSetores(s ?? []); setResponsaveis(r ?? []);
    } catch {
      // falha silenciosa
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const filtradas = useMemo(() => {
    return rows.filter((m) => {
      if (fPatrimonio && m.patrimonio_id !== fPatrimonio) return false;
      if (fResponsavel && m.responsavel_origem_id !== fResponsavel && m.responsavel_destino_id !== fResponsavel) return false;
      if (fSetor && m.setor_origem_id !== fSetor && m.setor_destino_id !== fSetor) return false;
      if (fDataIni && new Date(m.data_movimentacao) < new Date(fDataIni)) return false;
      if (fDataFim && new Date(m.data_movimentacao) > new Date(fDataFim + "T23:59:59")) return false;
      return true;
    });
  }, [rows, fPatrimonio, fResponsavel, fSetor, fDataIni, fDataFim]);

  const limparFiltros = () => { setFPatrimonio(""); setFResponsavel(""); setFSetor(""); setFDataIni(""); setFDataFim(""); };
  const temFiltro = !!(fPatrimonio || fResponsavel || fSetor || fDataIni || fDataFim);

  const save = async () => {
    if (!form.patrimonio_id) return toast.error("Selecione o patrimônio");
    setSaving(true);
    const pat = patrimonios.find((p) => p.id === form.patrimonio_id);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("movimentacoes").insert({
      patrimonio_id: form.patrimonio_id,
      setor_origem_id: pat?.setor_id ?? null,
      setor_destino_id: form.setor_destino_id || null,
      responsavel_origem_id: pat?.responsavel_id ?? null,
      responsavel_destino_id: form.responsavel_destino_id || null,
      localizacao_origem: pat?.localizacao ?? null,
      localizacao_destino: form.localizacao_destino || null,
      motivo: form.motivo || null,
      observacoes: form.observacoes || null,
      usuario_id: user?.id,
    });
    if (error) { setSaving(false); return toast.error(error.message); }
    await supabase.from("patrimonios").update({
      setor_id: form.setor_destino_id || pat?.setor_id,
      responsavel_id: form.responsavel_destino_id || pat?.responsavel_id,
      localizacao: form.localizacao_destino || pat?.localizacao,
    }).eq("id", form.patrimonio_id);
    setSaving(false);
    setOpen(false);
    toast.success("Movimentação registrada");
    setForm({ patrimonio_id: "", setor_destino_id: "", responsavel_destino_id: "", localizacao_destino: "", motivo: "", observacoes: "" });
    load();
  };

  return (
    <AppLayout>
      <div className="flex justify-between items-center mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3"><ArrowRightLeft className="h-7 w-7 text-primary" />Movimentações</h1>
          <p className="text-sm text-muted-foreground">Histórico de transferências de patrimônios entre setores, responsáveis e localizações</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90"><Plus className="h-4 w-4 mr-2" />Nova movimentação</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl bg-card border-border">
            <DialogHeader><DialogTitle>Registrar movimentação</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Patrimônio *</Label>
                <Select value={form.patrimonio_id} onValueChange={(v) => setForm({ ...form, patrimonio_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{patrimonios.map((p) => <SelectItem key={p.id} value={p.id}>{p.codigo} — {p.nome}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Novo setor</Label>
                  <Select value={form.setor_destino_id} onValueChange={(v) => setForm({ ...form, setor_destino_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>{setores.map((s) => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Novo responsável</Label>
                  <Select value={form.responsavel_destino_id} onValueChange={(v) => setForm({ ...form, responsavel_destino_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>{responsaveis.map((r) => <SelectItem key={r.id} value={r.id}>{r.nome}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div><Label>Nova localização</Label><Input value={form.localizacao_destino} onChange={(e) => setForm({ ...form, localizacao_destino: e.target.value })} /></div>
              <div><Label>Motivo</Label><Input value={form.motivo} onChange={(e) => setForm({ ...form, motivo: e.target.value })} placeholder="Ex: Realocação, empréstimo, devolução" /></div>
              <div><Label>Observações</Label><Textarea value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} rows={2} /></div>
              <Button onClick={save} disabled={saving} className="w-full bg-primary hover:bg-primary/90">
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Registrar
              </Button>
            </div>
          </DialogContent>
        </Dialog>
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
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <div><Label className="text-xs">Patrimônio</Label>
            <Select value={fPatrimonio || "all"} onValueChange={(v) => setFPatrimonio(v === "all" ? "" : v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {patrimonios.map((p) => <SelectItem key={p.id} value={p.id}>{p.codigo} — {p.nome}</SelectItem>)}
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
          <div><Label className="text-xs">Setor</Label>
            <Select value={fSetor || "all"} onValueChange={(v) => setFSetor(v === "all" ? "" : v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {setores.map((s) => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div><Label className="text-xs">Data início</Label><Input type="date" value={fDataIni} onChange={(e) => setFDataIni(e.target.value)} /></div>
          <div><Label className="text-xs">Data fim</Label><Input type="date" value={fDataFim} onChange={(e) => setFDataFim(e.target.value)} /></div>
        </div>
        <div className="mt-2 text-xs text-muted-foreground">{filtradas.length} de {rows.length} registro(s)</div>
      </Card>

      <Card className="p-0 bg-card border-border overflow-hidden">
        {loading ? <div className="p-10 text-center text-muted-foreground">Carregando...</div> : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead><TableHead>Patrimônio</TableHead>
                <TableHead>Setor (de → para)</TableHead><TableHead>Responsável (de → para)</TableHead>
                <TableHead>Localização</TableHead><TableHead>Motivo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtradas.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Nenhuma movimentação encontrada</TableCell></TableRow>
                : filtradas.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="text-xs whitespace-nowrap">{new Date(m.data_movimentacao).toLocaleString("pt-BR")}</TableCell>
                  <TableCell className="font-mono text-primary text-xs">{m.patrimonios?.codigo} — {m.patrimonios?.nome}</TableCell>
                  <TableCell className="text-sm">{m.origem?.nome ?? "—"} <span className="text-muted-foreground">→</span> {m.destino?.nome ?? "—"}</TableCell>
                  <TableCell className="text-sm">{m.resp_origem?.nome ?? "—"} <span className="text-muted-foreground">→</span> {m.resp_destino?.nome ?? "—"}</TableCell>
                  <TableCell className="text-sm">{m.localizacao_origem ?? "—"} <span className="text-muted-foreground">→</span> {m.localizacao_destino ?? "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{m.motivo ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </AppLayout>
  );
}
