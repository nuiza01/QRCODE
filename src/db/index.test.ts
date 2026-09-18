import { describe, expect, it, vi } from "vitest";

const dbState = vi.hoisted(() => {
  const on = vi.fn();
  const core = {
    _allConnections: { length: 0, get: vi.fn(() => undefined) },
    _freeConnections: { length: 0, get: vi.fn(() => undefined) },
    _connectionQueue: { length: 0 },
    _closed: false,
    config: { connectionLimit: 5, queueLimit: 10 },
    _removeConnection: vi.fn(),
    end: vi.fn((callback?: (error?: unknown) => void) => callback?.()),
    on,
  };
  const pool = {
    pool: core,
    getConnection: vi.fn(),
    query: vi.fn(),
    execute: vi.fn(),
    end: vi.fn(() => Promise.resolve()),
    on,
  };
  const database = { id: "test-db" };
  return {
    database,
    drizzle: vi.fn((options: unknown) => {
      void options;
      return database;
    }),
    core,
    on,
    pool,
    createPool: vi.fn(() => pool),
  };
});

vi.mock("server-only", () => ({}));
vi.mock("mysql2/promise", () => ({
  default: { createPool: dbState.createPool },
}));
vi.mock("drizzle-orm/mysql2", () => ({ drizzle: dbState.drizzle }));
vi.mock("@/lib/env", () => ({
  getEnv: () => ({
    DATABASE_URL: "mysql://test:secret@localhost:3306/nqr",
  }),
}));

import { getDb } from "./index";

describe("MariaDB connection initialization", () => {
  it("sets both driver and server-session timezone to UTC", () => {
    expect(getDb()).toBe(dbState.database);
    expect(dbState.createPool).toHaveBeenCalledWith(
      expect.objectContaining({
        connectTimeout: 5_000,
        queueLimit: 10,
        timezone: "Z",
        waitForConnections: true,
      }),
    );
    const drizzleOptions = dbState.drizzle.mock.calls[0]?.[0] as unknown as {
      client?: { pool?: unknown };
    };
    expect(drizzleOptions.client).not.toBe(dbState.pool);
    expect(drizzleOptions.client?.pool).toBeUndefined();
    expect(dbState.core._allConnections.length).toBe(0);
    expect(dbState.core._freeConnections.length).toBe(0);
    expect(dbState.core._connectionQueue.length).toBe(0);
    expect(dbState.pool.getConnection).not.toHaveBeenCalled();

    const connectionListener = dbState.on.mock.calls.find(
      ([event]) => event === "connection",
    )?.[1] as
      | ((connection: {
          destroy: () => void;
          query: (
            sql: string,
            callback: (error: Error | null) => void,
          ) => void;
        }) => void)
      | undefined;
    expect(connectionListener).toBeTypeOf("function");

    const destroy = vi.fn();
    const query = vi.fn(
      (_sql: string, callback: (error: Error | null) => void) => callback(null),
    );
    connectionListener?.({ destroy, query });
    expect(query).toHaveBeenCalledWith(
      "SET SESSION time_zone = '+00:00'",
      expect.any(Function),
    );
    expect(destroy).not.toHaveBeenCalled();
  });

  it("destroys a connection when UTC session initialization fails", () => {
    getDb();
    const connectionListener = dbState.on.mock.calls.find(
      ([event]) => event === "connection",
    )?.[1] as
      | ((connection: {
          destroy: () => void;
          query: (
            sql: string,
            callback: (error: Error | null) => void,
          ) => void;
        }) => void)
      | undefined;
    const destroy = vi.fn();
    const query = vi.fn(
      (_sql: string, callback: (error: Error | null) => void) =>
        callback(new Error("timezone denied")),
    );

    connectionListener?.({ destroy, query });
    expect(destroy).toHaveBeenCalledOnce();
  });
});
