/**
 * Where a failed sign-in lands — `/[locale]/signin-error`.
 *
 * Better Auth redirects here (configured as `onAPIError.errorURL`) when a
 * sign-in fails before our callback can run. Its built-in page is English-only,
 * unbranded and offers no way back; since creating a QR code now requires an
 * account, that page would be the end of the road for anyone who hits it.
 *
 * The `error` query parameter is attacker-controlled, so it is only ever used
 * to look up a fixed message. Nothing from the URL is rendered.
 */
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { isLocale, t } from "@/i18n/config";
import { localePath } from "@/seo";

import { signInErrorStrings } from "../strings";

type SignInErrorPageProps = {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: SignInErrorPageProps): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  return { title: t(signInErrorStrings, locale).title, robots: { index: false, follow: false } };
}

export default async function SignInErrorPage({ params, searchParams }: SignInErrorPageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const s = t(signInErrorStrings, locale);

  const code = (await searchParams)?.error;
  const reason = typeof code === "string" && Object.hasOwn(s.reason, code) && code !== "unknown"
    ? s.reason[code as keyof typeof s.reason]
    : s.reason.unknown;

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10 sm:px-6 sm:py-14">
      <Card>
        <CardHeader>
          <CardTitle>{s.title}</CardTitle>
          <CardDescription role="alert">{reason}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">{s.lead}</p>
          <div className="flex flex-wrap items-center gap-3">
            <Link className={cn(buttonVariants())} href={localePath(locale, "/create")}>
              {s.retry}
            </Link>
            <Link className="text-sm underline underline-offset-4" href={localePath(locale)}>
              {s.home}
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
