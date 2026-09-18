/**
 * Guards the one mistake that breaks `next build`.
 *
 * `qr-code-styling` dereferences `document` while its module body runs, so if
 * anything under `src/qr/render` ever reaches for it at module scope, importing
 * the barrel from a server component takes the build down. This file runs in
 * the node project — no DOM, no `window`, no `document` — so a static import
 * creeping back in fails here long before it fails in CI.
 */
import { describe, expect, it } from "vitest";

describe("server-side safety", () => {
  it("has no DOM to accidentally touch", () => {
    expect(typeof document).toBe("undefined");
    expect(typeof window).toBe("undefined");
  });

  it("imports the whole public surface without a DOM", async () => {
    const render = await import("@/qr/render");
    expect(typeof render.quietZoneMarginPx).toBe("function");
    expect(typeof render.describePrintSize).toBe("function");
    expect(typeof render.downloadPng).toBe("function");
    expect(typeof render.QrPreview).toBe("function");
    expect(typeof render.TestScanCard).toBe("function");
  });

  it("computes print guidance server-side, for a statically rendered SEO page", async () => {
    const { describePrintSize } = await import("@/qr/render");
    expect(describePrintSize({ moduleCount: 33, quietZoneModules: 4 }, "th").headline).toContain(
      "ซม.",
    );
  });

  it("refuses to load the browser-only library instead of crashing on `document`", async () => {
    const { loadQrCodeStyling } = await import("@/qr/render");
    await expect(loadQrCodeStyling()).rejects.toThrow(/browser-only/);
  });
});
