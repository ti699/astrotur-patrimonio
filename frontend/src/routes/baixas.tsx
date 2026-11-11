import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Archive, Search } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
              <TableHead className="text-right">Detalhes</TableHead>
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
                    <Button variant="outline" size="sm" asChild>
                      <Link to="/patrimonios/$id" params={{ id: item.id }}>
                        Ver item
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </AppLayout>
  );
}
