import type { MetadataRoute } from "next";

import { locales } from "@/i18n/config";
import { qrTypeSeoList } from "@/seo/content";
import { languageAlternates, localeUrl } from "@/seo/site";

/**
 * Sitemap: 2 locales × (home + 10 type pages) = 22 URLs.
 *
 * Deliberately the single-file form. `generateSitemaps` exists for splitting
 * past Google's 50,000-URL limit, and reaching for it at 22 URLs would buy an
 * index file, a second request for every crawl, and — in Next.js 16, where the
 * `id` argument became a Promise — a footgun for whoever edits this next.
 *
 * Every URL carries the full `alternates.languages` set including itself, which
 * is what Google requires of an hreflang cluster: a page that lists its
 * alternates but not itself is treated as not part of the set.
 */

/**
 * Build time. Not per-request: this file has no dynamic API, so Next caches it
 * and the value is the deploy that produced the content — which is the honest
 * meaning of `lastmod` for pages whose copy ships in the bundle.
 */
const LAST_MODIFIED = new Date();

export default function sitemap(): MetadataRoute.Sitemap {
  const entries: MetadataRoute.Sitemap = [];

  for (const locale of locales) {
    entries.push({
      url: localeUrl(locale),
      lastModified: LAST_MODIFIED,
      changeFrequency: "weekly",
      priority: 1,
      alternates: { languages: languageAlternates() },
    });
  }

  for (const locale of locales) {
    for (const entry of qrTypeSeoList) {
      const path = `/qr/${entry.slug}`;
      entries.push({
        url: localeUrl(locale, path),
        lastModified: LAST_MODIFIED,
        changeFrequency: "monthly",
        // PromptPay is the page this product is differentiated on
        // (`docs/ROUTES_AND_SEO.md`), so it outranks its siblings internally.
        priority: entry.type === "promptpay" ? 0.9 : 0.8,
        alternates: { languages: languageAlternates(path) },
      });
    }
  }

  return entries;
}
