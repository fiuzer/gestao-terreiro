import { initDB, DATABASE_NAME } from "@/db/database";
import { createFakeDB } from "./helpers/fakeDB";

describe("database.initDB", () => {
  it("exporta o nome esperado do arquivo SQLite", () => {
    expect(DATABASE_NAME).toBe("gestao-terreiro.db");
  });

  it("habilita PRAGMA WAL e foreign_keys antes de criar o schema", async () => {
    const db = createFakeDB();
    db.__setGetAll(() => []);
    await initDB(db as never);
    expect(db.__calls.exec[0]).toMatch(/journal_mode\s*=\s*WAL/i);
    expect(db.__calls.exec[1]).toMatch(/foreign_keys\s*=\s*ON/i);
  });

  it("cria as tabelas planilhas, linhas_planilha, mensalidades, membros, categorias, templates, template_linhas", async () => {
    const db = createFakeDB();
    db.__setGetAll(() => []);
    await initDB(db as never);

    const allSql = db.__calls.exec.join("\n");
    const tabelas = [
      "membros",
      "orixas",
      "categorias",
      "planilhas",
      "linhas_planilha",
      "mensalidades",
      "templates",
      "template_linhas",
    ];

    for (const t of tabelas) {
      expect(allSql).toMatch(
        new RegExp(`CREATE TABLE IF NOT EXISTS\\s+${t}\\b`)
      );
    }
  });

  it("cria índices para perfomance de queries críticas", async () => {
    const db = createFakeDB();
    db.__setGetAll(() => []);
    await initDB(db as never);

    const allSql = db.__calls.exec.join("\n");
    expect(allSql).toMatch(/CREATE INDEX IF NOT EXISTS idx_linhas_planilha_id/);
    expect(allSql).toMatch(/CREATE INDEX IF NOT EXISTS idx_mensalidades_mes_ano/);
    expect(allSql).toMatch(/CREATE INDEX IF NOT EXISTS idx_template_linhas_template/);
  });

  it("popula os orixás padrão (Oxalá, Ogun, Oyá, Odé, Oxum) via INSERT OR IGNORE", async () => {
    const db = createFakeDB();
    db.__setGetAll(() => []);
    await initDB(db as never);

    const insertedNames = db.__calls.run
      .filter((c) => /INSERT OR IGNORE INTO orixas/i.test(c.sql))
      .map((c) => c.args[0]);

    expect(insertedNames).toEqual(
      expect.arrayContaining(["Oxalá", "Ogun", "Oyá", "Odé", "Oxum"])
    );
  });

  it("dropa templates legados quando detecta coluna planilha_origem_id", async () => {
    const db = createFakeDB();
    db.__setGetAll((sql) => {
      if (/PRAGMA table_info\(templates\)/i.test(sql)) {
        return [{ name: "id" }, { name: "nome" }, { name: "planilha_origem_id" }];
      }
      return [];
    });
    await initDB(db as never);

    const dropped = db.__calls.exec.filter((s) => /DROP TABLE IF EXISTS template/i.test(s));
    expect(dropped.length).toBeGreaterThanOrEqual(2);
  });

  it("não dropa nada quando o schema de templates está atualizado", async () => {
    const db = createFakeDB();
    db.__setGetAll((sql) => {
      if (/PRAGMA table_info\(templates\)/i.test(sql)) {
        return [{ name: "id" }, { name: "nome" }, { name: "created_at" }];
      }
      return [];
    });
    await initDB(db as never);

    const dropped = db.__calls.exec.filter((s) => /DROP TABLE/i.test(s));
    expect(dropped).toHaveLength(0);
  });
});
