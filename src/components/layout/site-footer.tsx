import Link from "next/link";
import { ShieldCheck } from "lucide-react";

import { type Locale, t } from "@/i18n/config";

import { layoutStrings } from "./strings";

/**
 * Site footer.
 *
 * Privacy and terms are real destinations required for optional Google sign-in.
 * Pricing and docs remain omitted until those pages exist.
 */
export function SiteFooter({ locale }: { locale: Locale }) {
  const s = t(layoutStrings, locale);
  const year = new Date().getFullYear();

  return (
    <footer className="mt-auto w-full border-t border-border bg-muted/40">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6">
        <p className="flex items-start gap-2 text-sm text-muted-foreground">
          <ShieldCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-success" />
          <span>{s.privacyNote}</span>
        </p>

        <nav aria-label={s.footerNavLabel}>
          <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
            <li>
              <Link className="text-muted-foreground hover:text-foreground" href={`/${locale}/privacy`}>
                {s.nav.privacy}
              </Link>
            </li>
            <li>
              <Link className="text-muted-foreground hover:text-foreground" href={`/${locale}/terms`}>
                {s.nav.terms}
              </Link>
            </li>
          </ul>
        </nav>

        <p className="text-xs text-muted-foreground">
          © {year} {s.rightsReserved}
        </p>
      </div>
    </footer>
  );
}
