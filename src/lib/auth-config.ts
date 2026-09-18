const GOOGLE_CLIENT_ID_SUFFIX = ".apps.googleusercontent.com";

export type AuthEnvironment = Partial<
  Pick<
    NodeJS.ProcessEnv,
    | "BETTER_AUTH_SECRET"
    | "BETTER_AUTH_URL"
    | "DATABASE_URL"
    | "GOOGLE_CLIENT_ID"
    | "GOOGLE_CLIENT_SECRET"
    | "NEXT_PUBLIC_APP_URL"
    | "NODE_ENV"
  >
>;

export type GoogleAuthConfiguration = {
  baseURL: string;
  clientId: string;
  clientSecret: string;
  secret: string;
};

export type DatabaseConfiguration = { url: string };

function parseAuthOrigin(value: string | undefined, production: boolean): string | null {
  if (!value) return null;

  try {
    const url = new URL(value);
    if (url.username || url.password || url.search || url.hash) return null;
    if (url.pathname !== "/") return null;
    if (production && url.protocol !== "https:") return null;
    if (!production && !["http:", "https:"].includes(url.protocol)) return null;
    return url.origin;
  } catch {
    return null;
  }
}

/**
 * Returns a complete Google-auth configuration or `null`.
 *
 * Keeping this as an all-or-nothing gate prevents a release from advertising
 * a sign-in button backed by a half-configured OAuth endpoint. Secret values
 * never cross this server-side boundary.
 */
export function readGoogleAuthConfiguration(
  env: AuthEnvironment,
): GoogleAuthConfiguration | null {
  const production = env.NODE_ENV === "production";
  const baseURL = parseAuthOrigin(
    env.BETTER_AUTH_URL ?? env.NEXT_PUBLIC_APP_URL,
    production,
  );
  const secret = env.BETTER_AUTH_SECRET;
  const clientId = env.GOOGLE_CLIENT_ID;
  const clientSecret = env.GOOGLE_CLIENT_SECRET;

  if (
    !baseURL ||
    !secret ||
    secret.length < 32 ||
    !clientId ||
    !clientId.endsWith(GOOGLE_CLIENT_ID_SUFFIX) ||
    !clientSecret ||
    clientSecret.length < 8
  ) {
    return null;
  }

  return { baseURL, clientId, clientSecret, secret };
}

export function isGoogleAuthConfigured(env: AuthEnvironment): boolean {
  return readGoogleAuthConfiguration(env) !== null;
}

/**
 * Validate the MariaDB DSN without exposing its components. Plesk credentials
 * may contain reserved characters, so URL parsing is the single source of
 * truth and callers only receive the original opaque value.
 */
export function readDatabaseConfiguration(
  env: AuthEnvironment,
): DatabaseConfiguration | null {
  if (!env.DATABASE_URL) return null;

  try {
    const url = new URL(env.DATABASE_URL);
    if (
      url.protocol !== "mysql:" ||
      !url.username ||
      !url.password ||
      !url.hostname ||
      url.pathname.length <= 1 ||
      url.hash
    ) {
      return null;
    }
    return { url: env.DATABASE_URL };
  } catch {
    return null;
  }
}

export function isAccountAuthConfigured(env: AuthEnvironment): boolean {
  return (
    readGoogleAuthConfiguration(env) !== null &&
    readDatabaseConfiguration(env) !== null
  );
}
