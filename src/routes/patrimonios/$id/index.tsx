import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { AppLayout } from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatBRL, estadoColor } from "@/lib/categorias";
import { Pencil, FileDown, ArrowLeft, Package, QrCode, Printer, ShieldCheck, Wrench, ArrowRightLeft } from "lucide-react";
import { gerarRelatorioItem } from "@/lib/relatorios";
import { DocumentosPatrimonio } from "@/components/DocumentosPatrimonio";

export const Route = createFileRoute("/patrimonios/$id/")({ component: Detail });

const statusColor: Record<string, string> = {
  "Em uso": "bg-green-600",
  "Em manutenção": "bg-yellow-600",
  "Em estoque": "bg-blue-600",
  "Descartado": "bg-zinc-600",
  "Emprestado": "bg-purple-600",
};

function Detail() {
  const { id } = useParams({ from: "/patrimonios/$id/" });
  const [item, setItem] = useState<any | null>(null);
  const [historico, setHistorico] = useState<any[]>([]);
  const [movimentacoes, setMovimentacoes] = useState<any[]>([]);
  const [manutencoes, setManutencoes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const etiquetaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      try {
        const [{ data: p }, { data: h }, { data: m }, { data: mn }] = await Promise.all([
          supabase.from("patrimonios").select("*, setor:setores(nome), responsavel:responsaveis(nome, cargo)").eq("id", id).maybeSingle(),
          supabase.from("historico_patrimonio").select("*").eq("patrimonio_id", id).order("created_at", { ascending: false }),
          supabase.from("movimentacoes").select("*, origem:setor_origem_id(nome), destino:setor_destino_id(nome), resp_origem:responsavel_origem_id(nome), resp_destino:responsavel_destino_id(nome)").eq("patrimonio_id", id).order("data_movimentacao", { ascending: false }),
          supabase.from("manutencoes").select("*").eq("patrimonio_id", id).order("data_inicio", { ascending: false }),
        ]);
        setItem(p); setHistorico(h ?? []); setMovimentacoes(m ?? []); setManutencoes(mn ?? []);
      } catch {
        // falha silenciosa
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const qrValue = item ? `${window.location.origin}/patrimonios/${item.id}` : "";

  const imprimirEtiqueta = () => {
    if (!etiquetaRef.current) return;
    const w = window.open("", "_blank", "width=420,height=260");
    if (!w) return;
    w.document.write(`<html><head><title>Etiqueta ${item.codigo}</title>
      <style>
        body { font-family: ui-sans-serif, system-ui; margin: 0; padding: 16px; color: #000; }
        .et { border: 2px solid #000; padding: 12px; display: flex; gap: 12px; align-items: center; width: 360px; }
        .info { font-size: 12px; line-height: 1.4; }
        .info b { color: #C0392B; font-size: 14px; }
        .info .name { font-weight: 600; font-size: 13px; margin: 2px 0 4px; }
        @media print { @page { size: 100mm 50mm; margin: 0; } body { padding: 4mm; } }
      </style></head><body>${etiquetaRef.current.innerHTML}
      <script>window.onload=()=>{window.print();setTimeout(()=>window.close(),300);}</script>
      </body></html>`);
    w.document.close();
  };

  if (loading) return <AppLayout><div className="text-muted-foreground">Carregando...</div></AppLayout>;
  if (!item) return <AppLayout><div>Item não encontrado.</div></AppLayout>;

  const specs = (item.specs ?? {}) as Record<string, any>;
  const hasSpecs = Object.values(specs).some((v) => v !== null && v !== undefined && v !== "");

  return (
    <AppLayout>
      <div className="flex flex-wrap justify-between items-start gap-4 mb-6">
        <div>
          <Link to="/patrimonios" className="text-xs text-muted-foreground hover:text-primary inline-flex items-center gap-1 mb-2">
            <ArrowLeft className="h-3 w-3" /> Voltar à lista
          </Link>
          <h1 className="text-3xl font-bold flex items-center gap-3 flex-wrap">
            <span className="font-mono text-primary text-2xl">{item.codigo}</span>
            <span>{item.nome}</span>
            {item.status && (
              <Badge className={`${statusColor[item.status] ?? "bg-muted"} text-white border-0`}>{item.status}</Badge>
            )}
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={imprimirEtiqueta}>
            <Printer className="h-4 w-4 mr-2" /> Imprimir etiqueta
          </Button>
          <Button variant="outline" onClick={() => gerarRelatorioItem(item)}>
            <FileDown className="h-4 w-4 mr-2" /> Gerar relatório
          </Button>
          <Link to="/patrimonios/$id/editar" params={{ id: item.id }}>
            <Button className="bg-primary hover:bg-primary/90"><Pencil className="h-4 w-4 mr-2" /> Editar</Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="p-6 bg-card border-border lg:col-span-1">
          {item.foto_url ? (
            <img src={item.foto_url} alt={item.nome} className="w-full h-64 object-cover rounded-md" />
          ) : (
            <div className="w-full h-64 rounded-md bg-muted flex items-center justify-center text-muted-foreground">
              <Package className="h-16 w-16 opacity-30" />
            </div>
          )}
          <div className="mt-4 space-y-3 text-sm">
            <Row label="Estado">
              <span className={`inline-block w-2 h-2 rounded-full mr-2 ${estadoColor[item.estado_conservacao as keyof typeof estadoColor] ?? "bg-muted"}`}></span>
              {item.estado_conservacao}
            </Row>
            <Row label="Valor de aquisição">{formatBRL(item.valor_aquisicao)}</Row>
            <Row label="Valor atual" highlight>{formatBRL(item.valor_atual)}</Row>
          </div>
        </Card>

        <Card className="p-6 bg-card border-border lg:col-span-2">
          <h3 className="text-sm font-semibold mb-4 uppercase tracking-wider text-muted-foreground">Informações</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <Row label="Categoria">{item.categoria}</Row>
            <Row label="Subcategoria">{item.subcategoria ?? "—"}</Row>
            <Row label="Marca">{item.marca ?? "—"}</Row>
            <Row label="Modelo">{item.modelo ?? "—"}</Row>
            <Row label="Nº de série">{item.numero_serie ?? "—"}</Row>
            <Row label="TAG da empresa">{item.tag_empresa ?? "—"}</Row>
            <Row label="Data de aquisição">{item.data_aquisicao ? new Date(item.data_aquisicao).toLocaleDateString("pt-BR") : "—"}</Row>
            <Row label="Garantia até">{item.garantia_ate ? new Date(item.garantia_ate).toLocaleDateString("pt-BR") : "—"}</Row>
            <Row label="Fornecedor">{item.fornecedor ?? "—"}</Row>
            <Row label="Setor">{item.setor?.nome ?? "—"}</Row>
            <Row label="Responsável">{item.responsavel?.nome ?? "—"}</Row>
            <Row label="Localização">{item.localizacao ?? "—"}</Row>
          </div>
          {item.descricao && (
            <div className="mt-6">
              <div className="text-xs uppercase text-muted-foreground mb-1">Descrição</div>
              <p className="text-sm">{item.descricao}</p>
            </div>
          )}
          {item.observacoes && (
            <div className="mt-4">
              <div className="text-xs uppercase text-muted-foreground mb-1">Observações</div>
              <p className="text-sm">{item.observacoes}</p>
            </div>
          )}
        </Card>

        {hasSpecs && (
          <Card className="p-6 bg-card border-border lg:col-span-2">
            <h3 className="text-sm font-semibold mb-4 uppercase tracking-wider text-muted-foreground">Especificações técnicas</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              {Object.entries(specs).filter(([, v]) => v !== null && v !== undefined && v !== "").map(([k, v]) => (
                <Row key={k} label={k}>{String(v)}</Row>
              ))}
            </div>
          </Card>
        )}

        <Card className="p-6 bg-card border-border lg:col-span-1 flex flex-col items-center justify-center">
          <div ref={etiquetaRef}>
            <div className="et" style={{ display: "flex", gap: 12, alignItems: "center", padding: 12, border: "2px solid #fff", background: "#fff", color: "#000", borderRadius: 6, width: 340 }}>
              <QRCodeSVG value={qrValue} size={96} level="M" includeMargin={false} />
              <div className="info" style={{ fontSize: 12, lineHeight: 1.4 }}>
                <b style={{ color: "#C0392B", fontSize: 14 }}>ASTROTUR</b>
                <div className="name" style={{ fontWeight: 600, fontSize: 13, margin: "2px 0 4px" }}>{item.nome}</div>
                <div>Código: <b>{item.codigo}</b></div>
                {item.tag_empresa && <div>TAG: {item.tag_empresa}</div>}
                {item.setor?.nome && <div>Setor: {item.setor.nome}</div>}
              </div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1">
            <QrCode className="h-3 w-3" /> Escaneie para abrir os detalhes
          </p>
        </Card>

        <DocumentosPatrimonio patrimonioId={item.id} />

        <Card className="p-6 bg-card border-border lg:col-span-3">
          <h3 className="text-sm font-semibold mb-4 uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <ArrowRightLeft className="h-4 w-4" /> Movimentações
          </h3>
          {movimentacoes.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem movimentações registradas.</p>
          ) : (
            <ul className="space-y-3">
              {movimentacoes.map((m) => (
                <li key={m.id} className="flex gap-3 text-sm border-b border-border/50 pb-3 last:border-0">
                  <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
                  <div className="flex-1">
                    <div className="font-medium">
                      {(m.origem?.nome || m.localizacao_origem) ?? "—"} <span className="text-muted-foreground">→</span> {(m.destino?.nome || m.localizacao_destino) ?? "—"}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Responsável: {m.resp_origem?.nome ?? "—"} → {m.resp_destino?.nome ?? "—"}
                    </div>
                    {(m.localizacao_origem || m.localizacao_destino) && (
                      <div className="text-xs text-muted-foreground">
                        Localização: {m.localizacao_origem ?? "—"} → {m.localizacao_destino ?? "—"}
                      </div>
                    )}
                    {m.motivo && <div className="text-xs">Motivo: {m.motivo}</div>}
                    <div className="text-xs text-muted-foreground">{new Date(m.data_movimentacao).toLocaleString("pt-BR")}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-6 bg-card border-border lg:col-span-3">
          <h3 className="text-sm font-semibold mb-4 uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <Wrench className="h-4 w-4" /> Manutenções
          </h3>
          {manutencoes.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem manutenções registradas.</p>
          ) : (
            <ul className="space-y-3">
              {manutencoes.map((m) => (
                <li key={m.id} className="flex gap-3 text-sm border-b border-border/50 pb-3 last:border-0">
                  <div className="w-2 h-2 rounded-full bg-yellow-500 mt-1.5 shrink-0" />
                  <div className="flex-1">
                    <div className="font-medium">{m.tipo} — <span className="text-muted-foreground font-normal">{m.status}</span></div>
                    {m.descricao && <div className="text-xs">{m.descricao}</div>}
                    <div className="text-xs text-muted-foreground">
                      {new Date(m.data_inicio).toLocaleDateString("pt-BR")}
                      {m.custo > 0 && ` • ${formatBRL(m.custo)}`}
                      {m.tecnico && ` • ${m.tecnico}`}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-6 bg-card border-border lg:col-span-3">
          <h3 className="text-sm font-semibold mb-4 uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" /> Histórico de Alterações (Auditoria)
          </h3>
          {historico.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem registros.</p>
          ) : (
            <ul className="space-y-3">
              {historico.map((h) => (
                <li key={h.id} className="flex gap-3 text-sm">
                  <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
                  <div>
                    <div className="font-medium">{h.acao} <span className="text-muted-foreground font-normal">— {h.descricao}</span></div>
                    <div className="text-xs text-muted-foreground">{new Date(h.created_at).toLocaleString("pt-BR")}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </AppLayout>
  );
}

function Row({ label, children, highlight }: { label: string; children: React.ReactNode; highlight?: boolean }) {
  return (
    <div>
      <div className="text-xs uppercase text-muted-foreground">{label}</div>
      <div className={highlight ? "text-primary font-bold text-lg" : "font-medium"}>{children}</div>
    </div>
  );
}
