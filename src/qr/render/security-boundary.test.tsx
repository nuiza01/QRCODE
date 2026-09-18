import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { QrRenderer, renderOnce } from "@/qr/render/engine";
import {
  downloadPdf, downloadPng, downloadSvg, renderPdfBlob, renderPngBlob, renderSvgString,
} from "@/qr/render/export";
import { QrPreview } from "@/qr/render/QrPreview";
import { TestScanCard } from "@/qr/render/TestScanCard";
import { renderCopy } from "@/qr/render/strings";
import { DEFAULT_STYLE, type QrStyle } from "@/qr/types";

const sinks = vi.hoisted(() => ({
  constructor: vi.fn(), update: vi.fn(), append: vi.fn(), raw: vi.fn(),
  pdf: vi.fn(), svg2pdf: vi.fn(),
}));

// Deliberately inert vendor double. Red tests may pass hostile paint through
// the old boundary, but never mount that paint or perform a resource request.
vi.mock("qr-code-styling", () => ({
  default: class {
    _qr = { getModuleCount: () => 33 };
    constructor(options: unknown) { sinks.constructor(options); }
    update(options: unknown) { sinks.update(options); }
    append(host: HTMLElement) {
      sinks.append();
      host.replaceChildren(document.createElementNS("http://www.w3.org/2000/svg", "svg"));
    }
    async getRawData() {
      sinks.raw();
      return Object.assign(new Blob([]), {
        text: async () => '<svg xmlns="http://www.w3.org/2000/svg"/>',
      });
    }
  },
}));
vi.mock("jspdf", () => ({
  jsPDF: class {
    constructor() { sinks.pdf(); }
    internal = { pageSize: { getWidth: () => 210, getHeight: () => 297 } };
    output() { return new Blob([]); }
  },
}));
vi.mock("svg2pdf.js", () => ({ svg2pdf: sinks.svg2pdf }));

const marker = "SYNTHETIC_COLOR";
const attack = `url(https://example.invalid/${marker}.svg#p)`;
const badStyles: { name: string; style: QrStyle }[] = [
  { name: "foreground", style: { ...DEFAULT_STYLE, fgColor: attack } },
  { name: "background", style: { ...DEFAULT_STYLE, bgColor: attack } },
  { name: "gradient from", style: { ...DEFAULT_STYLE, fgGradient: { type: "linear", from: attack, to: "#000" } } },
  { name: "gradient to", style: { ...DEFAULT_STYLE, fgGradient: { type: "radial", from: "#000", to: attack } } },
];
const payload = { type: "text" as const, text: "lastValid ไทย😀" };
const safeError = "QR colors must use #RGB or #RRGGBB.";

function expectNoSinks() {
  for (const sink of Object.values(sinks)) expect(sink).not.toHaveBeenCalled();
}

afterEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

describe("SEC-002 render/export boundary (unit doubles, NOT network verification)", () => {
  it.each(badStyles)("rejects $name before a new vendor instance or an existing update", async ({ style }) => {
    const renderer = await QrRenderer.load();
    try {
      expect(() => renderer.updateEncoded({ data: payload.text, style, size: 320 })).toThrow(safeError);
      expectNoSinks();
      renderer.update({ payload, style: DEFAULT_STYLE, size: 320 });
      vi.clearAllMocks();
      expect(() => renderer.update({ payload, style, size: 320 })).toThrow(safeError);
      expectNoSinks();
    } finally { renderer.destroy(); }
  });

  const entries: { name: string; run: (style: QrStyle) => Promise<unknown> }[] = [
    { name: "renderOnce", run: (style) => renderOnce({ payload, style, size: 512 }) },
    ...([512, 1024, 2048] as const).map((size) => ({
      name: `PNG ${size}`, run: (style: QrStyle) => renderPngBlob({ payload, style, size }),
    })),
    { name: "SVG", run: (style) => renderSvgString({ payload, style }) },
    { name: "PDF", run: (style) => renderPdfBlob({ payload, style }) },
    { name: "download PNG", run: (style) => downloadPng({ payload, style }) },
    { name: "download SVG", run: (style) => downloadSvg({ payload, style }) },
    { name: "download PDF", run: (style) => downloadPdf({ payload, style }) },
  ];
  it.each(entries)("$name rejects all color slots before vendor, PDF mount or download", async ({ run }) => {
    const parser = vi.spyOn(DOMParser.prototype, "parseFromString");
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    for (const { style } of badStyles) {
      await expect(run(style)).rejects.toThrow(safeError);
      expectNoSinks();
      expect(parser).not.toHaveBeenCalled();
      expect(click).not.toHaveBeenCalled();
    }
  });
});

describe.each(["th", "en"] as const)("SEC-002 %s preview/TestScan", (locale) => {
  it.each(badStyles)("rejects initial $name and a bad update with a last-valid payload", async ({ style }) => {
    // The host may retain the last safe drawing. Invalid style must never be
    // sent to the vendor merely because a valid old payload still exists.
    const view = render(<QrPreview payload={payload} style={style} locale={locale} />);
    await screen.findByText(renderCopy(locale).previewError);
    expectNoSinks();
    expect(view.container.textContent).not.toContain(marker);
    view.rerender(<QrPreview payload={payload} style={DEFAULT_STYLE} locale={locale} />);
    await waitFor(() => expect(screen.queryByText(renderCopy(locale).previewError)).toBeNull());
    expect(sinks.constructor).toHaveBeenCalled();
    vi.clearAllMocks();
    view.rerender(<QrPreview payload={payload} style={style} locale={locale} />);
    await screen.findByText(renderCopy(locale).previewError);
    expectNoSinks();
    expect(view.container.innerHTML).not.toContain(marker);
  });

  it.each(badStyles)("TestScan rejects $name without echoing the paint", async ({ style }) => {
    const view = render(<TestScanCard payload={payload} style={style} locale={locale} />);
    await screen.findByText(renderCopy(locale).previewError);
    expectNoSinks();
    expect(view.container.innerHTML).not.toContain(marker);
  });
});
