/** UI-only adapter: the domain owns codes, severity and safety thresholds. */
import { type Bundle, type Locale, t } from "@/i18n/config";
import {
  ECC_WITH_LOGO,
  MAX_LOGO_SIZE_RATIO,
  MIN_CONTRAST_RATIO,
  MIN_QUIET_ZONE_MODULES,
  RECOMMENDED_CONTRAST_RATIO,
  type QualityIssue,
} from "@/qr/quality";

type QualityCode =
  | "invalid-color"
  | "contrast-too-low"
  | "contrast-low"
  | "inverted"
  | "quiet-zone-too-small"
  | "logo-needs-high-ecc"
  | "logo-too-large";

// QualityIssue has no structured measured ratio. State the domain thresholds
// instead of parsing Thai prose or recalculating a possibly different gradient
// measurement here. This remains correct when the domain inspects more colors.
const copy: Bundle<Record<QualityCode | "unknown-error" | "unknown-warning", string>> = {
  th: {
    "invalid-color": "รูปแบบสีไม่ถูกต้อง กรุณาใช้ค่าสีแบบ hex เช่น #000000",
    "contrast-too-low": `สีจุดกับสีพื้นตัดกันต่ำกว่าขั้นต่ำ ${MIN_CONTRAST_RATIO}:1 อาจสแกนไม่ออก แนะนำ ${RECOMMENDED_CONTRAST_RATIO}:1 ขึ้นไป`,
    "contrast-low": `สีจุดกับสีพื้นตัดกันต่ำกว่าค่าที่แนะนำ ${RECOMMENDED_CONTRAST_RATIO}:1 อาจสแกนยากในที่แสงน้อย`,
    inverted: "QR แบบกลับสี (พื้นเข้ม จุดสว่าง) เครื่องสแกนหลายรุ่นอ่านไม่ออก แนะนำให้จุดเข้มกว่าพื้น",
    "quiet-zone-too-small": `ขอบว่างรอบ QR ต้องกว้างอย่างน้อย ${MIN_QUIET_ZONE_MODULES} โมดูล`,
    "logo-needs-high-ecc": `ใส่โลโก้แล้วระบบจะปรับระดับการกู้คืนข้อมูลเป็น ${ECC_WITH_LOGO} ให้อัตโนมัติ`,
    "logo-too-large": `โลโก้ใหญ่เกินไป ต้องไม่เกิน ${Math.round(MAX_LOGO_SIZE_RATIO * 100)}% ของความกว้าง QR`,
    "unknown-error": "รูปแบบ QR ไม่ผ่านกฎคุณภาพ กรุณาปรับรูปแบบก่อนดาวน์โหลด",
    "unknown-warning": "รูปแบบ QR นี้อาจสแกนยาก กรุณาทดสอบสแกนก่อนใช้งาน",
  },
  en: {
    "invalid-color": "Invalid color format. Use a hex color such as #000000.",
    "contrast-too-low": `Contrast is below the minimum ${MIN_CONTRAST_RATIO}:1 and may prevent scanning. Aim for ${RECOMMENDED_CONTRAST_RATIO}:1 or higher.`,
    "contrast-low": `Contrast is below the recommended ${RECOMMENDED_CONTRAST_RATIO}:1 and may be hard to scan in low light.`,
    inverted: "Inverted QR colors (light modules on a dark background) fail on many scanners. Use darker modules than the background.",
    "quiet-zone-too-small": `The quiet zone around the QR must be at least ${MIN_QUIET_ZONE_MODULES} modules wide.`,
    "logo-needs-high-ecc": `Adding a logo automatically forces error correction to ${ECC_WITH_LOGO}.`,
    "logo-too-large": `The logo is too large. It must not exceed ${Math.round(MAX_LOGO_SIZE_RATIO * 100)}% of the QR width.`,
    "unknown-error": "This QR style fails a quality rule. Adjust the style before downloading.",
    "unknown-warning": "This QR style may be difficult to scan. Test it before use.",
  },
};

export function qualityMessage(issue: QualityIssue, locale: Locale): string {
  const messages = t(copy, locale);
  return Object.hasOwn(messages, issue.code)
    ? messages[issue.code as QualityCode]
    : messages[issue.level === "error" ? "unknown-error" : "unknown-warning"];
}
