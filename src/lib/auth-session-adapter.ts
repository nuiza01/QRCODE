import "server-only";

import type { DBAdapter, DBAdapterInstance } from "better-auth";
import { eq } from "drizzle-orm";
import type { MySql2Database } from "drizzle-orm/mysql2";

import * as databaseSchema from "@/db/schema";
import { assertAuthOperationActive } from "@/lib/auth-operation";

export const SESSION_ADAPTER_FAILURE_CODES = {
  SESSION_READ: "session_read_failed",
  SESSION_RESULT: "session_result_invalid",
  USER_READ: "user_read_failed",
  USER_RESULT: "user_result_invalid",
  INITIALIZATION: "adapter_initialization_failed",
  INTERNAL: "auth_internal_error",
} as const;

export type SessionAdapterFailureCode =
  (typeof SESSION_ADAPTER_FAILURE_CODES)[keyof typeof SESSION_ADAPTER_FAILURE_CODES];

const failureCodes = new WeakMap<object, SessionAdapterFailureCode>();

class SessionAdapterFailure extends Error {
  constructor(code: SessionAdapterFailureCode) {
    super("NQR_AUTH_SESSION_ADAPTER_FAILURE");
    this.name = "SessionAdapterFailure";
    // Keep the classification private. A non-writable public `code` collides
    // with framework error reporters that annotate Errors in strict mode.
    failureCodes.set(this, code);
  }
}

export function readSessionAdapterFailureCode(
  value: unknown,
): SessionAdapterFailureCode | null {
  if ((typeof value !== "object" && typeof value !== "function") || value === null) {
    return null;
  }
  return failureCodes.get(value) ?? null;
}

function adapterFailure(code: SessionAdapterFailureCode): SessionAdapterFailure {
  return new SessionAdapterFailure(code);
}

function isSessionUserLookup(query: Parameters<DBAdapter["findOne"]>[0]): boolean {
  if (query.model !== "session" || query.select !== undefined || !query.join) {
    return false;
  }
  const joins = Object.keys(query.join);
  return joins.length === 1 && joins[0] === "user" && query.join.user === true;
}

const invalidField = Symbol("invalid-auth-field");

function readOwnDataField(record: unknown, field: string): unknown | typeof invalidField {
  if (typeof record !== "object" || record === null || Array.isArray(record)) {
    return invalidField;
  }
  const descriptor = Object.getOwnPropertyDescriptor(record, field);
  return descriptor && "value" in descriptor ? descriptor.value : invalidField;
}

function readRequiredString(record: unknown, field: string): string | null {
  const value = readOwnDataField(record, field);
  return typeof value === "string" && value.length > 0 ? value : null;
}

function readRequiredDate(record: unknown, field: string): Date | null {
  const value = readOwnDataField(record, field);
  if (value === invalidField) return null;
  try {
    const time = Date.prototype.getTime.call(value);
    return Number.isFinite(time) ? new Date(time) : null;
  } catch {
    return null;
  }
}

function readOptionalString(record: unknown, field: string): string | null | undefined {
  const value = readOwnDataField(record, field);
  if (value === invalidField || value === undefined) return undefined;
  return value === null || typeof value === "string" ? value : undefined;
}

function normalizeSessionResult(record: unknown, token: string) {
  const id = readRequiredString(record, "id");
  const storedToken = readRequiredString(record, "token");
  const userId = readRequiredString(record, "userId");
  const expiresAt = readRequiredDate(record, "expiresAt");
  const createdAt = readRequiredDate(record, "createdAt");
  const updatedAt = readRequiredDate(record, "updatedAt");
  const ipAddress = readOptionalString(record, "ipAddress");
  const userAgent = readOptionalString(record, "userAgent");
  if (
    !id ||
    storedToken !== token ||
    !userId ||
    !expiresAt ||
    !createdAt ||
    !updatedAt ||
    ipAddress === undefined ||
    userAgent === undefined
  ) {
    return null;
  }
  return {
    createdAt,
    expiresAt,
    id,
    ipAddress,
    token: storedToken,
    updatedAt,
    userAgent,
    userId,
  };
}

function normalizeUserResult(record: unknown, expectedId: string) {
  const id = readRequiredString(record, "id");
  const name = readOwnDataField(record, "name");
  const email = readRequiredString(record, "email");
  const emailVerified = readOwnDataField(record, "emailVerified");
  const image = readOptionalString(record, "image");
  const createdAt = readRequiredDate(record, "createdAt");
  const updatedAt = readRequiredDate(record, "updatedAt");
  if (
    id !== expectedId ||
    typeof name !== "string" ||
    !email ||
    typeof emailVerified !== "boolean" ||
    image === undefined ||
    !createdAt ||
    !updatedAt
  ) {
    return null;
  }
  return { createdAt, email, emailVerified, id, image, name, updatedAt };
}

function readLookupToken(query: Parameters<DBAdapter["findOne"]>[0]): string | null {
  if (query.where.length !== 1) return null;
  const predicate = query.where[0];
  if (
    predicate.field !== "token" ||
    (predicate.operator !== undefined && predicate.operator !== "eq") ||
    typeof predicate.value !== "string" ||
    predicate.value.length === 0
  ) {
    return null;
  }
  return predicate.value;
}

/**
 * Better Auth's `get-session` contract asks the adapter for
 * `session + user`. Keep that one documented lookup on two ordinary reads so
 * MariaDB never receives Drizzle's relational join SQL. Every failure is
 * replaced at this boundary with a fixed, non-secret category and no cause.
 */
export function createMariaDbSessionAdapter(
  drizzle: DBAdapterInstance,
  database: MySql2Database<typeof databaseSchema>,
): DBAdapterInstance {
  return (options) => {
    let adapter: DBAdapter;
    try {
      adapter = drizzle(options);
    } catch {
      throw adapterFailure(SESSION_ADAPTER_FAILURE_CODES.INITIALIZATION);
    }
    const findOne: DBAdapter["findOne"] = async <T>(query: Parameters<DBAdapter["findOne"]>[0]) => {
      assertAuthOperationActive();
      if (!isSessionUserLookup(query)) return adapter.findOne<T>(query);

      const token = readLookupToken(query);
      if (!token) throw adapterFailure(SESSION_ADAPTER_FAILURE_CODES.SESSION_RESULT);

      let rawSession: unknown;
      try {
        rawSession = (
          await database
            .select()
            .from(databaseSchema.session)
            .where(eq(databaseSchema.session.token, token))
            .limit(1)
        )[0] ?? null;
      } catch {
        throw adapterFailure(SESSION_ADAPTER_FAILURE_CODES.SESSION_READ);
      }
      if (!rawSession) return null;

      let session: ReturnType<typeof normalizeSessionResult>;
      try {
        session = normalizeSessionResult(rawSession, token);
      } catch {
        throw adapterFailure(SESSION_ADAPTER_FAILURE_CODES.SESSION_RESULT);
      }
      if (!session) {
        throw adapterFailure(SESSION_ADAPTER_FAILURE_CODES.SESSION_RESULT);
      }

      assertAuthOperationActive();
      let rawUser: unknown;
      try {
        rawUser = (
          await database
            .select()
            .from(databaseSchema.user)
            .where(eq(databaseSchema.user.id, session.userId))
            .limit(1)
        )[0] ?? null;
      } catch {
        throw adapterFailure(SESSION_ADAPTER_FAILURE_CODES.USER_READ);
      }
      if (!rawUser) return null;

      let user: ReturnType<typeof normalizeUserResult>;
      try {
        user = normalizeUserResult(rawUser, session.userId);
        if (!user) throw adapterFailure(SESSION_ADAPTER_FAILURE_CODES.USER_RESULT);
        return { ...session, user } as T;
      } catch {
        throw adapterFailure(SESSION_ADAPTER_FAILURE_CODES.USER_RESULT);
      }
    };

    return {
      ...adapter,
      create: (data) => {
        assertAuthOperationActive();
        return adapter.create(data);
      },
      findOne,
      findMany: (data) => {
        assertAuthOperationActive();
        return adapter.findMany(data);
      },
      count: (data) => {
        assertAuthOperationActive();
        return adapter.count(data);
      },
      update: (data) => {
        assertAuthOperationActive();
        return adapter.update(data);
      },
      updateMany: (data) => {
        assertAuthOperationActive();
        return adapter.updateMany(data);
      },
      delete: (data) => {
        assertAuthOperationActive();
        return adapter.delete(data);
      },
      deleteMany: (data) => {
        assertAuthOperationActive();
        return adapter.deleteMany(data);
      },
      consumeOne: (data) => {
        assertAuthOperationActive();
        return adapter.consumeOne(data);
      },
      incrementOne: (data) => {
        assertAuthOperationActive();
        return adapter.incrementOne(data);
      },
      transaction: (callback) => {
        assertAuthOperationActive();
        return adapter.transaction(callback);
      },
    };
  };
}

/**
 * Better Auth calls its logger once with the original adapter failure and then
 * again with a generic API error. Emit only a fixed internal category. Raw
 * arguments are never coerced, enumerated, retained or forwarded.
 */
export function logSafeAuthFailure(
  level: "debug" | "info" | "warn" | "error",
  _message: string,
  ...values: unknown[]
): void {
  if (level !== "error") return;
  let code: SessionAdapterFailureCode | null = null;
  for (const value of values) {
    code = readSessionAdapterFailureCode(value);
    if (code) break;
  }
  console.error(`[NQR_AUTH] ${code ?? SESSION_ADAPTER_FAILURE_CODES.INTERNAL}`);
}
