import { createHmac } from "node:crypto";

import { betterAuth } from "better-auth";
import { toNextJsHandler } from "better-auth/next-js";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { assertAuthOperationActive } from "./auth-operation";
import { AuthReadinessCache } from "./auth-readiness";
import { settleAuthHandler } from "./auth-route-handler";

function inertAdapter(overrides: Record<string, unknown> = {}) {
  const adapter = {
    id: "nqr076-inert",
    create: async () => null,
    findOne: async () => null,
    findMany: async () => [],
    createSchema: undefined,
    count: async () => 0,
    update: async () => null,
    updateMany: async () => 0,
    delete: async () => undefined,
    deleteMany: async () => 0,
    consumeOne: async () => null,
    incrementOne: async () => null,
    transaction: async (callback: (value: unknown) => Promise<unknown>) =>
      callback(adapter),
    ...overrides,
  };
  return adapter;
}

describe("installed Better Auth lifecycle", () => {
  it("recovers failed initialization once after cooldown with a shared attempt", async () => {
    let calls = 0;
    let fail = true;
    let now = 1_000;
    vi.spyOn(Date, "now").mockImplementation(() => now);
    try {
      const cache = new AuthReadinessCache(
        () => betterAuth({
          baseURL: "https://nqr076.invalid",
          secret: "Nqr076-Inert-Only-Not-A-Credential-0123456789",
          logger: { disabled: true },
          database: () => {
            calls += 1;
            if (fail) throw Object.create(null);
            return inertAdapter() as never;
          },
        }),
        { cooldownMs: 1_000, initializationTimeoutMs: 100 },
      );
      const first = await Promise.allSettled([cache.get(), cache.get()]);
      expect(first.every((result) => result.status === "rejected")).toBe(true);
      expect(calls).toBe(1);
      fail = false;
      await expect(cache.get()).rejects.toThrow("NQR_AUTH_OPERATION_FAILED");
      expect(calls).toBe(1);
      now += 1_000;
      const [recovered, shared] = await Promise.all([cache.get(), cache.get()]);
      expect(recovered).toBe(shared);
      expect(calls).toBe(2);
    } finally {
      vi.restoreAllMocks();
    }
  });

  it("prevents an installed delayed sign-out continuation from starting its delete", async () => {
    let releaseRead: (value: unknown) => void = () => undefined;
    let inner: Promise<Response> | undefined;
    let deletes = 0;
    const heldRead = new Promise((resolve) => { releaseRead = resolve; });
    const adapter = inertAdapter({
      findOne: async () => heldRead,
      findMany: async () => [{ id: "nqr076-session" }],
      delete: async () => {
        assertAuthOperationActive();
        deletes += 1;
      },
    });
    const secret = "Nqr076-Inert-Only-Not-A-Credential-0123456789";
    const baseURL = "https://nqr076.invalid";
    const token = "nqr076-inert-token";
    const auth = betterAuth({
      baseURL,
      secret,
      database: () => adapter as never,
      logger: { disabled: true },
      session: { cookieCache: { enabled: false } },
    });
    const context = await auth.$context;
    const signed = createHmac("sha256", secret).update(token).digest("base64");
    const request = new Request(`${baseURL}/api/auth/sign-out`, {
      method: "POST",
      headers: {
        origin: baseURL,
        cookie: `${context.authCookies.sessionToken.name}=${encodeURIComponent(`${token}.${signed}`)}`,
      },
    });
    const handler = toNextJsHandler(auth).POST;
    const response = await settleAuthHandler((current) => {
      inner = handler(current);
      return inner;
    }, request, 10);
    expect(response.status).toBe(503);
    expect(deletes).toBe(0);
    releaseRead(null);
    await inner;
    expect(deletes).toBe(0);
  });
});
