import { useCallback, useEffect, useMemo, useState } from "react";
import { useSQLiteContext } from "expo-sqlite";
import type {
  LinhaPlanilha,
  Planilha,
  StatusPagamento,
  TipoLinha,
  TipoModulo,
} from "@/types/models";

export type PlanilhaTotais = {
  entradas: number;
  saidas: number;
  saldo: number;
  totalCobrado: number;
  totalPago: number;
  totalPendente: number;
};

export type LinhaPlanilhaInput = {
  nome: string;
  valor: number;
  tipo: TipoLinha;
  status: StatusPagamento;
  data: string | null;
  observacao: string | null;
  valorCobrado?: number;
  valorPago?: number;
};

type ValidatedLinhaInput = {
  nome: string;
  valor: number;
  valorCobrado: number;
  valorPago: number;
  tipo: TipoLinha;
  status: StatusPagamento;
  data: string | null;
  observacao: string | null;
};

export type UsePlanilhaResult = {
  planilha: Planilha | null;
  linhas: LinhaPlanilha[];
  totais: PlanilhaTotais;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  addLinha: (input: LinhaPlanilhaInput) => Promise<number>;
  updateLinha: (id: number, input: LinhaPlanilhaInput) => Promise<void>;
  deleteLinha: (id: number) => Promise<void>;
  registrarPagamento: (linhaId: number, valorPago: number) => Promise<void>;
  addLinhaAvulsa: (nome: string, valorCobrado?: number) => Promise<number>;
};

const ZERO_TOTAIS: PlanilhaTotais = {
  entradas: 0,
  saidas: 0,
  saldo: 0,
  totalCobrado: 0,
  totalPago: 0,
  totalPendente: 0,
};

function isoDateToday(): string {
  return new Date().toISOString().slice(0, 10);
}

function isFiniteNonNegative(n: number): boolean {
  return Number.isFinite(n) && n >= 0;
}

function validateInput(input: LinhaPlanilhaInput): ValidatedLinhaInput {
  const nome = input.nome.trim();
  if (!nome) throw new Error("Nome obrigatório");
  if (!isFiniteNonNegative(input.valor)) {
    throw new Error("Valor inválido");
  }
  if (input.tipo !== "entrada" && input.tipo !== "saida") {
    throw new Error("Tipo inválido");
  }
  if (
    input.status !== "pago" &&
    input.status !== "parcial" &&
    input.status !== "pendente"
  ) {
    throw new Error("Status inválido");
  }
  const valorCobrado =
    input.valorCobrado !== undefined ? input.valorCobrado : input.valor;
  const valorPago =
    input.valorPago !== undefined
      ? input.valorPago
      : input.status === "pago"
        ? input.valor
        : 0;
  if (!isFiniteNonNegative(valorCobrado)) {
    throw new Error("Valor cobrado inválido");
  }
  if (!isFiniteNonNegative(valorPago)) {
    throw new Error("Valor pago inválido");
  }
  return {
    nome,
    valor: input.valor,
    valorCobrado,
    valorPago,
    tipo: input.tipo,
    status: input.status,
    data: input.data && input.data.length > 0 ? input.data : null,
    observacao:
      input.observacao && input.observacao.trim().length > 0
        ? input.observacao.trim()
        : null,
  };
}

export function usePlanilha(planilhaId: number): UsePlanilhaResult {
  const db = useSQLiteContext();
  const [planilha, setPlanilha] = useState<Planilha | null>(null);
  const [linhas, setLinhas] = useState<LinhaPlanilha[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [head, rows] = await Promise.all([
        db.getFirstAsync<Planilha>(
          "SELECT id, nome, tipo_modulo, orixa_id, categoria_id, mes, ano, created_at FROM planilhas WHERE id = ?",
          planilhaId
        ),
        db.getAllAsync<LinhaPlanilha>(
          `SELECT id, planilha_id, nome, valor, valor_cobrado, valor_pago, tipo, status, data, observacao
           FROM linhas_planilha
           WHERE planilha_id = ?
           ORDER BY COALESCE(data, '') DESC, id DESC`,
          planilhaId
        ),
      ]);
      setPlanilha(head ?? null);
      setLinhas(rows);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Falha ao carregar planilha"
      );
    } finally {
      setLoading(false);
    }
  }, [db, planilhaId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const addLinha = useCallback(
    async (input: LinhaPlanilhaInput): Promise<number> => {
      const v = validateInput(input);
      const result = await db.runAsync(
        `INSERT INTO linhas_planilha
         (planilha_id, nome, valor, tipo, status, data, observacao, valor_cobrado, valor_pago)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        planilhaId,
        v.nome,
        v.valor,
        v.tipo,
        v.status,
        v.data,
        v.observacao,
        v.valorCobrado,
        v.valorPago
      );
      await reload();
      return Number(result.lastInsertRowId);
    },
    [db, planilhaId, reload]
  );

  const updateLinha = useCallback(
    async (id: number, input: LinhaPlanilhaInput): Promise<void> => {
      const v = validateInput(input);
      await db.runAsync(
        `UPDATE linhas_planilha
         SET nome = ?, valor = ?, valor_cobrado = ?, valor_pago = ?, tipo = ?, status = ?, data = ?, observacao = ?
         WHERE id = ? AND planilha_id = ?`,
        v.nome,
        v.valor,
        v.valorCobrado,
        v.valorPago,
        v.tipo,
        v.status,
        v.data,
        v.observacao,
        id,
        planilhaId
      );
      await reload();
    },
    [db, planilhaId, reload]
  );

  const deleteLinha = useCallback(
    async (id: number): Promise<void> => {
      await db.runAsync(
        "DELETE FROM linhas_planilha WHERE id = ? AND planilha_id = ?",
        id,
        planilhaId
      );
      await reload();
    },
    [db, planilhaId, reload]
  );

  const registrarPagamento = useCallback(
    async (linhaId: number, valorPago: number): Promise<void> => {
      if (!isFiniteNonNegative(valorPago)) {
        throw new Error("Valor inválido");
      }
      const linha = await db.getFirstAsync<LinhaPlanilha>(
        `SELECT id, planilha_id, nome, valor, valor_cobrado, valor_pago, tipo, status, data, observacao
         FROM linhas_planilha
         WHERE id = ? AND planilha_id = ?`,
        linhaId,
        planilhaId
      );
      if (!linha) throw new Error("Linha não encontrada");

      const cobrado = linha.valor_cobrado;
      const novoPago = Math.min(linha.valor_pago + valorPago, cobrado);
      let novoStatus: StatusPagamento;
      if (cobrado > 0 && novoPago >= cobrado) novoStatus = "pago";
      else if (novoPago > 0) novoStatus = "parcial";
      else novoStatus = "pendente";

      const novaData =
        linha.status === "pendente" && novoStatus !== "pendente"
          ? isoDateToday()
          : linha.data;

      await db.runAsync(
        `UPDATE linhas_planilha
         SET valor_pago = ?, valor = ?, status = ?, data = ?
         WHERE id = ? AND planilha_id = ?`,
        novoPago,
        cobrado,
        novoStatus,
        novaData,
        linhaId,
        planilhaId
      );
      await reload();
    },
    [db, planilhaId, reload]
  );

  const addLinhaAvulsa = useCallback(
    async (nome: string, valorCobrado?: number): Promise<number> => {
      const cobrado = valorCobrado ?? 0;
      const tipo: TipoLinha = inferTipoFromPlanilha(planilha?.tipo_modulo);
      return addLinha({
        nome,
        valor: cobrado,
        tipo,
        status: "pendente",
        data: null,
        observacao: null,
        valorCobrado: cobrado,
        valorPago: 0,
      });
    },
    [addLinha, planilha?.tipo_modulo]
  );

  const totais = useMemo<PlanilhaTotais>(() => {
    if (linhas.length === 0) return ZERO_TOTAIS;
    let entradas = 0;
    let saidas = 0;
    let totalCobrado = 0;
    let totalPago = 0;
    for (const linha of linhas) {
      if (linha.tipo === "entrada") entradas += linha.valor;
      else saidas += linha.valor;
      totalCobrado += linha.valor_cobrado;
      totalPago += linha.valor_pago;
    }
    return {
      entradas,
      saidas,
      saldo: entradas - saidas,
      totalCobrado,
      totalPago,
      totalPendente: totalCobrado - totalPago,
    };
  }, [linhas]);

  return {
    planilha,
    linhas,
    totais,
    loading,
    error,
    reload,
    addLinha,
    updateLinha,
    deleteLinha,
    registrarPagamento,
    addLinhaAvulsa,
  };
}

function inferTipoFromPlanilha(tipoModulo: TipoModulo | undefined): TipoLinha {
  if (tipoModulo === "produtos") return "saida";
  return "entrada";
}

export type CriarPlanilhaComMembrosNome = {
  nome: string;
  valorCobrado?: number;
};

export type CriarPlanilhaComMembrosInput = {
  nome: string;
  mes: number;
  ano: number;
  tipoModulo?: TipoModulo;
  orixaId?: number | null;
  categoriaId?: number | null;
  valorPadrao?: number;
  nomes?: CriarPlanilhaComMembrosNome[];
};

export type CriarPlanilhaComMembrosResult = {
  planilhaId: number;
  linhasCriadas: number;
};

export function useCriarPlanilhaComMembros(): (
  input: CriarPlanilhaComMembrosInput
) => Promise<CriarPlanilhaComMembrosResult> {
  const db = useSQLiteContext();
  return useCallback(
    async ({
      nome,
      mes,
      ano,
      tipoModulo,
      orixaId,
      categoriaId,
      valorPadrao,
      nomes,
    }: CriarPlanilhaComMembrosInput) => {
      const nomeTrim = nome.trim();
      if (!nomeTrim) throw new Error("Nome obrigatório");
      if (!Number.isInteger(mes) || mes < 1 || mes > 12) {
        throw new Error("Mês inválido");
      }
      if (!Number.isInteger(ano) || ano < 1900) {
        throw new Error("Ano inválido");
      }
      const cobradoPadrao = valorPadrao ?? 0;
      if (!isFiniteNonNegative(cobradoPadrao)) {
        throw new Error("Valor padrão inválido");
      }
      const modulo: TipoModulo = tipoModulo ?? "geral";
      const tipoLinha: TipoLinha = inferTipoFromPlanilha(modulo);

      let lista: CriarPlanilhaComMembrosNome[];
      if (nomes !== undefined) {
        lista = nomes
          .map((n) => ({
            nome: n.nome.trim(),
            valorCobrado: n.valorCobrado,
          }))
          .filter((n) => n.nome.length > 0);
      } else {
        const membros = await db.getAllAsync<{ id: number; nome: string }>(
          `SELECT id, nome FROM membros WHERE ativo = 1 ORDER BY nome COLLATE NOCASE ASC`
        );
        lista = membros.map((m) => ({ nome: m.nome }));
      }

      let planilhaId = 0;
      let linhasCriadas = 0;
      await db.withTransactionAsync(async () => {
        const res = await db.runAsync(
          `INSERT INTO planilhas (nome, tipo_modulo, orixa_id, categoria_id, mes, ano)
           VALUES (?, ?, ?, ?, ?, ?)`,
          nomeTrim,
          modulo,
          orixaId ?? null,
          categoriaId ?? null,
          mes,
          ano
        );
        planilhaId = Number(res.lastInsertRowId);

        for (const item of lista) {
          const cobrado = item.valorCobrado ?? cobradoPadrao;
          if (!isFiniteNonNegative(cobrado)) {
            throw new Error(`Valor inválido para ${item.nome}`);
          }
          await db.runAsync(
            `INSERT INTO linhas_planilha
             (planilha_id, nome, valor, tipo, status, data, observacao, valor_cobrado, valor_pago)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            planilhaId,
            item.nome,
            cobrado,
            tipoLinha,
            "pendente",
            null,
            null,
            cobrado,
            0
          );
          linhasCriadas += 1;
        }
      });

      return { planilhaId, linhasCriadas };
    },
    [db]
  );
}
