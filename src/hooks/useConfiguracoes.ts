import { useCallback, useEffect, useState } from "react";
import { useSQLiteContext, type SQLiteDatabase } from "expo-sqlite";
import type { Configuracao } from "@/types/models";

export const CHAVE_VALOR_PADRAO_MENSALIDADE = "valor_padrao_mensalidade";
export const CHAVE_VALOR_PADRAO_PRODUTO = "valor_padrao_produto";

const FALLBACK_VALOR_MENSALIDADE = 100;
const FALLBACK_VALOR_PRODUTO = 10;

export type UseConfiguracoesResult = {
  valorMensalidade: number;
  valorProduto: number;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  setValorMensalidade: (valor: number) => Promise<void>;
  setValorProduto: (valor: number) => Promise<void>;
};

function parseValor(valor: string | null, fallback: number): number {
  if (valor === null) return fallback;
  const n = Number(valor);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

export async function getConfiguracao(
  db: SQLiteDatabase,
  chave: string
): Promise<string | null> {
  const row = await db.getFirstAsync<Configuracao>(
    "SELECT chave, valor FROM configuracoes WHERE chave = ?",
    chave
  );
  return row?.valor ?? null;
}

export async function setConfiguracao(
  db: SQLiteDatabase,
  chave: string,
  valor: string
): Promise<void> {
  await db.runAsync(
    `INSERT INTO configuracoes (chave, valor) VALUES (?, ?)
     ON CONFLICT(chave) DO UPDATE SET valor = excluded.valor`,
    chave,
    valor
  );
}

export function useConfiguracoes(): UseConfiguracoesResult {
  const db = useSQLiteContext();
  const [valorMensalidade, setValorMensalidadeState] = useState<number>(
    FALLBACK_VALOR_MENSALIDADE
  );
  const [valorProduto, setValorProdutoState] = useState<number>(
    FALLBACK_VALOR_PRODUTO
  );
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await db.getAllAsync<Configuracao>(
        "SELECT chave, valor FROM configuracoes WHERE chave IN (?, ?)",
        CHAVE_VALOR_PADRAO_MENSALIDADE,
        CHAVE_VALOR_PADRAO_PRODUTO
      );
      const map = new Map<string, string>(rows.map((r) => [r.chave, r.valor]));
      setValorMensalidadeState(
        parseValor(
          map.get(CHAVE_VALOR_PADRAO_MENSALIDADE) ?? null,
          FALLBACK_VALOR_MENSALIDADE
        )
      );
      setValorProdutoState(
        parseValor(
          map.get(CHAVE_VALOR_PADRAO_PRODUTO) ?? null,
          FALLBACK_VALOR_PRODUTO
        )
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Falha ao carregar configurações"
      );
    } finally {
      setLoading(false);
    }
  }, [db]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const setValorMensalidade = useCallback(
    async (valor: number): Promise<void> => {
      if (!Number.isFinite(valor) || valor < 0) {
        throw new Error("Valor inválido");
      }
      await setConfiguracao(
        db,
        CHAVE_VALOR_PADRAO_MENSALIDADE,
        String(valor)
      );
      setValorMensalidadeState(valor);
    },
    [db]
  );

  const setValorProduto = useCallback(
    async (valor: number): Promise<void> => {
      if (!Number.isFinite(valor) || valor < 0) {
        throw new Error("Valor inválido");
      }
      await setConfiguracao(db, CHAVE_VALOR_PADRAO_PRODUTO, String(valor));
      setValorProdutoState(valor);
    },
    [db]
  );

  return {
    valorMensalidade,
    valorProduto,
    loading,
    error,
    reload,
    setValorMensalidade,
    setValorProduto,
  };
}
