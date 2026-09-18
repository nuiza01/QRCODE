import { defaultLocale, locales, type Locale } from "@/i18n/config";

/**
 * Absolute-URL construction for every SEO surface.
 *
 * The production domain does not exist yet (`PLAN.md` §4, Phase 0 open item),
 * so nothing here may hardcode one. Every absolute URL is derived from
 * `NEXT_PUBLIC_APP_URL`, and when a domain is finally registered exactly one
 * environment variable changes.
 *
 * Two properties this module has to preserve:
 *
 *  1. **Lazy, like `src/lib/env.ts`.** `next build` imports every module to
 *     collect route metadata; a top-level parse that threw would make the build
 *     depend on environment that CI has no reason to hold. Resolution happens
 *     inside the call, and a missing value degrades to localhost rather than
 *     failing the build.
 *  2. **Client-safe.** `src/lib/env.ts` imports `server-only` and requires
 *     `DATABASE_URL`; importing it here would both drag a database requirement
 *     into `next build` and make this module unusable from the generator's
 *     client components. `NEXT_PUBLIC_` values are inlined by the bundler, so
 *     the literal `process.env.NEXT_PUBLIC_APP_URL` access below is the only
 *     form that survives into the browser — do not destructure it.
 *
 * Validation is `new URL()` rather than zod: the question is not merely "is
 * this a string" but "does this parse as an absolute origin", and `URL` both
 * answers that and normalizes the result.
 *
 * ## Resolution order
 *
 *   1. `NEXT_PUBLIC_APP_URL` — the explicit setting, always wins.
 *   2. `VERCEL_PROJECT_PRODUCTION_URL` — set by the platform, a bare hostname
 *      with no scheme, so it is prefixed with `https://`. This exists so
 *      preview deployments are self-configuring instead of silently emitting
 *      localhost canonicals. It is read from the environment like the first,
 *      not written down, so it is still not a hardcoded domain.
 *   3. `http://localhost:3000` — local development only.
 */

/** Used only when neither environment variable is set, i.e. local development. */
const DEV_FALLBACK_ORIGIN = "http://localhost:3000";

/** Memoized on the raw env values so tests can vary them without a reset hook. */
let cache: { key: string; origin: string } | null = null;

/**
 * Parses a candidate into an origin, or returns `null` if it is unusable.
 * `defaultScheme` covers `VERCEL_PROJECT_PRODUCTION_URL`, which is a bare
 * hostname — `new URL("my-app.vercel.app")` throws without it.
 */
function toOrigin(
  raw: string | undefined,
  varName: string,
  defaultScheme?: "https",
): string | null {
  const trimmed = raw?.trim();
  if (!trimmed) return null;

  const candidate =
    defaultScheme && !/^https?:\/\//i.test(trimmed)
      ? `${defaultScheme}://${trimmed}`
      : trimmed;

  try {
    // `.origin` drops any path, query or trailing slash someone pasted in.
    return new URL(candidate).origin;
  } catch {
    // A malformed value is a configuration mistake, not a reason to fail the
    // build of a site whose pages are otherwise fine. Fall back loudly without
    // logging raw values or parser errors, which may contain sensitive data.
    console.warn(`[seo] ${varName}: invalid_absolute_url; ignoring it.`);
    return null;
  }
}

/**
 * The site origin, with no trailing slash. Falls back to localhost so a build
 * without configuration still succeeds — see `hasConfiguredOrigin()` for the
 * check a deploy pipeline should make.
 */
export function siteOrigin(): string {
  // Read as literals, never destructured: that is what lets the bundler inline
  // the NEXT_PUBLIC_ value into the client bundle.
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  const vercelUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL;

  const key = `${appUrl ?? ""}\u0000${vercelUrl ?? ""}`;
  if (cache && cache.key === key) return cache.origin;

  const origin =
    toOrigin(appUrl, "NEXT_PUBLIC_APP_URL") ??
    toOrigin(vercelUrl, "VERCEL_PROJECT_PRODUCTION_URL", "https") ??
    DEV_FALLBACK_ORIGIN;

  cache = { key, origin };
  return origin;
}

/**
 * Whether a real origin was configured. Deploy checks should assert this — a
 * production sitemap full of `http://localhost:3000` URLs is worse than none.
 */
export function hasConfiguredOrigin(): boolean {
  return siteOrigin() !== DEV_FALLBACK_ORIGIN;
}

/** `NEXT_PUBLIC_APP_URL` as a `URL`, for `metadataBase`. */
export function siteOriginUrl(): URL {
  return new URL(siteOrigin());
}

/**
 * A locale-relative path (`""`, `"/qr/wifi"`) turned into a rooted, absolute
 * path (`"/th"`, `"/th/qr/wifi"`).
 */
export function localePath(locale: Locale, path = ""): string {
  const suffix = path === "" || path === "/" ? "" : path.startsWith("/") ? path : `/${path}`;
  return `/${locale}${suffix}`;
}

/** The same, absolute. This is what goes in a canonical, an alternate, a sitemap. */
export function localeUrl(locale: Locale, path = ""): string {
  return `${siteOrigin()}${localePath(locale, path)}`;
}

/**
 * The hreflang map for one page, in the shape both `alternates.languages` and
 * the sitemap's `alternates.languages` expect.
 *
 * Includes a self-reference — Google requires every URL in an alternate set to
 * list the whole set, itself included — and an `x-default` pointing at Thai,
 * which matches the `/` → `/th` redirect in `next.config.ts`. Bare `th`/`en`
 * rather than `th-TH`/`en-US` on purpose: the English page targets English
 * speakers anywhere, not the United States.
 */
export function languageAlternates(path = ""): Record<string, string> {
  const map: Record<string, string> = {};
  for (const locale of locales) {
    map[locale] = localeUrl(locale, path);
  }
  map["x-default"] = localeUrl(defaultLocale, path);
  return map;
}
