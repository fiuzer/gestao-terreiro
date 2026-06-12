export type SQLArgs = unknown[];

export type SQLHandler<T = unknown> = (sql: string, args: SQLArgs) => T;

export type FakeDB = {
  execAsync: jest.Mock<Promise<void>, [string]>;
  runAsync: jest.Mock<
    Promise<{ lastInsertRowId: number; changes: number }>,
    [string, ...SQLArgs]
  >;
  getAllAsync: jest.Mock<Promise<unknown[]>, [string, ...SQLArgs]>;
  getFirstAsync: jest.Mock<Promise<unknown | null>, [string, ...SQLArgs]>;
  withTransactionAsync: jest.Mock<Promise<void>, [() => Promise<void>]>;
  __calls: { exec: string[]; run: { sql: string; args: SQLArgs }[] };
  __setGetAll: (handler: SQLHandler<unknown[]>) => void;
  __setGetFirst: (handler: SQLHandler<unknown | null>) => void;
  __setRun: (
    handler: SQLHandler<{ lastInsertRowId: number; changes: number }>
  ) => void;
};

export function createFakeDB(): FakeDB {
  const calls = { exec: [] as string[], run: [] as { sql: string; args: SQLArgs }[] };

  let getAllHandler: SQLHandler<unknown[]> = () => [];
  let getFirstHandler: SQLHandler<unknown | null> = () => null;
  let runHandler: SQLHandler<{ lastInsertRowId: number; changes: number }> = () => ({
    lastInsertRowId: 1,
    changes: 1,
  });

  const fake: FakeDB = {
    execAsync: jest.fn(async (sql: string) => {
      calls.exec.push(sql);
    }),
    runAsync: jest.fn(async (sql: string, ...args: SQLArgs) => {
      calls.run.push({ sql, args });
      return runHandler(sql, args);
    }),
    getAllAsync: jest.fn(async (sql: string, ...args: SQLArgs) => {
      return getAllHandler(sql, args);
    }),
    getFirstAsync: jest.fn(async (sql: string, ...args: SQLArgs) => {
      return getFirstHandler(sql, args);
    }),
    withTransactionAsync: jest.fn(async (fn: () => Promise<void>) => {
      await fn();
    }),
    __calls: calls,
    __setGetAll: (h) => {
      getAllHandler = h;
    },
    __setGetFirst: (h) => {
      getFirstHandler = h;
    },
    __setRun: (h) => {
      runHandler = h;
    },
  };

  return fake;
}
