import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { exportCSV, gerarTabelaHTML, imprimirPDF } from "@/lib/relatorios";
import { Download, FileText } from "lucide-react";
import { useState } from "react";

type ReportColumn = {
  key: string;
  label: string;
  fmt?: (value: any) => string;
};

export function ReportActions({ title, filename, rows, columns }: {
  title: string;
  filename: string;
  rows: Record<string, any>[];
  columns: ReportColumn[];
}) {
  const [open, setOpen] = useState(false);
  const exportarPDF = () => imprimirPDF(title, gerarTabelaHTML(rows, columns));
  const exportarCSV = () => exportCSV(rows, `${filename}-${Date.now()}.csv`);

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)} title={`Visualizar ${title}`}>
        <FileText className="h-4 w-4 mr-2" /> Ver relatório completo
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden bg-zinc-100 border-zinc-300 text-zinc-900">
          <DialogHeader>
            <DialogTitle className="text-zinc-900">{title}</DialogTitle>
            <DialogDescription className="text-zinc-600">{rows.length} registro(s) encontrado(s). Revise o relatório antes de exportar.</DialogDescription>
          </DialogHeader>
          <div className="min-h-0 overflow-auto rounded-md border border-zinc-300 bg-white p-4 shadow-sm">
            <div className="mb-4 flex items-center justify-between border-b border-zinc-200 pb-3">
              <div className="text-xl font-extrabold tracking-tight"><span className="text-red-700">ASTRO</span>TUR</div>
              <div className="text-xs text-zinc-500">Gerado em {new Date().toLocaleString("pt-BR")}</div>
            </div>
            <div className="overflow-x-auto" dangerouslySetInnerHTML={{ __html: gerarTabelaHTML(rows, columns) }} />
          </div>
          <DialogFooter className="flex-row justify-end gap-2">
            <Button variant="outline" onClick={exportarCSV}><Download className="h-4 w-4 mr-2" /> Baixar CSV</Button>
            <Button onClick={exportarPDF} className="bg-red-700 hover:bg-red-800"><FileText className="h-4 w-4 mr-2" /> Baixar PDF</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}