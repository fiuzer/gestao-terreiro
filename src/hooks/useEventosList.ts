import { useCallback, useEffect, useState } from "react";
import { useSQLiteContext } from "expo-sqlite";
import type { Planilha } from "@/types/models";

export type { Planilha };

export type UseEventosListResult = {
  eventos: Planilha[];
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  deleteEvento: (id: number) => Promise<void>;
};

export function useEventosList(): UseEventosListResult {
  const db = useSQLiteContext();
  const [eventos, setEventos] = useState<Planilha[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await db.getAllAsync<Planilha>(
        `SELECT id, nome, tipo_modulo, orixa_id, categoria_id, mes, ano, created_at
         FROM planilhas
         WHERE tipo_modulo = 'geral'
         ORDER BY created_at DESC`
      );
      setEventos(rows);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar eventos.");
    } finally {
      setLoading(false);
    }
  }, [db]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const deleteEvento = useCallback(
    async (id: number) => {
      await db.withTransactionAsync(async () => {
        await db.runAsync(
          `DELETE FROM linhas_planilha WHERE planilha_id = ?`,
          id
        );
        await db.runAsync(`DELETE FROM planilhas WHERE id = ?`, id);
      });
      await reload();
    },
    [db, reload]
  );

  return { eventos, loading, error, reload, deleteEvento };
}
