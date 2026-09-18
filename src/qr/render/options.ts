/**
 * Pure mapping from our domain `QrStyle` onto `qr-code-styling`'s options.
 *
 * Nothing in this file touches the DOM, and the only thing it borrows from
 * `qr-code-styling` is its *types*, which erase at compile time. That is
 * deliberate: the library dereferences `document` at import time, so any module
 * that can be reached from a server component — this one is, through the
 * barrel — must never pull it in at runtime.
 */
import type {
  CornerDotType,
  CornerSquareType,
  DotType,
  Gradient as StylingGradient,
  Options as StylingOptions,
} from "qr-code-styling";
import { MIN_QUIET_ZONE_MODULES } from "@/qr/quality";
import { canonicalizeRenderColor, normalizeRenderStyle } from "@/qr/render/colors";
import { assertPreparedLogoForVendor } from "@/qr/render/logo";
import type { EccLevel, QrGradient, QrStyle } from "@/qr/types";

/**
 * Share of the symbol a level can lose and still decode. Copied from
 * `qr-code-styling/constants/errorCorrectionPercents` rather than imported,
 * because importing it would be a runtime import of the library.
 */
const ERROR_CORRECTION_PERCENTS: Record<EccLevel, number> = {
  L: 0.07,
  M: 0.15,
  Q: 0.25,
  H: 0.3,
};

/**
 * Provisional module count for the very first pass, before the symbol has been
 * encoded and the real count is known. Version 4 — a typical short URL. The
 * renderer corrects the margin from the real count immediately afterwards, so
 * this only decides how close the first frame is, never the final geometry.
 */
export const PREVIEW_MODULE_COUNT_HINT = 33;

/** Smallest and largest symbols the format allows: version 1 and version 40. */
export const MIN_MODULE_COUNT = 21;
export const MAX_MODULE_COUNT = 177;

export type DrawType = "canvas" | "svg";

/**
 * Whether the library snaps the module size to whole pixels.
 *
 * Raster output wants it: uneven module widths (some 14 px, some 15 px) is
 * exactly the artefact that makes a printed code marginal. Vector output does
 * not — there is no pixel grid to snap to, and a fractional module size lets
 * the quiet zone come out at exactly the requested width instead of rounding up.
 */
export function roundSizeForDrawType(drawType: DrawType): boolean {
  return drawType === "canvas";
}

/**
 * ## The quiet zone: modules in, pixels out
 *
 * Ours is a module count; the library's `margin` is a pixel inset. They are not
 * interchangeable, because the library derives the module size from whatever is
 * left over after the margin (`QRSVG.drawDots`):
 *
 * ```
 * minSize = size - 2 * margin
 * dotSize = roundSize(minSize / count)      // count = modules across the symbol
 * xBegin  = (size - count * dotSize) / 2    // where the symbol actually starts
 * ```
 *
 * The rendered quiet zone is `xBegin`, **not** `margin` — passing
 * `marginModules` straight through as pixels would put a 4-pixel quiet zone on
 * a 1024-pixel export, about a sixth of one module, and the code would fail on
 * a phone in a shop while looking perfect on the design.
 *
 * ### Vector output (`roundSize` off)
 *
 * With a fractional module size the algebra closes exactly. We want the artwork
 * to be `count + 2q` modules across, so `dotSize = size / (count + 2q)` and
 *
 * ```
 * margin = q * dotSize = size * q / (count + 2q)
 * ```
 *
 * Substituting back gives `minSize = size * count / (count + 2q)`,
 * `dotSize = size / (count + 2q)` and `xBegin = margin`. The quiet zone is
 * exactly `q` modules — no rounding anywhere.
 *
 * ### Raster output (`roundSize` on)
 *
 * The library floors `dotSize`, so solving for `margin` first and hoping is not
 * enough: floor can eat enough of `minSize` to drop the module size a whole
 * pixel, which pushes the quiet zone the *wrong* way. Work the other direction
 * instead — pick the module size first, then centre the symbol:
 *
 * ```
 * dotSize = floor(size / (count + 2q))      // biggest whole-pixel module that leaves q
 * margin  = floor((size - dotSize * count) / 2)
 * ```
 *
 * The library re-derives the same `dotSize` from that margin (the floor of
 * `(size - 2*margin) / count` is `dotSize` for any `count > 1`), and the
 * rendered quiet zone is `(size - dotSize*count) / 2`, which is at least `q`
 * modules because `dotSize <= size / (count + 2q)` by construction. Any slack
 * from the flooring lands in the quiet zone, which is the safe direction: a
 * quiet zone slightly too wide still scans, one slightly too narrow does not.
 *
 * The conversion needs `count`, which is only known once the data has been
 * encoded. `QrRenderer` reads it back off the built instance and re-applies the
 * margin; `PREVIEW_MODULE_COUNT_HINT` is only the seed for the first pass.
 */
export function quietZoneMarginPx(
  sizePx: number,
  moduleCount: number,
  quietZoneModules: number,
  roundSize = true,
): number {
  const q = Math.max(MIN_QUIET_ZONE_MODULES, Math.floor(quietZoneModules));
  const count = Math.max(1, Math.floor(moduleCount));

  if (!roundSize) {
    return (sizePx * q) / (count + 2 * q);
  }

  const dotSizePx = Math.max(1, Math.floor(sizePx / (count + 2 * q)));
  return Math.max(0, Math.floor((sizePx - dotSizePx * count) / 2));
}

export interface RenderedGeometry {
  /** What we hand the library as `margin`. */
  marginPx: number;
  /** Side of one module, after the library has applied its own rounding. */
  dotSizePx: number;
  /** Side of the symbol itself, excluding the quiet zone. */
  symbolPx: number;
  /** Quiet zone actually rendered on each side. */
  quietZonePx: number;
  /** The same, in modules. This is the number that must never fall below 4. */
  quietZoneModules: number;
}

/**
 * Replays the library's own layout arithmetic, so callers can reason about what
 * was really drawn rather than what was asked for. The PDF exporter needs the
 * true symbol-to-artwork ratio to hit a requested millimetre width, and the
 * tests use it to prove the quiet zone holds at four modules across every QR
 * version and every export size.
 */
export function renderedGeometry(
  sizePx: number,
  moduleCount: number,
  quietZoneModules: number,
  roundSize = true,
): RenderedGeometry {
  const count = Math.max(1, Math.floor(moduleCount));
  const marginPx = quietZoneMarginPx(sizePx, count, quietZoneModules, roundSize);
  const raw = (sizePx - 2 * marginPx) / count;
  const dotSizePx = roundSize ? Math.floor(raw) : raw;
  const symbolPx = dotSizePx * count;
  const quietZonePx = (sizePx - symbolPx) / 2;
  return {
    marginPx,
    dotSizePx,
    symbolPx,
    quietZonePx,
    quietZoneModules: dotSizePx > 0 ? quietZonePx / dotSizePx : 0,
  };
}

export function minCanvasSizePx(moduleCount: number, quietZoneModules: number): number {
  const q = Math.max(MIN_QUIET_ZONE_MODULES, Math.floor(quietZoneModules));
  return Math.max(1, Math.floor(moduleCount)) + 2 * q;
}

/**
 * Our gradient rotation is in **degrees** — that is what a slider in the style
 * editor hands you. The library wants radians (it feeds the value straight into
 * `Math.tan`), so convert here rather than leaking the unit into the UI.
 */
export function toStylingGradient(gradient: QrGradient): StylingGradient {
  return {
    type: gradient.type,
    rotation: ((gradient.rotation ?? 0) * Math.PI) / 180,
    colorStops: [
      { offset: 0, color: canonicalizeRenderColor(gradient.from) },
      { offset: 1, color: canonicalizeRenderColor(gradient.to) },
    ],
  };
}

/**
 * Converts our "logo width as a fraction of symbol width" into the library's
 * `imageOptions.imageSize`, which is a different quantity: a fraction of the
 * error-correction budget, not of the width. The library computes
 *
 * ```
 * maxHiddenDots = floor(imageSize * eccPercent * count^2)
 * hideDots.x    = floor(sqrt(maxHiddenDots))     // for a square logo
 * ```
 *
 * so hiding a square `ratio * count` modules wide needs
 * `imageSize = ratio^2 / eccPercent`. Passing `ratio` through unconverted would
 * render a 25% logo at roughly 27% under level H — over the cap the quality
 * rules exist to enforce.
 */
export function logoImageSize(logoSizeRatio: number, ecc: EccLevel): number {
  const percent = ERROR_CORRECTION_PERCENTS[ecc];
  return Math.min(1, (logoSizeRatio * logoSizeRatio) / percent);
}

export interface StylingOptionsInput {
  /** Already encoded by `encodePayload` — never build this string by hand. */
  data: string;
  style: QrStyle;
  /** Total artwork side in pixels, quiet zone included. */
  size: number;
  /** Real module count when known; the hint otherwise. */
  moduleCount?: number;
  drawType?: DrawType;
}

/**
 * qr-code-styling 1.9.2 bundles qrcode-generator with its default Byte encoder:
 * charCodeAt(i) & 0xff, not UTF-8. Pass one code unit per UTF-8 byte at this
 * boundary only; raw Unicode here silently loses high bytes (ไทย -> 44 17 22).
 * The bundled encoder is private, so changing a separately imported generator
 * would not configure it. TextEncoder also handles emoji surrogate pairs.
 * ASCII stays identical, preserving the vendor's Numeric/Alphanumeric modes.
 * Keep the domain payload and QrRenderResult.data as the original Unicode.
 */
function utf8ByteString(data: string): string {
  return Array.from(new TextEncoder().encode(data), (byte) => String.fromCharCode(byte)).join("");
}

/**
 * Maps a `QrStyle` onto the library's options. The style is run through
 * `normalizeStyle` first, unconditionally — the quality rules are the product,
 * and a caller must not be able to skip them by reaching for this function
 * directly.
 */
export function toStylingOptions(input: StylingOptionsInput): StylingOptions {
  const style = normalizeRenderStyle(input.style);
  const moduleCount = input.moduleCount ?? PREVIEW_MODULE_COUNT_HINT;
  const drawType = input.drawType ?? "svg";
  const roundSize = roundSizeForDrawType(drawType);
  const gradient = style.fgGradient ? toStylingGradient(style.fgGradient) : undefined;

  const options: StylingOptions = {
    type: drawType,
    shape: "square",
    width: input.size,
    height: input.size,
    margin: quietZoneMarginPx(input.size, moduleCount, style.marginModules, roundSize),
    data: utf8ByteString(input.data),
    qrOptions: {
      typeNumber: 0, // 0 = pick the smallest version that fits.
      errorCorrectionLevel: style.ecc,
    },
    dotsOptions: {
      type: style.dotStyle as DotType,
      color: style.fgColor,
      gradient,
      roundSize,
    },
    cornersSquareOptions: {
      type: style.cornerSquareStyle as CornerSquareType,
      color: style.fgColor,
      gradient,
    },
    cornersDotOptions: {
      type: style.cornerDotStyle as CornerDotType,
      color: style.fgColor,
      gradient,
    },
    backgroundOptions: {
      round: 0,
      color: style.bgColor,
    },
    // qr-code-styling deep-merges updates; an explicit undefined clears a
    // previously prepared image when the caller removes the logo.
    image: undefined,
  };

  if (style.logoUrl) {
    // Async entry points decode and rasterize every accepted local source.
    // This final synchronous gate prevents raw SVG/external URLs from reaching
    // qr-code-styling through a direct renderer/options call.
    assertPreparedLogoForVendor(style.logoUrl);
    options.image = style.logoUrl;
    options.imageOptions = {
      // Already a local PNG. Asking the vendor to blob it again would route the
      // data URL through its XMLHttpRequest helper for no benefit.
      saveAsBlob: false,
      // Clearing the modules under the logo is what keeps the decoder from
      // reading the artwork as data; without it a busy logo corrupts modules
      // that the error correction then has to spend its budget repairing.
      hideBackgroundDots: true,
      imageSize: logoImageSize(style.logoSizeRatio ?? 0, style.ecc),
      margin: 0,
    };
  }

  return options;
}
