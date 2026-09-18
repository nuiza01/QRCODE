import { AsyncLocalStorage } from "node:async_hooks";
import { readFileSync } from "node:fs";

import ts from "typescript";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  assertAuthOperationActive,
  getAuthOperationState,
  isAuthOperationTimeout,
  registerAuthOperationResource,
  withAuthOperationDeadline,
} from "./auth-operation";

type AuthOperationModule = typeof import("./auth-operation");

const lifecycleOwnerKey = Symbol.for(
  "nexora.qr.auth-operation.lifecycle-owner.v1",
);

function loadAuthOperationModule(realm: object): AuthOperationModule {
  const source = readFileSync(new URL("./auth-operation.ts", import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const loaded = { exports: {} as AuthOperationModule };
  const evaluate = new Function(
    "require",
    "module",
    "exports",
    "globalThis",
    compiled,
  ) as (
    requireModule: (id: string) => unknown,
    module: typeof loaded,
    exports: AuthOperationModule,
    globalObject: object,
  ) => void;
  evaluate(
    (id) => id === "server-only" ? {} : id === "node:async_hooks"
      ? { AsyncLocalStorage }
      : (() => { throw new Error("UNEXPECTED_IMPORT"); })(),
    loaded,
    loaded.exports,
    realm,
  );
  return loaded.exports;
}

describe("bounded auth operations", () => {
  it("settles ordinary success and replaces an unknown rejection", async () => {
    await expect(withAuthOperationDeadline(Promise.resolve("ok"), 50)).resolves.toBe("ok");

    let inspected = 0;
    const hostile = new Proxy(Object.create(null), {
      get() { inspected += 1; throw new Error("do not inspect"); },
      getPrototypeOf() { inspected += 1; throw new Error("do not inspect"); },
    });
    const failure = await withAuthOperationDeadline(Promise.reject(hostile), 50)
      .catch((error) => error);
    expect(failure).toBeInstanceOf(Error);
    expect(failure.message).toBe("NQR_AUTH_OPERATION_FAILED");
    expect(failure).not.toHaveProperty("cause");
    expect(inspected).toBe(0);
  });

  it("times out a non-cooperative operation and absorbs its late rejection", async () => {
    vi.useFakeTimers();
    try {
      let rejectLate: (reason: unknown) => void = () => undefined;
      const operation = new Promise<never>((_resolve, reject) => { rejectLate = reject; });
      const result = withAuthOperationDeadline(operation, 25).catch((error) => error);
      await vi.advanceTimersByTimeAsync(25);
      const failure = await result;
      expect(isAuthOperationTimeout(failure)).toBe(true);
      expect(failure.message).toBe("NQR_AUTH_OPERATION_TIMEOUT");
      expect(Object.isExtensible(failure)).toBe(true);
      expect(() => Object.assign(failure, { code: "framework-diagnostic" })).not.toThrow();
      rejectLate(new Error("late private rejection"));
      await Promise.resolve();
    } finally {
      vi.useRealTimers();
    }
  });

  it("contains synchronous startup failures without inspecting the thrown value", async () => {
    let inspected = 0;
    const hostile = new Proxy(Object.create(null), {
      get() { inspected += 1; throw new Error("do not inspect"); },
      getPrototypeOf() { inspected += 1; throw new Error("do not inspect"); },
    });
    const failure = await withAuthOperationDeadline(() => { throw hostile; }, 50)
      .catch((error) => error);
    expect(failure).toBeInstanceOf(Error);
    expect(failure.message).toBe("NQR_AUTH_OPERATION_FAILED");
    expect(inspected).toBe(0);
  });

  it("expires controlled continuations and disposes only their active resource", async () => {
    vi.useFakeTimers();
    try {
      const dispose = vi.fn();
      let continueLate: () => void = () => undefined;
      const operation = withAuthOperationDeadline(async () => {
        registerAuthOperationResource(dispose);
        await new Promise<void>((resolve) => { continueLate = resolve; });
        assertAuthOperationActive();
        return "late";
      }, 25).catch((error) => error);
      await vi.advanceTimersByTimeAsync(25);
      expect(isAuthOperationTimeout(await operation)).toBe(true);
      expect(dispose).toHaveBeenCalledOnce();
      continueLate();
      await Promise.resolve();
    } finally {
      vi.useRealTimers();
    }
  });

  it("keeps a concurrent healthy lifecycle isolated", async () => {
    const [slow, healthy] = await Promise.allSettled([
      withAuthOperationDeadline(() => new Promise(() => undefined), 10),
      withAuthOperationDeadline(async () => {
        assertAuthOperationActive();
        return "healthy";
      }, 50),
    ]);
    expect(slow.status).toBe("rejected");
    expect(healthy).toEqual({ status: "fulfilled", value: "healthy" });
  });

  it("expires the lifecycle on caller abort before a late continuation", async () => {
    const controller = new AbortController();
    const dispose = vi.fn();
    let continueLate: () => void = () => undefined;
    const operation = withAuthOperationDeadline(async () => {
      registerAuthOperationResource(dispose);
      await new Promise<void>((resolve) => { continueLate = resolve; });
      assertAuthOperationActive();
    }, 50, controller.signal).catch((error) => error);
    await Promise.resolve();
    controller.abort();
    expect(isAuthOperationTimeout(await operation)).toBe(true);
    expect(dispose).toHaveBeenCalledOnce();
    continueLate();
    await Promise.resolve();
  });

  it("does not start caller work when the signal is already or immediately aborted", async () => {
    const preAborted = new AbortController();
    preAborted.abort();
    let preStarted = 0;
    const preResult = await withAuthOperationDeadline(() => {
      preStarted += 1;
      return "unexpected";
    }, 50, preAborted.signal).catch((error) => error);

    const immediate = new AbortController();
    let immediateStarted = 0;
    const immediateResult = withAuthOperationDeadline(() => {
      immediateStarted += 1;
      return "unexpected";
    }, 50, immediate.signal).catch((error) => error);
    immediate.abort();

    expect(isAuthOperationTimeout(preResult)).toBe(true);
    expect(isAuthOperationTimeout(await immediateResult)).toBe(true);
    await Promise.resolve();
    expect({ preStarted, immediateStarted }).toEqual({
      preStarted: 0,
      immediateStarted: 0,
    });
  });

  it("shares lifecycle identity with a re-evaluated module", async () => {
    vi.resetModules();
    vi.doMock("server-only", () => ({}));
    const reloaded = await import("./auth-operation");
    const dispose = vi.fn();

    await expect(withAuthOperationDeadline(async () => {
      expect(getAuthOperationState()).toBe("active");
      expect(reloaded.getAuthOperationState()).toBe("active");
      reloaded.registerAuthOperationResource(dispose);
      reloaded.assertAuthOperationActive();
      return "shared";
    }, 50)).resolves.toBe("shared");
    expect(dispose).toHaveBeenCalledOnce();
  });

  it.each([
    "undefined-owner",
    "null-owner",
    "wrong-version",
    "global-accessor",
    "inherited-fields",
    "field-accessor",
    "owner-proxy",
    "global-proxy",
  ] as const)("contains incompatible %s bindings behind one fixed error", (mode) => {
    const marker = Object.freeze({ synthetic: true });
    let reads = 0;
    let realm: object = {};
    if (mode === "global-proxy") {
      realm = new Proxy({}, {
        getOwnPropertyDescriptor() {
          reads += 1;
          throw marker;
        },
      });
    } else if (mode === "global-accessor") {
      Object.defineProperty(realm, lifecycleOwnerKey, {
        configurable: true,
        get() {
          reads += 1;
          throw marker;
        },
      });
    } else {
      let owner: unknown;
      if (mode === "undefined-owner") owner = undefined;
      if (mode === "null-owner") owner = null;
      if (mode === "wrong-version") owner = { version: "old" };
      if (mode === "inherited-fields") {
        owner = Object.create({
          operationStorage: new AsyncLocalStorage(),
          timeoutFailures: new WeakSet(),
          version: "nqr-auth-operation-lifecycle-v1",
        });
      }
      if (mode === "field-accessor") {
        owner = Object.create(null);
        Object.defineProperties(owner as object, {
          operationStorage: {
            configurable: false,
            get() {
              reads += 1;
              throw marker;
            },
          },
          timeoutFailures: {
            configurable: false,
            value: new WeakSet(),
            writable: false,
          },
          version: {
            configurable: false,
            value: "nqr-auth-operation-lifecycle-v1",
            writable: false,
          },
        });
      }
      if (mode === "owner-proxy") {
        owner = new Proxy({}, {
          getOwnPropertyDescriptor() {
            reads += 1;
            throw marker;
          },
        });
      }
      Object.defineProperty(realm, lifecycleOwnerKey, {
        configurable: false,
        value: owner,
        writable: false,
      });
    }

    const bindingBefore = mode === "global-proxy"
      ? undefined
      : Object.getOwnPropertyDescriptor(realm, lifecycleOwnerKey);
    let caught: unknown;
    try {
      loadAuthOperationModule(realm);
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(Error);
    expect((caught as Error).message).toBe("NQR_AUTH_LIFECYCLE_OWNERSHIP_FAILED");
    expect(caught).not.toBe(marker);
    if (bindingBefore) {
      const bindingAfter = Object.getOwnPropertyDescriptor(realm, lifecycleOwnerKey)!;
      expect(bindingAfter.value).toBe(bindingBefore.value);
      expect(bindingAfter.get).toBe(bindingBefore.get);
      expect(bindingAfter.configurable).toBe(bindingBefore.configurable);
      expect(bindingAfter.writable).toBe(bindingBefore.writable);
    }
    if (mode === "global-accessor" || mode === "field-accessor") {
      expect(reads).toBe(0);
    }
    if (mode.endsWith("proxy")) expect(reads).toBe(1);
  });

  it("keeps compatible owner identity fields immutable across module reload", async () => {
    const realm = {};
    const first = loadAuthOperationModule(realm);
    const binding = Object.getOwnPropertyDescriptor(realm, lifecycleOwnerKey)!;
    const owner = binding.value as object;
    const storage = Object.getOwnPropertyDescriptor(owner, "operationStorage")!;
    const failures = Object.getOwnPropertyDescriptor(owner, "timeoutFailures")!;
    const version = Object.getOwnPropertyDescriptor(owner, "version")!;

    expect({
      bindingConfigurable: binding.configurable,
      bindingWritable: binding.writable,
      extensible: Object.isExtensible(owner),
      failuresConfigurable: failures.configurable,
      failuresWritable: failures.writable,
      storageConfigurable: storage.configurable,
      storageWritable: storage.writable,
      versionConfigurable: version.configurable,
      versionWritable: version.writable,
    }).toEqual({
      bindingConfigurable: false,
      bindingWritable: false,
      extensible: false,
      failuresConfigurable: false,
      failuresWritable: false,
      storageConfigurable: false,
      storageWritable: false,
      versionConfigurable: false,
      versionWritable: false,
    });
    expect(Reflect.set(owner, "operationStorage", new AsyncLocalStorage())).toBe(false);

    const second = loadAuthOperationModule(realm);
    await expect(first.withAuthOperationDeadline(async () => {
      expect(first.getAuthOperationState()).toBe("active");
      expect(second.getAuthOperationState()).toBe("active");
      return "shared";
    }, 50)).resolves.toBe("shared");
    const timeout = await first.withAuthOperationDeadline(
      () => new Promise(() => undefined),
      1,
    ).catch((error) => error);
    expect(first.isAuthOperationTimeout(timeout)).toBe(true);
    expect(second.isAuthOperationTimeout(timeout)).toBe(true);
  });
});
