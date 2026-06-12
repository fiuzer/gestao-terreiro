import { useCallback, useEffect, useMemo, useState } from "react";
import { useSQLiteContext } from "expo-sqlite";
import type { StatusPagamento } from "@/types/models";

export type MensalidadeRow = {
  membro_id: number;
  membro_nome: string;
  mensalidade_id: number | null;
  valor: number;
  status: StatusPagamento;
  data_pagamento: string | null;
};

export type MensalidadeTotais = {
  totalArrecadado: number;
  totalPendente: number;
  totalPrevisto: number;
  qtdPagos: number;
  qtdPendentes: number;
  qtdTotal: number;
  adimplenciaPercent: number;
};

export type RegistrarPagamentoInput = {
  membroId: number;
  mes: number;
  ano: number;
  valor: number;
  dataPagamento?: string;
};

export type MarcarPendenteInput = {
  membroId: number;
  mes: number;
  ano: number;
};

export type AtualizarValorInput = {
  membroId: number;
  mes: number;
  ano: number;
  valor: number;
};

export type UseMensalidadesResult = {
  rows: MensalidadeRow[];
  totais: MensalidadeTotais;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  registrarPagamento: (input: RegistrarPagamentoInput) => Promise<void>;
  marcarPendente: (input: MarcarPendenteInput) => Promise<void>;
  atualizarValor: (input: AtualizarValorInput) => Promise<void>;
};

type RawJoinRow = {
  membro_id: number;
  membro_nome: string;
  mensalidade_id: number | null;
  valor: number | null;
  status: StatusPagamento | null;
  data_pagamento: string | null;
};

function isoDateToday(): string {
  return new Date().toISOString().slice(0, 10);
}

export function useMensalidades(
  mes: number,
  ano: number,
  valorPadrao: number = 0
): UseMensalidadesResult {
  const db = useSQLiteContext();
  const [rows, setRows] = useState<MensalidadeRow[]>([]);
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

      const mapped: MensalidadeRow[] = raw.map((r) => ({
        membro_id: r.membro_id,
        membro_nome: r.membro_nome,
        mensalidade_id: r.mensalidade_id,
        valor: r.mensalidade_id === null ? valorPadrao : (r.valor ?? 0),
        status: (r.status ?? "pendente") as StatusPagamento,
        data_pagamento: r.data_pagamento,
      }));
      setRows(mapped);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao carregar mensalidades");
    } finally {
      setLoading(false);
    }
  }, [db, mes, ano]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const upsertMensalidade = useCallback(
    async (
      membroId: number,
      m: number,
      a: number,
      valor: number,
      status: StatusPagamento,
      dataPagamento: string | null
    ): Promise<void> => {
      await db.runAsync(
        `INSERT INTO mensalidades (mes, ano, membro_id, valor, status, data_pagamento)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(mes, ano, membro_id) DO UPDATE SET
           valor = excluded.valor,
           status = excluded.status,
           data_pagamento = excluded.data_pagamento`,
        m,
        a,
        membroId,
        valor,
        status,
        dataPagamento
      );
    },
    [db]
  );

  const registrarPagamento = useCallback(
    async ({ membroId, mes: m, ano: a, valor, dataPagamento }: RegistrarPagamentoInput) => {
      if (!Number.isFinite(valor) || valor < 0) {
        throw new Error("Valor inválido");
      }
      await upsertMensalidade(
        membroId,
        m,
        a,
        valor,
        "pago",
        dataPagamento ?? isoDateToday()
      );
      await reload();
    },
    [upsertMensalidade, reload]
  );

  const marcarPendente = useCallback(
    async ({ membroId, mes: m, ano: a }: MarcarPendenteInput) => {
      const existing = rows.find((r) => r.membro_id === membroId);
      const valor = existing?.valor ?? 0;
      await upsertMensalidade(membroId, m, a, valor, "pendente", null);
      await reload();
    },
    [rows, upsertMensalidade, reload]
  );

  const atualizarValor = useCallback(
    async ({ membroId, mes: m, ano: a, valor }: AtualizarValorInput) => {
      if (!Number.isFinite(valor) || valor < 0) {
        throw new Error("Valor inválido");
      }
      const existing = rows.find((r) => r.membro_id === membroId);
      const status: StatusPagamento = existing?.status ?? "pendente";
      const dataPagamento = status === "pago" ? existing?.data_pagamento ?? isoDateToday() : null;
      await upsertMensalidade(membroId, m, a, valor, status, dataPagamento);
      await reload();
    },
    [rows, upsertMensalidade, reload]
  );

  const totais = useMemo<MensalidadeTotais>(() => {
    const totalArrecadado = rows
      .filter((r) => r.status === "pago")
      .reduce((sum, r) => sum + r.valor, 0);
    const totalPendente = rows
      .filter((r) => r.status === "pendente")
      .reduce((sum, r) => sum + r.valor, 0);
    const qtdPagos = rows.filter((r) => r.status === "pago").length;
    const qtdPendentes = rows.length - qtdPagos;
    const adimplenciaPercent = rows.length === 0 ? 0 : (qtdPagos / rows.length) * 100;
    return {
      totalArrecadado,
      totalPendente,
      totalPrevisto: totalArrecadado + totalPendente,
      qtdPagos,
      qtdPendentes,
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
  };
}
