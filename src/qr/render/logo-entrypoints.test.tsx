import { act, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { QrPreview, type QrPreviewStatus } from "@/qr/render/QrPreview";
import {
  downloadPdf,
  downloadPng,
  downloadSvg,
  renderPdfBlob,
  renderPngBlob,
  renderSvgString,
} from "@/qr/render/export";
import { logoPreparationFailureCode } from "@/qr/render/logo";
import { DEFAULT_STYLE, type QrStyle } from "@/qr/types";

const sinks = vi.hoisted(() => ({
  vendorOptions: vi.fn(),
  pdf: vi.fn(),
  pdfOutput: vi.fn(),
  rawData: vi.fn(),
  svg2pdf: vi.fn(),
  createUrl: vi.fn(() => "blob:nqr046-unit"),
  download: vi.fn(),
}));

vi.mock("qr-code-styling", () => ({
  default: class {
    _qr = { getModuleCount: () => 21 };
    private svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    private options: { data?: string; image?: string } = {};

    update(options?: { data?: string; image?: string }) {
      sinks.vendorOptions(options);
      this.options = { ...this.options, ...options };
      this.svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      this.svg.setAttribute("viewBox", "0 0 320 320");
      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("d", "M0 0h20v20z");
      this.svg.appendChild(path);
      if (this.options.image) {
        const image = document.createElementNS("http://www.w3.org/2000/svg", "image");
        image.setAttribute("href", this.options.image);
        this.svg.appendChild(image);
      }
    }

    append(host: HTMLElement) {
      host.replaceChildren(this.svg);
    }

    getRawData(extension: "png" | "svg") {
      return sinks.rawData(extension, this.svg);
    }
  },
}));

vi.mock("jspdf", () => ({
  jsPDF: class {
    internal = { pageSize: { getWidth: () => 210, getHeight: () => 297 } };
    constructor() { sinks.pdf(); }
    output() { return sinks.pdfOutput(); }
  },
}));

vi.mock("svg2pdf.js", () => ({
  svg2pdf: (element: Element) => sinks.svg2pdf(element.outerHTML),
}));

const originalMarker = "NQR046_PRIVATE_ORIGINAL_SVG";
const payload = { type: "text" as const, text: "NQR046 payload ไทย😀" };
const preparedPngBytes = Uint8Array.from(
  atob("iVBORw0KGgoAAAANSUhEUgAAAEAAAAAgCAYAAACinX6EAAAAHklEQVR42u3BAQ0AAADCoPdPbQ8HFAAAAAAAAADwbiAgAAGwRW23AAAAAElFTkSuQmCC"),
  (char) => char.charCodeAt(0),
);
const NativeURL = URL;

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

function dataUrl(mime: string, bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return `data:${mime};base64,${btoa(binary)}`;
}

function passiveSvg(marker = originalMarker): string {
  return dataUrl("image/svg+xml", new TextEncoder().encode(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 16"><title>${marker}</title><path d="M0 0h32v16z" fill="#123456"/></svg>`,
  ));
}

function style(logoUrl = passiveSvg()): QrStyle {
  return { ...DEFAULT_STYLE, logoUrl, logoSizeRatio: 0.2 };
}

type PendingImage = FakeImage;
const pendingImages: PendingImage[] = [];
const canvases: HTMLCanvasElement[] = [];
let holdImages = false;

class FakeImage {
  naturalWidth = 64;
  naturalHeight = 32;
  width = 64;
  height = 32;
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  private value = "";

  set src(value: string) {
    this.value = value;
    if (!value) return;
    pendingImages.push(this);
    if (!holdImages) queueMicrotask(() => this.onload?.());
  }
  get src() { return this.value; }
  finish() { this.onload?.(); }
}

beforeEach(() => {
  holdImages = false;
  pendingImages.length = 0;
  canvases.length = 0;
  sinks.vendorOptions.mockClear();
  sinks.pdf.mockClear();
  sinks.pdfOutput.mockReset().mockReturnValue(new Blob(["UNIT_PDF"], { type: "application/pdf" }));
  sinks.rawData.mockReset().mockImplementation(async (extension: "png" | "svg", svg: SVGElement) => {
    if (extension === "png") return new Blob(["UNIT_PNG"], { type: "image/png" });
    return new Blob([new XMLSerializer().serializeToString(svg)], { type: "image/svg+xml" });
  });
  sinks.svg2pdf.mockReset().mockResolvedValue(undefined);
  sinks.createUrl.mockClear();
  sinks.download.mockClear();
  vi.stubGlobal("URL", class extends NativeURL { static createObjectURL = sinks.createUrl; });
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => { callback(0); return 1; });
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => { sinks.download(); });
  vi.stubGlobal("Image", FakeImage);
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(function (this: HTMLCanvasElement) {
    canvases.push(this);
    return { drawImage: vi.fn() } as unknown as CanvasRenderingContext2D;
  });
  vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation(function (this: HTMLCanvasElement, callback) {
    callback(new Blob([preparedPngBytes], { type: "image/png" }));
  });
  vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new Error("network must not run"))));
  vi.stubGlobal("XMLHttpRequest", vi.fn(() => { throw new Error("resource loader must not run"); }));
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function vendorImages(): string[] {
  return sinks.vendorOptions.mock.calls
    .map(([options]) => (options as { image?: string } | undefined)?.image)
    .filter((value): value is string => typeof value === "string");
}

describe("logo boundary at preview and export entry points", () => {
  it("rasterizes before preview and keeps the public payload/style contract", async () => {
    const statuses: QrPreviewStatus[] = [];
    const results: Array<{ data: string; style: QrStyle }> = [];
    const rawStyle = style();
    render(
      <QrPreview
        payload={payload}
        style={rawStyle}
        renderRevision={1}
        onStatus={(status) => statuses.push(status)}
        onRender={(result) => results.push(result)}
      />,
    );
    await waitFor(() => expect(statuses).toContainEqual(expect.objectContaining({ revision: 1, state: "success" })));
    expect(results[0]?.data).toBe(payload.text);
    expect(results[0]?.style.logoUrl).toBe(rawStyle.logoUrl);
    expect(vendorImages()).not.toHaveLength(0);
    expect(vendorImages().every((value) => value.startsWith("data:image/png;base64,"))).toBe(true);
    expect(JSON.stringify(sinks.vendorOptions.mock.calls)).not.toContain(originalMarker);
    expect(fetch).not.toHaveBeenCalled();
    expect(XMLHttpRequest).not.toHaveBeenCalled();
    expect(canvases.every((canvas) => canvas.width === 0 && canvas.height === 0)).toBe(true);
  });

  it("keeps QR artwork vector and only the logo raster across PNG/SVG/PDF", async () => {
    const png = await renderPngBlob({ payload, style: style(), size: 512 });
    const svg = await renderSvgString({ payload, style: style() });
    const pdf = await renderPdfBlob({ payload, style: style() });

    expect(png.blob.type).toBe("image/png");
    expect(svg.svg).toContain("<path");
    expect(svg.svg).toContain("data:image/png;base64,");
    expect(svg.svg).not.toContain(originalMarker);
    expect(pdf.blob.type).toBe("application/pdf");
    expect(sinks.svg2pdf).toHaveBeenCalledOnce();
    const pdfSvg = String(sinks.svg2pdf.mock.calls[0]?.[0]);
    expect(pdfSvg).toContain("<path");
    expect(pdfSvg).toContain("data:image/png;base64,");
    expect(pdfSvg).not.toMatch(/<a\b|javascript:|href="(?:https?:|\/\/)|annotation/i);
    expect(vendorImages().every((value) => value.startsWith("data:image/png;base64,"))).toBe(true);
    expect(JSON.stringify(sinks.vendorOptions.mock.calls)).not.toContain(originalMarker);
    expect(fetch).not.toHaveBeenCalled();
    expect(XMLHttpRequest).not.toHaveBeenCalled();
    expect(canvases.every((canvas) => canvas.width === 0 && canvas.height === 0)).toBe(true);
  });

  it.each([
    ["PNG", (logoUrl: string) => renderPngBlob({ payload, style: style(logoUrl), size: 512 })],
    ["SVG", (logoUrl: string) => renderSvgString({ payload, style: style(logoUrl) })],
    ["PDF", (logoUrl: string) => renderPdfBlob({ payload, style: style(logoUrl) })],
  ])("rejects active/malformed %s logos before vendor and PDF sinks, then recovers", async (_name, run) => {
    const unsafe = dataUrl("image/svg+xml", new TextEncoder().encode(
      `<svg xmlns="http://www.w3.org/2000/svg"><image href="https://PRIVATE.invalid/x.png"/></svg>`,
    ));
    await expect(run(unsafe)).rejects.toSatisfy((error: unknown) => {
      expect(logoPreparationFailureCode(error)).toBe("logo-invalid");
      expect((error as Error).message).not.toContain("PRIVATE");
      return true;
    });
    expect(sinks.vendorOptions).not.toHaveBeenCalled();
    expect(sinks.pdf).not.toHaveBeenCalled();
    expect(sinks.svg2pdf).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
    expect(XMLHttpRequest).not.toHaveBeenCalled();
    await expect(run(passiveSvg("RECOVERY"))).resolves.toBeDefined();
  });

  it.each([
    ["PNG", (logoUrl: string) => renderPngBlob({ payload, style: style(logoUrl), size: 512 })],
    ["SVG", (logoUrl: string) => renderSvgString({ payload, style: style(logoUrl) })],
    ["PDF", (logoUrl: string) => renderPdfBlob({ payload, style: style(logoUrl) })],
  ])("rejects oversize %s source before decode/vendor and later recovers", async (_name, run) => {
    const oversize = `data:image/png;base64,${"A".repeat(700_000)}`;
    await expect(run(oversize)).rejects.toSatisfy((error: unknown) => {
      expect(logoPreparationFailureCode(error)).toBe("logo-too-large");
      return true;
    });
    expect(pendingImages).toHaveLength(0);
    expect(sinks.vendorOptions).not.toHaveBeenCalled();
    expect(sinks.pdf).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
    expect(XMLHttpRequest).not.toHaveBeenCalled();
    await expect(run(passiveSvg("OVERSIZE_RECOVERY"))).resolves.toBeDefined();
  });

  it("keeps an invalid preview generic/private and recovers on the latest revision", async () => {
    const statuses: QrPreviewStatus[] = [];
    const unsafe = dataUrl("image/svg+xml", new TextEncoder().encode(
      `<svg xmlns="http://www.w3.org/2000/svg"><script>PRIVATE()</script></svg>`,
    ));
    const view = render(
      <QrPreview payload={payload} style={style(unsafe)} renderRevision={20} onStatus={(s) => statuses.push(s)} />,
    );
    await waitFor(() => expect(statuses).toEqual([{ revision: 20, state: "error", code: "render-failed" }]));
    expect(JSON.stringify(statuses)).not.toContain("PRIVATE");
    expect(sinks.vendorOptions).not.toHaveBeenCalled();
    view.rerender(
      <QrPreview payload={payload} style={style(passiveSvg("PREVIEW_RECOVERY"))} renderRevision={21} onStatus={(s) => statuses.push(s)} />,
    );
    await waitFor(() => expect(statuses.at(-1)).toEqual(expect.objectContaining({ revision: 21, state: "success" })));
  });

  it("cancels an export before vendor use and recovers without leaked work", async () => {
    holdImages = true;
    const controller = new AbortController();
    const pending = renderSvgString({ payload, style: style(), signal: controller.signal });
    await waitFor(() => expect(pendingImages).toHaveLength(1));
    controller.abort();
    await expect(pending).rejects.toSatisfy((error: unknown) => {
      expect(logoPreparationFailureCode(error)).toBe("logo-cancelled");
      return true;
    });
    expect(sinks.vendorOptions).not.toHaveBeenCalled();
    pendingImages[0]?.finish();
    await act(async () => { await Promise.resolve(); });
    expect(sinks.vendorOptions).not.toHaveBeenCalled();

    holdImages = false;
    await expect(renderSvgString({ payload, style: style(passiveSvg("RECOVERY")) })).resolves.toBeDefined();
  });

  it("rejects deferred PNG output after abort and never invokes the save sink", async () => {
    const gate = deferred<Blob>();
    sinks.rawData.mockImplementationOnce(() => gate.promise);
    const controller = new AbortController();
    const pending = downloadPng({ payload, style: DEFAULT_STYLE, size: 512, signal: controller.signal });
    await waitFor(() => expect(sinks.rawData).toHaveBeenCalledWith("png", expect.anything()));
    controller.abort();
    gate.resolve(new Blob(["LATE_PNG"], { type: "image/png" }));
    await expect(pending).rejects.toSatisfy((error: unknown) => logoPreparationFailureCode(error) === "logo-cancelled");
    expect(sinks.createUrl).not.toHaveBeenCalled();
    expect(sinks.download).not.toHaveBeenCalled();
  });

  it("rejects deferred SVG output after abort and never invokes the save sink", async () => {
    const gate = deferred<Blob>();
    sinks.rawData.mockImplementationOnce(() => gate.promise);
    const controller = new AbortController();
    const pending = downloadSvg({ payload, style: DEFAULT_STYLE, signal: controller.signal });
    await waitFor(() => expect(sinks.rawData).toHaveBeenCalledWith("svg", expect.anything()));
    controller.abort();
    gate.resolve(new Blob([`<svg xmlns="http://www.w3.org/2000/svg"/>`], { type: "image/svg+xml" }));
    await expect(pending).rejects.toSatisfy((error: unknown) => logoPreparationFailureCode(error) === "logo-cancelled");
    expect(sinks.createUrl).not.toHaveBeenCalled();
    expect(sinks.download).not.toHaveBeenCalled();
  });

  it("rejects deferred PDF conversion after abort and never outputs or saves", async () => {
    const gate = deferred<void>();
    sinks.svg2pdf.mockImplementationOnce(() => gate.promise);
    const controller = new AbortController();
    const pending = downloadPdf({ payload, style: DEFAULT_STYLE, signal: controller.signal });
    await waitFor(() => expect(sinks.svg2pdf).toHaveBeenCalledOnce());
    controller.abort();
    gate.resolve();
    await expect(pending).rejects.toSatisfy((error: unknown) => logoPreparationFailureCode(error) === "logo-cancelled");
    expect(sinks.pdfOutput).not.toHaveBeenCalled();
    expect(sinks.createUrl).not.toHaveBeenCalled();
    expect(sinks.download).not.toHaveBeenCalled();
  });

  it("preview aborts stale logo work and only the latest revision reaches vendor/status", async () => {
    holdImages = true;
    const statuses: QrPreviewStatus[] = [];
    const view = render(
      <QrPreview payload={payload} style={style(passiveSvg("OLD"))} renderRevision={10} onStatus={(s) => statuses.push(s)} />,
    );
    await waitFor(() => expect(pendingImages).toHaveLength(1));
    view.rerender(
      <QrPreview payload={payload} style={style(passiveSvg("LATEST"))} renderRevision={11} onStatus={(s) => statuses.push(s)} />,
    );
    await waitFor(() => expect(pendingImages).toHaveLength(2));
    pendingImages[0]?.finish();
    expect(sinks.vendorOptions).not.toHaveBeenCalled();
    pendingImages[1]?.finish();
    await waitFor(() => expect(statuses).toEqual([expect.objectContaining({ revision: 11, state: "success" })]));
    expect(vendorImages()).toHaveLength(1);
    view.rerender(
      <QrPreview payload={payload} style={DEFAULT_STYLE} renderRevision={12} onStatus={(s) => statuses.push(s)} />,
    );
    await waitFor(() => expect(statuses.at(-1)).toEqual(expect.objectContaining({ revision: 12, state: "success" })));
    const lastOptions = sinks.vendorOptions.mock.calls.at(-1)?.[0] as { image?: string } | undefined;
    expect(lastOptions?.image).toBeUndefined();
    expect(view.container.querySelector("image")).toBeNull();
    view.unmount();
  });
});
