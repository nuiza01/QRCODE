import "server-only";

import { EventEmitter } from "node:events";
import type { Pool, PoolConnection } from "mysql2/promise";

import {
  createAuthOperationFailure,
  getAuthOperationState,
  registerAuthOperationResource,
} from "@/lib/auth-operation";

const CORE_OWNER = Symbol.for("nexora.qr.auth-pool.core-owner.v1");
const FACADE_OWNER = Symbol.for("nexora.qr.auth-pool.facade-owner.v1");
const OWNER_VERSION = "nqr-auth-pool-owner-v1";

const DRIVER_COMMANDS = new Set<PropertyKey>([
  "query",
  "execute",
  "beginTransaction",
  "commit",
  "rollback",
  "changeUser",
  "connect",
  "ping",
  "prepare",
  "reset",
]);

const SYNCHRONOUS_CONTROLS = new Set<PropertyKey>([
  "pause",
  "resume",
  "unprepare",
]);

const UNSUPPORTED_RUNTIME_CAPABILITIES = new Set<PropertyKey>([
  "createBinlogStream",
]);

const EVENT_EMITTER_METHODS = new Set<PropertyKey>([
  "addListener", "emit", "eventNames", "getMaxListeners", "listenerCount",
  "listeners", "off", "on", "once", "prependListener",
  "prependOnceListener", "rawListeners", "removeAllListeners",
  "removeListener", "setMaxListeners",
]);

const NOTIFICATION_EVENTS = new Set<string | symbol>([
  "acquire", "connection", "release", "connect", "drain", "enqueue", "error", "end", "close",
]);
const LEASE_NATIVE_EVENTS = new Set<string>(["connect", "drain", "enqueue", "error", "end"]);

type CorePool = {
  _allConnections: { length: number; get?: (index: number) => unknown };
  _freeConnections: { length: number; get?: (index: number) => unknown };
  _connectionQueue: { length: number };
  _closed: boolean;
  config: {
    connectionLimit: number;
    queueLimit: number;
    connectionConfig?: { gracefulEnd?: boolean };
    gracefulEnd?: boolean;
  };
  _removeConnection: (...args: unknown[]) => unknown;
  end: (callback?: (error?: unknown) => void) => unknown;
  on: (event: string, listener: (...args: unknown[]) => void) => unknown;
};

type ManagerBrand = {
  facade: Pool;
  version: typeof OWNER_VERSION;
};

type ManagerState = "OPEN" | "CLOSING" | "CLOSED" | "FAILED";
type EntryPhase = "WAITING" | "ACQUIRING" | "DELIVERED" | "SETTLED";
type LeaseState = "OWNED" | "ENDING" | "FAILED_DRAINING" | "RELEASED" | "RETIRED";

type Waiting = {
  active: boolean;
  auth: boolean;
  phase: EntryPhase;
  reject: (reason?: unknown) => void;
  resolve: (value: ManagedConnection) => void;
  lease: LeaseControl | null;
  unregister: () => void;
};

type LeaseControl = {
  proxy: ManagedConnection;
  connection: object;
  release: () => void;
  retire: (destroy: boolean) => void;
  end: () => Promise<void>;
};

type ManagedConnection = PoolConnection & { __nqrDispose: () => void };
type ManagedEventListener = (this: unknown, ...args: unknown[]) => unknown;
type NativeTerminalStream = {
  on: (event: string | symbol, listener: (...args: unknown[]) => void) => unknown;
  removeListener: (event: string | symbol, listener: (...args: unknown[]) => void) => unknown;
};
type NativeTerminalObserver = {
  stream: object;
  on: NativeTerminalStream["on"];
  removeListener: NativeTerminalStream["removeListener"];
  errorTarget: {
    on: (event: string | symbol, listener: (...args: unknown[]) => void) => unknown;
    removeListener: (event: string | symbol, listener: (...args: unknown[]) => void) => unknown;
  };
};
type NotificationListener = Parameters<PoolConnection["on"]>[1];

function captureDataMethod(target: object, property: "on" | "removeListener"):
  ((...args: unknown[]) => unknown) | null {
  let current: object | null = target;
  try {
    while (current) {
      const descriptor = Object.getOwnPropertyDescriptor(current, property);
      if (descriptor) {
        if (!("value" in descriptor) || typeof descriptor.value !== "function") return null;
        return descriptor.value.bind(target) as (...args: unknown[]) => unknown;
      }
      current = Object.getPrototypeOf(current) as object | null;
    }
  } catch {
    return null;
  }
  return null;
}
function readWrapperListener(wrapper: ManagedEventListener): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(wrapper, "listener");
  if (descriptor && "value" in descriptor) return descriptor.value;
  if (descriptor && "get" in descriptor && typeof descriptor.get === "function") {
    return descriptor.get.call(wrapper);
  }
  return undefined;
}
function fixedDatabaseFailure(message: string): Error {
  const failure = new Error(message);
  failure.name = "NqrDatabaseFailure";
  return failure;
}

function ownershipFailure(): Error {
  return fixedDatabaseFailure("NQR_DATABASE_POOL_OWNERSHIP_FAILED");
}

function closedFailure(): Error {
  return fixedDatabaseFailure("NQR_DATABASE_POOL_CLOSED");
}

function commandFailure(): Error {
  return fixedDatabaseFailure("NQR_DATABASE_COMMAND_FAILED");
}

function retiredLeaseFailure(): Error {
  return fixedDatabaseFailure("NQR_DATABASE_LEASE_RETIRED");
}

function queueFailure(): Error {
  return fixedDatabaseFailure("NQR_DATABASE_CONNECTION_QUEUE_FULL");
}

function connectionFailure(): Error {
  return fixedDatabaseFailure("NQR_DATABASE_CONNECTION_FAILED");
}

function preparedStatementClosedFailure(): Error {
  return fixedDatabaseFailure("NQR_DATABASE_PREPARED_STATEMENT_CLOSED");
}

function unsupportedCapabilityFailure(): Error {
  return fixedDatabaseFailure("NQR_DATABASE_UNSUPPORTED_CAPABILITY");
}

function notificationCapabilityFailure(): Error {
  return fixedDatabaseFailure("NQR_DATABASE_UNSUPPORTED_CAPABILITY");
}

function notificationOnlyFailure(): Error {
  return fixedDatabaseFailure("NQR_DATABASE_NOTIFICATION_ONLY");
}

class NotificationConnection implements PoolConnection {
  readonly id: string;

  readonly emit: PoolConnection["emit"] = () => { throw notificationOnlyFailure(); };
  readonly eventNames: PoolConnection["eventNames"] = () => { throw notificationOnlyFailure(); };
  readonly getMaxListeners: PoolConnection["getMaxListeners"] = () => { throw notificationOnlyFailure(); };
  readonly listenerCount: PoolConnection["listenerCount"] = () => { throw notificationOnlyFailure(); };
  readonly listeners: PoolConnection["listeners"] = () => { throw notificationOnlyFailure(); };
  readonly rawListeners: PoolConnection["rawListeners"] = () => { throw notificationOnlyFailure(); };

  constructor(id: string) {
    this.id = id;
    Object.freeze(this);
  }

  get connection(): this { return this; }
  get config(): PoolConnection["config"] { throw notificationOnlyFailure(); }
  get threadId(): PoolConnection["threadId"] { throw notificationOnlyFailure(); }
  get state(): PoolConnection["state"] { throw notificationOnlyFailure(); }
  get Promise(): PromiseConstructor { throw notificationOnlyFailure(); }
  get pool(): never { throw notificationOnlyFailure(); }
  get _pool(): never { throw notificationOnlyFailure(); }

  addListener(_eventName: string | symbol, _listener: NotificationListener): this {
    void _eventName; void _listener;
    throw notificationOnlyFailure();
  }
  on(_eventName: string | symbol, _listener: NotificationListener): this {
    void _eventName; void _listener;
    throw notificationOnlyFailure();
  }
  once(_eventName: string | symbol, _listener: NotificationListener): this {
    void _eventName; void _listener;
    throw notificationOnlyFailure();
  }
  prependListener(_eventName: string | symbol, _listener: NotificationListener): this {
    void _eventName; void _listener;
    throw notificationOnlyFailure();
  }
  prependOnceListener(_eventName: string | symbol, _listener: NotificationListener): this {
    void _eventName; void _listener;
    throw notificationOnlyFailure();
  }
  off(_eventName: string | symbol, _listener: NotificationListener): this {
    void _eventName; void _listener;
    throw notificationOnlyFailure();
  }
  removeListener(_eventName: string | symbol, _listener: NotificationListener): this {
    void _eventName; void _listener;
    throw notificationOnlyFailure();
  }
  removeAllListeners(_eventName?: string | symbol): this {
    void _eventName;
    throw notificationOnlyFailure();
  }
  setMaxListeners(_count: number): this {
    void _count;
    throw notificationOnlyFailure();
  }

  query: PoolConnection["query"] = () => Promise.reject<never>(notificationOnlyFailure());
  execute: PoolConnection["execute"] = () => Promise.reject<never>(notificationOnlyFailure());
  beginTransaction: PoolConnection["beginTransaction"] = () => Promise.reject<never>(notificationOnlyFailure());
  commit: PoolConnection["commit"] = () => Promise.reject<never>(notificationOnlyFailure());
  rollback: PoolConnection["rollback"] = () => Promise.reject<never>(notificationOnlyFailure());
  connect: PoolConnection["connect"] = () => Promise.reject<never>(notificationOnlyFailure());
  ping: PoolConnection["ping"] = () => Promise.reject<never>(notificationOnlyFailure());
  prepare: PoolConnection["prepare"] = () => Promise.reject<never>(notificationOnlyFailure());
  reset: PoolConnection["reset"] = () => Promise.reject<never>(notificationOnlyFailure());
  changeUser: PoolConnection["changeUser"] = () => Promise.reject<never>(notificationOnlyFailure());
  end: PoolConnection["end"] = () => Promise.reject<never>(notificationOnlyFailure());
  [Symbol.asyncDispose] = (): Promise<void> => Promise.reject<never>(notificationOnlyFailure());

  release(): void { throw notificationOnlyFailure(); }
  destroy(): void { throw notificationOnlyFailure(); }
  close(): void { throw notificationOnlyFailure(); }
  pause(): void { throw notificationOnlyFailure(); }
  resume(): void { throw notificationOnlyFailure(); }
  unprepare(sql: string | import("mysql2").QueryOptions): void { void sql; throw notificationOnlyFailure(); }
  escape(value: unknown): string { void value; throw notificationOnlyFailure(); }
  escapeId(value: string | string[]): string { void value; throw notificationOnlyFailure(); }
  format(sql: string, values?: unknown): string { void sql; void values; throw notificationOnlyFailure(); }
  createBinlogStream(): never { throw notificationCapabilityFailure(); }
}
Object.freeze(NotificationConnection.prototype);

function sanitizeNotificationArgs(
  event: string | symbol,
  args: unknown[],
  getView: (value: object | ((...args: unknown[]) => unknown)) => NotificationConnection,
): unknown[] {
  if (!NOTIFICATION_EVENTS.has(event)) return args;
  if (event === "enqueue" || event === "drain" || event === "connect" || event === "end" || event === "close") return [];
  if (event === "error") return [fixedDatabaseFailure("NQR_DATABASE_DRIVER_ERROR")];
  return args.map((value) => {
    if ((typeof value === "object" && value !== null) || typeof value === "function") {
      return getView(value);
    }
    return value;
  });
}

function descriptorValue(target: object, property: PropertyKey): unknown {
  return Object.getOwnPropertyDescriptor(target, property)?.value;
}

function readExistingFacade(value: unknown): Pool {
  if ((typeof value !== "object" && typeof value !== "function") || value === null) {
    throw ownershipFailure();
  }
  if (descriptorValue(value, "version") !== OWNER_VERSION) throw ownershipFailure();
  const facade = descriptorValue(value, "facade");
  if ((typeof facade !== "object" && typeof facade !== "function") || facade === null) {
    throw ownershipFailure();
  }
  return facade as Pool;
}

function readFacadeOwner(pool: Pool): ManagerBrand | null {
  try {
    const owner = descriptorValue(pool as unknown as object, FACADE_OWNER);
    return owner === undefined ? null : owner as ManagerBrand;
  } catch {
    throw ownershipFailure();
  }
}

function readCore(pool: Pool): CorePool {
  try {
    const core = (pool as unknown as { pool?: unknown }).pool;
    if ((typeof core !== "object" && typeof core !== "function") || core === null) {
      throw ownershipFailure();
    }
    return core as CorePool;
  } catch {
    throw ownershipFailure();
  }
}

function validateFreshCore(core: CorePool, pool: Pool): void {
  const valid =
    typeof core._allConnections?.length === "number" &&
    typeof core._allConnections?.get === "function" &&
    typeof core._freeConnections?.length === "number" &&
    typeof core._freeConnections?.get === "function" &&
    typeof core._connectionQueue?.length === "number" &&
    typeof core._closed === "boolean" &&
    core._closed === false &&
    core._allConnections.length === 0 &&
    core._freeConnections.length === 0 &&
    core._connectionQueue.length === 0 &&
    core.config?.connectionLimit === 5 &&
    core.config?.queueLimit === 10 &&
    typeof core._removeConnection === "function" &&
    typeof core.end === "function" &&
    typeof core.on === "function" &&
    typeof pool.getConnection === "function" &&
    typeof pool.end === "function";
  if (!valid) throw ownershipFailure();
}

export function createAuthAwarePool(pool: Pool): Pool {
  const facadeOwner = readFacadeOwner(pool);
  if (facadeOwner) return readExistingFacade(facadeOwner);

  const core = readCore(pool);
  const existingCoreOwner = descriptorValue(core, CORE_OWNER);
  if (existingCoreOwner !== undefined) return readExistingFacade(existingCoreOwner);
  validateFreshCore(core, pool);

  const waiting: Waiting[] = [];
  const acquiring = new Set<Waiting>();
  const leases = new Set<LeaseControl>();
  const draining = new Set<LeaseControl>();
  const lateDraining = new Set<{ connection: object; terminal: NativeTerminalObserver; handler: (...args: unknown[]) => void }>();
  const terminalSubscribers = new Set<(failure: Error) => void>();
  const queueLimit = core.config.queueLimit;
  const gracefulEnd = core.config.connectionConfig?.gracefulEnd === true;
  const poolEvents = new EventEmitter();
  const poolBridges = new Map<string, (...args: unknown[]) => void>();
  const notificationViews = new WeakMap<object, NotificationConnection>();
  const notificationViewSet = new WeakSet<object>();
  let nextNotificationId = 1;
  const viewFor = (value: object | ((...args: unknown[]) => unknown)): NotificationConnection => {
    const key = value as object;
    if (notificationViewSet.has(key)) return key as NotificationConnection;
    const existing = notificationViews.get(key);
    if (existing) return existing;
    const created = new NotificationConnection(`nqr-notification-${nextNotificationId++}`);
    notificationViews.set(key, created);
    notificationViewSet.add(created as object);
    return created;
  };
  const eventRecords = new Map<string | symbol, Array<{
    listener: ManagedEventListener;
    wrapper: ManagedEventListener;
    once: boolean;
    fired: boolean;
  }>>();
  let state: ManagerState = "OPEN";
  let poolEndRequested = false;
  let pumping = false;
  let pumpScheduled = false;

  const attachPoolBridge = (event: string) => {
    if (poolBridges.has(event)) return;
    const bridge = (...args: unknown[]) => bridgeNativeEvent(event, args);
    poolBridges.set(event, bridge);
    core.on(event, bridge);
  };
  const detachPoolBridge = (event: string) => {
    const bridge = poolBridges.get(event);
    if (!bridge) return;
    const removable = core as unknown as { removeListener?: (name: string, listener: (...args: unknown[]) => void) => unknown };
    try { removable.removeListener?.(event, bridge); } catch {}
    poolBridges.delete(event);
  };

  const notifyRemoved = (event: string | symbol, listener: ManagedEventListener) => {
    for (const meta of [...(eventRecords.get("removeListener") ?? [])]) {
      meta.wrapper(event, listener);
    }
  };

  const removeEventRecord = (
    event: string | symbol,
    index: number,
    reportedListener?: ManagedEventListener,
    readCurrentAfterRemoval = false,
  ): boolean => {
    const records = eventRecords.get(event);
    if (!records || index < 0 || index >= records.length) return false;
    const [record] = records.splice(index, 1);
    if (event !== "newListener" && event !== "removeListener") {
      poolEvents.removeListener(event, record.wrapper);
    }
    if (records.length === 0) {
      eventRecords.delete(event);
      if (event === "acquire" || event === "enqueue" || event === "error") detachPoolBridge(event);
    }
    const current = readCurrentAfterRemoval ? readWrapperListener(record.wrapper) : undefined;
    const reported = typeof current === "function" ? current as ManagedEventListener : reportedListener ?? record.listener;
    notifyRemoved(event, reported);
    return true;
  };
  const removeAllEventRecords = (event?: string | symbol) => {
    const names = event === undefined || event === "removeListener"
      ? event === undefined ? [...eventRecords.keys()].filter((name) => name !== "removeListener") : []
      : [event];
    for (const name of names) {
      const records = eventRecords.get(name);
      while (records && records.length > 0) {
        const index = records.length - 1;
        const needsMetadata = (eventRecords.get("removeListener")?.length ?? 0) > 0;
        const record = records[index];
        removeEventRecord(
          name,
          index,
          needsMetadata && records.length > 1 ? (record.once ? record.wrapper : record.listener) : undefined,
          needsMetadata && records.length === 1,
        );
      }
    }
    if (event === undefined || event === "removeListener") {
      const records = eventRecords.get("removeListener");
      while (records && records.length > 0) {
        const index = records.length - 1;
        const record = records[index];
        removeEventRecord("removeListener", index, record.once ? record.wrapper : record.listener);
      }
    }
  };

  const eventAdd = (
    event: string | symbol,
    listener: ManagedEventListener,
    mode: "on" | "addListener" | "once" | "prependListener" | "prependOnceListener",
  ): Pool => {
    if (typeof listener !== "function") throw new TypeError("The listener argument must be of type function");
    for (const meta of [...(eventRecords.get("newListener") ?? [])]) {
      meta.wrapper(event, listener);
    }
    const once = mode === "once" || mode === "prependOnceListener";
    const record = { listener, wrapper: undefined as unknown as ManagedEventListener, once, fired: false };
    const wrapper: ManagedEventListener = (...args: unknown[]) => {
      if (once) {
        if (record.fired) return;
          const records = eventRecords.get(event);
          const index = records?.findIndex((candidate) => candidate.wrapper === wrapper) ?? -1;
          if (index >= 0) {
            const needsMetadata = (eventRecords.get("removeListener")?.length ?? 0) > 0;
            removeEventRecord(
              event,
              index,
              needsMetadata && records!.length > 1 ? records![index].wrapper : undefined,
              needsMetadata && records!.length === 1,
            );
          }
          record.fired = true;
      }
      return listener.apply(facade, sanitizeNotificationArgs(event, args, viewFor));
    };
    Object.defineProperty(wrapper, "listener", { configurable: true, writable: true, value: listener });
    record.wrapper = wrapper;
    const records = eventRecords.get(event) ?? [];
    if (mode === "prependListener" || mode === "prependOnceListener") records.unshift(record);
    else records.push(record);
    eventRecords.set(event, records);
    if (event !== "newListener") {
      if (event === "acquire" || event === "enqueue" || event === "error") attachPoolBridge(event);
      if (event !== "removeListener") poolEvents[mode](event, wrapper);
    }
    return facade;
  };

  const removeEventListener = (event: string | symbol, listener: ManagedEventListener): Pool => {
    const records = eventRecords.get(event);
    const needsMetadata = (eventRecords.get("removeListener")?.length ?? 0) > 0;
    let index = -1;
    for (let candidate = (records?.length ?? 0) - 1; candidate >= 0; candidate -= 1) {
      const record = records![candidate];
      if (record.wrapper === listener) {
        index = candidate;
        break;
      }
      const wrapped = readWrapperListener(record.wrapper);
      if (wrapped === listener) {
        index = candidate;
        break;
      }
    }
    if (index >= 0) {
      const slotCount = records!.length;
      removeEventRecord(
        event,
        index,
        needsMetadata && slotCount > 1 ? listener : undefined,
        needsMetadata && slotCount === 1,
      );
    }
    return facade;
  };

  const emitManagedEvent = (event: string | symbol, args: unknown[]) => {
    const safeArgs = sanitizeNotificationArgs(event, args, viewFor);
    if (event === "newListener" || event === "removeListener") {
      const records = [...(eventRecords.get(event) ?? [])];
      for (const record of records) record.wrapper(...safeArgs);
      return records.length > 0;
    }
    return poolEvents.emit(event, ...safeArgs);
  };

  const bridgeNativeEvent = (event: string, args: unknown[]) => {
    if (event === "error" && poolEvents.listenerCount("error") === 0) return;
    try {
      emitManagedEvent(event, args);
    } catch (error) {
      queueMicrotask(() => { throw error; });
    }
  };

  const terminalFailure = () =>
    state === "FAILED" ? ownershipFailure() : closedFailure();

  const subscribeToTerminalState = (subscriber: (failure: Error) => void) => {
    if (state !== "OPEN") {
      subscriber(terminalFailure());
      return () => undefined;
    }
    terminalSubscribers.add(subscriber);
    return () => {
      terminalSubscribers.delete(subscriber);
    };
  };

  const removeWaiting = (entry: Waiting) => {
    const index = waiting.indexOf(entry);
    if (index >= 0) waiting.splice(index, 1);
  };

  const snapshotNativeQueue = (queue: { length: number; get?: (index: number) => unknown }): object[] => {
    if (typeof queue.get !== "function" || !Number.isSafeInteger(queue.length) || queue.length < 0) {
      throw ownershipFailure();
    }
    const entries: object[] = [];
    const identities = new Set<object>();
    for (let index = 0; index < queue.length; index += 1) {
      const value = queue.get(index);
      if ((typeof value !== "object" && typeof value !== "function") || value === null) throw ownershipFailure();
      if (identities.has(value)) throw ownershipFailure();
      identities.add(value);
      entries.push(value);
    }
    return entries;
  };

  const capturePhysicalIdentity = (connection: PoolConnection): { physical: object; terminal: NativeTerminalObserver } => {
    const descriptor = Object.getOwnPropertyDescriptor(connection as object, "connection");
    if (!descriptor || !("value" in descriptor)) throw ownershipFailure();
    const physical = descriptor.value;
    if ((typeof physical !== "object" && typeof physical !== "function") || physical === null) throw ownershipFailure();
    const entries = snapshotNativeQueue(core._allConnections);
    if (!entries.includes(physical)) throw ownershipFailure();
    if ([...leases].some((lease) => lease.connection === physical)) throw ownershipFailure();
    const streamDescriptor = Object.getOwnPropertyDescriptor(physical, "stream");
    if (!streamDescriptor || !("value" in streamDescriptor) || !streamDescriptor.value || typeof streamDescriptor.value !== "object") {
      throw ownershipFailure();
    }
    const stream = streamDescriptor.value as object;
    const on = captureDataMethod(stream, "on");
    const removeListener = captureDataMethod(stream, "removeListener");
    if (!on || !removeListener) throw ownershipFailure();
    const errorOn = captureDataMethod(connection as object, "on");
    const errorRemoveListener = captureDataMethod(connection as object, "removeListener");
    if (!errorOn || !errorRemoveListener) throw ownershipFailure();
    return {
      physical,
      terminal: {
        stream,
        on: on as NativeTerminalStream["on"],
        removeListener: removeListener as NativeTerminalStream["removeListener"],
        errorTarget: { on: errorOn, removeListener: errorRemoveListener },
      },
    };
  };

  const snapshotQueues = () => {
    const all = snapshotNativeQueue(core._allConnections);
    const free = snapshotNativeQueue(core._freeConnections);
    const allSet = new Set(all);
    if (free.some((entry) => !allSet.has(entry))) throw ownershipFailure();
    const drainingPhysical = new Set([
      ...[...draining].map((lease) => lease.connection),
      ...[...lateDraining].map((lease) => lease.connection),
    ]);
    if (free.some((entry) => drainingPhysical.has(entry))) throw ownershipFailure();
    const ownedPhysical = new Set([...leases].map((lease) => lease.connection));
    if (free.some((entry) => ownedPhysical.has(entry) && !drainingPhysical.has(entry))) throw ownershipFailure();
    const union = new Set([...all, ...drainingPhysical]);
    if (core.config.connectionLimit > 0 && union.size > core.config.connectionLimit) throw ownershipFailure();
    return { all, free, allSet, drainingPhysical, union };
  };

  const hasCapacity = () => {
    const { all, free, allSet, union } = snapshotQueues();
    const drainingAdditionalCount = union.size - allSet.size;
    return free.length > 0 ||
      core.config.connectionLimit === 0 ||
      all.length + drainingAdditionalCount < core.config.connectionLimit;
  };

  const schedulePump = () => {
    if (pumpScheduled || state !== "OPEN") return;
    pumpScheduled = true;
    queueMicrotask(() => {
      pumpScheduled = false;
      pump();
    });
  };

  const settleEntry = (entry: Waiting, failure: Error) => {
    if (!entry.active) return;
    entry.active = false;
    if (entry.phase === "WAITING") removeWaiting(entry);
    if (entry.phase !== "ACQUIRING") entry.phase = "SETTLED";
    entry.unregister();
    entry.reject(failure);
  };

  const enterTerminalState = (next: "CLOSING" | "FAILED", destroyLeases = true) => {
    if (state !== "OPEN") return;
    state = next;
    const failure = next === "FAILED" ? ownershipFailure() : closedFailure();
    for (const entry of [...waiting]) settleEntry(entry, failure);
    waiting.length = 0;
    for (const entry of acquiring) settleEntry(entry, failure);
    for (const subscriber of [...terminalSubscribers]) subscriber(failure);
    terminalSubscribers.clear();
    for (const lease of [...leases]) lease.retire(destroyLeases);
  };

  const verifyExclusiveOwnership = () => {
    if (state !== "OPEN" || poolEndRequested) return false;
    if (core._connectionQueue.length > 0) {
      enterTerminalState("FAILED");
      return false;
    }
    try {
      snapshotQueues();
    } catch {
      enterTerminalState("FAILED");
      return false;
    }
    return true;
  };

  const retainLateConnection = (connection: PoolConnection) => {
    let captured: { physical: object; terminal: NativeTerminalObserver };
    try {
      captured = capturePhysicalIdentity(connection);
    } catch {
      if (state === "OPEN") enterTerminalState("FAILED");
      try { connection.destroy(); } catch {}
      return;
    }
    const record = {
      connection: captured.physical,
      terminal: captured.terminal,
      handler: (() => undefined) as (...args: unknown[]) => void,
      errorHandler: (() => undefined) as (...args: unknown[]) => void,
    };
    const terminal = () => {
      try { record.terminal.removeListener("end", record.handler); } catch {}
      try { record.terminal.removeListener("close", record.handler); } catch {}
      try { record.terminal.errorTarget?.removeListener("error", record.errorHandler); } catch {}
      lateDraining.delete(record);
      schedulePump();
    };
    record.handler = terminal;
    record.errorHandler = () => undefined;
    lateDraining.add(record);
    let attemptedEnd = false;
    let attemptedClose = false;
    let attemptedError = false;
    try {
      attemptedEnd = true;
      record.terminal.on("end", record.handler);
      attemptedClose = true;
      record.terminal.on("close", record.handler);
      attemptedError = true;
      record.terminal.errorTarget.on("error", record.errorHandler);
    } catch {
      if (attemptedEnd) { try { record.terminal.removeListener("end", record.handler); } catch {} }
      if (attemptedClose) { try { record.terminal.removeListener("close", record.handler); } catch {} }
      if (attemptedError) { try { record.terminal.errorTarget.removeListener("error", record.errorHandler); } catch {} }
      lateDraining.delete(record);
      if (state === "OPEN") enterTerminalState("FAILED");
      try { connection.destroy(); } catch {}
      return;
    }
    try { connection.destroy(); } catch {
      if (state === "OPEN") enterTerminalState("FAILED");
    }
  };

  const createLease = (
    entry: Waiting,
    connection: PoolConnection,
    physicalConnection: object,
    terminal: NativeTerminalObserver,
  ): LeaseControl => {
    let leaseState: LeaseState = "OWNED";
    const activeCommands = new Set<(failure: Error) => void>();
    let pendingCommands = 0;
    let endPromise: Promise<void> | null = null;
    let endResolve: (() => void) | null = null;
    let endReject: ((error: Error) => void) | null = null;
    let nativeEndStarted = false;
    let endSettled = false;
    let nativeEligible = true;
    let terminalDestroyIssued = false;
    const leaseEvents = new EventEmitter();
    const leaseRecords = new Map<string | symbol, Array<{ listener: ManagedEventListener; wrapper: ManagedEventListener; once: boolean; fired: boolean }>>();
    const leaseBridges = new Map<string | symbol, (...args: unknown[]) => void>();
    let terminalHandler: ((...args: unknown[]) => void) | null = null;
    let errorHandler: ((...args: unknown[]) => void) | null = null;
    const nativeEventTarget = terminal.errorTarget;
    const nativeStream = terminal;

    const detachLeaseBridge = (event: string | symbol) => {
      const bridge = leaseBridges.get(event);
      if (!bridge) return;
      try { nativeEventTarget.removeListener(event, bridge); } catch {}
      leaseBridges.delete(event);
    };
    const attachLeaseBridge = (event: string | symbol) => {
      if (typeof event !== "string" || !LEASE_NATIVE_EVENTS.has(event)) return;
      if (!nativeEligible || leaseBridges.has(event)) return;
      const bridge = (...args: unknown[]) => {
        if (event === "error" && leaseEvents.listenerCount("error") === 0) return;
        try {
          leaseEvents.emit(event, ...sanitizeNotificationArgs(event, args, viewFor));
        } catch (error) {
          queueMicrotask(() => { throw error; });
        }
      };
      leaseBridges.set(event, bridge);
      nativeEventTarget.on(event, bridge);
    };
    const detachAllLeaseBridges = () => {
      for (const event of [...leaseBridges.keys()]) detachLeaseBridge(event);
    };
    const detachTerminalHandlers = () => {
      if (terminalHandler) {
        for (const event of ["end", "close"]) {
          try { nativeEventTarget.removeListener(event, terminalHandler); } catch {}
          try { nativeStream.removeListener(event, terminalHandler); } catch {}
        }
        terminalHandler = null;
      }
      if (errorHandler) {
        try { nativeEventTarget.removeListener("error", errorHandler); } catch {}
        errorHandler = null;
      }
    };
    const attachTerminalHandlers = (onTerminal: () => void, onError: () => void) => {
      if (terminalHandler || errorHandler) return;
      terminalHandler = onTerminal;
      errorHandler = onError;
      try {
        nativeEventTarget.on("end", terminalHandler);
        nativeEventTarget.on("close", terminalHandler);
        nativeStream.on("end", terminalHandler);
        nativeStream.on("close", terminalHandler);
        nativeEventTarget.on("error", errorHandler);
      } catch (error) {
        detachTerminalHandlers();
        throw error;
      }
    };
    const notifyLeaseRemoved = (event: string | symbol, listener: ManagedEventListener) => {
      for (const meta of [...(leaseRecords.get("removeListener") ?? [])]) meta.wrapper(event, listener);
    };
    const removeLeaseRecord = (
      event: string | symbol,
      index: number,
      reportedListener?: ManagedEventListener,
      readCurrentAfterRemoval = false,
    ): boolean => {
      const records = leaseRecords.get(event);
      if (!records || index < 0 || index >= records.length) return false;
      const [record] = records.splice(index, 1);
      if (event !== "newListener" && event !== "removeListener") leaseEvents.removeListener(event, record.wrapper);
      if (records.length === 0) {
        leaseRecords.delete(event);
        detachLeaseBridge(event);
      }
      const current = readCurrentAfterRemoval ? readWrapperListener(record.wrapper) : undefined;
      const reported = typeof current === "function" ? current as ManagedEventListener : reportedListener ?? record.listener;
      notifyLeaseRemoved(event, reported);
      return true;
    };
    const addLeaseEvent = (
      event: string | symbol,
      listener: ManagedEventListener,
      mode: "on" | "addListener" | "once" | "prependListener" | "prependOnceListener",
    ): ManagedConnection => {
      if (typeof listener !== "function") throw new TypeError("The listener argument must be of type function");
      for (const meta of [...(leaseRecords.get("newListener") ?? [])]) meta.wrapper(event, listener);
      const once = mode === "once" || mode === "prependOnceListener";
      const record = { listener, wrapper: undefined as unknown as ManagedEventListener, once, fired: false };
      const wrapper: ManagedEventListener = (...args: unknown[]) => {
        if (once) {
          if (record.fired) return;
          const records = leaseRecords.get(event);
          const index = records?.findIndex((record) => record.wrapper === wrapper) ?? -1;
          if (index >= 0) {
            const needsMetadata = (leaseRecords.get("removeListener")?.length ?? 0) > 0;
            removeLeaseRecord(
              event,
              index,
              needsMetadata && records!.length > 1 ? records![index].wrapper : undefined,
              needsMetadata && records!.length === 1,
            );
          }
          record.fired = true;
        }
        return listener.apply(leaseProxy, sanitizeNotificationArgs(event, args, viewFor));
      };
      Object.defineProperty(wrapper, "listener", { configurable: true, writable: true, value: listener });
      record.wrapper = wrapper;
      const records = leaseRecords.get(event) ?? [];
      if (mode === "prependListener" || mode === "prependOnceListener") records.unshift(record);
      else records.push(record);
      leaseRecords.set(event, records);
      if (event !== "newListener") {
        attachLeaseBridge(event);
        if (event !== "removeListener") leaseEvents[mode](event, wrapper);
      }
      return leaseProxy;
    };
    const removeLeaseEvent = (event: string | symbol, listener: ManagedEventListener): ManagedConnection => {
      const records = leaseRecords.get(event);
      const needsMetadata = (leaseRecords.get("removeListener")?.length ?? 0) > 0;
      let index = -1;
      for (let candidate = (records?.length ?? 0) - 1; candidate >= 0; candidate -= 1) {
        const record = records![candidate];
        if (record.wrapper === listener) {
          index = candidate;
          break;
        }
        const wrapped = readWrapperListener(record.wrapper);
        if (wrapped === listener) {
          index = candidate;
          break;
        }
      }
      if (index >= 0) {
        const slotCount = records!.length;
        removeLeaseRecord(
          event,
          index,
          needsMetadata && slotCount > 1 ? listener : undefined,
          needsMetadata && slotCount === 1,
        );
      }
      return leaseProxy;
    };
    const removeAllLeaseRecords = (event?: string | symbol) => {
      const names = event === undefined || event === "removeListener"
        ? event === undefined ? [...leaseRecords.keys()].filter((name) => name !== "removeListener") : []
        : [event];
      for (const name of names) {
        const records = leaseRecords.get(name);
        while (records && records.length > 0) {
          const index = records.length - 1;
          const needsMetadata = (leaseRecords.get("removeListener")?.length ?? 0) > 0;
          const record = records[index];
          removeLeaseRecord(
            name,
            index,
            needsMetadata && records.length > 1 ? (record.once ? record.wrapper : record.listener) : undefined,
            needsMetadata && records.length === 1,
          );
        }
      }
      if (event === undefined || event === "removeListener") {
        const records = leaseRecords.get("removeListener");
        while (records && records.length > 0) {
          const index = records.length - 1;
          const record = records[index];
          removeLeaseRecord("removeListener", index, record.once ? record.wrapper : record.listener);
        }
      }
    };

    const settleActiveCommands = (failure: Error) => {
      for (const settle of [...activeCommands]) settle(failure);
      activeCommands.clear();
    };

    const completeTerminal = () => {
      if (leaseState !== "ENDING" && leaseState !== "FAILED_DRAINING") return;
      nativeEligible = false;
      if (!endSettled) {
        endSettled = true;
        endReject?.(commandFailure());
        endResolve = null;
        endReject = null;
      }
      leaseState = "RETIRED";
      entry.active = false;
      entry.phase = "SETTLED";
      entry.unregister();
      leases.delete(lease);
      draining.delete(lease);
      detachAllLeaseBridges();
      detachTerminalHandlers();
      settleActiveCommands(retiredLeaseFailure());
      schedulePump();
    };

    const enterFailedDraining = () => {
      if (leaseState === "FAILED_DRAINING" || leaseState === "RETIRED" || leaseState === "RELEASED") return;
      leaseState = "FAILED_DRAINING";
      draining.add(lease);
      entry.active = false;
      entry.phase = "SETTLED";
      entry.unregister();
      nativeEligible = false;
      detachAllLeaseBridges();
      settleActiveCommands(retiredLeaseFailure());
      if (endPromise && !endSettled) {
        endSettled = true;
        endReject?.(retiredLeaseFailure());
        endResolve = null;
        endReject = null;
      }
      try {
        attachTerminalHandlers(completeTerminal, () => {
          if (leaseState !== "FAILED_DRAINING") enterFailedDraining();
        });
      } catch {
        if (state === "OPEN") enterTerminalState("FAILED");
      }
      if (!terminalDestroyIssued) {
        terminalDestroyIssued = true;
        try { connection.destroy(); } catch {
          if (state === "OPEN") enterTerminalState("FAILED");
        }
      }
    };

    const retire = (destroy: boolean) => {
      if (leaseState === "RELEASED" || leaseState === "RETIRED") return;
      if (leaseState === "FAILED_DRAINING") return;
      if (destroy) {
        enterFailedDraining();
        return;
      }
      if (endPromise && !endSettled) {
        endSettled = true;
        endReject?.(retiredLeaseFailure());
        endResolve = null;
        endReject = null;
      }
      leaseState = "RETIRED";
      entry.active = false;
      entry.phase = "SETTLED";
      entry.unregister();
      leases.delete(lease);
      draining.delete(lease);
      nativeEligible = false;
      detachAllLeaseBridges();
      detachTerminalHandlers();
      settleActiveCommands(retiredLeaseFailure());
      try { connection.release(); } catch {}
      schedulePump();
    };

    const release = () => {
      if (leaseState !== "OWNED") return;
      leaseState = "RELEASED";
      entry.active = false;
      entry.phase = "SETTLED";
      entry.unregister();
      leases.delete(lease);
      nativeEligible = false;
      detachAllLeaseBridges();
      detachTerminalHandlers();
      settleActiveCommands(retiredLeaseFailure());
      try { connection.release(); } catch {}
      schedulePump();
    };

    const startGracefulEnd = () => {
      if (state !== "OPEN" || poolEndRequested || !endPromise || nativeEndStarted || pendingCommands > 0 || leaseState !== "ENDING") return;
      nativeEndStarted = true;
      const settle = (error?: unknown) => {
        if (!endPromise || endSettled) return;
        if (error !== undefined && error !== null) {
          fail();
          return;
        }
        endSettled = true;
        entry.active = false;
        entry.phase = "SETTLED";
        entry.unregister();
        nativeEligible = false;
        detachAllLeaseBridges();
        endResolve?.();
        endResolve = null;
        endReject = null;
      };
      const fail = () => {
        if (endSettled) return;
        endSettled = true;
        endReject?.(commandFailure());
        endResolve = null;
        endReject = null;
        enterFailedDraining();
      };
      try {
        const onError = () => {
          if (endSettled) {
            enterFailedDraining();
            return;
          }
          fail();
        };
        attachTerminalHandlers(completeTerminal, onError);
        const endMethod = (connection as unknown as {
          end: (callback?: (error?: unknown) => void) => unknown;
        }).end;
        if (typeof endMethod !== "function") {
          fail();
          return;
        }
        const result = endMethod.call(connection, settle);
        if (result && typeof (result as Promise<unknown>).then === "function") {
          (result as Promise<unknown>).then(() => settle(), () => fail());
        }
      } catch {
        fail();
      }
    };

    const end = (): Promise<void> => {
      if (!gracefulEnd) {
        release();
        return Promise.resolve();
      }
      if (leaseState === "RETIRED" || leaseState === "RELEASED") {
        return Promise.resolve();
      }
      if (endPromise) return endPromise;
      leaseState = "ENDING";
      draining.add(lease);
      endPromise = new Promise<void>((resolve, reject) => {
        endResolve = resolve;
        endReject = reject;
      });
      startGracefulEnd();
      return endPromise;
    };

    const lease = { connection: physicalConnection, release, retire, end } as LeaseControl;

    const checkLeaseAccess = () => {
      if (leaseState !== "OWNED") return retiredLeaseFailure();
      if (state !== "OPEN") return terminalFailure();
      if (entry.auth && getAuthOperationState() !== "active") {
        retire(true);
        return retiredLeaseFailure();
      }
      return null;
    };

    const runSynchronousControl = (property: PropertyKey, args: unknown[]): void => {
      const failure = checkLeaseAccess();
      if (failure) throw failure;
      try {
        const method = Reflect.get(connection, property, connection);
        if (typeof method !== "function") throw commandFailure();
        method.apply(connection, args);
      } catch {
        retire(true);
        throw commandFailure();
      }
    };

    function wrapPreparedStatement(value: unknown) {
      if (
        (typeof value !== "object" && typeof value !== "function") ||
        value === null
      ) {
        throw commandFailure();
      }
      const statement = value as {
        close?: unknown;
        execute?: unknown;
      };
      const nativeClose = statement.close;
      const nativeExecute = statement.execute;
      if (typeof nativeClose !== "function" || typeof nativeExecute !== "function") {
        throw commandFailure();
      }
      const closeStatement = nativeClose as (...args: unknown[]) => unknown;
      const executeStatement = nativeExecute as (...args: unknown[]) => unknown;

      let statementState: "OPEN" | "CLOSING" | "CLOSED" = "OPEN";
      let closePromise: Promise<void> | null = null;
      return {
        close: () => {
          const failure = checkLeaseAccess();
          if (failure) return Promise.reject(failure);
          if (statementState === "CLOSED") return Promise.resolve();
          if (closePromise) return closePromise;
          statementState = "CLOSING";
          closePromise = runCommand<void>(
            statement,
            closeStatement,
            [],
            () => {
              statementState = "CLOSED";
            },
          ).catch((error) => {
            statementState = "CLOSED";
            throw error;
          });
          return closePromise;
        },
        execute: (parameters?: unknown) => {
          const failure = checkLeaseAccess();
          if (failure) return Promise.reject(failure);
          if (statementState !== "OPEN") {
            return Promise.reject(preparedStatementClosedFailure());
          }
          return runCommand(
            statement,
            executeStatement,
            parameters === undefined ? [] : [parameters],
          );
        },
      };
    }

    function runCommand<T = unknown>(
      receiver: unknown,
      method: (...args: unknown[]) => unknown,
      args: unknown[],
      transform: (value: unknown) => T = (value) => value as T,
    ): Promise<T> {
      if (leaseState !== "OWNED") return Promise.reject(retiredLeaseFailure());
      if (state !== "OPEN") return Promise.reject(terminalFailure());

      return new Promise<T>((resolve, reject) => {
        let settled = false;
        pendingCommands += 1;
        let unsubscribeTerminal: () => void = () => undefined;
        const finish = (settle: () => void) => {
          if (settled) return;
          settled = true;
          pendingCommands -= 1;
          unsubscribeTerminal();
          activeCommands.delete(settleOnLeaseEnd);
          settle();
          startGracefulEnd();
        };
        function settleOnLeaseEnd(failure: Error) {
          finish(() => reject(failure));
        }
        function settleOnTerminal(failure: Error) {
          finish(() => reject(failure));
        }
        activeCommands.add(settleOnLeaseEnd);
        unsubscribeTerminal = subscribeToTerminalState(settleOnTerminal);
        if (settled) return;

        queueMicrotask(() => {
          if (leaseState !== "OWNED" && leaseState !== "ENDING") {
            finish(() => reject(retiredLeaseFailure()));
            return;
          }
          if (state !== "OPEN") {
            finish(() => reject(terminalFailure()));
            return;
          }
          if (entry.auth && getAuthOperationState() !== "active") {
            finish(() => {
              retire(true);
              reject(retiredLeaseFailure());
            });
            return;
          }

          let result: unknown;
          try {
            result = method.apply(receiver, args);
          } catch {
            finish(() => {
              retire(true);
              reject(commandFailure());
            });
            return;
          }
          Promise.resolve(result).then(
            (value) => {
              if (leaseState !== "OWNED" && leaseState !== "ENDING") {
                finish(() => reject(retiredLeaseFailure()));
              } else if (state !== "OPEN") {
                finish(() => reject(terminalFailure()));
              } else {
                finish(() => {
                  try {
                    resolve(transform(value));
                  } catch {
                    retire(true);
                    reject(commandFailure());
                  }
                });
              }
            },
            () => {
              finish(() => {
                retire(true);
                reject(commandFailure());
              });
            },
          );
        });
      });
    }

    const leaseProxy = new Proxy(connection, {
      get(target, property) {
        if (property === "connection") return leaseProxy;
        if (EVENT_EMITTER_METHODS.has(property)) {
          if (property === "emit") return (event: string | symbol, ...args: unknown[]) => {
            const safeArgs = sanitizeNotificationArgs(event, args, viewFor);
            if (event === "newListener" || event === "removeListener") {
              const records = [...(leaseRecords.get(event) ?? [])];
              for (const record of records) record.wrapper(...safeArgs);
              return records.length > 0;
            }
            return leaseEvents.emit(event, ...safeArgs);
          };
          if (property === "on" || property === "addListener" || property === "once" || property === "prependListener" || property === "prependOnceListener") {
            return (event: string | symbol, listener: ManagedEventListener) => addLeaseEvent(event, listener, property);
          }
          if (property === "off" || property === "removeListener") {
            return (event: string | symbol, listener: ManagedEventListener) => removeLeaseEvent(event, listener);
          }
          if (property === "removeAllListeners") return (event?: string | symbol) => {
            removeAllLeaseRecords(event);
            if (event === undefined) leaseEvents.removeAllListeners();
            else if (event !== "newListener" && event !== "removeListener") leaseEvents.removeAllListeners(event);
            return leaseProxy;
          };
          if (property === "listeners") return (event: string | symbol) =>
            (leaseRecords.get(event) ?? []).map((record) => {
              if (!record.once) return record.listener;
              const descriptor = Object.getOwnPropertyDescriptor(record.wrapper, "listener");
              if (descriptor && "value" in descriptor && typeof descriptor.value === "function") return descriptor.value;
              if (descriptor && "get" in descriptor && typeof descriptor.get === "function") return descriptor.get.call(record.wrapper);
              return record.listener;
            });
          if (property === "rawListeners") return (event: string | symbol) =>
            (leaseRecords.get(event) ?? []).map((record) => {
              if (!record.once) return record.listener;
              return record.wrapper;
            });
          if (property === "eventNames") return () => {
            const names = new Set<string | symbol>();
            for (const [event, records] of leaseRecords) if (records.length > 0) names.add(event);
            for (const event of leaseEvents.eventNames()) names.add(event);
            return [...names];
          };
          if (property === "listenerCount") return (event: string | symbol, listener?: ManagedEventListener) => {
            if (!listener) return leaseRecords.get(event)?.length ?? leaseEvents.listenerCount(event);
            return (leaseRecords.get(event) ?? []).filter((record) => {
              if (record.wrapper === listener || (!record.once && record.listener === listener)) return true;
              const descriptor = Object.getOwnPropertyDescriptor(record.wrapper, "listener");
              if (descriptor && "value" in descriptor) return descriptor.value === listener;
              if (descriptor && "get" in descriptor && typeof descriptor.get === "function") return descriptor.get.call(record.wrapper) === listener;
              return false;
            }).length;
          };
          if (property === "getMaxListeners") return () => leaseEvents.getMaxListeners();
          if (property === "setMaxListeners") return (count: number) => { leaseEvents.setMaxListeners(count); return leaseProxy; };
        }
        if (property === "__nqrDispose" || property === "destroy" || property === "close") {
          return () => retire(true);
        }
        if (property === "release") return release;
        if (property === Symbol.asyncDispose) {
          return async (): Promise<void> => {
            release();
          };
        }
        if (property === "end") {
          return end;
        }
        if (SYNCHRONOUS_CONTROLS.has(property)) {
          return (...args: unknown[]): void => runSynchronousControl(property, args);
        }
        if (UNSUPPORTED_RUNTIME_CAPABILITIES.has(property)) {
          return () => {
            throw unsupportedCapabilityFailure();
          };
        }
        const value = Reflect.get(target, property, target);
        if (property === "Promise") return value;
        if (!DRIVER_COMMANDS.has(property) || typeof value !== "function") {
          if (typeof value !== "function") return value;
          return (...args: unknown[]) => {
            const result = value.apply(target, args);
            return result === target ? leaseProxy : result;
          };
        }
        return (...args: unknown[]) => runCommand(
          connection,
          value,
          args,
          property === "prepare" ? wrapPreparedStatement : undefined,
        );
      },
    }) as ManagedConnection;

    lease.proxy = leaseProxy;
    leases.add(lease);
    return lease;
  };

  const finishReservation = (entry: Waiting) => {
    if (!acquiring.delete(entry)) return false;
    return true;
  };

  const acquisitionFailed = (entry: Waiting) => {
    if (!finishReservation(entry)) return;
    entry.phase = "SETTLED";
    if (entry.active) settleEntry(entry, connectionFailure());
    schedulePump();
  };

  const acquisitionSucceeded = (entry: Waiting, connection: PoolConnection) => {
    if (!finishReservation(entry)) {
      retainLateConnection(connection);
      return;
    }
    if (!verifyExclusiveOwnership() || !entry.active) {
      if (entry.active) settleEntry(entry, terminalFailure());
      retainLateConnection(connection);
      schedulePump();
      return;
    }
    entry.phase = "DELIVERED";
    let physicalConnection: object;
    let terminal: NativeTerminalObserver;
    try {
      ({ physical: physicalConnection, terminal } = capturePhysicalIdentity(connection));
    } catch {
      entry.active = false;
      entry.phase = "SETTLED";
      entry.unregister();
      enterTerminalState("FAILED");
      try { connection.destroy(); } catch {}
      entry.reject(ownershipFailure());
      schedulePump();
      return;
    }
    const lease = createLease(entry, connection, physicalConnection, terminal);
    entry.lease = lease;
    entry.resolve(lease.proxy);
    schedulePump();
  };

  const dispatchAcquisition = (entry: Waiting) => {
    entry.phase = "ACQUIRING";
    acquiring.add(entry);
    let pending: unknown;
    try {
      pending = pool.getConnection();
    } catch {
      acquisitionFailed(entry);
      return false;
    }
    Promise.resolve(pending).then(
      (connection) => acquisitionSucceeded(entry, connection as PoolConnection),
      () => acquisitionFailed(entry),
    );
    return true;
  };

  function pump(): void {
    if (pumping || !verifyExclusiveOwnership()) return;
    pumping = true;
    try {
      while (waiting.length > 0 && hasCapacity() && verifyExclusiveOwnership()) {
        const entry = waiting.shift()!;
        if (!entry.active) continue;
        if (!dispatchAcquisition(entry)) break;
      }
    } finally {
      pumping = false;
    }
  }

  const expireEntry = (entry: Waiting) => {
    if (!entry.active) return;
    if (entry.lease) entry.lease.retire(true);
    else settleEntry(entry, retiredLeaseFailure());
    schedulePump();
  };

  const acquire = (auth: boolean): Promise<ManagedConnection> => {
    if (state !== "OPEN" || poolEndRequested) return Promise.reject(terminalFailure());
    if (!verifyExclusiveOwnership()) return Promise.reject(ownershipFailure());
    if (waiting.length + acquiring.size >= queueLimit) {
      return Promise.reject(auth ? createAuthOperationFailure() : queueFailure());
    }

    return new Promise<ManagedConnection>((resolve, reject) => {
      const entry: Waiting = {
        active: true,
        auth,
        phase: "WAITING",
        reject,
        resolve,
        lease: null,
        unregister: () => undefined,
      };
      if (auth) {
        entry.unregister = registerAuthOperationResource(() => expireEntry(entry));
      }
      waiting.push(entry);
      pump();
    });
  };

  const withConnection = async (
    auth: boolean,
    method: "query" | "execute",
    args: unknown[],
  ): Promise<unknown> => {
    const connection = await acquire(auth);
    try {
      return await (connection[method] as (...values: unknown[]) => Promise<unknown>)(
        ...args,
      );
    } finally {
      connection.release();
    }
  };

  const facade = new Proxy(pool, {
    get(target, property, receiver) {
      if (property === FACADE_OWNER) return descriptorValue(target, FACADE_OWNER);
      if (property === "pool") return undefined;
      if (EVENT_EMITTER_METHODS.has(property)) {
        if (property === "emit") return (event: string | symbol, ...args: unknown[]) => emitManagedEvent(event, args);
        if (property === "on" || property === "addListener" || property === "once" || property === "prependListener" || property === "prependOnceListener") {
          return (event: string | symbol, listener: ManagedEventListener) =>
            eventAdd(event, listener, property);
        }
        if (property === "off" || property === "removeListener") {
          return (event: string | symbol, listener: ManagedEventListener) =>
            removeEventListener(event, listener);
        }
        if (property === "removeAllListeners") {
          return (event?: string | symbol) => {
            removeAllEventRecords(event);
            if (event === undefined) poolEvents.removeAllListeners();
            else if (event !== "newListener" && event !== "removeListener") poolEvents.removeAllListeners(event);
            return facade;
          };
        }
        if (property === "listeners") {
          return (event: string | symbol) =>
            (eventRecords.get(event) ?? []).map((record) => {
              if (!record.once) return record.listener;
              const descriptor = Object.getOwnPropertyDescriptor(record.wrapper, "listener");
              if (descriptor && "value" in descriptor && typeof descriptor.value === "function") return descriptor.value;
              if (descriptor && "get" in descriptor && typeof descriptor.get === "function") return descriptor.get.call(record.wrapper);
              return record.listener;
            });
        }
        if (property === "rawListeners") {
          return (event: string | symbol) =>
            (eventRecords.get(event) ?? []).map((record) => {
              if (!record.once) return record.listener;
              return record.wrapper;
            });
        }
        if (property === "eventNames") return () => {
          const names = new Set<string | symbol>();
          for (const [event, records] of eventRecords) if (records.length > 0) names.add(event);
          for (const event of poolEvents.eventNames()) names.add(event);
          return [...names];
        };
        if (property === "listenerCount") return (event: string | symbol, listener?: ManagedEventListener) => {
          if (!listener) return eventRecords.get(event)?.length ?? poolEvents.listenerCount(event);
          return (eventRecords.get(event) ?? []).filter((record) => {
            if (record.wrapper === listener || (!record.once && record.listener === listener)) return true;
            const descriptor = Object.getOwnPropertyDescriptor(record.wrapper, "listener");
            if (descriptor && "value" in descriptor) return descriptor.value === listener;
            if (descriptor && "get" in descriptor && typeof descriptor.get === "function") return descriptor.get.call(record.wrapper) === listener;
            return false;
          }).length;
        };
        if (property === "getMaxListeners") return () => poolEvents.getMaxListeners();
        if (property === "setMaxListeners") return (count: number) => { poolEvents.setMaxListeners(count); return facade; };
      }
      if (property === "query" || property === "execute") {
        return (...args: unknown[]) => {
          const operationState = getAuthOperationState();
          if (operationState === "expired") {
            return Promise.reject(createAuthOperationFailure());
          }
          return withConnection(operationState === "active", property, args);
        };
      }
      if (property === "getConnection") {
        return () => {
          const operationState = getAuthOperationState();
          if (operationState === "expired") {
            return Promise.reject(createAuthOperationFailure());
          }
          return acquire(operationState === "active");
        };
      }
      const value = Reflect.get(target, property, receiver);
      if (property === "Promise") return value;
      if (typeof value !== "function") return value;
      return (...args: unknown[]) => {
        const result = value.apply(target, args);
        return result === target ? facade : result;
      };
    },
  }) as Pool;

  const brand: ManagerBrand = { facade, version: OWNER_VERSION };
  try {
    Object.defineProperty(core, CORE_OWNER, {
      configurable: false,
      enumerable: false,
      value: brand,
      writable: false,
    });
    Object.defineProperty(pool as unknown as object, FACADE_OWNER, {
      configurable: false,
      enumerable: false,
      value: brand,
      writable: false,
    });
  } catch {
    throw ownershipFailure();
  }

  const originalRemoveConnection = core._removeConnection;
  core._removeConnection = function (this: CorePool, ...args: unknown[]) {
    if (state === "OPEN" && core._connectionQueue.length > 0) {
      enterTerminalState("FAILED");
    }
    try {
      return originalRemoveConnection.apply(this, args);
    } finally {
      schedulePump();
    }
  };

  const originalEnd = core.end;
  const closeCallbacks: Array<(error?: unknown) => void> = [];
  let nativeCloseStarted = false;
  let nativeCloseSettled = false;
  let nativeCloseError: unknown;

  const settleNativeClose = (error?: unknown) => {
    if (nativeCloseSettled) return;
    nativeCloseSettled = true;
    nativeCloseError = error;
    state = "CLOSED";
    const callbacks = closeCallbacks.splice(0);
    for (const callback of callbacks) callback(error);
  };

  core.end = function (this: CorePool, callback?: (error?: unknown) => void) {
    const listener = typeof callback === "function"
      ? callback
      : (error?: unknown) => {
          if (error !== undefined && error !== null) throw error;
        };
    if (nativeCloseSettled) {
      process.nextTick(() => listener(nativeCloseError));
      return;
    }
    closeCallbacks.push(listener);
    if (poolEndRequested) return;
    poolEndRequested = true;
    if (state === "OPEN") enterTerminalState("CLOSING", gracefulEnd);
    else if (state === "FAILED") state = "CLOSING";
    if (nativeCloseStarted) return;
    nativeCloseStarted = true;
    try {
      originalEnd.call(this, settleNativeClose);
    } catch (error) {
      settleNativeClose(error);
    }
  };

  core.on("release", (...args: unknown[]) => {
    schedulePump();
    bridgeNativeEvent("release", args);
  });
  core.on("connection", (...args: unknown[]) => {
    schedulePump();
    bridgeNativeEvent("connection", args);
  });
  core.on("enqueue", schedulePump);
  return facade;
}
