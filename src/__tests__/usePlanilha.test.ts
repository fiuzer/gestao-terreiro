import { act, renderHook, waitFor } from "@testing-library/react-native";
import {
  usePlanilha,
  useCriarPlanilhaComMembros,
} from "@/hooks/usePlanilha";
import type { LinhaPlanilha, Planilha } from "@/types/models";

const expoSqlite = jest.requireMock("expo-sqlite") as {
  __resetMockDB: () => void;
  __getMockDB: () => {
    __setGetAll: (h: (sql: string, args: unknown[]) => unknown[]) => void;
    __setGetFirst: (h: (sql: string, args: unknown[]) => unknown) => void;
    __setRun: (
      h: (sql: string, args: unknown[]) => { lastInsertRowId: number; changes: number }
    ) => void;
    __calls: { run: { sql: string; args: unknown[] }[] };
  };
};

const PLANILHA: Planilha = {
  id: 7,
  nome: "Despesas Maio",
  tipo_modulo: "geral",
  orixa_id: null,
  categoria_id: null,
  mes: 5,
  ano: 2026,
  created_at: "2026-05-01 00:00:00",
};

function setupRows(linhas: LinhaPlanilha[]): void {
  const db = expoSqlite.__getMockDB();
  db.__setGetFirst(() => PLANILHA);
  db.__setGetAll((sql) => {
    if (/FROM linhas_planilha/i.test(sql)) return linhas;
    return [];
  });
}

describe("usePlanilha", () => {
  beforeEach(() => {
    expoSqlite.__resetMockDB();
  });

  it("carrega cabeçalho e linhas iniciais", async () => {
    setupRows([
      {
        id: 1,
        planilha_id: 7,
        nome: "Doação",
        valor: 200,
        valor_cobrado: 200,
        valor_pago: 200,
        tipo: "entrada",
        status: "pago",
        data: "2026-05-10",
        observacao: null,
      },
    ]);

    const { result } = renderHook(() => usePlanilha(7));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.planilha?.id).toBe(7);
    expect(result.current.linhas).toHaveLength(1);
  });

  it("calcula totais: entradas - saídas = saldo", async () => {
    setupRows([
      {
        id: 1,
        planilha_id: 7,
        nome: "Doação",
        valor: 500,
        valor_cobrado: 500,
        valor_pago: 500,
        tipo: "entrada",
        status: "pago",
        data: null,
        observacao: null,
      },
      {
        id: 2,
        planilha_id: 7,
        nome: "Outra entrada",
        valor: 250,
        valor_cobrado: 250,
        valor_pago: 0,
        tipo: "entrada",
        status: "pendente",
        data: null,
        observacao: null,
      },
      {
        id: 3,
        planilha_id: 7,
        nome: "Compra",
        valor: 300,
        valor_cobrado: 300,
        valor_pago: 300,
        tipo: "saida",
        status: "pago",
        data: null,
        observacao: null,
      },
    ]);

    const { result } = renderHook(() => usePlanilha(7));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.totais).toEqual({
      entradas: 750,
      saidas: 300,
      saldo: 450,
      totalCobrado: 1050,
      totalPago: 800,
      totalPendente: 250,
    });
  });

  it("retorna saldo negativo quando saídas > entradas", async () => {
    setupRows([
      {
        id: 1,
        planilha_id: 7,
        nome: "Doação",
        valor: 100,
        valor_cobrado: 100,
        valor_pago: 100,
        tipo: "entrada",
        status: "pago",
        data: null,
        observacao: null,
      },
      {
        id: 2,
        planilha_id: 7,
        nome: "Aluguel",
        valor: 800,
        valor_cobrado: 800,
        valor_pago: 800,
        tipo: "saida",
        status: "pago",
        data: null,
        observacao: null,
      },
    ]);

    const { result } = renderHook(() => usePlanilha(7));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.totais.saldo).toBe(-700);
  });

  it("retorna totais zerados em planilha vazia", async () => {
    setupRows([]);

    const { result } = renderHook(() => usePlanilha(7));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.totais).toEqual({
      entradas: 0,
      saidas: 0,
      saldo: 0,
      totalCobrado: 0,
      totalPago: 0,
      totalPendente: 0,
    });
    expect(result.current.linhas).toHaveLength(0);
  });

  it("addLinha valida nome obrigatório", async () => {
    setupRows([]);
    const { result } = renderHook(() => usePlanilha(7));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await expect(
      result.current.addLinha({
        nome: "   ",
        valor: 10,
        tipo: "entrada",
        status: "pago",
        data: null,
        observacao: null,
      })
    ).rejects.toThrow("Nome obrigatório");
  });

  it("addLinha rejeita valor negativo ou não finito", async () => {
    setupRows([]);
    const { result } = renderHook(() => usePlanilha(7));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await expect(
      result.current.addLinha({
        nome: "x",
        valor: -1,
        tipo: "entrada",
        status: "pago",
        data: null,
        observacao: null,
      })
    ).rejects.toThrow("Valor inválido");

    await expect(
      result.current.addLinha({
        nome: "x",
        valor: Number.POSITIVE_INFINITY,
        tipo: "entrada",
        status: "pago",
        data: null,
        observacao: null,
      })
    ).rejects.toThrow("Valor inválido");
  });

  it("addLinha emite INSERT com colunas corretas e retorna id", async () => {
    setupRows([]);
    const db = expoSqlite.__getMockDB();
    db.__setRun(() => ({ lastInsertRowId: 42, changes: 1 }));

    const { result } = renderHook(() => usePlanilha(7));
    await waitFor(() => expect(result.current.loading).toBe(false));

    let novoId = 0;
    await act(async () => {
      novoId = await result.current.addLinha({
        nome: "Compra papelaria",
        valor: 35.5,
        tipo: "saida",
        status: "pago",
        data: "2026-05-15",
        observacao: " obs ",
      });
    });

    expect(novoId).toBe(42);
    const insert = db.__calls.run.find((c) => /INSERT INTO linhas_planilha/i.test(c.sql));
    expect(insert).toBeDefined();
    expect(insert!.args.slice(0, 5)).toEqual([7, "Compra papelaria", 35.5, "saida", "pago"]);
    expect(insert!.args[6]).toBe("obs");
  });

  it("updateLinha executa UPDATE escopado por planilha_id", async () => {
    setupRows([]);
    const { result } = renderHook(() => usePlanilha(7));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.updateLinha(99, {
        nome: "Editado",
        valor: 1,
        tipo: "entrada",
        status: "pendente",
        data: null,
        observacao: null,
      });
    });

    const db = expoSqlite.__getMockDB();
    const update = db.__calls.run.find((c) => /UPDATE linhas_planilha/i.test(c.sql));
    expect(update).toBeDefined();
    expect(update!.args[update!.args.length - 1]).toBe(7);
    expect(update!.args[update!.args.length - 2]).toBe(99);
  });

  it("deleteLinha executa DELETE escopado por planilha_id", async () => {
    setupRows([]);
    const { result } = renderHook(() => usePlanilha(7));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.deleteLinha(123);
    });

    const db = expoSqlite.__getMockDB();
    const del = db.__calls.run.find((c) => /DELETE FROM linhas_planilha/i.test(c.sql));
    expect(del).toBeDefined();
    expect(del!.args).toEqual([123, 7]);
  });

  describe("registrarPagamento", () => {
    function setupLinhaAtual(linha: LinhaPlanilha): void {
      const db = expoSqlite.__getMockDB();
      db.__setGetFirst((sql) => {
        if (/FROM linhas_planilha/i.test(sql)) return linha;
        return PLANILHA;
      });
      db.__setGetAll((sql) => {
        if (/FROM linhas_planilha/i.test(sql)) return [linha];
        return [];
      });
    }

    it("muda status para parcial quando pagamento é menor que cobrado", async () => {
      setupLinhaAtual({
        id: 10,
        planilha_id: 7,
        nome: "Ana",
        valor: 100,
        valor_cobrado: 100,
        valor_pago: 0,
        tipo: "entrada",
        status: "pendente",
        data: null,
        observacao: null,
      });
      const { result } = renderHook(() => usePlanilha(7));
      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => {
        await result.current.registrarPagamento(10, 30);
      });

      const db = expoSqlite.__getMockDB();
      const update = db.__calls.run.find((c) =>
        /UPDATE linhas_planilha[\s\S]*SET valor_pago/i.test(c.sql)
      );
      expect(update).toBeDefined();
      const [valorPago, , status] = update!.args as [number, number, string];
      expect(valorPago).toBe(30);
      expect(status).toBe("parcial");
    });

    it("muda status para pago quando soma >= cobrado e satura valor_pago", async () => {
      setupLinhaAtual({
        id: 11,
        planilha_id: 7,
        nome: "Beto",
        valor: 100,
        valor_cobrado: 100,
        valor_pago: 70,
        tipo: "entrada",
        status: "parcial",
        data: "2026-05-01",
        observacao: null,
      });
      const { result } = renderHook(() => usePlanilha(7));
      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => {
        await result.current.registrarPagamento(11, 50);
      });

      const db = expoSqlite.__getMockDB();
      const update = db.__calls.run.find((c) =>
        /UPDATE linhas_planilha[\s\S]*SET valor_pago/i.test(c.sql)
      );
      expect(update).toBeDefined();
      const [valorPago, , status] = update!.args as [number, number, string];
      expect(valorPago).toBe(100);
      expect(status).toBe("pago");
    });

    it("rejeita valor inválido", async () => {
      setupRows([]);
      const { result } = renderHook(() => usePlanilha(7));
      await waitFor(() => expect(result.current.loading).toBe(false));

      await expect(result.current.registrarPagamento(1, -1)).rejects.toThrow(
        "Valor inválido"
      );
    });
  });

  describe("addLinhaAvulsa", () => {
    it("insere linha pendente com valor cobrado igual ao informado", async () => {
      setupRows([]);
      const db = expoSqlite.__getMockDB();
      db.__setRun(() => ({ lastInsertRowId: 55, changes: 1 }));

      const { result } = renderHook(() => usePlanilha(7));
      await waitFor(() => expect(result.current.loading).toBe(false));

      let novoId = 0;
      await act(async () => {
        novoId = await result.current.addLinhaAvulsa("Visitante", 80);
      });

      expect(novoId).toBe(55);
      const insert = db.__calls.run.find((c) =>
        /INSERT INTO linhas_planilha/i.test(c.sql)
      );
      expect(insert).toBeDefined();
      expect(insert!.args[1]).toBe("Visitante");
      expect(insert!.args[2]).toBe(80);
      expect(insert!.args[4]).toBe("pendente");
      expect(insert!.args[7]).toBe(80);
      expect(insert!.args[8]).toBe(0);
    });
  });
});

describe("useCriarPlanilhaComMembros", () => {
  beforeEach(() => {
    expoSqlite.__resetMockDB();
  });

  it("cria planilha e uma linha pendente por membro ativo", async () => {
    const db = expoSqlite.__getMockDB();
    db.__setRun((sql) => {
      if (/INSERT INTO planilhas/i.test(sql))
        return { lastInsertRowId: 42, changes: 1 };
      return { lastInsertRowId: 1, changes: 1 };
    });
    db.__setGetAll((sql) => {
      if (/FROM membros/i.test(sql)) {
        return [
          { id: 1, nome: "Ana" },
          { id: 2, nome: "Beto" },
        ];
      }
      return [];
    });

    const { result } = renderHook(() => useCriarPlanilhaComMembros());
    let out = { planilhaId: 0, linhasCriadas: 0 };
    await act(async () => {
      out = await result.current({
        nome: "Mensalidades Maio",
        mes: 5,
        ano: 2026,
        valorPadrao: 100,
      });
    });

    expect(out.planilhaId).toBe(42);
    expect(out.linhasCriadas).toBe(2);

    const inserts = db.__calls.run.filter((c) =>
      /INSERT INTO linhas_planilha/i.test(c.sql)
    );
    expect(inserts).toHaveLength(2);
    expect(inserts[0].args[1]).toBe("Ana");
    expect(inserts[0].args[2]).toBe(100);
    expect(inserts[0].args[4]).toBe("pendente");
    expect(inserts[0].args[7]).toBe(100);
    expect(inserts[0].args[8]).toBe(0);
  });

  it("rejeita mês inválido", async () => {
    const { result } = renderHook(() => useCriarPlanilhaComMembros());
    await expect(
      result.current({ nome: "x", mes: 13, ano: 2026 })
    ).rejects.toThrow("Mês inválido");
  });
});
