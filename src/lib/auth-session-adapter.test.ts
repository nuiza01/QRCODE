import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  SESSION_ADAPTER_FAILURE_CODES,
  createMariaDbSessionAdapter,
  logSafeAuthFailure,
  readSessionAdapterFailureCode,
} from "./auth-session-adapter";
import { withAuthOperationDeadline } from "./auth-operation";

type FindOneQuery = {
  model: string;
  where: Array<{ field: string; value: string }>;
  select?: string[];
  join?: Record<string, boolean>;
};

function createAdapter(findOne: ReturnType<typeof vi.fn>) {
  const deleteOne = vi.fn(async () => undefined);
  const adapter = { id: "test-adapter", findOne, delete: deleteOne };
  const factory = vi.fn(() => adapter);
  const read = findOne as unknown as (
    query: Record<string, unknown>,
  ) => Promise<unknown>;
  const dbReads: string[] = [];
  const database = {
    select: () => ({
      from: () => ({
        where: () => ({
          limit: async () => {
            const model = dbReads.length === 0 ? "session" : "user";
            dbReads.push(model);
            const value = await read({ model });
            return value === null ? [] : [value];
          },
        }),
      }),
    }),
  };
  return {
    adapter,
    dbReads,
    factory,
    deleteOne,
    wrapped: createMariaDbSessionAdapter(factory as never, database as never)(
      {} as never,
    ) as {
      findOne<T>(query: FindOneQuery): Promise<T | null>;
      delete(query: { model: string; where: FindOneQuery["where"] }): Promise<void>;
    },
  };
}

const sessionLookup: FindOneQuery = {
  model: "session",
  where: [{ field: "token", value: "private-session-token" }],
  join: { user: true },
};

const now = new Date("2026-09-01T00:00:00.000Z");
const sessionRow = {
  createdAt: now,
  expiresAt: new Date("2026-09-02T00:00:00.000Z"),
  id: "session-id",
  ipAddress: null,
  token: "private-session-token",
  updatedAt: now,
  userAgent: null,
  userId: "user-id",
};
const userRow = {
  createdAt: now,
  email: "owner@example.com",
  emailVerified: true,
  id: "user-id",
  image: null,
  name: "Owner",
  updatedAt: now,
};

describe("MariaDB Better Auth session adapter boundary", () => {
  it("keeps the supported get-session lookup on two portable reads", async () => {
    const state = createAdapter(
      vi
        .fn()
        .mockResolvedValueOnce(sessionRow)
        .mockResolvedValueOnce(userRow),
    );

    await expect(state.wrapped.findOne(sessionLookup)).resolves.toEqual({
      createdAt: now,
      expiresAt: new Date("2026-09-02T00:00:00.000Z"),
      id: "session-id",
      ipAddress: null,
      token: "private-session-token",
      updatedAt: now,
      userAgent: null,
      userId: "user-id",
      user: userRow,
    });
    expect(state.dbReads).toEqual(["session", "user"]);
  });

  it.each([
    ["session read", 1, SESSION_ADAPTER_FAILURE_CODES.SESSION_READ],
    ["user read", 2, SESSION_ADAPTER_FAILURE_CODES.USER_READ],
  ] as const)(
    "classifies a %s failure without retaining or inspecting the raw error",
    async (_label, failureCall, expectedCode) => {
      let inspected = 0;
      const hostile = new Proxy(Object.create(null), {
        get() {
          inspected += 1;
          throw new Error("must not inspect raw database error");
        },
        getOwnPropertyDescriptor() {
          inspected += 1;
          throw new Error("must not inspect raw database error");
        },
        ownKeys() {
          inspected += 1;
          throw new Error("must not inspect raw database error");
        },
        getPrototypeOf() {
          inspected += 1;
          throw new Error("must not inspect raw database error");
        },
      });
      const findOne = vi.fn();
      if (failureCall === 1) findOne.mockRejectedValueOnce(hostile);
      else {
        findOne
          .mockResolvedValueOnce(sessionRow)
          .mockRejectedValueOnce(hostile);
      }
      const state = createAdapter(findOne);

      const failure = await state.wrapped.findOne(sessionLookup).catch((error) => error);
      expect(readSessionAdapterFailureCode(failure)).toBe(expectedCode);
      expect(inspected).toBe(0);
      expect(failure).not.toHaveProperty("cause");
      expect(Object.getOwnPropertyDescriptor(failure, "code")).toBeUndefined();
      expect(() => Object.assign(failure as object, { code: "framework-diagnostic" })).not.toThrow();
      expect(readSessionAdapterFailureCode(failure)).toBe(expectedCode);
      expect(JSON.stringify(failure)).not.toContain("private-session-token");
    },
  );

  it("fails closed with a fixed category for an unusable session result", async () => {
    const state = createAdapter(vi.fn().mockResolvedValueOnce({ id: "session-id" }));

    const failure = await state.wrapped.findOne(sessionLookup).catch((error) => error);
    expect(readSessionAdapterFailureCode(failure)).toBe(
      SESSION_ADAPTER_FAILURE_CODES.SESSION_RESULT,
    );
    expect(state.dbReads).toEqual(["session"]);
  });

  it("preserves null/orphan fail-closed behavior and delegates unrelated reads", async () => {
    const missing = createAdapter(vi.fn().mockResolvedValueOnce(null));
    await expect(missing.wrapped.findOne(sessionLookup)).resolves.toBeNull();

    const orphan = createAdapter(
      vi
        .fn()
        .mockResolvedValueOnce({ ...sessionRow, userId: "missing-user" })
        .mockResolvedValueOnce(null),
    );
    await expect(orphan.wrapped.findOne(sessionLookup)).resolves.toBeNull();

    const unrelatedQuery: FindOneQuery = {
      model: "user",
      where: [{ field: "email", value: "owner@example.com" }],
    };
    const unrelated = createAdapter(
      vi.fn().mockResolvedValueOnce({ id: "user-id", email: "owner@example.com" }),
    );
    await expect(unrelated.wrapped.findOne(unrelatedQuery)).resolves.toMatchObject({
      id: "user-id",
    });
    expect(unrelated.adapter.findOne).toHaveBeenCalledWith(unrelatedQuery);
  });

  it("logs only a bounded fixed category and never touches hostile values", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const state = createAdapter(vi.fn().mockRejectedValueOnce(new Error("private sql")));

    return state.wrapped.findOne(sessionLookup).catch((failure) => {
      let inspected = 0;
      const hostile = new Proxy(Object.create(null), {
        get() {
          inspected += 1;
          throw new Error("must not inspect logger argument");
        },
        getPrototypeOf() {
          inspected += 1;
          throw new Error("must not inspect logger argument");
        },
      });

      logSafeAuthFailure("error", "INTERNAL_SERVER_ERROR", failure, hostile);
      expect(consoleError).toHaveBeenCalledWith(
        `[NQR_AUTH] ${SESSION_ADAPTER_FAILURE_CODES.SESSION_READ}`,
      );
      expect(inspected).toBe(0);
      expect(consoleError.mock.calls.flat().join(" ")).not.toContain("private sql");
    });
  });

  it("prevents a controlled adapter mutation from starting after expiry", async () => {
    let continueLate: () => void = () => undefined;
    const held = new Promise<void>((resolve) => { continueLate = resolve; });
    const state = createAdapter(vi.fn());
    const result = withAuthOperationDeadline(async () => {
      await held;
      return state.wrapped.delete({
        model: "session",
        where: [{ field: "token", value: "private-session-token" }],
      });
    }, 10).catch((error) => error);
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect((await result).message).toBe("NQR_AUTH_OPERATION_TIMEOUT");
    continueLate();
    await Promise.resolve();
    expect(state.deleteOne).not.toHaveBeenCalled();
  });
});
