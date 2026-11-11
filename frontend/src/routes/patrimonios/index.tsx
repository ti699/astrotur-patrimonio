import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { api } from "@/services/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { CATEGORIAS, ESTADOS, estadoColor, formatBRL } from "@/lib/categorias";
import {
  garantiaStatus,
  garantiaBadgeClass,
  diasParaVencer,
  getGarantiaFim,
} from "@/lib/garantias";
import { ReportActions } from "@/components/ReportActions";
import { Eye, Pencil, Trash2, Plus, Search, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import {
  PatrimonioTimelineDialog,
  type PatrimonioTimelineEvent,
} from "@/components/PatrimonioTimelineDialog";
import { PatrimonioBaixaDialog } from "@/components/PatrimonioBaixaDialog";
import axios from "axios";

export const Route = createFileRoute("/patrimonios/")({ component: List });

type Patrimonio = {
  id: string;
  codigo: string;
  nome: string;
  categoria: string;
  numero_serie?: string | null;
  status?: string | null;
  setor_id?: string | null;
  setor?: { nome?: string | null } | null;
  responsavel_id?: string | null;
  responsavel?: { nome?: string | null } | null;
  estado_conservacao?: string | null;
  valor_atual?: number | string | null;
  valor_aquisicao?: number | string | null;
  data_aquisicao?: string | null;
  data_fim_garantia?: string | null;
  garantia_ate?: string | null;
  localizacao?: string | null;
};

type SelectOption = { id: string; nome: string };
type HistoricoEntry = {
  id: string;
  acao?: string | null;
  descricao?: string | null;
  created_at: string;
  responsavel?: { nome?: string | null } | null;
  usuario?: { nome?: string | null } | null;
  usuario_id?: string | null;
};
type MovimentacaoEntry = {
  id: string;
  data_movimentacao: string;
  origem?: { nome?: string | null } | null;
  destino?: { nome?: string | null } | null;
  resp_origem?: { nome?: string | null } | null;
  resp_destino?: { nome?: string | null } | null;
  localizacao_origem?: string | null;
  localizacao_destino?: string | null;
  motivo?: string | null;
  observacoes?: string | null;
  usuario_id?: string | null;
};
type ManutencaoEntry = {
  id: string;
  data_inicio?: string | null;
  created_at?: string | null;
  tipo?: string | null;
  status?: string | null;
  descricao?: string | null;
  observacoes?: string | null;
  tecnico?: string | null;
  usuario_id?: string | null;
};

const isDiscarded = (status: unknown) =>
  String(status ?? "")
    .trim()
    .toUpperCase() === "DESCARTADO";

const apiErrorMessage = (error: unknown, fallback: string) =>
  axios.isAxiosError<{ message?: string }>(error) && error.response?.data?.message
    ? error.response.data.message
    : fallback;

function List() {
  const router = useRouter();
  const { isAdmin } = useAuth();
  const [items, setItems] = useState<Patrimonio[]>([]);
  const [setores, setSetores] = useState<SelectOption[]>([]);
  const [responsaveis, setResponsaveis] = useState<SelectOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [timelineItem, setTimelineItem] = useState<Patrimonio | null>(null);
  const [timelineEvents, setTimelineEvents] = useState<PatrimonioTimelineEvent[]>([]);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [timelineError, setTimelineError] = useState<string | null>(null);
  const [baixaPending, setBaixaPending] = useState(false);

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
      const [resPatrimonios, resSetores, resResponsaveis] = await Promise.all([
        api.get<Patrimonio[]>("/patrimonios"),
        api.get<SelectOption[]>("/setores"),
        api.get<SelectOption[]>("/responsaveis"),
      ]);
      setItems(resPatrimonios.data ?? []);
      setSetores(resSetores.data ?? []);
      setResponsaveis(resResponsaveis.data ?? []);
    } catch {
      // falha silenciosa
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    return items.filter((i) => {
      if (
        q &&
        !`${i.codigo} ${i.nome} ${i.numero_serie ?? ""}`.toLowerCase().includes(q.toLowerCase())
      )
        return false;
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
  useEffect(() => {
    setPage(1);
  }, [q, fCat, fSetor, fEstado, fResp, fMin, fMax, fGar]);

  const remove = async (id: string) => {
    try {
      await api.delete(`/patrimonios/${id}`);
      toast.success("Item excluído");
      load();
    } catch (error: unknown) {
      toast.error(apiErrorMessage(error, "Erro ao excluir o item"));
    }
  };

  const openTimeline = async (item: Patrimonio) => {
    setTimelineItem(item);
    setTimelineEvents([]);
    setTimelineError(null);
    setTimelineLoading(true);
    try {
      const [historyResponse, movementsResponse, maintenanceResponse] = await Promise.all([
        api.get<HistoricoEntry[]>("/historico", { params: { patrimonio_id: item.id } }),
        api.get<MovimentacaoEntry[]>("/movimentacoes", { params: { patrimonio_id: item.id } }),
        api.get<ManutencaoEntry[]>("/manutencoes", { params: { patrimonio_id: item.id } }),
      ]);
      const history = historyResponse.data ?? [];
      const movements = movementsResponse.data ?? [];
      const maintenance = maintenanceResponse.data ?? [];
      const events: PatrimonioTimelineEvent[] = [
        ...history.map((entry) => {
          const action = String(entry.acao ?? "");
          const isDiscard = /descarte|baixa|descartado/i.test(`${action} ${entry.descricao ?? ""}`);
          const isStatus = /status/i.test(`${action} ${entry.descricao ?? ""}`);
          const type: PatrimonioTimelineEvent["type"] = isDiscard
            ? "descarte"
            : isStatus
              ? "status"
              : "historico";
          return {
            id: `historico-${entry.id}`,
            date: entry.created_at,
            type,
            title: action || "Alteração registrada",
            description: entry.descricao,
            responsible: entry.responsavel?.nome ?? entry.usuario?.nome ?? entry.usuario_id ?? null,
          };
        }),
        ...movements.map((movement) => ({
          id: `movimentacao-${movement.id}`,
          date: movement.data_movimentacao,
          type: "movimentacao" as const,
          title: `${movement.origem?.nome ?? movement.localizacao_origem ?? "Origem não informada"} → ${movement.destino?.nome ?? movement.localizacao_destino ?? "Destino não informado"}`,
          description: movement.motivo ?? movement.observacoes,
          responsible:
            [movement.resp_origem?.nome, movement.resp_destino?.nome].filter(Boolean).join(" → ") ||
            movement.usuario_id ||
            null,
        })),
        ...maintenance.map((entry) => ({
          id: `manutencao-${entry.id}`,
          date: entry.data_inicio ?? entry.created_at ?? "",
          type: "manutencao" as const,
          title: `${entry.tipo ?? "Manutenção"}${entry.status ? ` — ${entry.status}` : ""}`,
          description: entry.descricao ?? entry.observacoes,
          responsible: entry.tecnico ?? entry.usuario_id ?? null,
        })),
      ];
      setTimelineEvents(events);
    } catch {
      setTimelineError("Não foi possível carregar o histórico deste patrimônio.");
    } finally {
      setTimelineLoading(false);
    }
  };

  const discard = async (item: Patrimonio, reason: string) => {
    setBaixaPending(true);
    try {
      await api.post(`/patrimonios/${item.id}/descarte`, { motivo: reason });
      toast.success("Descarte/baixa registrado com sucesso");
      await load();
    } catch (error: unknown) {
      toast.error(apiErrorMessage(error, "Erro ao registrar descarte/baixa"));
      throw error;
    } finally {
      setBaixaPending(false);
    }
  };

  return (
    <AppLayout>
      <div className="flex flex-wrap justify-between items-start gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold">Patrimônios</h1>
          <p className="text-sm text-muted-foreground">
            {filtered.length} {filtered.length === 1 ? "item" : "itens"} encontrados
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ReportActions
            title="Relatório completo de Patrimônios"
            filename="relatorio-patrimonios"
            rows={filtered.map((i) => ({
              codigo: i.codigo,
              nome: i.nome,
              categoria: i.categoria,
              setor: i.setor?.nome ?? "—",
              responsavel: i.responsavel?.nome ?? "—",
              estado: i.estado_conservacao,
              valor_aquisicao: i.valor_aquisicao,
              valor_atual: i.valor_atual,
              data_aquisicao: i.data_aquisicao ?? "—",
              localizacao: i.localizacao ?? "—",
            }))}
            columns={[
              { key: "codigo", label: "Código" },
              { key: "nome", label: "Nome" },
              { key: "categoria", label: "Categoria" },
              { key: "setor", label: "Setor" },
              { key: "responsavel", label: "Responsável" },
              { key: "estado", label: "Estado" },
              { key: "valor_aquisicao", label: "Valor aquisição", fmt: formatBRL },
              { key: "valor_atual", label: "Valor atual", fmt: formatBRL },
              { key: "data_aquisicao", label: "Aquisição" },
              { key: "localizacao", label: "Localização" },
            ]}
          />
          <Button
            onClick={() => router.navigate({ to: "/patrimonios/novo" })}
            className="bg-primary hover:bg-primary/90"
          >
            <Plus className="h-4 w-4 mr-2" /> Novo Cadastro
          </Button>
        </div>
      </div>

      <Card className="p-4 bg-card border-border mb-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="relative lg:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, código ou nº de série..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={fCat} onValueChange={setFCat}>
            <SelectTrigger>
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as categorias</SelectItem>
              {Object.keys(CATEGORIAS).map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={fSetor} onValueChange={setFSetor}>
            <SelectTrigger>
              <SelectValue placeholder="Setor" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os setores</SelectItem>
              {setores.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={fEstado} onValueChange={setFEstado}>
            <SelectTrigger>
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os estados</SelectItem>
              {ESTADOS.map((e) => (
                <SelectItem key={e} value={e}>
                  {e}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={fResp} onValueChange={setFResp}>
            <SelectTrigger>
              <SelectValue placeholder="Responsável" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os responsáveis</SelectItem>
              {responsaveis.map((r) => (
                <SelectItem key={r.id} value={r.id}>
                  {r.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            type="number"
            placeholder="Valor mínimo (R$)"
            value={fMin}
            onChange={(e) => setFMin(e.target.value)}
          />
          <Input
            type="number"
            placeholder="Valor máximo (R$)"
            value={fMax}
            onChange={(e) => setFMax(e.target.value)}
          />
          <Select value={fGar} onValueChange={setFGar}>
            <SelectTrigger>
              <SelectValue placeholder="Garantia" />
            </SelectTrigger>
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
              {loading && (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">
                    Carregando...
                  </td>
                </tr>
              )}
              {!loading && pageItems.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">
                    Nenhum item encontrado.
                  </td>
                </tr>
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
                    <td className="px-4 py-3 text-muted-foreground">
                      {i.responsavel?.nome ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block w-2 h-2 rounded-full mr-2 ${estadoColor[i.estado_conservacao as keyof typeof estadoColor] ?? "bg-muted"}`}
                      ></span>
                      {i.estado_conservacao}
                    </td>
                    <td className="px-4 py-3">
                      {gs === "sem_garantia" ? (
                        <span className="text-xs text-muted-foreground">—</span>
                      ) : (
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-medium ${garantiaBadgeClass[gs]}`}
                        >
                          <ShieldCheck className="h-3 w-3" />
                          {gs === "vencida"
                            ? `Vencida há ${Math.abs(dias!)} d`
                            : gs === "ativa"
                              ? `${dias} d`
                              : `${dias} d`}
                        </span>
                      )}
                      {fim && (
                        <div className="text-[10px] text-muted-foreground mt-0.5">
                          {new Date(fim + "T00:00:00").toLocaleDateString("pt-BR")}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-medium">{formatBRL(i.valor_atual)}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label={`Ver histórico de ${i.nome}`}
                          title="Ver histórico"
                          disabled={timelineLoading}
                          onClick={() => openTimeline(i)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {isAdmin && (
                          <Link
                            to="/patrimonios/$id/editar"
                            params={{ id: i.id }}
                            className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-primary"
                          >
                            <Pencil className="h-4 w-4" />
                          </Link>
                        )}
                        {isAdmin && (
                          <PatrimonioBaixaDialog
                            itemName={i.nome}
                            disabled={isDiscarded(i.status)}
                            pending={baixaPending}
                            onConfirm={(reason) => discard(i, reason)}
                          />
                        )}
                        {isAdmin && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <button className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-destructive">
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Excluir patrimônio?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Esta ação não pode ser desfeita. O item "{i.nome}" será removido
                                  permanentemente.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => remove(i.id)}
                                  className="bg-destructive"
                                >
                                  Excluir
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="flex justify-between items-center p-4 border-t border-border text-sm">
            <span className="text-muted-foreground">
              Página {page} de {totalPages}
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page === totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Próxima
              </Button>
            </div>
          </div>
        )}
      </Card>
      <PatrimonioTimelineDialog
        open={Boolean(timelineItem)}
        onOpenChange={(open) => {
          if (!open) setTimelineItem(null);
        }}
        item={timelineItem}
        events={timelineEvents}
        loading={timelineLoading}
        error={timelineError}
      />
    </AppLayout>
  );
}
