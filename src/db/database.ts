import type { SQLiteDatabase } from "expo-sqlite";
import { ORIXAS_PADRAO } from "@/types/models";

export const DATABASE_NAME = "gestao-terreiro.db";

const SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS membros (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    ativo INTEGER NOT NULL DEFAULT 1
  );`,

  `CREATE TABLE IF NOT EXISTS orixas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL UNIQUE
  );`,

  `CREATE TABLE IF NOT EXISTS categorias (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    pai_id INTEGER REFERENCES categorias(id) ON DELETE CASCADE,
    orixa_id INTEGER
  );`,

  `CREATE TABLE IF NOT EXISTS planilhas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    tipo_modulo TEXT NOT NULL,
    orixa_id INTEGER,
    categoria_id INTEGER REFERENCES categorias(id) ON DELETE SET NULL,
    mes INTEGER,
    ano INTEGER,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );`,

  `CREATE TABLE IF NOT EXISTS linhas_planilha (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    planilha_id INTEGER NOT NULL REFERENCES planilhas(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    valor REAL NOT NULL DEFAULT 0,
    valor_cobrado REAL NOT NULL DEFAULT 0,
    valor_pago REAL NOT NULL DEFAULT 0,
    tipo TEXT NOT NULL CHECK (tipo IN ('entrada', 'saida')),
    status TEXT NOT NULL CHECK (status IN ('pago', 'parcial', 'pendente')) DEFAULT 'pendente',
    data TEXT,
    observacao TEXT
  );`,

  `CREATE TABLE IF NOT EXISTS mensalidades (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    mes INTEGER NOT NULL,
    ano INTEGER NOT NULL,
    membro_id INTEGER NOT NULL REFERENCES membros(id) ON DELETE CASCADE,
    valor REAL NOT NULL DEFAULT 0,
    status TEXT NOT NULL CHECK (status IN ('pago', 'pendente')) DEFAULT 'pendente',
    data_pagamento TEXT,
    UNIQUE (mes, ano, membro_id)
  );`,

  `CREATE TABLE IF NOT EXISTS produtos_limpeza (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    mes INTEGER NOT NULL,
    ano INTEGER NOT NULL,
    membro_id INTEGER NOT NULL REFERENCES membros(id) ON DELETE CASCADE,
    valor_cobrado REAL NOT NULL DEFAULT 0,
    valor_pago REAL NOT NULL DEFAULT 0,
    status TEXT NOT NULL CHECK (status IN ('pago', 'parcial', 'pendente', 'doado')) DEFAULT 'pendente',
    data_pagamento TEXT,
    nome_produto_doado TEXT,
    UNIQUE (mes, ano, membro_id)
  );`,

  `CREATE TABLE IF NOT EXISTS configuracoes (
    chave TEXT PRIMARY KEY,
    valor TEXT NOT NULL
  );`,

  `CREATE TABLE IF NOT EXISTS templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );`,

  `CREATE TABLE IF NOT EXISTS template_linhas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    template_id INTEGER NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    tipo TEXT NOT NULL CHECK (tipo IN ('entrada', 'saida')),
    valor_padrao REAL NOT NULL DEFAULT 0,
    observacao TEXT
  );`,

  `CREATE TABLE IF NOT EXISTS caixa_lancamentos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tipo TEXT NOT NULL CHECK(tipo IN ('entrada', 'saida')),
    categoria TEXT NOT NULL,
    descricao TEXT NOT NULL,
    valor REAL NOT NULL CHECK(valor > 0),
    data TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );`,

  `CREATE INDEX IF NOT EXISTS idx_linhas_planilha_id ON linhas_planilha (planilha_id);`,
  `CREATE INDEX IF NOT EXISTS idx_planilhas_modulo ON planilhas (tipo_modulo);`,
  `CREATE INDEX IF NOT EXISTS idx_planilhas_mes_ano ON planilhas (ano, mes);`,
  `CREATE INDEX IF NOT EXISTS idx_mensalidades_mes_ano ON mensalidades (ano, mes);`,
  `CREATE INDEX IF NOT EXISTS idx_categorias_pai ON categorias (pai_id);`,
  `CREATE INDEX IF NOT EXISTS idx_template_linhas_template ON template_linhas (template_id);`,
  `CREATE INDEX IF NOT EXISTS idx_caixa_data ON caixa_lancamentos (data);`,
];

export async function initDB(db: SQLiteDatabase): Promise<void> {
  await db.execAsync("PRAGMA journal_mode = WAL;");
  await db.execAsync("PRAGMA foreign_keys = ON;");

  await migrateLegacyTemplates(db);
  await migrateLinhasPlanilhaParcial(db);

  await db.withTransactionAsync(async () => {
    for (const statement of SCHEMA_STATEMENTS) {
      await db.execAsync(statement);
    }
  });

  await migrateTemplateLinhasValorPadrao(db);
  await migrateProdutosLimpezaDoado(db);

  await seedOrixas(db);
  await seedConfiguracoes(db);
}

type ColumnInfo = { name: string };

async function migrateLegacyTemplates(db: SQLiteDatabase): Promise<void> {
  const cols = await db.getAllAsync<ColumnInfo>(
    "PRAGMA table_info(templates);"
  );
  if (cols.length === 0) return;
  const hasLegacy = cols.some((c) => c.name === "planilha_origem_id");
  const hasCreatedAt = cols.some((c) => c.name === "created_at");
  if (hasLegacy || !hasCreatedAt) {
    await db.execAsync("DROP TABLE IF EXISTS template_linhas;");
    await db.execAsync("DROP TABLE IF EXISTS templates;");
  }
}

async function migrateLinhasPlanilhaParcial(db: SQLiteDatabase): Promise<void> {
  const cols = await db.getAllAsync<ColumnInfo>(
    "PRAGMA table_info(linhas_planilha);"
  );
  if (cols.length === 0) return;

  const hasValorCobrado = cols.some((c) => c.name === "valor_cobrado");
  const hasValorPago = cols.some((c) => c.name === "valor_pago");

  if (!hasValorCobrado) {
    await db.execAsync(
      "ALTER TABLE linhas_planilha ADD COLUMN valor_cobrado REAL NOT NULL DEFAULT 0;"
    );
    await db.execAsync(
      "UPDATE linhas_planilha SET valor_cobrado = valor WHERE valor_cobrado = 0;"
    );
  }
  if (!hasValorPago) {
    await db.execAsync(
      "ALTER TABLE linhas_planilha ADD COLUMN valor_pago REAL NOT NULL DEFAULT 0;"
    );
    await db.execAsync(
      "UPDATE linhas_planilha SET valor_pago = valor_cobrado WHERE status = 'pago';"
    );
  }

  await db.withTransactionAsync(async () => {
    await db.execAsync(
      `CREATE TABLE IF NOT EXISTS linhas_planilha_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        planilha_id INTEGER NOT NULL REFERENCES planilhas(id) ON DELETE CASCADE,
        nome TEXT NOT NULL,
        valor REAL NOT NULL DEFAULT 0,
        valor_cobrado REAL NOT NULL DEFAULT 0,
        valor_pago REAL NOT NULL DEFAULT 0,
        tipo TEXT NOT NULL CHECK (tipo IN ('entrada', 'saida')),
        status TEXT NOT NULL CHECK (status IN ('pago', 'parcial', 'pendente')) DEFAULT 'pendente',
        data TEXT,
        observacao TEXT
      );`
    );
    await db.execAsync(
      `INSERT INTO linhas_planilha_new (id, planilha_id, nome, valor, valor_cobrado, valor_pago, tipo, status, data, observacao)
       SELECT id, planilha_id, nome, valor, valor_cobrado, valor_pago, tipo, status, data, observacao FROM linhas_planilha;`
    );
    await db.execAsync("DROP TABLE linhas_planilha;");
    await db.execAsync(
      "ALTER TABLE linhas_planilha_new RENAME TO linhas_planilha;"
    );
  });
}

async function migrateTemplateLinhasValorPadrao(
  db: SQLiteDatabase
): Promise<void> {
  const cols = await db.getAllAsync<ColumnInfo>(
    "PRAGMA table_info(template_linhas);"
  );
  if (cols.length === 0) return;
  const hasValorPadrao = cols.some((c) => c.name === "valor_padrao");
  if (!hasValorPadrao) {
    await db.execAsync(
      "ALTER TABLE template_linhas ADD COLUMN valor_padrao REAL NOT NULL DEFAULT 0;"
    );
  }
}

async function migrateProdutosLimpezaDoado(db: SQLiteDatabase): Promise<void> {
  const cols = await db.getAllAsync<ColumnInfo>(
    "PRAGMA table_info(produtos_limpeza);"
  );
  if (cols.length === 0) return;

  const hasNomeProdutoDoado = cols.some((c) => c.name === "nome_produto_doado");
  if (!hasNomeProdutoDoado) {
    try {
      await db.execAsync(
        "ALTER TABLE produtos_limpeza ADD COLUMN nome_produto_doado TEXT;"
      );
    } catch {
      // coluna já existe — ignora
    }
  }

  type StatusCheckRow = { sql: string | null };
  const tableInfo = await db.getFirstAsync<StatusCheckRow>(
    "SELECT sql FROM sqlite_master WHERE type='table' AND name='produtos_limpeza'"
  );
  const tableSql = tableInfo?.sql ?? "";
  if (tableSql && !tableSql.includes("'doado'")) {
    await db.withTransactionAsync(async () => {
      await db.execAsync(
        `CREATE TABLE IF NOT EXISTS produtos_limpeza_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          mes INTEGER NOT NULL,
          ano INTEGER NOT NULL,
          membro_id INTEGER NOT NULL REFERENCES membros(id) ON DELETE CASCADE,
          valor_cobrado REAL NOT NULL DEFAULT 0,
          valor_pago REAL NOT NULL DEFAULT 0,
          status TEXT NOT NULL CHECK (status IN ('pago', 'parcial', 'pendente', 'doado')) DEFAULT 'pendente',
          data_pagamento TEXT,
          nome_produto_doado TEXT,
          UNIQUE (mes, ano, membro_id)
        );`
      );
      await db.execAsync(
        `INSERT INTO produtos_limpeza_new (id, mes, ano, membro_id, valor_cobrado, valor_pago, status, data_pagamento, nome_produto_doado)
         SELECT id, mes, ano, membro_id, valor_cobrado, valor_pago, status, data_pagamento, nome_produto_doado FROM produtos_limpeza;`
      );
      await db.execAsync("DROP TABLE produtos_limpeza;");
      await db.execAsync(
        "ALTER TABLE produtos_limpeza_new RENAME TO produtos_limpeza;"
      );
    });
  }
}

async function seedOrixas(db: SQLiteDatabase): Promise<void> {
  await db.withTransactionAsync(async () => {
    for (const nome of ORIXAS_PADRAO) {
      await db.runAsync(
        "INSERT OR IGNORE INTO orixas (nome) VALUES (?)",
        nome
      );
    }
  });
}

const CONFIGURACOES_PADRAO: ReadonlyArray<readonly [string, string]> = [
  ["valor_padrao_mensalidade", "100"],
  ["valor_padrao_produto", "10"],
];

async function seedConfiguracoes(db: SQLiteDatabase): Promise<void> {
  await db.withTransactionAsync(async () => {
    for (const [chave, valor] of CONFIGURACOES_PADRAO) {
      await db.runAsync(
        "INSERT OR IGNORE INTO configuracoes (chave, valor) VALUES (?, ?)",
        chave,
        valor
      );
    }
  });
}
