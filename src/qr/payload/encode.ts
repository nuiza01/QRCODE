/**
 * Turns a structured payload into the exact string that goes into the symbol.
 *
 * Escaping matters more than it looks: an SSID containing a semicolon or a
 * contact name containing a comma will silently produce a QR that scans but
 * decodes into the wrong thing, which is the worst possible failure mode for
 * something a customer prints on 5,000 signs.
 */
import type {
  EmailPayload,
  EventPayload,
  GeoPayload,
  QrPayload,
  SmsPayload,
  TelPayload,
  VCardPayload,
  WifiPayload,
} from "@/qr/types";
import { encodePromptPay } from "@/qr/payload/promptpay";

/**
 * WIFI: and MECARD-family grammars reserve \ ; , : and "
 *
 * The backslash must be in the class too, not just the separators it escapes.
 * Leaving it out means an SSID like `Cafe\Guest` reaches the scanner unescaped,
 * which decodes as `CafeGuest` — a network name that silently does not exist.
 */
function escapeWifi(value: string): string {
  return value.replace(/([\\;,:"])/g, "\\$1");
}

/** vCard text values reserve \ ; , and newline (RFC 6350 §3.4). */
function escapeVCard(value: string, preserveLoneCR = false): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(preserveLoneCR ? /\r?\n/g : /\r\n|[\r\n]/g, "\\n");
}

function encodeWifi(p: WifiPayload): string {
  const parts = [`T:${p.encryption}`, `S:${escapeWifi(p.ssid)}`];
  if (p.encryption !== "nopass" && p.password) {
    parts.push(`P:${escapeWifi(p.password)}`);
  }
  if (p.hidden) {
    parts.push("H:true");
  }
  return `WIFI:${parts.join(";")};;`;
}

function encodeVCard(p: VCardPayload): string {
  const lines = ["BEGIN:VCARD", "VERSION:3.0"];

  const last = escapeVCard(p.lastName ?? "");
  const first = escapeVCard(p.firstName);
  lines.push(`N:${last};${first};;;`);
  lines.push(`FN:${escapeVCard([p.firstName, p.lastName].filter(Boolean).join(" "))}`);

  if (p.organization) lines.push(`ORG:${escapeVCard(p.organization)}`);
  if (p.title) lines.push(`TITLE:${escapeVCard(p.title)}`);
  if (p.phone) lines.push(`TEL;TYPE=WORK,VOICE:${escapeVCard(p.phone)}`);
  if (p.mobile) lines.push(`TEL;TYPE=CELL:${escapeVCard(p.mobile)}`);
  if (p.email) lines.push(`EMAIL;TYPE=INTERNET:${escapeVCard(p.email)}`);
  // Website is URI-valued: retain its existing escaping until URL policy is
  // decided, including raw lone CR. Do not apply the text newline repair here.
  if (p.website) lines.push(`URL:${escapeVCard(p.website, true)}`);

  const address = [p.street, p.city, p.state, p.postalCode, p.country];
  if (address.some(Boolean)) {
    const [street, city, state, postalCode, country] = address.map((v) =>
      escapeVCard(v ?? ""),
    );
    lines.push(`ADR;TYPE=WORK:;;${street};${city};${state};${postalCode};${country}`);
  }

  if (p.note) lines.push(`NOTE:${escapeVCard(p.note)}`);

  lines.push("END:VCARD");
  return lines.join("\n");
}

/**
 * Built by hand rather than with URLSearchParams: that encodes a space as "+",
 * which mail clients render literally in a subject line instead of as a space.
 */
function encodeEmail(p: EmailPayload): string {
  const params: string[] = [];
  if (p.subject) params.push(`subject=${encodeURIComponent(p.subject)}`);
  if (p.body) params.push(`body=${encodeURIComponent(p.body)}`);
  const suffix = params.join("&");
  return `mailto:${p.to}${suffix ? `?${suffix}` : ""}`;
}

/**
 * SMSTO: rather than sms: — the ZXing-era grammar is what the widest range of
 * scanner apps actually recognizes, including most native camera apps.
 */
function encodeSms(p: SmsPayload): string {
  return p.message ? `SMSTO:${p.phone}:${p.message}` : `SMSTO:${p.phone}`;
}

function encodeTel(p: TelPayload): string {
  return `tel:${p.phone}`;
}

function encodeGeo(p: GeoPayload): string {
  return `geo:${p.latitude},${p.longitude}`;
}

/**
 * iCalendar basic format: YYYYMMDD for all-day, YYYYMMDDTHHMMSSZ otherwise.
 *
 * All-day dates are read straight off the ISO string rather than via UTC. A
 * Bangkok midnight (`2026-08-19T00:00:00+07:00`) converts to 17:00 on the 18th
 * in UTC, so normalizing first would shift every all-day event in Thailand back
 * by one day. An all-day date has no timezone — it is the date as written.
 */
function formatIcsDate(iso: string, allDay: boolean): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    throw new Error(`Invalid event date: ${iso}`);
  }

  if (allDay) {
    const calendarDate = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
    if (!calendarDate) {
      throw new Error(`Invalid event date: ${iso}`);
    }
    const [, year, month, day] = calendarDate;
    return `${year}${month}${day}`;
  }

  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

/**
 * RFC 5545 defaults DTSTART/DTEND to DATE-TIME, so a bare 8-digit value has to
 * be tagged `VALUE=DATE` or strict parsers reject the whole event.
 */
function icsDateProperty(name: "DTSTART" | "DTEND", iso: string, allDay: boolean): string {
  return allDay
    ? `${name};VALUE=DATE:${formatIcsDate(iso, true)}`
    : `${name}:${formatIcsDate(iso, false)}`;
}

/**
 * Advances a `YYYYMMDD` stamp by one day, rolling months and years over.
 *
 * Uses UTC arithmetic on purpose: an all-day date carries no zone, so building
 * a local `Date` would reintroduce the offset bug this file already fixed once.
 */
function nextIcsDay(stamp: string): string {
  const year = Number(stamp.slice(0, 4));
  const month = Number(stamp.slice(4, 6));
  const day = Number(stamp.slice(6, 8));
  const next = new Date(Date.UTC(year, month - 1, day + 1));
  return (
    `${next.getUTCFullYear()}` +
    `${String(next.getUTCMonth() + 1).padStart(2, "0")}` +
    `${String(next.getUTCDate()).padStart(2, "0")}`
  );
}

function escapeIcs(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r\n|[\r\n]/g, "\\n");
}

function encodeEvent(p: EventPayload): string {
  const allDay = p.allDay ?? false;
  const lines = ["BEGIN:VEVENT", `SUMMARY:${escapeIcs(p.title)}`];

  lines.push(icsDateProperty("DTSTART", p.start, allDay));

  if (p.end) {
    // RFC 5545 §3.6.1: for DATE values DTEND is *exclusive* — it names the first
    // day no longer covered. A user who says "19 Aug to 19 Aug" means one full
    // day, so the wire value has to be the 20th. Emitting the 19th produces a
    // zero-length event that strict calendars drop entirely.
    lines.push(
      allDay
        ? `DTEND;VALUE=DATE:${nextIcsDay(formatIcsDate(p.end, true))}`
        : icsDateProperty("DTEND", p.end, false),
    );
  }
  if (p.location) lines.push(`LOCATION:${escapeIcs(p.location)}`);
  if (p.description) lines.push(`DESCRIPTION:${escapeIcs(p.description)}`);

  lines.push("END:VEVENT");
  return lines.join("\n");
}

export function encodePayload(payload: QrPayload): string {
  switch (payload.type) {
    case "url":
      return payload.url;
    case "text":
      return payload.text;
    case "wifi":
      return encodeWifi(payload);
    case "vcard":
      return encodeVCard(payload);
    case "email":
      return encodeEmail(payload);
    case "sms":
      return encodeSms(payload);
    case "tel":
      return encodeTel(payload);
    case "geo":
      return encodeGeo(payload);
    case "event":
      return encodeEvent(payload);
    case "promptpay":
      return encodePromptPay(payload);
  }
}
