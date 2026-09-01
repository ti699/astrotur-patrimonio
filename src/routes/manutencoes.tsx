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
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { formatBRL } from "@/lib/categorias";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Wrench, Plus, Loader2 } from "lucide-react";

export const Route = createFileRoute("/manutencoes")({ component: Page });

function Page() {
  const [rows, setRows] = useState<any[]>([]);
  const [patrimonios, setPatrimonios] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<any>({ patrimonio_id: "", tipo: "Corretiva", descricao: "", tecnico: "", fornecedor: "", custo: "", data_inicio: new Date().toISOString().slice(0,10), data_conclusao: "", status: "Em andamento" });

  const load = async () => {
    try {
      const [{ data: m }, { data: p }] = await Promise.all([
        supabase.from("manutencoes").select("*, patrimonios(codigo,nome)").order("data_inicio", { ascending: false }),
        supabase.from("patrimonios").select("id,codigo,nome").order("codigo"),
      ]);
      setRows(m ?? []); setPatrimonios(p ?? []);
    } catch {
      // falha silenciosa
    }
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!form.patrimonio_id) return toast.error("Selecione o patrimônio");
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("manutencoes").insert({
      ...form, custo: form.custo ? Number(form.custo) : 0,
      data_conclusao: form.data_conclusao || null, usuario_id: user?.id,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    if (form.status === "Em andamento") {
      await supabase.from("patrimonios").update({ status: "Em manutenção" }).eq("id", form.patrimonio_id);
    }
    setOpen(false); toast.success("Manutenção registrada"); load();
    setForm({ patrimonio_id: "", tipo: "Corretiva", descricao: "", tecnico: "", fornecedor: "", custo: "", data_inicio: new Date().toISOString().slice(0,10), data_conclusao: "", status: "Em andamento" });
  };

  return (
    <AppLayout>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3"><Wrench className="h-7 w-7 text-primary" />Manutenções</h1>
          <p className="text-sm text-muted-foreground">Controle de manutenções preventivas e corretivas</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button className="bg-primary hover:bg-primary/90"><Plus className="h-4 w-4 mr-2" />Nova manutenção</Button></DialogTrigger>
          <DialogContent className="max-w-2xl bg-card border-border">
            <DialogHeader><DialogTitle>Registrar manutenção</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Patrimônio *</Label>
                <Select value={form.patrimonio_id} onValueChange={(v) => setForm({ ...form, patrimonio_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{patrimonios.map((p) => <SelectItem key={p.id} value={p.id}>{p.codigo} — {p.nome}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Tipo</Label>
                  <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{["Corretiva","Preventiva","Calibração","Instalação"].map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Status</Label>
                  <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{["Em andamento","Concluída","Cancelada"].map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Início</Label><Input type="date" value={form.data_inicio} onChange={(e) => setForm({ ...form, data_inicio: e.target.value })} /></div>
                <div><Label>Conclusão</Label><Input type="date" value={form.data_conclusao} onChange={(e) => setForm({ ...form, data_conclusao: e.target.value })} /></div>
                <div><Label>Técnico</Label><Input value={form.tecnico} onChange={(e) => setForm({ ...form, tecnico: e.target.value })} /></div>
                <div><Label>Fornecedor</Label><Input value={form.fornecedor} onChange={(e) => setForm({ ...form, fornecedor: e.target.value })} /></div>
                <div className="col-span-2"><Label>Custo (R$)</Label><Input type="number" step="0.01" value={form.custo} onChange={(e) => setForm({ ...form, custo: e.target.value })} /></div>
              </div>
              <div><Label>Descrição</Label><Textarea value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} rows={3} /></div>
              <Button onClick={save} disabled={saving} className="w-full bg-primary hover:bg-primary/90">
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Registrar
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="p-0 bg-card border-border overflow-hidden">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Início</TableHead><TableHead>Patrimônio</TableHead>
            <TableHead>Tipo</TableHead><TableHead>Técnico</TableHead>
            <TableHead>Custo</TableHead><TableHead>Status</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {rows.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Nenhuma manutenção registrada</TableCell></TableRow>
              : rows.map((m) => (
              <TableRow key={m.id}>
                <TableCell className="text-xs">{new Date(m.data_inicio).toLocaleDateString("pt-BR")}</TableCell>
                <TableCell className="font-mono text-primary text-xs">{m.patrimonios?.codigo} — {m.patrimonios?.nome}</TableCell>
                <TableCell>{m.tipo}</TableCell>
                <TableCell className="text-sm">{m.tecnico ?? "—"}</TableCell>
                <TableCell>{formatBRL(m.custo)}</TableCell>
                <TableCell><Badge variant="outline">{m.status}</Badge></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </AppLayout>
  );
}
