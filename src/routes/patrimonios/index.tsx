import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { CATEGORIAS, ESTADOS, estadoColor, formatBRL } from "@/lib/categorias";
import { garantiaStatus, garantiaBadgeClass, diasParaVencer, getGarantiaFim } from "@/lib/garantias";
import { Eye, Pencil, Trash2, Plus, Search, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/patrimonios/")({ component: List });

function List() {
  const router = useRouter();
  const { isAdmin } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [setores, setSetores] = useState<any[]>([]);
  const [responsaveis, setResponsaveis] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [q, setQ] = useState("");
  const [fCat, setFCat] = useState<string>("all");
  const [fSetor, setFSetor] = useState<string>("all");
  const [fEstado, setFEstado] = useState<string>("all");
  const [fResp, setFResp] = useState<string>("all");
  const [fMin, setFMin] = useState("");
  const [fMax, setFMax] = useState("");
  const [fGar, setFGar] = useState<string>("all");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const load = async () => {
    setLoading(true);
    try {
      const [{ data: p }, { data: s }, { data: r }] = await Promise.all([
        supabase.from("patrimonios").select("*, setor:setores(nome), responsavel:responsaveis(nome)").order("created_at", { ascending: false }),
        supabase.from("setores").select("*").order("nome"),
        supabase.from("responsaveis").select("*").order("nome"),
      ]);
      setItems(p ?? []);
      setSetores(s ?? []);
      setResponsaveis(r ?? []);
    } catch {
      // falha silenciosa
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    return items.filter((i) => {
      if (q && !`${i.codigo} ${i.nome} ${i.numero_serie ?? ""}`.toLowerCase().includes(q.toLowerCase())) return false;
      if (fCat !== "all" && i.categoria !== fCat) return false;
      if (fSetor !== "all" && i.setor_id !== fSetor) return false;
      if (fEstado !== "all" && i.estado_conservacao !== fEstado) return false;
      if (fResp !== "all" && i.responsavel_id !== fResp) return false;
      const v = Number(i.valor_atual ?? 0);
      if (fMin && v < Number(fMin)) return false;
      if (fMax && v > Number(fMax)) return false;
      if (fGar !== "all") {
        const s = garantiaStatus(i);
        if (fGar === "ativa" && s !== "ativa") return false;
        if (fGar === "vencida" && s !== "vencida") return false;
        if (fGar === "proxima" && s !== "vencendo_30" && s !== "vencendo_60") return false;
      }
      return true;
    });
  }, [items, q, fCat, fSetor, fEstado, fResp, fMin, fMax, fGar]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageItems = filtered.slice((page - 1) * pageSize, page * pageSize);
  useEffect(() => { setPage(1); }, [q, fCat, fSetor, fEstado, fResp, fMin, fMax, fGar]);

  const remove = async (id: string) => {
    const { error } = await supabase.from("patrimonios").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Item excluído"); load(); }
  };

  return (
    <AppLayout>
      <div className="flex flex-wrap justify-between items-start gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold">Patrimônios</h1>
          <p className="text-sm text-muted-foreground">{filtered.length} {filtered.length === 1 ? "item" : "itens"} encontrados</p>
        </div>
        <Button onClick={() => router.navigate({ to: "/patrimonios/novo" })} className="bg-primary hover:bg-primary/90">
          <Plus className="h-4 w-4 mr-2" /> Novo Cadastro
        </Button>
      </div>

      <Card className="p-4 bg-card border-border mb-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="relative lg:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar por nome, código ou nº de série..." value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
          </div>
          <Select value={fCat} onValueChange={setFCat}>
            <SelectTrigger><SelectValue placeholder="Categoria" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as categorias</SelectItem>
              {Object.keys(CATEGORIAS).map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={fSetor} onValueChange={setFSetor}>
            <SelectTrigger><SelectValue placeholder="Setor" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os setores</SelectItem>
              {setores.map((s) => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={fEstado} onValueChange={setFEstado}>
            <SelectTrigger><SelectValue placeholder="Estado" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os estados</SelectItem>
              {ESTADOS.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={fResp} onValueChange={setFResp}>
            <SelectTrigger><SelectValue placeholder="Responsável" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os responsáveis</SelectItem>
              {responsaveis.map((r) => <SelectItem key={r.id} value={r.id}>{r.nome}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input type="number" placeholder="Valor mínimo (R$)" value={fMin} onChange={(e) => setFMin(e.target.value)} />
          <Input type="number" placeholder="Valor máximo (R$)" value={fMax} onChange={(e) => setFMax(e.target.value)} />
          <Select value={fGar} onValueChange={setFGar}>
            <SelectTrigger><SelectValue placeholder="Garantia" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as garantias</SelectItem>
              <SelectItem value="ativa">Garantia ativa</SelectItem>
              <SelectItem value="proxima">Próxima do vencimento</SelectItem>
              <SelectItem value="vencida">Garantia vencida</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      <Card className="bg-card border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/30 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left">Código</th>
                <th className="px-4 py-3 text-left">Nome</th>
                <th className="px-4 py-3 text-left">Categoria</th>
                <th className="px-4 py-3 text-left">Setor</th>
                <th className="px-4 py-3 text-left">Responsável</th>
                <th className="px-4 py-3 text-left">Estado</th>
                <th className="px-4 py-3 text-left">Garantia</th>
                <th className="px-4 py-3 text-right">Valor</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">Carregando...</td></tr>}
              {!loading && pageItems.length === 0 && (
                <tr><td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">Nenhum item encontrado.</td></tr>
              )}
              {pageItems.map((i) => {
                const gs = garantiaStatus(i);
                const dias = diasParaVencer(i);
                const fim = getGarantiaFim(i);
                return (
                <tr key={i.id} className="border-t border-border hover:bg-muted/20">
                  <td className="px-4 py-3 font-mono text-primary">{i.codigo}</td>
                  <td className="px-4 py-3 font-medium">{i.nome}</td>
                  <td className="px-4 py-3 text-muted-foreground">{i.categoria}</td>
                  <td className="px-4 py-3 text-muted-foreground">{i.setor?.nome ?? "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{i.responsavel?.nome ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block w-2 h-2 rounded-full mr-2 ${estadoColor[i.estado_conservacao as keyof typeof estadoColor] ?? "bg-muted"}`}></span>
                    {i.estado_conservacao}
                  </td>
                  <td className="px-4 py-3">
                    {gs === "sem_garantia" ? (
                      <span className="text-xs text-muted-foreground">—</span>
                    ) : (
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-medium ${garantiaBadgeClass[gs]}`}>
                        <ShieldCheck className="h-3 w-3" />
                        {gs === "vencida" ? `Vencida há ${Math.abs(dias!)} d`
                          : gs === "ativa" ? `${dias} d`
                          : `${dias} d`}
                      </span>
                    )}
                    {fim && <div className="text-[10px] text-muted-foreground mt-0.5">{new Date(fim + "T00:00:00").toLocaleDateString("pt-BR")}</div>}
                  </td>
                  <td className="px-4 py-3 text-right font-medium">{formatBRL(i.valor_atual)}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <Link to="/patrimonios/$id" params={{ id: i.id }} className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-primary"><Eye className="h-4 w-4" /></Link>
                      {isAdmin && <Link to="/patrimonios/$id/editar" params={{ id: i.id }} className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-primary"><Pencil className="h-4 w-4" /></Link>}
                      {isAdmin && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <button className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Excluir patrimônio?</AlertDialogTitle>
                              <AlertDialogDescription>Esta ação não pode ser desfeita. O item "{i.nome}" será removido permanentemente.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => remove(i.id)} className="bg-destructive">Excluir</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </td>
                </tr>
              );})}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="flex justify-between items-center p-4 border-t border-border text-sm">
            <span className="text-muted-foreground">Página {page} de {totalPages}</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Anterior</Button>
              <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Próxima</Button>
            </div>
          </div>
        )}
      </Card>
    </AppLayout>
  );
}
