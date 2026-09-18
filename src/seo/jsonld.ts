import type { Bundle, Locale } from "@/i18n/config";
import { t } from "@/i18n/config";
import type { QrContentType } from "@/qr/types";
import { qrTypeSeo } from "@/seo/content";
import type { SeoFaq } from "@/seo/types";
import { localeUrl } from "@/seo/site";

/**
 * JSON-LD builders.
 *
 * Two rules hold this file together:
 *
 *  1. **Nothing is invented.** Every value emitted here also appears on the
 *     rendered page. Structured data that describes content a user cannot see
 *     is precisely what a manual action is for.
 *  2. **An empty block is no block.** `buildFaqPageJsonLd` returns `null` when
 *     a type has no real questions, so pages can render `{faq && <script …>}`
 *     and a type with an empty `faqs` array simply emits nothing.
 */

/** A JSON-LD node. Loose by design — schema.org is open-world. */
export type JsonLd = Record<string, unknown>;

const SITE_NAME = "Nexora QR";

/** BCP-47 tags for `inLanguage`, matching `<html lang>`. */
const IN_LANGUAGE: Record<Locale, string> = { th: "th-TH", en: "en-US" };

/**
 * `featureList` for the generator. Kept short and literal: each line is a
 * capability the user can exercise on the page it is emitted from.
 */
const featureList: Bundle<string[]> = {
  th: [
    "รองรับ QR Code 10 ชนิด รวมพร้อมเพย์",
    "ปรับสี รูปทรงจุด และใส่โลโก้ได้",
    "ดาวน์โหลดเป็น PNG, SVG และ PDF",
    "ตรวจคุณภาพและเตือนเมื่อ QR เสี่ยงสแกนไม่ติด",
    "สร้างในเบราว์เซอร์ และส่งข้อมูลเมื่อผู้ใช้เลือกบันทึกเท่านั้น",
  ],
  en: [
    "Ten QR code types, including Thai PromptPay",
    "Custom colours, dot shapes and centre logo",
    "PNG, SVG and PDF download",
    "Quality checks that warn before a code fails to scan",
    "Generated in the browser; data is sent only when the user chooses Save QR",
  ],
};

const breadcrumbHome: Bundle<string> = { th: "หน้าแรก", en: "Home" };

/**
 * `SoftwareApplication` for the generator.
 *
 * `offers` at price 0 is the honest description of the current product: the
 * generator on these pages is free and requires no account. When the paid tier
 * lands (Phase 3), this is the node that has to change with it — a free-price
 * offer left in place after a paywall appears is a misrepresentation.
 */
export function buildSoftwareApplicationJsonLd(options: {
  locale: Locale;
  /** Omit for the home page generator. */
  type?: QrContentType;
}): JsonLd {
  const { locale, type } = options;

  const name = type ? t(qrTypeSeo[type].content, locale).h1 : SITE_NAME;
  const description = type
    ? t(qrTypeSeo[type].content, locale).description
    : t(featureList, locale).join(" · ");
  const url = type ? localeUrl(locale, `/qr/${qrTypeSeo[type].slug}`) : localeUrl(locale);

  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name,
    description,
    url,
    applicationCategory: "UtilitiesApplication",
    // A browser tool, not a download. This is the value Google's own examples
    // use for web applications.
    operatingSystem: "Web browser",
    inLanguage: IN_LANGUAGE[locale],
    isAccessibleForFree: true,
    featureList: t(featureList, locale),
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "THB",
    },
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      url: localeUrl(locale),
    },
  };
}

/**
 * `FAQPage`, or `null` when there are no real questions.
 *
 * The null return is the whole point: `docs/ROUTES_AND_SEO.md` forbids
 * fabricating questions to farm the rich result, so the API makes "no FAQ" the
 * easy thing to express rather than something a page author has to remember.
 */
export function buildFaqPageJsonLd(faqs: readonly SeoFaq[]): JsonLd | null {
  if (faqs.length === 0) return null;

  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };
}

/** `BreadcrumbList` for `/[locale]/qr/[type]`: home → this type. */
export function buildBreadcrumbJsonLd(type: QrContentType, locale: Locale): JsonLd {
  const entry = qrTypeSeo[type];

  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: t(breadcrumbHome, locale),
        item: localeUrl(locale),
      },
      {
        "@type": "ListItem",
        position: 2,
        name: t(entry.content, locale).h1,
        item: localeUrl(locale, `/qr/${entry.slug}`),
      },
    ],
  };
}

/**
 * Serializes a node for a `<script type="application/ld+json">` body.
 *
 * `<` is escaped to its unicode form. Without that, any copy containing the
 * literal sequence `</script>` — a real possibility on a page about encoding
 * arbitrary text — would close the script tag early and inject the remainder
 * into the document as markup.
 */
export function serializeJsonLd(data: JsonLd): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

/**
 * Props to spread onto a `<script>` element:
 *
 *     <script {...jsonLdScriptProps(node)} />
 *
 * Returned as props rather than a component so `src/seo` stays free of JSX and
 * every page keeps control of where the tag lands.
 */
export function jsonLdScriptProps(data: JsonLd): {
  type: "application/ld+json";
  dangerouslySetInnerHTML: { __html: string };
} {
  return {
    type: "application/ld+json",
    dangerouslySetInnerHTML: { __html: serializeJsonLd(data) },
  };
}
