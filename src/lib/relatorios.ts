import { formatBRL } from "./categorias";

function escapeCsv(v: any) {
  const s = String(v ?? "");
  if (s.includes(",") || s.includes('"') || s.includes("\n")) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function exportCSV(rows: any[], filename: string) {
  if (rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(","),
    ...rows.map((r) => headers.map((h) => escapeCsv(r[h])).join(",")),
  ].join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

export function exportPDF(title: string, html: string) {
  const w = window.open("", "_blank");
  if (!w) return;
  w.document.write(`<!doctype html><html><head><title>${title}</title>
    <style>
      body{font-family:Inter,Arial,sans-serif;color:#1a1a1a;padding:32px;}
      h1{color:#C0392B;border-bottom:3px solid #C0392B;padding-bottom:8px}
      h2{color:#1A1A1A;margin-top:24px;font-size:14px;text-transform:uppercase;letter-spacing:1px}
      table{width:100%;border-collapse:collapse;margin-top:12px;font-size:12px}
      th,td{padding:8px;border:1px solid #ddd;text-align:left}
      th{background:#1A1A1A;color:#fff}
      tr:nth-child(even){background:#f7f7f7}
      .header{display:flex;justify-content:space-between;align-items:center;margin-bottom:24px}
      .brand{font-weight:800;font-size:24px}
      .brand .r{color:#C0392B}
      .meta{font-size:11px;color:#666}
      @media print { button { display:none } }
    </style></head><body>
    <div class="header">
      <div class="brand"><span class="r">ASTRO</span>TUR</div>
      <div class="meta">Gerado em ${new Date().toLocaleString("pt-BR")}</div>
    </div>
    <h1>${title}</h1>
    ${html}
    <button onclick="window.print()" style="margin-top:24px;padding:8px 16px;background:#C0392B;color:#fff;border:0;border-radius:4px;cursor:pointer">Imprimir / Salvar PDF</button>
    </body></html>`);
  w.document.close();
}

export function gerarRelatorioItem(item: any) {
  const html = `
    <h2>Identificação</h2>
    <table>
      <tr><th>Código</th><td>${item.codigo}</td><th>Nome</th><td>${item.nome}</td></tr>
      <tr><th>Categoria</th><td>${item.categoria}</td><th>Subcategoria</th><td>${item.subcategoria ?? "—"}</td></tr>
      <tr><th>Marca</th><td>${item.marca ?? "—"}</td><th>Modelo</th><td>${item.modelo ?? "—"}</td></tr>
      <tr><th>Nº de série</th><td>${item.numero_serie ?? "—"}</td><th>Estado</th><td>${item.estado_conservacao}</td></tr>
    </table>
    <h2>Valores</h2>
    <table>
      <tr><th>Data aquisição</th><td>${item.data_aquisicao ?? "—"}</td><th>Valor aquisição</th><td>${formatBRL(item.valor_aquisicao)}</td><th>Valor atual</th><td>${formatBRL(item.valor_atual)}</td></tr>
    </table>
    <h2>Alocação</h2>
    <table>
      <tr><th>Setor</th><td>${item.setor?.nome ?? "—"}</td><th>Responsável</th><td>${item.responsavel?.nome ?? "—"}</td><th>Localização</th><td>${item.localizacao ?? "—"}</td></tr>
    </table>
    ${item.descricao ? `<h2>Descrição</h2><p>${item.descricao}</p>` : ""}
    ${item.observacoes ? `<h2>Observações</h2><p>${item.observacoes}</p>` : ""}
  `;
  exportPDF(`Relatório do patrimônio ${item.codigo}`, html);
}

export function gerarRelatorioTabela(title: string, rows: any[], cols: { key: string; label: string; fmt?: (v: any) => string }[]) {
  const total = rows.reduce((a, r) => a + Number(r.valor_atual ?? 0), 0);
  const head = cols.map((c) => `<th>${c.label}</th>`).join("");
  const body = rows.map((r) =>
    `<tr>${cols.map((c) => `<td>${c.fmt ? c.fmt(r[c.key]) : (r[c.key] ?? "—")}</td>`).join("")}</tr>`
  ).join("");
  const html = `
    <p class="meta">Total de itens: <b>${rows.length}</b> · Valor total: <b>${formatBRL(total)}</b></p>
    <table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>
  `;
  exportPDF(title, html);
}
