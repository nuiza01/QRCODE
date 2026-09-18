import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { listSavedQrCodes } from "@/features/saved-qr/data";
import { isLocale } from "@/i18n/config";
import { isAccountAuthConfigured } from "@/lib/auth-config";
import { getRequestUser } from "@/lib/request-auth";

import { DashboardActions } from "./DashboardActions";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const copy = {
  th: { title: "QR ที่บันทึกไว้", description: "จัดการ Static QR ที่บันทึกในบัญชี Free ได้สูงสุด 25 รายการ", empty: "ยังไม่มี QR ที่บันทึกไว้", create: "สร้างและบันทึก QR แรก", static: "Static", updated: "อัปเดต", unavailable: "ไม่สามารถโหลด QR ที่บันทึกไว้ได้ในขณะนี้ กรุณาลองอีกครั้ง" },
  en: { title: "Saved QR codes", description: "Manage up to 25 Static QR codes saved to your Free account.", empty: "You have not saved a QR code yet.", create: "Create and save your first QR", static: "Static", updated: "Updated", unavailable: "Saved QR codes are temporarily unavailable. Please try again." },
} as const;

type DashboardPageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: DashboardPageProps): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  return { title: copy[locale].title, robots: { index: false, follow: false } };
}

export default async function DashboardPage({ params }: DashboardPageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  if (!isAccountAuthConfigured(process.env)) redirect(`/${locale}`);
  let currentUser: Awaited<ReturnType<typeof getRequestUser>>;
  try {
    currentUser = await getRequestUser(await headers());
  } catch {
    return <DashboardUnavailable locale={locale} />;
  }
  if (!currentUser) redirect(`/${locale}`);

  let records: Awaited<ReturnType<typeof listSavedQrCodes>>;
  try {
    records = await listSavedQrCodes(currentUser.id);
  } catch {
    return <DashboardUnavailable locale={locale} />;
  }
  const s = copy[locale];
  const formatter = new Intl.DateTimeFormat(locale === "th" ? "th-TH" : "en-US", {
    dateStyle: "medium",
    timeZone: "UTC",
  });

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6 sm:py-14">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">{s.title}</h1>
        <p className="mt-2 text-muted-foreground">{s.description}</p>
      </header>
      {records.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-start gap-4">
            <p className="text-muted-foreground">{s.empty}</p>
            <Link href={`/${locale}`} className="text-sm font-medium text-primary underline underline-offset-4">{s.create}</Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {records.map((record) => (
            <Card key={record.id}>
              <CardHeader>
                <CardTitle>{record.name}</CardTitle>
                <CardDescription>
                  {s.static} · {record.contentType.toUpperCase()} · {s.updated} {formatter.format(record.updatedAt)}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <DashboardActions id={record.id} locale={locale} name={record.name} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function DashboardUnavailable({ locale }: { locale: "th" | "en" }) {
  const s = copy[locale];
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6 sm:py-14">
      <h1 className="text-3xl font-semibold tracking-tight">{s.title}</h1>
      <p role="alert" className="mt-4 text-destructive">
        {s.unavailable}
      </p>
    </div>
  );
}
