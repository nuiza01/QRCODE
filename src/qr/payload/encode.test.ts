import { describe, expect, it } from "vitest";
import { encodePayload } from "@/qr/payload/encode";
import type { QrPayload } from "@/qr/types";

describe("encodePayload", () => {
  it("escapes WIFI grammar characters in the SSID and password", () => {
    const out = encodePayload({
      type: "wifi",
      ssid: "Cafe;Bar:2",
      password: 'p,ss"word',
      encryption: "WPA",
    });

    expect(out).toBe('WIFI:T:WPA;S:Cafe\\;Bar\\:2;P:p\\,ss\\"word;;');
  });

  it("omits the password for an open network", () => {
    const out = encodePayload({
      type: "wifi",
      ssid: "Guest",
      password: "ignored",
      encryption: "nopass",
    });

    expect(out).toBe("WIFI:T:nopass;S:Guest;;");
  });

  it("escapes vCard separators so the contact does not split into wrong fields", () => {
    const out = encodePayload({
      type: "vcard",
      firstName: "สมชาย",
      lastName: "ใจดี",
      organization: "Nexora; Co, Ltd",
    });

    expect(out).toContain("ORG:Nexora\\; Co\\, Ltd");
    expect(out).toContain("N:ใจดี;สมชาย;;;");
    expect(out.startsWith("BEGIN:VCARD")).toBe(true);
    expect(out.endsWith("END:VCARD")).toBe(true);
  });

  it("percent-encodes mailto parameters instead of using +", () => {
    const out = encodePayload({
      type: "email",
      to: "hi@example.com",
      subject: "Hello there",
    });

    expect(out).toBe("mailto:hi@example.com?subject=Hello%20there");
  });

  it("uses the widely supported SMSTO grammar", () => {
    expect(encodePayload({ type: "sms", phone: "0812345678", message: "hi" })).toBe(
      "SMSTO:0812345678:hi",
    );
  });

  it("emits a date-only DTSTART for an all-day event", () => {
    const out = encodePayload({
      type: "event",
      title: "Launch",
      start: "2026-09-01T00:00:00.000Z",
      allDay: true,
    });

    // VALUE=DATE is required: RFC 5545 defaults these properties to DATE-TIME.
    expect(out).toContain("DTSTART;VALUE=DATE:20260901");
    expect(out).not.toContain("20260901T");
  });

  it("emits a UTC timestamp for a timed event", () => {
    const out = encodePayload({
      type: "event",
      title: "Standup",
      start: "2026-09-01T09:30:00.000Z",
    });

    expect(out).toContain("DTSTART:20260901T093000Z");
  });
});

describe("regressions", () => {
  it("escapes a backslash in the SSID instead of letting it eat the next character", () => {
    const out = encodePayload({
      type: "wifi",
      ssid: "Cafe\\Guest",
      password: "hunter2",
      encryption: "WPA",
    });

    // Unescaped, a scanner reads \G as an escaped G and joins the words.
    expect(out).toContain("S:Cafe\\\\Guest;");
  });

  it("keeps an all-day event on its own calendar date in a +07:00 offset", () => {
    const out = encodePayload({
      type: "event",
      title: "เปิดร้าน",
      start: "2026-08-19T00:00:00+07:00",
      allDay: true,
    });

    // Going through UTC first would emit 20260818 — a day early for every
    // all-day event created in Thailand.
    expect(out).toContain("DTSTART;VALUE=DATE:20260819");
  });
});

describe("structured text newline escaping (CTRL-001)", () => {
  // Explicit wire expectations: CRLF is one newline; a literal backslash+n
  // remains distinguishable from a newline. No blanket control stripping.
  const cases = [
    ["ordinary Unicode", "สมชาย É😀", "สมชาย É😀"],
    ["LF", "A\nB", "A\\nB"],
    ["CRLF", "A\r\nB", "A\\nB"],
    ["lone CR", "A\rB", "A\\nB"],
    ["mixed newlines", "A\r\nB\rC\nD\n\rE\r\rF", "A\\nB\\nC\\nD\\n\\nE\\n\\nF"],
    ["edge newlines", "\rA\r", "\\nA\\n"],
    ["literal backslash+n", "A\\nB", "A\\\\nB"],
    ["backslash/newline/delimiters", "A\\\rB;C,D", "A\\\\\\nB\\;C\\,D"],
    [
      "record markers",
      "SYN\rURL:https://example.invalid/\rEND:VCARD\rEND:VEVENT",
      "SYN\\nURL:https://example.invalid/\\nEND:VCARD\\nEND:VEVENT",
    ],
    ["other controls unchanged", "A\0\t\x7fB", "A\0\t\x7fB"],
  ] as const;

  it.each(cases)("escapes %s in vCard text, preserving structure and input", (_name, value, escaped) => {
    const payload = Object.freeze({
      type: "vcard" as const,
      firstName: value,
      lastName: value,
      organization: value,
      title: value,
      phone: value,
      mobile: value,
      email: value,
      street: value,
      city: value,
      state: value,
      postalCode: value,
      country: value,
      note: value,
    });

    expect(encodePayload(payload)).toBe([
      "BEGIN:VCARD",
      "VERSION:3.0",
      `N:${escaped};${escaped};;;`,
      `FN:${escaped} ${escaped}`,
      `ORG:${escaped}`,
      `TITLE:${escaped}`,
      `TEL;TYPE=WORK,VOICE:${escaped}`,
      `TEL;TYPE=CELL:${escaped}`,
      `EMAIL;TYPE=INTERNET:${escaped}`,
      `ADR;TYPE=WORK:;;${escaped};${escaped};${escaped};${escaped};${escaped}`,
      `NOTE:${escaped}`,
      "END:VCARD",
    ].join("\n"));
  });

  it.each(cases)("escapes %s in Event text, preserving dates and input", (_name, value, escaped) => {
    const payload = Object.freeze({
      type: "event" as const,
      title: value,
      location: value,
      description: value,
      start: "2026-08-28T10:00:00+07:00",
      end: "2026-08-28T11:00:00+07:00",
    });

    expect(encodePayload(payload)).toBe([
      "BEGIN:VEVENT",
      `SUMMARY:${escaped}`,
      "DTSTART:20260828T030000Z",
      "DTEND:20260828T040000Z",
      `LOCATION:${escaped}`,
      `DESCRIPTION:${escaped}`,
      "END:VEVENT",
    ].join("\n"));
  });

  // Website is URI-valued. Lock its existing behavior until URL policy is
  // decided; these direct encoder fixtures do not certify valid URLs.
  it.each([
    ["lone CR", "A\rB", "A\rB"],
    ["LF", "A\nB", "A\\nB"],
    ["CRLF", "A\r\nB", "A\\nB"],
    ["mixed", "A\r\nB\rC\nD", "A\\nB\rC\\nD"],
    ["literal backslash+n and delimiters", "A\\nB;C,D", "A\\\\nB\\;C\\,D"],
    ["percent escapes", "A%0D%0AB", "A%0D%0AB"],
    ["record markers", "A\rURL:SYN\rEND:VCARD", "A\rURL:SYN\rEND:VCARD"],
  ])("preserves vCard website's legacy %s behavior", (_name, suffix, escaped) => {
    expect(encodePayload({
      type: "vcard",
      firstName: "SYN",
      website: `https://example.invalid/${suffix}`,
    })).toBe([
      "BEGIN:VCARD",
      "VERSION:3.0",
      "N:;SYN;;;",
      "FN:SYN",
      `URL:https://example.invalid/${escaped}`,
      "END:VCARD",
    ].join("\n"));
  });

  it.each<[string, QrPayload, string]>([
    ["text", { type: "text", text: "A\r\nB\rC\nD\\n;," }, "A\r\nB\rC\nD\\n;,"],
    ["URL", { type: "url", url: "https://example.invalid/A\rB%0D" }, "https://example.invalid/A\rB%0D"],
    ["SMS", { type: "sms", phone: "0812345678", message: "A\r\nB\rC\nD\\n;," }, "SMSTO:0812345678:A\r\nB\rC\nD\\n;,"],
    ["tel", { type: "tel", phone: "+66 812345678" }, "tel:+66 812345678"],
    ["geo", { type: "geo", latitude: 13.75, longitude: 100.5 }, "geo:13.75,100.5"],
    ["email", { type: "email", to: "syn@example.invalid", subject: "A\rB", body: "C\r\nD\nE\\n;," }, "mailto:syn@example.invalid?subject=A%0DB&body=C%0D%0AD%0AE%5Cn%3B%2C"],
    ["WiFi", { type: "wifi", encryption: "WPA", ssid: "A\rB;", password: " C\r\nD\nE\\n, " }, "WIFI:T:WPA;S:A\rB\\;;P: C\r\nD\nE\\\\n\\, ;;"],
  ])("does not apply structured-text newline policy to %s", (_name, payload, expected) => {
    expect(encodePayload(Object.freeze(payload))).toBe(expected);
  });
});

describe("all-day DTEND is exclusive (RFC 5545 §3.6.1)", () => {
  it("covers a single all-day event by ending on the following day", () => {
    const out = encodePayload({
      type: "event",
      title: "ตลาดนัด",
      start: "2026-08-19T00:00:00+07:00",
      end: "2026-08-19T00:00:00+07:00",
      allDay: true,
    });

    expect(out).toContain("DTSTART;VALUE=DATE:20260819");
    // Emitting 20260819 here would be a zero-length event.
    expect(out).toContain("DTEND;VALUE=DATE:20260820");
  });

  it("rolls over a month and year boundary", () => {
    const out = encodePayload({
      type: "event",
      title: "New Year",
      start: "2026-12-31T00:00:00+07:00",
      end: "2026-12-31T00:00:00+07:00",
      allDay: true,
    });

    expect(out).toContain("DTEND;VALUE=DATE:20270101");
  });

  it("leaves a timed event's DTEND exactly as given", () => {
    const out = encodePayload({
      type: "event",
      title: "Standup",
      start: "2026-09-01T09:30:00.000Z",
      end: "2026-09-01T10:00:00.000Z",
    });

    expect(out).toContain("DTEND:20260901T100000Z");
  });
});
