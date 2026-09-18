import Link from "next/link";
import { QrCode } from "lucide-react";

import { type Locale, t } from "@/i18n/config";
import { focusRing } from "@/components/ui/focus-ring";
import { cn } from "@/lib/cn";

import { LocaleSwitcher } from "./locale-switcher";
import { AuthMenu } from "./auth-menu";
import { layoutStrings } from "./strings";
import { isAccountAuthConfigured } from "@/lib/auth-config";

/**
 * Site header. Server component — only the locale switcher needs the client,
 * so only that file carries "use client".
 *
 * `MAIN_CONTENT_ID` is the skip-link target; the locale layout puts it on
 * `<main>`. A skip link is the single highest-value keyboard affordance on a
 * page like this, where the header sits above a long form.
 */
export const MAIN_CONTENT_ID = "main-content";

export function SiteHeader({ locale }: { locale: Locale }) {
  const s = t(layoutStrings, locale);
  const googleAuthEnabled = isAccountAuthConfigured(process.env);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/85 backdrop-blur-sm">
      <a
        href={`#${MAIN_CONTENT_ID}`}
        className={cn(
          "sr-only rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground",
          "focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50",
          focusRing,
        )}
      >
        {s.skipToContent}
      </a>
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link
          href={`/${locale}`}
          className={cn(
            "group flex items-center gap-2 rounded-md text-foreground",
            focusRing,
          )}
        >
          <QrCode aria-hidden="true" className="size-5 text-primary" />
          <span className="text-base font-semibold tracking-tight">
            {s.brandName}
          </span>
          <span className="sr-only">{s.tagline}</span>
        </Link>

        <div className="flex min-w-0 items-center gap-2">
          <AuthMenu enabled={googleAuthEnabled} locale={locale} />
          <LocaleSwitcher locale={locale} />
        </div>
      </div>
    </header>
  );
}
