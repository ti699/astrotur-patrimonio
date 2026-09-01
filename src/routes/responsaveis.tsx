import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, ChevronDown, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { formatBRL } from "@/lib/categorias";

export const Route = createFileRoute("/responsaveis")({ component: Page });

function Page() {
  const [list, setList] = useState<any[]>([]);
  const [setores, setSetores] = useState<any[]>([]);
  const [itensPorResp, setItensPorResp] = useState<Record<string, any[]>>({});
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState({ nome: "", cargo: "", setor_id: "", contato_email: "", contato_telefone: "" });

  const load = async () => {
    try {
      const [{ data: r }, { data: s }, { data: p }] = await Promise.all([
        supabase.from("responsaveis").select("*, setor:setores(nome)").order("nome"),
        supabase.from("setores").select("*").order("nome"),
        supabase.from("patrimonios").select("*"),
      ]);
      setList(r ?? []); setSetores(s ?? []);
      const map: Record<string, any[]> = {};
      (p ?? []).forEach((x: any) => {
        if (!x.responsavel_id) return;
        map[x.responsavel_id] = map[x.responsavel_id] ?? [];
        map[x.responsavel_id].push(x);
      });
      setItensPorResp(map);
    } catch {
      // falha silenciosa
    }
  };
  useEffect(() => { load(); }, []);

  const openNew = () => { setEditing(null); setForm({ nome: "", cargo: "", setor_id: "", contato_email: "", contato_telefone: "" }); setOpen(true); };
  const openEdit = (r: any) => { setEditing(r); setForm({ nome: r.nome, cargo: r.cargo ?? "", setor_id: r.setor_id ?? "", contato_email: r.contato_email ?? "", contato_telefone: r.contato_telefone ?? "" }); setOpen(true); };

  const save = async () => {
    if (!form.nome) return toast.error("Informe o nome");
    const payload = { ...form, setor_id: form.setor_id || null };
    if (editing) {
      const { error } = await supabase.from("responsaveis").update(payload).eq("id", editing.id);
      if (error) return toast.error(error.message);
    } else {
      const { error } = await supabase.from("responsaveis").insert(payload);
      if (error) return toast.error(error.message);
    }
    toast.success("Responsável salvo!"); setOpen(false); load();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("responsaveis").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Excluído"); load(); }
  };

  return (
    <AppLayout>
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-3xl font-bold">Responsáveis</h1>
          <p className="text-sm text-muted-foreground">{list.length} pessoa(s) cadastrada(s)</p>
        </div>
        <Button onClick={openNew} className="bg-primary hover:bg-primary/90"><Plus className="h-4 w-4 mr-2" /> Novo Responsável</Button>
      </div>

      <Card className="bg-card border-border divide-y divide-border">
        {list.length === 0 && <div className="p-8 text-center text-muted-foreground">Nenhum responsável cadastrado.</div>}
        {list.map((r) => {
          const items = itensPorResp[r.id] ?? [];
          const exp = expanded[r.id];
          return (
            <div key={r.id}>
              <div className="p-4 flex items-center gap-4">
                <button onClick={() => setExpanded({ ...expanded, [r.id]: !exp })} className="p-1">
                  {exp ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </button>
                <div className="flex-1 min-w-0">
                  <div className="font-medium">{r.nome}</div>
                  <div className="text-xs text-muted-foreground">{r.cargo ?? "—"} {r.setor?.nome ? `· ${r.setor.nome}` : ""}</div>
                </div>
                <div className="text-sm text-muted-foreground hidden md:block">{r.contato_email}</div>
                <div className="text-sm">{items.length} <span className="text-xs text-muted-foreground">itens</span></div>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(r)} className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-primary"><Pencil className="h-4 w-4" /></button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <button className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader><AlertDialogTitle>Excluir {r.nome}?</AlertDialogTitle></AlertDialogHeader>
                      <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => remove(r.id)} className="bg-destructive">Excluir</AlertDialogAction></AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
              {exp && (
                <div className="bg-muted/20 px-12 py-3">
                  {items.length === 0 ? <div className="text-xs text-muted-foreground">Sem itens vinculados.</div> : (
                    <table className="w-full text-xs">
                      <tbody>
                        {items.map((i) => (
                          <tr key={i.id} className="border-b border-border last:border-0">
                            <td className="py-2 font-mono text-primary w-24">{i.codigo}</td>
                            <td className="py-2">{i.nome}</td>
                            <td className="py-2 text-right">{formatBRL(i.valor_atual)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Editar Responsável" : "Novo Responsável"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Nome *</Label><Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></div>
            <div><Label>Cargo</Label><Input value={form.cargo} onChange={(e) => setForm({ ...form, cargo: e.target.value })} /></div>
            <div>
              <Label>Setor</Label>
              <Select value={form.setor_id} onValueChange={(v) => setForm({ ...form, setor_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{setores.map((s) => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>E-mail</Label><Input type="email" value={form.contato_email} onChange={(e) => setForm({ ...form, contato_email: e.target.value })} /></div>
            <div><Label>Telefone</Label><Input value={form.contato_telefone} onChange={(e) => setForm({ ...form, contato_telefone: e.target.value })} /></div>
            <Button onClick={save} className="w-full bg-primary hover:bg-primary/90">Salvar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
