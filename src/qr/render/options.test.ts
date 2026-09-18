import { describe, expect, it } from "vitest";
import { inspectStyle, MAX_LOGO_SIZE_RATIO, MIN_QUIET_ZONE_MODULES, normalizeStyle } from "@/qr/quality";
import { normalizeRenderStyle } from "@/qr/render/colors";
import { DEFAULT_STYLE, type QrStyle } from "@/qr/types";
import {
  logoImageSize,
  minCanvasSizePx,
  quietZoneMarginPx,
  renderedGeometry,
  roundSizeForDrawType,
  toStylingGradient,
  toStylingOptions,
} from "@/qr/render/options";

/** Every QR version: 21 modules at version 1, 177 at version 40. */
const ALL_MODULE_COUNTS = Array.from({ length: 40 }, (_, i) => 4 * (i + 1) + 17);
const EXPORT_SIZES = [256, 320, 512, 1024, 2048];
const QUIET_ZONES = [4, 6, 8, 16];
const PREPARED_LOGO = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR42mNgAAIAAAUAAen63NgAAAAASUVORK5CYII=";
const OVERSIZED_LOGO = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgABAAAAAAABCAYAAABrcuPYAAABFUlEQVR42u3BMQEAAADCoPVP7W8GoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAzgAAPQABttYMtwAAAABJRU5ErkJggg==";
const ONE_OVER_PREPARED_LOGO = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAABAEAAAABCAYAAACvzLcLAAAAGklEQVR42u3BAQEAAACCIP+vbkhAAQAAABcGEAUAAQ7y3M4AAAAASUVORK5CYII=";

describe("quiet zone: modules in, pixels out", () => {
  it("is not the module count in disguise", () => {
    // The whole trap in one assertion: a 4-module quiet zone on a 1024px export
    // is ~116px, not 4px. Passing marginModules through unconverted would leave
    // a sixth of a module of white space.
    expect(quietZoneMarginPx(1024, 33, 4)).toBe(116);
    expect(quietZoneMarginPx(1024, 33, 4)).not.toBe(4);
  });

  it("solves exactly for vector output", () => {
    // margin = size * q / (count + 2q)
    expect(quietZoneMarginPx(1024, 33, 4, false)).toBeCloseTo((1024 * 4) / 41, 10);
    const g = renderedGeometry(1024, 33, 4, false);
    expect(g.quietZoneModules).toBeCloseTo(4, 10);
    expect(g.symbolPx + 2 * g.quietZonePx).toBeCloseTo(1024, 10);
  });

  it("picks the largest whole-pixel module for raster output", () => {
    const g = renderedGeometry(1024, 33, 4, true);
    expect(g.dotSizePx).toBe(Math.floor(1024 / 41));
    expect(Number.isInteger(g.dotSizePx)).toBe(true);
    expect(g.symbolPx).toBe(33 * 24);
  });

  it("never renders a quiet zone under the requested width, at any version or size", () => {
    for (const count of ALL_MODULE_COUNTS) {
      for (const quietZone of QUIET_ZONES) {
        for (const size of EXPORT_SIZES) {
          if (size < minCanvasSizePx(count, quietZone)) continue;
          for (const roundSize of [true, false]) {
            const g = renderedGeometry(size, count, quietZone, roundSize);
            expect(g.dotSizePx).toBeGreaterThan(0);
            // A floating-point hair below is still exactly q in practice; the
            // failure this guards against is a whole fraction of a module.
            expect(g.quietZoneModules).toBeGreaterThanOrEqual(quietZone - 1e-9);
          }
        }
      }
    }
  });

  it("agrees with the library's own re-derivation of the module size", () => {
    // The library recomputes dotSize from the margin we hand it. If our margin
    // and its floor disagree, the symbol shifts and the quiet zone shrinks.
    for (const count of ALL_MODULE_COUNTS) {
      for (const size of EXPORT_SIZES) {
        if (size < minCanvasSizePx(count, MIN_QUIET_ZONE_MODULES)) continue;
        const margin = quietZoneMarginPx(size, count, MIN_QUIET_ZONE_MODULES, true);
        const libraryDotSize = Math.floor((size - 2 * margin) / count);
        expect(libraryDotSize).toBe(Math.floor(size / (count + 2 * MIN_QUIET_ZONE_MODULES)));
      }
    }
  });

  it("clamps a quiet zone below the ISO minimum before converting", () => {
    expect(quietZoneMarginPx(1024, 33, 0)).toBe(quietZoneMarginPx(1024, 33, 4));
  });

  it("reports the smallest canvas a symbol fits in", () => {
    expect(minCanvasSizePx(177, 4)).toBe(185);
    const g = renderedGeometry(185, 177, 4, true);
    expect(g.dotSizePx).toBe(1);
    expect(g.quietZoneModules).toBe(4);
  });
});

describe("roundSizeForDrawType", () => {
  it("snaps to whole pixels for raster only", () => {
    expect(roundSizeForDrawType("canvas")).toBe(true);
    expect(roundSizeForDrawType("svg")).toBe(false);
  });
});

describe("logoImageSize", () => {
  it("converts a width fraction into the library's error-correction fraction", () => {
    // The library hides floor(imageSize * eccPercent * count^2) modules, so a
    // logo `ratio` wide needs imageSize = ratio^2 / eccPercent.
    expect(logoImageSize(0.25, "H")).toBeCloseTo(0.0625 / 0.3, 10);
    expect(logoImageSize(0.25, "M")).toBeCloseTo(0.0625 / 0.15, 10);
  });

  it("hides the intended square once the library's own maths runs", () => {
    const count = 41;
    const imageSize = logoImageSize(MAX_LOGO_SIZE_RATIO, "H");
    const maxHiddenDots = Math.floor(imageSize * 0.3 * count * count);
    const hiddenAcross = Math.floor(Math.sqrt(maxHiddenDots));
    expect(hiddenAcross / count).toBeLessThanOrEqual(MAX_LOGO_SIZE_RATIO + 1e-9);
    expect(hiddenAcross / count).toBeGreaterThan(MAX_LOGO_SIZE_RATIO - 0.03);
  });

  it("never exceeds the full error-correction budget", () => {
    expect(logoImageSize(1, "L")).toBe(1);
  });
});

describe("toStylingGradient", () => {
  it("converts degrees to the radians the library expects", () => {
    const gradient = toStylingGradient({ type: "linear", rotation: 90, from: "#000", to: "#333" });
    expect(gradient.rotation).toBeCloseTo(Math.PI / 2, 10);
    expect(gradient.type).toBe("linear");
    expect(gradient.colorStops).toEqual([
      { offset: 0, color: "#000000" },
      { offset: 1, color: "#333333" },
    ]);
  });

  it("treats a missing rotation as zero", () => {
    expect(toStylingGradient({ type: "radial", from: "#000", to: "#fff" }).rotation).toBe(0);
  });

  it("guards the public gradient mapper even without toStylingOptions", () => {
    for (const color of ["url(/paint.svg#p)", "../paint.svg", "var(--paint)"]) {
      expect(() => toStylingGradient({ type: "linear", from: color, to: "#000" }))
        .toThrow("QR colors must use #RGB or #RRGGBB.");
      expect(() => toStylingGradient({ type: "radial", from: "#000", to: color }))
        .toThrow("QR colors must use #RGB or #RRGGBB.");
    }
  });
});

describe("render admission preserves existing quality decisions", () => {
  it.each([
    { ...DEFAULT_STYLE, fgColor: "#FFF", bgColor: "#FFF" },
    { ...DEFAULT_STYLE, fgColor: "#777" },
    { ...DEFAULT_STYLE, fgColor: "#FFF", bgColor: "#000" },
    { ...DEFAULT_STYLE, marginModules: 0, logoUrl: PREPARED_LOGO, ecc: "L" as const, logoSizeRatio: 0.9 },
    ...(["linear", "radial"] as const).flatMap((type) => [
      { ...DEFAULT_STYLE, fgGradient: { type, from: "#000", to: "#FFF", rotation: 45 } },
      { ...DEFAULT_STYLE, fgGradient: { type, from: "#FFF", to: "#000", rotation: 90 } },
      { ...DEFAULT_STYLE, fgGradient: { type, from: "#000", to: "#123" } },
      { ...DEFAULT_STYLE, bgColor: "#000", fgGradient: { type, from: "#FFF", to: "#EEE" } },
    ]),
  ])("does not change contrast/inversion/normalization for valid hex: %j", (style) => {
    const expected = normalizeStyle(style);
    const result = normalizeRenderStyle(style);
    expect(inspectStyle(result)).toEqual(inspectStyle(expected));
    expect(result.marginModules).toBe(expected.marginModules);
    expect(result.ecc).toBe(expected.ecc);
    expect(result.logoSizeRatio).toBe(expected.logoSizeRatio);
  });
});

describe("toStylingOptions", () => {
  const base: QrStyle = {
    ...DEFAULT_STYLE,
    fgColor: "#101820",
    bgColor: "#ffffff",
    dotStyle: "classy-rounded",
    cornerSquareStyle: "extra-rounded",
    cornerDotStyle: "dot",
  };

  it.each([
    "url(https://example.invalid/SYNTHETIC_COLOR.svg#p)",
    "url(/SYNTHETIC_COLOR.svg#p)",
    "../SYNTHETIC_COLOR.svg",
    "#SYNTHETIC_COLOR",
    "var(--SYNTHETIC_COLOR)",
    "currentColor", "transparent", "red", "rgb(0,0,0)",
    "#1234", "#12345678", "#fff;fill:url(/SYNTHETIC_COLOR)",
    "#fff\n", " #fff", "fff", "", null, 123,
  ])("rejects unsupported paint %j in every color slot without echoing it", (color) => {
    const value = color as string;
    const styles: QrStyle[] = [
      { ...base, fgColor: value },
      { ...base, bgColor: value },
      { ...base, fgGradient: { type: "linear", from: value, to: "#000" } },
      { ...base, fgGradient: { type: "radial", from: "#000", to: value } },
      // Even an unused foreground color is passed as a vendor fallback.
      { ...base, fgColor: value, fgGradient: { type: "linear", from: "#000", to: "#123" } },
    ];
    for (const style of styles) {
      for (const drawType of ["svg", "canvas"] as const) {
        expect(() => toStylingOptions({ data: "ไทย", style, size: 512, drawType }))
          .toThrow("QR colors must use #RGB or #RRGGBB.");
      }
    }
  });

  it("canonicalizes every paint to opaque six-digit hex without mutating the style", () => {
    const style: QrStyle = {
      ...base, fgColor: "#AbC", bgColor: "#FFF",
      fgGradient: { type: "radial", from: "#00F", to: "#AAbBcC", rotation: 45 },
    };
    const before = structuredClone(style);
    const options = toStylingOptions({ data: "ไทย", style, size: 512 });
    expect(options.backgroundOptions?.color).toBe("#ffffff");
    for (const paint of [options.dotsOptions, options.cornersSquareOptions, options.cornersDotOptions]) {
      expect(paint?.color).toBe("#aabbcc");
      expect(paint?.gradient?.colorStops).toEqual([
        { offset: 0, color: "#0000ff" }, { offset: 1, color: "#aabbcc" },
      ]);
    }
    expect(style).toEqual(before);
  });

  it.each([
    ["ไทย", [0xe0, 0xb9, 0x84, 0xe0, 0xb8, 0x97, 0xe0, 0xb8, 0xa2]],
    ["😀", [0xf0, 0x9f, 0x98, 0x80]],
    ["é中", [0xc3, 0xa9, 0xe4, 0xb8, 0xad]],
  ])("passes UTF-8 bytes to the vendor's single-byte input for %s", (data, bytes) => {
    for (const drawType of ["svg", "canvas"] as const) {
      const options = toStylingOptions({ data, style: base, size: 512, drawType });
      expect(Array.from(options.data!, (char) => char.charCodeAt(0))).toEqual(bytes);
    }
  });

  it("maps our vocabulary onto the library's", () => {
    const options = toStylingOptions({ data: "https://nexora.qr", style: base, size: 512 });
    expect(options.data).toBe("https://nexora.qr");
    expect(options.width).toBe(512);
    expect(options.height).toBe(512);
    expect(options.dotsOptions?.type).toBe("classy-rounded");
    expect(options.dotsOptions?.color).toBe("#101820");
    expect(options.cornersSquareOptions?.type).toBe("extra-rounded");
    expect(options.cornersDotOptions?.type).toBe("dot");
    expect(options.backgroundOptions?.color).toBe("#ffffff");
    // 0 = let the encoder pick the smallest version that fits.
    expect(options.qrOptions?.typeNumber).toBe(0);
  });

  it("applies the quality rules even when the caller did not", () => {
    const sloppy: QrStyle = {
      ...base,
      marginModules: 0,
      ecc: "L",
      logoUrl: PREPARED_LOGO,
      logoSizeRatio: 0.9,
    };
    const options = toStylingOptions({ data: "x", style: sloppy, size: 1024 });

    // A logo forces H...
    expect(options.qrOptions?.errorCorrectionLevel).toBe("H");
    // ...is capped at 25% of the width...
    expect(options.imageOptions?.imageSize).toBeCloseTo(logoImageSize(MAX_LOGO_SIZE_RATIO, "H"), 10);
    // ...and a zero quiet zone becomes four modules.
    expect(options.margin).toBe(quietZoneMarginPx(1024, 33, MIN_QUIET_ZONE_MODULES, false));
    expect(options.margin).toBeGreaterThan(0);
  });

  it("leaves image options off entirely when there is no logo", () => {
    const options = toStylingOptions({ data: "x", style: base, size: 512 });
    expect(options.image).toBeUndefined();
    expect(options.imageOptions).toBeUndefined();
  });

  it("clears modules under an already-local PNG without invoking vendor XHR/CORS", () => {
    const options = toStylingOptions({
      data: "x",
      style: { ...base, logoUrl: PREPARED_LOGO, logoSizeRatio: 0.2 },
      size: 512,
    });
    expect(options.imageOptions?.hideBackgroundDots).toBe(true);
    expect(options.imageOptions?.saveAsBlob).toBe(false);
    expect(options.imageOptions?.crossOrigin).toBeUndefined();
  });

  it.each(["https://example.invalid/logo.png", "../logo.png", "data:image/svg+xml;base64,PHN2Zz4="])(
    "rejects an unprepared logo before vendor options: %s",
    (logoUrl) => {
      expect(() => toStylingOptions({
        data: "x",
        style: { ...base, logoUrl, logoSizeRatio: 0.2 },
        size: 512,
      })).toThrow("The logo is not an accepted local image.");
    },
  );

  it("rejects a CRC-valid PNG with an oversized IHDR before vendor options", () => {
    expect(() => toStylingOptions({
      data: "x",
      style: { ...base, logoUrl: OVERSIZED_LOGO, logoSizeRatio: 0.2 },
      size: 512,
    })).toThrow("The logo is not an accepted local image.");
  });

  it("rejects a CRC-valid 1025x1 PNG at the prepared options boundary", () => {
    expect(() => toStylingOptions({
      data: "x",
      style: { ...base, logoUrl: ONE_OVER_PREPARED_LOGO, logoSizeRatio: 0.2 },
      size: 512,
    })).toThrow("The logo is not an accepted local image.");
  });

  it("carries a gradient to the dots and both corner figures", () => {
    const options = toStylingOptions({
      data: "x",
      style: { ...base, fgGradient: { type: "linear", rotation: 45, from: "#0f0", to: "#00f" } },
      size: 512,
    });
    const expected = toStylingGradient({ type: "linear", rotation: 45, from: "#0f0", to: "#00f" });
    expect(options.dotsOptions?.gradient).toEqual(expected);
    expect(options.cornersSquareOptions?.gradient).toEqual(expected);
    expect(options.cornersDotOptions?.gradient).toEqual(expected);
  });

  it("snaps modules to whole pixels for canvas and not for svg", () => {
    expect(
      toStylingOptions({ data: "x", style: base, size: 512, drawType: "canvas" }).dotsOptions
        ?.roundSize,
    ).toBe(true);
    expect(
      toStylingOptions({ data: "x", style: base, size: 512, drawType: "svg" }).dotsOptions
        ?.roundSize,
    ).toBe(false);
  });

  it("uses the real module count when one is supplied", () => {
    const withHint = toStylingOptions({ data: "x", style: base, size: 1024 });
    const withReal = toStylingOptions({ data: "x", style: base, size: 1024, moduleCount: 101 });
    expect(withReal.margin).not.toBe(withHint.margin);
    expect(withReal.margin).toBeCloseTo(quietZoneMarginPx(1024, 101, 4, false), 10);
  });
});
