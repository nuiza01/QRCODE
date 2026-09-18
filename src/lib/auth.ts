import "server-only";

import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

import { getDb, schema } from "@/db";
import {
  readDatabaseConfiguration,
  readGoogleAuthConfiguration,
} from "@/lib/auth-config";
import { validateGoogleIdentity } from "@/lib/auth-policy";
import {
  createMariaDbSessionAdapter,
  logSafeAuthFailure,
} from "@/lib/auth-session-adapter";
import { AuthReadinessCache } from "@/lib/auth-readiness";
import { defaultLocale } from "@/i18n/config";

function buildAuth() {
  const config = readGoogleAuthConfiguration(process.env);
  const database = readDatabaseConfiguration(process.env);
  if (!config || !database) {
    throw new Error("Persistent Google authentication is not configured");
  }
  const db = getDb();

  return betterAuth({
    appName: "Nexora QR",
    baseURL: config.baseURL,
    secret: config.secret,
    trustedOrigins: [config.baseURL],
    database: createMariaDbSessionAdapter(
      drizzleAdapter(db, {
        provider: "mysql",
        schema,
        transaction: true,
      }),
      db,
    ),
    logger: {
      disableColors: true,
      level: "error",
      log: logSafeAuthFailure,
    },
    socialProviders: {
      google: {
        clientId: config.clientId,
        clientSecret: config.clientSecret,
        prompt: "select_account",
      },
    },
    user: {
      validateUserInfo: ({ user, source }) =>
        validateGoogleIdentity({ user, source }),
    },
    session: {
      expiresIn: 7 * 24 * 60 * 60,
      // A revoked database session must stop authorizing requests immediately.
      // Keep the signed token cookie, but never treat a user snapshot cookie as
      // an authorization source.
      cookieCache: { enabled: false },
    },
    account: {
      identityStrategy: "provider-id",
      encryptOAuthTokens: true,
      // The account is durable in MariaDB. Duplicating provider tokens into a
      // browser cookie only enlarges the exposed credential surface.
      storeAccountCookie: false,
      storeStateStrategy: "database",
    },
    databaseHooks: {
      session: {
        create: {
          // Better Auth uses the IP independently for its short-lived in-memory
          // rate limiter. Do not persist that raw address with the session.
          async before(session) {
            return { data: { ...session, ipAddress: "" } };
          },
        },
      },
    },
    // A sign-in that fails before our callback runs (an expired state cookie,
    // a cancelled consent screen) would otherwise land on Better Auth's own
    // page: English, unbranded, and with no way back into the site. Since
    // creating a QR code requires an account, that page is a dead end for the
    // person who most needs a way forward.
    onAPIError: {
      errorURL: `/${defaultLocale}/signin-error`,
    },
    advanced: {
      cookiePrefix: "nqr",
      useSecureCookies: config.baseURL.startsWith("https://"),
      database: {
        generateId: "uuid",
        // HostAtom runs MariaDB 10.11. Keep Better Auth on its documented
        // separate-query fallback: Drizzle's native relational query emits a
        // LEFT JOIN LATERAL statement that is not portable to this runtime.
        joins: false,
      },
    },
  });
}

type AuthInstance = ReturnType<typeof buildAuth>;
const authReadiness = new AuthReadinessCache(buildAuth, {
  cooldownMs: 1_000,
  initializationTimeoutMs: 4_000,
});

export function getAuth(): Promise<AuthInstance> {
  return authReadiness.get();
}
