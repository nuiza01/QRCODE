import type { Bundle } from "@/i18n/config";
import type { QrContentType } from "@/qr/types";
import type { QrTypeSeo } from "@/seo/types";

import { emailSeo } from "./email";
import { eventSeo } from "./event";
import { geoSeo } from "./geo";
import { promptpaySeo } from "./promptpay";
import { smsSeo } from "./sms";
import { telSeo } from "./tel";
import { textSeo } from "./text";
import { urlSeo } from "./url";
import { vcardSeo } from "./vcard";
import { wifiSeo } from "./wifi";

/**
 * The registry every other role reads from.
 *
 * Typed as `Record<QrContentType, QrTypeSeo>` on purpose: adding an eleventh
 * content type to `src/qr/types.ts` makes this object a compile error until
 * someone writes its copy, rather than shipping a route with no landing page.
 */
export const qrTypeSeo: Record<QrContentType, QrTypeSeo> = {
  url: urlSeo,
  text: textSeo,
  wifi: wifiSeo,
  vcard: vcardSeo,
  email: emailSeo,
  sms: smsSeo,
  tel: telSeo,
  geo: geoSeo,
  event: eventSeo,
  promptpay: promptpaySeo,
};

/**
 * Display order for navigation, cards and the sitemap.
 *
 * Not alphabetical and not the order of the type union: this is the order a
 * Thai user is most likely to want. `promptpay` sits near the top because it is
 * the reason this product exists in this market, and `url` leads because it is
 * what most people arrive looking for.
 */
export const qrTypeOrder: readonly QrContentType[] = [
  "url",
  "promptpay",
  "wifi",
  "vcard",
  "text",
  "tel",
  "sms",
  "email",
  "geo",
  "event",
] as const;

/** Every type's SEO record, in display order. */
export const qrTypeSeoList: readonly QrTypeSeo[] = qrTypeOrder.map(
  (type) => qrTypeSeo[type],
);

/** Slug → type, for resolving a route segment back to a content type. */
export const qrTypeBySlug: Record<string, QrContentType> = Object.fromEntries(
  qrTypeSeoList.map((entry) => [entry.slug, entry.type]),
);

/** `true` when a route segment is one of the ten known slugs. */
export function isQrTypeSlug(slug: string): boolean {
  return slug in qrTypeBySlug;
}

/**
 * Home page copy, kept here so the metadata builder has one source for it.
 *
 * Deliberately thin. `src/app/[locale]/layout.tsx` already carries the site
 * title and description as the layout-level default, and the home page is
 * FORMS' surface — this exists so `buildHomeMetadata()` can emit a canonical
 * and hreflang set without anyone re-typing the copy.
 */
export const homeSeo: Bundle<{ title: string; description: string }> = {
  th: {
    title: "สร้าง QR Code ฟรี ครบทุกชนิด รวมพร้อมเพย์",
    description:
      "สร้าง QR Code ฟรีไม่จำกัด ทั้งลิงก์ WiFi นามบัตร พร้อมเพย์ และอีก 6 ชนิด ปรับสี ใส่โลโก้ ดาวน์โหลด PNG SVG PDF ข้อมูลอยู่ในเครื่องจนกว่าจะเลือกบันทึก",
  },
  en: {
    title: "Free QR Code Generator",
    description:
      "Create unlimited QR codes free — links, WiFi, vCard, PromptPay and six more. Add a logo, download PNG, SVG or PDF. Everything is generated in your browser.",
  },
};
