import type { MetadataRoute } from "next";

import { siteOrigin } from "@/seo/site";

/**
 * robots.txt.
 *
 * Everything is crawlable. The two account pages — `/[locale]/create` and
 * `/[locale]/dashboard` — are kept out of the index with `robots: { index: false }`
 * in their own metadata rather than with a Disallow here: a crawler that is
 * forbidden to fetch a page never reads the noindex on it, which is the classic
 * way a page stays in the index without its own say. Neither is in the sitemap.
 *
 * The sitemap URL is absolute because the standard requires it, and is derived
 * from `NEXT_PUBLIC_APP_URL` rather than written down: the production domain is
 * still unregistered (`PLAN.md` §4, Phase 0), so a literal here would ship a
 * robots.txt pointing at a sitemap that does not exist.
 *
 * No `host` directive: it is a Yandex-only extension expecting a bare hostname,
 * and emitting it with a scheme (which is what an origin is) is worse than
 * omitting it.
 */
export default function robots(): MetadataRoute.Robots {
  const origin = siteOrigin();

  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },
    sitemap: `${origin}/sitemap.xml`,
  };
}
