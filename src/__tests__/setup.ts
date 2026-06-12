jest.mock("expo-sqlite", () => {
  const { createFakeDB } = require("./helpers/fakeDB");
  let currentDB = createFakeDB();

  return {
    __esModule: true,
    openDatabaseAsync: jest.fn(async () => currentDB),
    openDatabaseSync: jest.fn(() => currentDB),
    useSQLiteContext: jest.fn(() => currentDB),
    SQLiteProvider: ({ children }: { children: unknown }) => children,
    __setMockDB: (db: unknown) => {
      currentDB = db as ReturnType<typeof createFakeDB>;
    },
    __resetMockDB: () => {
      currentDB = createFakeDB();
    },
    __getMockDB: () => currentDB,
  };
});
