/**
 * Scan-reliability rules.
 *
 * A QR code that renders is not a QR code that scans. Every rule here exists
 * because breaking it produces a symbol that looks perfect on screen and fails
 * on a phone camera in a shop — after the customer has already paid a printer.
 * These are enforced, not merely suggested: `normalizeStyle` clamps the style
 * before it ever reaches the renderer.
 */
import type { EccLevel, QrStyle } from "@/qr/types";

/** ISO/IEC 18004 requires a 4-module quiet zone. Below it, scanners miss the finder pattern. */
export const MIN_QUIET_ZONE_MODULES = 4;

/** A logo eats error-correction budget. Past ~25% of area even level H fails. */
export const MAX_LOGO_SIZE_RATIO = 0.25;

/** Any logo forces level H — it is the only level with headroom to spare. */
export const ECC_WITH_LOGO: EccLevel = "H";

/** Below this contrast ratio, cheap camera sensors stop separating the modules. */
export const MIN_CONTRAST_RATIO = 3;
export const RECOMMENDED_CONTRAST_RATIO = 7;

export type IssueLevel = "error" | "warning";

export interface QualityIssue {
  level: IssueLevel;
  code: string;
  /** User-facing Thai copy. */
  message: string;
}

function parseHex(color: string): [number, number, number] | null {
  const hex = color.trim().replace(/^#/, "");
  const full =
    hex.length === 3
      ? hex
          .split("")
          .map((c) => c + c)
          .join("")
      : hex;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return null;
  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
  ];
}

function rgbLuminance(rgb: readonly number[]): number {
  const [r, g, b] = rgb.map((channel) => {
    const s = channel / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG relative luminance. */
export function relativeLuminance(color: string): number | null {
  const rgb = parseHex(color);
  return rgb ? rgbLuminance(rgb) : null;
}

/** WCAG contrast ratio, 1 (identical) to 21 (black on white). */
export function contrastRatio(a: string, b: string): number | null {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  if (la === null || lb === null) return null;
  const [light, dark] = la >= lb ? [la, lb] : [lb, la];
  return (light + 0.05) / (dark + 0.05);
}

/**
 * Conservative contrast over the entire two-stop RGB gradient, not a sampled
 * set of colors. Each interpolated channel stays between its endpoint values;
 * luminance is increasing in every channel. Channel-wise minima/maxima thus
 * bound every color for both sRGB and linear-RGB interpolation, regardless of
 * linear/radial geometry or rotation. An overlapping background interval has
 * a lower contrast bound of 1. Mixed-channel gradients may be rejected even
 * when their actual path is safe; do not claim an exact measured scan ratio.
 */
function styleContrastRatio(style: QrStyle): number | null {
  if (!style.fgGradient) return contrastRatio(style.fgColor, style.bgColor);
  const from = parseHex(style.fgGradient.from);
  const to = parseHex(style.fgGradient.to);
  const bg = relativeLuminance(style.bgColor);
  if (!from || !to || bg === null) return null;

  const low = rgbLuminance(from.map((channel, i) => Math.min(channel, to[i])));
  const high = rgbLuminance(from.map((channel, i) => Math.max(channel, to[i])));
  if (bg > high) return (bg + 0.05) / (high + 0.05);
  if (bg < low) return (low + 0.05) / (bg + 0.05);
  return 1;
}

/**
 * True when a foreground color/gradient endpoint is lighter than the background. Plenty of scanners —
 * including several native camera apps — only look for dark-on-light and will
 * refuse an inverted symbol outright.
 */
export function isInverted(style: QrStyle): boolean {
  const bg = relativeLuminance(style.bgColor);
  if (bg === null) return false;
  const colors = style.fgGradient
    ? [style.fgGradient.from, style.fgGradient.to]
    : [style.fgColor];
  return colors.some((color) => {
    const fg = relativeLuminance(color);
    return fg !== null && fg > bg;
  });
}

/**
 * Minimum printed width. The field rule of thumb is that a symbol must be at
 * least a tenth of its intended scan distance, with a hard floor around 20 mm
 * for anything a phone has to focus on.
 */
export function minPrintSizeMm(scanDistanceMm: number): number {
  return Math.max(20, Math.round(scanDistanceMm / 10));
}

/**
 * Applies the hard rules. Call this before rendering or persisting — the UI
 * should show `inspectStyle` warnings, but correctness must not depend on the
 * user reading them.
 */
export function normalizeStyle(style: QrStyle): QrStyle {
  const hasLogo = Boolean(style.logoUrl);
  return {
    ...style,
    marginModules: Math.max(MIN_QUIET_ZONE_MODULES, Math.floor(style.marginModules)),
    ecc: hasLogo ? ECC_WITH_LOGO : style.ecc,
    logoSizeRatio: hasLogo
      ? Math.min(MAX_LOGO_SIZE_RATIO, style.logoSizeRatio ?? MAX_LOGO_SIZE_RATIO)
      : undefined,
  };
}

/** Everything worth telling the user about a style, in Thai. */
export function inspectStyle(style: QrStyle): QualityIssue[] {
  const issues: QualityIssue[] = [];

  const ratio = styleContrastRatio(style);
  if (ratio === null) {
    issues.push({
      level: "error",
      code: "invalid-color",
      message: "รูปแบบสีไม่ถูกต้อง กรุณาใช้ค่าสีแบบ hex เช่น #000000",
    });
  } else if (ratio < MIN_CONTRAST_RATIO) {
    issues.push({
      level: "error",
      code: "contrast-too-low",
      message: `สีจุดกับสีพื้นตัดกันน้อยเกินไป (${ratio.toFixed(1)}:1) กล้องมือถือจะอ่านไม่ออก ควรอยู่ที่ ${RECOMMENDED_CONTRAST_RATIO}:1 ขึ้นไป`,
    });
  } else if (ratio < RECOMMENDED_CONTRAST_RATIO) {
    issues.push({
      level: "warning",
      code: "contrast-low",
      message: `สีตัดกัน ${ratio.toFixed(1)}:1 ยังสแกนได้แต่เสี่ยงในที่แสงน้อย แนะนำ ${RECOMMENDED_CONTRAST_RATIO}:1 ขึ้นไป`,
    });
  }

  if (isInverted(style)) {
    issues.push({
      level: "warning",
      code: "inverted",
      message: "QR แบบกลับสี (พื้นเข้ม จุดสว่าง) เครื่องสแกนหลายรุ่นอ่านไม่ออก แนะนำให้จุดเข้มกว่าพื้น",
    });
  }

  if (style.marginModules < MIN_QUIET_ZONE_MODULES) {
    issues.push({
      level: "error",
      code: "quiet-zone-too-small",
      message: `ขอบขาวรอบ QR ต้องกว้างอย่างน้อย ${MIN_QUIET_ZONE_MODULES} โมดูล`,
    });
  }

  if (style.logoUrl) {
    if (style.ecc !== ECC_WITH_LOGO) {
      issues.push({
        level: "warning",
        code: "logo-needs-high-ecc",
        message: "ใส่โลโก้แล้วระบบจะปรับระดับการกู้คืนข้อมูลเป็น H ให้อัตโนมัติ",
      });
    }
    if ((style.logoSizeRatio ?? 0) > MAX_LOGO_SIZE_RATIO) {
      issues.push({
        level: "error",
        code: "logo-too-large",
        message: `โลโก้ใหญ่เกินไป ต้องไม่เกิน ${Math.round(MAX_LOGO_SIZE_RATIO * 100)}% ของความกว้าง QR`,
      });
    }
  }

  return issues;
}

export function hasBlockingIssue(issues: QualityIssue[]): boolean {
  return issues.some((issue) => issue.level === "error");
}
