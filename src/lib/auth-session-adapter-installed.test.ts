import { createAdapterFactory } from "@better-auth/core/db/adapter";
import { createHmac } from "node:crypto";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { createInternalAdapter } from "better-auth/db";
import { drizzle } from "drizzle-orm/mysql2";
import { describe, expect, it, vi } from "vitest";

import * as schema from "@/db/schema";

vi.mock("server-only", () => ({}));

import {
  SESSION_ADAPTER_FAILURE_CODES,
  createMariaDbSessionAdapter,
  logSafeAuthFailure,
  readSessionAdapterFailureCode,
} from "./auth-session-adapter";

const options = {
  advanced: { database: { joins: false, generateId: "uuid" as const } },
};

const now = new Date("2026-09-01T00:00:00.000Z");
const validSession = {
  id: "session-id",
  token: "session-token",
  userId: "user-id",
  expiresAt: new Date("2026-09-02T00:00:00.000Z"),
  createdAt: now,
  updatedAt: now,
  ipAddress: null,
  userAgent: null,
};
const validUser = {
  id: "user-id",
  name: "Test User",
  email: "owner@example.test",
  emailVerified: true,
  image: null,
  createdAt: now,
  updatedAt: now,
};

function hostile(marker: string) {
  const events: string[] = [];
  const value = new Proxy(Object.create(null), {
    get(_target, property) {
      events.push(`get:${String(property)}`);
      throw new Error(marker);
    },
    getOwnPropertyDescriptor(_target, property) {
      events.push(`descriptor:${String(property)}`);
      throw new Error(marker);
    },
    getPrototypeOf() {
      events.push("prototype");
      throw new Error(marker);
    },
    has(_target, property) {
      events.push(`has:${String(property)}`);
      throw new Error(marker);
    },
    ownKeys() {
      events.push("keys");
      throw new Error(marker);
    },
  });
  return { events, value };
}

function directDb(read: (table: unknown) => unknown) {
  return {
    select: () => ({
      from: (table: unknown) => ({
        where: () => ({
          limit: async () => [await read(table)],
        }),
      }),
    }),
  };
}

function installedFactory(findOne: (query: { model: string }) => unknown) {
  return createAdapterFactory({
    adapter: () => ({
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
      count: vi.fn(),
      findMany: vi.fn(),
      findOne: findOne as never,
    }) as never,
    config: {
      adapterId: "nqr061-installed-chain",
      adapterName: "nqr061-installed-chain",
      supportsBooleans: true,
      supportsDates: true,
      supportsUUIDs: true,
    },
  });
}

function internal(factory: ReturnType<typeof createAdapterFactory>, db: unknown) {
  const adapter = createMariaDbSessionAdapter(factory as never, db as never)(
    options as never,
  );
  return createInternalAdapter(adapter, {
    generateId: () => "generated-id",
    hooks: [],
    logger: { debug: vi.fn(), error: vi.fn(), info: vi.fn(), warn: vi.fn() },
    options,
  } as never);
}

function actualDrizzle(query: () => Promise<unknown>) {
  const client = { query: vi.fn(query) };
  const db = drizzle({
    client: client as never,
    mode: "default",
    schema,
  });
  const factory = drizzleAdapter(db, {
    provider: "mysql",
    schema,
    transaction: true,
  });
  return { client, db, factory };
}

function signedSessionCookie(cookieName: string, token: string, secret: string) {
  const signature = createHmac("sha256", secret).update(token).digest("base64");
  return `${cookieName}=${encodeURIComponent(`${token}.${signature}`)}`;
}

const sessionDriverRow = [
  "session-id",
  "2026-09-02 00:00:00.000",
  "session-token",
  "2026-09-01 00:00:00.000",
  "2026-09-01 00:00:00.000",
  null,
  null,
  "user-id",
];
const userDriverRow = [
  "user-id",
  "Test User",
  "owner@example.test",
  1,
  null,
  "2026-09-01 00:00:00.000",
  "2026-09-01 00:00:00.000",
];

describe("installed Better Auth session chain", () => {
  it("uses the pinned Drizzle mysql2 select path without relational lookup", async () => {
    let call = 0;
    const state = actualDrizzle(async () => {
      const rows = call++ === 0 ? [sessionDriverRow] : [userDriverRow];
      return [rows, []];
    });
    const relationalSession = vi
      .spyOn(state.db.query.session, "findFirst")
      .mockRejectedValue(new Error("relational query must not run"));
    const relationalUser = vi
      .spyOn(state.db.query.user, "findFirst")
      .mockRejectedValue(new Error("relational query must not run"));
    const sessionAdapter = internal(state.factory as never, state.db);

    await expect(sessionAdapter.findSession("session-token")).resolves.toMatchObject({
      session: { id: "session-id", token: "session-token", userId: "user-id" },
      user: { email: "owner@example.test", id: "user-id" },
    });
    expect(state.client.query).toHaveBeenCalledTimes(2);
    expect(relationalSession).not.toHaveBeenCalled();
    expect(relationalUser).not.toHaveBeenCalled();
  });

  it.each(["session", "user"] as const)(
    "contains a hostile mysql2 %s rejection before Better Auth tracing",
    async (stage) => {
      const thrown = hostile(`private-mysql2-${stage}`);
      let call = 0;
      const state = actualDrizzle(async () => {
        call += 1;
        if (stage === "session" || call === 2) throw thrown.value;
        return [[sessionDriverRow], []];
      });
      const sessionAdapter = internal(state.factory as never, state.db);

      const failure = await sessionAdapter
        .findSession("session-token")
        .catch((error) => error);
      expect(readSessionAdapterFailureCode(failure)).toBe(
        stage === "session"
          ? SESSION_ADAPTER_FAILURE_CODES.SESSION_READ
          : SESSION_ADAPTER_FAILURE_CODES.USER_READ,
      );
      expect(thrown.events).toEqual([]);
    },
  );

  it("contains session/user rejections before the installed factory tracer", async () => {
    for (const stage of ["session", "user"] as const) {
      const thrown = hostile(`private-${stage}-error`);
      let reads = 0;
      const db = directDb(() => {
        reads += 1;
        if (stage === "session" || reads === 2) throw thrown.value;
        return validSession;
      });
      const lowLevel = vi.fn(() => {
        throw thrown.value;
      });
      const sessionAdapter = internal(installedFactory(lowLevel), db);

      const failure = await sessionAdapter
        .findSession("session-token")
        .catch((error) => error);
      expect(readSessionAdapterFailureCode(failure)).toBe(
        stage === "session"
          ? SESSION_ADAPTER_FAILURE_CODES.SESSION_READ
          : SESSION_ADAPTER_FAILURE_CODES.USER_READ,
      );
      expect(thrown.events).toEqual([]);
      expect(lowLevel).not.toHaveBeenCalled();
    }
  });

  it("classifies adapter initialization without inspecting the rejection", () => {
    const thrown = hostile("private-init-error");
    const factory = () => {
      throw thrown.value;
    };

    let failure: unknown;
    try {
      createMariaDbSessionAdapter(factory as never, directDb(() => null) as never)(
        options as never,
      );
    } catch (error) {
      failure = error;
    }
    expect(readSessionAdapterFailureCode(failure)).toBe(
      SESSION_ADAPTER_FAILURE_CODES.INITIALIZATION,
    );
    expect(thrown.events).toEqual([]);
  });

  it.each([
    ["session id", { ...validSession, id: "" }, validUser, "session"],
    ["session token", { ...validSession, token: "other" }, validUser, "session"],
    ["session expiry", { ...validSession, expiresAt: new Date(NaN) }, validUser, "session"],
    ["session created", { ...validSession, createdAt: "not-a-date" }, validUser, "session"],
    ["user id", validSession, { ...validUser, id: "other-user" }, "user"],
    ["user email", validSession, { ...validUser, email: "" }, "user"],
    ["user verified", validSession, { ...validUser, emailVerified: "true" }, "user"],
    ["user updated", validSession, { ...validUser, updatedAt: new Date(NaN) }, "user"],
  ] as const)("rejects malformed transformed %s", async (_label, session, user, stage) => {
    let reads = 0;
    const sessionAdapter = internal(
      installedFactory(vi.fn()),
      directDb(() => (reads++ === 0 ? session : user)),
    );

    const failure = await sessionAdapter.findSession("session-token").catch((error) => error);
    expect(readSessionAdapterFailureCode(failure)).toBe(
      stage === "session"
        ? SESSION_ADAPTER_FAILURE_CODES.SESSION_RESULT
        : SESSION_ADAPTER_FAILURE_CODES.USER_RESULT,
    );
  });

  it.each(["session", "user"] as const)(
    "rejects an accessor-bearing %s row without invoking its getter",
    async (stage) => {
      let getterReads = 0;
      const session = { ...validSession } as Record<string, unknown>;
      const user = { ...validUser } as Record<string, unknown>;
      Object.defineProperty(stage === "session" ? session : user, "id", {
        configurable: true,
        enumerable: true,
        get() {
          getterReads += 1;
          throw new Error("private accessor marker");
        },
      });
      let reads = 0;
      const sessionAdapter = internal(
        installedFactory(vi.fn()),
        directDb(() => (reads++ === 0 ? session : user)),
      );

      const failure = await sessionAdapter
        .findSession("session-token")
        .catch((error) => error);
      expect(readSessionAdapterFailureCode(failure)).toBe(
        stage === "session"
          ? SESSION_ADAPTER_FAILURE_CODES.SESSION_RESULT
          : SESSION_ADAPTER_FAILURE_CODES.USER_RESULT,
      );
      expect(getterReads).toBe(0);
    },
  );

  it("emits one fixed event and no raw marker on the installed HTTP path", async () => {
    const marker = "NQR061_PRIVATE_DATABASE_MARKER";
    const state = actualDrizzle(async () => {
      throw new Error(marker);
    });
    const secret = "a".repeat(32);
    const auth = betterAuth({
      appName: "NQR061",
      baseURL: "http://localhost:3000",
      secret,
      database: createMariaDbSessionAdapter(state.factory, state.db),
      logger: { level: "error", log: logSafeAuthFailure },
      session: { cookieCache: { enabled: false } },
      advanced: {
        cookiePrefix: "nqr061",
        database: { generateId: "uuid", joins: false },
      },
    });
    const context = await auth.$context;
    const cookie = signedSessionCookie(
      context.authCookies.sessionToken.name,
      "session-token",
      secret,
    );
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    try {
      const response = await auth.handler(
        new Request("http://localhost:3000/api/auth/get-session", {
          headers: { cookie },
        }),
      );
      const body = await response.text();
      const emitted = consoleError.mock.calls.map((call) => call.join(" "));
      expect(response.status).toBe(500);
      expect(body).not.toContain(marker);
      expect(emitted.join(" ")).not.toContain(marker);
      expect(emitted).toEqual(["[NQR_AUTH] session_read_failed"]);
    } finally {
      consoleError.mockRestore();
    }
  });

  it("keeps expired and revoked sessions unauthenticated on the HTTP path", async () => {
    async function requestFor(session: typeof validSession | null) {
      let reads = 0;
      const database = directDb(() => {
        if (!session) return null;
        return reads++ === 0 ? session : validUser;
      });
      const secret = "b".repeat(32);
      const auth = betterAuth({
        appName: "NQR061 expiry",
        baseURL: "http://localhost:3000",
        secret,
        database: createMariaDbSessionAdapter(
          installedFactory(vi.fn()),
          database as never,
        ),
        logger: { level: "error", log: logSafeAuthFailure },
        session: { cookieCache: { enabled: false } },
        advanced: {
          cookiePrefix: "nqr061-expiry",
          database: { generateId: "uuid", joins: false },
        },
      });
      const context = await auth.$context;
      const cookie = signedSessionCookie(
        context.authCookies.sessionToken.name,
        "session-token",
        secret,
      );
      return auth.handler(
        new Request("http://localhost:3000/api/auth/get-session", {
          headers: { cookie },
        }),
      );
    }

    const expired = await requestFor({
      ...validSession,
      expiresAt: new Date("2026-08-31T00:00:00.000Z"),
    });
    expect(expired.status).toBe(200);
    expect(await expired.json()).toBeNull();

    const revoked = await requestFor(null);
    expect(revoked.status).toBe(200);
    expect(await revoked.json()).toBeNull();
  });

  it("keeps concurrent session reads isolated by account", async () => {
    function account(token: string, userId: string, email: string) {
      let reads = 0;
      const session = { ...validSession, id: `session-${userId}`, token, userId };
      const user = { ...validUser, id: userId, email };
      return internal(
        installedFactory(vi.fn()),
        directDb(() => (reads++ === 0 ? session : user)),
      );
    }
    const first = account("token-a", "user-a", "a@example.test");
    const second = account("token-b", "user-b", "b@example.test");

    const [a, b] = await Promise.all([
      first.findSession("token-a"),
      second.findSession("token-b"),
    ]);
    expect(a).toMatchObject({
      session: { token: "token-a", userId: "user-a" },
      user: { email: "a@example.test", id: "user-a" },
    });
    expect(b).toMatchObject({
      session: { token: "token-b", userId: "user-b" },
      user: { email: "b@example.test", id: "user-b" },
    });
  });

  it("accepts complete matching rows and keeps missing/orphan rows unauthenticated", async () => {
    let reads = 0;
    const success = internal(
      installedFactory(vi.fn()),
      directDb(() => (reads++ === 0 ? validSession : validUser)),
    );
    await expect(success.findSession("session-token")).resolves.toMatchObject({
      session: { id: "session-id", token: "session-token", userId: "user-id" },
      user: { id: "user-id", email: "owner@example.test" },
    });

    const missing = internal(installedFactory(vi.fn()), directDb(() => null));
    await expect(missing.findSession("missing")).resolves.toBeNull();

    let orphanReads = 0;
    const orphan = internal(
      installedFactory(vi.fn()),
      directDb(() => (orphanReads++ === 0 ? validSession : null)),
    );
    await expect(orphan.findSession("session-token")).resolves.toBeNull();
  });
});
