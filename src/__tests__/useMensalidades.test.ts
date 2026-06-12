import { act, renderHook, waitFor } from "@testing-library/react-native";
import { useMensalidades } from "@/hooks/useMensalidades";

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

describe("useMensalidades", () => {
  beforeEach(() => expoSqlite.__resetMockDB());

  it("isola dados pelo par mes/ano informado na query", async () => {
    const db = expoSqlite.__getMockDB();
    const seenArgs: unknown[][] = [];
    db.__setGetAll((_sql, args) => {
      seenArgs.push(args);
      return [];
    });

    renderHook(() => useMensalidades(5, 2026));
    await waitFor(() => expect(seenArgs.length).toBeGreaterThan(0));
    expect(seenArgs[0]).toEqual([5, 2026]);
  });

  it("mapeia membro sem pagamento para status pendente e valor 0", async () => {
    const db = expoSqlite.__getMockDB();
    db.__setGetAll(() => [
      {
        membro_id: 1,
        membro_nome: "João",
        mensalidade_id: null,
        valor: null,
        status: null,
        data_pagamento: null,
      },
    ]);

    const { result } = renderHook(() => useMensalidades(5, 2026));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.rows[0].status).toBe("pendente");
    expect(result.current.rows[0].valor).toBe(0);
    expect(result.current.totais.totalArrecadado).toBe(0);
    expect(result.current.totais.qtdPendentes).toBe(1);
  });

  it("calcula totais agregando pagos x pendentes e adimplência", async () => {
    const db = expoSqlite.__getMockDB();
    db.__setGetAll(() => [
      {
        membro_id: 1,
        membro_nome: "Ana",
        mensalidade_id: 10,
        valor: 100,
        status: "pago",
        data_pagamento: "2026-05-05",
      },
      {
        membro_id: 2,
        membro_nome: "Bruno",
        mensalidade_id: 11,
        valor: 100,
        status: "pago",
        data_pagamento: "2026-05-06",
      },
      {
        membro_id: 3,
        membro_nome: "Carla",
        mensalidade_id: 12,
        valor: 80,
        status: "pendente",
        data_pagamento: null,
      },
    ]);

    const { result } = renderHook(() => useMensalidades(5, 2026));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.totais.totalArrecadado).toBe(200);
    expect(result.current.totais.totalPendente).toBe(80);
    expect(result.current.totais.totalPrevisto).toBe(280);
    expect(result.current.totais.qtdPagos).toBe(2);
    expect(result.current.totais.qtdPendentes).toBe(1);
    expect(result.current.totais.adimplenciaPercent).toBeCloseTo(66.66, 1);
  });

  it("totais zerados quando não há membros (adimplência = 0, não NaN)", async () => {
    const db = expoSqlite.__getMockDB();
    db.__setGetAll(() => []);
    const { result } = renderHook(() => useMensalidades(5, 2026));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.totais.adimplenciaPercent).toBe(0);
    expect(result.current.totais.qtdTotal).toBe(0);
  });

  it("registrarPagamento faz UPSERT com status pago e data informada", async () => {
    const db = expoSqlite.__getMockDB();
    db.__setGetAll(() => []);

    const { result } = renderHook(() => useMensalidades(5, 2026));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.registrarPagamento({
        membroId: 1,
        mes: 5,
        ano: 2026,
        valor: 150,
        dataPagamento: "2026-05-15",
      });
    });

    const upsert = db.__calls.run.find((c) =>
      /INSERT INTO mensalidades[\s\S]+ON CONFLICT/i.test(c.sql)
    );
    expect(upsert).toBeDefined();
    expect(upsert!.args).toEqual([5, 2026, 1, 150, "pago", "2026-05-15"]);
  });

  it("registrarPagamento rejeita valor inválido", async () => {
    const db = expoSqlite.__getMockDB();
    db.__setGetAll(() => []);
    const { result } = renderHook(() => useMensalidades(5, 2026));
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

  it("marcarPendente preserva valor existente e zera data", async () => {
    const db = expoSqlite.__getMockDB();
    db.__setGetAll(() => [
      {
        membro_id: 1,
        membro_nome: "Ana",
        mensalidade_id: 10,
        valor: 100,
        status: "pago",
        data_pagamento: "2026-05-05",
      },
    ]);

    const { result } = renderHook(() => useMensalidades(5, 2026));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.marcarPendente({ membroId: 1, mes: 5, ano: 2026 });
    });

    const upsert = db.__calls.run.find((c) =>
      /INSERT INTO mensalidades/i.test(c.sql)
    );
    expect(upsert!.args).toEqual([5, 2026, 1, 100, "pendente", null]);
  });
});
