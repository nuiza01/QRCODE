/**
 * Localized validation messages for the payload schemas.
 *
 * `src/qr/schemas.ts` carries **codes**, not sentences. A schema is shared by
 * the browser form and (from Phase 2) a server route, and neither of those
 * knows the reader's language at the point the rule fires — a server validating
 * a bulk CSV upload has no locale in scope at all. So the schema states which
 * rule broke and this module decides how to say it.
 *
 * Codes are dot-namespaced and stable. They are part of the domain layer's
 * contract: they may end up in an API error body or a log line, so renaming one
 * is a breaking change, while editing the Thai or English text next to it is not.
 *
 * `resolveQrMessage` falls back to the raw code rather than throwing or
 * rendering an empty string. An unmapped code showing up as
 * `promptpay.amount.positive` in the UI is ugly and obviously a bug; a blank
 * red space under a field is neither, and would ship.
 */
import { defaultLocale, t, type Bundle, type Locale } from "@/i18n/config";

/** Every code the schemas can emit. Adding a rule means adding a line here. */
export type QrMessageCode =
  | "common.tooLong"
  | "url.invalid"
  | "url.protocol"
  | "text.required"
  | "text.tooLong"
  | "wifi.ssid.required"
  | "wifi.password.required"
  | "vcard.firstName.required"
  | "email.invalid"
  | "phone.invalid"
  | "phone.unsupportedCharacters"
  | "geo.latitude.required"
  | "geo.latitude.range"
  | "geo.longitude.required"
  | "geo.longitude.range"
  | "event.title.required"
  | "event.start.invalid"
  | "event.end.invalid"
  | "event.end.beforeStart"
  | "promptpay.target.required"
  | "promptpay.target.mobile"
  | "promptpay.target.nationalId"
  | "promptpay.target.ewallet"
  | "promptpay.amount.positive"
  | "promptpay.amount.tooLarge"
  | "promptpay.amount.invalid"
  | "style.color.hex";

export const qrMessages: Bundle<Record<QrMessageCode, string>> = {
  th: {
    "common.tooLong": "ข้อมูลยาวเกินกำหนด",
    "url.invalid": "ลิงก์ไม่ถูกต้อง เช่น https://example.com",
    "url.protocol": "รองรับเฉพาะลิงก์ http:// และ https:// เท่านั้น",
    "text.required": "กรุณากรอกข้อความ",
    "text.tooLong": "ข้อความยาวเกินไป",
    "wifi.ssid.required": "กรุณากรอกชื่อเครือข่าย (SSID)",
    "wifi.password.required": "เครือข่ายที่มีการเข้ารหัสต้องกรอกรหัสผ่าน",
    "vcard.firstName.required": "กรุณากรอกชื่อ",
    "email.invalid": "อีเมลไม่ถูกต้อง",
    "phone.invalid": "เบอร์โทรไม่ถูกต้อง",
    "phone.unsupportedCharacters": "เบอร์โทรมีอักขระที่ไม่รองรับ",
    "geo.latitude.required": "กรุณากรอกละติจูด",
    "geo.latitude.range": "ละติจูดต้องอยู่ระหว่าง -90 ถึง 90",
    "geo.longitude.required": "กรุณากรอกลองจิจูด",
    "geo.longitude.range": "ลองจิจูดต้องอยู่ระหว่าง -180 ถึง 180",
    "event.title.required": "กรุณากรอกชื่อกิจกรรม",
    "event.start.invalid": "เวลาเริ่มไม่ถูกต้อง",
    "event.end.invalid": "เวลาสิ้นสุดไม่ถูกต้อง",
    "event.end.beforeStart": "เวลาสิ้นสุดต้องอยู่หลังเวลาเริ่ม",
    "promptpay.target.required": "กรุณากรอกหมายเลขปลายทาง",
    "promptpay.target.mobile": "หมายเลขโทรศัพท์ไม่ถูกต้อง",
    "promptpay.target.nationalId": "เลขประจำตัวประชาชน/เลขผู้เสียภาษีต้องมี 13 หลัก",
    "promptpay.target.ewallet": "หมายเลข e-Wallet ต้องมี 15 หลัก",
    "promptpay.amount.positive": "จำนวนเงินต้องมากกว่า 0",
    "promptpay.amount.tooLarge": "จำนวนเงินสูงเกินไป",
    "promptpay.amount.invalid": "จำนวนเงินไม่ถูกต้อง",
    "style.color.hex": "ต้องเป็นค่าสีแบบ hex เช่น #1a2b3c",
  },
  en: {
    "common.tooLong": "That is longer than allowed.",
    "url.invalid": "That is not a valid link — try https://example.com",
    "url.protocol": "Only http:// and https:// links are supported.",
    "text.required": "Please enter some text.",
    "text.tooLong": "That text is too long.",
    "wifi.ssid.required": "Please enter the network name (SSID).",
    "wifi.password.required": "A secured network needs a password.",
    "vcard.firstName.required": "Please enter a first name.",
    "email.invalid": "That email address is not valid.",
    "phone.invalid": "That phone number is not valid.",
    "phone.unsupportedCharacters": "That phone number contains unsupported characters.",
    "geo.latitude.required": "Please enter a latitude.",
    "geo.latitude.range": "Latitude must be between -90 and 90.",
    "geo.longitude.required": "Please enter a longitude.",
    "geo.longitude.range": "Longitude must be between -180 and 180.",
    "event.title.required": "Please enter an event name.",
    "event.start.invalid": "That start time could not be read.",
    "event.end.invalid": "That end time could not be read.",
    "event.end.beforeStart": "The end time must be after the start time.",
    "promptpay.target.required": "Please enter the destination number.",
    "promptpay.target.mobile": "That mobile number is not valid.",
    "promptpay.target.nationalId": "A national ID or tax ID must be 13 digits.",
    "promptpay.target.ewallet": "An e-wallet number must be 15 digits.",
    "promptpay.amount.positive": "The amount must be greater than 0.",
    "promptpay.amount.tooLarge": "That amount is too large.",
    "promptpay.amount.invalid": "That amount could not be read.",
    "style.color.hex": "Use a hex colour value, for example #1a2b3c",
  },
};

function isKnownCode(code: string): code is QrMessageCode {
  return Object.prototype.hasOwnProperty.call(qrMessages[defaultLocale], code);
}

/**
 * Code in, sentence out.
 *
 * Anything unmapped comes back unchanged. That covers two real cases: a code
 * added to a schema but not yet to the map, and zod's own built-in messages for
 * checks we never gave a code to. Both are better shown verbatim than swallowed.
 */
export function resolveQrMessage(code: string, locale: Locale = defaultLocale): string {
  return isKnownCode(code) ? t(qrMessages, locale)[code] : code;
}

/** Convenience for the common case: a zod issue whose `message` is our code. */
export function localizeQrIssue(
  issue: { message: string },
  locale: Locale = defaultLocale,
): string {
  return resolveQrMessage(issue.message, locale);
}
