/**
 * The generator, behind the account gate — `/[locale]/create`.
 *
 * Product Owner decision, 2026-09-18: only signed-in people may use the
 * generator. The enforcement is here, on the server, because a client-side
 * check is a suggestion: this page reads the session before it renders, so an
 * anonymous request never receives the form at all.
 *
 * That makes this route dynamic, which is why it is a route of its own rather
 * than a change to `/[locale]` and the twenty `/[locale]/qr/[type]` pages.
 * Those stay prerendered and keep carrying the SEO weight; this page is
 * `noindex` and never enters the sitemap.
 *
 * When accounts are not configured the page refuses rather than falling back to
 * an open generator: an environment that cannot check a session cannot enforce
 * the decision above, and failing open would quietly undo it.
 */
import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Generator } from "@/components/generator";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { isLocale, t, type Locale } from "@/i18n/config";
import { isAccountAuthConfigured } from "@/lib/auth-config";
import { getRequestUser } from "@/lib/request-auth";
import { localePath, qrTypeBySlug } from "@/seo";

import { createStrings } from "../strings";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type CreatePageProps = {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: CreatePageProps): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  return { title: t(createStrings, locale).title, robots: { index: false, follow: false } };
}

export default async function CreatePage({ params, searchParams }: CreatePageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  if (!isAccountAuthConfigured(process.env)) return <GateNotice locale={locale} kind="unavailable" />;

  let currentUser: Awaited<ReturnType<typeof getRequestUser>>;
  try {
    currentUser = await getRequestUser(await headers());
  } catch {
    // The reason is never shown or inspected: a session lookup that failed is
    // indistinguishable, from here, from one that was refused.
    return <GateNotice locale={locale} kind="unavailable" />;
  }
  if (!currentUser) return <GateNotice locale={locale} kind="signIn" />;

  const requested = (await searchParams)?.type;
  const slug = typeof requested === "string" ? requested : undefined;
  const initialType = slug ? qrTypeBySlug[slug] : undefined;
  const s = t(createStrings, locale);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      <h1 className="mb-8 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">{s.title}</h1>
      <Generator locale={locale} initialType={initialType} accountEnabled />
    </div>
  );
}

function GateNotice({ locale, kind }: { locale: Locale; kind: "signIn" | "unavailable" }) {
  const s = t(createStrings, locale);
  const signIn = kind === "signIn";

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10 sm:px-6 sm:py-14">
      <Card>
        <CardHeader>
          <CardTitle>{signIn ? s.signInHeading : s.unavailableHeading}</CardTitle>
          <CardDescription role={signIn ? undefined : "alert"}>
            {signIn ? s.signInBody : s.unavailableBody}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link className="text-sm underline underline-offset-4" href={localePath(locale)}>
            {s.back}
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
