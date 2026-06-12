import { useCallback, useEffect, useMemo, useState } from "react";
import { useSQLiteContext } from "expo-sqlite";

export const CATEGORIAS_ENTRADA = [
  "Cantina",
  "Doação",
  "Patrocínio",
  "Outros",
] as const;

export const CATEGORIAS_SAIDA = [
  "Água",
  "Luz",
  "Aluguel",
  "Material",
  "Manutenção",
  "Outros",
] as const;

export type CategoriaEntrada = (typeof CATEGORIAS_ENTRADA)[number];
export type CategoriaSaida = (typeof CATEGORIAS_SAIDA)[number];

export type CaixaRow = {
  uid: string;
  tipo: "entrada" | "saida";
  categoria: string;
  descricao: string;
  valor: number;
  data: string;
  origem: "manual" | "mensalidade" | "produto";
  lancamento_id: number | null;
};

export type CaixaTotais = {
  totalEntradas: number;
  totalSaidas: number;
  saldo: number;
};

export type AdicionarLancamentoInput = {
  tipo: "entrada" | "saida";
  categoria: string;
  descricao: string;
  valor: number;
  data: string;
};

export type UseCaixaResult = {
  rows: CaixaRow[];
  totais: CaixaTotais;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  adicionarLancamento: (input: AdicionarLancamentoInput) => Promise<void>;
  deletarLancamento: (id: number) => Promise<void>;
};

type RawRow = {
  uid: string;
  tipo: "entrada" | "saida";
  categoria: string;
  descricao: string;
  valor: number;
  data: string;
  origem: "manual" | "mensalidade" | "produto";
  lancamento_id: number | null;
};

const QUERY = `
  SELECT uid, tipo, categoria, descricao, valor, data, origem, lancamento_id FROM (
    SELECT
      'L' || CAST(id AS TEXT) AS uid,
      tipo, categoria, descricao, valor, data,
      'manual' AS origem,
      id AS lancamento_id
    FROM caixa_lancamentos
    WHERE data >= COALESCE(?, data) AND data <= COALESCE(?, data)

    UNION ALL

    SELECT
      'M' || CAST(ms.id AS TEXT) AS uid,
      'entrada' AS tipo,
      'Mensalidade' AS categoria,
      m.nome AS descricao,
      ms.valor AS valor,
      ms.data_pagamento AS data,
      'mensalidade' AS origem,
      NULL AS lancamento_id
    FROM mensalidades ms
    JOIN membros m ON m.id = ms.membro_id
    WHERE ms.status = 'pago'
      AND ms.data_pagamento IS NOT NULL
      AND ms.valor > 0
      AND ms.data_pagamento >= COALESCE(?, ms.data_pagamento)
      AND ms.data_pagamento <= COALESCE(?, ms.data_pagamento)

    UNION ALL

    SELECT
      'P' || CAST(p.id AS TEXT) AS uid,
      'entrada' AS tipo,
      'Produto de Limpeza' AS categoria,
      m.nome AS descricao,
      p.valor_pago AS valor,
      p.data_pagamento AS data,
      'produto' AS origem,
      NULL AS lancamento_id
    FROM produtos_limpeza p
    JOIN membros m ON m.id = p.membro_id
    WHERE p.status = 'pago'
      AND p.data_pagamento IS NOT NULL
      AND p.valor_pago > 0
      AND p.data_pagamento >= COALESCE(?, p.data_pagamento)
      AND p.data_pagamento <= COALESCE(?, p.data_pagamento)
  )
  ORDER BY data DESC, uid DESC
`;

export function useCaixa(
  dataInicio: string | null = null,
  dataFim: string | null = null
): UseCaixaResult {
  const db = useSQLiteContext();
  const [rows, setRows] = useState<CaixaRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const raw = await db.getAllAsync<RawRow>(
        QUERY,
        dataInicio, dataFim,
        dataInicio, dataFim,
        dataInicio, dataFim
      );
      setRows(raw);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao carregar caixa");
    } finally {
      setLoading(false);
    }
  }, [db, dataInicio, dataFim]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const adicionarLancamento = useCallback(
    async ({ tipo, categoria, descricao, valor, data }: AdicionarLancamentoInput) => {
      if (!Number.isFinite(valor) || valor <= 0) throw new Error("Valor inválido");
      if (!descricao.trim()) throw new Error("Informe uma descrição");
      if (!data) throw new Error("Informe a data");
      await db.runAsync(
        `INSERT INTO caixa_lancamentos (tipo, categoria, descricao, valor, data)
         VALUES (?, ?, ?, ?, ?)`,
        tipo, categoria, descricao.trim(), valor, data
      );
      await reload();
    },
    [db, reload]
  );

  const deletarLancamento = useCallback(
    async (id: number) => {
      await db.runAsync(`DELETE FROM caixa_lancamentos WHERE id = ?`, id);
      await reload();
    },
    [db, reload]
  );

  const totais = useMemo<CaixaTotais>(() => {
    let totalEntradas = 0;
    let totalSaidas = 0;
    for (const r of rows) {
      if (r.tipo === "entrada") totalEntradas += r.valor;
      else totalSaidas += r.valor;
    }
    return { totalEntradas, totalSaidas, saldo: totalEntradas - totalSaidas };
  }, [rows]);

  return { rows, totais, loading, error, reload, adicionarLancamento, deletarLancamento };
}
