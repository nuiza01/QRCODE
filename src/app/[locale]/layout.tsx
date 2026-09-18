import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono, Noto_Sans_Thai } from "next/font/google";
import { notFound } from "next/navigation";

import { MAIN_CONTENT_ID, SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { htmlLang, isLocale, locales, t } from "@/i18n/config";

import "../globals.css";
import { localeLayoutStrings } from "./strings";

/**
 * ROOT LAYOUT.
 *
 * Every route in this app lives under `[locale]`, so this is the topmost
 * layout and therefore the root layout — a root layout does not have to sit at
 * `app/layout.tsx`, it is simply whichever layout has none above it. That
 * makes `locale` a *root parameter*: it appears in the path before the root
 * layout, so `<html lang>` can finally be correct per locale instead of
 * carrying a default.
 *
 * There is deliberately no `src/app/layout.tsx` and no `src/app/page.tsx`. A
 * page at `/` would have no root layout above it, so the `/` -> `/th` redirect
 * lives in `next.config.ts` under `redirects()` instead.
 *
 * Deeper *server* components that need the locale without prop drilling should
 * import the getter from `next/root-params`:
 *
 *     import { locale } from "next/root-params";
 *     const current = await locale();
 *
 * That getter is server-only — it is unavailable in client components, server
 * actions and route handlers, which must receive the locale as a prop or read
 * it from the route segment.
 */

/**
 * FONT PAIRING
 *
 * Two text families plus a mono, all variable, all self-hosted by next/font
 * (no request ever leaves the user's browser to Google — which matters,
 * because "your payload never leaves your device" is a selling point of this
 * product).
 *
 *  - Inter carries Latin. It is the neutral UI grotesque; at the small sizes a
 *    form-heavy tool lives at, its tall x-height and unambiguous 1/l/I keep
 *    URLs, phone numbers and hex colours readable.
 *  - Noto Sans Thai carries Thai. It is loopless (แบบไม่มีหัว), which is what
 *    Thai UI expects at screen sizes, has complete tone-mark and vowel
 *    coverage with proper mark stacking, and is variable — one file for the
 *    whole 100-900 range instead of seven static weights.
 *  - The two are metrically close enough that a mixed line (very common here:
 *    "สแกน QR Code") does not visibly step in size.
 *
 * The `--nx-font-*` variables are consumed by `--font-sans` / `--font-mono` in
 * globals.css. Order matters there: Latin first, Thai second, so Latin code
 * points resolve to Inter and Thai code points fall through to Noto Sans Thai.
 */
const latinSans = Inter({
  variable: "--nx-font-latin",
  subsets: ["latin"],
  display: "swap",
});

const thaiSans = Noto_Sans_Thai({
  variable: "--nx-font-thai",
  subsets: ["thai", "latin"],
  display: "swap",
});

/** Monospace is for payload strings, hex colours and PromptPay IDs, not prose. */
const mono = JetBrains_Mono({
  variable: "--nx-font-mono",
  subsets: ["latin"],
  display: "swap",
});

/** `/th` and `/en` are prerendered; anything else 404s. */
export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

/**
 * Anything not in `locales` is a 404 rather than a silent fallback to Thai.
 * A soft fallback would let `/de/qr/wifi` return 200 with Thai content, which
 * is a duplicate-content trap for the crawler.
 */
export const dynamicParams = false;

export const viewport: Viewport = {
  // Both entries so the browser paints native UI (scrollbars, form controls)
  // to match whichever palette globals.css resolved to.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f9fcfe" },
    { media: "(prefers-color-scheme: dark)", color: "#0a141c" },
  ],
  colorScheme: "light dark",
};

export async function generateMetadata({
  params,
}: LayoutProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const s = t(localeLayoutStrings, locale);

  // Baseline only. SEO owns the full metadata strategy (canonicals, hreflang
  // alternates, OG images, per-content-type pages) under `src/seo/**`.
  return {
    title: { default: s.siteTitle, template: `%s · ${s.siteName}` },
    description: s.siteDescription,
    applicationName: s.siteName,
  };
}

export default async function LocaleRootLayout({
  children,
  params,
}: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  return (
    <html
      // Authoritative, per-locale. The Thai typography rules in globals.css
      // key off `[lang="th"] / [lang^="th-"]`, and this is the element that
      // now carries it, so they apply to the whole document.
      lang={htmlLang[locale]}
      className={`${latinSans.variable} ${thaiSans.variable} ${mono.variable} h-full`}
      // A future theme toggle will stamp `.dark` / `.light` on <html> before
      // hydration; without this React would report a mismatch.
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col bg-background text-foreground">
        <SiteHeader locale={locale} />
        {/* tabIndex={-1} so the skip link actually moves focus, not just scroll. */}
        <main id={MAIN_CONTENT_ID} tabIndex={-1} className="flex-1 outline-none">
          {children}
        </main>
        <SiteFooter locale={locale} />
      </body>
    </html>
  );
}
