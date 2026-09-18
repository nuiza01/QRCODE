import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { loadQrCodeStyling, QrRenderer } from "@/qr/render/engine";
import * as options from "@/qr/render/options";
import { DEFAULT_STYLE } from "@/qr/types";

type Vendor = InstanceType<Awaited<ReturnType<typeof loadQrCodeStyling>>>;
const unavailable = "QR output is unavailable. Complete a successful current update first.";
const capacityExceeded = "QR data exceeds the current encoding capacity.";
const renderFailed = "QR rendering failed.";
const style = { ...DEFAULT_STYLE, ecc: "H" as const };
const input = (data = "valid A ไทย😀", size = 512) => ({ data, style, size });
const overflow = () => input("ก".repeat(1200));
const badColor = () => ({ ...input(), style: { ...style, fgColor: "url(https://example.invalid/PRIVATE)" } });
const readers = [
  { name: "SVG blob", read: (r: QrRenderer) => r.toBlob("svg") },
  { name: "PNG blob", read: (r: QrRenderer) => r.toBlob("png") },
  { name: "SVG text", read: (r: QrRenderer) => r.toSvgString() },
];

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

function blob(text: string) {
  // jsdom's Blob lacks text(); only serialization is stubbed, not encoding.
  return Object.assign(new Blob([text]), { text: async () => text });
}

let Ctor: Awaited<ReturnType<typeof loadQrCodeStyling>>;
let renderer: QrRenderer;
let raw: ReturnType<typeof vi.spyOn<Vendor, "getRawData">>;

beforeEach(async () => {
  Ctor = await loadQrCodeStyling();
  // Actual shipped constructor/update/getMode/pure matrix and cached-element
  // lifecycle. Drawing/raw IO are inert: NOT real PNG/SVG artifact verification.
  vi.spyOn(Ctor.prototype, "_setupSvg").mockImplementation(function (this: Vendor) {
    this._svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    this._svg.setAttribute("data-probe", this._options.data);
    this._svgDrawingPromise = Promise.resolve();
  });
  vi.spyOn(Ctor.prototype, "_setupCanvas").mockImplementation(function (this: Vendor) {
    this._setupSvg();
    this._domCanvas = document.createElement("canvas");
    this._canvasDrawingPromise = Promise.resolve();
  });
  raw = vi.spyOn(Ctor.prototype, "getRawData").mockImplementation(async function (this: Vendor, extension) {
    const element = await this._getElement("svg");
    return blob(`${extension}:${element?.getAttribute("data-probe")}`);
  });
  renderer = await QrRenderer.load();
});

afterEach(() => {
  renderer?.destroy();
  vi.restoreAllMocks();
});

async function expectUnavailable() {
  const calls = raw.mock.calls.length;
  for (const { read } of readers) await expect(read(renderer)).rejects.toThrow(unavailable);
  expect(raw).toHaveBeenCalledTimes(calls); // No stale vendor/cache read at all.
}

describe("reusable renderer output admission after failed updates", () => {
  it.each(["update", "updateEncoded"] as const)("%s: real vendor caches A after overflow, but renderer denies reads until C", async (api) => {
    const host = document.createElement("div");
    renderer.updateEncoded(input());
    renderer.attach(host);
    const a = await renderer.toSvgString();
    const vendor = raw.mock.contexts.at(-1)! as Vendor;
    for (let attempt = 0; attempt < 2; attempt++) {
      expect(() => api === "updateEncoded" ? renderer.updateEncoded(overflow()) : renderer.update({
        payload: { type: "text", text: overflow().data }, style, size: 512,
      })).toThrow(capacityExceeded);
      expect(host.childElementCount).toBe(0);
      // Evidence for the defect: the actual vendor's cached SVG remains A.
      expect(await (await vendor.getRawData("svg") as Blob).text()).toBe(a);
      await expectUnavailable();
    }
    const result = renderer.updateEncoded(input("valid C ไทย😀"));
    expect(result.data).toBe("valid C ไทย😀");
    expect(result.geometry.quietZoneModules).toBeCloseTo(4, 8);
    expect(host.childElementCount).toBe(1);
    expect(await renderer.toSvgString()).not.toBe(a);
    for (const { read } of readers) await expect(read(renderer)).resolves.toBeDefined();
  });

  it("denies initial/repeated overflow and allows a later success", async () => {
    await expectUnavailable();
    for (let attempt = 0; attempt < 2; attempt++) {
      expect(() => renderer.updateEncoded(overflow())).toThrow(capacityExceeded);
      await expectUnavailable();
    }
    renderer.updateEncoded(input());
    await expect(renderer.toSvgString()).resolves.toContain("svg:");
  });

  it("invalidates before encodePayload throws, without clearing a safe mounted preview", async () => {
    const host = document.createElement("div");
    renderer.updateEncoded(input());
    renderer.attach(host);
    const node = host.firstChild;
    const updates = vi.spyOn(Ctor.prototype, "update");
    expect(() => renderer.update({
      payload: { type: "event", title: "synthetic", start: "invalid-date" }, style, size: 512,
    })).toThrow(/Invalid event date/);
    expect(updates).not.toHaveBeenCalled();
    expect(host.firstChild).toBe(node);
    await expectUnavailable();
    renderer.update({ payload: { type: "text", text: "C" }, style, size: 512 });
    await expect(renderer.toSvgString()).resolves.toContain("C");
  });

  it.each(["update", "updateEncoded"] as const)("%s denies color/options failures before vendor, then recovers", async (api) => {
    const run = (i: ReturnType<typeof input>) => api === "updateEncoded"
      ? renderer.updateEncoded(i)
      : renderer.update({ payload: { type: "text", text: i.data }, style: i.style, size: i.size });
    run(input());
    const updates = vi.spyOn(Ctor.prototype, "update");
    expect(() => run(badColor())).toThrow("QR colors must use #RGB or #RRGGBB.");
    expect(updates).not.toHaveBeenCalled();
    await expectUnavailable();
    run(input("success before options failure"));
    updates.mockClear();
    vi.spyOn(options, "toStylingOptions").mockImplementationOnce(() => { throw new Error("injected options failure"); });
    expect(() => run(input())).toThrow("injected options failure");
    expect(updates).not.toHaveBeenCalled();
    await expectUnavailable();
    run(input("C"));
    await expect(renderer.toSvgString()).resolves.toContain("C");
  });

  it.each(["svg", "canvas"] as const)("denies second-pass geometry failure (%s), then preserves recovery geometry", async (drawType) => {
    renderer.updateEncoded({ ...input("a"), drawType });
    expect(renderer.moduleCount).toBe(21);
    // Fits the old 21-module hint but not the newly encoded symbol.
    for (let attempt = 0; attempt < 2; attempt++) {
      expect(() => renderer.updateEncoded({ ...input("a".repeat(100), 40), drawType })).toThrow(/needs at least/);
      await expectUnavailable();
    }
    const next = renderer.updateEncoded({ ...input("RECOVER ไทย😀"), drawType });
    expect(next.geometry).toEqual(options.renderedGeometry(512, next.moduleCount, 4, drawType === "canvas"));
    expect(next.geometry.quietZoneModules).toBeGreaterThanOrEqual(4 - 1e-8);
    await expect(renderer.toBlob(drawType === "svg" ? "svg" : "png")).resolves.toBeInstanceOf(Blob);
  });

  it("denies a vendor throw in the second margin update, then recovers", async () => {
    renderer.updateEncoded(input("a"));
    const original = Ctor.prototype.update;
    const updates = vi.spyOn(Ctor.prototype, "update").mockImplementation(function (this: Vendor, value) {
      if (value && Object.keys(value).length === 1 && "margin" in value) throw new Error("injected margin failure");
      original.call(this, value);
    });
    for (let attempt = 0; attempt < 2; attempt++) {
      expect(() => renderer.updateEncoded(input("a".repeat(100)))).toThrow(renderFailed);
      await expectUnavailable();
    }
    updates.mockRestore();
    renderer.updateEncoded(input("C"));
    await expect(renderer.toSvgString()).resolves.toContain("C");
  });

  it("keeps success-to-success in place, original data/style/quiet zone, and reusable destroy semantics", async () => {
    const host = document.createElement("div");
    renderer.attach(host);
    for (const data of ["0123456789", "ABC-123", "ASCII lowercase", "ไทย😀 日本語", "C"]) {
      const value = { ...input(data), style: { ...style, fgColor: "#123", bgColor: "#fff" } };
      const before = structuredClone(value);
      const result = renderer.updateEncoded(value);
      expect(value).toEqual(before);
      expect(result.data).toBe(data);
      expect(result.style.fgColor).toBe("#112233");
      expect(result.geometry.quietZoneModules).toBeCloseTo(4, 8);
      expect(await renderer.toSvgString()).toBe(`svg:${Buffer.from(data).toString("latin1")}`);
      expect(host.childElementCount).toBe(1);
    }
    expect(new Set(raw.mock.contexts).size).toBe(1);
    renderer.destroy();
    renderer.destroy();
    expect(host.childElementCount).toBe(0);
    await expectUnavailable();
    renderer.updateEncoded(input("after destroy"));
    await expect(renderer.toSvgString()).resolves.toContain("after destroy");
    expect(host.childElementCount).toBe(0); // Old host remains detached.
  });
});

const transitions = [
  { name: "failed encoding", run: (r: QrRenderer) => { expect(() => r.update({ payload: { type: "event", title: "synthetic", start: "invalid-date" }, style, size: 512 })).toThrow(); } },
  { name: "failed color", run: (r: QrRenderer) => { expect(() => r.updateEncoded(badColor())).toThrow(); } },
  { name: "failed overflow", run: (r: QrRenderer) => { expect(() => r.updateEncoded(overflow())).toThrow(capacityExceeded); } },
  { name: "successful update", run: (r: QrRenderer) => { r.updateEncoded(input("C")); } },
  { name: "failed then recovered", run: (r: QrRenderer) => { expect(() => r.updateEncoded(badColor())).toThrow(); r.updateEncoded(input()); } },
  { name: "destroy", run: (r: QrRenderer) => { r.destroy(); } },
  { name: "destroy then update", run: (r: QrRenderer) => { r.destroy(); r.updateEncoded(input()); } },
];

describe("reads already awaiting cannot return a superseded revision", () => {
  describe.each(readers)("$name", ({ read }) => {
    it.each(transitions)("rejects pending raw output after $name", async ({ run }) => {
      renderer.updateEncoded(input());
      const pendingRaw = deferred<Blob>();
      raw.mockReturnValueOnce(pendingRaw.promise);
      const output = read(renderer);
      run(renderer);
      pendingRaw.resolve(blob("STALE_A"));
      await expect(output).rejects.toThrow(unavailable);
    });
  });

  it.each(transitions)("rejects SVG text that was already serializing after $name", async ({ run }) => {
    renderer.updateEncoded(input());
    const text = deferred<string>();
    const entered = deferred<void>();
    raw.mockResolvedValueOnce(Object.assign(blob("A"), { text: () => { entered.resolve(); return text.promise; } }));
    const output = renderer.toSvgString();
    await entered.promise;
    run(renderer);
    text.resolve("STALE_A");
    await expect(output).rejects.toThrow(unavailable);
  });

  it("checks the SVG await boundary before starting text serialization", async () => {
    renderer.updateEncoded(input());
    const text = vi.fn(async () => "STALE_A");
    raw.mockResolvedValueOnce(Object.assign(blob("A"), { text }));
    const output = renderer.toSvgString();
    await Promise.resolve(); // toBlob has completed; toSvgString has not resumed.
    renderer.destroy();
    await expect(output).rejects.toThrow(unavailable);
    expect(text).not.toHaveBeenCalled();
  });

  it("still rejects missing/raw-failed data and permits a later current read", async () => {
    renderer.updateEncoded(input());
    raw.mockResolvedValueOnce(null);
    await expect(renderer.toBlob("png")).rejects.toThrow("qr-code-styling returned no png data.");
    raw.mockRejectedValueOnce(new Error("injected raw failure"));
    await expect(renderer.toBlob("svg")).rejects.toThrow(renderFailed);
    await expect(renderer.toSvgString()).resolves.toContain("svg:");
  });
});
