import { describe, expect, it, vi } from "vitest";

const authState = vi.hoisted(() => {
  const instance = { api: { getSession: vi.fn() }, $context: Promise.resolve({}) };
  return {
    instance,
    betterAuth: vi.fn((options: unknown) => {
      void options;
      return instance;
    }),
  };
});

vi.mock("server-only", () => ({}));
vi.mock("better-auth", () => ({ betterAuth: authState.betterAuth }));
vi.mock("better-auth/adapters/drizzle", () => ({
  drizzleAdapter: vi.fn(),
}));
vi.mock("@/db", () => ({ getDb: vi.fn(() => ({})), schema: {} }));
vi.mock("@/lib/auth-config", () => ({
  readDatabaseConfiguration: vi.fn(() => ({
    url: "mysql://test:secret@localhost/nqr",
  })),
  readGoogleAuthConfiguration: vi.fn(() => ({
    baseURL: "https://nqr.orenvis.com",
    clientId: "test.apps.googleusercontent.com",
    clientSecret: "test-client-secret",
    secret: "a".repeat(32),
  })),
}));
vi.mock("@/lib/auth-policy", () => ({
  validateGoogleIdentity: vi.fn(() => true),
}));

import { getAuth } from "./auth";

type CapturedAuthOptions = {
  logger?: {
    disableColors?: boolean;
    level?: string;
    log?: (...args: unknown[]) => void;
  };
  advanced?: {
    database?: {
      generateId?: string;
      joins?: boolean;
    };
  };
  account?: {
    encryptOAuthTokens?: boolean;
    storeAccountCookie?: boolean;
    storeStateStrategy?: string;
  };
  session?: { cookieCache?: { enabled?: boolean } };
  databaseHooks?: {
    session?: {
      create?: {
        before?: (session: Record<string, unknown>) => Promise<{
          data: Record<string, unknown>;
        }>;
      };
    };
  };
};

describe("persistent Better Auth runtime", () => {
  it("uses MariaDB as the session authority and does not duplicate OAuth tokens", async () => {
    await expect(getAuth()).resolves.toBe(authState.instance);

    const options = authState.betterAuth.mock.calls[0]?.[0] as
      | CapturedAuthOptions
      | undefined;
    expect(options?.session?.cookieCache?.enabled).toBe(false);
    expect(options?.advanced?.database).toMatchObject({
      generateId: "uuid",
      joins: false,
    });
    expect(options?.account).toMatchObject({
      encryptOAuthTokens: true,
      storeAccountCookie: false,
      storeStateStrategy: "database",
    });
    expect(options?.logger).toMatchObject({
      disableColors: true,
      level: "error",
    });
    expect(options?.logger?.log).toBeTypeOf("function");

    const before = options?.databaseHooks?.session?.create?.before;
    expect(before).toBeTypeOf("function");
    await expect(
      before?.({
        id: "session-id",
        ipAddress: "203.0.113.10",
        userAgent: "test",
      }),
    ).resolves.toMatchObject({
      data: {
        id: "session-id",
        ipAddress: "",
        userAgent: "test",
      },
    });
  });

  it("does not rebuild a ready auth instance after an ordinary session failure", async () => {
    const first = await getAuth();
    authState.instance.api.getSession.mockRejectedValueOnce(Object.create(null));
    await expect(first.api.getSession()).rejects.toBeTruthy();
    expect(await getAuth()).toBe(first);
    expect(authState.betterAuth).toHaveBeenCalledOnce();
  });

});
