import { useCallback, useEffect, useState } from "react";
import { useSQLiteContext } from "expo-sqlite";
import type {
  Template,
  TemplateLinha,
  TipoLinha,
  TipoModulo,
} from "@/types/models";

export type TemplateResumo = Template & {
  qtd_linhas: number;
};

type LinhaOrigem = {
  nome: string;
  tipo: TipoLinha;
  observacao: string | null;
};

export type CriarPorTemplateInput = {
  templateId: number;
  nome?: string;
  tipo_modulo: TipoModulo;
  orixa_id: number | null;
  categoria_id: number | null;
  mes: number | null;
  ano: number | null;
  valorPadrao?: number;
};

export type UseTemplatesResult = {
  templates: TemplateResumo[];
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  listarTemplates: () => Promise<TemplateResumo[]>;
  obterLinhas: (templateId: number) => Promise<TemplateLinha[]>;
  salvarComoTemplate: (planilhaId: number, nome: string) => Promise<number>;
  criarPlanilhaPorTemplate: (input: CriarPorTemplateInput) => Promise<number>;
  renomearTemplate: (id: number, nome: string) => Promise<void>;
  excluirTemplate: (id: number) => Promise<void>;
};

type TemplateRow = Template & { qtd_linhas: number };

function sanitizeNome(nome: string): string {
  const trimmed = nome.trim();
  if (!trimmed) throw new Error("Nome obrigatório");
  if (trimmed.length > 120) throw new Error("Nome muito longo");
  return trimmed;
}

export function useTemplates(): UseTemplatesResult {
  const db = useSQLiteContext();
  const [templates, setTemplates] = useState<TemplateResumo[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const listarTemplates = useCallback(async (): Promise<TemplateResumo[]> => {
    return db.getAllAsync<TemplateRow>(
      `SELECT t.id, t.nome, t.created_at,
              COUNT(tl.id) AS qtd_linhas
       FROM templates t
       LEFT JOIN template_linhas tl ON tl.template_id = t.id
       GROUP BY t.id
       ORDER BY t.nome COLLATE NOCASE ASC`
    );
  }, [db]);

  const reload = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const rows = await listarTemplates();
      setTemplates(rows);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Falha ao carregar templates"
      );
    } finally {
      setLoading(false);
    }
  }, [listarTemplates]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const obterLinhas = useCallback(
    async (templateId: number): Promise<TemplateLinha[]> => {
      return db.getAllAsync<TemplateLinha>(
        `SELECT id, template_id, nome, tipo, observacao
         FROM template_linhas
         WHERE template_id = ?
         ORDER BY id ASC`,
        templateId
      );
    },
    [db]
  );

  const salvarComoTemplate = useCallback(
    async (planilhaId: number, nome: string): Promise<number> => {
      const nomeOk = sanitizeNome(nome);
      const origemLinhas = await db.getAllAsync<LinhaOrigem>(
        `SELECT nome, tipo, observacao
         FROM linhas_planilha
         WHERE planilha_id = ?
         ORDER BY id ASC`,
        planilhaId
      );

      let novoId = 0;
      await db.withTransactionAsync(async () => {
        const inserted = await db.runAsync(
          "INSERT INTO templates (nome) VALUES (?)",
          nomeOk
        );
        novoId = Number(inserted.lastInsertRowId);
        for (const linha of origemLinhas) {
          await db.runAsync(
            `INSERT INTO template_linhas (template_id, nome, tipo, observacao)
             VALUES (?, ?, ?, ?)`,
            novoId,
            linha.nome,
            linha.tipo,
            linha.observacao
          );
        }
      });
      await reload();
      return novoId;
    },
    [db, reload]
  );

  const criarPlanilhaPorTemplate = useCallback(
    async (input: CriarPorTemplateInput): Promise<number> => {
      const tplLinhas = await obterLinhas(input.templateId);
      const tpl = await db.getFirstAsync<Pick<Template, "id" | "nome">>(
        "SELECT id, nome FROM templates WHERE id = ?",
        input.templateId
      );
      if (!tpl) throw new Error("Template não encontrado");

      const nomePlanilha = sanitizeNome(input.nome ?? tpl.nome);
      const cobrado = input.valorPadrao ?? 0;
      if (!Number.isFinite(cobrado) || cobrado < 0) {
        throw new Error("Valor padrão inválido");
      }

      let novoId = 0;
      await db.withTransactionAsync(async () => {
        const inserted = await db.runAsync(
          `INSERT INTO planilhas
             (nome, tipo_modulo, orixa_id, categoria_id, mes, ano)
           VALUES (?, ?, ?, ?, ?, ?)`,
          nomePlanilha,
          input.tipo_modulo,
          input.orixa_id,
          input.categoria_id,
          input.mes,
          input.ano
        );
        novoId = Number(inserted.lastInsertRowId);
        for (const linha of tplLinhas) {
          await db.runAsync(
            `INSERT INTO linhas_planilha
               (planilha_id, nome, valor, tipo, status, data, observacao, valor_cobrado, valor_pago)
             VALUES (?, ?, ?, ?, 'pendente', NULL, ?, ?, 0)`,
            novoId,
            linha.nome,
            cobrado,
            linha.tipo,
            linha.observacao,
            cobrado
          );
        }
      });
      return novoId;
    },
    [db, obterLinhas]
  );

  const renomearTemplate = useCallback(
    async (id: number, nome: string): Promise<void> => {
      const nomeOk = sanitizeNome(nome);
      await db.runAsync("UPDATE templates SET nome = ? WHERE id = ?", nomeOk, id);
      await reload();
    },
    [db, reload]
  );

  const excluirTemplate = useCallback(
    async (id: number): Promise<void> => {
      await db.runAsync("DELETE FROM templates WHERE id = ?", id);
      await reload();
    },
    [db, reload]
  );

  return {
    templates,
    loading,
    error,
    reload,
    listarTemplates,
    obterLinhas,
    salvarComoTemplate,
    criarPlanilhaPorTemplate,
    renomearTemplate,
    excluirTemplate,
  };
}

