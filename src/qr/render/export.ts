/**
 * PNG / SVG / PDF export.
 *
 * Every path here re-renders from the payload and style rather than scraping
 * the on-screen preview, and every path goes through `QrRenderer`, which runs
 * `normalizeStyle` unconditionally. That is the point: the quality rules cannot
 * be routed around by pressing Download instead of looking at the preview.
 *
 * `jspdf` and `svg2pdf.js` are loaded lazily for the same reason as
 * `qr-code-styling` — a static import would drag a browser-only dependency into
 * the server graph.
 */
import { minPrintSizeMm } from "@/qr/quality";
import type { QrPayload, QrStyle } from "@/qr/types";
import { normalizeRenderStyle } from "@/qr/render/colors";
import { QrRenderer, renderOnce, type QrRenderResult } from "@/qr/render/engine";
import {
  DEFAULT_PNG_SIZE,
  type PngExportSize,
} from "@/qr/render/export-options";
import { qrFilename, type QrFileExtension } from "@/qr/render/filename";
import { LogoPreparationError } from "@/qr/render/logo";
import { DEFAULT_SCAN_DISTANCE_MM } from "@/qr/render/print";

export {
  DEFAULT_PNG_SIZE,
  PNG_EXPORT_SIZES,
  type PngExportSize,
} from "@/qr/render/export-options";

/** Plenty of coordinate space for the vector paths; never rasterised. */
export const SVG_EXPORT_SIZE = 1024;

/** Default printed width of the symbol itself, from the 0.5 m scan-distance rule. */
export const DEFAULT_PDF_SYMBOL_WIDTH_MM = minPrintSizeMm(DEFAULT_SCAN_DISTANCE_MM);

/** Breathing room so the artwork never touches an unprintable page edge. */
export const PDF_PAGE_MARGIN_MM = 10;

export type PdfPageFormat = "a4" | "a5" | "letter";
export type PdfOrientation = "portrait" | "landscape";

export interface QrExportInput {
  payload: QrPayload;
  style: QrStyle;
  /** Cancels bounded logo preparation before vendor output is authorized. */
  signal?: AbortSignal;
  /** Explicit caller-chosen label, sanitised for filenames; omitted/empty stays generic. */
  label?: string;
}

export interface QrExportResult {
  filename: string;
  moduleCount: number;
  /** Quiet zone actually rendered, in modules — never below 4. */
  quietZoneModules: number;
}

/**
 * Kept for callers of the existing public helper. All types now use generic
 * default names: even a hostname, SSID or event title can disclose payload
 * details in download history or a print queue. Only an explicit caller label
 * may add a filename part; sanitization alone does not make it non-sensitive.
 */
export function defaultLabelFor(payload: QrPayload): string | undefined {
  void payload; // Preserve the signature without reading any payload fields.
  return undefined;
}

function saveBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  // Revoking synchronously can cancel the download in Safari; one frame is
  // enough for the navigation to have taken the URL.
  requestAnimationFrame(() => URL.revokeObjectURL(url));
}

function nameFor(
  input: QrExportInput,
  extension: QrFileExtension,
  variant?: string | number,
): string {
  return qrFilename({
    contentType: input.payload.type,
    label: input.label,
    variant,
    extension,
  });
}

function toResult(filename: string, render: QrRenderResult): QrExportResult {
  return {
    filename,
    moduleCount: render.moduleCount,
    quietZoneModules: render.geometry.quietZoneModules,
  };
}

function throwIfCancelled(signal: AbortSignal | undefined): void {
  if (signal?.aborted) throw new LogoPreparationError("logo-cancelled");
}

/* -------------------------------------------------------------------------- */
/* PNG                                                                        */
/* -------------------------------------------------------------------------- */

export interface PngExportInput extends QrExportInput {
  size?: PngExportSize;
}

export async function renderPngBlob(
  input: PngExportInput,
): Promise<{ blob: Blob; render: QrRenderResult }> {
  const size = input.size ?? DEFAULT_PNG_SIZE;
  const { renderer, result } = await renderOnce({
    payload: input.payload,
    style: input.style,
    size,
    drawType: "canvas",
  }, { signal: input.signal });
  try {
    throwIfCancelled(input.signal);
    const blob = await renderer.toBlob("png");
    throwIfCancelled(input.signal);
    return { blob, render: result };
  } finally {
    renderer.destroy();
  }
}

export async function downloadPng(input: PngExportInput): Promise<QrExportResult> {
  const size = input.size ?? DEFAULT_PNG_SIZE;
  const { blob, render } = await renderPngBlob({ ...input, size });
  throwIfCancelled(input.signal);
  const filename = nameFor(input, "png", size);
  throwIfCancelled(input.signal);
  saveBlob(blob, filename);
  return toResult(filename, render);
}

/* -------------------------------------------------------------------------- */
/* SVG                                                                        */
/* -------------------------------------------------------------------------- */

export interface SvgExportInput extends QrExportInput {
  /** Coordinate space of the emitted markup. Vector output, so this is not resolution. */
  size?: number;
}

export async function renderSvgString(
  input: SvgExportInput,
): Promise<{ svg: string; render: QrRenderResult }> {
  const { renderer, result } = await renderOnce({
    payload: input.payload,
    style: input.style,
    size: input.size ?? SVG_EXPORT_SIZE,
    drawType: "svg",
  }, { signal: input.signal });
  try {
    throwIfCancelled(input.signal);
    const svg = await renderer.toSvgString();
    throwIfCancelled(input.signal);
    return { svg, render: result };
  } finally {
    renderer.destroy();
  }
}

export async function downloadSvg(input: SvgExportInput): Promise<QrExportResult> {
  const { svg, render } = await renderSvgString(input);
  throwIfCancelled(input.signal);
  const filename = nameFor(input, "svg");
  throwIfCancelled(input.signal);
  saveBlob(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }), filename);
  return toResult(filename, render);
}

/* -------------------------------------------------------------------------- */
/* PDF                                                                        */
/* -------------------------------------------------------------------------- */

export interface PdfExportInput extends QrExportInput {
  /** Printed width of the symbol itself, excluding the quiet zone. */
  symbolWidthMm?: number;
  page?: PdfPageFormat;
  orientation?: PdfOrientation;
}

/**
 * Parses the exported markup back into a live element. svg2pdf.js resolves
 * styles through `getComputedStyle`, which only answers for nodes that are in a
 * document, so the element is parked off-screen for the duration.
 */
function mountSvg(svg: string): { element: Element; unmount: () => void } {
  const parsed = new DOMParser().parseFromString(svg, "image/svg+xml");
  const element = parsed.documentElement;
  if (element.nodeName === "parsererror" || element.getElementsByTagName("parsererror").length) {
    throw new Error("The rendered QR SVG could not be parsed.");
  }

  const host = document.createElement("div");
  host.setAttribute("aria-hidden", "true");
  host.style.cssText = "position:fixed;left:-10000px;top:0;width:0;height:0;overflow:hidden";
  host.appendChild(element);
  document.body.appendChild(host);

  return { element, unmount: () => host.remove() };
}

export async function renderPdfBlob(
  input: PdfExportInput,
): Promise<{ blob: Blob; render: QrRenderResult; artworkWidthMm: number }> {
  // Admit colors/logo and finish the safe QR SVG before loading PDF vendors.
  const style = normalizeRenderStyle(input.style);
  const size = SVG_EXPORT_SIZE;
  const { renderer, result } = await renderOnce({
    payload: input.payload,
    style,
    size,
    drawType: "svg",
  }, { signal: input.signal });
  let svg: string;
  try {
    svg = await renderer.toSvgString();
  } finally {
    renderer.destroy();
  }

  throwIfCancelled(input.signal);
  const [{ jsPDF }, { svg2pdf }] = await Promise.all([import("jspdf"), import("svg2pdf.js")]);
  throwIfCancelled(input.signal);

  const doc = new jsPDF({
    unit: "mm",
    format: input.page ?? "a4",
    orientation: input.orientation ?? "portrait",
    compress: true,
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // The file on disk is symbol *plus* quiet zone, so asking for a 50 mm symbol
  // means placing a slightly wider artwork. Scaling by the geometry that was
  // really drawn — not the ideal ratio — absorbs the library's floor rounding,
  // so the symbol lands at the requested width and the quiet zone survives.
  const symbolWidthMm = input.symbolWidthMm ?? DEFAULT_PDF_SYMBOL_WIDTH_MM;
  const requested = (symbolWidthMm * size) / result.geometry.symbolPx;
  const artworkWidthMm = Math.min(
    requested,
    pageWidth - 2 * PDF_PAGE_MARGIN_MM,
    pageHeight - 2 * PDF_PAGE_MARGIN_MM,
  );

  const { element, unmount } = mountSvg(svg);
  try {
    await svg2pdf(element, doc, {
      x: (pageWidth - artworkWidthMm) / 2,
      y: (pageHeight - artworkWidthMm) / 2,
      width: artworkWidthMm,
      height: artworkWidthMm,
    });
  } finally {
    unmount();
  }

  throwIfCancelled(input.signal);
  const blob = doc.output("blob");
  throwIfCancelled(input.signal);
  return { blob, render: result, artworkWidthMm };
}

export async function downloadPdf(input: PdfExportInput): Promise<QrExportResult> {
  const { blob, render, artworkWidthMm } = await renderPdfBlob(input);
  throwIfCancelled(input.signal);
  const filename = nameFor(input, "pdf", `${Math.round(artworkWidthMm)}mm`);
  throwIfCancelled(input.signal);
  saveBlob(blob, filename);
  return toResult(filename, render);
}

/** Re-exported so callers can build a renderer without reaching into `engine`. */
export { QrRenderer };
