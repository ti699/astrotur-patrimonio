import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { Archive, Eye, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import axios from "axios";
import { AppLayout } from "@/components/AppLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RecordDetailsDialog } from "@/components/RecordDetailsDialog";
import { useAuth } from "@/hooks/useAuth";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api } from "@/services/api";

export const Route = createFileRoute("/baixas")({ component: Baixas });

type PatrimonioBaixado = {
  id: string;
  codigo: string;
  nome: string;
  categoria?: string | null;
  status?: string | null;
  setor?: { nome?: string | null } | null;
  responsavel?: { nome?: string | null } | null;
};

type HistoricoBaixa = {
  id: string;
  patrimonio_id: string;
  acao?: string | null;
  descricao?: string | null;
  created_at: string;
  usuario_id?: string | null;
};

function Baixas() {
  const [patrimonios, setPatrimonios] = useState<PatrimonioBaixado[]>([]);
  const [historico, setHistorico] = useState<HistoricoBaixa[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedPatrimonioId, setSelectedPatrimonioId] = useState("");
  const [motivo, setMotivo] = useState("");
  const [selectedBaixa, setSelectedBaixa] = useState<
    (PatrimonioBaixado & { baixa?: HistoricoBaixa }) | null
  >(null);
  const { isAdmin } = useAuth();

  const loadBaixas = async () => {
    setLoading(true);
    setError(null);
    try {
      const [patrimoniosResponse, historicoResponse] = await Promise.all([
        api.get<PatrimonioBaixado[]>("/patrimonios"),
        api.get<HistoricoBaixa[]>("/historico", { params: { limit: 5000 } }),
      ]);
      setPatrimonios(patrimoniosResponse.data ?? []);
      setHistorico(historicoResponse.data ?? []);
    } catch {
      setError("Não foi possível carregar a lista de baixas. Tente novamente mais tarde.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [patrimoniosResponse, historicoResponse] = await Promise.all([
          api.get<PatrimonioBaixado[]>("/patrimonios"),
          api.get<HistoricoBaixa[]>("/historico", { params: { limit: 5000 } }),
        ]);
        if (!active) return;
        setPatrimonios(patrimoniosResponse.data ?? []);
        setHistorico(historicoResponse.data ?? []);
      } catch {
        if (active)
          setError("Não foi possível carregar a lista de baixas. Tente novamente mais tarde.");
      } finally {
        if (active) setLoading(false);
      }
    };

    load();
    return () => {
      active = false;
    };
  }, []);

  const criarBaixa = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const justificativa = motivo.trim();
    if (!selectedPatrimonioId) {
      toast.error("Selecione o patrimônio que será baixado");
      return;
    }
    if (!justificativa) {
      toast.error("Informe a justificativa da baixa");
      return;
    }

    setSaving(true);
    try {
      await api.post(`/patrimonios/${selectedPatrimonioId}/descarte`, { motivo: justificativa });
      toast.success("Baixa registrada com sucesso");
      setDialogOpen(false);
      setSelectedPatrimonioId("");
      setMotivo("");
      await loadBaixas();
    } catch (requestError: unknown) {
      const message =
        axios.isAxiosError<{ message?: string }>(requestError) &&
        requestError.response?.data?.message
          ? requestError.response.data.message
          : "Não foi possível registrar a baixa";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const baixas = useMemo(() => {
    const latestByPatrimonio = new Map<string, HistoricoBaixa>();
    historico
      .filter((entry) => /descarte|baixa/i.test(`${entry.acao ?? ""} ${entry.descricao ?? ""}`))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .forEach((entry) => {
        if (entry.patrimonio_id && !latestByPatrimonio.has(entry.patrimonio_id)) {
          latestByPatrimonio.set(entry.patrimonio_id, entry);
        }
      });

    return patrimonios
      .filter(
        (item) =>
          String(item.status ?? "")
            .trim()
            .toUpperCase() === "DESCARTADO",
      )
      .map((item) => ({ ...item, baixa: latestByPatrimonio.get(item.id) }))
      .filter((item) =>
        `${item.codigo} ${item.nome} ${item.categoria ?? ""} ${item.baixa?.descricao ?? ""}`
          .toLowerCase()
          .includes(search.trim().toLowerCase()),
      )
      .sort((a, b) => (a.codigo ?? "").localeCompare(b.codigo ?? "", "pt-BR"));
  }, [historico, patrimonios, search]);

  return (
    <AppLayout>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-3 text-3xl font-bold">
            <Archive className="h-7 w-7 text-primary" />
            Baixas
          </h1>
          <p className="text-sm text-muted-foreground">
            Patrimônios descartados e suas justificativas ({baixas.length}{" "}
            {baixas.length === 1 ? "item" : "itens"})
          </p>
        </div>
        {isAdmin && (
          <Button onClick={() => setDialogOpen(true)} className="bg-primary hover:bg-primary/90">
            <Plus className="mr-2 h-4 w-4" /> Nova baixa
          </Button>
        )}
      </div>

      <Card className="mb-4 border-border bg-card p-4">
        <div className="relative max-w-xl">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por código, nome, categoria ou justificativa..."
            className="pl-9"
            aria-label="Buscar baixas"
          />
        </div>
      </Card>

      <Card className="overflow-hidden border-border bg-card p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data da baixa</TableHead>
              <TableHead>Código</TableHead>
              <TableHead>Patrimônio</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Justificativa</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                  Carregando baixas...
                </TableCell>
              </TableRow>
            ) : error ? (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-destructive" role="alert">
                  {error}
                </TableCell>
              </TableRow>
            ) : baixas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                  {search
                    ? "Nenhuma baixa encontrada para esta busca."
                    : "Nenhum patrimônio baixado."}
                </TableCell>
              </TableRow>
            ) : (
              baixas.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="whitespace-nowrap text-xs">
                    {item.baixa?.created_at
                      ? new Date(item.baixa.created_at).toLocaleString("pt-BR")
                      : "—"}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-primary">{item.codigo}</TableCell>
                  <TableCell className="font-medium">{item.nome}</TableCell>
                  <TableCell className="text-muted-foreground">{item.categoria ?? "—"}</TableCell>
                  <TableCell className="max-w-md whitespace-pre-wrap text-sm text-muted-foreground">
                    {item.baixa?.descricao ?? "Justificativa não encontrada"}
                  </TableCell>
                  <TableCell>
                    <Badge variant="destructive">Descartado</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Ver detalhes da baixa de ${item.nome}`}
                        title="Ver detalhes"
                        onClick={() => setSelectedBaixa(item)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" asChild>
                        <Link to="/patrimonios/$id" params={{ id: item.id }}>
                          Ver item
                        </Link>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
      <Dialog
        open={isAdmin && dialogOpen}
        onOpenChange={(open) => {
          if (saving) return;
          setDialogOpen(open);
          if (!open) {
            setSelectedPatrimonioId("");
            setMotivo("");
          }
        }}
      >
        <DialogContent>
          <form onSubmit={criarBaixa}>
            <DialogHeader>
              <DialogTitle>Registrar nova baixa</DialogTitle>
              <DialogDescription>
                Selecione um patrimônio ativo e informe o motivo da baixa.
              </DialogDescription>
            </DialogHeader>
            <div className="my-5 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="baixa-patrimonio">Patrimônio *</Label>
                <Select value={selectedPatrimonioId} onValueChange={setSelectedPatrimonioId}>
                  <SelectTrigger id="baixa-patrimonio">
                    <SelectValue placeholder="Selecione um patrimônio" />
                  </SelectTrigger>
                  <SelectContent>
                    {patrimonios
                      .filter(
                        (item) =>
                          String(item.status ?? "")
                            .trim()
                            .toUpperCase() !== "DESCARTADO",
                      )
                      .map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.codigo} — {item.nome}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="baixa-motivo">Justificativa / motivo *</Label>
                <Textarea
                  id="baixa-motivo"
                  value={motivo}
                  onChange={(event) => setMotivo(event.target.value)}
                  required
                  minLength={1}
                  className="min-h-28"
                  placeholder="Descreva o motivo da baixa..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={saving}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                variant="destructive"
                disabled={saving || !selectedPatrimonioId || !motivo.trim()}
              >
                {saving ? "Registrando..." : "Confirmar baixa"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <RecordDetailsDialog
        open={Boolean(selectedBaixa)}
        onOpenChange={(open) => {
          if (!open) setSelectedBaixa(null);
        }}
        title="Detalhes da baixa"
        description={selectedBaixa ? `${selectedBaixa.codigo} — ${selectedBaixa.nome}` : undefined}
        details={
          selectedBaixa
            ? [
                {
                  label: "Data",
                  value: selectedBaixa.baixa?.created_at
                    ? new Date(selectedBaixa.baixa.created_at).toLocaleString("pt-BR")
                    : "—",
                },
                { label: "Status", value: selectedBaixa.status ?? "DESCARTADO" },
                { label: "Categoria", value: selectedBaixa.categoria },
                {
                  label: "Justificativa",
                  value: selectedBaixa.baixa?.descricao ?? "Justificativa não encontrada",
                },
                { label: "Responsável (ID)", value: selectedBaixa.baixa?.usuario_id },
                { label: "Setor", value: selectedBaixa.setor?.nome },
                { label: "Responsável atual", value: selectedBaixa.responsavel?.nome },
              ]
            : []
        }
      />
    </AppLayout>
  );
}
