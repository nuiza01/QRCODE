/**
 * Per-type SEO landing page — `/[locale]/qr/[type]`, 2 locales × 10 types.
 *
 * The running order is breadcrumb, `<h1>`, lead, then the call to action, and
 * only then the prose. `docs/ROUTES_AND_SEO.md` asked for a working generator
 * in that slot, and it held that position until the Product Owner decided on
 * 2026-09-18 that creating a QR code requires an account. The form now lives at
 * `/[locale]/create`, which reads the session on the server; this page keeps the
 * copy, the FAQ and the JSON-LD, so it stays prerendered and stays the page that
 * search ranks. The link carries the slug, so arriving here for PromptPay and
 * then signing in still opens the generator on PromptPay.
 */
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { CreateCta } from "@/components/layout/create-cta";
import { isLocale, t } from "@/i18n/config";
import {
  buildBreadcrumbJsonLd,
  buildFaqPageJsonLd,
  buildSoftwareApplicationJsonLd,
  buildTypeMetadata,
  jsonLdScriptProps,
  localePath,
  qrTypeBySlug,
  qrTypeSeo,
  qrTypeSeoList,
} from "@/seo";

import { qrLandingStrings } from "../strings";

/**
 * The root layout already generates `[locale]`, so this runs once per locale
 * and returns only `[type]` — 2 × 10 = 20 prerendered pages. Returning the
 * locale here as well would duplicate what the parent already produced.
 */
export function generateStaticParams() {
  return qrTypeSeoList.map((entry) => ({ type: entry.slug }));
}

/**
 * An unknown slug is a 404, never a soft fallback. `/th/qr/qrcode` rendering
 * the URL generator with a 200 would be a duplicate-content trap, and it is
 * the kind of thing scrapers generate by the thousand.
 */
export const dynamicParams = false;

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/qr/[type]">): Promise<Metadata> {
  const { locale, type: slug } = await params;
  if (!isLocale(locale)) return {};

  const type = qrTypeBySlug[slug];
  if (!type) return {};

  return buildTypeMetadata(type, locale);
}

export default async function QrTypeLandingPage({
  params,
}: PageProps<"/[locale]/qr/[type]">) {
  const { locale, type: slug } = await params;
  if (!isLocale(locale)) notFound();

  const type = qrTypeBySlug[slug];
  if (!type) notFound();

  const entry = qrTypeSeo[type];
  const content = t(entry.content, locale);
  const s = t(qrLandingStrings, locale);

  // `buildFaqPageJsonLd` returns null for a type with no real questions, so
  // types without an FAQ emit no block rather than an empty one.
  const faqJsonLd = buildFaqPageJsonLd(content.faqs);
  const otherTypes = qrTypeSeoList.filter((other) => other.type !== type);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      <script {...jsonLdScriptProps(buildSoftwareApplicationJsonLd({ locale, type }))} />
      <script {...jsonLdScriptProps(buildBreadcrumbJsonLd(type, locale))} />
      {faqJsonLd ? <script {...jsonLdScriptProps(faqJsonLd)} /> : null}

      <nav aria-label={s.breadcrumbLabel} className="mb-6">
        <ol className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <li>
            <Link href={localePath(locale)} className="transition-colors hover:text-foreground">
              {s.home}
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li aria-current="page" className="text-foreground">
            {content.shortLabel}
          </li>
        </ol>
      </nav>

      <header className="mb-8 max-w-2xl">
        <h1 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
          {content.h1}
        </h1>
        <p className="mt-3 text-base text-muted-foreground">{content.lead}</p>
      </header>

      <CreateCta locale={locale} typeSlug={slug} />

      <aside className="mt-8 rounded-lg border border-border bg-muted/40 p-4 sm:p-5">
        <h2 className="text-sm font-medium">{s.privacyHeading}</h2>
        <p className="mt-1.5 text-sm text-muted-foreground">{content.privacyNote}</p>
      </aside>

      <section className="mt-14 max-w-3xl" aria-labelledby="how-to">
        <h2 id="how-to" className="text-xl font-semibold tracking-tight sm:text-2xl">
          {s.howToHeading}
        </h2>
        <ol className="mt-6 space-y-6">
          {content.steps.map((step, index) => (
            <li key={step.title} className="flex gap-4">
              <span
                aria-hidden="true"
                className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary"
              >
                {index + 1}
              </span>
              <div>
                <h3 className="text-base font-medium">{step.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {content.sections.length > 0 ? (
        <div className="mt-14 max-w-3xl space-y-10">
          {content.sections.map((section) => (
            <section key={section.heading}>
              <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
                {section.heading}
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                {section.body}
              </p>
            </section>
          ))}
        </div>
      ) : null}

      {content.faqs.length > 0 ? (
        <section className="mt-14 max-w-3xl" aria-labelledby="faq">
          <h2 id="faq" className="text-xl font-semibold tracking-tight sm:text-2xl">
            {s.faqHeading}
          </h2>
          <div className="mt-4">
            {/*
              Native <details> rather than the Radix accordion on purpose.
              `AccordionContent` unmounts a closed panel, so the answers would
              be absent from the prerendered HTML while the FAQPage JSON-LD
              claims they are on the page — the exact structured-data mismatch
              that gets a rich result withdrawn. <details> keeps every answer in
              the DOM, needs no JavaScript, and keeps this page fully server
              rendered with no client boundary.
            */}
            {content.faqs.map((faq) => (
              <details
                key={faq.question}
                className="group border-b border-border last:border-b-0"
              >
                <summary className="flex cursor-pointer list-none items-start justify-between gap-4 py-4 transition-colors hover:text-primary [&::-webkit-details-marker]:hidden">
                  <h3 className="text-sm font-medium">{faq.question}</h3>
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
                  >
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </summary>
                <p className="pb-4 text-sm leading-relaxed text-muted-foreground">
                  {faq.answer}
                </p>
              </details>
            ))}
          </div>
        </section>
      ) : null}

      <nav className="mt-14 border-t border-border pt-8" aria-label={s.moreTypesLabel}>
        <h2 className="text-sm font-medium">{s.moreTypesHeading}</h2>
        <ul className="mt-3 flex flex-wrap gap-2">
          {otherTypes.map((other) => (
            <li key={other.type}>
              <Link
                href={localePath(locale, `/qr/${other.slug}`)}
                className="inline-flex rounded-full border border-border px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
              >
                {t(other.content, locale).shortLabel}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
