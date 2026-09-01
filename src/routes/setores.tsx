import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { formatBRL } from "@/lib/categorias";
import { toast } from "sonner";

export const Route = createFileRoute("/setores")({ component: Setores });

function Setores() {
  const [list, setList] = useState<any[]>([]);
  const [counts, setCounts] = useState<Record<string, { qtd: number; valor: number }>>({});
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState({ nome: "", descricao: "" });

  const load = async () => {
    try {
      const [{ data: s }, { data: p }] = await Promise.all([
        supabase.from("setores").select("*").order("nome"),
        supabase.from("patrimonios").select("setor_id, valor_atual"),
      ]);
      setList(s ?? []);
      const c: Record<string, { qtd: number; valor: number }> = {};
      (p ?? []).forEach((x: any) => {
        if (!x.setor_id) return;
        c[x.setor_id] = c[x.setor_id] ?? { qtd: 0, valor: 0 };
        c[x.setor_id].qtd++;
        c[x.setor_id].valor += Number(x.valor_atual ?? 0);
      });
      setCounts(c);
    } catch {
      // falha silenciosa
    }
  };

  useEffect(() => { load(); }, []);

  const openNew = () => { setEditing(null); setForm({ nome: "", descricao: "" }); setOpen(true); };
  const openEdit = (s: any) => { setEditing(s); setForm({ nome: s.nome, descricao: s.descricao ?? "" }); setOpen(true); };

  const save = async () => {
    if (!form.nome) return toast.error("Informe o nome");
    if (editing) {
      const { error } = await supabase.from("setores").update(form).eq("id", editing.id);
      if (error) return toast.error(error.message);
    } else {
      const { error } = await supabase.from("setores").insert(form);
      if (error) return toast.error(error.message);
    }
    toast.success("Setor salvo!");
    setOpen(false); load();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("setores").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Excluído"); load(); }
  };

  return (
    <AppLayout>
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-3xl font-bold">Setores</h1>
          <p className="text-sm text-muted-foreground">Departamentos cadastrados na empresa</p>
        </div>
        <Button onClick={openNew} className="bg-primary hover:bg-primary/90"><Plus className="h-4 w-4 mr-2" /> Novo Setor</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {list.map((s) => {
          const c = counts[s.id] ?? { qtd: 0, valor: 0 };
          return (
            <Card key={s.id} className="p-5 bg-card border-border">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-semibold text-lg">{s.nome}</h3>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(s)} className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-primary"><Pencil className="h-4 w-4" /></button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <button className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader><AlertDialogTitle>Excluir setor?</AlertDialogTitle><AlertDialogDescription>Os patrimônios deste setor ficarão sem setor.</AlertDialogDescription></AlertDialogHeader>
                      <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => remove(s.id)} className="bg-destructive">Excluir</AlertDialogAction></AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
              {s.descricao && <p className="text-xs text-muted-foreground mb-3">{s.descricao}</p>}
              <div className="flex justify-between text-sm pt-3 border-t border-border">
                <div><div className="text-xs text-muted-foreground">Itens</div><div className="font-bold">{c.qtd}</div></div>
                <div className="text-right"><div className="text-xs text-muted-foreground">Valor</div><div className="font-bold text-primary">{formatBRL(c.valor)}</div></div>
              </div>
            </Card>
          );
        })}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Editar Setor" : "Novo Setor"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Nome *</Label><Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></div>
            <div><Label>Descrição</Label><Textarea value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} /></div>
            <Button onClick={save} className="w-full bg-primary hover:bg-primary/90">Salvar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
