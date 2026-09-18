import type { NextConfig } from "next";
import { PHASE_PRODUCTION_BUILD } from "next/constants";
import { assertBuildOrigin } from "./scripts/origin-gate.mjs";

import { defaultLocale } from "./src/i18n/config";

const nextConfig: NextConfig = {
  /**
   * `/` -> `/th`.
   *
   * This lives here rather than in an `app/page.tsx` calling `redirect()`
   * because the root layout is `src/app/[locale]/layout.tsx` — every route is
   * under `[locale]`, which is what makes `locale` a root parameter and lets
   * `<html lang>` be per-locale. A page at `/` would have no root layout above
   * it, so the redirect has to happen before the filesystem is consulted.
   *
   * `permanent: false` (307, not 308) on purpose: 308 is cached by browsers
   * forever, and `/` is the one URL we may later want to make smarter (e.g.
   * Accept-Language negotiation). Locking it into a permanent redirect now
   * would be very hard to undo in the field.
   */
  async redirects() {
    return [
      {
        source: "/",
        destination: `/${defaultLocale}`,
        permanent: false,
      },
    ];
  },
};

export default function config(phase: string): NextConfig {
  // Covers direct `next build` as well as npm scripts on Vercel or an explicitly
  // marked deployment. A normal no-env CI build is not a deployment target.
  if (phase === PHASE_PRODUCTION_BUILD) assertBuildOrigin(process.env);
  return nextConfig;
}
