import { describe, expect, it } from "vitest";
import { DEFAULT_STYLE } from "@/qr/types";
import {
  contrastRatio,
  hasBlockingIssue,
  inspectStyle,
  isInverted,
  minPrintSizeMm,
  normalizeStyle,
} from "@/qr/quality";

describe("contrastRatio", () => {
  it("returns 21 for black on white", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 5);
  });

  it("handles shorthand hex", () => {
    expect(contrastRatio("#000", "#fff")).toBeCloseTo(21, 5);
  });

  it("returns null for an unparseable color", () => {
    expect(contrastRatio("rebeccapurple", "#fff")).toBeNull();
  });
});

describe("normalizeStyle", () => {
  it("raises a too-small quiet zone to the 4-module floor", () => {
    const out = normalizeStyle({ ...DEFAULT_STYLE, marginModules: 0 });
    expect(out.marginModules).toBe(4);
  });

  it("forces ECC H and caps the logo when a logo is present", () => {
    const out = normalizeStyle({
      ...DEFAULT_STYLE,
      ecc: "L",
      logoUrl: "https://example.com/logo.png",
      logoSizeRatio: 0.6,
    });

    expect(out.ecc).toBe("H");
    expect(out.logoSizeRatio).toBe(0.25);
  });

  it("leaves ECC alone when there is no logo", () => {
    expect(normalizeStyle({ ...DEFAULT_STYLE, ecc: "L" }).ecc).toBe("L");
    expect(normalizeStyle({ ...DEFAULT_STYLE, ecc: "L" }).logoSizeRatio).toBeUndefined();
  });
});

describe("inspectStyle", () => {
  it("passes a plain black-on-white code", () => {
    expect(inspectStyle(DEFAULT_STYLE)).toHaveLength(0);
  });

  it("blocks a low-contrast pair", () => {
    const issues = inspectStyle({
      ...DEFAULT_STYLE,
      fgColor: "#cccccc",
      bgColor: "#ffffff",
    });

    expect(hasBlockingIssue(issues)).toBe(true);
    expect(issues.some((i) => i.code === "contrast-too-low")).toBe(true);
  });

  it("warns without blocking on an inverted code", () => {
    const style = { ...DEFAULT_STYLE, fgColor: "#ffffff", bgColor: "#000000" };
    const issues = inspectStyle(style);

    expect(isInverted(style)).toBe(true);
    expect(issues.some((i) => i.code === "inverted")).toBe(true);
    expect(hasBlockingIssue(issues)).toBe(false);
  });

  describe.each(["linear", "radial"] as const)("%s gradient safety", (type) => {
    it.each([0, 45, 180])("blocks either white endpoint on white at rotation %s", (rotation) => {
      for (const [from, to] of [["#000", "#fff"], ["#fff", "#000"]]) {
        const issues = inspectStyle({
          ...DEFAULT_STYLE,
          fgGradient: { type, rotation, from, to },
        });
        expect(issues).toContainEqual(expect.objectContaining({
          level: "error", code: "contrast-too-low",
        }));
        expect(hasBlockingIssue(issues)).toBe(true);
      }
    });

    it("blocks a span crossing the background even when both endpoints meet the minimum", () => {
      const bgColor = "#777";
      expect(contrastRatio("#000", bgColor)).toBeGreaterThanOrEqual(3);
      expect(contrastRatio("#fff", bgColor)).toBeGreaterThanOrEqual(3);
      const issues = inspectStyle({
        ...DEFAULT_STYLE, bgColor,
        fgGradient: { type, from: "#000", to: "#fff" },
      });
      expect(hasBlockingIssue(issues)).toBe(true);
    });

    it("conservatively blocks mixed-channel interior dips on a dark background", () => {
      // Endpoints alone cannot bound luminance from below: red-to-green can
      // become darker between its stops. The channel envelope must cover it.
      const bgColor = "#222";
      expect(contrastRatio("#f00", bgColor)).toBeGreaterThanOrEqual(3);
      expect(contrastRatio("#0f0", bgColor)).toBeGreaterThanOrEqual(3);
      expect(hasBlockingIssue(inspectStyle({
        ...DEFAULT_STYLE, bgColor,
        fgGradient: { type, from: "#f00", to: "#0f0" },
      }))).toBe(true);
    });

    it.each(["from", "to"] as const)("rejects an invalid %s endpoint", (endpoint) => {
      const issues = inspectStyle({
        ...DEFAULT_STYLE,
        fgGradient: { type, from: "#000", to: "#123", [endpoint]: "invalid" },
      });
      expect(issues).toContainEqual(expect.objectContaining({
        level: "error", code: "invalid-color",
      }));
    });

    it("passes a safely dark gradient and leaves the raw style unchanged", () => {
      const style = {
        ...DEFAULT_STYLE,
        fgGradient: { type, from: "#001020", to: "#203040" },
      };
      const before = structuredClone(style);
      expect(inspectStyle(style)).toEqual([]);
      expect(style).toEqual(before);
    });

    it("retains a non-blocking warning using the weaker endpoint", () => {
      const issues = inspectStyle({
        ...DEFAULT_STYLE,
        fgGradient: { type, from: "#000", to: "#777" },
      });
      expect(issues).toContainEqual(expect.objectContaining({
        level: "warning", code: "contrast-low",
      }));
      expect(hasBlockingIssue(issues)).toBe(false);
    });

    it("detects inversion at the second endpoint", () => {
      expect(isInverted({
        ...DEFAULT_STYLE, bgColor: "#777",
        fgGradient: { type, from: "#000", to: "#fff" },
      })).toBe(true);
    });

    it("keeps a high-contrast light gradient on black non-blocking but warns about inversion", () => {
      const issues = inspectStyle({
        ...DEFAULT_STYLE, bgColor: "#000",
        fgGradient: { type, from: "#ddd", to: "#fff" },
      });
      expect(issues).toEqual([expect.objectContaining({
        level: "warning", code: "inverted",
      })]);
      expect(hasBlockingIssue(issues)).toBe(false);
    });

    it.each(["#000", "#777", "#fff"])("matches solid-color behavior for constant %s", (color) => {
      const solid = { ...DEFAULT_STYLE, fgColor: color };
      expect(inspectStyle({
        ...solid, fgGradient: { type, from: color, to: color },
      })).toEqual(inspectStyle(solid));
    });
  });
});

describe("minPrintSizeMm", () => {
  it("applies the distance-over-ten rule", () => {
    expect(minPrintSizeMm(1000)).toBe(100);
  });

  it("never recommends smaller than the 20mm floor", () => {
    expect(minPrintSizeMm(100)).toBe(20);
  });
});
