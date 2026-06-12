import { Linking } from "react-native";
import type { LinhaPlanilha, Planilha, StatusPagamento } from "@/types/models";
import type { PlanilhaTotais } from "@/hooks/usePlanilha";
import type {
  MensalidadeRow,
  MensalidadeTotais,
} from "@/hooks/useMensalidades";
import type { ProdutoRow, ProdutoTotais } from "@/hooks/useProdutos";
import { formatDateBR, formatMoney, formatMonthYear, monthName, monthShortName } from "./format";

const STYLES = `
  * { box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    color: #1A1024;
    margin: 0;
    padding: 32px;
    background: #FFFFFF;
  }
  header {
    background: #4A148C;
    color: #FFFFFF;
    padding: 20px 24px;
    border-radius: 12px;
    margin-bottom: 24px;
  }
  header h1 {
    margin: 0;
    font-size: 22px;
    font-weight: 700;
  }
  header .sub {
    margin-top: 4px;
    font-size: 13px;
    color: #F0EAF5;
  }
  h2 {
    margin: 24px 0 8px;
    font-size: 15px;
    color: #4F4159;
    text-transform: uppercase;
    letter-spacing: 0.4px;
  }
  .table-wrap { overflow-x: auto; }
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 12px;
  }
  thead th {
    background: #F0EAF5;
    color: #311070;
    text-align: left;
    padding: 10px 12px;
    border-bottom: 2px solid #C5B6D2;
    font-weight: 700;
  }
  tfoot td {
    background: #F0EAF5;
    padding: 10px 12px;
    border-top: 2px solid #C5B6D2;
    font-weight: 700;
    font-size: 12px;
  }
  tbody td {
    padding: 10px 12px;
    border-bottom: 1px solid #E0D6E8;
    vertical-align: top;
  }
  tbody tr:nth-child(even) td { background: #FAF7FC; }
  td.num, th.num { text-align: right; white-space: nowrap; }
  td.center, th.center { text-align: center; white-space: nowrap; }
  .entrada { color: #2E7D32; font-weight: 600; }
  .saida { color: #C62828; font-weight: 600; }
  .pago { color: #2E7D32; }
  .pendente { color: #C62828; }
  .badge {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 999px;
    font-size: 11px;
    font-weight: 600;
  }
  .badge-pago { background: #E6F4E7; color: #2E7D32; }
  .badge-pendente { background: #FCE8E8; color: #C62828; }
  .badge-parcial { background: #FFF1DC; color: #F57C00; }
  .badge-doado { background: #EDE7F6; color: #6A1B9A; }
  footer {
    margin-top: 24px;
    background: #F0EAF5;
    border-radius: 12px;
    padding: 16px 20px;
  }
  footer .totals {
    display: flex;
    justify-content: space-between;
    gap: 16px;
  }
  footer .cell {
    flex: 1;
    text-align: center;
  }
  footer .label {
    font-size: 11px;
    color: #4F4159;
    text-transform: uppercase;
    letter-spacing: 0.4px;
  }
  footer .value {
    margin-top: 4px;
    font-size: 18px;
    font-weight: 700;
    color: #1A1024;
  }
  .meta {
    margin-top: 18px;
    font-size: 11px;
    color: #7A6F85;
    text-align: right;
  }
  .empty {
    padding: 32px;
    text-align: center;
    color: #7A6F85;
    background: #F5F2F8;
    border-radius: 10px;
  }
`;

function escapeHTML(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function nowBR(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

function periodoSubtitulo(planilha: Planilha): string {
  if (planilha.mes && planilha.ano) {
    return formatMonthYear(planilha.mes, planilha.ano);
  }
  return "Planilha";
}

function periodLabel(meses: Array<{ mes: number; ano: number }>): string {
  if (meses.length === 0) return "";
  const sorted = [...meses].sort((a, b) => a.ano !== b.ano ? a.ano - b.ano : a.mes - b.mes);
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  if (first.mes === last.mes && first.ano === last.ano) {
    return formatMonthYear(first.mes, first.ano);
  }
  if (first.ano === last.ano) {
    return `${monthName(first.mes)} a ${monthName(last.mes)} de ${first.ano}`;
  }
  return `${monthName(first.mes)}/${first.ano} a ${monthName(last.mes)}/${last.ano}`;
}

export function gerarHTMLPlanilha(
  planilha: Planilha,
  linhas: LinhaPlanilha[],
  totais: PlanilhaTotais
): string {
  const linhasHTML =
    linhas.length === 0
      ? `<div class="empty">Sem lançamentos registrados.</div>`
      : `<table>
          <thead>
            <tr>
              <th>Nome</th>
              <th class="center">Tipo</th>
              <th>Data</th>
              <th class="center">Status</th>
              <th class="num">Valor</th>
            </tr>
          </thead>
          <tbody>
            ${linhas
              .map((l) => {
                const tipoLabel =
                  l.tipo === "entrada" ? "Entrada" : "Saída";
                const tipoClass = l.tipo === "entrada" ? "entrada" : "saida";
                const statusClass =
                  l.status === "pago" ? "badge-pago" : "badge-pendente";
                const statusLabel = l.status === "pago" ? "Pago" : "Pendente";
                const valor = formatMoney(l.valor);
                const obs = l.observacao
                  ? `<div style="font-size:11px;color:#7A6F85;margin-top:2px;">${escapeHTML(
                      l.observacao
                    )}</div>`
                  : "";
                return `<tr>
                  <td>
                    <div style="font-weight:600;">${escapeHTML(l.nome)}</div>
                    ${obs}
                  </td>
                  <td class="center"><span class="${tipoClass}">${tipoLabel}</span></td>
                  <td>${l.data ? escapeHTML(formatDateBR(l.data)) : "—"}</td>
                  <td class="center"><span class="badge ${statusClass}">${statusLabel}</span></td>
                  <td class="num ${tipoClass}">${valor}</td>
                </tr>`;
              })
              .join("")}
          </tbody>
        </table>`;

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<title>${escapeHTML(planilha.nome)}</title>
<style>${STYLES}</style>
</head>
<body>
  <header>
    <h1>${escapeHTML(planilha.nome)}</h1>
    <div class="sub">${escapeHTML(periodoSubtitulo(planilha))}</div>
  </header>

  <h2>Lançamentos</h2>
  ${linhasHTML}

  <footer>
    <div class="totals">
      <div class="cell">
        <div class="label">Entradas</div>
        <div class="value entrada">${formatMoney(totais.entradas)}</div>
      </div>
      <div class="cell">
        <div class="label">Saídas</div>
        <div class="value saida">${formatMoney(totais.saidas)}</div>
      </div>
      <div class="cell">
        <div class="label">Saldo</div>
        <div class="value">${formatMoney(totais.saldo)}</div>
      </div>
    </div>
  </footer>

  <div class="meta">Gerado em ${nowBR()}</div>
</body>
</html>`;
}

function statusIcon(status: StatusPagamento): string {
  switch (status) {
    case "pago":
      return "✅";
    case "parcial":
      return "🔵";
    case "doado":
      return "💜";
    case "pendente":
    default:
      return "⏳";
  }
}

function statusLabelText(status: StatusPagamento): string {
  switch (status) {
    case "pago":
      return "Pago";
    case "parcial":
      return "Parcial";
    case "doado":
      return "Doado";
    case "pendente":
    default:
      return "Pendente";
  }
}

// ─── Single-month HTML ──────────────────────────────────────────────────────

export function gerarHTMLMensalidades(
  mes: number,
  ano: number,
  rows: MensalidadeRow[],
  totais: MensalidadeTotais
): string {
  const titulo = `Mensalidades — ${formatMonthYear(mes, ano)}`;

  const tabela =
    rows.length === 0
      ? `<div class="empty">Nenhum membro encontrado para este período.</div>`
      : `<table>
          <thead>
            <tr>
              <th>Membro</th>
              <th class="center">Status</th>
              <th>Pagamento</th>
              <th class="num">Pago</th>
              <th class="num">Pendente</th>
            </tr>
          </thead>
          <tbody>
            ${rows
              .map((r) => {
                const isPago = r.status === "pago";
                const statusClass = isPago ? "badge-pago" : "badge-pendente";
                const statusLabel = isPago ? "Pago" : "Pendente";
                const pagamento =
                  isPago && r.data_pagamento
                    ? escapeHTML(formatDateBR(r.data_pagamento))
                    : "—";
                const valorPago = isPago ? r.valor : 0;
                const valorPendente = isPago ? 0 : r.valor;
                return `<tr>
                  <td><div style="font-weight:600;">${escapeHTML(r.membro_nome)}</div></td>
                  <td class="center"><span class="badge ${statusClass}">${statusLabel}</span></td>
                  <td>${pagamento}</td>
                  <td class="num pago">${valorPago > 0 ? formatMoney(valorPago) : "—"}</td>
                  <td class="num pendente">${valorPendente > 0 ? formatMoney(valorPendente) : "—"}</td>
                </tr>`;
              })
              .join("")}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="3">Total</td>
              <td class="num pago">${formatMoney(totais.totalArrecadado)}</td>
              <td class="num pendente">${formatMoney(totais.totalPendente)}</td>
            </tr>
          </tfoot>
        </table>`;

  const adimplencia = totais.adimplenciaPercent.toFixed(0);

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<title>${escapeHTML(titulo)}</title>
<style>${STYLES}</style>
</head>
<body>
  <header>
    <h1>Mensalidades</h1>
    <div class="sub">${escapeHTML(formatMonthYear(mes, ano))}</div>
  </header>

  <h2>Membros</h2>
  ${tabela}

  <footer>
    <div class="totals">
      <div class="cell">
        <div class="label">Arrecadado</div>
        <div class="value entrada">${formatMoney(totais.totalArrecadado)}</div>
      </div>
      <div class="cell">
        <div class="label">Pendente</div>
        <div class="value saida">${formatMoney(totais.totalPendente)}</div>
      </div>
      <div class="cell">
        <div class="label">Adimplência</div>
        <div class="value">${adimplencia}% (${totais.qtdPagos}/${totais.qtdTotal})</div>
      </div>
    </div>
  </footer>

  <div class="meta">Gerado em ${nowBR()}</div>
</body>
</html>`;
}

export function gerarHTMLProdutos(
  mes: number,
  ano: number,
  rows: ProdutoRow[],
  totais: ProdutoTotais
): string {
  const titulo = `Produtos — ${formatMonthYear(mes, ano)}`;

  const tabela =
    rows.length === 0
      ? `<div class="empty">Nenhum membro encontrado para este período.</div>`
      : `<table>
          <thead>
            <tr>
              <th>Membro</th>
              <th class="center">Status</th>
              <th>Pagamento</th>
              <th class="num">Pago</th>
              <th class="num">Pendente</th>
            </tr>
          </thead>
          <tbody>
            ${rows
              .map((r) => {
                const isPago = r.status === "pago" || r.status === "doado";
                const cls =
                  r.status === "pago" ? "badge-pago"
                  : r.status === "doado" ? "badge-doado"
                  : r.status === "parcial" ? "badge-parcial"
                  : "badge-pendente";
                const label = statusLabelText(r.status);
                const pagamento =
                  isPago && r.data_pagamento
                    ? escapeHTML(formatDateBR(r.data_pagamento))
                    : "—";
                const valorPago = r.status === "doado"
                  ? r.valor_cobrado
                  : r.status === "parcial"
                  ? r.valor_pago
                  : r.status === "pago"
                  ? r.valor_pago
                  : 0;
                const valorPendente = isPago ? 0 : Math.max(r.valor_cobrado - r.valor_pago, 0);
                return `<tr>
                  <td><div style="font-weight:600;">${escapeHTML(r.membro_nome)}</div></td>
                  <td class="center"><span class="badge ${cls}">${label}</span></td>
                  <td>${pagamento}</td>
                  <td class="num pago">${valorPago > 0 ? formatMoney(valorPago) : "—"}</td>
                  <td class="num pendente">${valorPendente > 0 ? formatMoney(valorPendente) : "—"}</td>
                </tr>`;
              })
              .join("")}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="3">Total</td>
              <td class="num pago">${formatMoney(totais.totalPago)}</td>
              <td class="num pendente">${formatMoney(totais.totalPendente)}</td>
            </tr>
          </tfoot>
        </table>`;

  const adimplencia = totais.adimplenciaPercent.toFixed(0);

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<title>${escapeHTML(titulo)}</title>
<style>${STYLES}</style>
</head>
<body>
  <header>
    <h1>Produtos de Limpeza</h1>
    <div class="sub">${escapeHTML(formatMonthYear(mes, ano))}</div>
  </header>

  <h2>Membros</h2>
  ${tabela}

  <footer>
    <div class="totals">
      <div class="cell">
        <div class="label">Cobrado</div>
        <div class="value">${formatMoney(totais.totalCobrado)}</div>
      </div>
      <div class="cell">
        <div class="label">Pago</div>
        <div class="value entrada">${formatMoney(totais.totalPago)}</div>
      </div>
      <div class="cell">
        <div class="label">Pendente</div>
        <div class="value saida">${formatMoney(totais.totalPendente)}</div>
      </div>
      <div class="cell">
        <div class="label">Adimplência</div>
        <div class="value">${adimplencia}% (${totais.qtdPagos}/${totais.qtdTotal})</div>
      </div>
    </div>
  </footer>

  <div class="meta">Gerado em ${nowBR()}</div>
</body>
</html>`;
}

// ─── Multi-month HTML (member × month matrix) ────────────────────────────────

export type PeriodoMensalidadeData = {
  mes: number;
  ano: number;
  rows: MensalidadeRow[];
};

export function gerarHTMLMensalidadesMultiMes(
  periodos: PeriodoMensalidadeData[]
): string {
  if (periodos.length === 0) {
    return `<!DOCTYPE html><html><body><p>Sem dados.</p></body></html>`;
  }

  const sorted = [...periodos].sort((a, b) => a.ano !== b.ano ? a.ano - b.ano : a.mes - b.mes);
  const label = periodLabel(sorted.map((p) => ({ mes: p.mes, ano: p.ano })));

  // Collect all unique members
  const membrosMap = new Map<number, string>();
  for (const p of sorted) {
    for (const r of p.rows) {
      membrosMap.set(r.membro_id, r.membro_nome);
    }
  }
  const membros = Array.from(membrosMap.entries()).sort((a, b) =>
    a[1].localeCompare(b[1], "pt-BR")
  );

  const headerCols = sorted
    .map(
      (p) =>
        `<th class="center">${monthShortName(p.mes)}<br/><span style="font-weight:400;font-size:10px">${p.ano}</span></th>`
    )
    .join("");

  let grandPago = 0;
  let grandPendente = 0;

  const dataRows = membros
    .map(([membroId, membroNome]) => {
      let totalPago = 0;
      let totalPendente = 0;

      const cols = sorted
        .map((p) => {
          const row = p.rows.find((r) => r.membro_id === membroId);
          if (!row || row.status !== "pago") {
            const deve = row ? row.valor : 0;
            totalPendente += deve;
            return `<td class="center"><span class="badge badge-pendente">Pendente</span></td>`;
          }
          totalPago += row.valor;
          return `<td class="center"><span class="badge badge-pago">Pago</span></td>`;
        })
        .join("");

      grandPago += totalPago;
      grandPendente += totalPendente;

      return `<tr>
        <td><div style="font-weight:600;">${escapeHTML(membroNome)}</div></td>
        ${cols}
        <td class="num pago">${totalPago > 0 ? formatMoney(totalPago) : "—"}</td>
        <td class="num pendente">${totalPendente > 0 ? formatMoney(totalPendente) : "—"}</td>
      </tr>`;
    })
    .join("");

  const footerCols = sorted.map(() => `<td></td>`).join("");

  const tabela =
    membros.length === 0
      ? `<div class="empty">Nenhum membro encontrado.</div>`
      : `<div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Membro</th>
              ${headerCols}
              <th class="num">Total Pago</th>
              <th class="num">Total Pendente</th>
            </tr>
          </thead>
          <tbody>${dataRows}</tbody>
          <tfoot>
            <tr>
              <td>Total</td>
              ${footerCols}
              <td class="num pago">${formatMoney(grandPago)}</td>
              <td class="num pendente">${formatMoney(grandPendente)}</td>
            </tr>
          </tfoot>
        </table>
      </div>`;

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<title>Mensalidades — ${escapeHTML(label)}</title>
<style>${STYLES}</style>
</head>
<body>
  <header>
    <h1>Mensalidades</h1>
    <div class="sub">${escapeHTML(label)}</div>
  </header>

  <h2>Membros × Meses</h2>
  ${tabela}

  <footer>
    <div class="totals">
      <div class="cell">
        <div class="label">Total Arrecadado</div>
        <div class="value entrada">${formatMoney(grandPago)}</div>
      </div>
      <div class="cell">
        <div class="label">Total Pendente</div>
        <div class="value saida">${formatMoney(grandPendente)}</div>
      </div>
    </div>
  </footer>

  <div class="meta">Gerado em ${nowBR()}</div>
</body>
</html>`;
}

export type PeriodoProdutoData = {
  mes: number;
  ano: number;
  rows: ProdutoRow[];
};

export function gerarHTMLProdutosMultiMes(
  periodos: PeriodoProdutoData[]
): string {
  if (periodos.length === 0) {
    return `<!DOCTYPE html><html><body><p>Sem dados.</p></body></html>`;
  }

  const sorted = [...periodos].sort((a, b) => a.ano !== b.ano ? a.ano - b.ano : a.mes - b.mes);
  const label = periodLabel(sorted.map((p) => ({ mes: p.mes, ano: p.ano })));

  const membrosMap = new Map<number, string>();
  for (const p of sorted) {
    for (const r of p.rows) {
      membrosMap.set(r.membro_id, r.membro_nome);
    }
  }
  const membros = Array.from(membrosMap.entries()).sort((a, b) =>
    a[1].localeCompare(b[1], "pt-BR")
  );

  const headerCols = sorted
    .map(
      (p) =>
        `<th class="center">${monthShortName(p.mes)}<br/><span style="font-weight:400;font-size:10px">${p.ano}</span></th>`
    )
    .join("");

  let grandPago = 0;
  let grandPendente = 0;

  const dataRows = membros
    .map(([membroId, membroNome]) => {
      let totalPago = 0;
      let totalPendente = 0;

      const cols = sorted
        .map((p) => {
          const row = p.rows.find((r) => r.membro_id === membroId);
          if (!row) {
            return `<td class="center"><span class="badge badge-pendente">Pendente</span></td>`;
          }
          if (row.status === "pago" || row.status === "doado") {
            totalPago += row.status === "doado" ? row.valor_cobrado : row.valor_pago;
            const cls = row.status === "doado" ? "badge-doado" : "badge-pago";
            const lbl = row.status === "doado" ? "Doado" : "Pago";
            return `<td class="center"><span class="badge ${cls}">${lbl}</span></td>`;
          }
          if (row.status === "parcial") {
            totalPago += row.valor_pago;
            totalPendente += Math.max(row.valor_cobrado - row.valor_pago, 0);
            return `<td class="center"><span class="badge badge-parcial">Parcial</span></td>`;
          }
          totalPendente += row.valor_cobrado;
          return `<td class="center"><span class="badge badge-pendente">Pendente</span></td>`;
        })
        .join("");

      grandPago += totalPago;
      grandPendente += totalPendente;

      return `<tr>
        <td><div style="font-weight:600;">${escapeHTML(membroNome)}</div></td>
        ${cols}
        <td class="num pago">${totalPago > 0 ? formatMoney(totalPago) : "—"}</td>
        <td class="num pendente">${totalPendente > 0 ? formatMoney(totalPendente) : "—"}</td>
      </tr>`;
    })
    .join("");

  const footerCols = sorted.map(() => `<td></td>`).join("");

  const tabela =
    membros.length === 0
      ? `<div class="empty">Nenhum membro encontrado.</div>`
      : `<div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Membro</th>
              ${headerCols}
              <th class="num">Total Pago</th>
              <th class="num">Total Pendente</th>
            </tr>
          </thead>
          <tbody>${dataRows}</tbody>
          <tfoot>
            <tr>
              <td>Total</td>
              ${footerCols}
              <td class="num pago">${formatMoney(grandPago)}</td>
              <td class="num pendente">${formatMoney(grandPendente)}</td>
            </tr>
          </tfoot>
        </table>
      </div>`;

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<title>Produtos — ${escapeHTML(label)}</title>
<style>${STYLES}</style>
</head>
<body>
  <header>
    <h1>Produtos de Limpeza</h1>
    <div class="sub">${escapeHTML(label)}</div>
  </header>

  <h2>Membros × Meses</h2>
  ${tabela}

  <footer>
    <div class="totals">
      <div class="cell">
        <div class="label">Total Pago</div>
        <div class="value entrada">${formatMoney(grandPago)}</div>
      </div>
      <div class="cell">
        <div class="label">Total Pendente</div>
        <div class="value saida">${formatMoney(grandPendente)}</div>
      </div>
    </div>
  </footer>

  <div class="meta">Gerado em ${nowBR()}</div>
</body>
</html>`;
}

// ─── WhatsApp text ────────────────────────────────────────────────────────────

export function gerarTextoResumoMensalidades(
  mes: number,
  ano: number,
  rows: MensalidadeRow[],
  totais: MensalidadeTotais
): string {
  const titulo = `*Gestão do Terreiro*\n📋 Mensalidades — ${formatMonthYear(mes, ano)}`;

  const linhas =
    rows.length === 0
      ? "_Nenhum membro registrado._"
      : rows
          .map((r) => {
            const icon = statusIcon(r.status);
            if (r.status === "pago") {
              return `${icon} ${r.membro_nome} — ${formatMoney(r.valor)}`;
            }
            return `${icon} ${r.membro_nome} — Pendente (deve ${formatMoney(r.valor)})`;
          })
          .join("\n");

  const resumo = [
    `💰 Previsto: ${formatMoney(totais.totalPrevisto)}`,
    `✅ Arrecadado: ${formatMoney(totais.totalArrecadado)}`,
    `⏳ Pendente: ${formatMoney(totais.totalPendente)}`,
    `📊 Adimplência: ${totais.adimplenciaPercent.toFixed(0)}% (${totais.qtdPagos}/${totais.qtdTotal})`,
  ].join("\n");

  return `${titulo}\n\n${linhas}\n\n${resumo}`;
}

export function gerarTextoResumoProdutos(
  mes: number,
  ano: number,
  rows: ProdutoRow[],
  totais: ProdutoTotais
): string {
  const titulo = `*Gestão do Terreiro*\n🧴 Produtos — ${formatMonthYear(mes, ano)}`;

  const linhas =
    rows.length === 0
      ? "_Nenhum membro registrado._"
      : rows
          .map((r) => {
            const icon = statusIcon(r.status);
            if (r.status === "pago") {
              return `${icon} ${r.membro_nome} — ${formatMoney(r.valor_cobrado)}`;
            }
            if (r.status === "parcial") {
              const falta = Math.max(r.valor_cobrado - r.valor_pago, 0);
              return `${icon} ${r.membro_nome} — ${formatMoney(r.valor_pago)} pago (falta ${formatMoney(falta)})`;
            }
            if (r.status === "doado") {
              return `${icon} ${r.membro_nome} — Doou produto`;
            }
            return `${icon} ${r.membro_nome} — Pendente (deve ${formatMoney(r.valor_cobrado)})`;
          })
          .join("\n");

  const resumo = [
    `💰 Cobrado: ${formatMoney(totais.totalCobrado)}`,
    `✅ Pago: ${formatMoney(totais.totalPago)}`,
    `⏳ Pendente: ${formatMoney(totais.totalPendente)}`,
    `📊 Adimplência: ${totais.adimplenciaPercent.toFixed(0)}% (${totais.qtdPagos}/${totais.qtdTotal})`,
  ].join("\n");

  return `${titulo}\n\n${linhas}\n\n${resumo}`;
}

export type PeriodoMensalidade = {
  mes: number;
  ano: number;
  rows: MensalidadeRow[];
  totais: MensalidadeTotais;
};

export function gerarTextoResumoMensalidadesMultiMes(
  periodos: PeriodoMensalidade[]
): string {
  if (periodos.length === 0) return "*Nenhum dado encontrado.*";

  const sorted = [...periodos].sort((a, b) => a.ano !== b.ano ? a.ano - b.ano : a.mes - b.mes);
  const label = periodLabel(sorted.map((p) => ({ mes: p.mes, ano: p.ano })));
  const titulo = `*Gestão do Terreiro*\n📋 Mensalidades — ${label}`;

  // Aggregate per member
  const membrosMap = new Map<number, string>();
  for (const p of sorted) {
    for (const r of p.rows) membrosMap.set(r.membro_id, r.membro_nome);
  }
  const membros = Array.from(membrosMap.entries()).sort((a, b) =>
    a[1].localeCompare(b[1], "pt-BR")
  );

  const linhas = membros.map(([membroId, membroNome]) => {
    const mesesPendentes: string[] = [];
    let totalPago = 0;
    let totalPendente = 0;

    for (const p of sorted) {
      const row = p.rows.find((r) => r.membro_id === membroId);
      if (!row || row.status !== "pago") {
        mesesPendentes.push(monthName(p.mes));
        totalPendente += row ? row.valor : 0;
      } else {
        totalPago += row.valor;
      }
    }

    if (mesesPendentes.length === 0) {
      return `✅ ${membroNome} — em dia!\n   Pago: ${formatMoney(totalPago)}`;
    }
    return [
      `⏳ ${membroNome}`,
      `   Pendente: ${mesesPendentes.join(", ")}`,
      `   ✅ Pago: ${formatMoney(totalPago)} | ⏳ Deve: ${formatMoney(totalPendente)}`,
    ].join("\n");
  }).join("\n\n");

  const grandPago = periodos.reduce((s, p) => s + p.totais.totalArrecadado, 0);
  const grandPendente = periodos.reduce((s, p) => s + p.totais.totalPendente, 0);
  const grandTotal = membros.length * sorted.length;
  const grandPagos = periodos.reduce((s, p) => s + p.totais.qtdPagos, 0);

  const resumo = [
    `*Resumo geral:*`,
    `✅ Total arrecadado: ${formatMoney(grandPago)}`,
    `⏳ Total pendente: ${formatMoney(grandPendente)}`,
    `📊 Adimplência: ${grandTotal > 0 ? ((grandPagos / grandTotal) * 100).toFixed(0) : 0}%`,
  ].join("\n");

  return `${titulo}\n\n${linhas}\n\n${resumo}`;
}

export type PeriodoProduto = {
  mes: number;
  ano: number;
  rows: ProdutoRow[];
  totais: ProdutoTotais;
};

export function gerarTextoResumoProdutosMultiMes(
  periodos: PeriodoProduto[]
): string {
  if (periodos.length === 0) return "*Nenhum dado encontrado.*";

  const sorted = [...periodos].sort((a, b) => a.ano !== b.ano ? a.ano - b.ano : a.mes - b.mes);
  const label = periodLabel(sorted.map((p) => ({ mes: p.mes, ano: p.ano })));
  const titulo = `*Gestão do Terreiro*\n🧴 Produtos — ${label}`;

  const membrosMap = new Map<number, string>();
  for (const p of sorted) {
    for (const r of p.rows) membrosMap.set(r.membro_id, r.membro_nome);
  }
  const membros = Array.from(membrosMap.entries()).sort((a, b) =>
    a[1].localeCompare(b[1], "pt-BR")
  );

  const linhas = membros.map(([membroId, membroNome]) => {
    const mesesPendentes: string[] = [];
    let totalPago = 0;
    let totalPendente = 0;

    for (const p of sorted) {
      const row = p.rows.find((r) => r.membro_id === membroId);
      if (!row) {
        mesesPendentes.push(monthName(p.mes));
      } else if (row.status === "pago" || row.status === "doado") {
        totalPago += row.status === "doado" ? row.valor_cobrado : row.valor_pago;
      } else if (row.status === "parcial") {
        totalPago += row.valor_pago;
        totalPendente += Math.max(row.valor_cobrado - row.valor_pago, 0);
        mesesPendentes.push(`${monthName(p.mes)} (parcial)`);
      } else {
        totalPendente += row.valor_cobrado;
        mesesPendentes.push(monthName(p.mes));
      }
    }

    if (mesesPendentes.length === 0) {
      return `✅ ${membroNome} — em dia!\n   Pago: ${formatMoney(totalPago)}`;
    }
    return [
      `⏳ ${membroNome}`,
      `   Pendente: ${mesesPendentes.join(", ")}`,
      `   ✅ Pago: ${formatMoney(totalPago)} | ⏳ Deve: ${formatMoney(totalPendente)}`,
    ].join("\n");
  }).join("\n\n");

  const grandPago = periodos.reduce((s, p) => s + p.totais.totalPago, 0);
  const grandPendente = periodos.reduce((s, p) => s + p.totais.totalPendente, 0);

  const resumo = [
    `*Resumo geral:*`,
    `✅ Total pago: ${formatMoney(grandPago)}`,
    `⏳ Total pendente: ${formatMoney(grandPendente)}`,
  ].join("\n");

  return `${titulo}\n\n${linhas}\n\n${resumo}`;
}

export function gerarTextoResumoPlanilha(
  planilha: Planilha,
  linhas: LinhaPlanilha[],
  totais: PlanilhaTotais
): string {
  const periodo = periodoSubtitulo(planilha);
  const titulo = `*Gestão do Terreiro*\n📋 ${planilha.nome} — ${periodo}`;

  const linhasTexto =
    linhas.length === 0
      ? "_Sem lançamentos._"
      : linhas
          .map((l) => {
            const icon = statusIcon(l.status);
            if (l.status === "pago") {
              return `${icon} ${l.nome} — ${formatMoney(l.valor_pago)}`;
            }
            if (l.status === "parcial") {
              const falta = Math.max(l.valor_cobrado - l.valor_pago, 0);
              return `${icon} ${l.nome} — ${formatMoney(l.valor_pago)} pago (falta ${formatMoney(falta)})`;
            }
            if (l.status === "doado") {
              return `${icon} ${l.nome} — Doado`;
            }
            return `${icon} ${l.nome} — Pendente (${formatMoney(l.valor_cobrado)})`;
          })
          .join("\n");

  const resumo = [
    `💰 Cobrado: ${formatMoney(totais.totalCobrado)}`,
    `✅ Pago: ${formatMoney(totais.totalPago)}`,
    `⏳ Pendente: ${formatMoney(totais.totalPendente)}`,
  ].join("\n");

  return `${titulo}\n\n${linhasTexto}\n\n${resumo}`;
}

export async function compartilharViaWhatsApp(texto: string): Promise<void> {
  const url = `whatsapp://send?text=${encodeURIComponent(texto)}`;
  const suportado = await Linking.canOpenURL(url);
  if (!suportado) {
    throw new Error("WhatsApp não está instalado neste dispositivo.");
  }
  await Linking.openURL(url);
}
