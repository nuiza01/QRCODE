import type { Metadata } from "next";

import { t, type Locale } from "@/i18n/config";
import type { QrContentType } from "@/qr/types";
import { homeSeo, qrTypeSeo } from "@/seo/content";
import { languageAlternates, localeUrl, siteOriginUrl } from "@/seo/site";

/**
 * `generateMetadata` builders.
 *
 * Pages should not assemble `Metadata` by hand. Canonicals and hreflang sets
 * are the two things that are easy to get subtly wrong and expensive to
 * discover — a canonical pointing at the wrong locale silently deindexes half
 * the site — so the whole shape is produced here and pages pass a route.
 */

/** Brand name for `openGraph.siteName`. Not a domain, so safe as a constant. */
const SITE_NAME = "Nexora QR";

/**
 * Must stay identical to the separator in the locale layout's title template
 * (`%s · ${siteName}`). Only `buildHomeMetadata` needs it — every other page
 * gets the suffix from the template itself — but if the two ever disagree the
 * home page would be the one document on the site with a different title shape.
 */
const TITLE_SEPARATOR = " · ";

/** Open Graph wants an underscored locale tag, unlike hreflang. */
const OG_LOCALE: Record<Locale, string> = { th: "th_TH", en: "en_US" };
const OG_ALTERNATE_LOCALE: Record<Locale, string[]> = {
  th: [OG_LOCALE.en],
  en: [OG_LOCALE.th],
};

export interface PageMetadataInput {
  locale: Locale;
  /** Path *below* the locale segment: `""` for home, `"/qr/wifi"` for a type. */
  path?: string;
  /** Always written without the brand. See `appendBrandToTitle` for who adds it. */
  title: string;
  description: string;
  /**
   * Append the brand to the document title here instead of relying on the
   * layout's title template.
   *
   * Set this only for a page that sits at the **same segment** as the layout
   * defining the template — see the note on `buildPageMetadata`. Everywhere
   * else it would double the brand.
   */
  appendBrandToTitle?: boolean;
}

/**
 * The core builder. Everything else in this file is a thin wrapper.
 *
 * `metadataBase` is set here rather than in the layout because this module is
 * the one that knows about `NEXT_PUBLIC_APP_URL`, and because it must resolve
 * lazily — reading it at layout module scope would bake a build machine's
 * environment into every page.
 *
 * ## The title template does not reach every caller
 *
 * `src/app/[locale]/layout.tsx` sets `title.template` to `%s · Nexora QR`, so
 * callers pass a bare title and the brand is appended for them. **A template
 * does not apply to the page of the segment that defines it.** The template
 * lives on the `[locale]` layout, so it reaches `[locale]/qr/[type]/page.tsx`
 * but *not* `[locale]/page.tsx` — the home page sits at that same segment and
 * would render brandless. `appendBrandToTitle` is the escape hatch for exactly
 * that case, and `buildHomeMetadata` is its only current user.
 *
 * The brand is deliberately kept out of the Open Graph and Twitter titles in
 * both modes: `openGraph.siteName` already carries it, and social cards render
 * the site name as its own line, so a branded OG title reads doubled.
 */
export function buildPageMetadata({
  locale,
  path = "",
  title,
  description,
  appendBrandToTitle = false,
}: PageMetadataInput): Metadata {
  const canonical = localeUrl(locale, path);

  return {
    metadataBase: siteOriginUrl(),
    // `absolute` opts out of any inherited template rather than stacking on it,
    // so this cannot double the brand if a template ever does reach this page.
    title: appendBrandToTitle
      ? { absolute: `${title}${TITLE_SEPARATOR}${SITE_NAME}` }
      : title,
    description,
    alternates: {
      canonical,
      // Self-referencing: Google requires every URL in an alternate set to
      // list the complete set, itself included.
      languages: languageAlternates(path),
    },
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      title,
      description,
      url: canonical,
      locale: OG_LOCALE[locale],
      alternateLocale: OG_ALTERNATE_LOCALE[locale],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

/** Metadata for `/[locale]/qr/[type]`. */
export function buildTypeMetadata(type: QrContentType, locale: Locale): Metadata {
  const entry = qrTypeSeo[type];
  const content = t(entry.content, locale);

  return buildPageMetadata({
    locale,
    path: `/qr/${entry.slug}`,
    title: content.title,
    description: content.description,
  });
}

/**
 * Metadata for `/[locale]`.
 *
 * Brands its own title, because the layout that defines the title template is
 * the same segment this page belongs to and templates skip their own page.
 * The brand goes on as a **suffix**, matching the twenty type pages: the site
 * gets one title shape, and the keyword keeps the front of the tag where it is
 * safe from SERP truncation.
 */
export function buildHomeMetadata(locale: Locale): Metadata {
  const content = t(homeSeo, locale);

  return buildPageMetadata({
    locale,
    path: "",
    title: content.title,
    description: content.description,
    // The home page is the one page the layout's title template misses.
    appendBrandToTitle: true,
  });
}
