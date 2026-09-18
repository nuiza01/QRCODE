import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { LegalPage } from "@/components/layout/legal-page";
import { isLocale, t } from "@/i18n/config";

import { termsStrings } from "../legal-strings";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/terms">): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const page = t(termsStrings, locale);
  return {
    title: page.title,
    description: page.description,
    robots: { index: false, follow: true },
  };
}

export default async function TermsPage({
  params,
}: PageProps<"/[locale]/terms">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return <LegalPage locale={locale} page={t(termsStrings, locale)} />;
}

