import { describe, expect, it } from "vitest";

import { locales } from "@/i18n/config";

import { privacyStrings, termsStrings } from "./legal-strings";

function privacyProse(locale: (typeof locales)[number]): string {
  const page = privacyStrings[locale];
  return [
    page.title,
    page.description,
    ...page.sections.flatMap((section) => [section.heading, ...section.paragraphs]),
  ].join(" ");
}

describe("Phase 2A privacy disclosure", () => {
  it.each(locales)("covers account persistence and explicit saved-QR storage in %s", (locale) => {
    const prose = privacyProse(locale);

    if (locale === "th") {
      expect(prose).toMatch(/กด “บันทึก QR”/);
      expect(prose).toMatch(/payload/);
      expect(prose).toMatch(/รหัสผ่าน WiFi/);
      expect(prose).toMatch(/ข้อมูลผู้ใช้ session และบัญชี Google/);
    } else {
      expect(prose).toMatch(/press “Save QR”/);
      expect(prose).toMatch(/generation payload/);
      expect(prose).toMatch(/WiFi password/);
      expect(prose).toMatch(/user, session, and Google provider-account records/);
    }
  });

  it.each(locales)("states implemented deletion and backup limits without instant-erasure claims in %s", (locale) => {
    const prose = privacyProse(locale);

    if (locale === "th") {
      expect(prose).toMatch(/ลบผ่านแดชบอร์ด/);
      expect(prose).toMatch(/ยังไม่มีเมนูให้ทำเอง/);
      expect(prose).toMatch(/ไม่อ้างว่า.*สำเนาสำรองทั้งหมดทันที/);
    } else {
      expect(prose).toMatch(/delete it from the dashboard/);
      expect(prose).toMatch(/Self-service deletion of the entire account is not yet available/);
      expect(prose).toMatch(/do not claim.*immediately removes every backup copy/);
    }
  });

  it.each(locales)("separates inactive analytics from the no-raw-IP contract in %s", (locale) => {
    const prose = privacyProse(locale);

    expect(prose).toMatch(/30/);
    if (locale === "th") {
      expect(prose).toMatch(/ไม่ให้บันทึก IP address ดิบไว้ใน session/);
      expect(prose).toMatch(/ยังไม่เก็บเหตุการณ์สแกนหรือข้อมูล analytics/);
    } else {
      expect(prose).toMatch(/not to persist raw IP addresses in session records/);
      expect(prose).toMatch(/does not collect scan events or analytics/);
    }
  });

  it.each(locales)("contains no obsolete stateless-account claim in %s", (locale) => {
    const prose = privacyProse(locale).toLowerCase();

    expect(prose).not.toContain("ไม่มีฐานข้อมูลบัญชี");
    expect(prose).not.toContain("there is no account database");
  });

  it.each(locales)("names the current hosting and database processor in %s", (locale) => {
    const prose = privacyProse(locale);

    expect(prose).toMatch(/HostAtom/);
    expect(prose).toMatch(/MariaDB/);
    expect(prose).toMatch(/Google/);
  });

  it.each(locales)("separates the 25 Static allowance from inactive Dynamic QR in %s", (locale) => {
    const privacy = privacyProse(locale);
    const terms = termsStrings[locale].sections
      .flatMap((section) => [section.heading, ...section.paragraphs])
      .join(" ");

    expect(privacy).toMatch(/25/);
    expect(privacy).toMatch(/5|five/);
    expect(terms).toMatch(/25/);
    expect(terms).toMatch(/5|five/);
    if (locale === "th") {
      expect(privacy).toMatch(/Static QR/);
      expect(privacy).toMatch(/Dynamic QR.*ยังไม่เปิดใช้งาน/);
      expect(terms).toMatch(/Dynamic QR.*ยังไม่เปิดใช้งาน/);
    } else {
      expect(privacy).toMatch(/saved Static QR codes/);
      expect(privacy).toMatch(/Dynamic QR allowance.*not active/);
      expect(terms).toMatch(/Dynamic QR allowance.*not yet active/);
    }
  });
});
