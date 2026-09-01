import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CATEGORIAS, formatBRL } from "@/lib/categorias";
import {
  garantiaStatus, garantiaLabel, garantiaBadgeClass,
  diasParaVencer, getGarantiaFim, type GarantiaStatus,
} from "@/lib/garantias";
import { exportCSV, gerarRelatorioTabela } from "@/lib/relatorios";
import { ShieldX, ShieldAlert, ShieldCheck, Shield, FileText, FileDown, Search, Eye } from "lucide-react";

export const Route = createFileRoute("/garantias")({ component: Garantias });

type Filtro = "all" | GarantiaStatus | "proxima";

function Garantias() {
  const [items, setItems] = useState<any[]>([]);
  const [setores, setSetores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [q, setQ] = useState("");
  const [fStatus, setFStatus] = useState<Filtro>("all");
  const [fCat, setFCat] = useState("all");
  const [fSetor, setFSetor] = useState("all");
  const [fFornecedor, setFFornecedor] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const [{ data: p }, { data: s }] = await Promise.all([
          supabase.from("patrimonios").select("*, setor:setores(nome), responsavel:responsaveis(nome)").order("created_at", { ascending: false }),
          supabase.from("setores").select("*").order("nome"),
        ]);
        setItems(p ?? []);
        setSetores(s ?? []);
      } catch {
        // falha silenciosa
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const stats = useMemo(() => {
    const acc = { total: 0, ativa: 0, vencendo_30: 0, vencendo_60: 0, vencida: 0, sem_garantia: 0 };
    items.forEach((i) => {
      acc.total++;
      const s = garantiaStatus(i);
      (acc as any)[s]++;
    });
    return acc;
  }, [items]);

  const filtered = useMemo(() => items.filter((i) => {
    const s = garantiaStatus(i);
    if (fStatus !== "all") {
      if (fStatus === "proxima") {
        if (s !== "vencendo_30" && s !== "vencendo_60") return false;
      } else if (s !== fStatus) return false;
    }
    if (fCat !== "all" && i.categoria !== fCat) return false;
    if (fSetor !== "all" && i.setor_id !== fSetor) return false;
    if (fFornecedor && !(i.fornecedor ?? "").toLowerCase().includes(fFornecedor.toLowerCase())) return false;
    if (q && !`${i.codigo} ${i.nome} ${i.numero_garantia ?? ""}`.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  }), [items, fStatus, fCat, fSetor, fFornecedor, q]);

  const exportarPDF = () => {
    gerarRelatorioTabela(
      "Relatório de Garantias",
      filtered.map((i) => {
        const fim = getGarantiaFim(i);
        const d = diasParaVencer(i);
        return {
          codigo: i.codigo, nome: i.nome, categoria: i.categoria,
          fornecedor: i.fornecedor ?? "—",
          numero_garantia: i.numero_garantia ?? "—",
          inicio: i.data_inicio_garantia ?? "—",
          fim: fim ?? "—",
          situacao: garantiaLabel[garantiaStatus(i)],
          dias: d === null ? "—" : d < 0 ? `Vencida há ${Math.abs(d)} d` : `${d} d`,
          valor_atual: i.valor_atual,
        };
      }),
      [
        { key: "codigo", label: "Código" },
        { key: "nome", label: "Nome" },
        { key: "fornecedor", label: "Fornecedor" },
        { key: "numero_garantia", label: "Nº Garantia" },
        { key: "inicio", label: "Início" },
        { key: "fim", label: "Fim" },
        { key: "situacao", label: "Situação" },
        { key: "dias", label: "Restantes" },
        { key: "valor_atual", label: "Valor", fmt: formatBRL },
      ],
    );
  };

  const exportarCSV = () => {
    exportCSV(filtered.map((i) => {
      const fim = getGarantiaFim(i);
      const d = diasParaVencer(i);
      return {
        codigo: i.codigo, nome: i.nome, categoria: i.categoria,
        setor: i.setor?.nome ?? "", fornecedor: i.fornecedor ?? "",
        numero_garantia: i.numero_garantia ?? "",
        data_compra: i.data_compra ?? "",
        data_inicio_garantia: i.data_inicio_garantia ?? "",
        data_fim_garantia: fim ?? "",
        situacao: garantiaLabel[garantiaStatus(i)],
        dias_restantes: d ?? "",
        valor_atual: i.valor_atual,
      };
    }), `relatorio-garantias-${Date.now()}.csv`);
  };

  return (
    <AppLayout>
      <div className="flex flex-wrap justify-between items-start gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold">Controle de Garantias</h1>
          <p className="text-sm text-muted-foreground">{filtered.length} item(ns) listado(s)</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={exportarPDF} className="bg-primary hover:bg-primary/90">
            <FileText className="h-4 w-4 mr-2" /> Relatório PDF
          </Button>
          <Button onClick={exportarCSV} variant="outline">
            <FileDown className="h-4 w-4 mr-2" /> Excel/CSV
          </Button>
        </div>
      </div>

      {/* Dashboard cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
        <StatBox icon={Shield} label="Total" value={stats.total} tone="neutral" onClick={() => setFStatus("all")} active={fStatus === "all"} />
        <StatBox icon={ShieldX} label="Vencidas" value={stats.vencida} tone="danger" pulse={stats.vencida > 0}
          onClick={() => setFStatus("vencida")} active={fStatus === "vencida"} />
        <StatBox icon={ShieldAlert} label="Vencem em 30d" value={stats.vencendo_30} tone="danger" pulse={stats.vencendo_30 > 0}
          onClick={() => setFStatus("vencendo_30")} active={fStatus === "vencendo_30"} />
        <StatBox icon={ShieldAlert} label="Vencem em 60d" value={stats.vencendo_60} tone="warning"
          onClick={() => setFStatus("vencendo_60")} active={fStatus === "vencendo_60"} />
        <StatBox icon={ShieldCheck} label="Ativas" value={stats.ativa} tone="success"
          onClick={() => setFStatus("ativa")} active={fStatus === "ativa"} />
      </div>

      {/* Filters */}
      <Card className="p-4 bg-card border-border mb-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="relative lg:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar por código, nome ou nº garantia..." value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
          </div>
          <Select value={fStatus} onValueChange={(v) => setFStatus(v as Filtro)}>
            <SelectTrigger><SelectValue placeholder="Situação" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as situações</SelectItem>
              <SelectItem value="ativa">Garantia ativa</SelectItem>
              <SelectItem value="proxima">Próxima do vencimento</SelectItem>
              <SelectItem value="vencendo_30">Vence em 30 dias</SelectItem>
              <SelectItem value="vencendo_60">Vence em 60 dias</SelectItem>
              <SelectItem value="vencida">Garantia vencida</SelectItem>
              <SelectItem value="sem_garantia">Sem garantia</SelectItem>
            </SelectContent>
          </Select>
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
          <Input placeholder="Filtrar por fornecedor..." value={fFornecedor} onChange={(e) => setFFornecedor(e.target.value)} className="lg:col-span-2" />
        </div>
      </Card>

      {/* Notifications */}
      {stats.vencida + stats.vencendo_30 > 0 && (
        <Card className="mb-4 p-4 border-destructive/40 bg-destructive/5 flex items-start gap-3">
          <ShieldAlert className="h-5 w-5 text-destructive mt-0.5 animate-pulse" />
          <div className="text-sm">
            <div className="font-semibold text-destructive">Atenção: ação necessária</div>
            <div className="text-muted-foreground">
              {stats.vencida > 0 && <>{stats.vencida} garantia(s) já vencida(s). </>}
              {stats.vencendo_30 > 0 && <>{stats.vencendo_30} item(ns) com garantia vencendo nos próximos 30 dias.</>}
            </div>
          </div>
        </Card>
      )}

      {/* Table */}
      <Card className="bg-card border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/30 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left">Código</th>
                <th className="px-4 py-3 text-left">Item</th>
                <th className="px-4 py-3 text-left">Fornecedor</th>
                <th className="px-4 py-3 text-left">Nº Garantia</th>
                <th className="px-4 py-3 text-left">Início</th>
                <th className="px-4 py-3 text-left">Fim</th>
                <th className="px-4 py-3 text-left">Situação</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">Carregando...</td></tr>}
              {!loading && filtered.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">Nenhum item encontrado.</td></tr>
              )}
              {filtered.map((i) => {
                const gs = garantiaStatus(i);
                const dias = diasParaVencer(i);
                const fim = getGarantiaFim(i);
                return (
                  <tr key={i.id} className="border-t border-border hover:bg-muted/20">
                    <td className="px-4 py-3 font-mono text-primary">{i.codigo}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium">{i.nome}</div>
                      <div className="text-xs text-muted-foreground">{i.categoria}{i.setor?.nome ? ` · ${i.setor.nome}` : ""}</div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{i.fornecedor ?? "—"}</td>
                    <td className="px-4 py-3 font-mono text-xs">{i.numero_garantia ?? "—"}</td>
                    <td className="px-4 py-3 text-xs">{i.data_inicio_garantia ? new Date(i.data_inicio_garantia + "T00:00:00").toLocaleDateString("pt-BR") : "—"}</td>
                    <td className="px-4 py-3 text-xs">{fim ? new Date(fim + "T00:00:00").toLocaleDateString("pt-BR") : "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full border text-[11px] font-medium ${garantiaBadgeClass[gs]}`}>
                        {garantiaLabel[gs]}
                        {dias !== null && gs !== "sem_garantia" && (
                          <span className="opacity-80">· {dias < 0 ? `${Math.abs(dias)}d atrás` : `${dias}d`}</span>
                        )}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link to="/patrimonios/$id" params={{ id: i.id }}
                        className="inline-flex items-center gap-1 p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-primary">
                        <Eye className="h-4 w-4" />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </AppLayout>
  );
}

function StatBox({
  icon: Icon, label, value, tone, pulse, onClick, active,
}: {
  icon: any; label: string; value: number;
  tone: "danger" | "warning" | "success" | "neutral";
  pulse?: boolean; onClick?: () => void; active?: boolean;
}) {
  const tones: Record<string, string> = {
    danger: "border-destructive/40 text-destructive",
    warning: "border-amber-500/40 text-amber-500",
    success: "border-emerald-500/40 text-emerald-500",
    neutral: "border-border text-foreground",
  };
  return (
    <button onClick={onClick} className={`text-left rounded-xl border bg-card p-4 transition hover:bg-muted/30 ${tones[tone]} ${active ? "ring-2 ring-primary/40" : ""}`}>
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-wider opacity-80">{label}</div>
          <div className="text-3xl font-bold mt-1">{value}</div>
        </div>
        <div className={`h-10 w-10 rounded-md bg-current/10 flex items-center justify-center ${pulse ? "animate-pulse" : ""}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </button>
  );
}
