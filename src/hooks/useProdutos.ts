import { useCallback, useEffect, useMemo, useState } from "react";
import { useSQLiteContext } from "expo-sqlite";
import type { StatusPagamento } from "@/types/models";

export type ProdutoRow = {
  membro_id: number;
  membro_nome: string;
  produto_id: number | null;
  valor_cobrado: number;
  valor_pago: number;
  status: StatusPagamento;
  data_pagamento: string | null;
  nome_produto_doado: string | null;
};

export type ProdutoTotais = {
  totalCobrado: number;
  totalPago: number;
  totalPendente: number;
  qtdPagos: number;
  qtdParciais: number;
  qtdPendentes: number;
  qtdDoados: number;
  qtdTotal: number;
  adimplenciaPercent: number;
};

export type RegistrarPagamentoProdutoInput = {
  membroId: number;
  mes: number;
  ano: number;
  valor: number;
  dataPagamento?: string;
};

export type MarcarPendenteProdutoInput = {
  membroId: number;
  mes: number;
  ano: number;
};

export type AtualizarValorProdutoInput = {
  membroId: number;
  mes: number;
  ano: number;
  valorCobrado: number;
};

export type DefinirCotaPadraoInput = {
  mes: number;
  ano: number;
  valorCobrado: number;
};

export type RegistrarDoacaoProdutoInput = {
  membroId: number;
  mes: number;
  ano: number;
  nomeProduto: string;
  dataPagamento?: string;
};

export type UseProdutosResult = {
  rows: ProdutoRow[];
  totais: ProdutoTotais;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  registrarPagamento: (input: RegistrarPagamentoProdutoInput) => Promise<void>;
  marcarPendente: (input: MarcarPendenteProdutoInput) => Promise<void>;
  atualizarValor: (input: AtualizarValorProdutoInput) => Promise<void>;
  definirCotaPadrao: (input: DefinirCotaPadraoInput) => Promise<void>;
  registrarDoacao: (input: RegistrarDoacaoProdutoInput) => Promise<void>;
};

type RawJoinRow = {
  membro_id: number;
  membro_nome: string;
  produto_id: number | null;
  valor_cobrado: number | null;
  valor_pago: number | null;
  status: StatusPagamento | null;
  data_pagamento: string | null;
  nome_produto_doado: string | null;
};

function isoDateToday(): string {
  return new Date().toISOString().slice(0, 10);
}

function isFiniteNonNegative(n: number): boolean {
  return Number.isFinite(n) && n >= 0;
}

function statusFor(valorPago: number, valorCobrado: number): StatusPagamento {
  if (valorCobrado > 0 && valorPago >= valorCobrado) return "pago";
  if (valorPago > 0) return "parcial";
  return "pendente";
}

export function useProdutos(
  mes: number,
  ano: number,
  valorPadrao: number = 0
): UseProdutosResult {
  const db = useSQLiteContext();
  const [rows, setRows] = useState<ProdutoRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const raw = await db.getAllAsync<RawJoinRow>(
        `SELECT
           m.id AS membro_id,
           m.nome AS membro_nome,
           pl.id AS produto_id,
           pl.valor_cobrado AS valor_cobrado,
           pl.valor_pago AS valor_pago,
           pl.status AS status,
           pl.data_pagamento AS data_pagamento,
           pl.nome_produto_doado AS nome_produto_doado
         FROM membros m
         LEFT JOIN produtos_limpeza pl
           ON pl.membro_id = m.id AND pl.mes = ? AND pl.ano = ?
         WHERE m.ativo = 1
            OR pl.id IS NOT NULL
         ORDER BY m.ativo DESC, m.nome COLLATE NOCASE ASC`,
        mes,
        ano
      );

      const mapped: ProdutoRow[] = raw.map((r) => ({
        membro_id: r.membro_id,
        membro_nome: r.membro_nome,
        produto_id: r.produto_id,
        valor_cobrado: r.produto_id === null ? valorPadrao : (r.valor_cobrado ?? 0),
        valor_pago: r.valor_pago ?? 0,
        status: (r.status ?? "pendente") as StatusPagamento,
        data_pagamento: r.data_pagamento,
        nome_produto_doado: r.nome_produto_doado,
      }));
      setRows(mapped);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Falha ao carregar produtos"
      );
    } finally {
      setLoading(false);
    }
  }, [db, mes, ano]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const upsertProduto = useCallback(
    async (
      membroId: number,
      m: number,
      a: number,
      valorCobrado: number,
      valorPago: number,
      status: StatusPagamento,
      dataPagamento: string | null,
      nomeProdutoDoado: string | null
    ): Promise<void> => {
      await db.runAsync(
        `INSERT INTO produtos_limpeza (mes, ano, membro_id, valor_cobrado, valor_pago, status, data_pagamento, nome_produto_doado)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(mes, ano, membro_id) DO UPDATE SET
           valor_cobrado = excluded.valor_cobrado,
           valor_pago = excluded.valor_pago,
           status = excluded.status,
           data_pagamento = excluded.data_pagamento,
           nome_produto_doado = excluded.nome_produto_doado`,
        m,
        a,
        membroId,
        valorCobrado,
        valorPago,
        status,
        dataPagamento,
        nomeProdutoDoado
      );
    },
    [db]
  );

  const registrarPagamento = useCallback(
    async ({
      membroId,
      mes: m,
      ano: a,
      valor,
      dataPagamento,
    }: RegistrarPagamentoProdutoInput) => {
      if (!isFiniteNonNegative(valor)) {
        throw new Error("Valor inválido");
      }
      const existing = rows.find((r) => r.membro_id === membroId);
      const cobrado = existing?.valor_cobrado ?? 0;
      const pagoAnterior = existing?.status === "doado" ? 0 : existing?.valor_pago ?? 0;
      const acumulado = pagoAnterior + valor;
      const novoPago = cobrado > 0 ? Math.min(acumulado, cobrado) : acumulado;
      const novoStatus = statusFor(novoPago, cobrado);
      const data =
        novoStatus === "pendente" ? null : dataPagamento ?? isoDateToday();
      await upsertProduto(membroId, m, a, cobrado, novoPago, novoStatus, data, null);
      await reload();
    },
    [rows, upsertProduto, reload]
  );

  const marcarPendente = useCallback(
    async ({ membroId, mes: m, ano: a }: MarcarPendenteProdutoInput) => {
      const existing = rows.find((r) => r.membro_id === membroId);
      const cobrado = existing?.valor_cobrado ?? 0;
      await upsertProduto(membroId, m, a, cobrado, 0, "pendente", null, null);
      await reload();
    },
    [rows, upsertProduto, reload]
  );

  const atualizarValor = useCallback(
    async ({
      membroId,
      mes: m,
      ano: a,
      valorCobrado,
    }: AtualizarValorProdutoInput) => {
      if (!isFiniteNonNegative(valorCobrado)) {
        throw new Error("Valor inválido");
      }
      const existing = rows.find((r) => r.membro_id === membroId);
      if (existing?.status === "doado") {
        await upsertProduto(
          membroId,
          m,
          a,
          valorCobrado,
          valorCobrado,
          "doado",
          existing.data_pagamento ?? isoDateToday(),
          existing.nome_produto_doado
        );
        await reload();
        return;
      }
      const pagoAtual = existing?.valor_pago ?? 0;
      const novoPago = valorCobrado > 0 ? Math.min(pagoAtual, valorCobrado) : 0;
      const novoStatus = statusFor(novoPago, valorCobrado);
      const dataPagamento =
        novoStatus === "pendente"
          ? null
          : existing?.data_pagamento ?? isoDateToday();
      await upsertProduto(
        membroId,
        m,
        a,
        valorCobrado,
        novoPago,
        novoStatus,
        dataPagamento,
        null
      );
      await reload();
    },
    [rows, upsertProduto, reload]
  );

  const definirCotaPadrao = useCallback(
    async ({ mes: m, ano: a, valorCobrado }: DefinirCotaPadraoInput) => {
      if (!isFiniteNonNegative(valorCobrado)) {
        throw new Error("Valor inválido");
      }
      const membros = await db.getAllAsync<{ id: number }>(
        `SELECT id FROM membros WHERE ativo = 1`
      );
      await db.withTransactionAsync(async () => {
        for (const membro of membros) {
          await db.runAsync(
            `INSERT INTO produtos_limpeza (mes, ano, membro_id, valor_cobrado, valor_pago, status, data_pagamento)
             VALUES (?, ?, ?, ?, 0, 'pendente', NULL)
             ON CONFLICT(mes, ano, membro_id) DO UPDATE SET
               valor_cobrado = excluded.valor_cobrado,
               valor_pago = CASE
                 WHEN produtos_limpeza.status = 'doado' THEN excluded.valor_cobrado
                 ELSE produtos_limpeza.valor_pago
               END,
               status = CASE
                 WHEN produtos_limpeza.status = 'doado' THEN 'doado'
                 WHEN produtos_limpeza.valor_pago >= excluded.valor_cobrado AND excluded.valor_cobrado > 0 THEN 'pago'
                 WHEN produtos_limpeza.valor_pago > 0 THEN 'parcial'
                 ELSE 'pendente'
               END`,
            m,
            a,
            membro.id,
            valorCobrado
          );
        }
      });
      await reload();
    },
    [db, reload]
  );

  const registrarDoacao = useCallback(
    async ({
      membroId,
      mes: m,
      ano: a,
      nomeProduto,
      dataPagamento,
    }: RegistrarDoacaoProdutoInput) => {
      const nome = nomeProduto.trim();
      if (nome.length === 0) {
        throw new Error("Informe o nome do produto doado");
      }
      const existing = rows.find((r) => r.membro_id === membroId);
      const cobrado = existing?.valor_cobrado ?? 0;
      await upsertProduto(
        membroId,
        m,
        a,
        cobrado,
        cobrado,
        "doado",
        dataPagamento ?? isoDateToday(),
        nome
      );
      await reload();
    },
    [rows, upsertProduto, reload]
  );

  const totais = useMemo<ProdutoTotais>(() => {
    const totalCobrado = rows.reduce((sum, r) => sum + r.valor_cobrado, 0);
    const totalPago = rows.reduce((sum, r) => sum + r.valor_pago, 0);
    const totalPendente = totalCobrado - totalPago;
    const qtdPagos = rows.filter((r) => r.status === "pago").length;
    const qtdParciais = rows.filter((r) => r.status === "parcial").length;
    const qtdPendentes = rows.filter((r) => r.status === "pendente").length;
    const qtdDoados = rows.filter((r) => r.status === "doado").length;
    const qtdQuitados = qtdPagos + qtdDoados;
    const adimplenciaPercent =
      rows.length === 0 ? 0 : (qtdQuitados / rows.length) * 100;
    return {
      totalCobrado,
      totalPago,
      totalPendente,
      qtdPagos,
      qtdParciais,
      qtdPendentes,
      qtdDoados,
      qtdTotal: rows.length,
      adimplenciaPercent,
    };
  }, [rows]);

  return {
    rows,
    totais,
    loading,
    error,
    reload,
    registrarPagamento,
    marcarPendente,
    atualizarValor,
    definirCotaPadrao,
    registrarDoacao,
  };
}
