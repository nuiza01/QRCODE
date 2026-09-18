/**
 * Session lifecycle against a real MariaDB — the step that production failed on.
 *
 * The 2026-09-01 deploy reached Google, came back, and then could not read the
 * session it had just written; the repair that followed was only ever exercised
 * against fakes. This file exercises the same read path (`getRequestUser`, which
 * is what every gated page and API calls) against a real MariaDB 10.11 with the
 * real migration applied, so revocation, expiry and a tampered cookie are
 * checked where they actually run rather than where they are mocked.
 *
 * It is skipped unless `NQR_QA_DATABASE_URL` points at a disposable QA database.
 * Never point it at anything whose rows matter: this file writes and deletes.
 */
import { createHmac, randomUUID } from "node:crypto";

import { describe, expect, it, vi, beforeAll, afterAll } from "vitest";

vi.mock("server-only", () => ({}));

const databaseUrl = process.env.NQR_QA_DATABASE_URL;
const BASE_URL = "http://localhost:3000";
const SECRET = "qa-secret-not-a-production-value-0123456789abcdef";

type Loaded = {
  getRequestUser: (headers: Headers) => Promise<{ id: string } | null>;
  cookieName: string;
  db: typeof import("@/db")["getDb"] extends () => infer T ? T : never;
  schema: typeof import("@/db")["schema"];
  closeDb: () => Promise<void>;
};

let loaded: Loaded;
const userId = randomUUID();
const email = `qa-${userId}@example.invalid`;

async function load(): Promise<Loaded> {
  process.env.DATABASE_URL = databaseUrl;
  process.env.BETTER_AUTH_URL = BASE_URL;
  process.env.NEXT_PUBLIC_APP_URL = BASE_URL;
  process.env.BETTER_AUTH_SECRET = SECRET;
  // Placeholders: this file never contacts Google. They exist because the app
  // refuses to build an auth instance unless the whole provider set is present.
  process.env.GOOGLE_CLIENT_ID = "qa-client-id.apps.googleusercontent.com";
  process.env.GOOGLE_CLIENT_SECRET = "qa-client-secret";

  const [{ getRequestUser }, { getAuth }, dbModule] = await Promise.all([
    import("@/lib/request-auth"),
    import("@/lib/auth"),
    import("@/db"),
  ]);
  const context = await (await getAuth()).$context;
  return {
    getRequestUser,
    cookieName: context.authCookies.sessionToken.name,
    db: dbModule.getDb(),
    schema: dbModule.schema,
    closeDb: async () => {
      const pool = (dbModule as { closeDb?: () => Promise<void> }).closeDb;
      if (pool) await pool();
    },
  } as Loaded;
}

function cookieHeaders(token: string, name: string, signature = signed(token)): Headers {
  return new Headers({ cookie: `${name}=${encodeURIComponent(`${token}.${signature}`)}` });
}

function signed(token: string): string {
  return createHmac("sha256", SECRET).update(token).digest("base64");
}

async function insertSession(token: string, expiresAt: Date) {
  const { db, schema } = loaded;
  await db.insert(schema.session).values({
    id: randomUUID(),
    token,
    userId,
    expiresAt,
    ipAddress: null,
    userAgent: null,
  });
}

describe.skipIf(!databaseUrl)("session lifecycle on real MariaDB", () => {
  beforeAll(async () => {
    loaded = await load();
    await loaded.db.insert(loaded.schema.user).values({
      id: userId,
      name: "QA Person",
      email,
      emailVerified: true,
      image: null,
    });
  });

  afterAll(async () => {
    if (!loaded) return;
    const { db, schema, closeDb } = loaded;
    const { eq } = await import("drizzle-orm");
    await db.delete(schema.session).where(eq(schema.session.userId, userId));
    await db.delete(schema.user).where(eq(schema.user.id, userId));
    await closeDb();
  });

  it("reads back a session written the way the Google callback writes one", async () => {
    const token = randomUUID();
    await insertSession(token, new Date(Date.now() + 60_000));
    const user = await loaded.getRequestUser(cookieHeaders(token, loaded.cookieName));
    expect(user?.id).toBe(userId);
  });

  it("stops authorizing the moment the row is revoked, with no cookie cache to hide it", async () => {
    const token = randomUUID();
    await insertSession(token, new Date(Date.now() + 60_000));
    const headers = cookieHeaders(token, loaded.cookieName);
    expect((await loaded.getRequestUser(headers))?.id).toBe(userId);

    const { eq } = await import("drizzle-orm");
    await loaded.db.delete(loaded.schema.session).where(eq(loaded.schema.session.token, token));
    expect(await loaded.getRequestUser(headers)).toBeNull();
  });

  it("refuses an expired session", async () => {
    const token = randomUUID();
    await insertSession(token, new Date(Date.now() - 60_000));
    expect(await loaded.getRequestUser(cookieHeaders(token, loaded.cookieName))).toBeNull();
  });

  it("refuses a cookie whose signature was not made with this secret", async () => {
    const token = randomUUID();
    await insertSession(token, new Date(Date.now() + 60_000));
    const forged = createHmac("sha256", "another-secret").update(token).digest("base64");
    expect(await loaded.getRequestUser(cookieHeaders(token, loaded.cookieName, forged))).toBeNull();
  });

  it("refuses a token that no row backs", async () => {
    const token = randomUUID();
    expect(await loaded.getRequestUser(cookieHeaders(token, loaded.cookieName))).toBeNull();
  });
});
