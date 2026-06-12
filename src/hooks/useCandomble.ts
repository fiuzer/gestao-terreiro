import { useCallback, useEffect, useState } from "react";
import { useSQLiteContext } from "expo-sqlite";
import type { Categoria, Orixa, Planilha } from "@/types/models";

export type NivelArvore =
  | { kind: "raiz" }
  | { kind: "orixa"; orixaId: number; orixaNome: string }
  | { kind: "categoria"; categoriaId: number; orixaId: number };

export type CategoriaInput = {
  nome: string;
  pai_id: number | null;
  orixa_id: number;
};

export type PlanilhaInput = {
  nome: string;
  categoria_id: number | null;
  orixa_id: number;
};

export type UseCandombleResult = {
  orixas: Orixa[];
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  listCategorias: (
    paiId: number | null,
    orixaId: number
  ) => Promise<Categoria[]>;
  listPlanilhas: (categoriaId: number | null, orixaId: number) => Promise<Planilha[]>;
  addCategoria: (input: CategoriaInput) => Promise<number>;
  updateCategoria: (id: number, nome: string) => Promise<void>;
  deleteCategoria: (id: number) => Promise<void>;
  addPlanilha: (input: PlanilhaInput) => Promise<number>;
};

export function useCandomble(): UseCandombleResult {
  const db = useSQLiteContext();
  const [orixas, setOrixas] = useState<Orixa[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await db.getAllAsync<Orixa>(
        "SELECT id, nome FROM orixas ORDER BY id ASC"
      );
      setOrixas(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao carregar orixás");
    } finally {
      setLoading(false);
    }
  }, [db]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const listCategorias = useCallback(
    async (paiId: number | null, orixaId: number): Promise<Categoria[]> => {
      if (paiId === null) {
        return db.getAllAsync<Categoria>(
          `SELECT id, nome, pai_id, orixa_id
           FROM categorias
           WHERE pai_id IS NULL AND orixa_id = ?
           ORDER BY nome COLLATE NOCASE ASC`,
          orixaId
        );
      }
      return db.getAllAsync<Categoria>(
        `SELECT id, nome, pai_id, orixa_id
         FROM categorias
         WHERE pai_id = ?
         ORDER BY nome COLLATE NOCASE ASC`,
        paiId
      );
    },
    [db]
  );

  const listPlanilhas = useCallback(
    async (categoriaId: number | null, orixaId: number): Promise<Planilha[]> => {
      if (categoriaId === null) {
        return db.getAllAsync<Planilha>(
          `SELECT id, nome, tipo_modulo, orixa_id, categoria_id, mes, ano, created_at
           FROM planilhas
           WHERE tipo_modulo = 'candombles' AND categoria_id IS NULL AND orixa_id = ?
           ORDER BY created_at DESC, id DESC`,
          orixaId
        );
      }
      return db.getAllAsync<Planilha>(
        `SELECT id, nome, tipo_modulo, orixa_id, categoria_id, mes, ano, created_at
         FROM planilhas
         WHERE tipo_modulo = 'candombles' AND categoria_id = ?
         ORDER BY created_at DESC, id DESC`,
        categoriaId
      );
    },
    [db]
  );

  const addCategoria = useCallback(
    async (input: CategoriaInput): Promise<number> => {
      const nome = input.nome.trim();
      if (!nome) throw new Error("Nome obrigatório");
      const result = await db.runAsync(
        "INSERT INTO categorias (nome, pai_id, orixa_id) VALUES (?, ?, ?)",
        nome,
        input.pai_id,
        input.orixa_id
      );
      return Number(result.lastInsertRowId);
    },
    [db]
  );

  const updateCategoria = useCallback(
    async (id: number, nome: string): Promise<void> => {
      const trimmed = nome.trim();
      if (!trimmed) throw new Error("Nome obrigatório");
      await db.runAsync(
        "UPDATE categorias SET nome = ? WHERE id = ?",
        trimmed,
        id
      );
    },
    [db]
  );

  const deleteCategoria = useCallback(
    async (id: number): Promise<void> => {
      await db.runAsync("DELETE FROM categorias WHERE id = ?", id);
    },
    [db]
  );

  const addPlanilha = useCallback(
    async (input: PlanilhaInput): Promise<number> => {
      const nome = input.nome.trim();
      if (!nome) throw new Error("Nome obrigatório");
      const result = await db.runAsync(
        `INSERT INTO planilhas (nome, tipo_modulo, orixa_id, categoria_id, mes, ano)
         VALUES (?, 'candombles', ?, ?, NULL, NULL)`,
        nome,
        input.orixa_id,
        input.categoria_id
      );
      return Number(result.lastInsertRowId);
    },
    [db]
  );

  return {
    orixas,
    loading,
    error,
    reload,
    listCategorias,
    listPlanilhas,
    addCategoria,
    updateCategoria,
    deleteCategoria,
    addPlanilha,
  };
}
