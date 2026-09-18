/**
 * Copy for everything under `src/qr/render`, Thai and English.
 *
 * Colocated as a `Bundle` per the i18n contract, so the renderer ships its own
 * translations instead of the form layer having to invent them.
 */
import { defaultLocale, t, type Bundle, type Locale } from "@/i18n/config";
import {
  formatLength,
  PRINT_DPI,
  printSizeGuidance,
  type PrintSizeGuidance,
  type PrintSizeGuidanceInput,
} from "@/qr/render/print";

export interface RenderStrings {
  previewLabel: string;
  previewLoading: string;
  previewError: string;
  /** "Print at least 5 cm wide to scan from 0.5 m away." */
  printSize: (widthCm: string, distanceM: string) => string;
  /** Raster export has the pixels for the job. */
  resolutionOk: (px: number, maxWidthCm: string) => string;
  /** Raster export does not. */
  resolutionLow: (px: number, dpi: number, maxWidthCm: string) => string;
  vectorNote: string;
  testScanTitle: string;
  testScanBody: string;
  testScanSizeNote: (widthCm: string) => string;
  testScanRulerNote: string;
}

export const renderStrings: Bundle<RenderStrings> = {
  th: {
    previewLabel: "ตัวอย่าง QR Code",
    previewLoading: "กำลังเตรียมตัวอย่าง QR",
    previewError: "สร้างตัวอย่าง QR ไม่สำเร็จ กรุณาตรวจสอบข้อมูลที่กรอก",
    printSize: (widthCm, distanceM) =>
      `พิมพ์ให้กว้างอย่างน้อย ${widthCm} ซม. จึงจะสแกนจากระยะ ${distanceM} เมตรได้`,
    resolutionOk: (px, maxWidthCm) =>
      `ไฟล์ ${px} px พิมพ์ได้กว้างสุด ${maxWidthCm} ซม. โดยยังคมระดับงานพิมพ์ (${PRINT_DPI} dpi)`,
    resolutionLow: (px, dpi, maxWidthCm) =>
      `ไฟล์ ${px} px ที่ขนาดนี้จะได้แค่ ${dpi} dpi ซึ่งจะเห็นขอบหยัก แนะนำให้พิมพ์ไม่เกิน ${maxWidthCm} ซม. หรือดาวน์โหลดเป็น SVG/PDF แทน`,
    vectorNote: "SVG กับ PDF เป็นไฟล์เวกเตอร์ ขยายใหญ่แค่ไหนก็ยังคม",
    testScanTitle: "ทดสอบสแกนก่อนดาวน์โหลด",
    testScanBody:
      "หยิบมือถือขึ้นมาสแกน QR ด้านบนตอนนี้เลย ถ้าจอยังอ่านไม่ออก พิมพ์ออกมาก็อ่านไม่ออกเหมือนกัน",
    testScanSizeNote: (widthCm) => `แสดงที่ความกว้างประมาณ ${widthCm} ซม. ซึ่งเป็นขนาดพิมพ์ขั้นต่ำที่แนะนำ`,
    testScanRulerNote:
      "ขนาดบนจออาจคลาดเคลื่อนตามหน้าจอแต่ละเครื่อง ถ้าต้องการความแม่นยำให้วัดด้วยไม้บรรทัด",
  },
  en: {
    previewLabel: "QR code preview",
    previewLoading: "Preparing the QR preview",
    previewError: "Could not build the QR preview. Please check the details you entered.",
    printSize: (widthCm, distanceM) =>
      `Print it at least ${widthCm} cm wide to scan from ${distanceM} m away`,
    resolutionOk: (px, maxWidthCm) =>
      `A ${px} px file prints up to ${maxWidthCm} cm wide at press quality (${PRINT_DPI} dpi)`,
    resolutionLow: (px, dpi, maxWidthCm) =>
      `A ${px} px file only reaches ${dpi} dpi at this size and will look ragged. Keep it under ${maxWidthCm} cm, or download SVG/PDF instead`,
    vectorNote: "SVG and PDF are vector files — they stay sharp at any size",
    testScanTitle: "Test the scan before you download",
    testScanBody:
      "Point your phone at the code above right now. If it will not read on screen, it will not read on paper either.",
    testScanSizeNote: (widthCm) =>
      `Shown at roughly ${widthCm} cm wide, the smallest print size we recommend`,
    testScanRulerNote:
      "On-screen size varies by display. Check it against a ruler if it has to be exact.",
  },
};

export function renderCopy(locale: Locale = defaultLocale): RenderStrings {
  return t(renderStrings, locale);
}

export interface PrintGuidanceCopy {
  guidance: PrintSizeGuidance;
  /** The headline FORMS shows next to the download buttons. */
  headline: string;
  /** Resolution caveat for a raster export; null for vector output. */
  resolution: string | null;
  vectorNote: string;
}

/**
 * The helper FORMS calls: an export size in, finished bilingual copy out.
 * Leave `exportSizePx` off for SVG or PDF and the resolution line drops away,
 * because a vector file has no resolution to warn about.
 */
export function describePrintSize(
  input: PrintSizeGuidanceInput = {},
  locale: Locale = defaultLocale,
): PrintGuidanceCopy {
  const s = renderCopy(locale);
  const guidance = printSizeGuidance(input);

  const headline = s.printSize(
    formatLength(guidance.minArtworkWidthCm),
    formatLength(guidance.scanDistanceM, 2),
  );

  let resolution: string | null = null;
  if (input.exportSizePx && guidance.dpiAtMinWidth !== null && guidance.maxCrispWidthMm !== null) {
    const maxCm = formatLength(guidance.maxCrispWidthMm / 10);
    resolution = guidance.crispAtMinWidth
      ? s.resolutionOk(input.exportSizePx, maxCm)
      : s.resolutionLow(input.exportSizePx, guidance.dpiAtMinWidth, maxCm);
  }

  return { guidance, headline, resolution, vectorNote: s.vectorNote };
}
