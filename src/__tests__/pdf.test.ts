import { gerarHTMLMensalidades, gerarHTMLPlanilha } from "@/utils/pdf";
import type { LinhaPlanilha, Planilha } from "@/types/models";

describe("pdf.gerarHTMLPlanilha", () => {
  beforeAll(() => {
    jest.useFakeTimers().setSystemTime(new Date("2026-05-17T10:30:00"));
  });
  afterAll(() => jest.useRealTimers());

  const planilha: Planilha = {
    id: 1,
    nome: "Despesas Maio",
    tipo_modulo: "geral",
    orixa_id: null,
    categoria_id: null,
    mes: 5,
    ano: 2026,
    created_at: "2026-05-01 00:00:00",
  };

  const linhas: LinhaPlanilha[] = [
    {
      id: 1,
      planilha_id: 1,
      nome: "Doação",
      valor: 500,
      valor_cobrado: 500,
      valor_pago: 500,
      tipo: "entrada",
      status: "pago",
      data: "2026-05-10",
      observacao: null,
    },
    {
      id: 2,
      planilha_id: 1,
      nome: "Compra papelaria",
      valor: 75.5,
      valor_cobrado: 75.5,
      valor_pago: 0,
      tipo: "saida",
      status: "pendente",
      data: "2026-05-12",
      observacao: "obs",
    },
  ];

  const totais = {
    entradas: 500,
    saidas: 75.5,
    saldo: 424.5,
    totalCobrado: 575.5,
    totalPago: 500,
    totalPendente: 75.5,
  };

  it("inclui título, dados e totais formatados em pt-BR", () => {
    const html = gerarHTMLPlanilha(planilha, linhas, totais);

    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("Despesas Maio");
    expect(html).toContain("Maio de 2026");
    expect(html).toContain("Doação");
    expect(html).toContain("Compra papelaria");
    expect(html).toContain("Entrada");
    expect(html).toContain("Saída");
    expect(html).toContain("Pago");
    expect(html).toContain("Pendente");

    expect(html).toMatch(/R\$\s*500,00/);
    expect(html).toMatch(/R\$\s*75,50/);
    expect(html).toMatch(/R\$\s*424,50/);
    expect(html).toContain("10/05/2026");
  });

  it("renderiza empty state quando planilha vazia", () => {
    const html = gerarHTMLPlanilha(planilha, [], {
      entradas: 0,
      saidas: 0,
      saldo: 0,
      totalCobrado: 0,
      totalPago: 0,
      totalPendente: 0,
    });
    expect(html).toContain("Sem lançamentos registrados");
    expect(html).not.toContain("<tbody>");
  });

  it("escapa HTML em nomes e observações (anti-XSS no template)", () => {
    const malicioso: LinhaPlanilha[] = [
      {
        id: 1,
        planilha_id: 1,
        nome: "<script>alert(1)</script>",
        valor: 10,
        valor_cobrado: 10,
        valor_pago: 10,
        tipo: "saida",
        status: "pago",
        data: null,
        observacao: "\"aspas\" & <tag>",
      },
    ];
    const html = gerarHTMLPlanilha(planilha, malicioso, {
      entradas: 0,
      saidas: 10,
      saldo: -10,
      totalCobrado: 10,
      totalPago: 10,
      totalPendente: 0,
    });
    expect(html).not.toMatch(/<script>alert\(1\)<\/script>/);
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("&quot;aspas&quot;");
    expect(html).toContain("&amp;");
  });

  it("snapshot estável (data congelada)", () => {
    const html = gerarHTMLPlanilha(planilha, linhas, totais);
    expect(html).toMatchSnapshot();
  });
});

describe("pdf.gerarHTMLMensalidades", () => {
  beforeAll(() => {
    jest.useFakeTimers().setSystemTime(new Date("2026-05-17T10:30:00"));
  });
  afterAll(() => jest.useRealTimers());

  it("inclui título do mês, status e adimplência", () => {
    const html = gerarHTMLMensalidades(
      5,
      2026,
      [
        {
          membro_id: 1,
          membro_nome: "Ana",
          mensalidade_id: 10,
          valor: 100,
          status: "pago",
          data_pagamento: "2026-05-05",
        },
        {
          membro_id: 2,
          membro_nome: "Bruno",
          mensalidade_id: 11,
          valor: 100,
          status: "pendente",
          data_pagamento: null,
        },
      ],
      {
        totalArrecadado: 100,
        totalPendente: 100,
        totalPrevisto: 200,
        qtdPagos: 1,
        qtdPendentes: 1,
        qtdTotal: 2,
        adimplenciaPercent: 50,
      }
    );

    expect(html).toContain("Maio de 2026");
    expect(html).toContain("Ana");
    expect(html).toContain("Bruno");
    expect(html).toMatch(/50%\s*\(1\/2\)/);
    expect(html).toContain("05/05/2026");
  });

  it("renderiza empty state sem membros", () => {
    const html = gerarHTMLMensalidades(5, 2026, [], {
      totalArrecadado: 0,
      totalPendente: 0,
      totalPrevisto: 0,
      qtdPagos: 0,
      qtdPendentes: 0,
      qtdTotal: 0,
      adimplenciaPercent: 0,
    });
    expect(html).toContain("Nenhum membro encontrado");
  });
});
