import { describe, expect, it } from "vitest";
import { minPrintSizeMm } from "@/qr/quality";
import {
  cssPxToMm,
  DEFAULT_SCAN_DISTANCE_MM,
  formatLength,
  mmToCssPx,
  PRINT_DPI,
  printSizeGuidance,
} from "@/qr/render/print";
import { describePrintSize } from "@/qr/render/strings";

describe("printSizeGuidance", () => {
  it("defaults to the half-metre scan distance", () => {
    const g = printSizeGuidance();
    expect(g.scanDistanceMm).toBe(DEFAULT_SCAN_DISTANCE_MM);
    expect(g.scanDistanceM).toBe(0.5);
    expect(g.minSymbolWidthMm).toBe(minPrintSizeMm(DEFAULT_SCAN_DISTANCE_MM));
    expect(g.minSymbolWidthMm).toBe(50);
  });

  it("honours the 20 mm floor for close-range scanning", () => {
    expect(printSizeGuidance({ scanDistanceMm: 100 }).minSymbolWidthMm).toBe(20);
  });

  it("scales the advice from symbol width to artwork width", () => {
    // The file includes the quiet zone, so printing the *file* at the symbol's
    // minimum width would leave the symbol itself undersized.
    const g = printSizeGuidance({ moduleCount: 33, quietZoneModules: 4 });
    expect(g.minArtworkWidthMm).toBe(Math.ceil((50 * 41) / 33));
    expect(g.minArtworkWidthMm).toBeGreaterThan(g.minSymbolWidthMm);
    expect(g.minArtworkWidthCm).toBeCloseTo(g.minArtworkWidthMm / 10, 10);
  });

  it("falls back to the symbol width when the module count is unknown", () => {
    const g = printSizeGuidance();
    expect(g.minArtworkWidthMm).toBe(g.minSymbolWidthMm);
  });

  it("says nothing about resolution for vector output", () => {
    const g = printSizeGuidance({ moduleCount: 33, quietZoneModules: 4 });
    expect(g.dpiAtMinWidth).toBeNull();
    expect(g.maxCrispWidthMm).toBeNull();
    expect(g.crispAtMinWidth).toBe(true);
  });

  it("flags a raster export that cannot hold the print size", () => {
    const g = printSizeGuidance({ exportSizePx: 512, moduleCount: 33, quietZoneModules: 4 });
    expect(g.dpiAtMinWidth).toBeLessThan(PRINT_DPI);
    expect(g.crispAtMinWidth).toBe(false);
    expect(g.maxCrispWidthMm).toBe(Math.floor((512 / PRINT_DPI) * 25.4));
  });

  it("clears a raster export that can", () => {
    const g = printSizeGuidance({ exportSizePx: 2048, moduleCount: 33, quietZoneModules: 4 });
    expect(g.dpiAtMinWidth).toBeGreaterThanOrEqual(PRINT_DPI);
    expect(g.crispAtMinWidth).toBe(true);
  });
});

describe("millimetre / CSS pixel conversion", () => {
  it("round-trips at the CSS reference of 96dpi", () => {
    expect(mmToCssPx(25.4)).toBe(96);
    expect(cssPxToMm(96)).toBeCloseTo(25.4, 10);
  });
});

describe("formatLength", () => {
  it("does not tell anyone to print something 5.0 cm wide", () => {
    expect(formatLength(5)).toBe("5");
    expect(formatLength(6.3)).toBe("6.3");
    expect(formatLength(6.25)).toBe("6.3");
    expect(formatLength(0.5, 2)).toBe("0.5");
  });
});

describe("describePrintSize", () => {
  it("produces the headline in both locales", () => {
    const input = { moduleCount: 33, quietZoneModules: 4 };
    const th = describePrintSize(input, "th");
    const en = describePrintSize(input, "en");

    expect(th.headline).toContain("6.3");
    expect(th.headline).toContain("0.5");
    expect(th.headline).toContain("ซม.");
    expect(en.headline).toContain("6.3 cm");
    expect(en.headline).toContain("0.5 m");
    expect(th.headline).not.toBe(en.headline);
  });

  it("omits the resolution line for vector output", () => {
    expect(describePrintSize({ moduleCount: 33, quietZoneModules: 4 }, "en").resolution).toBeNull();
  });

  it("warns when the chosen PNG is too small for the print it is headed for", () => {
    const low = describePrintSize(
      { exportSizePx: 512, moduleCount: 33, quietZoneModules: 4 },
      "en",
    );
    expect(low.resolution).toContain("512 px");
    expect(low.resolution).toContain("SVG/PDF");

    const ok = describePrintSize(
      { exportSizePx: 2048, moduleCount: 33, quietZoneModules: 4 },
      "en",
    );
    expect(ok.resolution).toContain("2048 px");
    expect(ok.resolution).toContain(String(PRINT_DPI));
  });

  it("defaults to Thai, the default locale", () => {
    expect(describePrintSize({}).headline).toBe(describePrintSize({}, "th").headline);
  });
});
