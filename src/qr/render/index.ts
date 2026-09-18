/**
 * Public surface of the rendering layer.
 *
 * Safe to import from a server component: `qr-code-styling`, `jspdf` and
 * `svg2pdf.js` are all behind `await import()` in `engine.ts` and `export.ts`,
 * so nothing browser-only is reachable from module scope here.
 */
export {
  DEFAULT_PREVIEW_SIZE,
  QrPreview,
  type QrPreviewProps,
  type QrPreviewStatus,
} from "@/qr/render/QrPreview";

export { TestScanCard, type TestScanCardProps } from "@/qr/render/TestScanCard";

export {
  loadQrCodeStyling,
  QrRenderer,
  renderOnce,
  type QrEncodedRenderInput,
  type QrRenderInput,
  type QrRenderResult,
} from "@/qr/render/engine";

export {
  QrRenderError,
  qrRenderFailureCode,
  type QrRenderFailureCode,
} from "@/qr/render/errors";

export {
  LogoPreparationError,
  MAX_LOGO_PREPARATION_TIMEOUT_MS,
  MAX_LOGO_RASTER_BYTES,
  MAX_LOGO_RASTER_DIMENSION,
  MAX_LOGO_SOURCE_BYTES,
  MAX_LOGO_SOURCE_DIMENSION,
  MAX_LOGO_SOURCE_PIXELS,
  logoPreparationFailureCode,
  prepareLogoForRender,
  prepareRenderStyleLogo,
  type LogoPreparationFailureCode,
  type PrepareLogoOptions,
} from "@/qr/render/logo";

export {
  DEFAULT_PDF_SYMBOL_WIDTH_MM,
  defaultLabelFor,
  downloadPdf,
  downloadPng,
  downloadSvg,
  PDF_PAGE_MARGIN_MM,
  renderPdfBlob,
  renderPngBlob,
  renderSvgString,
  SVG_EXPORT_SIZE,
  type PdfExportInput,
  type PdfOrientation,
  type PdfPageFormat,
  type PngExportInput,
  type QrExportInput,
  type QrExportResult,
  type SvgExportInput,
} from "@/qr/render/export";

export {
  DEFAULT_PNG_SIZE,
  PNG_EXPORT_SIZES,
  type PngExportSize,
} from "@/qr/render/export-options";

export {
  qrFilename,
  sanitizeFilenamePart,
  type QrFileExtension,
  type QrFilenameInput,
} from "@/qr/render/filename";

export {
  logoImageSize,
  MAX_MODULE_COUNT,
  MIN_MODULE_COUNT,
  minCanvasSizePx,
  PREVIEW_MODULE_COUNT_HINT,
  quietZoneMarginPx,
  renderedGeometry,
  roundSizeForDrawType,
  toStylingGradient,
  toStylingOptions,
  type DrawType,
  type RenderedGeometry,
  type StylingOptionsInput,
} from "@/qr/render/options";

export {
  CSS_PX_PER_MM,
  cssPxToMm,
  DEFAULT_SCAN_DISTANCE_MM,
  formatLength,
  MM_PER_INCH,
  mmToCssPx,
  PRINT_DPI,
  printSizeGuidance,
  type PrintSizeGuidance,
  type PrintSizeGuidanceInput,
} from "@/qr/render/print";

export {
  describePrintSize,
  renderCopy,
  renderStrings,
  type PrintGuidanceCopy,
  type RenderStrings,
} from "@/qr/render/strings";
