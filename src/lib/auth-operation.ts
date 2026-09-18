import "server-only";

import { AsyncLocalStorage } from "node:async_hooks";

/** Upper bound for one Better Auth/session operation inside a request. */
export const AUTH_OPERATION_TIMEOUT_MS = 5_000;

type OperationContext = {
  active: boolean;
  disposers: Set<() => void>;
};

type OperationLifecycleReferences = {
  operationStorage: AsyncLocalStorage<OperationContext>;
  timeoutFailures: WeakSet<object>;
};

const OPERATION_LIFECYCLE_OWNER = Symbol.for(
  "nexora.qr.auth-operation.lifecycle-owner.v1",
);

function lifecycleOwnershipFailure(): Error {
  const failure = new Error("NQR_AUTH_LIFECYCLE_OWNERSHIP_FAILED");
  failure.name = "AuthOperationFailure";
  return failure;
}

function getOperationLifecycleReferences(): OperationLifecycleReferences {
  try {
    const binding = Object.getOwnPropertyDescriptor(
      globalThis,
      OPERATION_LIFECYCLE_OWNER,
    );
    if (binding !== undefined) {
      if (
        !("value" in binding) ||
        binding.configurable ||
        binding.writable ||
        (typeof binding.value !== "object" && typeof binding.value !== "function") ||
        binding.value === null
      ) {
        throw lifecycleOwnershipFailure();
      }
      const owner = binding.value as object;
      const version = Object.getOwnPropertyDescriptor(owner, "version");
      const storage = Object.getOwnPropertyDescriptor(owner, "operationStorage");
      const failures = Object.getOwnPropertyDescriptor(owner, "timeoutFailures");
      if (
        !version || !("value" in version) || version.configurable || version.writable ||
        version.value !== "nqr-auth-operation-lifecycle-v1" ||
        !storage || !("value" in storage) || storage.configurable || storage.writable ||
        !(storage.value instanceof AsyncLocalStorage) ||
        !failures || !("value" in failures) || failures.configurable || failures.writable ||
        !(failures.value instanceof WeakSet)
      ) {
        throw lifecycleOwnershipFailure();
      }
      return {
        operationStorage: storage.value as AsyncLocalStorage<OperationContext>,
        timeoutFailures: failures.value as WeakSet<object>,
      };
    }

    const operationStorage = new AsyncLocalStorage<OperationContext>();
    const timeoutFailures = new WeakSet<object>();
    const owner = Object.create(null) as object;
    Object.defineProperties(owner, {
      operationStorage: {
        configurable: false,
        enumerable: true,
        value: operationStorage,
        writable: false,
      },
      timeoutFailures: {
        configurable: false,
        enumerable: true,
        value: timeoutFailures,
        writable: false,
      },
      version: {
        configurable: false,
        enumerable: true,
        value: "nqr-auth-operation-lifecycle-v1",
        writable: false,
      },
    });
    Object.preventExtensions(owner);
    Object.defineProperty(globalThis, OPERATION_LIFECYCLE_OWNER, {
      configurable: false,
      enumerable: false,
      value: owner,
      writable: false,
    });
    return { operationStorage, timeoutFailures };
  } catch {
    throw lifecycleOwnershipFailure();
  }
}

const { operationStorage, timeoutFailures } = getOperationLifecycleReferences();

function fixedFailure(timeout: boolean): Error {
  const failure = new Error(
    timeout ? "NQR_AUTH_OPERATION_TIMEOUT" : "NQR_AUTH_OPERATION_FAILED",
  );
  failure.name = "AuthOperationFailure";
  if (timeout) timeoutFailures.add(failure);
  return failure;
}

export function createAuthOperationFailure(): Error {
  return fixedFailure(false);
}

export function assertAuthOperationActive(): void {
  const context = operationStorage.getStore();
  if (context && !context.active) throw fixedFailure(false);
}

export function hasActiveAuthOperation(): boolean {
  return operationStorage.getStore()?.active === true;
}

export function getAuthOperationState(): "absent" | "active" | "expired" {
  const context = operationStorage.getStore();
  if (!context) return "absent";
  return context.active ? "active" : "expired";
}

export function registerAuthOperationResource(dispose: () => void): () => void {
  const context = operationStorage.getStore();
  if (!context || !context.active) {
    try { dispose(); } catch {}
    throw fixedFailure(false);
  }
  context.disposers.add(dispose);
  return () => context.disposers.delete(dispose);
}

export function isAuthOperationTimeout(value: unknown): boolean {
  return (
    (typeof value === "object" || typeof value === "function") &&
    value !== null &&
    timeoutFailures.has(value)
  );
}

/**
 * Bound one auth operation and consume late fulfillment/rejection safely.
 * Unknown database/framework failures never cross this boundary or become a
 * `cause`; the returned Error stays extensible for framework diagnostics.
 */
export async function withAuthOperationDeadline<T>(
  operation: PromiseLike<T> | (() => PromiseLike<T> | T),
  timeoutMs = AUTH_OPERATION_TIMEOUT_MS,
  abortSignal?: AbortSignal,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    let settled = false;
    const context: OperationContext = { active: true, disposers: new Set() };
    const disposeResources = () => {
      context.active = false;
      for (const dispose of context.disposers) {
        try { dispose(); } catch {}
      }
      context.disposers.clear();
    };
    const finish = (result: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      abortSignal?.removeEventListener("abort", abort);
      disposeResources();
      result();
    };
    const abort = () => finish(() => reject(fixedFailure(true)));
    const timer = setTimeout(abort, timeoutMs);
    abortSignal?.addEventListener("abort", abort, { once: true });
    if (abortSignal?.aborted) {
      abort();
      return;
    }

    const started = operationStorage.run(context, () =>
      Promise.resolve().then(() => {
        if (!context.active) throw fixedFailure(false);
        return typeof operation === "function" ? operation() : operation;
      }),
    );
    started.then(
      (value) => {
        finish(() => resolve(value));
      },
      () => {
        finish(() => reject(fixedFailure(false)));
      },
    );
  });
}
