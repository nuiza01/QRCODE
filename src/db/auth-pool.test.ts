import { EventEmitter } from "node:events";
import { createRequire } from "node:module";

import { drizzle } from "drizzle-orm/mysql2";
import { sql } from "drizzle-orm";
import mysql from "mysql2";
import type { Pool, PoolConnection } from "mysql2/promise";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { withAuthOperationDeadline } from "@/lib/auth-operation";
import { createAuthAwarePool } from "./auth-pool";

const requireFromHere = createRequire(import.meta.url);

type FakeCore = {
  _allConnections: { length: number; get: (index: number) => unknown };
  _freeConnections: { length: number; get: (index: number) => unknown };
  _connectionQueue: { length: number };
  _closed: boolean;
  config: { connectionLimit: number; queueLimit: number; connectionConfig?: { gracefulEnd?: boolean }; gracefulEnd?: boolean };
  _removeConnection: (...args: unknown[]) => unknown;
  end: (callback?: (error?: unknown) => void) => unknown;
  emit: (event: string, ...args: unknown[]) => void;
  listenerCount: (event: string) => number;
  on: (event: string, listener: (...args: unknown[]) => void) => FakeCore;
  removeListener: (event: string, listener: (...args: unknown[]) => void) => FakeCore;
};

type FakeConnection = {
  stream: EventEmitter;
  beginTransaction: ReturnType<typeof vi.fn>;
  close: ReturnType<typeof vi.fn>;
  commit: ReturnType<typeof vi.fn>;
  connect: ReturnType<typeof vi.fn>;
  destroy: ReturnType<typeof vi.fn>;
  end: ReturnType<typeof vi.fn>;
  execute: ReturnType<typeof vi.fn>;
  pause: ReturnType<typeof vi.fn>;
  prepare: ReturnType<typeof vi.fn>;
  query: ReturnType<typeof vi.fn>;
  release: ReturnType<typeof vi.fn>;
  reset: ReturnType<typeof vi.fn>;
  resume: ReturnType<typeof vi.fn>;
  rollback: ReturnType<typeof vi.fn>;
  unprepare: ReturnType<typeof vi.fn>;
};

function tick(): Promise<void> {
  return new Promise((resolve) => setImmediate(resolve));
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, reject, resolve };
}

function makeConnection(overrides: Partial<FakeConnection> = {}): FakeConnection {
  return Object.assign(new EventEmitter(), {
    stream: new EventEmitter(),
    beginTransaction: vi.fn().mockResolvedValue(undefined),
    close: vi.fn(),
    commit: vi.fn().mockResolvedValue(undefined),
    connect: vi.fn().mockResolvedValue(undefined),
    destroy: vi.fn(),
    end: vi.fn().mockResolvedValue(undefined),
    execute: vi.fn().mockResolvedValue([[], []]),
    pause: vi.fn(),
    prepare: vi.fn().mockResolvedValue({
      close: vi.fn().mockResolvedValue(undefined),
      execute: vi.fn().mockResolvedValue([[], []]),
    }),
    query: vi.fn().mockResolvedValue([[], []]),
    release: vi.fn(),
    reset: vi.fn().mockResolvedValue(undefined),
    resume: vi.fn(),
    rollback: vi.fn().mockResolvedValue(undefined),
    unprepare: vi.fn(),
    ...overrides,
  }) as unknown as FakeConnection;
}

function makeFreshPool(options: {
  connection?: FakeConnection;
  getConnection?: ReturnType<typeof vi.fn>;
  gracefulEnd?: boolean;
} = {}) {
  const listeners = new Map<string, Set<(...args: unknown[]) => void>>();
  let currentConnection: FakeConnection | undefined;
  const allEntries: object[] = [];
  const freeEntries: object[] = [];
  const placeholders: object[] = [];
  const allConnections = {
    length: 0,
    get(index: number): object {
      return allEntries[index] ?? (index === 0 && currentConnection ? currentConnection : (placeholders[index] ??= { placeholder: index }));
    },
  };
  const freeConnections = {
    length: 0,
    get(index: number): object {
      return freeEntries[index] ?? (index === 0 && currentConnection ? currentConnection : (placeholders[index] ??= { placeholder: index }));
    },
  };
  const nativeEnd = vi.fn((callback?: (error?: unknown) => void) => {
    core._closed = true;
    callback?.();
  });
  const core: FakeCore = {
    _allConnections: allConnections,
    _freeConnections: freeConnections,
    _connectionQueue: { length: 0 },
    _closed: false,
    config: { connectionLimit: 5, queueLimit: 10, connectionConfig: { gracefulEnd: options.gracefulEnd } },
    _removeConnection: vi.fn(),
    end: nativeEnd,
    emit(event, ...args) {
      for (const listener of listeners.get(event) ?? []) listener(...args);
    },
    listenerCount(event) {
      return listeners.get(event)?.size ?? 0;
    },
    on(event, listener) {
      const registered = listeners.get(event) ?? new Set();
      registered.add(listener);
      listeners.set(event, registered);
      return core;
    },
    removeListener(event, listener) {
      listeners.get(event)?.delete(listener);
      return core;
    },
  };
  const connection = options.connection ?? makeConnection();
  if (!Object.prototype.hasOwnProperty.call(connection, "connection")) {
    Object.defineProperty(connection, "connection", { configurable: true, value: connection });
  }
  const sourceGetConnection = options.getConnection ?? vi.fn().mockResolvedValue(connection);
  const getConnection = vi.fn(async () => {
    const acquired = await (sourceGetConnection as unknown as () => Promise<FakeConnection>)();
    if (!Object.prototype.hasOwnProperty.call(acquired, "connection")) {
      Object.defineProperty(acquired, "connection", { configurable: true, value: acquired });
    }
    const descriptor = Object.getOwnPropertyDescriptor(acquired as object, "connection");
    currentConnection = descriptor && "value" in descriptor && descriptor.value
      ? descriptor.value as FakeConnection
      : acquired;
    const slotLimit = Math.max(1, allConnections.length);
    const existingSlot = allEntries.indexOf(currentConnection);
    const freeSlot = freeEntries.length > 0 ? allEntries.indexOf(freeEntries[0]) : -1;
    const slot = existingSlot >= 0
      ? existingSlot
      : freeSlot >= 0 ? freeSlot
      : allEntries.length < slotLimit ? allEntries.length : allEntries.length % slotLimit;
    allEntries[slot] = currentConnection;
    if (allConnections.length === 0) allConnections.length = 1;
    freeEntries.length = 0;
    freeConnections.length = 0;
    return acquired;
  });
  const rawQuery = vi.fn().mockResolvedValue([[], []]);
  const rawExecute = vi.fn().mockResolvedValue([[], []]);
  const raw = {
    pool: core,
    getConnection,
    query: rawQuery,
    execute: rawExecute,
    end: vi.fn(() => new Promise<void>((resolve, reject) => {
      core.end((error) => error ? reject(error) : resolve());
    })),
    on: core.on.bind(core),
  } as unknown as Pool;
  const controlled = createAuthAwarePool(raw);
  return {
    connection,
    controlled,
    core,
    allEntries,
    freeEntries,
    getConnection,
    nativeEnd,
    raw,
    rawExecute,
    rawQuery,
  };
}

function markAvailable(harness: ReturnType<typeof makeFreshPool>): void {
  harness.core._allConnections.length = 1;
  harness.core._freeConnections.length = 1;
}

function messageOf(value: unknown): string | undefined {
  return value instanceof Error ? value.message : undefined;
}

describe("auth-aware mysql pool iteration-3 ownership", () => {
  it("reuses one facade across raw aliases, wrappers, and a module reload", async () => {
    const harness = makeFreshPool();
    expect(createAuthAwarePool(harness.raw)).toBe(harness.controlled);
    expect(createAuthAwarePool(harness.controlled)).toBe(harness.controlled);

    const alias = {
      pool: harness.core,
      getConnection: harness.getConnection,
      query: harness.rawQuery,
      execute: harness.rawExecute,
      end: (harness.raw as unknown as { end: () => Promise<void> }).end,
      on: harness.core.on.bind(harness.core),
    } as unknown as Pool;
    expect(createAuthAwarePool(alias)).toBe(harness.controlled);

    vi.resetModules();
    vi.doMock("server-only", () => ({}));
    const reloaded = await import("./auth-pool");
    expect(reloaded.createAuthAwarePool(alias)).toBe(harness.controlled);
    expect((harness.controlled as unknown as { pool?: unknown }).pool).toBeUndefined();
  });

  it("classifies every pinned callable surface and never returns a raw owner", async () => {
    const callableSurface = (value: object) => {
      const found = new Set<string>();
      for (
        let current: object | null = value;
        current && current !== Object.prototype;
        current = Object.getPrototypeOf(current) as object | null
      ) {
        for (const property of Reflect.ownKeys(current)) {
          if (property === "constructor") continue;
          const descriptor = Object.getOwnPropertyDescriptor(current, property);
          if (descriptor && "value" in descriptor && typeof descriptor.value === "function") {
            found.add(String(property));
          }
        }
      }
      return [...found].sort();
    };
    const eventEmitter = [
      "addListener", "emit", "eventNames", "getMaxListeners", "listenerCount",
      "listeners", "off", "on", "once", "prependListener", "prependOnceListener",
      "rawListeners", "removeAllListeners", "removeListener", "setMaxListeners",
    ];
    const poolOwned = [
      "Symbol(Symbol.asyncDispose)", "end", "execute", "getConnection", "query",
      "releaseConnection",
    ];
    const leaseAsync = [
      "beginTransaction", "changeUser", "commit", "connect", "execute", "ping",
      "prepare", "query", "reset", "rollback",
    ];
    const leaseCleanup = [
      "Symbol(Symbol.asyncDispose)", "close", "destroy", "end", "pause", "release",
      "resume", "unprepare",
    ];
    const pureHelpers = ["escape", "escapeId", "format"];
    const unsupportedRuntime = ["createBinlogStream"];
    const constructorData = ["Promise"];

    const core = mysql.createPool({
      connectionLimit: 5,
      queueLimit: 10,
      waitForConnections: true,
    });
    const raw = core.promise();
    const PromisePoolConnection = requireFromHere(
      `${process.cwd()}/node_modules/mysql2/lib/promise/pool_connection.js`,
    ) as new (connection: unknown, promise: PromiseConstructor) => PoolConnection;
    const PromisePreparedStatementInfo = requireFromHere(
      `${process.cwd()}/node_modules/mysql2/lib/promise/prepared_statement_info.js`,
    ) as new (statement: unknown, promise: PromiseConstructor) => object;
    const native = Object.assign(new EventEmitter(), {
      stream: new EventEmitter(),
      config: { trace: false },
      destroy: vi.fn(),
      release: vi.fn(),
      _resolveNamedPlaceholders: vi.fn(),
    });
    const installedConnection = new PromisePoolConnection(native, Promise);
    const installedStatement = new PromisePreparedStatementInfo({
      _connection: native,
      close: vi.fn(),
      execute: vi.fn(),
    }, Promise);

    expect(callableSurface(raw)).toEqual(
      [...new Set([...constructorData, ...eventEmitter, ...poolOwned, ...pureHelpers])].sort(),
    );
    expect(callableSurface(installedConnection as unknown as object)).toEqual(
      [...new Set([
        ...eventEmitter,
        ...constructorData,
        ...leaseAsync,
        ...leaseCleanup,
        ...pureHelpers,
        ...unsupportedRuntime,
      ])].sort(),
    );
    expect(callableSurface(installedStatement)).toEqual(["Promise", "close", "execute"]);

    const managedPool = createAuthAwarePool(raw);
    const poolListener = vi.fn();
    expect(managedPool.on("release", poolListener)).toBe(managedPool);
    managedPool.off("release", poolListener);
    expect((managedPool as unknown as { pool?: unknown }).pool).toBeUndefined();
    expect((managedPool as unknown as { Promise: unknown }).Promise).toBe(Promise);
    expect(managedPool.escape("surface")).toBe(raw.escape("surface"));
    expect(managedPool.escapeId("surface")).toBe(raw.escapeId("surface"));
    expect(managedPool.format("SELECT ?", [1])).toBe(raw.format("SELECT ?", [1]));

    const harness = makeFreshPool({
      connection: installedConnection as unknown as FakeConnection,
    });
    markAvailable(harness);
    const lease = await harness.controlled.getConnection();
    const leaseListener = vi.fn();
    expect((lease as unknown as { connection: unknown }).connection).toBe(lease);
    expect((lease as unknown as { Promise: unknown }).Promise).toBe(Promise);
    expect(lease.config).toBe(native.config);
    expect(lease.escape("surface")).toBe(installedConnection.escape("surface"));
    expect(lease.escapeId("surface")).toBe(installedConnection.escapeId("surface"));
    expect(lease.format("SELECT ?", [1])).toBe(installedConnection.format("SELECT ?", [1]));
    expect(lease.on("synthetic", leaseListener)).toBe(lease);
    expect(() => (lease as unknown as {
      createBinlogStream: () => unknown;
    }).createBinlogStream()).toThrow("NQR_DATABASE_UNSUPPORTED_CAPABILITY");
    lease.release();
    await managedPool.end();
  });

  it.each([
    ["pre-used core", { all: 1, queued: 0, closed: false }],
    ["raw queued work", { all: 0, queued: 1, closed: false }],
    ["closed core", { all: 0, queued: 0, closed: true }],
  ])("rejects %s without touching raw work", (_label, state) => {
    const listeners = new Map<string, (...args: unknown[]) => void>();
    const destroy = vi.fn();
    const core = {
      _allConnections: { length: state.all },
      _freeConnections: { length: 0 },
      _connectionQueue: { length: state.queued },
      _closed: state.closed,
      config: { connectionLimit: 5, queueLimit: 10 },
      _removeConnection: vi.fn(),
      end: vi.fn(),
      on: vi.fn((event, listener) => listeners.set(event, listener)),
    };
    const raw = {
      pool: core,
      getConnection: vi.fn(),
      query: vi.fn(),
      execute: vi.fn(),
      end: vi.fn(),
      destroy,
    } as unknown as Pool;
    expect(() => createAuthAwarePool(raw)).toThrow("NQR_DATABASE_POOL_OWNERSHIP_FAILED");
    expect(core._connectionQueue.length).toBe(state.queued);
    expect(destroy).not.toHaveBeenCalled();
  });

  it("routes non-auth query, execute, and getConnection through the central lease manager", async () => {
    const harness = makeFreshPool();
    markAvailable(harness);
    await expect(harness.controlled.query("SELECT 1")).resolves.toEqual([[], []]);
    await expect(harness.controlled.execute("SELECT 2")).resolves.toEqual([[], []]);
    const leased = await harness.controlled.getConnection();
    leased.release();

    expect(harness.rawQuery).not.toHaveBeenCalled();
    expect(harness.rawExecute).not.toHaveBeenCalled();
    expect(harness.getConnection).toHaveBeenCalledTimes(3);
    expect(harness.connection.query).toHaveBeenCalledOnce();
    expect(harness.connection.execute).toHaveBeenCalledOnce();
    expect(harness.connection.release).toHaveBeenCalledTimes(3);
  });

  it("keeps pool event listeners on the managed receiver and sanitizes connection notifications", async () => {
    const harness = makeFreshPool();
    const managed = harness.controlled as unknown as EventEmitter;
    const listener = vi.fn(function (this: unknown, value: unknown) {
      return { receiver: this, value };
    });
    expect(managed.prependOnceListener("connection", listener)).toBe(managed);
    expect(managed.listenerCount("connection")).toBe(1);
    const native = makeConnection();
    expect(managed.emit("connection", native)).toBe(true);
    const first = listener.mock.results[0]?.value as { receiver: unknown; value: object };
    expect(first.receiver).toBe(managed);
    expect(first.value).not.toBe(native);
    expect(Object.isFrozen(first.value)).toBe(true);
    expect((first.value as { connection: unknown }).connection).toBe(first.value);
    expect((first.value as { then?: unknown }).then).toBeUndefined();
    await expect((first.value as { query: () => Promise<unknown> }).query()).rejects.toThrow(
      "NQR_DATABASE_NOTIFICATION_ONLY",
    );
    expect(managed.listenerCount("connection")).toBe(0);
    expect(managed.emit("connection", native)).toBe(false);
  });

  it("bridges pool acquire/enqueue and lease signal/error events without native arguments", async () => {
    const native = Object.assign(new EventEmitter(), makeConnection());
    const harness = makeFreshPool({ connection: native });
    markAvailable(harness);
    const poolAcquire = vi.fn();
    const poolEnqueue = vi.fn();
    harness.controlled.on("acquire", poolAcquire);
    harness.controlled.on("enqueue", poolEnqueue);
    const lease = await harness.controlled.getConnection();
    const signal = vi.fn(function (this: unknown, ...args: unknown[]) {
      return { receiver: this, args };
    });
    const error = vi.fn();
    lease.on("drain", signal);
    lease.on("error", error);
    native.emit("drain", Object.freeze({ native: true }));
    native.emit("error", Object.freeze({ native: true }));
    harness.core.emit("acquire", native);
    harness.core.emit("enqueue", native);
    const result = signal.mock.results[0]?.value as { receiver: unknown; args: unknown[] };
    expect(result.receiver).toBe(lease);
    expect(result.args).toEqual([]);
    expect(error.mock.calls[0]?.[0]).toMatchObject({ message: "NQR_DATABASE_DRIVER_ERROR" });
    expect(poolAcquire).toHaveBeenCalledWith(expect.objectContaining({ id: expect.any(String) }));
    expect(poolEnqueue).toHaveBeenCalledWith();
    lease.release();
  });

  it("detaches retired lease bridges before native reassignment", async () => {
    const native = Object.assign(new EventEmitter(), makeConnection());
    const harness = makeFreshPool({ connection: native });
    markAvailable(harness);
    const first = await harness.controlled.getConnection();
    const firstListener = vi.fn();
    first.on("drain", firstListener);
    first.release();
    expect(native.listenerCount("drain")).toBe(0);

    const second = await harness.controlled.getConnection();
    const secondListener = vi.fn();
    second.on("drain", secondListener);
    native.emit("drain", { native: true });
    expect(firstListener).not.toHaveBeenCalled();
    expect(secondListener).toHaveBeenCalledOnce();
    second.release();
  });

  it("detaches every completed lease bridge and an exhausted pool once bridge", async () => {
    const native = Object.assign(new EventEmitter(), makeConnection());
    const harness = makeFreshPool({ connection: native });
    markAvailable(harness);
    harness.core._allConnections.length = 5;
    native.release = vi.fn(() => {
      harness.core._allConnections.length = 5;
      harness.core._freeConnections.length = 1;
      harness.freeEntries[0] = native;
      harness.core.emit("release");
    });
    const completed: ReturnType<typeof vi.fn>[] = [];
    for (let index = 0; index < 6; index += 1) {
      const lease = await harness.controlled.getConnection();
      const callback = vi.fn();
      lease.on("drain", callback);
      lease.release();
      completed.push(callback);
    }
    expect(native.listenerCount("drain")).toBe(0);
    native.emit("drain");
    expect(completed.every((callback) => callback.mock.calls.length === 0)).toBe(true);

    const poolOnce = vi.fn();
    harness.controlled.once("acquire", poolOnce);
    expect(harness.core.listenerCount("acquire")).toBe(1);
    harness.core.emit("acquire", native);
    expect(poolOnce).toHaveBeenCalledOnce();
    expect(harness.core.listenerCount("acquire")).toBe(0);
  });

  it("keeps notification views finite and uses the notification-only refusal", async () => {
    const harness = makeFreshPool();
    const managed = harness.controlled as unknown as EventEmitter;
    let view: Record<PropertyKey, unknown> | undefined;
    managed.once("connection", (candidate) => { view = candidate as Record<PropertyKey, unknown>; });
    managed.emit("connection", makeConnection());
    expect(view).toBeDefined();
    expect(() => (view!.release as () => unknown)()).toThrow("NQR_DATABASE_NOTIFICATION_ONLY");
    await expect((view!.end as () => Promise<never>)()).rejects.toThrow("NQR_DATABASE_NOTIFICATION_ONLY");
    await expect((view![Symbol.asyncDispose] as () => Promise<never>)()).rejects.toThrow("NQR_DATABASE_NOTIFICATION_ONLY");
    expect(() => (view!.escape as () => unknown)()).toThrow("NQR_DATABASE_NOTIFICATION_ONLY");
    expect(() => (view as { config?: unknown }).config).toThrow("NQR_DATABASE_NOTIFICATION_ONLY");
    expect(() => (view!.createBinlogStream as () => unknown)()).toThrow("NQR_DATABASE_UNSUPPORTED_CAPABILITY");
    expect(() => (view!.on as (...args: unknown[]) => unknown)("x", () => undefined)).toThrow("NQR_DATABASE_NOTIFICATION_ONLY");
    expect(() => (view!.emit as (...args: unknown[]) => unknown)("x")).toThrow("NQR_DATABASE_NOTIFICATION_ONLY");
    expect(() => (view as { pool?: unknown }).pool).toThrow("NQR_DATABASE_NOTIFICATION_ONLY");
    expect(() => (view as { _pool?: unknown })._pool).toThrow("NQR_DATABASE_NOTIFICATION_ONLY");
  });

  it("matches installed EventEmitter duplicate, prepend, once, metadata and no-arg removal mechanics", () => {
    const managed = makeFreshPool().controlled as unknown as EventEmitter;
    const first = vi.fn();
    const second = vi.fn();
    const meta = vi.fn();
    managed.once("newListener", meta);
    managed.on("order", first);
    managed.prependListener("order", second);
    managed.on("order", first);
    expect(meta).toHaveBeenCalledWith("order", first);
    expect(managed.listeners("order")).toEqual([second, first, first]);
    const rawOnce = vi.fn();
    managed.once("once", rawOnce);
    const raw = managed.rawListeners("once")[0] as ((...args: unknown[]) => unknown) & { listener?: unknown };
    expect(raw).not.toBe(rawOnce);
    expect(raw.listener).toBe(rawOnce);
    raw();
    managed.emit("once");
    expect(rawOnce).toHaveBeenCalledOnce();
    managed.removeListener("order", first);
    expect(managed.listeners("order")).toEqual([second, first]);
    managed.removeAllListeners();
    expect(managed.eventNames()).toEqual([]);
    expect(managed.listenerCount("order")).toBe(0);
  });

  it("matches Node once raw invocation and before-add metadata ordering", () => {
    const node = new EventEmitter();
    const managed = makeFreshPool().controlled as unknown as EventEmitter;
    for (const emitter of [node, managed]) {
      const seen: number[] = [];
      emitter.once("newListener", (event) => {
        if (event === "oracle") seen.push(emitter.listenerCount("oracle"));
      });
      const listener = vi.fn();
      emitter.once("oracle", listener);
      const raw = emitter.rawListeners("oracle")[0] as ((...args: unknown[]) => unknown) & { listener?: unknown };
      raw();
      raw();
      emitter.emit("oracle");
      expect(listener).toHaveBeenCalledOnce();
      expect(raw.listener).toBe(listener);
      expect(seen).toEqual([0]);
    }
  });

  it("matches Node metadata-on-metadata and tampered once wrapper semantics", () => {
    const node = new EventEmitter();
    const managed = makeFreshPool().controlled as unknown as EventEmitter;
    for (const emitter of [node, managed]) {
      let metadata = 0;
      emitter.on("newListener", (event) => { if (event === "newListener") metadata += 1; });
      emitter.on("newListener", () => undefined);
      expect(metadata).toBe(1);
      let calls = 0;
      const original = () => { calls += 1; };
      const alternate = () => undefined;
      emitter.once("tamper", original);
      const raw = emitter.rawListeners("tamper")[0] as { listener?: unknown };
      Object.defineProperty(raw, "listener", { configurable: true, writable: true, value: alternate });
      emitter.off("tamper", alternate);
      emitter.emit("tamper");
      expect(calls).toBe(0);
      emitter.removeAllListeners();
    }
    const ordered = makeFreshPool().controlled as unknown as EventEmitter;
    ordered.on("newListener", () => undefined);
    ordered.on("x", () => undefined);
    expect(ordered.eventNames()).toEqual(["newListener", "x"]);
  });

  it("matches Node removal metadata, once emit results, and raw descriptor preservation", () => {
    const node = new EventEmitter();
    const managed = makeFreshPool().controlled as unknown as EventEmitter;
    for (const emitter of [node, managed]) {
      const removed: string[] = [];
      const observer = () => undefined;
      emitter.on("removeListener", (event) => { removed.push(String(event)); });
      emitter.on("removeListener", observer);
      emitter.off("removeListener", observer);
      expect(removed).toEqual(["removeListener"]);

      let metadata = 0;
      emitter.once("newListener", () => { metadata += 1; });
      expect(emitter.emit("newListener", "x", observer)).toBe(true);
      expect(metadata).toBe(1);

      const original = () => undefined;
      const alternate = () => undefined;
      emitter.once("tamper", original);
      const raw = emitter.rawListeners("tamper")[0] as { listener?: unknown };
      Object.defineProperty(raw, "listener", { configurable: true, get: () => alternate });
      expect(emitter.rawListeners("tamper")[0]).toBe(raw);
      expect(Object.getOwnPropertyDescriptor(raw, "listener")?.get).toBeTypeOf("function");
      emitter.off("tamper", original);
      expect(emitter.listenerCount("tamper")).toBe(1);
      emitter.off("tamper", alternate);
      expect(emitter.listenerCount("tamper")).toBe(0);
      emitter.removeAllListeners();
    }
  });

  it("rejects invalid listeners before native bridge attachment", async () => {
    const native = Object.assign(new EventEmitter(), makeConnection());
    const harness = makeFreshPool({ connection: native });
    markAvailable(harness);
    const lease = await harness.controlled.getConnection();
    expect(() => (lease as unknown as EventEmitter).on("drain", Object.create(null))).toThrow();
    expect(native.listenerCount("drain")).toBe(0);
    lease.release();
  });

  it("matches Node metadata mechanics on a managed lease", async () => {
    const native = Object.assign(new EventEmitter(), makeConnection());
    const harness = makeFreshPool({ connection: native });
    markAvailable(harness);
    const lease = await harness.controlled.getConnection();
    let removed = 0;
    const observer = () => undefined;
    lease.on("removeListener", () => { removed += 1; });
    lease.on("removeListener", observer);
    lease.off("removeListener", observer);
    expect(removed).toBe(1);
    let metadata = 0;
    lease.once("newListener", () => { metadata += 1; });
    expect(lease.emit("newListener", "x", observer)).toBe(true);
    expect(metadata).toBe(1);
    const original = () => undefined;
    const alternate = () => undefined;
    lease.once("tamper", original);
    const raw = lease.rawListeners("tamper")[0] as { listener?: unknown };
    Object.defineProperty(raw, "listener", { configurable: true, get: () => alternate });
    expect(lease.rawListeners("tamper")[0]).toBe(raw);
    lease.off("tamper", original);
    expect(lease.listenerCount("tamper")).toBe(1);
    lease.off("tamper", alternate);
    expect(lease.listenerCount("tamper")).toBe(0);
    lease.release();
  });

  it("matches Node raw-wrapper removal ordering and filtered counts", async () => {
    const native = Object.assign(new EventEmitter(), makeConnection());
    const harness = makeFreshPool({ connection: native });
    markAvailable(harness);
    const lease = await harness.controlled.getConnection();
    const pool = harness.controlled as unknown as EventEmitter;
    for (const emitter of [pool, lease as unknown as EventEmitter]) {
      emitter.removeAllListeners();
      const original = () => undefined;
      let reads = 0;
      emitter.once("raw", original);
      const raw = emitter.rawListeners("raw")[0] as { listener?: unknown };
      Object.defineProperty(raw, "listener", { configurable: true, get: () => { reads += 1; return original; } });
      emitter.off("raw", raw as unknown as (...args: unknown[]) => unknown);
      expect(reads).toBe(0);
      expect(emitter.listenerCount("raw")).toBe(0);

      const marker = Object.freeze({ marker: true });
      emitter.once("throwing", original);
      const throwing = emitter.rawListeners("throwing")[0] as { listener?: unknown };
      Object.defineProperty(throwing, "listener", { configurable: true, get: () => { throw marker; } });
      expect(() => emitter.off("throwing", original)).toThrow(marker);
      expect(emitter.listenerCount("throwing")).toBe(1);
      Object.defineProperty(throwing, "listener", { configurable: true, writable: true, value: original });

      const alternate = () => undefined;
      const removed: unknown[] = [];
      emitter.on("removeListener", (_event, listener) => { removed.push(listener); });
      emitter.once("tampered", original);
      const tampered = emitter.rawListeners("tampered")[0] as { listener?: unknown };
      Object.defineProperty(tampered, "listener", { configurable: true, writable: true, value: alternate });
      expect(emitter.listeners("tampered")[0]).toBe(alternate);
      expect(emitter.listenerCount("tampered", alternate)).toBe(1);
      emitter.off("tampered", alternate);
      expect(removed.at(-1)).toBe(alternate);
      expect(emitter.listenerCount("tampered", alternate)).toBe(0);
      emitter.removeAllListeners();
    }
    lease.release();
  });

  it("matches Node composed once and bulk removal semantics on pool and lease", async () => {
    const native = Object.assign(new EventEmitter(), makeConnection());
    const harness = makeFreshPool({ connection: native });
    markAvailable(harness);
    const lease = await harness.controlled.getConnection();
    const pool = harness.controlled as unknown as EventEmitter;
    for (const emitter of [pool, lease as unknown as EventEmitter]) {
      emitter.removeAllListeners();
      const original = vi.fn();
      const marker = Object.freeze({ marker: true });
      emitter.once("getter-second", original);
      const getterRaw = emitter.rawListeners("getter-second")[0] as { listener?: unknown };
      let reads = 0;
      Object.defineProperty(getterRaw, "listener", {
        configurable: true,
        get: () => {
          reads += 1;
          if (reads === 2) throw marker;
          return original;
        },
      });
      expect(() => emitter.off("getter-second", original)).not.toThrow();
      expect(reads).toBe(1);
      expect(emitter.listenerCount("getter-second")).toBe(0);

      const removed: unknown[] = [];
      emitter.on("removeListener", (_event, listener) => { removed.push(listener); });
      const alternate = () => undefined;
      emitter.once("automatic", original);
      const automaticRaw = emitter.rawListeners("automatic")[0] as { listener?: unknown };
      Object.defineProperty(automaticRaw, "listener", { configurable: true, writable: true, value: alternate });
      emitter.emit("automatic");
      expect(original).toHaveBeenCalledOnce();
      expect(removed.at(-1)).toBe(alternate);
      expect(emitter.listenerCount("automatic")).toBe(0);

      emitter.removeAllListeners();
      const filler = vi.fn();
      const automaticArrayRemoved: unknown[] = [];
      emitter.on("automatic-array", filler);
      emitter.on("removeListener", (event, listener) => {
        if (event === "automatic-array") automaticArrayRemoved.push(listener);
      });
      emitter.once("automatic-array", original);
      const automaticArrayRaw = emitter.rawListeners("automatic-array")[1];
      emitter.emit("automatic-array");
      expect(original).toHaveBeenCalledTimes(2);
      expect(filler).toHaveBeenCalledOnce();
      expect(automaticArrayRemoved.at(-1)).toBe(automaticArrayRaw);
      expect(emitter.listenerCount("automatic-array")).toBe(1);

      const bulkRemoved: unknown[] = [];
      emitter.on("removeListener", (event, listener) => {
        if (event === "bulk") bulkRemoved.push(listener);
      });
      emitter.once("bulk", original);
      const bulkRaw = emitter.rawListeners("bulk")[0] as { listener?: unknown };
      Object.defineProperty(bulkRaw, "listener", { configurable: true, writable: true, value: alternate });
      const beforeBulk = bulkRemoved.length;
      emitter.removeAllListeners("bulk");
      expect(bulkRemoved.length).toBe(beforeBulk + 1);
      expect(bulkRemoved.at(-1)).toBe(alternate);
      expect(emitter.listenerCount("bulk")).toBe(0);
      emitter.removeAllListeners();
    }
    lease.release();
  });

  it("matches Node metadata reread and removal-before-throw semantics", async () => {
    const native = Object.assign(new EventEmitter(), makeConnection());
    const harness = makeFreshPool({ connection: native });
    markAvailable(harness);
    const lease = await harness.controlled.getConnection();
    const pool = harness.controlled as unknown as EventEmitter;
    for (const emitter of [pool, lease as unknown as EventEmitter]) {
      emitter.removeAllListeners();
      const original = () => undefined;
      const alternate = () => undefined;
      const removed: unknown[] = [];
      emitter.on("removeListener", (_event, listener) => { removed.push(listener); });
      emitter.once("reread", original);
      const rereadRaw = emitter.rawListeners("reread")[0] as { listener?: unknown };
      let reads = 0;
      Object.defineProperty(rereadRaw, "listener", {
        configurable: true,
        get: () => {
          reads += 1;
          return reads === 1 ? original : alternate;
        },
      });
      emitter.off("reread", original);
      expect(reads).toBe(2);
      expect(removed.at(-1)).toBe(alternate);
      expect(emitter.listenerCount("reread")).toBe(0);

      const marker = Object.freeze({ marker: true });
      emitter.once("auto-throw", original);
      const autoRaw = emitter.rawListeners("auto-throw")[0] as { listener?: unknown };
      Object.defineProperty(autoRaw, "listener", { configurable: true, get: () => { throw marker; } });
      expect(() => emitter.emit("auto-throw")).toThrow(marker);
      expect(emitter.listenerCount("auto-throw")).toBe(0);

      emitter.removeAllListeners();
      const reentrant = vi.fn();
      let savedRaw: (() => unknown) | null = null;
      emitter.on("removeListener", () => { savedRaw?.(); });
      emitter.once("reentrant", reentrant);
      savedRaw = emitter.rawListeners("reentrant")[0] as unknown as () => unknown;
      emitter.emit("reentrant");
      expect(reentrant).toHaveBeenCalledTimes(2);

      emitter.once("bulk-throw", original);
      const bulkRaw = emitter.rawListeners("bulk-throw")[0] as { listener?: unknown };
      Object.defineProperty(bulkRaw, "listener", { configurable: true, get: () => { throw marker; } });
      expect(() => emitter.removeAllListeners("bulk-throw")).toThrow(marker);
      expect(emitter.listenerCount("bulk-throw")).toBe(0);
      emitter.removeAllListeners();
    }
    lease.release();
  });

  it("matches Node array-slot removal metadata without rereading once wrappers", async () => {
    const native = Object.assign(new EventEmitter(), makeConnection());
    const harness = makeFreshPool({ connection: native });
    markAvailable(harness);
    const lease = await harness.controlled.getConnection();
    const pool = harness.controlled as unknown as EventEmitter;
    for (const emitter of [pool, lease as unknown as EventEmitter]) {
      emitter.removeAllListeners();
      const filler = () => undefined;
      const original = () => undefined;
      const removed: unknown[] = [];
      emitter.on("removeListener", (_event, listener) => { removed.push(listener); });
      emitter.on("array", filler);
      emitter.once("array", original);
      const raw = emitter.rawListeners("array")[1] as { listener?: unknown };
      let reads = 0;
      Object.defineProperty(raw, "listener", {
        configurable: true,
        get: () => {
          reads += 1;
          return original;
        },
      });
      emitter.off("array", original);
      expect(reads).toBe(1);
      expect(removed.at(-1)).toBe(original);
      expect(emitter.listenerCount("array")).toBe(1);

      emitter.once("array-raw", original);
      const rawThrow = emitter.rawListeners("array-raw")[0] as { listener?: unknown };
      const marker = Object.freeze({ marker: true });
      Object.defineProperty(rawThrow, "listener", { configurable: true, get: () => { throw marker; } });
      const rawListener = rawThrow as unknown as (...args: unknown[]) => unknown;
      emitter.on("array-raw", filler);
      expect(() => emitter.off("array-raw", rawListener)).not.toThrow();
      expect(removed.at(-1)).toBe(rawListener);
      expect(emitter.listenerCount("array-raw")).toBe(1);
      emitter.removeAllListeners();
    }
    lease.release();
  });

  it("matches Node self-removeListener bulk raw-wrapper metadata", async () => {
    const native = Object.assign(new EventEmitter(), makeConnection());
    const harness = makeFreshPool({ connection: native });
    markAvailable(harness);
    const lease = await harness.controlled.getConnection();
    const pool = harness.controlled as unknown as EventEmitter;
    for (const emitter of [pool, lease as unknown as EventEmitter]) {
      for (const mode of ["named", "all"]) {
        emitter.removeAllListeners();
        const events: unknown[] = [];
        const original = () => undefined;
        const alternate = () => undefined;
        const ordinary = () => undefined;
        emitter.on("removeListener", (_event, listener) => { events.push(listener); });
        emitter.on("removeListener", ordinary);
        emitter.once("removeListener", original);
        const raw = emitter.rawListeners("removeListener")[2] as { listener?: unknown };
        Object.defineProperty(raw, "listener", { configurable: true, writable: true, value: alternate });
        if (mode === "named") emitter.removeAllListeners("removeListener");
        else emitter.removeAllListeners();
        expect(events[0]).toBe(raw);
        expect(events[1]).toBe(ordinary);
        expect(emitter.listenerCount("removeListener")).toBe(0);
      }
    }
    lease.release();
  });

  it("disables native re-registration after an early trusted terminal", async () => {
    const native = Object.assign(new EventEmitter(), makeConnection());
    const harness = makeFreshPool({ connection: native, gracefulEnd: true });
    markAvailable(harness);
    const lease = await harness.controlled.getConnection();
    const callback = vi.fn();
    const ending = lease.end();
    native.stream.emit("close");
    await expect(ending).rejects.toThrow("NQR_DATABASE_COMMAND_FAILED");
    lease.on("drain", callback);
    native.emit("drain");
    expect(native.listenerCount("drain")).toBe(0);
    lease.emit("drain");
    expect(callback).toHaveBeenCalledOnce();
  });

  it.each([false, true])("retains forced-retire ownership until trusted terminal (graceful=%s)", async (gracefulEnd) => {
    const native = Object.assign(new EventEmitter(), makeConnection());
    const fresh = makeConnection();
    let acquisitions = 0;
    const harness = makeFreshPool({
      connection: native,
      gracefulEnd,
      getConnection: vi.fn(() => Promise.resolve(acquisitions++ === 0 ? native : fresh)),
    });
    markAvailable(harness);
    const lease = await harness.controlled.getConnection();
    harness.core._allConnections.length = 5;
    harness.core._freeConnections.length = 0;
    lease.destroy();
    const waiting = harness.controlled.query("AFTER DESTROY");
    await tick();
    expect(harness.getConnection).toHaveBeenCalledOnce();
    native.stream.emit("close");
    harness.core._allConnections.length = 0;
    await expect(waiting).resolves.toEqual([[], []]);
    expect(harness.getConnection).toHaveBeenCalledTimes(2);
  });

  it("fails closed when trusted terminal methods are unavailable", async () => {
    const native = Object.assign(new EventEmitter(), makeConnection());
    Object.defineProperty(native.stream, "on", { configurable: true, get: () => { throw new Error("getter"); } });
    const harness = makeFreshPool({ connection: native });
    markAvailable(harness);
    await expect(harness.controlled.getConnection()).rejects.toThrow("NQR_DATABASE_POOL_OWNERSHIP_FAILED");
    await expect(harness.controlled.query("CLOSED")).rejects.toThrow("NQR_DATABASE_POOL_OWNERSHIP_FAILED");
  });

  it.each([false, true])("requires supported delivered error-target methods (graceful=%s)", async (gracefulEnd) => {
    for (const shape of ["on-missing", "on-accessor", "removeListener-missing", "removeListener-accessor"]) {
      const native = Object.assign(new EventEmitter(), makeConnection());
      const property = shape.startsWith("on-") ? "on" : "removeListener";
      if (shape.endsWith("accessor")) {
        Object.defineProperty(native, property, { configurable: true, get: () => { throw new Error("SHAPE"); } });
      } else {
        Object.defineProperty(native, property, { configurable: true, value: undefined });
      }
      const harness = makeFreshPool({ connection: native, gracefulEnd });
      markAvailable(harness);
      await expect(harness.controlled.getConnection()).rejects.toThrow("NQR_DATABASE_POOL_OWNERSHIP_FAILED");
      await expect(harness.controlled.query("AFTER DELIVERED SHAPE")).rejects.toThrow("NQR_DATABASE_POOL_OWNERSHIP_FAILED");
      expect(native.destroy).toHaveBeenCalledOnce();
    }
  });

  it.each([false, true])("contains partial late terminal attachment failures (graceful=%s)", async (gracefulEnd) => {
    for (const stage of ["end-before", "end-after", "close-before", "close-after"]) {
      const pending = deferred<FakeConnection>();
      const late = makeConnection({ destroy: vi.fn() });
      const streamOn = late.stream.on.bind(late.stream);
      Object.defineProperty(late.stream, "on", {
        configurable: true,
        value: (event: string, listener: (...args: unknown[]) => void) => {
          if (stage === `${event}-before`) throw new Error("ATTACH");
          const result = streamOn(event, listener);
          if (stage === `${event}-after`) throw new Error("ATTACH");
          return result;
        },
      });
      const harness = makeFreshPool({ gracefulEnd, getConnection: vi.fn(() => pending.promise) });
      const expired = withAuthOperationDeadline(() => harness.controlled.query(`LATE ${stage}`), 5).catch((error) => error);
      await new Promise((resolve) => setTimeout(resolve, 15));
      expect(messageOf(await expired)).toBe("NQR_AUTH_OPERATION_TIMEOUT");
      pending.resolve(late);
      await tick();
      expect(late.destroy).toHaveBeenCalledOnce();
      await expect(harness.controlled.query("AFTER ATTACH")).rejects.toThrow("NQR_DATABASE_POOL_OWNERSHIP_FAILED");
      expect(harness.getConnection).toHaveBeenCalledOnce();
    }
  });

  it("uses immutable captured delivered lifecycle methods after native reassignment", async () => {
    const native = Object.assign(new EventEmitter(), makeConnection());
    const harness = makeFreshPool({ connection: native });
    markAvailable(harness);
    const lease = await harness.controlled.getConnection();
    const marker = Object.freeze({ marker: true });
    Object.defineProperty(native, "on", { configurable: true, value: () => { throw marker; } });
    Object.defineProperty(native, "removeListener", { configurable: true, value: () => { throw marker; } });
    expect(() => lease.destroy()).not.toThrow();
    native.stream.emit("close");
    await tick();
    expect(native.destroy).toHaveBeenCalledOnce();
    expect(native.listenerCount("error")).toBe(0);
  });

  it("rejects free-in-drain and over-limit physical unions before acquisition", async () => {
    const native = Object.assign(new EventEmitter(), makeConnection());
    const harness = makeFreshPool({ connection: native, gracefulEnd: true, getConnection: vi.fn().mockResolvedValue(native) });
    markAvailable(harness);
    const lease = await harness.controlled.getConnection();
    harness.core._allConnections.length = 1;
    harness.core._freeConnections.length = 1;
    const ending = lease.end().catch((error) => error);
    await tick();
    await expect(harness.controlled.query("FREE DRAIN")).rejects.toThrow("NQR_DATABASE_POOL_OWNERSHIP_FAILED");
    await expect(ending).resolves.toMatchObject({ message: "NQR_DATABASE_LEASE_RETIRED" });
  });

  it("rejects a six-identity native union before dispatch", async () => {
    const harness = makeFreshPool({ getConnection: vi.fn() });
    harness.allEntries.push({}, {}, {}, {}, {}, {});
    harness.core._allConnections.length = 6;
    harness.freeEntries.push(harness.allEntries[0]);
    harness.core._freeConnections.length = 1;
    await expect(harness.controlled.query("SIX IDENTITIES")).rejects.toThrow(
      "NQR_DATABASE_POOL_OWNERSHIP_FAILED",
    );
    expect(harness.getConnection).not.toHaveBeenCalled();
  });

  it.each([false, true])("retains late expired acquisitions until terminal (graceful=%s)", async (gracefulEnd) => {
    const pending: Array<ReturnType<typeof deferred<FakeConnection>>> = [];
    const late: FakeConnection[] = [];
    const harness = makeFreshPool({
      gracefulEnd,
      getConnection: vi.fn(() => {
        harness.core._allConnections.length = Math.min(5, harness.core._allConnections.length + 1);
        const item = deferred<FakeConnection>();
        pending.push(item);
        return item.promise;
      }),
    });
    const expired = Array.from({ length: 5 }, (_, index) =>
      withAuthOperationDeadline(() => harness.controlled.query(`LATE ${index}`), 5).catch((error) => error),
    );
    await new Promise((resolve) => setTimeout(resolve, 15));
    expect((await Promise.all(expired)).every((error) => messageOf(error) === "NQR_AUTH_OPERATION_TIMEOUT")).toBe(true);
    expect(pending).toHaveLength(5);
    for (let index = 0; index < pending.length; index += 1) {
      const connection = Object.assign(new EventEmitter(), makeConnection({
        destroy: vi.fn(),
        query: vi.fn(),
      })) as unknown as FakeConnection;
      late.push(connection);
      pending[index].resolve(connection);
      await tick();
    }
    expect(late.every((connection) => connection.destroy.mock.calls.length === 1)).toBe(true);
    expect(late.every((connection) => connection.query.mock.calls.length === 0)).toBe(true);
    const waiting = harness.controlled.query("AFTER LATE").catch((error) => error);
    const parked = Array.from({ length: 9 }, (_, index) => harness.controlled.query(`PARKED ${index}`).catch((error) => error));
    const overflow = await harness.controlled.query("OVERFLOW").catch((error) => error);
    expect(messageOf(overflow)).toBe("NQR_DATABASE_CONNECTION_QUEUE_FULL");
    expect(harness.getConnection).toHaveBeenCalledTimes(5);
    late[0].stream.emit("close");
    harness.core._allConnections.length = 4;
    await tick();
    await harness.controlled.end();
    await Promise.all(parked);
    expect(messageOf(await waiting)).toBe("NQR_DATABASE_POOL_CLOSED");
    expect(harness.getConnection).toHaveBeenCalledTimes(5);
  });

  it.each([false, true])("retains a private late native error observer until terminal (graceful=%s)", async (gracefulEnd) => {
    const pending = deferred<FakeConnection>();
    const late = Object.assign(new EventEmitter(), makeConnection()) as unknown as FakeConnection & EventEmitter;
    late.destroy = vi.fn(() => { late.emit("error", new Proxy({}, { get: () => { throw new Error("payload read"); } })); });
    const harness = makeFreshPool({
      gracefulEnd,
      getConnection: vi.fn(() => {
        harness.core._allConnections.length = 1;
        return pending.promise;
      }),
    });
    const expired = withAuthOperationDeadline(() => harness.controlled.query("LATE ERROR"), 5).catch((error) => error);
    await new Promise((resolve) => setTimeout(resolve, 15));
    expect(messageOf(await expired)).toBe("NQR_AUTH_OPERATION_TIMEOUT");
    late.once("error", () => undefined);
    pending.resolve(late);
    await tick();
    expect(late.destroy).toHaveBeenCalledOnce();
    expect(late.listenerCount("error")).toBe(1);
    expect(() => late.emit("error", Object.create(null))).not.toThrow();
    expect(late.listenerCount("error")).toBe(1);
    await harness.controlled.end();
    expect(() => late.emit("error", Object.create(null))).not.toThrow();
    expect(late.listenerCount("error")).toBe(1);
    late.stream.emit("close");
    await tick();
    expect(late.listenerCount("error")).toBe(0);
    expect(late.destroy).toHaveBeenCalledOnce();
  });

  it.each([false, true])("fails closed when late error-target methods are missing or accessors (graceful=%s)", async (gracefulEnd) => {
    for (const shape of ["on-missing", "on-accessor", "removeListener-missing", "removeListener-accessor"]) {
      const pending = deferred<FakeConnection>();
      const late = makeConnection({ destroy: vi.fn() });
      const property = shape.startsWith("on-") ? "on" : "removeListener";
      if (shape.endsWith("accessor")) {
        Object.defineProperty(late, property, { configurable: true, get: () => { throw new Error("SHAPE"); } });
      } else {
        Object.defineProperty(late, property, { configurable: true, value: undefined });
      }
      const harness = makeFreshPool({ gracefulEnd, getConnection: vi.fn(() => pending.promise) });
      const expired = withAuthOperationDeadline(() => harness.controlled.query(`LATE ${shape}`), 5).catch((error) => error);
      await new Promise((resolve) => setTimeout(resolve, 15));
      expect(messageOf(await expired)).toBe("NQR_AUTH_OPERATION_TIMEOUT");
      pending.resolve(late);
      await tick();
      expect(late.destroy).toHaveBeenCalledOnce();
      await expect(harness.controlled.query("AFTER SHAPE")).rejects.toThrow("NQR_DATABASE_POOL_OWNERSHIP_FAILED");
      expect(harness.getConnection).toHaveBeenCalledOnce();
    }
  });

  it("uses graceful lease end once, drains accepted commands, and never releases the lease", async () => {
    const connection = makeConnection({
      end: vi.fn((callback?: (error?: unknown) => void) => {
        callback?.();
        return Promise.resolve();
      }),
    });
    const harness = makeFreshPool({ connection, gracefulEnd: true });
    markAvailable(harness);
    const lease = await harness.controlled.getConnection();
    const command = lease.query("BEFORE END");
    const ending = lease.end();
    await expect(command).resolves.toEqual([[], []]);
    await expect(ending).resolves.toBeUndefined();
    await expect(lease.query("AFTER END")).rejects.toThrow("NQR_DATABASE_LEASE_RETIRED");
    await lease.end();
    expect(connection.end).toHaveBeenCalledOnce();
    expect(connection.release).not.toHaveBeenCalled();
    expect(connection.destroy).not.toHaveBeenCalled();
  });

  it("reuses a healthy free native connection while another lease drains", async () => {
    let settleEnd: ((error?: unknown) => void) | undefined;
    const connection = makeConnection({
      end: vi.fn((callback?: (error?: unknown) => void) => {
        settleEnd = callback;
        return undefined;
      }),
    });
    let acquisitions = 0;
    const healthy = makeConnection();
    const harness = makeFreshPool({
      connection,
      gracefulEnd: true,
      getConnection: vi.fn(() => Promise.resolve(acquisitions++ === 0 ? connection : healthy)),
    });
    markAvailable(harness);
    const drainingLease = await harness.controlled.getConnection();
    harness.core._allConnections.length = 4;
    harness.core._freeConnections.length = 1;
    harness.freeEntries[0] = healthy;
    harness.allEntries[1] = healthy;

    const ending = drainingLease.end();
    const fresh = harness.controlled.query("FRESH WHILE DRAINING");
    await expect(fresh).resolves.toEqual([[], []]);
    expect(harness.getConnection).toHaveBeenCalledTimes(2);
    expect(connection.end).toHaveBeenCalledOnce();
    settleEnd?.();
    await expect(ending).resolves.toBeUndefined();
  });

  it("admits a fifth physical connection while a fourth lease still owns an accepted command", async () => {
    const command = deferred<[unknown[], unknown[]]>();
    const connection = makeConnection({ query: vi.fn(() => command.promise) });
    let acquisitions = 0;
    const fifthConnection = makeConnection();
    const harness = makeFreshPool({
      connection,
      gracefulEnd: true,
      getConnection: vi.fn(() => Promise.resolve(acquisitions++ === 0 ? connection : fifthConnection)),
    });
    markAvailable(harness);
    const lease = await harness.controlled.getConnection();
    Object.assign(harness.core._allConnections, { includes: () => true });
    harness.core._allConnections.length = 4;
    harness.core._freeConnections.length = 0;
    const accepted = lease.query("ACCEPTED");
    const ending = lease.end();
    const fifth = harness.controlled.getConnection();
    await expect(fifth).resolves.toBeDefined();
    command.resolve([[], []]);
    await expect(accepted).resolves.toEqual([[], []]);
    await expect(ending).resolves.toBeUndefined();
    (await fifth).release();
  });

  it("retires once when graceful native end fails before callback", async () => {
    const connection = makeConnection({ end: vi.fn(() => { throw new Error("native end"); }) });
    const harness = makeFreshPool({ connection, gracefulEnd: true });
    markAvailable(harness);
    const lease = await harness.controlled.getConnection();
    await expect(lease.end()).rejects.toThrow("NQR_DATABASE_COMMAND_FAILED");
    expect(connection.destroy).toHaveBeenCalledOnce();
    expect(connection.release).not.toHaveBeenCalled();
  });

  it("destroys a locally completed lease when a later native error arrives", async () => {
    const native = Object.assign(new EventEmitter(), makeConnection());
    let finish: (() => void) | undefined;
    native.end = vi.fn((callback?: (error?: unknown) => void) => {
      finish = () => callback?.();
      return undefined;
    });
    const harness = makeFreshPool({ connection: native, gracefulEnd: true });
    markAvailable(harness);
    const lease = await harness.controlled.getConnection();
    const ending = lease.end();
    finish?.();
    await expect(ending).resolves.toBeUndefined();
    native.emit("error", new Error("late native failure"));
    expect(native.destroy).toHaveBeenCalledOnce();
  });

  it("retains failed draining ownership until the trusted stream closes", async () => {
    const native = Object.assign(new EventEmitter(), makeConnection({
      end: vi.fn((callback?: (error?: unknown) => void) => { callback?.(new Error("QUIT failed")); }),
    }));
    const fresh = makeConnection();
    let acquisitions = 0;
    const harness = makeFreshPool({
      connection: native,
      gracefulEnd: true,
      getConnection: vi.fn(() => Promise.resolve(acquisitions++ === 0 ? native : fresh)),
    });
    markAvailable(harness);
    const lease = await harness.controlled.getConnection();
    harness.core._allConnections.length = 5;
    harness.core._freeConnections.length = 0;
    await expect(lease.end()).rejects.toThrow("NQR_DATABASE_COMMAND_FAILED");
    const waiting = harness.controlled.query("AFTER FAILED DRAIN");
    await tick();
    expect(harness.getConnection).toHaveBeenCalledOnce();
    harness.core._allConnections.length = 4;
    native.stream.emit("close");
    await expect(waiting).resolves.toEqual([[], []]);
    expect(harness.getConnection).toHaveBeenCalledTimes(2);
  });

  it("keeps a locally completed lease permanently ineligible for native re-registration", async () => {
    const native = Object.assign(new EventEmitter(), makeConnection({
      end: vi.fn((callback?: (error?: unknown) => void) => { callback?.(); }),
    }));
    const harness = makeFreshPool({ connection: native, gracefulEnd: true });
    markAvailable(harness);
    const lease = await harness.controlled.getConnection();
    await lease.end();
    const callback = vi.fn();
    lease.on("drain", callback);
    expect(native.listenerCount("drain")).toBe(0);
    native.emit("drain");
    lease.emit("drain");
    expect(callback).toHaveBeenCalledOnce();
  });

  it("rejects malformed duplicate RingQueue identities before dispatch", async () => {
    const harness = makeFreshPool({ getConnection: vi.fn() });
    const duplicate = {};
    harness.core._allConnections.length = 2;
    harness.core._allConnections.get = () => duplicate;
    await expect(harness.controlled.query("DUPLICATE QUEUE")).rejects.toThrow(
      "NQR_DATABASE_POOL_OWNERSHIP_FAILED",
    );
    expect(harness.getConnection).not.toHaveBeenCalled();
  });

  it("rejects a foreign free queue entry before dispatch", async () => {
    const harness = makeFreshPool({ getConnection: vi.fn() });
    const owned = {};
    const foreign = {};
    harness.core._allConnections.length = 1;
    harness.core._freeConnections.length = 1;
    harness.core._allConnections.get = () => owned;
    harness.core._freeConnections.get = () => foreign;
    await expect(harness.controlled.query("FOREIGN FREE")).rejects.toThrow(
      "NQR_DATABASE_POOL_OWNERSHIP_FAILED",
    );
    expect(harness.getConnection).not.toHaveBeenCalled();
  });

  it("force-cleans active leases during graceful pooled manager shutdown", async () => {
    const connection = makeConnection({
      end: vi.fn((callback?: (error?: unknown) => void) => {
        callback?.();
        return Promise.resolve();
      }),
    });
    const harness = makeFreshPool({ connection, gracefulEnd: true });
    markAvailable(harness);
    const lease = await harness.controlled.getConnection();
    const first = harness.controlled.end();
    const second = harness.controlled.end();
    await expect(first).resolves.toBeUndefined();
    await expect(second).resolves.toBeUndefined();
    expect(connection.end).not.toHaveBeenCalled();
    expect(connection.release).not.toHaveBeenCalled();
    expect(connection.destroy).toHaveBeenCalledOnce();
    await expect(lease.query("AFTER POOL END")).rejects.toThrow("NQR_DATABASE_LEASE_RETIRED");
  });

  it("removes every completed command terminal subscription", async () => {
    const originalAdd = Set.prototype.add;
    const originalDelete = Set.prototype.delete;
    let active = 0;
    let added = 0;
    let deleted = 0;
    let maximum = 0;
    let withoutCommand = 0;
    try {
      Set.prototype.add = function <T>(this: Set<T>, value: T) {
        const tracked = typeof value === "function" && value.name === "settleOnTerminal";
        const existed = this.has(value);
        const result = originalAdd.call(this, value);
        if (tracked && !existed) {
          active += 1;
          added += 1;
          maximum = Math.max(maximum, active);
        }
        return result;
      } as typeof Set.prototype.add;
      Set.prototype.delete = function <T>(this: Set<T>, value: T) {
        const tracked = typeof value === "function" && value.name === "settleOnTerminal";
        const existed = this.has(value);
        const result = originalDelete.call(this, value);
        if (tracked && existed && result) {
          active -= 1;
          deleted += 1;
        }
        return result;
      } as typeof Set.prototype.delete;

      const success = makeFreshPool();
      markAvailable(success);
      for (let index = 0; index < 16; index += 1) {
        const lease = await success.controlled.getConnection();
        lease.release();
      }
      withoutCommand = added;
      for (let index = 0; index < 32; index += 1) {
        await success.controlled.query("SELECT SUCCESS");
      }

      const failedConnection = makeConnection({
        query: vi.fn().mockRejectedValue(Object.create(null)),
      });
      const failed = makeFreshPool({ connection: failedConnection });
      markAvailable(failed);
      await failed.controlled.query("SELECT FAILURE").catch(() => undefined);

      const timedCommand = deferred<never>();
      const timedConnection = makeConnection({
        query: vi.fn(() => timedCommand.promise),
      });
      const timed = makeFreshPool({ connection: timedConnection });
      markAvailable(timed);
      await withAuthOperationDeadline(
        () => timed.controlled.query("SELECT TIMEOUT"),
        5,
      ).catch(() => undefined);
      timedCommand.reject(Object.create(null));
      await tick();

      const closingCommand = deferred<never>();
      const closingConnection = makeConnection({
        query: vi.fn(() => closingCommand.promise),
      });
      const closing = makeFreshPool({ connection: closingConnection });
      markAvailable(closing);
      const inFlight = closing.controlled.query("SELECT CLOSE").catch(() => undefined);
      await tick();
      await closing.controlled.end();
      await inFlight;
      closingCommand.reject(Object.create(null));
      await tick();
    } finally {
      Set.prototype.add = originalAdd;
      Set.prototype.delete = originalDelete;
    }

    expect({ active, added, deleted, maximum, withoutCommand }).toEqual({
      active: 0,
      added: 35,
      deleted: 35,
      maximum: 1,
      withoutCommand: 0,
    });
  });

  it.each(["timeout", "abort"] as const)(
    "shares reloaded lifecycle context for parked %s work",
    async (mode) => {
      const harness = makeFreshPool();
      const removeHook = harness.core._removeConnection;
      const endHook = harness.core.end;
      const listenerCounts = ["release", "connection", "enqueue"].map(
        (event) => harness.core.listenerCount(event),
      );
      vi.resetModules();
      vi.doMock("server-only", () => ({}));
      const [reloadedOperation, reloadedPool] = await Promise.all([
        import("@/lib/auth-operation"),
        import("./auth-pool"),
      ]);
      const reused = reloadedPool.createAuthAwarePool(harness.raw);
      expect(reused).toBe(harness.controlled);
      expect(harness.core._removeConnection).toBe(removeHook);
      expect(harness.core.end).toBe(endHook);
      expect(["release", "connection", "enqueue"].map(
        (event) => harness.core.listenerCount(event),
      )).toEqual(listenerCounts);

      harness.core._allConnections.length = 5;
      const controller = new AbortController();
      let underlying!: Promise<unknown>;
      const operation = reloadedOperation.withAuthOperationDeadline(() => {
        underlying = reused.query(`PARKED ${mode}`);
        return underlying;
      }, mode === "timeout" ? 5 : 50, controller.signal).catch((error) => error);
      await tick();
      if (mode === "abort") controller.abort();
      if (mode === "timeout") {
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
      expect(messageOf(await operation)).toBe("NQR_AUTH_OPERATION_TIMEOUT");
      await expect(underlying).rejects.toThrow("NQR_DATABASE_LEASE_RETIRED");

      harness.core._freeConnections.length = 1;
      harness.core.emit("release");
      await tick();
      expect(harness.getConnection).not.toHaveBeenCalled();
      expect(harness.connection.query).not.toHaveBeenCalled();
      expect(harness.connection.destroy).not.toHaveBeenCalled();

      await expect(reloadedOperation.withAuthOperationDeadline(
        () => reused.query("HEALTHY AFTER RELOAD"),
        50,
      )).resolves.toEqual([[], []]);
      expect(harness.getConnection).toHaveBeenCalledOnce();
      expect(harness.connection.query).toHaveBeenCalledWith("HEALTHY AFTER RELOAD");
    },
  );

  it("caps aggregate acquisition reservations plus waiters at ten", async () => {
    const pending: Array<ReturnType<typeof deferred<FakeConnection>>> = [];
    const issued: string[] = [];
    const harness = makeFreshPool({
      getConnection: vi.fn(() => {
        harness.core._allConnections.length = Math.min(5, harness.core._allConnections.length + 1);
        const item = deferred<FakeConnection>();
        pending.push(item);
        return item.promise;
      }),
    });
    const accepted = Array.from({ length: 10 }, (_, index) =>
      index % 2
        ? harness.controlled.execute(`WORK ${index}`)
        : harness.controlled.query(`WORK ${index}`),
    );
    await tick();
    expect(harness.getConnection).toHaveBeenCalledTimes(5);
    await expect(harness.controlled.query("SELECT 11")).rejects.toThrow(
      "NQR_DATABASE_CONNECTION_QUEUE_FULL",
    );
    expect(harness.core._connectionQueue.length).toBe(0);

    for (let index = 0; index < pending.length; index += 1) {
      const connection = makeConnection({
        execute: vi.fn(async (statement: string) => {
          issued.push(statement);
          return [[], []];
        }),
        query: vi.fn(async (statement: string) => {
          issued.push(statement);
          return [[], []];
        }),
        release: vi.fn(() => {
          harness.core._freeConnections.length = 1;
          harness.freeEntries[0] = connection;
          harness.core.emit("release");
        }),
      });
      pending[index].resolve(connection);
      await tick();
    }
    await tick();
    while (pending.length < 10) {
      await tick();
      const start = pending.findIndex((item, index) => index >= 5 && item !== undefined);
      if (start >= 5) break;
    }
    for (let index = 5; index < 10; index += 1) {
      while (!pending[index]) await tick();
      pending[index].resolve(makeConnection({
        execute: vi.fn(async (statement: string) => {
          issued.push(statement);
          return [[], []];
        }),
        query: vi.fn(async (statement: string) => {
          issued.push(statement);
          return [[], []];
        }),
        release: vi.fn(() => {
          harness.core._freeConnections.length = 1;
          harness.core.emit("release");
        }),
      }));
    }
    await expect(Promise.all(accepted)).resolves.toHaveLength(10);
    expect(harness.getConnection).toHaveBeenCalledTimes(10);
    expect(harness.core._connectionQueue.length).toBe(0);
    expect(issued).toEqual(Array.from({ length: 10 }, (_, index) => `WORK ${index}`));
  });

  it("expires queued callers, then admits fresh work without raw queueing", async () => {
    const harness = makeFreshPool();
    harness.core._allConnections.length = 5;
    const expired = Array.from({ length: 10 }, () =>
      withAuthOperationDeadline(
        () => harness.controlled.query("EXPIRED"),
        5,
      ).catch((error) => error),
    );
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect((await Promise.all(expired)).map(messageOf)).toEqual(
      Array.from({ length: 10 }, () => "NQR_AUTH_OPERATION_TIMEOUT"),
    );
    expect(harness.getConnection).not.toHaveBeenCalled();
    expect(harness.core._connectionQueue.length).toBe(0);

    harness.core._allConnections.length = 1;
    harness.core._freeConnections.length = 1;
    const fresh = harness.controlled.query("FRESH");
    harness.core.emit("release");
    await expect(fresh).resolves.toEqual([[], []]);
    expect(harness.connection.query).toHaveBeenCalledWith("FRESH");
  });

  it("retains pending acquisition accounting until a late connection is retired", async () => {
    const first = deferred<FakeConnection>();
    const healthy = makeConnection();
    let acquisitions = 0;
    const harness = makeFreshPool({
      getConnection: vi.fn(() => {
        acquisitions += 1;
        harness.core._freeConnections.length = 0;
        if (acquisitions === 1) return first.promise;
        return Promise.resolve(healthy);
      }),
    });
    harness.core.config.connectionLimit = 1;
    harness.core._allConnections.length = 1;
    harness.core._freeConnections.length = 1;
    const expired = withAuthOperationDeadline(
      () => harness.controlled.query("EXPIRED IN FLIGHT"),
      5,
    ).catch((error) => error);
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(messageOf(await expired)).toBe("NQR_AUTH_OPERATION_TIMEOUT");

    const fresh = harness.controlled.query("FRESH");
    await tick();
    expect(harness.getConnection).toHaveBeenCalledOnce();
    const late = Object.assign(new EventEmitter(), makeConnection({
      destroy: vi.fn(() => {
        harness.core._allConnections.length = 0;
        harness.core.emit("release");
      }),
    })) as unknown as FakeConnection;
    first.resolve(late);
    await tick();
    expect(late.destroy).toHaveBeenCalledOnce();
    expect(late.query).not.toHaveBeenCalled();
    late.stream.emit("close");
    await tick();
    await expect(fresh).resolves.toEqual([[], []]);
    expect(harness.getConnection).toHaveBeenCalledTimes(2);
  });

  it("removes expired-context query, execute, and acquire before raw dispatch", async () => {
    const harness = makeFreshPool();
    markAvailable(harness);
    const failures: unknown[] = [];
    for (const invoke of [
      () => harness.controlled.query("SELECT 1"),
      () => harness.controlled.execute("SELECT 1"),
      () => harness.controlled.getConnection(),
    ]) {
      const gate = deferred<void>();
      const outer = withAuthOperationDeadline(async () => {
        await gate.promise;
        try { await invoke(); } catch (error) { failures.push(error); }
      }, 5).catch((error) => error);
      await new Promise((resolve) => setTimeout(resolve, 10));
      expect(messageOf(await outer)).toBe("NQR_AUTH_OPERATION_TIMEOUT");
      gate.resolve();
      await tick();
    }
    expect(harness.getConnection).not.toHaveBeenCalled();
    expect(failures.map(messageOf)).toEqual([
      "NQR_AUTH_OPERATION_FAILED",
      "NQR_AUTH_OPERATION_FAILED",
      "NQR_AUTH_OPERATION_FAILED",
    ]);
  });

  it("retires an active timed-out lease and consumes its late rejection", async () => {
    const command = deferred<never>();
    const connection = makeConnection({ query: vi.fn(() => command.promise) });
    const harness = makeFreshPool({ connection });
    markAvailable(harness);
    const result = withAuthOperationDeadline(
      () => harness.controlled.query("SELECT SLEEP"),
      5,
    ).catch((error) => error);
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(messageOf(await result)).toBe("NQR_AUTH_OPERATION_TIMEOUT");
    expect(connection.destroy).toHaveBeenCalledOnce();
    expect(connection.release).not.toHaveBeenCalled();
    command.reject(Object.create(null));
    await tick();
    expect(connection.query).toHaveBeenCalledOnce();
  });

  it.each(["query", "execute"] as const)(
    "retires only the owned lease for automatic %s failures",
    async (method) => {
      for (const errno of [1290, 1792, 1836]) {
        const hostile = Object.create(null) as { errno: number };
        hostile.errno = errno;
        const connection = makeConnection({
          [method]: vi.fn().mockRejectedValue(hostile),
        });
        const harness = makeFreshPool({ connection });
        markAvailable(harness);
        const invoke = harness.controlled[method] as (
          statement: string,
        ) => Promise<unknown>;
        await expect(invoke("BROKEN")).rejects.toThrow(
          "NQR_DATABASE_COMMAND_FAILED",
        );
        expect(connection[method]).toHaveBeenCalledOnce();
        expect(connection.destroy).toHaveBeenCalledOnce();
        expect(connection.release).not.toHaveBeenCalled();
      }
    },
  );

  it("does not inspect primitive or hostile driver errors", async () => {
    let inspections = 0;
    const hostile = new Proxy(Object.create(null), {
      get() {
        inspections += 1;
        throw new Error("inspected hostile driver error");
      },
      getOwnPropertyDescriptor() {
        inspections += 1;
        throw new Error("inspected hostile driver error");
      },
    });
    for (const failure of [undefined, null, 0, "driver", hostile]) {
      const connection = makeConnection({ query: vi.fn().mockRejectedValue(failure) });
      const harness = makeFreshPool({ connection });
      markAvailable(harness);
      await expect(harness.controlled.query("BROKEN")).rejects.toThrow(
        "NQR_DATABASE_COMMAND_FAILED",
      );
      expect(connection.destroy).toHaveBeenCalledOnce();
    }
    expect(inspections).toBe(0);
  });

  it("wakes a sibling when an owned failure retires capacity", async () => {
    const failed = makeConnection({
      destroy: vi.fn(() => {
        harness.core._allConnections.length = 0;
        harness.core.emit("release");
      }),
      query: vi.fn().mockRejectedValue(Object.create(null)),
    });
    const healthy = makeConnection();
    let calls = 0;
    const harness = makeFreshPool({
      getConnection: vi.fn(() => {
        calls += 1;
        harness.core._freeConnections.length = 0;
        harness.core._allConnections.length = calls;
        return Promise.resolve(calls === 1 ? failed : healthy);
      }),
    });
    harness.core._allConnections.length = 1;
    harness.core._freeConnections.length = 1;
    const first = harness.controlled.query("FAIL").catch((error) => error);
    const sibling = harness.controlled.query("HEALTHY");
    expect(messageOf(await first)).toBe("NQR_DATABASE_COMMAND_FAILED");
    await expect(sibling).resolves.toEqual([[], []]);
    expect(failed.destroy).toHaveBeenCalledOnce();
    expect(healthy.query).toHaveBeenCalledWith("HEALTHY");
  });

  it("wakes pending work after spontaneous removal without polling", async () => {
    const harness = makeFreshPool();
    harness.core._allConnections.length = 5;
    const pending = harness.controlled.query("AFTER REMOVE");
    await tick();
    expect(harness.getConnection).not.toHaveBeenCalled();
    harness.core._allConnections.length = 4;
    harness.core._removeConnection({});
    await expect(pending).resolves.toEqual([[], []]);
    expect(harness.getConnection).toHaveBeenCalledOnce();
  });

  it("never dispatches a captured command after failure, release, or auth expiry", async () => {
    const failedConnection = makeConnection({
      query: vi.fn().mockRejectedValue(Object.create(null)),
    });
    const failedHarness = makeFreshPool({ connection: failedConnection });
    markAvailable(failedHarness);
    const failedLease = await failedHarness.controlled.getConnection();
    const capturedFailed = failedLease.query;
    await expect(capturedFailed("BROKEN")).rejects.toThrow("NQR_DATABASE_COMMAND_FAILED");
    await expect(capturedFailed("AGAIN")).rejects.toThrow("NQR_DATABASE_LEASE_RETIRED");
    expect(failedConnection.query).toHaveBeenCalledOnce();

    const releasedConnection = makeConnection();
    const releasedHarness = makeFreshPool({ connection: releasedConnection });
    markAvailable(releasedHarness);
    const releasedLease = await releasedHarness.controlled.getConnection();
    const capturedReleased = releasedLease.query;
    releasedLease.release();
    await expect(capturedReleased("LATE")).rejects.toThrow("NQR_DATABASE_LEASE_RETIRED");
    expect(releasedConnection.query).not.toHaveBeenCalled();

    const expiredConnection = makeConnection();
    const expiredHarness = makeFreshPool({ connection: expiredConnection });
    markAvailable(expiredHarness);
    let capturedExpired!: PoolConnection["query"];
    await expect(withAuthOperationDeadline(async () => {
      const lease = await expiredHarness.controlled.getConnection();
      capturedExpired = lease.query;
      await new Promise((resolve) => setTimeout(resolve, 10));
    }, 5)).rejects.toThrow("NQR_AUTH_OPERATION_TIMEOUT");
    await withAuthOperationDeadline(async () => {
      await expect(capturedExpired("REVIVE")).rejects.toThrow("NQR_DATABASE_LEASE_RETIRED");
    }, 50);
    expect(expiredConnection.query).not.toHaveBeenCalled();
  });

  it("makes release, destroy, and timeout terminal cleanup idempotent in either order", async () => {
    const released = makeConnection();
    const releasedHarness = makeFreshPool({ connection: released });
    markAvailable(releasedHarness);
    const releaseFirst = await releasedHarness.controlled.getConnection();
    releaseFirst.release();
    releaseFirst.destroy();
    releaseFirst.release();
    expect(released.release).toHaveBeenCalledOnce();
    expect(released.destroy).not.toHaveBeenCalled();

    const destroyed = makeConnection();
    const destroyedHarness = makeFreshPool({ connection: destroyed });
    markAvailable(destroyedHarness);
    const destroyFirst = await destroyedHarness.controlled.getConnection();
    destroyFirst.destroy();
    destroyFirst.release();
    destroyFirst.destroy();
    expect(destroyed.destroy).toHaveBeenCalledOnce();
    expect(destroyed.release).not.toHaveBeenCalled();

    const timed = makeConnection();
    const timedHarness = makeFreshPool({ connection: timed });
    markAvailable(timedHarness);
    let held!: PoolConnection;
    await expect(withAuthOperationDeadline(async () => {
      held = await timedHarness.controlled.getConnection();
      await new Promise((resolve) => setTimeout(resolve, 10));
    }, 5)).rejects.toThrow("NQR_AUTH_OPERATION_TIMEOUT");
    held.release();
    held.destroy();
    expect(timed.destroy).toHaveBeenCalledOnce();
    expect(timed.release).not.toHaveBeenCalled();
  });

  it("preserves guarded synchronous control and async disposal contracts", async () => {
    const rawCapability = Object.freeze({ native: true });
    const connection = makeConnection({
      unprepare: vi.fn(() => rawCapability),
    });
    const harness = makeFreshPool({ connection });
    markAvailable(harness);
    const lease = await harness.controlled.getConnection();
    const unprepare = lease.unprepare;
    const pause = lease.pause;
    const resume = lease.resume;
    const asyncDispose = lease[Symbol.asyncDispose];
    const close = (lease as unknown as { close: () => void }).close;
    const end = lease.end;
    const destroy = lease.destroy;
    const release = lease.release;

    await expect(lease.connect()).resolves.toBeUndefined();
    await expect(lease.reset()).resolves.toBeUndefined();
    expect(pause()).toBeUndefined();
    expect(resume()).toBeUndefined();
    expect(unprepare("SELECT CONTROL")).toBeUndefined();
    expect(connection.unprepare).toHaveBeenCalledWith("SELECT CONTROL");

    await expect(asyncDispose()).resolves.toBeUndefined();
    await expect(asyncDispose()).resolves.toBeUndefined();
    release();
    destroy();
    close();
    await expect(end()).resolves.toBeUndefined();
    expect(connection.release).toHaveBeenCalledOnce();
    expect(connection.destroy).not.toHaveBeenCalled();
    expect(connection.close).not.toHaveBeenCalled();
    expect(connection.end).not.toHaveBeenCalled();
    expect(() => unprepare("SELECT LATE")).toThrow("NQR_DATABASE_LEASE_RETIRED");
    expect(() => pause()).toThrow("NQR_DATABASE_LEASE_RETIRED");
    expect(() => resume()).toThrow("NQR_DATABASE_LEASE_RETIRED");
    expect(connection.unprepare).toHaveBeenCalledOnce();
  });

  it.each(["destroy", "close", "end"] as const)(
    "maps %s to one whole-lease retirement without native alias dispatch",
    async (mode) => {
      const connection = makeConnection();
      const harness = makeFreshPool({ connection });
      markAvailable(harness);
      const lease = await harness.controlled.getConnection();
      const close = (lease as unknown as { close: () => void }).close;
      const end = lease.end;
      const destroy = lease.destroy;
      const release = lease.release;
      const asyncDispose = lease[Symbol.asyncDispose];

      if (mode === "destroy") destroy();
      else if (mode === "close") close();
      else await end();
      destroy();
      close();
      await end();
      release();
      await asyncDispose();

      expect(connection.destroy).toHaveBeenCalledTimes(mode === "end" ? 0 : 1);
      expect(connection.release).toHaveBeenCalledTimes(mode === "end" ? 1 : 0);
      expect(connection.close).not.toHaveBeenCalled();
      expect(connection.end).not.toHaveBeenCalled();
    },
  );

  it.each(["unprepare", "pause", "resume"] as const)(
    "contains synchronous %s failure and retires exactly once",
    async (method) => {
      let inspections = 0;
      const hostile = new Proxy(Object.create(null), {
        get() { inspections += 1; throw new Error("inspected"); },
        getOwnPropertyDescriptor() { inspections += 1; throw new Error("inspected"); },
        getPrototypeOf() { inspections += 1; throw new Error("inspected"); },
      });
      const failingControl = (() => { throw hostile; }) as unknown as ReturnType<typeof vi.fn>;
      const connection = makeConnection({ [method]: failingControl });
      const harness = makeFreshPool({ connection });
      markAvailable(harness);
      const lease = await harness.controlled.getConnection();
      const operation = lease[method] as (...args: unknown[]) => void;

      expect(() => operation("SELECT FAILURE")).toThrow("NQR_DATABASE_COMMAND_FAILED");
      lease.release();
      lease.destroy();
      expect(inspections).toBe(0);
      expect(connection.destroy).toHaveBeenCalledOnce();
      expect(connection.release).not.toHaveBeenCalled();
    },
  );

  it.each(["auth-expiry", "manager-close"] as const)(
    "keeps captured cleanup aliases inert after %s",
    async (terminal) => {
      const connection = makeConnection();
      const harness = makeFreshPool({ connection });
      markAvailable(harness);
      let lease!: PoolConnection;
      if (terminal === "auth-expiry") {
        await expect(withAuthOperationDeadline(async () => {
          lease = await harness.controlled.getConnection();
          await new Promise((resolve) => setTimeout(resolve, 10));
        }, 5)).rejects.toThrow("NQR_AUTH_OPERATION_TIMEOUT");
      } else {
        lease = await harness.controlled.getConnection();
        await harness.controlled.end();
      }
      const unprepare = lease.unprepare;
      const close = (lease as unknown as { close: () => void }).close;
      const end = lease.end;
      const destroy = lease.destroy;
      const release = lease.release;
      const asyncDispose = lease[Symbol.asyncDispose];

      expect(() => unprepare("SELECT LATE")).toThrow("NQR_DATABASE_LEASE_RETIRED");
      close();
      destroy();
      release();
      await expect(end()).resolves.toBeUndefined();
      await expect(asyncDispose()).resolves.toBeUndefined();
      expect(connection.unprepare).not.toHaveBeenCalled();
      expect(connection.destroy).toHaveBeenCalledTimes(terminal === "auth-expiry" ? 1 : 0);
      expect(connection.release).toHaveBeenCalledTimes(terminal === "auth-expiry" ? 0 : 1);
      expect(connection.close).not.toHaveBeenCalled();
      expect(connection.end).not.toHaveBeenCalled();
    },
  );

  it("clears a synchronous acquisition failure before admitting healthy work", async () => {
    const connection = makeConnection();
    let calls = 0;
    const harness = makeFreshPool({
      getConnection: vi.fn(() => {
        calls += 1;
        if (calls <= 10) throw Object.create(null);
        return Promise.resolve(connection);
      }),
    });
    harness.core._allConnections.length = 1;
    harness.core._freeConnections.length = 1;
    for (let index = 0; index < 10; index += 1) {
      await expect(harness.controlled.query("FAIL")).rejects.toThrow(
        "NQR_DATABASE_CONNECTION_FAILED",
      );
    }
    await expect(harness.controlled.query("HEALTHY")).resolves.toEqual([[], []]);
    expect(harness.getConnection).toHaveBeenCalledTimes(11);
  });

  it("settles queued work on close, deduplicates native end, and never reopens", async () => {
    const harness = makeFreshPool();
    harness.core._allConnections.length = 5;
    const queued = harness.controlled.query("WAIT").catch((error) => error);
    const authQueued = withAuthOperationDeadline(
      () => harness.controlled.query("AUTH WAIT"),
      100,
    ).catch((error) => error);
    await tick();
    await Promise.all([harness.controlled.end(), harness.raw.end()]);
    expect(messageOf(await queued)).toBe("NQR_DATABASE_POOL_CLOSED");
    expect(messageOf(await authQueued)).toBe("NQR_AUTH_OPERATION_FAILED");
    expect(harness.nativeEnd).toHaveBeenCalledOnce();
    await expect(harness.controlled.query("LATE")).rejects.toThrow("NQR_DATABASE_POOL_CLOSED");
    expect(createAuthAwarePool(harness.raw)).toBe(harness.controlled);
  });

  it("destroys a connection acquired after close without dispatching it", async () => {
    const pending = deferred<FakeConnection>();
    const harness = makeFreshPool({ getConnection: vi.fn(() => pending.promise) });
    harness.core._allConnections.length = 1;
    harness.core._freeConnections.length = 1;
    const work = harness.controlled.query("LATE").catch((error) => error);
    await tick();
    await harness.controlled.end();
    expect(messageOf(await work)).toBe("NQR_DATABASE_POOL_CLOSED");
    const late = makeConnection();
    pending.resolve(late);
    await tick();
    expect(late.destroy).toHaveBeenCalledOnce();
    expect(late.query).not.toHaveBeenCalled();
  });

  it("fails closed if unexpected raw driver queueing appears after ownership", async () => {
    const harness = makeFreshPool();
    harness.core.emit("enqueue");
    await tick();

    harness.core._allConnections.length = 5;
    let settlements = 0;
    const alreadyWaiting = harness.controlled.query("MANAGED WAIT").catch(
      (error) => {
        settlements += 1;
        return error;
      },
    );
    await tick();
    expect(harness.getConnection).not.toHaveBeenCalled();

    harness.core.emit("enqueue");
    harness.core._connectionQueue.length = 1;
    await tick();
    expect(messageOf(await alreadyWaiting)).toBe(
      "NQR_DATABASE_POOL_OWNERSHIP_FAILED",
    );
    expect(settlements).toBe(1);
    await expect(harness.controlled.query("NOPE")).rejects.toThrow(
      "NQR_DATABASE_POOL_OWNERSHIP_FAILED",
    );
    expect(harness.core._connectionQueue.length).toBe(1);
    expect(harness.getConnection).not.toHaveBeenCalled();
    expect(harness.connection.destroy).not.toHaveBeenCalled();
  });

  it.each(["release", "asyncDispose"] as const)(
    "keeps a reassigned installed native connection alive after managed %s",
    async (mode) => {
      const core = mysql.createPool({
        connectionLimit: 5,
        queueLimit: 10,
        waitForConnections: true,
      });
      let sockets = 0;
      let releases = 0;
      let destroys = 0;
      let commands = 0;
      let unprepares = 0;
      (core as unknown as { _createConnectionConfig: () => never })
        ._createConnectionConfig = () => {
          sockets += 1;
          throw new Error("NO_SOCKET");
        };
      const managed = createAuthAwarePool(core.promise());
      const native = Object.assign(new EventEmitter(), {
        stream: new EventEmitter(),
        _pool: core,
        _realEnd(callback: () => void) { callback(); },
        _released: false,
        _statements: {
          delete: vi.fn(),
          get() {
            unprepares += 1;
            return { close: vi.fn() };
          },
        },
        config: { trace: false },
        destroy() {
          destroys += 1;
          (this as unknown as { _pool: unknown })._pool = null;
          (core as unknown as {
            _removeConnection: (connection: unknown) => void;
          })._removeConnection(this);
        },
        query(_sql: unknown, parameters: unknown, callback?: (
          error: Error | null,
          rows?: unknown[],
          fields?: unknown[],
        ) => void) {
          commands += 1;
          const done = typeof parameters === "function" ? parameters : callback;
          (done as typeof callback)?.(null, [], []);
        },
        release() {
          releases += 1;
          this._released = true;
          core.releaseConnection(this as never);
        },
      });
      (core as unknown as {
        _allConnections: { push: (value: unknown) => void };
        _freeConnections: { push: (value: unknown) => void };
      })._allConnections.push(native);
      (core as unknown as {
        _freeConnections: { push: (value: unknown) => void };
      })._freeConnections.push(native);

      const controller = new AbortController();
      let first!: PoolConnection;
      let ready!: () => void;
      const acquired = new Promise<void>((resolve) => { ready = resolve; });
      const operation = withAuthOperationDeadline(async () => {
        first = await managed.getConnection();
        if (mode === "release") first.release();
        else await first[Symbol.asyncDispose]();
        ready();
        await new Promise(() => undefined);
      }, 1_000, controller.signal).catch((error) => error);
      await acquired;
      const second = await managed.getConnection();

      expect((first as unknown as { connection: unknown }).connection).toBe(first);
      expect(() => first.unprepare("SELECT REASSIGNED")).toThrow(
        "NQR_DATABASE_LEASE_RETIRED",
      );
      controller.abort();
      expect(messageOf(await operation)).toBe("NQR_AUTH_OPERATION_TIMEOUT");
      await tick();
      await expect(second.query("SELECT B")).resolves.toEqual([[], []]);
      expect({ commands, destroys, sockets, unprepares }).toEqual({
        commands: 1,
        destroys: 0,
        sockets: 0,
        unprepares: 0,
      });
      expect(releases).toBe(1);
      second.release();
      await managed.end();
    },
  );

  it("preserves installed synchronous unprepare while hiding its native return", async () => {
    let closes = 0;
    let releases = 0;
    let destroys = 0;
    const Prepare = requireFromHere(
      `${process.cwd()}/node_modules/mysql2/lib/commands/prepare.js`,
    ) as new (options: unknown, callback: unknown) => {
      id: number;
      key: string;
      prepareDone: (connection: unknown) => void;
    };
    const BaseConnection = requireFromHere(
      `${process.cwd()}/node_modules/mysql2/lib/base/connection.js`,
    ) as {
      prototype: { unprepare: (options: unknown) => unknown };
      statementKey: (options: unknown) => string;
    };
    const PromisePoolConnection = requireFromHere(
      `${process.cwd()}/node_modules/mysql2/lib/promise/pool_connection.js`,
    ) as new (connection: unknown, promise: PromiseConstructor) => PoolConnection;
    const native = Object.assign(new EventEmitter(), {
      stream: new EventEmitter(),
      config: { trace: false },
      _statements: new Map(),
      addCommand(command: { constructor: { name: string } }) {
        if (command.constructor.name === "CloseStatement") closes += 1;
        return command;
      },
      destroy() { destroys += 1; },
      prepare(sql: unknown, callback: unknown) {
        const prepared = new Prepare({ sql }, callback);
        prepared.id = 101;
        prepared.key = BaseConnection.statementKey({ sql });
        prepared.prepareDone(this);
      },
      release() { releases += 1; },
      unprepare: BaseConnection.prototype.unprepare,
    });
    const connection = new PromisePoolConnection(native, Promise);
    const harness = makeFreshPool({
      connection: connection as unknown as FakeConnection,
    });
    markAvailable(harness);
    const oldLease = await harness.controlled.getConnection();
    await oldLease.prepare("SELECT INERT");
    const unprepare = oldLease.unprepare;

    expect(unprepare("SELECT INERT")).toBeUndefined();
    expect(closes).toBe(1);
    expect(native._statements.size).toBe(0);
    oldLease.release();
    const currentLease = await harness.controlled.getConnection();
    expect(() => unprepare("SELECT INERT")).toThrow("NQR_DATABASE_LEASE_RETIRED");
    expect({ closes, destroys, releases }).toEqual({
      closes: 1,
      destroys: 0,
      releases: 1,
    });
    currentLease.release();
  });

  it("keeps installed prepared execute/close inside the owning lease", async () => {
    let preparedExecutes = 0;
    let preparedCloses = 0;
    let releases = 0;
    let destroys = 0;
    const nativeStatement = {
      _connection: { config: { trace: false } },
      execute(_parameters: unknown, callback: (
        error: Error | null,
        rows?: unknown[],
        fields?: unknown[],
      ) => void) {
        preparedExecutes += 1;
        callback(null, [{ ok: 1 }], []);
      },
      close() { preparedCloses += 1; },
    };
    const native = Object.assign(new EventEmitter(), {
      stream: new EventEmitter(),
      config: { trace: false },
      prepare(_statement: unknown, callback: (
        error: Error | null,
        value?: typeof nativeStatement,
      ) => void) {
        callback(null, nativeStatement);
      },
      release() { releases += 1; },
      destroy() { destroys += 1; },
    });
    const PromiseConnection = requireFromHere(
      `${process.cwd()}/node_modules/mysql2/lib/promise/pool_connection.js`,
    ) as new (connection: unknown, promise: PromiseConstructor) => PoolConnection;
    const connection = new PromiseConnection(native, Promise);
    const harness = makeFreshPool({
      connection: connection as unknown as FakeConnection,
    });
    markAvailable(harness);

    const lease = await harness.controlled.getConnection();
    const statement = await lease.prepare("SELECT PREPARED");
    const execute = statement.execute;
    const close = statement.close;
    await expect(execute([])).resolves.toEqual([[{ ok: 1 }], []]);
    await expect(close()).resolves.toBeUndefined();
    await expect(close()).resolves.toBeUndefined();
    await expect(execute([])).rejects.toThrow(
      "NQR_DATABASE_PREPARED_STATEMENT_CLOSED",
    );
    expect((statement as unknown as { statement?: unknown }).statement).toBeUndefined();
    lease.release();

    expect({ preparedExecutes, preparedCloses, releases, destroys }).toEqual({
      preparedExecutes: 1,
      preparedCloses: 1,
      releases: 1,
      destroys: 0,
    });
  });

  it.each(["release", "destroy", "auth-expiry", "manager-close"] as const)(
    "blocks installed prepared handles after %s",
    async (terminal) => {
      let preparedExecutes = 0;
      let preparedCloses = 0;
      let releases = 0;
      let destroys = 0;
      const nativeStatement = {
        _connection: { config: { trace: false } },
        execute(_parameters: unknown, callback: (
          error: Error | null,
          rows?: unknown[],
          fields?: unknown[],
        ) => void) {
          preparedExecutes += 1;
          callback(null, [{ ok: 1 }], []);
        },
        close() { preparedCloses += 1; },
      };
      const native = Object.assign(new EventEmitter(), {
        stream: new EventEmitter(),
        config: { trace: false },
        prepare(_statement: unknown, callback: (
          error: Error | null,
          value?: typeof nativeStatement,
        ) => void) {
          callback(null, nativeStatement);
        },
        release() { releases += 1; },
        destroy() { destroys += 1; },
      });
      const PromiseConnection = requireFromHere(
        `${process.cwd()}/node_modules/mysql2/lib/promise/pool_connection.js`,
      ) as new (connection: unknown, promise: PromiseConstructor) => PoolConnection;
      const connection = new PromiseConnection(native, Promise);
      const harness = makeFreshPool({
        connection: connection as unknown as FakeConnection,
      });
      markAvailable(harness);
      let execute!: (parameters: unknown) => Promise<unknown>;
      let close!: () => Promise<void>;
      let lease!: PoolConnection;

      if (terminal === "auth-expiry") {
        await expect(withAuthOperationDeadline(async () => {
          lease = await harness.controlled.getConnection();
          const statement = await lease.prepare("SELECT PREPARED");
          execute = statement.execute;
          close = statement.close;
          await new Promise((resolve) => setTimeout(resolve, 10));
        }, 5)).rejects.toThrow("NQR_AUTH_OPERATION_TIMEOUT");
      } else {
        lease = await harness.controlled.getConnection();
        const statement = await lease.prepare("SELECT PREPARED");
        execute = statement.execute;
        close = statement.close;
        if (terminal === "release") lease.release();
        else if (terminal === "destroy") lease.destroy();
        else await harness.controlled.end();
      }

      await expect(execute([])).rejects.toThrow("NQR_DATABASE_LEASE_RETIRED");
      await expect(close()).rejects.toThrow("NQR_DATABASE_LEASE_RETIRED");
      expect({ preparedExecutes, preparedCloses }).toEqual({
        preparedExecutes: 0,
        preparedCloses: 0,
      });
      expect(releases).toBe(terminal === "release" || terminal === "manager-close" ? 1 : 0);
      expect(destroys).toBe(terminal === "destroy" || terminal === "auth-expiry" ? 1 : 0);
    },
  );

  it.each([
    "prepare-sync",
    "prepare-async",
    "execute-sync",
    "execute-async",
    "close-sync",
  ] as const)("keeps installed prepared %s errors private", async (failureMode) => {
    let inspections = 0;
    let destroys = 0;
    let releases = 0;
    const hostile = new Proxy(Object.create(null), {
      get() { inspections += 1; throw new Error("inspected"); },
      getOwnPropertyDescriptor() { inspections += 1; throw new Error("inspected"); },
      getPrototypeOf() { inspections += 1; throw new Error("inspected"); },
    });
    const nativeStatement = {
      _connection: { config: { trace: false } },
      execute(...args: unknown[]) {
        const callback = args.at(-1) as (error: unknown) => void;
        if (failureMode === "execute-sync") throw hostile;
        if (failureMode === "execute-async") {
          process.nextTick(() => callback(hostile));
          return;
        }
        callback(null);
      },
      close() {
        if (failureMode === "close-sync") throw hostile;
      },
    };
    const native = Object.assign(new EventEmitter(), {
      stream: new EventEmitter(),
      config: { trace: false },
      prepare(_statement: unknown, callback: (
        error: unknown,
        value?: typeof nativeStatement,
      ) => void) {
        if (failureMode === "prepare-sync") throw hostile;
        if (failureMode === "prepare-async") {
          process.nextTick(() => callback(hostile));
          return;
        }
        callback(null, nativeStatement);
      },
      release() { releases += 1; },
      destroy() { destroys += 1; },
    });
    const PromiseConnection = requireFromHere(
      `${process.cwd()}/node_modules/mysql2/lib/promise/pool_connection.js`,
    ) as new (connection: unknown, promise: PromiseConstructor) => PoolConnection;
    const connection = new PromiseConnection(native, Promise);
    const harness = makeFreshPool({
      connection: connection as unknown as FakeConnection,
    });
    markAvailable(harness);
    const lease = await harness.controlled.getConnection();

    if (failureMode.startsWith("prepare")) {
      await expect(lease.prepare("BROKEN PREPARE")).rejects.toThrow(
        "NQR_DATABASE_COMMAND_FAILED",
      );
    } else {
      const statement = await lease.prepare("PREPARED");
      const operation = failureMode.startsWith("execute")
        ? statement.execute([])
        : statement.close();
      await expect(operation).rejects.toThrow("NQR_DATABASE_COMMAND_FAILED");
    }
    expect({ inspections, destroys, releases }).toEqual({
      inspections: 0,
      destroys: 1,
      releases: 0,
    });
  });

  it.each(["query", "execute"] as const)(
    "matches installed mysql2 retirement for %s without opening a socket",
    async (method) => {
      for (const managed of [false, true]) {
        const core = mysql.createPool({
          connectionLimit: 5,
          queueLimit: 10,
          waitForConnections: true,
        });
        let sockets = 0;
        let commands = 0;
        let destroys = 0;
        let releases = 0;
        (core as unknown as { _createConnectionConfig: () => never })
          ._createConnectionConfig = () => {
            sockets += 1;
            throw new Error("NO_SOCKET");
          };
        const raw = core.promise();
        const pool = managed ? createAuthAwarePool(raw) : raw;
        const driverFailure = Object.assign(new Error("INERT"), { errno: 1290 });
        const makeInstalledConnection = (failure: Error | null) => {
          const connection = Object.assign(new EventEmitter(), {
            stream: new EventEmitter(),
            _pool: core,
            _released: false,
            config: { trace: false },
            query(query: unknown, ...args: unknown[]) {
              commands += 1;
              const callback = args.at(-1);
              const event: EventEmitter & {
                onResult?: (
                  error: Error | null,
                  rows?: unknown[],
                  fields?: unknown[],
                ) => void;
              } = typeof query === "object" && query !== null
                ? query as EventEmitter & {
                    onResult?: (
                      error: Error | null,
                      rows?: unknown[],
                      fields?: unknown[],
                    ) => void;
                  }
                : new EventEmitter();
              process.nextTick(() => {
                if (typeof callback === "function") {
                  (callback as (
                    error: Error | null,
                    rows?: unknown[],
                    fields?: unknown[],
                  ) => void)(failure, failure ? undefined : [{ ok: 1 }], []);
                } else {
                  event.onResult?.(
                    failure,
                    failure ? undefined : [{ ok: 1 }],
                    [],
                  );
                }
                event.emit("end");
              });
              return event;
            },
            execute(
              _statement: unknown,
              _values: unknown,
              callback: (error: Error | null, rows?: unknown[], fields?: unknown[]) => void,
            ) {
              commands += 1;
              const event = new EventEmitter();
              process.nextTick(() => {
                callback(failure, failure ? undefined : [{ ok: 1 }], []);
                event.emit("end");
              });
              return event;
            },
            release() {
              releases += 1;
              core.releaseConnection(connection as never);
            },
            destroy() {
              destroys += 1;
              connection._pool = null as never;
              (core as unknown as { _removeConnection: (value: unknown) => void })
                ._removeConnection(connection);
            },
            _realEnd(callback: () => void) { callback(); },
          });
          return connection;
        };
        const failed = makeInstalledConnection(driverFailure);
        const healthy = makeInstalledConnection(null);
        const extras = Array.from({ length: 3 }, () => makeInstalledConnection(null));
        for (const connection of [failed, healthy, ...extras]) {
          (core as unknown as { _allConnections: { push: (value: unknown) => void } })
            ._allConnections.push(connection);
        }
        core.releaseConnection(failed as never);

        const invoke = pool[method] as (
          statement: string,
          values: unknown[],
        ) => Promise<unknown>;
        await expect(invoke.call(pool, "BROKEN", [])).rejects.toBeInstanceOf(Error);
        await tick();
        expect(destroys).toBe(1);
        expect((core as unknown as { _allConnections: { length: number } })
          ._allConnections.length).toBe(4);
        expect((core as unknown as { _freeConnections: { length: number } })
          ._freeConnections.length).toBe(0);

        core.releaseConnection(healthy as never);
        await expect(invoke.call(pool, "HEALTHY", [])).resolves.toEqual([[{ ok: 1 }], []]);
        expect(commands).toBe(2);
        expect(sockets).toBe(0);
        expect(releases).toBeGreaterThanOrEqual(1);
        await raw.end();
      }
    },
  );
});

describe("Drizzle transaction lease semantics", () => {
  function transactionHarness(fail: string | null = null) {
    const commands: string[] = [];
    const maybeFail = (name: string) => {
      commands.push(name);
      return fail === name
        ? Promise.reject(Object.create(null))
        : Promise.resolve([[], []]);
    };
    const connection = makeConnection({
      beginTransaction: vi.fn(() => maybeFail("begin")),
      commit: vi.fn(() => maybeFail("commit")),
      rollback: vi.fn(() => maybeFail("rollback")),
      query: vi.fn((query: unknown) => {
        const text = typeof query === "string"
          ? query
          : (query as { sql?: string })?.sql ?? String(query);
        const normalized = text.trim().toLowerCase();
        if (normalized.startsWith("set transaction")) return maybeFail("setup");
        if (normalized.startsWith("rollback to savepoint")) {
          return maybeFail("savepoint-rollback");
        }
        if (normalized.startsWith("release savepoint")) {
          return maybeFail("savepoint-release");
        }
        if (normalized.startsWith("savepoint")) return maybeFail("savepoint");
        if (normalized === "begin") return maybeFail("begin");
        if (normalized === "commit") return maybeFail("commit");
        if (normalized === "rollback") return maybeFail("rollback");
        return maybeFail("body");
      }),
    });
    const harness = makeFreshPool({ connection });
    markAvailable(harness);
    return {
      commands,
      connection,
      db: drizzle({ client: harness.controlled }),
    };
  }

  it("releases after commit and after a pure application rollback", async () => {
    const success = transactionHarness();
    await success.db.transaction(async (tx) => {
      await tx.execute(sql.raw("BODY"));
    });
    expect(success.commands).toEqual(["begin", "body", "commit"]);
    expect(success.connection.release).toHaveBeenCalledOnce();
    expect(success.connection.destroy).not.toHaveBeenCalled();

    const application = transactionHarness();
    await expect(application.db.transaction(async (tx) => {
      await tx.execute(sql.raw("BODY"));
      throw new Error("application only");
    })).rejects.toThrow("application only");
    expect(application.commands).toEqual(["begin", "body", "rollback"]);
    expect(application.connection.release).toHaveBeenCalledOnce();
    expect(application.connection.destroy).not.toHaveBeenCalled();
  });

  it.each(["setup", "begin", "body", "commit", "rollback", "savepoint"])(
    "retires the whole lease when %s fails",
    async (failure) => {
      const item = transactionHarness(failure);
      const operation = failure === "setup"
        ? item.db.transaction(async () => undefined, { isolationLevel: "read committed" })
        : failure === "rollback"
          ? item.db.transaction(async () => { throw new Error("application"); })
          : failure === "savepoint"
            ? item.db.transaction(async (tx) => {
                await tx.transaction(async () => undefined);
              })
            : item.db.transaction(async (tx) => {
                await tx.execute(sql.raw("BODY"));
              });
      await expect(operation).rejects.toBeInstanceOf(Error);
      expect(item.connection.destroy).toHaveBeenCalledOnce();
      expect(item.connection.release).not.toHaveBeenCalled();
      const failedAt = item.commands.indexOf(failure);
      expect(failedAt).toBeGreaterThanOrEqual(0);
      expect(item.commands.slice(failedAt + 1)).toEqual([]);
    },
  );

  it("allows a healthy nested application rollback to continue and commit", async () => {
    const item = transactionHarness();
    await item.db.transaction(async (tx) => {
      await expect(tx.transaction(async () => {
        throw new Error("nested application");
      })).rejects.toThrow("nested application");
      await tx.execute(sql.raw("AFTER"));
    });
    expect(item.commands).toEqual([
      "begin",
      "savepoint",
      "savepoint-rollback",
      "body",
      "commit",
    ]);
    expect(item.connection.release).toHaveBeenCalledOnce();
    expect(item.connection.destroy).not.toHaveBeenCalled();
  });
});
