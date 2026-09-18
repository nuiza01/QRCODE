import { describe, expect, it } from "vitest";

import { locales, type Locale } from "@/i18n/config";
import type { QrContentType } from "@/qr/types";
import { homeSeo, isQrTypeSlug, qrTypeBySlug, qrTypeOrder, qrTypeSeo, qrTypeSeoList } from "@/seo/content";

/**
 * The frozen slug table from `docs/ROUTES_AND_SEO.md`, transcribed.
 *
 * Duplicated here on purpose. The point of a frozen spec is that changing the
 * code cannot silently change the contract, so this array is the second
 * signature: editing a slug in `src/seo/content/*` without editing the spec
 * (and this list) fails the suite.
 */
const FROZEN_SLUGS: Record<QrContentType, string> = {
  url: "url",
  text: "text",
  wifi: "wifi",
  vcard: "vcard",
  email: "email",
  sms: "sms",
  tel: "tel",
  geo: "geo",
  event: "event",
  promptpay: "promptpay",
};

/** The frozen H1 targets, also from `docs/ROUTES_AND_SEO.md`. */
const FROZEN_H1: Record<QrContentType, Record<Locale, string>> = {
  url: { th: "สร้าง QR Code จากลิงก์", en: "URL QR code generator" },
  text: { th: "สร้าง QR Code จากข้อความ", en: "Text QR code generator" },
  wifi: { th: "สร้าง QR Code WiFi", en: "WiFi QR code generator" },
  vcard: { th: "สร้าง QR Code นามบัตร", en: "vCard QR code generator" },
  email: { th: "สร้าง QR Code อีเมล", en: "Email QR code generator" },
  sms: { th: "สร้าง QR Code SMS", en: "SMS QR code generator" },
  tel: { th: "สร้าง QR Code เบอร์โทร", en: "Phone QR code generator" },
  geo: { th: "สร้าง QR Code พิกัดแผนที่", en: "Location QR code generator" },
  event: { th: "สร้าง QR Code นัดหมาย", en: "Event QR code generator" },
  promptpay: {
    th: "สร้าง QR Code พร้อมเพย์ รับเงิน",
    en: "PromptPay QR code generator",
  },
};

const ALL_TYPES = Object.keys(FROZEN_SLUGS) as QrContentType[];

/**
 * Budgets, not style opinions.
 *
 * The title limit leaves room for the ` · Nexora QR` suffix that the locale
 * layout's title template appends before a SERP ever sees it. The description
 * floor exists because a two-word description is a worse signal than none.
 */
const MAX_TITLE = 55;
const MIN_DESCRIPTION = 70;
const MAX_DESCRIPTION = 170;

describe("registry completeness", () => {
  it("has an entry for every QrContentType", () => {
    expect(Object.keys(qrTypeSeo).sort()).toEqual([...ALL_TYPES].sort());
  });

  it("orders every type exactly once", () => {
    expect([...qrTypeOrder].sort()).toEqual([...ALL_TYPES].sort());
    expect(new Set(qrTypeOrder).size).toBe(qrTypeOrder.length);
  });

  it("exposes all ten types in the ordered list", () => {
    expect(qrTypeSeoList).toHaveLength(10);
  });

  it("keys each entry by its own type", () => {
    for (const type of ALL_TYPES) {
      expect(qrTypeSeo[type].type).toBe(type);
    }
  });
});

describe("slugs", () => {
  it("match the frozen table in docs/ROUTES_AND_SEO.md", () => {
    for (const type of ALL_TYPES) {
      expect(qrTypeSeo[type].slug).toBe(FROZEN_SLUGS[type]);
    }
  });

  it("are unique", () => {
    const slugs = qrTypeSeoList.map((entry) => entry.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("are URL-safe ASCII — Thai-script URLs percent-encode unreadably", () => {
    for (const entry of qrTypeSeoList) {
      expect(entry.slug).toMatch(/^[a-z0-9-]+$/);
      expect(encodeURIComponent(entry.slug)).toBe(entry.slug);
    }
  });

  it("resolve back to their type", () => {
    for (const type of ALL_TYPES) {
      const slug = qrTypeSeo[type].slug;
      expect(qrTypeBySlug[slug]).toBe(type);
      expect(isQrTypeSlug(slug)).toBe(true);
    }
    expect(isQrTypeSlug("not-a-type")).toBe(false);
  });
});

describe.each(locales)("content for locale %s", (locale) => {
  it.each(ALL_TYPES)("%s has non-empty copy in every required field", (type) => {
    const content = qrTypeSeo[type].content[locale];

    for (const [field, value] of Object.entries({
      title: content.title,
      description: content.description,
      h1: content.h1,
      lead: content.lead,
      shortLabel: content.shortLabel,
      privacyNote: content.privacyNote,
    })) {
      expect(value.trim(), `${type}/${locale}.${field}`).not.toBe("");
      // Untrimmed padding leaks straight into a <title>.
      expect(value, `${type}/${locale}.${field}`).toBe(value.trim());
    }
  });

  it.each(ALL_TYPES)("%s keeps the title within budget", (type) => {
    const { title } = qrTypeSeo[type].content[locale];
    expect(title.length, `${type}/${locale} title is ${title.length} chars`).toBeLessThanOrEqual(
      MAX_TITLE,
    );
  });

  it.each(ALL_TYPES)("%s keeps the description within budget", (type) => {
    const { description } = qrTypeSeo[type].content[locale];
    expect(
      description.length,
      `${type}/${locale} description is ${description.length} chars`,
    ).toBeGreaterThanOrEqual(MIN_DESCRIPTION);
    expect(
      description.length,
      `${type}/${locale} description is ${description.length} chars`,
    ).toBeLessThanOrEqual(MAX_DESCRIPTION);
  });

  it.each(ALL_TYPES)("%s uses the frozen H1 target", (type) => {
    expect(qrTypeSeo[type].content[locale].h1).toBe(FROZEN_H1[type][locale]);
  });

  it.each(ALL_TYPES)("%s has a usable how-to sequence", (type) => {
    const { steps } = qrTypeSeo[type].content[locale];
    expect(steps.length).toBeGreaterThanOrEqual(3);
    // Past five steps nobody reads them, and it stops being a "short" sequence.
    expect(steps.length).toBeLessThanOrEqual(5);
    for (const step of steps) {
      expect(step.title.trim()).not.toBe("");
      expect(step.body.trim()).not.toBe("");
    }
  });

  it.each(ALL_TYPES)("%s has no empty FAQ or section entries", (type) => {
    const content = qrTypeSeo[type].content[locale];
    for (const faq of content.faqs) {
      expect(faq.question.trim()).not.toBe("");
      expect(faq.answer.trim()).not.toBe("");
      // A one-line answer is what a fabricated FAQ looks like.
      expect(faq.answer.length).toBeGreaterThan(40);
    }
    for (const section of content.sections) {
      expect(section.heading.trim()).not.toBe("");
      expect(section.body.trim()).not.toBe("");
    }
  });

  it.each(ALL_TYPES)("%s FAQ questions are unique", (type) => {
    const questions = qrTypeSeo[type].content[locale].faqs.map((faq) => faq.question);
    expect(new Set(questions).size).toBe(questions.length);
  });
});

describe("locale parity", () => {
  it.each(ALL_TYPES)("%s has the same structure in both locales", (type) => {
    const th = qrTypeSeo[type].content.th;
    const en = qrTypeSeo[type].content.en;
    expect(th.steps.length).toBe(en.steps.length);
    expect(th.sections.length).toBe(en.sections.length);
    expect(th.faqs.length).toBe(en.faqs.length);
  });

  it.each(ALL_TYPES)("%s Thai copy is actually Thai, not untranslated English", (type) => {
    const th = qrTypeSeo[type].content.th;
    const thaiScript = /[฀-๿]/;
    expect(thaiScript.test(th.title)).toBe(true);
    expect(thaiScript.test(th.description)).toBe(true);
    expect(thaiScript.test(th.h1)).toBe(true);
    expect(thaiScript.test(th.lead)).toBe(true);
    expect(thaiScript.test(th.privacyNote)).toBe(true);
    // And it is not a copy of the English string.
    expect(th.lead).not.toBe(qrTypeSeo[type].content.en.lead);
  });
});

describe("the privacy differentiator", () => {
  it.each(ALL_TYPES)("%s distinguishes local generation from an explicit account save", (type) => {
    const th = qrTypeSeo[type].content.th.privacyNote;
    const en = qrTypeSeo[type].content.en.privacyNote;
    expect(th).toMatch(/เบราว์เซอร์/);
    expect(th).toMatch(/กดบันทึก QR/);
    expect(th).toMatch(/บัญชี/);
    expect(en.toLowerCase()).toMatch(/browser/);
    expect(en).toMatch(/Save QR/);
    expect(en.toLowerCase()).toMatch(/account/);
    expect(en.toLowerCase()).not.toMatch(/nothing is (uploaded|stored|logged)/);
  });
});

describe("promptpay is the priority page", () => {
  const promptpay = qrTypeSeo.promptpay;

  it.each(locales)("carries more depth than any sibling in %s", (locale) => {
    const content = promptpay.content[locale];
    const others = qrTypeSeoList
      .filter((entry) => entry.type !== "promptpay")
      .map((entry) => entry.content[locale]);

    expect(content.faqs.length).toBeGreaterThan(
      Math.max(...others.map((other) => other.faqs.length)),
    );
    expect(content.sections.length).toBeGreaterThan(
      Math.max(...others.map((other) => other.sections.length)),
    );
  });

  it("covers all three target kinds in Thai", () => {
    const prose = [
      promptpay.content.th.lead,
      ...promptpay.content.th.steps.map((step) => step.body),
      ...promptpay.content.th.sections.map((section) => section.body),
      ...promptpay.content.th.faqs.map((faq) => faq.answer),
    ].join(" ");

    expect(prose).toMatch(/เบอร์มือถือ/);
    expect(prose).toMatch(/บัตรประชาชน|ประจำตัวประชาชน/);
    expect(prose).toMatch(/e-Wallet/i);
  });

  it("explains that a fixed amount makes the code single-use", () => {
    const th = promptpay.content.th.sections.map((section) => section.body).join(" ");
    expect(th).toMatch(/ใช้ครั้งเดียว/);
    expect(th).toMatch(/ใช้ซ้ำ/);

    const en = promptpay.content.en.sections.map((section) => section.body).join(" ");
    expect(en).toMatch(/single-use/);
    expect(en).toMatch(/reusable/);
  });

  it("tells the user to verify with a banking app", () => {
    const th = promptpay.content.th.steps.map((step) => step.body).join(" ");
    expect(th).toMatch(/แอปธนาคาร/);
  });

  it("explains the PromptPay server boundary before and after an explicit save", () => {
    expect(promptpay.content.th.privacyNote).toMatch(/ไม่ถูกส่งขึ้นเซิร์ฟเวอร์ระหว่างสร้างหรือดาวน์โหลด/);
    expect(promptpay.content.th.privacyNote).toMatch(/กดบันทึก QR/);
    expect(promptpay.content.en.privacyNote.toLowerCase()).toMatch(/not sent to our server while you generate or download/);
    expect(promptpay.content.en.privacyNote).toMatch(/Save QR/);
  });
});

describe("home copy", () => {
  it.each(locales)("has a title and description in %s", (locale) => {
    expect(homeSeo[locale].title.trim()).not.toBe("");
    expect(homeSeo[locale].title.length).toBeLessThanOrEqual(MAX_TITLE);
    expect(homeSeo[locale].description.length).toBeGreaterThanOrEqual(MIN_DESCRIPTION);
    expect(homeSeo[locale].description.length).toBeLessThanOrEqual(MAX_DESCRIPTION);
  });
});
