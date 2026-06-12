import { useCallback, useState } from "react";
import { Linking, Platform } from "react-native";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { useSQLiteContext } from "expo-sqlite";
import type {
  LinhaPlanilha,
  Planilha,
  StatusPagamento,
} from "@/types/models";
import type { PlanilhaTotais } from "./usePlanilha";
import type { MensalidadeRow, MensalidadeTotais } from "./useMensalidades";
import type { ProdutoRow, ProdutoTotais } from "./useProdutos";
import {
  gerarHTMLMensalidades,
  gerarHTMLMensalidadesMultiMes,
  gerarHTMLPlanilha,
  gerarHTMLProdutos,
  gerarHTMLProdutosMultiMes,
  gerarTextoResumoMensalidades,
  gerarTextoResumoMensalidadesMultiMes,
  gerarTextoResumoPlanilha,
  gerarTextoResumoProdutos,
  gerarTextoResumoProdutosMultiMes,
} from "@/utils/pdf";
import { formatMonthYear } from "@/utils/format";

export type UseExportResult = {
  exportarPlanilha: (planilhaId: number) => Promise<void>;
  exportarMensalidades: (mes: number, ano: number) => Promise<void>;
  exportarMensalidadesMultiMes: (meses: Array<{ mes: number; ano: number }>) => Promise<void>;
  exportarProdutos: (mes: number, ano: number) => Promise<void>;
  exportarProdutosMultiMes: (meses: Array<{ mes: number; ano: number }>) => Promise<void>;
  compartilharResumoPlanilha: (planilhaId: number) => Promise<void>;
  compartilharResumoMensalidades: (mes: number, ano: number) => Promise<void>;
  compartilharResumoMensalidadesMultiMes: (meses: Array<{ mes: number; ano: number }>) => Promise<void>;
  compartilharResumoProdutos: (mes: number, ano: number) => Promise<void>;
  compartilharResumoProdutosMultiMes: (meses: Array<{ mes: number; ano: number }>) => Promise<void>;
  compartilharViaWhatsApp: (texto: string) => Promise<void>;
  exporting: boolean;
  error: string | null;
};

type MensalidadeJoinRow = {
  membro_id: number;
  membro_nome: string;
  mensalidade_id: number | null;
  valor: number | null;
  status: StatusPagamento | null;
  data_pagamento: string | null;
};

type ProdutoJoinRow = {
  membro_id: number;
  membro_nome: string;
  produto_id: number | null;
  valor_cobrado: number | null;
  valor_pago: number | null;
  status: StatusPagamento | null;
  data_pagamento: string | null;
  nome_produto_doado: string | null;
};

type ConfigRow = { valor: string | null };

function sanitizeFilename(input: string): string {
  const base = input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 60);
  return base || "documento";
}

function computeTotaisPlanilha(linhas: LinhaPlanilha[]): PlanilhaTotais {
  let entradas = 0;
  let saidas = 0;
  let totalCobrado = 0;
  let totalPago = 0;
  for (const l of linhas) {
    if (l.tipo === "entrada") entradas += l.valor;
    else saidas += l.valor;
    totalCobrado += l.valor_cobrado;
    totalPago += l.valor_pago;
  }
  return {
    entradas,
    saidas,
    saldo: entradas - saidas,
    totalCobrado,
    totalPago,
    totalPendente: totalCobrado - totalPago,
  };
}

function computeTotaisMensalidades(rows: MensalidadeRow[]): MensalidadeTotais {
  const totalArrecadado = rows
    .filter((r) => r.status === "pago")
    .reduce((sum, r) => sum + r.valor, 0);
  const totalPendente = rows
    .filter((r) => r.status !== "pago")
    .reduce((sum, r) => sum + r.valor, 0);
  const qtdPagos = rows.filter((r) => r.status === "pago").length;
  const qtdPendentes = rows.length - qtdPagos;
  const adimplenciaPercent =
    rows.length === 0 ? 0 : (qtdPagos / rows.length) * 100;
  return {
    totalArrecadado,
    totalPendente,
    totalPrevisto: totalArrecadado + totalPendente,
    qtdPagos,
    qtdPendentes,
    qtdTotal: rows.length,
    adimplenciaPercent,
  };
}

function computeTotaisProdutos(rows: ProdutoRow[]): ProdutoTotais {
  let totalCobrado = 0;
  let totalPago = 0;
  let qtdPagos = 0;
  let qtdParciais = 0;
  let qtdPendentes = 0;
  let qtdDoados = 0;
  for (const r of rows) {
    totalCobrado += r.valor_cobrado;
    totalPago += r.valor_pago;
    if (r.status === "doado") { qtdPagos += 1; qtdDoados += 1; }
    else if (r.status === "pago") qtdPagos += 1;
    else if (r.status === "parcial") qtdParciais += 1;
    else qtdPendentes += 1;
  }
  const adimplenciaPercent =
    rows.length === 0 ? 0 : (qtdPagos / rows.length) * 100;
  return {
    totalCobrado,
    totalPago,
    totalPendente: Math.max(totalCobrado - totalPago, 0),
    qtdPagos,
    qtdParciais,
    qtdPendentes,
    qtdDoados,
    qtdTotal: rows.length,
    adimplenciaPercent,
  };
}

async function gerarPDFeCompartilhar(
  html: string,
  filename: string
): Promise<void> {
  const { uri } = await Print.printToFileAsync({ html, base64: false });
  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) {
    throw new Error("Compartilhamento indisponível neste dispositivo.");
  }
  await Sharing.shareAsync(uri, {
    mimeType: "application/pdf",
    dialogTitle: filename,
    UTI: Platform.OS === "ios" ? "com.adobe.pdf" : undefined,
  });
}

async function abrirWhatsApp(texto: string): Promise<void> {
  const url = `whatsapp://send?text=${encodeURIComponent(texto)}`;
  const supported = await Linking.canOpenURL(url);
  if (!supported) {
    throw new Error("WhatsApp não está instalado neste dispositivo.");
  }
  await Linking.openURL(url);
}

export function useExport(): UseExportResult {
  const db = useSQLiteContext();
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const carregarValoresPadrao = useCallback(async (): Promise<{ mensalidade: number; produto: number }> => {
    const [cfgM, cfgP] = await Promise.all([
      db.getFirstAsync<ConfigRow>(`SELECT valor FROM configuracoes WHERE chave = 'valor_padrao_mensalidade'`),
      db.getFirstAsync<ConfigRow>(`SELECT valor FROM configuracoes WHERE chave = 'valor_padrao_produto'`),
    ]);
    return {
      mensalidade: parseFloat(cfgM?.valor ?? "0") || 0,
      produto: parseFloat(cfgP?.valor ?? "0") || 0,
    };
  }, [db]);

  const carregarPlanilha = useCallback(
    async (planilhaId: number): Promise<{ planilha: Planilha; linhas: LinhaPlanilha[] }> => {
      const planilha = await db.getFirstAsync<Planilha>(
        `SELECT id, nome, tipo_modulo, orixa_id, categoria_id, mes, ano, created_at
         FROM planilhas WHERE id = ?`,
        planilhaId
      );
      if (!planilha) throw new Error("Planilha não encontrada.");
      const linhas = await db.getAllAsync<LinhaPlanilha>(
        `SELECT id, planilha_id, nome, valor, valor_cobrado, valor_pago, tipo, status, data, observacao
         FROM linhas_planilha
         WHERE planilha_id = ?
         ORDER BY COALESCE(data, '') DESC, id DESC`,
        planilhaId
      );
      return { planilha, linhas };
    },
    [db]
  );

  const carregarMensalidades = useCallback(
    async (mes: number, ano: number, valorPadrao = 0): Promise<MensalidadeRow[]> => {
      const raw = await db.getAllAsync<MensalidadeJoinRow>(
        `SELECT
           m.id AS membro_id,
           m.nome AS membro_nome,
           ms.id AS mensalidade_id,
           ms.valor AS valor,
           ms.status AS status,
           ms.data_pagamento AS data_pagamento
         FROM membros m
         LEFT JOIN mensalidades ms
           ON ms.membro_id = m.id AND ms.mes = ? AND ms.ano = ?
         WHERE m.ativo = 1
            OR ms.id IS NOT NULL
         ORDER BY m.ativo DESC, m.nome COLLATE NOCASE ASC`,
        mes,
        ano
      );
      return raw.map((r) => ({
        membro_id: r.membro_id,
        membro_nome: r.membro_nome,
        mensalidade_id: r.mensalidade_id,
        valor: r.mensalidade_id === null ? valorPadrao : (r.valor ?? 0),
        status: (r.status ?? "pendente") as StatusPagamento,
        data_pagamento: r.data_pagamento,
      }));
    },
    [db]
  );

  const carregarProdutos = useCallback(
    async (mes: number, ano: number, valorPadrao = 0): Promise<ProdutoRow[]> => {
      const raw = await db.getAllAsync<ProdutoJoinRow>(
        `SELECT
           m.id AS membro_id,
           m.nome AS membro_nome,
           p.id AS produto_id,
           p.valor_cobrado AS valor_cobrado,
           p.valor_pago AS valor_pago,
           p.status AS status,
           p.data_pagamento AS data_pagamento,
           p.nome_produto_doado AS nome_produto_doado
         FROM membros m
         LEFT JOIN produtos_limpeza p
           ON p.membro_id = m.id AND p.mes = ? AND p.ano = ?
         WHERE m.ativo = 1
            OR p.id IS NOT NULL
         ORDER BY m.ativo DESC, m.nome COLLATE NOCASE ASC`,
        mes,
        ano
      );
      return raw.map((r) => ({
        membro_id: r.membro_id,
        membro_nome: r.membro_nome,
        produto_id: r.produto_id,
        valor_cobrado: r.produto_id === null ? valorPadrao : (r.valor_cobrado ?? 0),
        valor_pago: r.valor_pago ?? 0,
        status: (r.status ?? "pendente") as StatusPagamento,
        data_pagamento: r.data_pagamento,
        nome_produto_doado: r.nome_produto_doado,
      }));
    },
    [db]
  );

  const exportarPlanilha = useCallback(
    async (planilhaId: number): Promise<void> => {
      setExporting(true);
      setError(null);
      try {
        const { planilha, linhas } = await carregarPlanilha(planilhaId);
        const totais = computeTotaisPlanilha(linhas);
        const html = gerarHTMLPlanilha(planilha, linhas, totais);
        await gerarPDFeCompartilhar(html, sanitizeFilename(planilha.nome));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Falha ao exportar.");
        throw e;
      } finally {
        setExporting(false);
      }
    },
    [carregarPlanilha]
  );

  const exportarMensalidades = useCallback(
    async (mes: number, ano: number): Promise<void> => {
      setExporting(true);
      setError(null);
      try {
        const { mensalidade: valorPadrao } = await carregarValoresPadrao();
        const rows = await carregarMensalidades(mes, ano, valorPadrao);
        const totais = computeTotaisMensalidades(rows);
        const html = gerarHTMLMensalidades(mes, ano, rows, totais);
        await gerarPDFeCompartilhar(
          html,
          sanitizeFilename(`mensalidades_${formatMonthYear(mes, ano)}`)
        );
      } catch (e) {
        setError(e instanceof Error ? e.message : "Falha ao exportar.");
        throw e;
      } finally {
        setExporting(false);
      }
    },
    [carregarMensalidades, carregarValoresPadrao]
  );

  const exportarMensalidadesMultiMes = useCallback(
    async (meses: Array<{ mes: number; ano: number }>): Promise<void> => {
      setExporting(true);
      setError(null);
      try {
        const { mensalidade: valorPadrao } = await carregarValoresPadrao();
        const periodos = await Promise.all(
          meses.map(async ({ mes, ano }) => {
            const rows = await carregarMensalidades(mes, ano, valorPadrao);
            return { mes, ano, rows };
          })
        );
        const html = gerarHTMLMensalidadesMultiMes(periodos);
        await gerarPDFeCompartilhar(html, sanitizeFilename("mensalidades_periodo"));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Falha ao exportar.");
        throw e;
      } finally {
        setExporting(false);
      }
    },
    [carregarMensalidades, carregarValoresPadrao]
  );

  const exportarProdutos = useCallback(
    async (mes: number, ano: number): Promise<void> => {
      setExporting(true);
      setError(null);
      try {
        const { produto: valorPadrao } = await carregarValoresPadrao();
        const rows = await carregarProdutos(mes, ano, valorPadrao);
        const totais = computeTotaisProdutos(rows);
        const html = gerarHTMLProdutos(mes, ano, rows, totais);
        await gerarPDFeCompartilhar(
          html,
          sanitizeFilename(`produtos_${formatMonthYear(mes, ano)}`)
        );
      } catch (e) {
        setError(e instanceof Error ? e.message : "Falha ao exportar.");
        throw e;
      } finally {
        setExporting(false);
      }
    },
    [carregarProdutos, carregarValoresPadrao]
  );

  const exportarProdutosMultiMes = useCallback(
    async (meses: Array<{ mes: number; ano: number }>): Promise<void> => {
      setExporting(true);
      setError(null);
      try {
        const { produto: valorPadrao } = await carregarValoresPadrao();
        const periodos = await Promise.all(
          meses.map(async ({ mes, ano }) => {
            const rows = await carregarProdutos(mes, ano, valorPadrao);
            return { mes, ano, rows };
          })
        );
        const html = gerarHTMLProdutosMultiMes(periodos);
        await gerarPDFeCompartilhar(html, sanitizeFilename("produtos_periodo"));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Falha ao exportar.");
        throw e;
      } finally {
        setExporting(false);
      }
    },
    [carregarProdutos, carregarValoresPadrao]
  );

  const compartilharViaWhatsApp = useCallback(
    async (texto: string): Promise<void> => {
      setError(null);
      try {
        await abrirWhatsApp(texto);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Falha ao abrir o WhatsApp.");
        throw e;
      }
    },
    []
  );

  const compartilharResumoPlanilha = useCallback(
    async (planilhaId: number): Promise<void> => {
      setExporting(true);
      setError(null);
      try {
        const { planilha, linhas } = await carregarPlanilha(planilhaId);
        const totais = computeTotaisPlanilha(linhas);
        const texto = gerarTextoResumoPlanilha(planilha, linhas, totais);
        await abrirWhatsApp(texto);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Falha ao gerar o resumo.");
        throw e;
      } finally {
        setExporting(false);
      }
    },
    [carregarPlanilha]
  );

  const compartilharResumoMensalidades = useCallback(
    async (mes: number, ano: number): Promise<void> => {
      setExporting(true);
      setError(null);
      try {
        const { mensalidade: valorPadrao } = await carregarValoresPadrao();
        const rows = await carregarMensalidades(mes, ano, valorPadrao);
        const totais = computeTotaisMensalidades(rows);
        const texto = gerarTextoResumoMensalidades(mes, ano, rows, totais);
        await abrirWhatsApp(texto);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Falha ao gerar o resumo.");
        throw e;
      } finally {
        setExporting(false);
      }
    },
    [carregarMensalidades, carregarValoresPadrao]
  );

  const compartilharResumoMensalidadesMultiMes = useCallback(
    async (meses: Array<{ mes: number; ano: number }>): Promise<void> => {
      setExporting(true);
      setError(null);
      try {
        const { mensalidade: valorPadrao } = await carregarValoresPadrao();
        const periodos = await Promise.all(
          meses.map(async ({ mes, ano }) => {
            const rows = await carregarMensalidades(mes, ano, valorPadrao);
            const totais = computeTotaisMensalidades(rows);
            return { mes, ano, rows, totais };
          })
        );
        const texto = gerarTextoResumoMensalidadesMultiMes(periodos);
        await abrirWhatsApp(texto);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Falha ao gerar o resumo.");
        throw e;
      } finally {
        setExporting(false);
      }
    },
    [carregarMensalidades, carregarValoresPadrao]
  );

  const compartilharResumoProdutos = useCallback(
    async (mes: number, ano: number): Promise<void> => {
      setExporting(true);
      setError(null);
      try {
        const { produto: valorPadrao } = await carregarValoresPadrao();
        const rows = await carregarProdutos(mes, ano, valorPadrao);
        const totais = computeTotaisProdutos(rows);
        const texto = gerarTextoResumoProdutos(mes, ano, rows, totais);
        await abrirWhatsApp(texto);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Falha ao gerar o resumo.");
        throw e;
      } finally {
        setExporting(false);
      }
    },
    [carregarProdutos, carregarValoresPadrao]
  );

  const compartilharResumoProdutosMultiMes = useCallback(
    async (meses: Array<{ mes: number; ano: number }>): Promise<void> => {
      setExporting(true);
      setError(null);
      try {
        const { produto: valorPadrao } = await carregarValoresPadrao();
        const periodos = await Promise.all(
          meses.map(async ({ mes, ano }) => {
            const rows = await carregarProdutos(mes, ano, valorPadrao);
            const totais = computeTotaisProdutos(rows);
            return { mes, ano, rows, totais };
          })
        );
        const texto = gerarTextoResumoProdutosMultiMes(periodos);
        await abrirWhatsApp(texto);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Falha ao gerar o resumo.");
        throw e;
      } finally {
        setExporting(false);
      }
    },
    [carregarProdutos, carregarValoresPadrao]
  );

  return {
    exportarPlanilha,
    exportarMensalidades,
    exportarMensalidadesMultiMes,
    exportarProdutos,
    exportarProdutosMultiMes,
    compartilharResumoPlanilha,
    compartilharResumoMensalidades,
    compartilharResumoMensalidadesMultiMes,
    compartilharResumoProdutos,
    compartilharResumoProdutosMultiMes,
    compartilharViaWhatsApp,
    exporting,
    error,
  };
}
