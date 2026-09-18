/**
 * Print-size guidance.
 *
 * The sizing rule itself lives in `minPrintSizeMm` — this module turns it into
 * something a form can put next to a download button: given the export the user
 * picked and how far away people will stand, how wide does the paper have to
 * be, and does the file have the pixels to survive being printed that wide.
 */
import { minPrintSizeMm } from "@/qr/quality";

/** Arm's length plus a bit — a table tent, a menu, a receipt. */
export const DEFAULT_SCAN_DISTANCE_MM = 500;

/** Below this a raster export shows its pixels on paper. */
export const PRINT_DPI = 300;

export const MM_PER_INCH = 25.4;

/**
 * CSS defines 1in as exactly 96px, so this is what a browser means by `mm`.
 * It is a convention, not a measurement — the real size depends on the display
 * — which is why anything rendered at a "physical" size has to tell the user to
 * check it against a ruler.
 */
export const CSS_PX_PER_MM = 96 / MM_PER_INCH;

export function mmToCssPx(mm: number): number {
  return Math.round(mm * CSS_PX_PER_MM);
}

export function cssPxToMm(px: number): number {
  return px / CSS_PX_PER_MM;
}

export interface PrintSizeGuidanceInput {
  /** How far away the code will be scanned from. Defaults to 0.5 m. */
  scanDistanceMm?: number;
  /** The raster export the user chose, when they chose one. */
  exportSizePx?: number;
  /** Real module count, so symbol width and artwork width can be told apart. */
  moduleCount?: number;
  /** Quiet zone in modules, normalized. */
  quietZoneModules?: number;
}

export interface PrintSizeGuidance {
  scanDistanceMm: number;
  scanDistanceM: number;
  /** Minimum width of the symbol itself. This is what the rule of thumb is about. */
  minSymbolWidthMm: number;
  /**
   * Minimum width of the whole artwork — symbol plus quiet zone. This is the
   * number to put in front of a user, because it is what they will measure on
   * the page. Falls back to the symbol width when the module count is unknown.
   */
  minArtworkWidthMm: number;
  /** Same, in centimetres, which is how print shops in Thailand talk. */
  minArtworkWidthCm: number;
  /** Resolution the raster export lands at when printed at the minimum width. */
  dpiAtMinWidth: number | null;
  /** Widest the raster export can go before it drops under 300 dpi. */
  maxCrispWidthMm: number | null;
  /** False when the chosen PNG is too small for the print it is headed for. */
  crispAtMinWidth: boolean;
}

/**
 * Note the symbol/artwork distinction: `minPrintSizeMm` constrains the symbol,
 * but the file on disk includes the quiet zone, so printing the *file* at the
 * symbol's minimum width leaves the symbol itself undersized. Scaling by
 * `(count + 2q) / count` is what keeps the advice honest.
 */
export function printSizeGuidance(input: PrintSizeGuidanceInput = {}): PrintSizeGuidance {
  const scanDistanceMm = Math.max(1, input.scanDistanceMm ?? DEFAULT_SCAN_DISTANCE_MM);
  const minSymbolWidthMm = minPrintSizeMm(scanDistanceMm);

  const count = input.moduleCount;
  const q = input.quietZoneModules;
  const artworkRatio = count && q ? (count + 2 * q) / count : 1;
  const minArtworkWidthMm = Math.ceil(minSymbolWidthMm * artworkRatio);

  const exportSizePx = input.exportSizePx;
  const dpiAtMinWidth =
    exportSizePx && exportSizePx > 0
      ? Math.round(exportSizePx / (minArtworkWidthMm / MM_PER_INCH))
      : null;
  const maxCrispWidthMm =
    exportSizePx && exportSizePx > 0
      ? Math.floor((exportSizePx / PRINT_DPI) * MM_PER_INCH)
      : null;

  return {
    scanDistanceMm,
    scanDistanceM: scanDistanceMm / 1000,
    minSymbolWidthMm,
    minArtworkWidthMm,
    minArtworkWidthCm: minArtworkWidthMm / 10,
    dpiAtMinWidth,
    maxCrispWidthMm,
    crispAtMinWidth: dpiAtMinWidth === null || dpiAtMinWidth >= PRINT_DPI,
  };
}

/**
 * Trims trailing zeros so 5 cm reads "5" and 4.5 cm reads "4.5" — nobody wants
 * to be told to print something "5.0 cm" wide.
 */
export function formatLength(value: number, maxFractionDigits = 1): string {
  return String(Number(value.toFixed(maxFractionDigits)));
}
