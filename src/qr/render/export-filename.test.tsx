import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { encodePayload } from "@/qr/payload/encode";
import {
  defaultLabelFor, downloadPdf, downloadPng, downloadSvg,
  renderPdfBlob, renderPngBlob, renderSvgString,
  type QrExportInput, type QrExportResult,
} from "@/qr/render/export";
import { DEFAULT_STYLE, type QrPayload, type QrStyle } from "@/qr/types";
import type { Options } from "qr-code-styling";

const io = vi.hoisted(() => ({
  vendor: vi.fn(), pdf: vi.fn(), svg2pdf: vi.fn(),
  createUrl: vi.fn(() => "blob:unit-filename"), revokeUrl: vi.fn(),
}));

// Exercise the real convenience exporters, renderer, encoder and naming code;
// stub drawing/PDF engines and the download sink only. These are not actual
// PNG/PDF files or evidence of browser-suggested/OS-saved filenames.
vi.mock("qr-code-styling", () => ({
  default: class {
    _qr = { getModuleCount: () => 33 };
    constructor(options: Options) { io.vendor(options); }
    update(options: Options) { io.vendor(options); }
    async getRawData(extension: string) {
      return Object.assign(new Blob([`UNIT_${extension}`]), {
        text: async () => '<svg xmlns="http://www.w3.org/2000/svg"/>',
      });
    }
  },
}));
vi.mock("jspdf", () => ({
  jsPDF: class {
    constructor(options: unknown) { io.pdf(options); }
    internal = { pageSize: { getWidth: () => 210, getHeight: () => 297 } };
    output() { return new Blob(["UNIT_PDF"]); }
  },
}));
vi.mock("svg2pdf.js", () => ({ svg2pdf: io.svg2pdf }));

const payloads: QrPayload[] = [
  { type: "url", url: "https://synthetic-host.example.invalid/SYNTHETIC_PATH?q=SYNTHETIC_QUERY" },
  { type: "text", text: "SYNTHETIC_TEXT ไทย😀" },
  { type: "wifi", ssid: "SYNTHETIC_SSID", password: "SYNTHETIC_PASSWORD", encryption: "WPA" },
  { type: "vcard", firstName: "SYNTHETIC_FIRST", lastName: "SYNTHETIC_LAST", email: "synthetic@example.invalid" },
  { type: "email", to: "synthetic@example.invalid", subject: "SYNTHETIC_SUBJECT ไทย" },
  { type: "sms", phone: "+12025550123", message: "SYNTHETIC_SMS ไทย" },
  { type: "tel", phone: "+12025550124" },
  { type: "geo", latitude: 12.345678, longitude: 98.765432 },
  { type: "event", title: "SYNTHETIC_EVENT", start: "2026-09-01", allDay: true },
  { type: "promptpay", targetType: "mobile", target: "0800000000", amount: 12.34 },
];

// A 33-module symbol plus 4 modules on each side gives 50 * 41/33 mm
// artwork at the default 50 mm symbol width: the existing variant is 62mm.
const formats: { name: string; suffix: string; run: (input: QrExportInput) => Promise<QrExportResult> }[] = [
  ...([512, 1024, 2048] as const).map((size) => ({
    name: `PNG ${size}`, suffix: `-${size}.png`,
    run: (input: QrExportInput) => downloadPng({ ...input, size }),
  })),
  { name: "SVG", suffix: ".svg", run: downloadSvg },
  { name: "PDF", suffix: "-62mm.pdf", run: downloadPdf },
];

const downloads: string[] = [];
beforeEach(() => {
  downloads.length = 0;
  vi.stubGlobal("URL", class extends URL {
    static createObjectURL = io.createUrl;
    static revokeObjectURL = io.revokeUrl;
  });
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => { callback(0); return 1; });
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
    downloads.push(this.download);
  });
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("SEC-005 generic convenience download names", () => {
  it.each(payloads)("defaultLabelFor never derives a label for $type", (payload) => {
    expect(defaultLabelFor(payload)).toBeUndefined();
  });

  it.each(payloads)("$type stays generic in all formats with missing or empty labels", async (payload) => {
    const before = structuredClone(payload);
    for (const label of [undefined, "", " \t\n ", "../!!!***", "☕", "๏๚๛"]) {
      for (const format of formats) {
        const input = { payload, style: DEFAULT_STYLE, ...(label === undefined ? {} : { label }) };
        const result = await format.run(input);
        const expected = `nexora-qr-${payload.type}${format.suffix}`;
        expect(result.filename).toBe(expected);
        expect(downloads.at(-1)).toBe(expected);
        expect(result.moduleCount).toBe(33);
        expect(result.quietZoneModules).toBeGreaterThanOrEqual(4 - 1e-9);
      }
    }
    expect(payload).toEqual(before);
    expect(io.createUrl).toHaveBeenCalledTimes(30);
    expect(io.revokeUrl).toHaveBeenCalledTimes(30);
    expect(document.querySelector("a[download]")).toBeNull();
  });

  it.each(payloads)("$type retains the explicitly supplied label, never substitutes payload", async (payload) => {
    for (const format of formats) {
      const result = await format.run({ payload, style: DEFAULT_STYLE, label: "Chosen Café ไทย" });
      expect(result.filename).toBe(`nexora-qr-${payload.type}-chosen-café-ไทย${format.suffix}`);
      expect(downloads.at(-1)).toBe(result.filename);
    }
  });

  it.each([
    ["../../Chosen\u0000\u202e Label.pdf.exe", "chosen-label-pdf-exe"],
    ["CON", "con-qr"],
    ["Cafe\u0301 ไทย", "café-ไทย"],
    ["A".repeat(50), "a".repeat(40)],
  ])("preserves sanitizer behavior for the explicit label %j", async (label, slug) => {
    for (const format of formats) {
      const result = await format.run({ payload: payloads[3], style: DEFAULT_STYLE, label });
      expect(result.filename).toBe(`nexora-qr-vcard-${slug}${format.suffix}`);
      expect(downloads.at(-1)).toBe(result.filename);
    }
  });

  it("preserves default PNG, SVG without a size suffix, and PDF artwork-width variants", async () => {
    const input = { payload: payloads[0], style: DEFAULT_STYLE };
    expect((await downloadPng(input)).filename).toBe("nexora-qr-url-1024.png");
    expect((await downloadSvg({ ...input, size: 2048 })).filename).toBe("nexora-qr-url.svg");
    expect((await downloadPdf({ ...input, symbolWidthMm: 100 })).filename).toBe("nexora-qr-url-124mm.pdf");
    expect((await downloadPdf({ ...input, symbolWidthMm: 1000 })).filename).toBe("nexora-qr-url-190mm.pdf");
  });

  it.each(payloads)("$type keeps payload/result.data when only the label changes", async (payload) => {
    const before = structuredClone(payload);
    // This checks export data flow, not independent correctness of the encoder.
    const expectedData = encodePayload(payload);
    for (const label of [undefined, "Chosen label"]) {
      const input = { payload, style: DEFAULT_STYLE, label };
      for (const result of [await renderPngBlob(input), await renderSvgString(input), await renderPdfBlob(input)]) {
        expect(result.render.data).toBe(expectedData);
      }
      const options = io.vendor.mock.lastCall![0] as Options;
      expect(options.data).toBe(Buffer.from(expectedData, "utf8").toString("latin1"));
    }
    expect(payload).toEqual(before);
    expect(downloads).toEqual([]); // Blob/string APIs still do not download.
  });

  it.each([
    { ...DEFAULT_STYLE, fgColor: "url(/SYNTHETIC_COLOR.svg#p)" },
    { ...DEFAULT_STYLE, bgColor: "var(--SYNTHETIC_COLOR)" },
    { ...DEFAULT_STYLE, fgGradient: { type: "linear", from: "../SYNTHETIC_COLOR", to: "#000" } },
    { ...DEFAULT_STYLE, fgGradient: { type: "radial", from: "#000", to: "url(#SYNTHETIC_COLOR)" } },
  ] satisfies QrStyle[])("an explicit label cannot bypass color admission: %j", async (style) => {
    for (const format of formats) {
      await expect(format.run({ payload: payloads[0], style, label: "Chosen label" }))
        .rejects.toThrow("QR colors must use #RGB or #RRGGBB.");
    }
    expect(io.vendor).not.toHaveBeenCalled();
    expect(io.pdf).not.toHaveBeenCalled();
    expect(io.svg2pdf).not.toHaveBeenCalled();
    expect(io.createUrl).not.toHaveBeenCalled();
    expect(downloads).toEqual([]);
  });
});
