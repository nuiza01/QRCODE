import Link from "next/link";

import type { Locale } from "@/i18n/config";
import { focusRing } from "@/components/ui/focus-ring";
import { cn } from "@/lib/cn";

export function LegalPage({
  locale,
  page,
}: {
  locale: Locale;
  page: {
    title: string;
    updated: string;
    sections: Array<{ heading: string; paragraphs: string[] }>;
  };
}) {
  return (
    <article className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
      <h1 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
        {page.title}
      </h1>
      <p className="mt-3 text-sm text-muted-foreground">{page.updated}</p>

      <div className="mt-10 space-y-8">
        {page.sections.map((section) => (
          <section key={section.heading}>
            <h2 className="text-xl font-semibold tracking-tight">{section.heading}</h2>
            <div className="mt-3 space-y-3 text-sm leading-7 text-muted-foreground sm:text-base">
              {section.paragraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          </section>
        ))}
      </div>

      <Link
        href={`/${locale}`}
        className={cn(
          "mt-10 inline-flex rounded-md text-sm font-medium text-primary underline-offset-4 hover:underline",
          focusRing,
        )}
      >
        {locale === "th" ? "กลับไปสร้าง QR" : "Back to the QR generator"}
      </Link>
    </article>
  );
}

