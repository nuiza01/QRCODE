/**
 * The call to action that stands where the generator used to be.
 *
 * Product Owner decision, 2026-09-18: creating a QR code requires an account.
 * The public pages keep their copy, their FAQ and their JSON-LD so search still
 * has a page to rank, but the working form moved to `/[locale]/create`, which
 * checks the session on the server. This component is deliberately a plain
 * server component: it renders one link, so the public pages stay static and
 * carry no session-dependent markup.
 */
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/cn";
import { t, type Locale } from "@/i18n/config";
import { localePath } from "@/seo";

import { createStrings } from "@/app/[locale]/strings";

type CreateCtaProps = {
  locale: Locale;
  /** Preselects the generator's type switcher; omit on the home page. */
  typeSlug?: string;
  className?: string;
};

export function CreateCta({ locale, typeSlug, className }: CreateCtaProps) {
  const s = t(createStrings, locale);
  const href = typeSlug
    ? `${localePath(locale, "/create")}?type=${encodeURIComponent(typeSlug)}`
    : localePath(locale, "/create");

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{s.ctaHeading}</CardTitle>
        <CardDescription>{s.ctaBody}</CardDescription>
      </CardHeader>
      <CardContent>
        <Link className={cn(buttonVariants({ size: "lg" }))} href={href}>
          {s.ctaAction}
        </Link>
      </CardContent>
    </Card>
  );
}
