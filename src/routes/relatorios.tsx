import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CATEGORIAS, ESTADOS, formatBRL } from "@/lib/categorias";
import { exportCSV, gerarRelatorioTabela } from "@/lib/relatorios";
import { FileDown, FileText } from "lucide-react";

export const Route = createFileRoute("/relatorios")({ component: Relatorios });

function Relatorios() {
  const [items, setItems] = useState<any[]>([]);
  const [setores, setSetores] = useState<any[]>([]);
  const [resps, setResps] = useState<any[]>([]);
  const [historico, setHistorico] = useState<any[]>([]);

  const [tipo, setTipo] = useState("geral");
  const [fCat, setFCat] = useState("all");
  const [fSet, setFSet] = useState("all");
  const [fResp, setFResp] = useState("all");
  const [fEst, setFEst] = useState("all");
  const [dInicio, setDInicio] = useState("");
  const [dFim, setDFim] = useState("");
  const [vMin, setVMin] = useState("");
  const [vMax, setVMax] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const [{ data: p }, { data: s }, { data: r }, { data: h }] = await Promise.all([
          supabase.from("patrimonios").select("*, setor:setores(nome), responsavel:responsaveis(nome)"),
          supabase.from("setores").select("*").order("nome"),
          supabase.from("responsaveis").select("*").order("nome"),
          supabase.from("historico_patrimonio").select("*").order("created_at", { ascending: false }).limit(2000),
        ]);
        setItems(p ?? []); setSetores(s ?? []); setResps(r ?? []); setHistorico(h ?? []);
      } catch {
        // falha silenciosa
      }
    })();
  }, []);

  const historicoFiltrado = (acao: "CRIADO" | "EXCLUIDO") => historico.filter((h) => {
    if (h.acao !== acao) return false;
    const d = (h.created_at ?? "").slice(0, 10);
    if (dInicio && d < dInicio) return false;
    if (dFim && d > dFim) return false;
    if (fCat !== "all" && h.categoria !== fCat) return false;
    return true;
  });
  const adicoes = useMemo(() => historicoFiltrado("CRIADO"), [historico, dInicio, dFim, fCat]);
  const exclusoes = useMemo(() => historicoFiltrado("EXCLUIDO"), [historico, dInicio, dFim, fCat]);

  const filtered = useMemo(() => items.filter((i) => {
    if (fCat !== "all" && i.categoria !== fCat) return false;
    if (fSet !== "all" && i.setor_id !== fSet) return false;
    if (fResp !== "all" && i.responsavel_id !== fResp) return false;
    if (fEst !== "all" && i.estado_conservacao !== fEst) return false;
    if (dInicio && i.data_aquisicao && i.data_aquisicao < dInicio) return false;
    if (dFim && i.data_aquisicao && i.data_aquisicao > dFim) return false;
    const v = Number(i.valor_atual ?? 0);
    if (vMin && v < Number(vMin)) return false;
    if (vMax && v > Number(vMax)) return false;
    return true;
  }), [items, fCat, fSet, fResp, fEst, dInicio, dFim, vMin, vMax]);

  const valorTotal = filtered.reduce((a, i) => a + Number(i.valor_atual ?? 0), 0);

  // Aggregations
  const byGroup = (key: string, label: (v: any) => string) => {
    const m: Record<string, { label: string; qtd: number; valor: number }> = {};
    filtered.forEach((i) => {
      const k = String(i[key] ?? "—");
      const l = label(i);
      m[k] = m[k] ?? { label: l, qtd: 0, valor: 0 };
      m[k].qtd++; m[k].valor += Number(i.valor_atual ?? 0);
    });
    return Object.values(m);
  };

  const aggSetor = byGroup("setor_id", (i) => i.setor?.nome ?? "—");
  const aggResp = byGroup("responsavel_id", (i) => i.responsavel?.nome ?? "—");
  const aggCat = byGroup("categoria", (i) => i.categoria);

  const cols = [
    { key: "codigo", label: "Código" },
    { key: "nome", label: "Nome" },
    { key: "categoria", label: "Categoria" },
    { key: "setor", label: "Setor", fmt: (v: any) => v?.nome ?? "—" },
    { key: "responsavel", label: "Responsável", fmt: (v: any) => v?.nome ?? "—" },
    { key: "estado_conservacao", label: "Estado" },
    { key: "valor_atual", label: "Valor", fmt: formatBRL },
  ];

  const exportarCSV = () => {
    if (tipo === "adicoes" || tipo === "exclusoes") {
      const rows = (tipo === "adicoes" ? adicoes : exclusoes).map((h) => ({
        data: new Date(h.created_at).toLocaleString("pt-BR"),
        codigo: h.codigo, nome: h.nome, categoria: h.categoria,
        valor: h.valor, acao: h.acao, descricao: h.descricao,
      }));
      exportCSV(rows, `relatorio-${tipo}-${Date.now()}.csv`);
      return;
    }
    const rows = filtered.map((i) => ({
      codigo: i.codigo, nome: i.nome, categoria: i.categoria, subcategoria: i.subcategoria,
      setor: i.setor?.nome, responsavel: i.responsavel?.nome,
      estado: i.estado_conservacao, valor_aquisicao: i.valor_aquisicao, valor_atual: i.valor_atual,
      data_aquisicao: i.data_aquisicao, localizacao: i.localizacao,
    }));
    exportCSV(rows, `relatorio-patrimonio-${Date.now()}.csv`);
  };

  const exportarPDF = () => {
    if (tipo === "geral") {
      gerarRelatorioTabela("Relatório Geral de Patrimônio", filtered, cols.map((c) => ({ ...c })));
    } else if (tipo === "setor") {
      gerarRelatorioTabela("Relatório por Setor", aggSetor, [
        { key: "label", label: "Setor" }, { key: "qtd", label: "Quantidade" },
        { key: "valor", label: "Valor Total", fmt: formatBRL },
      ]);
    } else if (tipo === "responsavel") {
      gerarRelatorioTabela("Relatório por Responsável", aggResp, [
        { key: "label", label: "Responsável" }, { key: "qtd", label: "Quantidade" },
        { key: "valor", label: "Valor Total", fmt: formatBRL },
      ]);
    } else if (tipo === "categoria") {
      gerarRelatorioTabela("Relatório por Categoria", aggCat, [
        { key: "label", label: "Categoria" }, { key: "qtd", label: "Quantidade" },
        { key: "valor", label: "Valor Total", fmt: formatBRL },
      ]);
    } else if (tipo === "adicoes" || tipo === "exclusoes") {
      const data = tipo === "adicoes" ? adicoes : exclusoes;
      const title = tipo === "adicoes" ? "Relatório de Adições" : "Relatório de Exclusões";
      gerarRelatorioTabela(title, data.map((h) => ({
        data: new Date(h.created_at).toLocaleString("pt-BR"),
        codigo: h.codigo ?? "—",
        nome: h.nome ?? "—",
        categoria: h.categoria ?? "—",
        valor_atual: h.valor,
      })), [
        { key: "data", label: "Data" },
        { key: "codigo", label: "Código" },
        { key: "nome", label: "Nome" },
        { key: "categoria", label: "Categoria" },
        { key: "valor_atual", label: "Valor", fmt: formatBRL },
      ]);
    }
  };

  return (
    <AppLayout>
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Relatórios</h1>
        <p className="text-sm text-muted-foreground">Gere relatórios personalizados do patrimônio</p>
      </div>

      <Card className="p-6 bg-card border-border mb-4">
        <h3 className="text-xs uppercase text-primary font-semibold mb-4">Tipo de Relatório</h3>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-6">
          {[
            { id: "geral", label: "Geral" },
            { id: "setor", label: "Por Setor" },
            { id: "responsavel", label: "Por Responsável" },
            { id: "categoria", label: "Por Categoria" },
            { id: "adicoes", label: "Adições" },
            { id: "exclusoes", label: "Exclusões" },
          ].map((t) => (
            <button key={t.id} onClick={() => setTipo(t.id)}
              className={`p-4 rounded-md border text-sm font-medium ${tipo === t.id ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-primary/50"}`}>
              {t.label}
            </button>
          ))}
        </div>

        <h3 className="text-xs uppercase text-primary font-semibold mb-4">Filtros</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div><Label className="text-xs">Categoria</Label>
            <Select value={fCat} onValueChange={setFCat}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {Object.keys(CATEGORIAS).map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent></Select></div>
          <div><Label className="text-xs">Setor</Label>
            <Select value={fSet} onValueChange={setFSet}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {setores.map((s) => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}
            </SelectContent></Select></div>
          <div><Label className="text-xs">Responsável</Label>
            <Select value={fResp} onValueChange={setFResp}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {resps.map((r) => <SelectItem key={r.id} value={r.id}>{r.nome}</SelectItem>)}
            </SelectContent></Select></div>
          <div><Label className="text-xs">Estado</Label>
            <Select value={fEst} onValueChange={setFEst}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {ESTADOS.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}
            </SelectContent></Select></div>
          <div><Label className="text-xs">Data início</Label><Input type="date" value={dInicio} onChange={(e) => setDInicio(e.target.value)} /></div>
          <div><Label className="text-xs">Data fim</Label><Input type="date" value={dFim} onChange={(e) => setDFim(e.target.value)} /></div>
          <div><Label className="text-xs">Valor mínimo</Label><Input type="number" value={vMin} onChange={(e) => setVMin(e.target.value)} /></div>
          <div><Label className="text-xs">Valor máximo</Label><Input type="number" value={vMax} onChange={(e) => setVMax(e.target.value)} /></div>
        </div>

        <div className="flex flex-wrap gap-3 mt-6 pt-6 border-t border-border">
          <Button onClick={exportarPDF} className="bg-primary hover:bg-primary/90"><FileText className="h-4 w-4 mr-2" /> Exportar PDF</Button>
          <Button onClick={exportarCSV} variant="outline"><FileDown className="h-4 w-4 mr-2" /> Exportar CSV/Excel</Button>
        </div>
      </Card>

      <Card className="bg-card border-border overflow-hidden">
        <div className="p-4 border-b border-border flex justify-between items-center">
          <h3 className="font-semibold">Prévia</h3>
          <div className="text-sm text-muted-foreground">
            {tipo === "adicoes" ? `${adicoes.length} adições`
              : tipo === "exclusoes" ? `${exclusoes.length} exclusões`
              : `${filtered.length} itens · ${formatBRL(valorTotal)}`}
          </div>
        </div>
        <div className="overflow-x-auto max-h-[500px]">
          {tipo === "geral" && (
            <table className="w-full text-sm">
              <thead className="bg-muted/30 text-xs uppercase text-muted-foreground sticky top-0">
                <tr>{cols.map((c) => <th key={c.key} className="px-4 py-3 text-left">{c.label}</th>)}</tr>
              </thead>
              <tbody>
                {filtered.map((i) => (
                  <tr key={i.id} className="border-t border-border">
                    <td className="px-4 py-2 font-mono text-primary">{i.codigo}</td>
                    <td className="px-4 py-2">{i.nome}</td>
                    <td className="px-4 py-2 text-muted-foreground">{i.categoria}</td>
                    <td className="px-4 py-2 text-muted-foreground">{i.setor?.nome ?? "—"}</td>
                    <td className="px-4 py-2 text-muted-foreground">{i.responsavel?.nome ?? "—"}</td>
                    <td className="px-4 py-2">{i.estado_conservacao}</td>
                    <td className="px-4 py-2 text-right">{formatBRL(i.valor_atual)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {(tipo === "setor" || tipo === "responsavel" || tipo === "categoria") && (
            <table className="w-full text-sm">
              <thead className="bg-muted/30 text-xs uppercase text-muted-foreground sticky top-0">
                <tr><th className="px-4 py-3 text-left">{tipo === "setor" ? "Setor" : tipo === "responsavel" ? "Responsável" : "Categoria"}</th><th className="px-4 py-3 text-right">Qtd</th><th className="px-4 py-3 text-right">Valor Total</th></tr>
              </thead>
              <tbody>
                {(tipo === "setor" ? aggSetor : tipo === "responsavel" ? aggResp : aggCat).map((g, idx) => (
                  <tr key={idx} className="border-t border-border">
                    <td className="px-4 py-2 font-medium">{g.label}</td>
                    <td className="px-4 py-2 text-right">{g.qtd}</td>
                    <td className="px-4 py-2 text-right text-primary font-medium">{formatBRL(g.valor)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {(tipo === "adicoes" || tipo === "exclusoes") && (
            <table className="w-full text-sm">
              <thead className="bg-muted/30 text-xs uppercase text-muted-foreground sticky top-0">
                <tr>
                  <th className="px-4 py-3 text-left">Data</th>
                  <th className="px-4 py-3 text-left">Código</th>
                  <th className="px-4 py-3 text-left">Nome</th>
                  <th className="px-4 py-3 text-left">Categoria</th>
                  <th className="px-4 py-3 text-right">Valor</th>
                </tr>
              </thead>
              <tbody>
                {(tipo === "adicoes" ? adicoes : exclusoes).map((h) => (
                  <tr key={h.id} className="border-t border-border">
                    <td className="px-4 py-2 text-xs text-muted-foreground">{new Date(h.created_at).toLocaleString("pt-BR")}</td>
                    <td className="px-4 py-2 font-mono text-primary">{h.codigo ?? "—"}</td>
                    <td className="px-4 py-2">{h.nome ?? "—"}</td>
                    <td className="px-4 py-2 text-muted-foreground">{h.categoria ?? "—"}</td>
                    <td className="px-4 py-2 text-right">{formatBRL(h.valor)}</td>
                  </tr>
                ))}
                {(tipo === "adicoes" ? adicoes : exclusoes).length === 0 && (
                  <tr><td colSpan={5} className="text-center text-muted-foreground py-8">Nenhum registro no período</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </Card>
    </AppLayout>
  );
}
