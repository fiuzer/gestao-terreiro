import { act, renderHook, waitFor } from "@testing-library/react-native";
import { useCandomble } from "@/hooks/useCandomble";

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

describe("useCandomble", () => {
  beforeEach(() => expoSqlite.__resetMockDB());

  it("carrega lista de orixás na ordem do banco", async () => {
    const db = expoSqlite.__getMockDB();
    db.__setGetAll((sql) => {
      if (/FROM orixas/i.test(sql)) {
        return [
          { id: 1, nome: "Oxalá" },
          { id: 2, nome: "Ogun" },
        ];
      }
      return [];
    });

    const { result } = renderHook(() => useCandomble());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.orixas).toHaveLength(2);
    expect(result.current.orixas[0].nome).toBe("Oxalá");
  });

  it("listCategorias com pai null retorna categorias raiz do orixá (hierarquia preservada)", async () => {
    const db = expoSqlite.__getMockDB();
    const capturedArgs: unknown[] = [];
    let usedQuery = "";
    db.__setGetAll((sql, args) => {
      if (/FROM categorias/i.test(sql)) {
        usedQuery = sql;
        capturedArgs.push(...args);
        return [{ id: 10, nome: "Festas", pai_id: null, orixa_id: 1 }];
      }
      if (/FROM orixas/i.test(sql)) {
        return [{ id: 1, nome: "Oxalá" }];
      }
      return [];
    });

    const { result } = renderHook(() => useCandomble());
    await waitFor(() => expect(result.current.loading).toBe(false));

    const cats = await result.current.listCategorias(null, 1);
    expect(cats).toEqual([{ id: 10, nome: "Festas", pai_id: null, orixa_id: 1 }]);
    expect(usedQuery).toMatch(/pai_id IS NULL AND orixa_id = \?/);
    expect(capturedArgs).toEqual([1]);
  });

  it("listCategorias com pai informado retorna categorias filhas (relação pai/filho)", async () => {
    const db = expoSqlite.__getMockDB();
    let usedQuery = "";
    const capturedArgs: unknown[] = [];
    db.__setGetAll((sql, args) => {
      if (/FROM categorias/i.test(sql)) {
        usedQuery = sql;
        capturedArgs.push(...args);
        return [{ id: 22, nome: "Bori", pai_id: 10, orixa_id: 1 }];
      }
      return [];
    });

    const { result } = renderHook(() => useCandomble());
    await waitFor(() => expect(result.current.loading).toBe(false));

    const filhas = await result.current.listCategorias(10, 1);
    expect(filhas).toHaveLength(1);
    expect(filhas[0].pai_id).toBe(10);
    expect(usedQuery).toMatch(/pai_id = \?/);
    expect(capturedArgs).toEqual([10]);
  });

  it("addCategoria insere com pai_id e orixa_id preservando hierarquia", async () => {
    const db = expoSqlite.__getMockDB();
    db.__setGetAll(() => []);
    db.__setRun(() => ({ lastInsertRowId: 99, changes: 1 }));

    const { result } = renderHook(() => useCandomble());
    await waitFor(() => expect(result.current.loading).toBe(false));

    let id = 0;
    await act(async () => {
      id = await result.current.addCategoria({
        nome: "Subcategoria",
        pai_id: 10,
        orixa_id: 1,
      });
    });

    expect(id).toBe(99);
    const insert = db.__calls.run.find((c) => /INSERT INTO categorias/i.test(c.sql));
    expect(insert!.args).toEqual(["Subcategoria", 10, 1]);
  });

  it("addPlanilha vincula a tipo_modulo 'candombles' com categoria opcional", async () => {
    const db = expoSqlite.__getMockDB();
    db.__setGetAll(() => []);
    db.__setRun(() => ({ lastInsertRowId: 50, changes: 1 }));

    const { result } = renderHook(() => useCandomble());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.addPlanilha({
        nome: "Festa de Oxalá 2026",
        categoria_id: 10,
        orixa_id: 1,
      });
    });

    const insert = db.__calls.run.find((c) => /INSERT INTO planilhas/i.test(c.sql));
    expect(insert!.sql).toMatch(/'candombles'/);
    expect(insert!.args).toEqual(["Festa de Oxalá 2026", 1, 10]);
  });

  it("addCategoria rejeita nome vazio", async () => {
    const db = expoSqlite.__getMockDB();
    db.__setGetAll(() => []);
    const { result } = renderHook(() => useCandomble());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await expect(
      result.current.addCategoria({ nome: "   ", pai_id: null, orixa_id: 1 })
    ).rejects.toThrow("Nome obrigatório");
  });
});
