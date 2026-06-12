import { useCallback, useEffect, useMemo, useState } from "react";
import { useSQLiteContext } from "expo-sqlite";
import type { Membro } from "@/types/models";

export type MembroView = {
  id: number;
  nome: string;
  ativo: boolean;
};

export type CreateMembroInput = { nome: string };
export type UpdateMembroInput = { id: number; nome: string };

export type UseMembrosResult = {
  membros: MembroView[];
  membrosAtivos: MembroView[];
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  create: (input: CreateMembroInput) => Promise<number>;
  update: (input: UpdateMembroInput) => Promise<void>;
  setAtivo: (id: number, ativo: boolean) => Promise<void>;
};

function toView(row: Membro): MembroView {
  return { id: row.id, nome: row.nome, ativo: row.ativo === 1 };
}

export function useMembros(): UseMembrosResult {
  const db = useSQLiteContext();
  const [membros, setMembros] = useState<MembroView[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await db.getAllAsync<Membro>(
        "SELECT id, nome, ativo FROM membros ORDER BY ativo DESC, nome COLLATE NOCASE ASC"
      );
      setMembros(rows.map(toView));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao carregar membros");
    } finally {
      setLoading(false);
    }
  }, [db]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const create = useCallback(
    async ({ nome }: CreateMembroInput): Promise<number> => {
      const trimmed = nome.trim();
      if (!trimmed) throw new Error("Nome obrigatório");
      const result = await db.runAsync(
        "INSERT INTO membros (nome, ativo) VALUES (?, 1)",
        trimmed
      );
      await reload();
      return Number(result.lastInsertRowId);
    },
    [db, reload]
  );

  const update = useCallback(
    async ({ id, nome }: UpdateMembroInput): Promise<void> => {
      const trimmed = nome.trim();
      if (!trimmed) throw new Error("Nome obrigatório");
      await db.runAsync("UPDATE membros SET nome = ? WHERE id = ?", trimmed, id);
      await reload();
    },
    [db, reload]
  );

  const setAtivo = useCallback(
    async (id: number, ativo: boolean): Promise<void> => {
      await db.runAsync(
        "UPDATE membros SET ativo = ? WHERE id = ?",
        ativo ? 1 : 0,
        id
      );
      await reload();
    },
    [db, reload]
  );

  const membrosAtivos = useMemo(
    () => membros.filter((m) => m.ativo),
    [membros]
  );

  return { membros, membrosAtivos, loading, error, reload, create, update, setAtivo };
}
