import { act, renderHook, waitFor } from "@testing-library/react-native";
import { useMembros } from "@/hooks/useMembros";

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

describe("useMembros", () => {
  beforeEach(() => expoSqlite.__resetMockDB());

  it("converte ativo (0/1) em boolean na view", async () => {
    const db = expoSqlite.__getMockDB();
    db.__setGetAll(() => [
      { id: 1, nome: "Ana", ativo: 1 },
      { id: 2, nome: "Bruno", ativo: 0 },
    ]);

    const { result } = renderHook(() => useMembros());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.membros).toEqual([
      { id: 1, nome: "Ana", ativo: true },
      { id: 2, nome: "Bruno", ativo: false },
    ]);
    expect(result.current.membrosAtivos).toHaveLength(1);
  });

  it("create rejeita nome em branco", async () => {
    const db = expoSqlite.__getMockDB();
    db.__setGetAll(() => []);
    const { result } = renderHook(() => useMembros());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await expect(result.current.create({ nome: "  " })).rejects.toThrow(
      "Nome obrigatório"
    );
  });

  it("create insere com ativo=1 e retorna id", async () => {
    const db = expoSqlite.__getMockDB();
    db.__setGetAll(() => []);
    db.__setRun(() => ({ lastInsertRowId: 7, changes: 1 }));

    const { result } = renderHook(() => useMembros());
    await waitFor(() => expect(result.current.loading).toBe(false));

    let id = 0;
    await act(async () => {
      id = await result.current.create({ nome: " Maria " });
    });

    expect(id).toBe(7);
    const insert = db.__calls.run.find((c) => /INSERT INTO membros/i.test(c.sql));
    expect(insert!.args).toEqual(["Maria"]);
  });

  it("setAtivo grava 1/0 conforme boolean", async () => {
    const db = expoSqlite.__getMockDB();
    db.__setGetAll(() => []);

    const { result } = renderHook(() => useMembros());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.setAtivo(3, false);
    });

    const update = db.__calls.run.find((c) => /UPDATE membros SET ativo/i.test(c.sql));
    expect(update!.args).toEqual([0, 3]);
  });

  it("lista vazia quando não há membros (empty state)", async () => {
    const db = expoSqlite.__getMockDB();
    db.__setGetAll(() => []);
    const { result } = renderHook(() => useMembros());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.membros).toEqual([]);
    expect(result.current.membrosAtivos).toEqual([]);
  });
});
