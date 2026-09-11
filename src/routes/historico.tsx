import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { History } from "lucide-react";
import { ReportActions } from "@/components/ReportActions";

export const Route = createFileRoute("/historico")({ component: Page });

function Page() {
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => {
    supabase.from("historico_patrimonio").select("*, patrimonios(codigo,nome)").order("created_at", { ascending: false }).limit(200)
      .then(({ data }) => setRows(data ?? []));
  }, []);

  return (
    <AppLayout>
      <div className="flex flex-wrap justify-between items-start gap-4 mb-6">
        <div><h1 className="text-3xl font-bold flex items-center gap-3"><History className="h-7 w-7 text-primary" />Histórico</h1>
        <p className="text-sm text-muted-foreground">Histórico de alterações dos patrimônios</p></div>
        <ReportActions title="Relatório completo do Histórico" filename="relatorio-historico" rows={rows.map((h) => ({
          data: new Date(h.created_at).toLocaleString("pt-BR"), patrimonio: `${h.patrimonios?.codigo ?? "—"} - ${h.patrimonios?.nome ?? "—"}`, acao: h.acao, descricao: h.descricao ?? "—", usuario_id: h.usuario_id ?? "—",
        }))} columns={[{ key: "data", label: "Data" }, { key: "patrimonio", label: "Patrimônio" }, { key: "acao", label: "Ação" }, { key: "descricao", label: "Descrição" }, { key: "usuario_id", label: "Usuário" }]} />
      </div>
      <Card className="p-0 bg-card border-border overflow-hidden">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Data</TableHead><TableHead>Patrimônio</TableHead>
            <TableHead>Ação</TableHead><TableHead>Descrição</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {rows.length === 0 ? <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">Nenhum registro</TableCell></TableRow>
              : rows.map((h) => (
              <TableRow key={h.id}>
                <TableCell className="text-xs">{new Date(h.created_at).toLocaleString("pt-BR")}</TableCell>
                <TableCell className="font-mono text-primary text-xs">{h.patrimonios?.codigo} — {h.patrimonios?.nome}</TableCell>
                <TableCell><Badge variant="outline">{h.acao}</Badge></TableCell>
                <TableCell className="text-sm text-muted-foreground">{h.descricao}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </AppLayout>
  );
}
