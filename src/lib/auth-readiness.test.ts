import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { AuthReadinessCache } from "./auth-readiness";
import { assertAuthOperationActive, withAuthOperationDeadline } from "./auth-operation";

describe("auth readiness cache", () => {
  it("shares success, discards failure, and permits one retry after cooldown", async () => {
    vi.useFakeTimers();
    try {
      let attempt = 0;
      const cache = new AuthReadinessCache(
        () => {
          attempt += 1;
          return {
            id: attempt,
            $context: attempt === 1
              ? Promise.reject(Object.create(null))
              : Promise.resolve({ ready: true }),
          };
        },
        { cooldownMs: 1_000, initializationTimeoutMs: 100 },
      );
      const [first, shared] = await Promise.allSettled([cache.get(), cache.get()]);
      expect(first.status).toBe("rejected");
      expect(shared.status).toBe("rejected");
      expect(attempt).toBe(1);
      await expect(cache.get()).rejects.toThrow("NQR_AUTH_OPERATION_FAILED");
      expect(attempt).toBe(1);
      await vi.advanceTimersByTimeAsync(1_000);
      const [recovered, concurrent] = await Promise.all([cache.get(), cache.get()]);
      expect(recovered).toBe(concurrent);
      expect(recovered.id).toBe(2);
      expect(attempt).toBe(2);
      expect(await cache.get()).toBe(recovered);
    } finally {
      vi.useRealTimers();
    }
  });

  it("bounds a permanent pending initialization and does not retry in-call", async () => {
    vi.useFakeTimers();
    try {
      let attempts = 0;
      const cache = new AuthReadinessCache(
        () => ({ id: ++attempts, $context: new Promise(() => undefined) }),
        { cooldownMs: 1_000, initializationTimeoutMs: 25 },
      );
      const first = cache.get().catch((error) => error);
      await vi.advanceTimersByTimeAsync(25);
      expect((await first).message).toBe("NQR_AUTH_OPERATION_FAILED");
      expect(attempts).toBe(1);
      await expect(cache.get()).rejects.toThrow("NQR_AUTH_OPERATION_FAILED");
      expect(attempts).toBe(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it("does not let a late expired generation replace a newer ready instance", async () => {
    vi.useFakeTimers();
    try {
      let resolveOld: (value: unknown) => void = () => undefined;
      let attempts = 0;
      const oldContext = new Promise((resolve) => { resolveOld = resolve; });
      const cache = new AuthReadinessCache(
        () => {
          attempts += 1;
          return {
            id: attempts,
            $context: attempts === 1 ? oldContext : Promise.resolve({}),
          };
        },
        { cooldownMs: 1_000, initializationTimeoutMs: 25 },
      );
      const expired = cache.get().catch((error) => error);
      await vi.advanceTimersByTimeAsync(25);
      expect((await expired).message).toBe("NQR_AUTH_OPERATION_FAILED");
      await vi.advanceTimersByTimeAsync(1_000);
      const recovered = await cache.get();
      resolveOld({});
      await Promise.resolve();
      expect((await cache.get()).id).toBe(recovered.id);
      expect(recovered.id).toBe(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it("restores the enclosing request lifecycle after nested readiness", async () => {
    const cache = new AuthReadinessCache(
      () => ({ $context: Promise.resolve({}), id: "ready" }),
      { cooldownMs: 1_000, initializationTimeoutMs: 25 },
    );
    await expect(withAuthOperationDeadline(async () => {
      const auth = await cache.get();
      assertAuthOperationActive();
      return auth.id;
    }, 50)).resolves.toBe("ready");
  });
});
