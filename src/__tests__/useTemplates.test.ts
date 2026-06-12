import { act, renderHook, waitFor } from "@testing-library/react-native";
import { useTemplates } from "@/hooks/useTemplates";

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

describe("useTemplates", () => {
  beforeEach(() => expoSqlite.__resetMockDB());

  it("lista templates com contagem de linhas", async () => {
    const db = expoSqlite.__getMockDB();
    db.__setGetAll((sql) => {
      if (/FROM templates/i.test(sql)) {
        return [
          { id: 1, nome: "Bori", created_at: "2026-05-01", qtd_linhas: 4 },
          { id: 2, nome: "Festa", created_at: "2026-05-02", qtd_linhas: 7 },
        ];
      }
      return [];
    });

    const { result } = renderHook(() => useTemplates());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.templates).toHaveLength(2);
    expect(result.current.templates[0].qtd_linhas).toBe(4);
  });

  it("salvarComoTemplate copia linhas da planilha de origem (transação)", async () => {
    const db = expoSqlite.__getMockDB();
    db.__setGetAll((sql) => {
      if (/FROM linhas_planilha/i.test(sql)) {
        return [
          { nome: "Padê", tipo: "saida", observacao: null },
          { nome: "Velas", tipo: "saida", observacao: "7 unid" },
        ];
      }
      if (/FROM templates/i.test(sql)) return [];
      return [];
    });
    let calls = 0;
    db.__setRun(() => {
      calls += 1;
      return { lastInsertRowId: calls === 1 ? 33 : calls, changes: 1 };
    });

    const { result } = renderHook(() => useTemplates());
    await waitFor(() => expect(result.current.loading).toBe(false));

    let novoId = 0;
    await act(async () => {
      novoId = await result.current.salvarComoTemplate(7, " Bori Padrão ");
    });

    expect(novoId).toBe(33);
    const tplInsert = db.__calls.run.find((c) => /INSERT INTO templates/i.test(c.sql));
    expect(tplInsert!.args).toEqual(["Bori Padrão"]);

    const linhaInserts = db.__calls.run.filter((c) =>
      /INSERT INTO template_linhas/i.test(c.sql)
    );
    expect(linhaInserts).toHaveLength(2);
    expect(linhaInserts[0].args).toEqual([33, "Padê", "saida", null]);
    expect(linhaInserts[1].args).toEqual([33, "Velas", "saida", "7 unid"]);
  });

  it("salvarComoTemplate rejeita nome vazio", async () => {
    const db = expoSqlite.__getMockDB();
    db.__setGetAll(() => []);
    const { result } = renderHook(() => useTemplates());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await expect(result.current.salvarComoTemplate(1, "   ")).rejects.toThrow(
      "Nome obrigatório"
    );
  });

  it("criarPlanilhaPorTemplate zera valores mas mantém nomes/tipos das linhas", async () => {
    const db = expoSqlite.__getMockDB();
    db.__setGetAll((sql) => {
      if (/FROM template_linhas/i.test(sql)) {
        return [
          { id: 1, template_id: 9, nome: "Padê", tipo: "saida", observacao: null },
          { id: 2, template_id: 9, nome: "Doação", tipo: "entrada", observacao: "obs" },
        ];
      }
      if (/FROM templates/i.test(sql)) return [];
      return [];
    });
    db.__setGetFirst((sql) => {
      if (/FROM templates WHERE id/i.test(sql)) {
        return { id: 9, nome: "Bori" };
      }
      return null;
    });
    let calls = 0;
    db.__setRun(() => {
      calls += 1;
      return { lastInsertRowId: calls === 1 ? 555 : calls, changes: 1 };
    });

    const { result } = renderHook(() => useTemplates());
    await waitFor(() => expect(result.current.loading).toBe(false));

    let novoId = 0;
    await act(async () => {
      novoId = await result.current.criarPlanilhaPorTemplate({
        templateId: 9,
        tipo_modulo: "candombles",
        orixa_id: 1,
        categoria_id: null,
        mes: null,
        ano: null,
      });
    });

    expect(novoId).toBe(555);

    const planilhaInsert = db.__calls.run.find((c) => /INSERT INTO planilhas/i.test(c.sql));
    expect(planilhaInsert!.args[0]).toBe("Bori");
    expect(planilhaInsert!.args[1]).toBe("candombles");

    const linhasInsert = db.__calls.run.filter((c) =>
      /INSERT INTO linhas_planilha/i.test(c.sql)
    );
    expect(linhasInsert).toHaveLength(2);

    expect(linhasInsert[0].sql).toMatch(
      /VALUES \(\?, \?, \?, \?, 'pendente', NULL, \?, \?, 0\)/
    );
    expect(linhasInsert[0].args).toEqual([555, "Padê", 0, "saida", null, 0]);
    expect(linhasInsert[1].args).toEqual([555, "Doação", 0, "entrada", "obs", 0]);
  });

  it("criarPlanilhaPorTemplate usa nome customizado quando fornecido", async () => {
    const db = expoSqlite.__getMockDB();
    db.__setGetAll(() => []);
    db.__setGetFirst(() => ({ id: 9, nome: "Bori" }));

    const { result } = renderHook(() => useTemplates());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.criarPlanilhaPorTemplate({
        templateId: 9,
        nome: "Festa Maio 2026",
        tipo_modulo: "candombles",
        orixa_id: 1,
        categoria_id: null,
        mes: null,
        ano: null,
      });
    });

    const planilhaInsert = db.__calls.run.find((c) => /INSERT INTO planilhas/i.test(c.sql));
    expect(planilhaInsert!.args[0]).toBe("Festa Maio 2026");
  });

  it("criarPlanilhaPorTemplate lança erro quando template não existe", async () => {
    const db = expoSqlite.__getMockDB();
    db.__setGetAll(() => []);
    db.__setGetFirst(() => null);

    const { result } = renderHook(() => useTemplates());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await expect(
      result.current.criarPlanilhaPorTemplate({
        templateId: 999,
        tipo_modulo: "geral",
        orixa_id: null,
        categoria_id: null,
        mes: null,
        ano: null,
      })
    ).rejects.toThrow("Template não encontrado");
  });
});
