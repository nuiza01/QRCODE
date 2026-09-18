import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { LegalPage } from "@/components/layout/legal-page";
import { isLocale, t } from "@/i18n/config";

import { privacyStrings } from "../legal-strings";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/privacy">): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const page = t(privacyStrings, locale);
  return {
    title: page.title,
    description: page.description,
    robots: { index: false, follow: true },
  };
}

export default async function PrivacyPage({
  params,
}: PageProps<"/[locale]/privacy">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return <LegalPage locale={locale} page={t(privacyStrings, locale)} />;
}

