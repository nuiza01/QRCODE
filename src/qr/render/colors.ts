import { normalizeStyle } from "@/qr/quality";
import type { QrStyle } from "@/qr/types";

/**
 * SVG paint is a resource-capable language, not just a color. Accept only the
 * opaque #RGB/#RRGGBB forms in qrStyleSchema; never forward CSS/URL references.
 * Check length too: JavaScript's `$` can match before a trailing newline.
 */
export function canonicalizeRenderColor(value: string): string {
  if (
    typeof value !== "string" ||
    (value.length !== 4 && value.length !== 7) ||
    !/^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(value)
  ) {
    // Fixed, non-sensitive error for callers; QrPreview supplies localized copy.
    // Do not include raw CSS, URLs or user data in the message/cause.
    throw new Error("QR colors must use #RGB or #RRGGBB.");
  }
  const hex = value.slice(1).toLowerCase();
  return `#${hex.length === 3 ? Array.from(hex, (digit) => digit + digit).join("") : hex}`;
}

/** Resource admission only; existing contrast/inversion policy stays in quality.ts. */
export function normalizeRenderStyle(style: QrStyle): QrStyle {
  return normalizeStyle({
    ...style,
    fgColor: canonicalizeRenderColor(style.fgColor),
    bgColor: canonicalizeRenderColor(style.bgColor),
    fgGradient: style.fgGradient ? {
      ...style.fgGradient,
      from: canonicalizeRenderColor(style.fgGradient.from),
      to: canonicalizeRenderColor(style.fgGradient.to),
    } : undefined,
  });
}
