"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { type Locale, isLocale, locales, htmlLang, t } from "@/i18n/config";
import { cn } from "@/lib/cn";
import { focusRing } from "@/components/ui/focus-ring";

import { languageNames, layoutStrings } from "./strings";

/**
 * Locale switcher.
 *
 * Deliberately a pair of real `<a href>`s rather than a `<Select>`:
 *
 *  - Each locale is a distinct, indexable URL. A JS-driven `router.push` hides
 *    the alternate-language URL from crawlers, which is the opposite of what a
 *    site whose whole traffic plan is SEO wants.
 *  - `hreflang` on the link tells the crawler what it will find there.
 *  - It works without JavaScript, and it is two items — a dropdown for two
 *    options is a click for nothing.
 *
 * The current path is preserved: `/en/qr/wifi` -> `/th/qr/wifi`. Query strings
 * are intentionally not carried across; reading them here would require
 * `useSearchParams`, which opts the whole shell out of static rendering.
 */
export function LocaleSwitcher({ locale }: { locale: Locale }) {
  const s = t(layoutStrings, locale);
  const pathname = usePathname();

  return (
    <nav aria-label={s.languageLabel} className="flex items-center">
      <ul className="flex items-center gap-0.5 rounded-md bg-muted p-0.5">
        {locales.map((candidate) => {
          const isActive = candidate === locale;
          return (
            <li key={candidate}>
              <Link
                href={swapLocale(pathname, candidate)}
                hrefLang={htmlLang[candidate]}
                lang={htmlLang[candidate]}
                // `aria-current="true"` rather than a visual-only highlight:
                // the active language must be announced, not just coloured.
                aria-current={isActive ? "true" : undefined}
                className={cn(
                  "block rounded-[calc(var(--nx-radius)-6px)] px-2.5 py-1 text-xs font-medium transition-colors",
                  focusRing,
                  isActive
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {languageNames[candidate]}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/**
 * Replaces the locale segment of a path, or prefixes one if the path has none.
 * Exported for tests (QA owns `*.test.ts`).
 */
export function swapLocale(pathname: string, target: Locale): string {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length > 0 && isLocale(segments[0])) {
    segments[0] = target;
  } else {
    segments.unshift(target);
  }
  return `/${segments.join("/")}`;
}
