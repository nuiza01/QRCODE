/**
 * Home.
 *
 * A server component that renders one heading and then the call to action.
 * This page used to mount the generator directly, on the argument that every
 * click between the visitor and the form is a click where they leave for a
 * competitor. That argument lost to a product decision on 2026-09-18: creating
 * a QR code requires an account, so the form lives at `/[locale]/create`, which
 * reads the session on the server. What stays here is what a signed-out visitor
 * and a crawler can both have — the heading, the copy, and one link into the
 * product. The marketing depth still lives on the per-type pages under
 * `/[locale]/qr/[type]`, which SEO owns.
 */
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CreateCta } from "@/components/layout/create-cta";
import { isLocale, t } from "@/i18n/config";
import { buildHomeMetadata } from "@/seo";

import { homeStrings } from "./strings";

/**
 * Delegated to `@/seo` rather than hand-built.
 *
 * This page used to assemble its own `Metadata` behind an
 * `if (process.env.NEXT_PUBLIC_APP_URL)` guard, which meant it emitted no
 * canonical and no hreflang at all whenever the variable was unset — leaving
 * the two highest-value URLs on the site as the only pages without an hreflang
 * cluster, and without `x-default` even when it was set. `buildHomeMetadata`
 * resolves an origin on its own and produces the same shape as the twenty type
 * pages, so the site stops describing its own pages two different ways.
 */
export async function generateMetadata({
  params,
}: PageProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  return buildHomeMetadata(locale);
}

export default async function LocaleHomePage({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const s = t(homeStrings, locale);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      <div className="mb-8 max-w-2xl">
        <h1 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
          {s.heading}
        </h1>
        <p className="mt-3 text-base text-muted-foreground">{s.subheading}</p>
      </div>

      <CreateCta locale={locale} />
    </div>
  );
}
