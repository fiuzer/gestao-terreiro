import { act, renderHook, waitFor } from "@testing-library/react-native";
import { useProdutos } from "@/hooks/useProdutos";

const expoSqlite = jest.requireMock("expo-sqlite") as {
  __resetMockDB: () => void;
  __getMockDB: () => {
    __setGetAll: (h: (sql: string, args: unknown[]) => unknown[]) => void;
    __setRun: (
      h: (sql: string, args: unknown[]) => { lastInsertRowId: number; changes: number }
    ) => void;
    __calls: { run: { sql: string; args: unknown[] }[] };
  };
};

describe("useProdutos", () => {
  beforeEach(() => expoSqlite.__resetMockDB());

  it("isola dados pelo par mes/ano informado na query", async () => {
    const db = expoSqlite.__getMockDB();
    const seenArgs: unknown[][] = [];
    db.__setGetAll((sql, args) => {
      if (/FROM membros/i.test(sql)) {
        seenArgs.push(args);
      }
      return [];
    });

    renderHook(() => useProdutos(5, 2026));
    await waitFor(() => expect(seenArgs.length).toBeGreaterThan(0));
    expect(seenArgs[0]).toEqual([5, 2026]);
  });

  it("mapeia membro sem cota como pendente com valores 0", async () => {
    const db = expoSqlite.__getMockDB();
    db.__setGetAll(() => [
      {
        membro_id: 1,
        membro_nome: "João",
        produto_id: null,
        valor_cobrado: null,
        valor_pago: null,
        status: null,
        data_pagamento: null,
      },
    ]);

    const { result } = renderHook(() => useProdutos(5, 2026));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.rows[0].status).toBe("pendente");
    expect(result.current.rows[0].valor_cobrado).toBe(0);
    expect(result.current.rows[0].valor_pago).toBe(0);
    expect(result.current.totais.totalCobrado).toBe(0);
    expect(result.current.totais.qtdPendentes).toBe(1);
  });

  it("calcula totais agregando pagos, parciais e pendentes", async () => {
    const db = expoSqlite.__getMockDB();
    db.__setGetAll(() => [
      {
        membro_id: 1,
        membro_nome: "Ana",
        produto_id: 10,
        valor_cobrado: 50,
        valor_pago: 50,
        status: "pago",
        data_pagamento: "2026-05-05",
      },
      {
        membro_id: 2,
        membro_nome: "Bruno",
        produto_id: 11,
        valor_cobrado: 50,
        valor_pago: 20,
        status: "parcial",
        data_pagamento: "2026-05-06",
      },
      {
        membro_id: 3,
        membro_nome: "Carla",
        produto_id: 12,
        valor_cobrado: 50,
        valor_pago: 0,
        status: "pendente",
        data_pagamento: null,
      },
    ]);

    const { result } = renderHook(() => useProdutos(5, 2026));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.totais.totalCobrado).toBe(150);
    expect(result.current.totais.totalPago).toBe(70);
    expect(result.current.totais.totalPendente).toBe(80);
    expect(result.current.totais.qtdPagos).toBe(1);
    expect(result.current.totais.qtdParciais).toBe(1);
    expect(result.current.totais.qtdPendentes).toBe(1);
    expect(result.current.totais.adimplenciaPercent).toBeCloseTo(33.33, 1);
  });

  it("totais zerados sem membros (adimplência = 0, não NaN)", async () => {
    const db = expoSqlite.__getMockDB();
    db.__setGetAll(() => []);
    const { result } = renderHook(() => useProdutos(5, 2026));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.totais.adimplenciaPercent).toBe(0);
    expect(result.current.totais.qtdTotal).toBe(0);
  });

  it("registrarPagamento parcial: novo status 'parcial' quando soma < cobrado", async () => {
    const db = expoSqlite.__getMockDB();
    db.__setGetAll(() => [
      {
        membro_id: 1,
        membro_nome: "Ana",
        produto_id: 10,
        valor_cobrado: 100,
        valor_pago: 0,
        status: "pendente",
        data_pagamento: null,
      },
    ]);

    const { result } = renderHook(() => useProdutos(5, 2026));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.registrarPagamento({
        membroId: 1,
        mes: 5,
        ano: 2026,
        valor: 40,
        dataPagamento: "2026-05-15",
      });
    });

    const upsert = db.__calls.run.find((c) =>
      /INSERT INTO produtos_limpeza[\s\S]+ON CONFLICT/i.test(c.sql)
    );
    expect(upsert).toBeDefined();
    expect(upsert!.args).toEqual([5, 2026, 1, 100, 40, "parcial", "2026-05-15", null]);
  });

  it("registrarPagamento satura em valor_cobrado e marca 'pago'", async () => {
    const db = expoSqlite.__getMockDB();
    db.__setGetAll(() => [
      {
        membro_id: 1,
        membro_nome: "Ana",
        produto_id: 10,
        valor_cobrado: 100,
        valor_pago: 70,
        status: "parcial",
        data_pagamento: "2026-05-01",
      },
    ]);

    const { result } = renderHook(() => useProdutos(5, 2026));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.registrarPagamento({
        membroId: 1,
        mes: 5,
        ano: 2026,
        valor: 50,
        dataPagamento: "2026-05-15",
      });
    });

    const upsert = db.__calls.run.find((c) =>
      /INSERT INTO produtos_limpeza[\s\S]+ON CONFLICT/i.test(c.sql)
    );
    expect(upsert!.args).toEqual([5, 2026, 1, 100, 100, "pago", "2026-05-15", null]);
  });

  it("registrarPagamento rejeita valor inválido", async () => {
    const db = expoSqlite.__getMockDB();
    db.__setGetAll(() => []);
    const { result } = renderHook(() => useProdutos(5, 2026));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await expect(
      result.current.registrarPagamento({
        membroId: 1,
        mes: 5,
        ano: 2026,
        valor: -10,
      })
    ).rejects.toThrow("Valor inválido");
  });

  it("marcarPendente preserva valor_cobrado, zera valor_pago e data", async () => {
    const db = expoSqlite.__getMockDB();
    db.__setGetAll(() => [
      {
        membro_id: 1,
        membro_nome: "Ana",
        produto_id: 10,
        valor_cobrado: 100,
        valor_pago: 100,
        status: "pago",
        data_pagamento: "2026-05-05",
      },
    ]);

    const { result } = renderHook(() => useProdutos(5, 2026));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.marcarPendente({ membroId: 1, mes: 5, ano: 2026 });
    });

    const upsert = db.__calls.run.find((c) =>
      /INSERT INTO produtos_limpeza/i.test(c.sql)
    );
    expect(upsert!.args).toEqual([5, 2026, 1, 100, 0, "pendente", null, null]);
  });

  it("atualizarValor reajusta status se valor_pago acumulado >= novo cobrado", async () => {
    const db = expoSqlite.__getMockDB();
    db.__setGetAll(() => [
      {
        membro_id: 1,
        membro_nome: "Ana",
        produto_id: 10,
        valor_cobrado: 100,
        valor_pago: 60,
        status: "parcial",
        data_pagamento: "2026-05-10",
      },
    ]);

    const { result } = renderHook(() => useProdutos(5, 2026));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.atualizarValor({
        membroId: 1,
        mes: 5,
        ano: 2026,
        valorCobrado: 50,
      });
    });

    const upsert = db.__calls.run.find((c) =>
      /INSERT INTO produtos_limpeza/i.test(c.sql)
    );
    expect(upsert!.args).toEqual([5, 2026, 1, 50, 50, "pago", "2026-05-10", null]);
  });

  it("definirCotaPadrao aplica cota para cada membro ativo via UPSERT", async () => {
    const db = expoSqlite.__getMockDB();
    db.__setGetAll((sql) => {
      if (/SELECT id FROM membros WHERE ativo/i.test(sql)) {
        return [{ id: 1 }, { id: 2 }, { id: 3 }];
      }
      return [];
    });

    const { result } = renderHook(() => useProdutos(5, 2026));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.definirCotaPadrao({
        mes: 5,
        ano: 2026,
        valorCobrado: 75,
      });
    });

    const upserts = db.__calls.run.filter((c) =>
      /INSERT INTO produtos_limpeza[\s\S]+ON CONFLICT/i.test(c.sql)
    );
    expect(upserts).toHaveLength(3);
    expect(upserts[0].args).toEqual([5, 2026, 1, 75]);
    expect(upserts[2].args).toEqual([5, 2026, 3, 75]);
  });
});
