import { afterEach, describe, expect, it, vi } from "vitest";
import { deflateSync } from "node:zlib";

import {
  LogoPreparationError,
  MAX_LOGO_SOURCE_BYTES,
  assertPreparedLogoForVendor,
  logoPreparationFailureCode,
  prepareLogoForRender,
  type LogoRasterRuntime,
} from "@/qr/render/logo";
import { QrRenderer, loadQrCodeStyling } from "@/qr/render/engine";
import { DEFAULT_STYLE } from "@/qr/types";

const preparedPng = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR42mNgAAIAAAUAAen63NgAAAAASUVORK5CYII=";
const oversizedPng = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgABAAAAAAABCAYAAABrcuPYAAABFUlEQVR42u3BMQEAAADCoPVP7W8GoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAzgAAPQABttYMtwAAAABJRU5ErkJggg==";

function dataUrl(mime: string, bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return `data:${mime};base64,${btoa(binary)}`;
}

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, value: Uint8Array): Uint8Array {
  const typeBytes = new TextEncoder().encode(type);
  const output = new Uint8Array(value.length + 12);
  const view = new DataView(output.buffer);
  view.setUint32(0, value.length);
  output.set(typeBytes, 4);
  output.set(value, 8);
  view.setUint32(value.length + 8, crc32(output.subarray(4, value.length + 8)));
  return output;
}

function canonicalPng(width: number, height: number): string {
  const signature = Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = new Uint8Array(13);
  const view = new DataView(ihdr.buffer);
  view.setUint32(0, width);
  view.setUint32(4, height);
  ihdr.set([8, 6, 0, 0, 0], 8);
  const compressed = deflateSync(new Uint8Array((width * 4 + 1) * height), { level: 9 });
  const chunks = [signature, pngChunk("IHDR", ihdr), pngChunk("IDAT", compressed), pngChunk("IEND", new Uint8Array())];
  const bytes = new Uint8Array(chunks.reduce((total, chunk) => total + chunk.length, 0));
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  return dataUrl("image/png", bytes);
}

const preparedBoundaryPng = canonicalPng(1024, 1024);
const preparedOneOverPng = canonicalPng(1025, 1);
const preparedPixelOverPng = canonicalPng(1024, 1025);

function svgData(markup: string): string {
  return dataUrl("image/svg+xml", new TextEncoder().encode(markup));
}

function runtime(
  implementation: LogoRasterRuntime["rasterize"] = async () => ({
    dataUrl: preparedPng,
    width: 1,
    height: 1,
    byteLength: 68,
  }),
): LogoRasterRuntime {
  return { rasterize: vi.fn(implementation) };
}

function expectCode(error: unknown, code: ReturnType<typeof logoPreparationFailureCode>) {
  expect(error).toBeInstanceOf(LogoPreparationError);
  expect(logoPreparationFailureCode(error)).toBe(code);
  expect((error as Error).message).not.toMatch(/PRIVATE|https?:|data:image|<script/i);
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("passive local logo admission", () => {
  it("hands only prepared local PNG options to the actual installed vendor matrix path", async () => {
    const Ctor = await loadQrCodeStyling();
    const setup = vi.spyOn(Ctor.prototype, "_setupSvg").mockImplementation(function (this: InstanceType<typeof Ctor>) {
      this._svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      this._svgDrawingPromise = Promise.resolve();
    });
    const xhr = vi.fn(() => { throw new Error("vendor XHR must not run"); });
    vi.stubGlobal("XMLHttpRequest", xhr);
    const renderer = await QrRenderer.load();
    const result = renderer.updateEncoded({
      data: "actual vendor logo ไทย😀",
      style: { ...DEFAULT_STYLE, logoUrl: preparedPng, logoSizeRatio: 0.2 },
      size: 512,
    });
    const vendor = setup.mock.contexts.at(-1) as InstanceType<typeof Ctor>;
    expect(result.data).toBe("actual vendor logo ไทย😀");
    expect(vendor._options.image).toBe(preparedPng);
    expect(vendor._options.imageOptions.saveAsBlob).toBe(false);
    expect(vendor._options.imageOptions.crossOrigin).toBeUndefined();
    expect(xhr).not.toHaveBeenCalled();
    renderer.destroy();
  });

  it("admits canonical 1024 output and rejects prepared dimension/pixel overflow before actual vendor update", async () => {
    const Ctor = await loadQrCodeStyling();
    vi.spyOn(Ctor.prototype, "_setupSvg").mockImplementation(function (this: InstanceType<typeof Ctor>) {
      this._svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      this._svgDrawingPromise = Promise.resolve();
    });
    const update = vi.spyOn(Ctor.prototype, "update");
    const renderer = await QrRenderer.load();
    expect(() => assertPreparedLogoForVendor(preparedBoundaryPng)).not.toThrow();
    expect(() => renderer.updateEncoded({
      data: "prepared boundary",
      style: { ...DEFAULT_STYLE, logoUrl: preparedBoundaryPng, logoSizeRatio: 0.2 },
      size: 512,
    })).not.toThrow();
    const admittedCalls = update.mock.calls.length;
    for (const logoUrl of [preparedOneOverPng, preparedPixelOverPng]) {
      expect(() => assertPreparedLogoForVendor(logoUrl)).toThrow("The logo is not an accepted local image.");
      expect(() => renderer.updateEncoded({
        data: "prepared overflow",
        style: { ...DEFAULT_STYLE, logoUrl, logoSizeRatio: 0.2 },
        size: 512,
      })).toThrow("The logo is not an accepted local image.");
    }
    expect(update).toHaveBeenCalledTimes(admittedCalls);
    renderer.destroy();
  });

  it("enforces prepared dimensions from PNG bytes at the runtime result seam", async () => {
    const source = dataUrl("image/png", Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10]));
    const result = (png: string, width: number, height: number) => runtime(async () => ({
      dataUrl: png,
      width,
      height,
      byteLength: atob(png.split(",")[1] ?? "").length,
    }));
    await expect(prepareLogoForRender(source, { runtime: result(preparedBoundaryPng, 1024, 1024) }))
      .resolves.toBe(preparedBoundaryPng);
    for (const [png, width, height] of [
      [preparedOneOverPng, 1025, 1],
      [preparedPixelOverPng, 1024, 1025],
    ] as const) {
      await expect(prepareLogoForRender(source, { runtime: result(png, width, height) }))
        .rejects.toSatisfy((error: unknown) => { expectCode(error, "logo-too-large"); return true; });
    }
  });

  it("retains 2048 source admission while production canvas output scales to canonical 1024", async () => {
    class BoundaryImage {
      naturalWidth = 2048;
      naturalHeight = 2048;
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      set src(value: string) { if (value) queueMicrotask(() => this.onload?.()); }
    }
    vi.stubGlobal("Image", BoundaryImage);
    const drawImage = vi.fn();
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(() => {
      return { drawImage } as unknown as CanvasRenderingContext2D;
    });
    const preparedBytes = Uint8Array.from(
      atob(preparedBoundaryPng.split(",")[1] ?? ""),
      (char) => char.charCodeAt(0),
    );
    vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation((callback) => {
      callback(new Blob([preparedBytes], { type: "image/png" }));
    });
    const source = dataUrl("image/png", Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10]));
    await expect(prepareLogoForRender(source)).resolves.toBe(preparedBoundaryPng);
    expect(drawImage).toHaveBeenCalledWith(expect.anything(), 0, 0, 1024, 1024);
  });

  it("rejects external/raw SVG at the direct renderer boundary before the installed vendor update", async () => {
    const Ctor = await loadQrCodeStyling();
    const update = vi.spyOn(Ctor.prototype, "update");
    const renderer = await QrRenderer.load();
    const rawSvg = svgData(`<svg xmlns="http://www.w3.org/2000/svg"><path d="M0 0"/></svg>`);
    const spoofedPng = dataUrl("image/png", new TextEncoder().encode(`<svg>PRIVATE</svg>`));
    for (const logoUrl of ["https://PRIVATE.invalid/logo.svg", rawSvg, spoofedPng, oversizedPng]) {
      expect(() => renderer.updateEncoded({
        data: "safe",
        style: { ...DEFAULT_STYLE, logoUrl, logoSizeRatio: 0.2 },
        size: 512,
      })).toThrow("The logo is not an accepted local image.");
    }
    expect(update).not.toHaveBeenCalled();
    renderer.destroy();
  });

  it("accepts a documented passive SVG subset and emits only a local PNG raster", async () => {
    const raster = runtime();
    const source = svgData(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 32">
        <defs><linearGradient id="g"><stop offset="0" stop-color="#123456"/></linearGradient></defs>
        <g transform="translate(1 2)"><path d="M0 0h20v20z" fill="url(#g)"/></g>
        <title>PRIVATE PASSIVE LOGO</title>
      </svg>
    `);
    await expect(prepareLogoForRender(source, { runtime: raster })).resolves.toBe(preparedPng);
    expect(raster.rasterize).toHaveBeenCalledOnce();
    expect(vi.mocked(raster.rasterize).mock.calls[0]?.[0]).toMatch(/^data:image\/svg\+xml;base64,/);
  });

  it("canonicalizes documented paints and local fragments before rasterization", async () => {
    const raster = runtime();
    const source = svgData(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10">
      <defs><linearGradient id="g"><stop offset="0" stop-color="#AbC"/></linearGradient><clipPath id="c"><path d="M0 0h1v1z"/></clipPath></defs>
      <path d="M0 0h10v10z" fill="#AAbbCC" stroke="none" clip-path="url(#c)" mask="none"/>
      <path d="M0 0h1v1z" fill="url(#g)"/>
    </svg>`);
    await expect(prepareLogoForRender(source, { runtime: raster })).resolves.toBe(preparedPng);
    const admitted = vi.mocked(raster.rasterize).mock.calls[0]?.[0] ?? "";
    const markup = new TextDecoder().decode(Uint8Array.from(atob(admitted.split(",")[1] ?? ""), (char) => char.charCodeAt(0)));
    expect(markup).toContain('fill="#aabbcc"');
    expect(markup).toContain('stop-color="#aabbcc"');
    expect(markup).toContain('fill="url(#g)"');
    expect(markup).toContain('clip-path="url(#c)"');
    expect(markup).not.toContain("#AAbbCC");
    expect(markup).not.toContain("#AbC");
  });

  it.each([
    ["CSS escape", String.raw`<path fill="u\72l(#g)" d="M0 0h1v1z"/>`],
    ["CSS comment", `<path fill="url/**/(#g)" d="M0 0h1v1z"/>`],
    ["XML character reference", `<path fill="u&#x72;l(#g)" d="M0 0h1v1z"/>`],
    ["control", `<path fill="url(#g)&#x0a;" d="M0 0h1v1z"/>`],
    ["unrecognized function", `<path fill="rgb(1 2 3)" d="M0 0h1v1z"/>`],
    ["clip solid", `<path clip-path="#fff" d="M0 0h1v1z"/>`],
    ["mask external", `<path mask="url(//PRIVATE.invalid/m)" d="M0 0h1v1z"/>`],
  ])("rejects presentation-value parser differential: %s", async (_name, child) => {
    const raster = runtime();
    await expect(prepareLogoForRender(svgData(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><defs><linearGradient id="g"/></defs>${child}</svg>`,
    ), { runtime: raster })).rejects.toSatisfy((error: unknown) => {
      expectCode(error, "logo-invalid");
      return true;
    });
    expect(raster.rasterize).not.toHaveBeenCalled();
  });

  it.each([
    ["script", `<script>fetch('https://PRIVATE.invalid')</script>`],
    ["event handler", `<path onload="PRIVATE()" d="M0 0h1v1z"/>`],
    ["foreignObject", `<foreignObject><div>PRIVATE</div></foreignObject>`],
    ["animation", `<animate attributeName="x" values="0;1"/>`],
    ["external image", `<image href="https://PRIVATE.invalid/logo.png"/>`],
    ["resource link", `<a href="https://PRIVATE.invalid"><path d="M0 0"/></a>`],
    ["CSS style element", `<style>@import url(https://PRIVATE.invalid/x.css)</style>`],
    ["CSS style attribute", `<path style="fill:url(https://PRIVATE.invalid/x)" d="M0 0"/>`],
    ["external paint", `<path fill="url(https://PRIVATE.invalid/x)" d="M0 0"/>`],
    ["CSS variable", `<path fill="var(--PRIVATE)" d="M0 0"/>`],
    ["DOCTYPE", `<!DOCTYPE svg><path d="M0 0"/>`],
  ])("rejects %s before decode/raster or any resource loader", async (_name, child) => {
    const raster = runtime();
    const source = svgData(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10">${child}</svg>`);
    try {
      await prepareLogoForRender(source, { runtime: raster });
      throw new Error("expected rejection");
    } catch (error) {
      expectCode(error, "logo-invalid");
    }
    expect(raster.rasterize).not.toHaveBeenCalled();
  });

  it("accepts local raster data URLs by magic bytes and rejects URL/spoof inputs", async () => {
    const raster = runtime();
    const samples = [
      dataUrl("image/png", Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10])),
      dataUrl("image/jpeg", Uint8Array.from([255, 216, 255, 224])),
      dataUrl("image/gif", new TextEncoder().encode("GIF89a")),
      dataUrl("image/webp", new TextEncoder().encode("RIFF0000WEBP")),
    ];
    for (const sample of samples) {
      await expect(prepareLogoForRender(sample, { runtime: raster })).resolves.toBe(preparedPng);
    }
    expect(raster.rasterize).toHaveBeenCalledTimes(samples.length);

    for (const unsafe of [
      "https://PRIVATE.invalid/logo.png",
      "//PRIVATE.invalid/logo.png",
      "../PRIVATE.png",
      "blob:https://PRIVATE.invalid/id",
      "data:text/html;base64,PHNjcmlwdD4=",
      dataUrl("image/png", new TextEncoder().encode("<svg>PRIVATE</svg>")),
    ]) {
      await expect(prepareLogoForRender(unsafe, { runtime: runtime() })).rejects.toSatisfy((error: unknown) => {
        expectCode(error, "logo-invalid");
        return true;
      });
    }
  });

  it("fails closed on malformed/oversize/dimension/output cases and recovers", async () => {
    const tooLarge = `data:image/png;base64,${"A".repeat(Math.ceil(MAX_LOGO_SOURCE_BYTES * 4 / 3) + 8)}`;
    await expect(prepareLogoForRender(tooLarge, { runtime: runtime() })).rejects.toSatisfy((error: unknown) => {
      expectCode(error, "logo-too-large");
      return true;
    });
    await expect(prepareLogoForRender("data:image/png;base64,%%%%", { runtime: runtime() })).rejects.toSatisfy((error: unknown) => {
      expectCode(error, "logo-invalid");
      return true;
    });

    const dimensions = runtime(async () => ({ dataUrl: preparedPng, width: 99999, height: 1, byteLength: 68 }));
    await expect(prepareLogoForRender(dataUrl("image/png", Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10])), { runtime: dimensions }))
      .rejects.toSatisfy((error: unknown) => { expectCode(error, "logo-too-large"); return true; });

    const malformedOutput = runtime(async () => ({ dataUrl: "data:image/svg+xml;base64,PRIVATE", width: 10, height: 10, byteLength: 68 }));
    await expect(prepareLogoForRender(dataUrl("image/png", Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10])), { runtime: malformedOutput }))
      .rejects.toSatisfy((error: unknown) => { expectCode(error, "logo-decode-failed"); return true; });

    await expect(prepareLogoForRender(dataUrl("image/png", Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10])), { runtime: runtime() }))
      .resolves.toBe(preparedPng);
  });

  it("uses fixed timeout/cancellation codes and aborts pending work", async () => {
    vi.useFakeTimers();
    try {
      const pending = runtime((_source, signal) => new Promise((_resolve, reject) => {
        signal.addEventListener("abort", () => reject(new Error("PRIVATE abort reason")), { once: true });
      }));
      const timed = prepareLogoForRender(
        dataUrl("image/png", Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10])),
        { runtime: pending, timeoutMs: 25 },
      );
      const timedAssertion = timed.catch((error) => expectCode(error, "logo-timeout"));
      await vi.advanceTimersByTimeAsync(25);
      await timedAssertion;

      const controller = new AbortController();
      const cancelled = prepareLogoForRender(
        dataUrl("image/png", Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10])),
        { runtime: pending, signal: controller.signal, timeoutMs: 1000 },
      );
      controller.abort();
      await cancelled.catch((error) => expectCode(error, "logo-cancelled"));
    } finally {
      vi.useRealTimers();
    }
  });

  it("settles fixed timeout and cancellation for a non-cooperative runtime", async () => {
    vi.useFakeTimers();
    try {
      const never = runtime(() => new Promise(() => undefined));
      const source = dataUrl("image/png", Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10]));
      const timed = prepareLogoForRender(source, { runtime: never, timeoutMs: 25 });
      const timedAssertion = timed.catch((error) => expectCode(error, "logo-timeout"));
      await vi.advanceTimersByTimeAsync(25);
      await timedAssertion;

      const controller = new AbortController();
      const cancelled = prepareLogoForRender(source, { runtime: never, signal: controller.signal });
      controller.abort();
      await cancelled.catch((error) => expectCode(error, "logo-cancelled"));
    } finally {
      vi.useRealTimers();
    }
  });

  it("absorbs a non-cooperative runtime's late rejection without reading it", async () => {
    vi.useFakeTimers();
    try {
      let rejectLate!: (reason?: unknown) => void;
      const pending = runtime(() => new Promise((_resolve, reject) => { rejectLate = reject; }));
      const source = dataUrl("image/png", Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10]));
      const preparation = prepareLogoForRender(source, { runtime: pending, timeoutMs: 25 });
      const assertion = preparation.catch((error) => expectCode(error, "logo-timeout"));
      await vi.advanceTimersByTimeAsync(25);
      await assertion;
      const touched = vi.fn();
      rejectLate(new Proxy({}, { get: touched, getPrototypeOf: touched }));
      await Promise.resolve();
      expect(touched).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it("rejects a CRC-valid tiny compressed PNG whose IHDR exceeds the dimension limit", () => {
    expect(() => assertPreparedLogoForVendor(oversizedPng)).toThrow("The logo is not an accepted local image.");
  });

  it("rejects invalid CRC, missing required chunks, and trailing PNG bytes", () => {
    const bytes = Uint8Array.from(atob(preparedPng.split(",")[1] ?? ""), (char) => char.charCodeAt(0));
    const badCrc = bytes.slice();
    badCrc[badCrc.length - 1] ^= 1;
    for (const malformed of [badCrc, bytes.slice(0, -12), Uint8Array.from([...bytes, 0])]) {
      expect(() => assertPreparedLogoForVendor(dataUrl("image/png", malformed)))
        .toThrow("The logo is not an accepted local image.");
    }
  });

  it("keeps error branding immutable and reads no attacker properties/prototypes", () => {
    const error = new LogoPreparationError("logo-invalid");
    expect(() => { (error as { code: string }).code = "PRIVATE"; }).toThrow(TypeError);
    expect(() => Object.defineProperty(error, "code", { get() { throw new Error("PRIVATE getter"); } })).toThrow(TypeError);
    const touched = vi.fn();
    const proxy = new Proxy(error, {
      get() { touched("get"); throw new Error("PRIVATE get"); },
      getPrototypeOf() { touched("prototype"); throw new Error("PRIVATE prototype"); },
    });
    expect(logoPreparationFailureCode(proxy)).toBe("logo-decode-failed");
    expect(touched).not.toHaveBeenCalled();
    const invalid = new LogoPreparationError("PRIVATE" as "logo-invalid");
    expect(invalid.code).toBe("logo-decode-failed");
    expect(logoPreparationFailureCode(invalid)).toBe("logo-decode-failed");
  });
});
