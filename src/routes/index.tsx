import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Package, DollarSign, Layers, Building2, ShieldAlert, ShieldX, ShieldCheck } from "lucide-react";
import { formatBRL, estadoColor } from "@/lib/categorias";
import { garantiaStatus } from "@/lib/garantias";
import { Link as RouterLink } from "@tanstack/react-router";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";

export const Route = createFileRoute("/")({ component: Dashboard });

const COLORS = ["#C0392B", "#E67E22", "#7F8C8D", "#9B59B6", "#3498DB", "#16A085"];

function Dashboard() {
  const [items, setItems] = useState<any[]>([]);
  const [setores, setSetores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [{ data: p }, { data: s }] = await Promise.all([
          supabase.from("patrimonios").select("*, setor:setores(nome), responsavel:responsaveis(nome)").order("created_at", { ascending: false }),
          supabase.from("setores").select("*"),
        ]);
        setItems(p ?? []);
        setSetores(s ?? []);
      } catch {
        // falha silenciosa — exibe dashboard vazio
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const totalItens = items.length;
  const valorTotal = items.reduce((acc, i) => acc + Number(i.valor_atual ?? 0), 0);
  const porCategoria = items.reduce<Record<string, number>>((acc, i) => {
    acc[i.categoria] = (acc[i.categoria] ?? 0) + 1; return acc;
  }, {});
  const porSetor = items.reduce<Record<string, number>>((acc, i) => {
    const k = i.setor?.nome ?? "Sem setor"; acc[k] = (acc[k] ?? 0) + 1; return acc;
  }, {});

  const catData = Object.entries(porCategoria).map(([name, value]) => ({ name, value }));
  const setData = Object.entries(porSetor).map(([name, value]) => ({ name, value }));
  const ultimos = items.slice(0, 10);

  const garantiaStats = items.reduce(
    (acc, i) => {
      const s = garantiaStatus(i);
      if (s in acc) (acc as any)[s]++;
      return acc;
    },
    { vencida: 0, vencendo_30: 0, vencendo_60: 0, ativa: 0, sem_garantia: 0 } as Record<string, number>,
  );

  return (
    <AppLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Visão geral do patrimônio Astrotur</p>
      </div>

      {loading ? <div className="text-muted-foreground">Carregando...</div> : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard icon={Package} label="Total de Itens" value={totalItens.toString()} />
            <StatCard icon={DollarSign} label="Valor Total" value={formatBRL(valorTotal)} />
            <StatCard icon={Layers} label="Categorias" value={Object.keys(porCategoria).length.toString()} />
            <StatCard icon={Building2} label="Setores Ativos" value={Object.keys(porSetor).length.toString()} />
          </div>

          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">Controle de Garantias</h3>
              <RouterLink to="/garantias" className="text-xs text-primary hover:underline">Ver módulo →</RouterLink>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <GarantiaCard
                icon={ShieldX}
                label="Garantias vencidas"
                value={garantiaStats.vencida}
                tone="danger"
                pulse={garantiaStats.vencida > 0}
              />
              <GarantiaCard
                icon={ShieldAlert}
                label="Vencendo em 30 dias"
                value={garantiaStats.vencendo_30}
                tone="warning"
                pulse={garantiaStats.vencendo_30 > 0}
              />
              <GarantiaCard
                icon={ShieldCheck}
                label="Vencendo em 60 dias"
                value={garantiaStats.vencendo_60}
                tone="info"
              />
            </div>
          </div>


          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
            <Card className="p-6 bg-card border-border">
              <h3 className="text-sm font-semibold text-foreground mb-4">Distribuição por Categoria</h3>
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={catData} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={(e: any) => `${e.name}: ${e.value}`}>
                    {catData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "#1a1a1a", border: "1px solid #333" }} />
                </PieChart>
              </ResponsiveContainer>
            </Card>
            <Card className="p-6 bg-card border-border">
              <h3 className="text-sm font-semibold text-foreground mb-4">Itens por Setor</h3>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={setData}>
                  <XAxis dataKey="name" stroke="#999" fontSize={12} />
                  <YAxis stroke="#999" fontSize={12} />
                  <Tooltip contentStyle={{ background: "#1a1a1a", border: "1px solid #333" }} />
                  <Bar dataKey="value" fill="#C0392B" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </div>

          <Card className="bg-card border-border">
            <div className="p-6 border-b border-border flex justify-between items-center">
              <h3 className="text-sm font-semibold">Últimos Cadastros</h3>
              <Link to="/patrimonios" className="text-xs text-primary hover:underline">Ver todos →</Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/30 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 text-left">Código</th>
                    <th className="px-4 py-3 text-left">Nome</th>
                    <th className="px-4 py-3 text-left">Categoria</th>
                    <th className="px-4 py-3 text-left">Setor</th>
                    <th className="px-4 py-3 text-left">Estado</th>
                    <th className="px-4 py-3 text-right">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {ultimos.length === 0 && (
                    <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Nenhum item cadastrado ainda.</td></tr>
                  )}
                  {ultimos.map((i) => (
                    <tr key={i.id} className="border-t border-border hover:bg-muted/20">
                      <td className="px-4 py-3 font-mono text-primary">{i.codigo}</td>
                      <td className="px-4 py-3">{i.nome}</td>
                      <td className="px-4 py-3 text-muted-foreground">{i.categoria}</td>
                      <td className="px-4 py-3 text-muted-foreground">{i.setor?.nome ?? "—"}</td>
                      <td className="px-4 py-3"><span className={`inline-block w-2 h-2 rounded-full mr-2 ${estadoColor[i.estado_conservacao as keyof typeof estadoColor] ?? "bg-muted"}`}></span>{i.estado_conservacao}</td>
                      <td className="px-4 py-3 text-right font-medium">{formatBRL(i.valor_atual)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </AppLayout>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <Card className="p-5 bg-card border-border">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs text-muted-foreground uppercase tracking-wider">{label}</div>
          <div className="text-2xl font-bold mt-1 text-foreground">{value}</div>
        </div>
        <div className="h-10 w-10 rounded-md bg-primary/15 text-primary flex items-center justify-center">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Card>
  );
}

function GarantiaCard({
  icon: Icon, label, value, tone, pulse,
}: { icon: any; label: string; value: number; tone: "danger" | "warning" | "info"; pulse?: boolean }) {
  const toneClass =
    tone === "danger" ? "border-destructive/40 bg-destructive/5 text-destructive"
    : tone === "warning" ? "border-amber-500/40 bg-amber-500/5 text-amber-500"
    : "border-primary/30 bg-primary/5 text-primary";
  return (
    <RouterLink to="/garantias" className={`block rounded-xl border p-5 transition hover:scale-[1.01] ${toneClass}`}>
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-wider opacity-80">{label}</div>
          <div className="text-3xl font-bold mt-1">{value}</div>
        </div>
        <div className={`h-12 w-12 rounded-md bg-current/10 flex items-center justify-center ${pulse ? "animate-pulse" : ""}`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </RouterLink>
  );
}
