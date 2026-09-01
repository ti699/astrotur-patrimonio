import { createFileRoute } from "@tanstack/react-router";
import { AppLayout, RequireAdmin } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { ClipboardList } from "lucide-react";

export const Route = createFileRoute("/auditoria")({ component: Page });

function Page() {
  return (
    <AppLayout>
      <RequireAdmin><Audit /></RequireAdmin>
    </AppLayout>
  );
}

function Audit() {
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => {
    supabase.from("historico_patrimonio").select("*, patrimonios(codigo,nome)").order("created_at", { ascending: false }).limit(500)
      .then(({ data }) => setRows(data ?? []));
  }, []);

  return (
    <>
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-3"><ClipboardList className="h-7 w-7 text-primary" />Auditoria</h1>
        <p className="text-sm text-muted-foreground">Logs administrativos — alterações realizadas no sistema</p>
      </div>
      <Card className="p-0 bg-card border-border overflow-hidden">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Data/Hora</TableHead><TableHead>Patrimônio</TableHead>
            <TableHead>Ação</TableHead><TableHead>Descrição</TableHead><TableHead>Usuário</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {rows.length === 0 ? <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Nenhum log</TableCell></TableRow>
              : rows.map((h) => (
              <TableRow key={h.id}>
                <TableCell className="text-xs">{new Date(h.created_at).toLocaleString("pt-BR")}</TableCell>
                <TableCell className="font-mono text-primary text-xs">{h.patrimonios?.codigo} — {h.patrimonios?.nome}</TableCell>
                <TableCell><Badge variant="outline">{h.acao}</Badge></TableCell>
                <TableCell className="text-sm text-muted-foreground">{h.descricao}</TableCell>
                <TableCell className="text-xs font-mono text-muted-foreground">{h.usuario_id?.slice(0,8) ?? "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </>
  );
}
