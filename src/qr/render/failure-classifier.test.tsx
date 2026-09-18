import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { QrRenderer, loadQrCodeStyling } from "@/qr/render/engine";
import {
  QrRenderError,
  classifyQrCodeStylingMatrixFailure,
  qrRenderFailureCode,
} from "@/qr/render/errors";
import { DEFAULT_STYLE, type EccLevel } from "@/qr/types";
import * as renderOptions from "@/qr/render/options";

const fixed = {
  capacity: "QR data exceeds the current encoding capacity.",
  generic: "QR rendering failed.",
};

function expectFixed(run: () => unknown, code: "capacity-exceeded" | "render-failed") {
  try {
    run();
    throw new Error("Expected renderer failure");
  } catch (error) {
    expect(error).toBeInstanceOf(QrRenderError);
    expect(qrRenderFailureCode(error)).toBe(code);
    expect((error as Error).message).toBe(code === "capacity-exceeded" ? fixed.capacity : fixed.generic);
    expect((error as Error).message).not.toMatch(/[0-9]+>[0-9]+|SYNTHETIC_SECRET/);
  }
}

afterEach(() => vi.restoreAllMocks());

describe("safe QR render failure contract", () => {
  it("accepts only a short exact primitive matrix-overflow grammar with left > right", () => {
    expect(classifyQrCodeStylingMatrixFailure("code length overflow. (10212>10208)").code)
      .toBe("capacity-exceeded");
    for (const value of [
      "code length overflow. (1>2)",
      "code length overflow. (2>2)",
      "code length overflow. (000000002>1)",
      "code length overflow. (2>1)\nSYNTHETIC_SECRET",
      `code length overflow. (${"9".repeat(80)}>1)`,
      new Error("code length overflow. (2>1)"),
      { message: "code length overflow. (2>1)" },
      null,
      1,
    ]) {
      const error = classifyQrCodeStylingMatrixFailure(value);
      expect(error.code).toBe("render-failed");
      expect(error.message).toBe(fixed.generic);
    }
  });

  it("does not inspect, coerce, echo, attach or log unknown failures", () => {
    const touched = vi.fn();
    const raw = Object.create(null);
    for (const key of ["message", "name", "cause", "stack", "toString", Symbol.toPrimitive]) {
      Object.defineProperty(raw, key, { get() { touched(key); throw new Error("getter read"); } });
    }
    const logs = [vi.spyOn(console, "log"), vi.spyOn(console, "warn"), vi.spyOn(console, "error")];
    expect(classifyQrCodeStylingMatrixFailure(raw).code).toBe("render-failed");
    expect(qrRenderFailureCode(raw)).toBe("render-failed");
    expect(touched).not.toHaveBeenCalled();
    for (const log of logs) expect(log).not.toHaveBeenCalled();
    const error = classifyQrCodeStylingMatrixFailure(raw) as Error & { cause?: unknown };
    expect(Object.prototype.hasOwnProperty.call(error, "cause")).toBe(false);

    const proxy = new Proxy({}, {
      get() { throw new Error("proxy get"); },
      getPrototypeOf() { throw new Error("proxy prototype"); },
    });
    expect(classifyQrCodeStylingMatrixFailure(proxy).code).toBe("render-failed");
    expect(qrRenderFailureCode(proxy)).toBe("render-failed");
  });

  it.each(["options", "drawing", "raw", "PDF", "DOM"])("keeps a same-looking %s failure generic outside matrix provenance", () => {
    const same = "code length overflow. (2>1)";
    expect(qrRenderFailureCode(same)).toBe("render-failed");
  });

  it("fails closed on installed package/bundle/source-map drift", () => {
    const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
    const lock = JSON.parse(readFileSync("package-lock.json", "utf8"));
    const installed = JSON.parse(readFileSync("node_modules/qr-code-styling/package.json", "utf8"));
    expect(packageJson.dependencies["qr-code-styling"]).toBe("^1.9.2");
    expect(lock.packages["node_modules/qr-code-styling"].version).toBe("1.9.2");
    expect(installed.version).toBe("1.9.2");
    expect(createHash("sha256").update(readFileSync("node_modules/qr-code-styling/lib/qr-code-styling.js")).digest("hex"))
      .toBe("429de523c7563fc0647e618f5a8ea567d5a16412a13ef5d6a082b4502f5a54f9");
    expect(createHash("sha256").update(readFileSync("node_modules/qr-code-styling/lib/qr-code-styling.js.map")).digest("hex"))
      .toBe("4ede48d46884ea56e753a6bff33854e60d9782a47a09802f705e4b9a33d88210");
  });

  it("keeps the branded code immutable, sanitized and independent of public properties", () => {
    const capacity = new QrRenderError("capacity-exceeded");
    expect(() => { (capacity as { code: string }).code = "attacker-controlled"; }).toThrow(TypeError);
    expect(() => Object.defineProperty(capacity, "code", {
      configurable: true,
      get() { throw new Error("attacker getter"); },
    })).toThrow(TypeError);
    expect(Object.getOwnPropertyDescriptor(capacity, "code")).toMatchObject({
      value: "capacity-exceeded",
      writable: false,
      configurable: false,
    });
    expect(qrRenderFailureCode(capacity)).toBe("capacity-exceeded");

    const invalid = new QrRenderError("attacker-controlled" as "capacity-exceeded");
    expect(invalid.code).toBe("render-failed");
    expect(qrRenderFailureCode(invalid)).toBe("render-failed");

    const touched = vi.fn();
    const brandedProxy = new Proxy(capacity, {
      get() { touched("get"); throw new Error("proxy get"); },
      getPrototypeOf() { touched("prototype"); throw new Error("proxy prototype"); },
    });
    const unbrandedProxy = new Proxy({}, {
      get() { touched("unbranded get"); throw new Error("proxy get"); },
      getPrototypeOf() { touched("unbranded prototype"); throw new Error("proxy prototype"); },
    });
    expect(qrRenderFailureCode(brandedProxy)).toBe("render-failed");
    expect(qrRenderFailureCode(unbrandedProxy)).toBe("render-failed");
    expect(touched).not.toHaveBeenCalled();
  });
});

type Family = { name: string; cap: Record<EccLevel, number>; data: (units: number) => string };
const families: Family[] = [
  { name: "Numeric", cap: { L: 7089, M: 5596, Q: 3993, H: 3057 }, data: (n) => "7".repeat(n) },
  { name: "Alphanumeric", cap: { L: 4296, M: 3391, Q: 2420, H: 1852 }, data: (n) => "A".repeat(n) },
  { name: "ASCII Byte", cap: { L: 2953, M: 2331, Q: 1663, H: 1273 }, data: (n) => "a".repeat(n) },
  { name: "Thai Byte", cap: { L: 2953, M: 2331, Q: 1663, H: 1273 }, data: (bytes) => "ก".repeat(Math.floor(bytes / 3)) + "a".repeat(bytes % 3) },
  { name: "emoji Byte", cap: { L: 2953, M: 2331, Q: 1663, H: 1273 }, data: (bytes) => "😀".repeat(Math.floor(bytes / 4)) + "a".repeat(bytes % 4) },
  { name: "combining Byte", cap: { L: 2953, M: 2331, Q: 1663, H: 1273 }, data: (bytes) => "e\u0301".repeat(Math.floor(bytes / 3)) + "a".repeat(bytes % 3) },
];

describe("installed vendor matrix boundaries (real encoder, inert drawing only)", () => {
  it.each(families)("$name succeeds at v40 capacity and classifies +1 across L/M/Q/H", async ({ cap, data }) => {
    const Ctor = await loadQrCodeStyling();
    vi.spyOn(Ctor.prototype, "_setupSvg").mockImplementation(function (this: InstanceType<typeof Ctor>) {
      this._svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      this._svgDrawingPromise = Promise.resolve();
    });
    for (const ecc of ["L", "M", "Q", "H"] as const) {
      const renderer = await QrRenderer.load();
      const boundary = data(cap[ecc]);
      const result = renderer.updateEncoded({ data: boundary, style: { ...DEFAULT_STYLE, ecc }, size: 1024 });
      expect(result.moduleCount).toBe(177);
      expect(result.data).toBe(boundary);
      expectFixed(() => renderer.updateEncoded({ data: data(cap[ecc] + 1), style: { ...DEFAULT_STYLE, ecc }, size: 1024 }), "capacity-exceeded");
      renderer.destroy();
    }
  });

  it("classifies matching values from non-matrix stages as generic", async () => {
    const Ctor = await loadQrCodeStyling();
    const same = "code length overflow. (2>1)";
    const optionsRenderer = await QrRenderer.load();
    vi.spyOn(renderOptions, "toStylingOptions").mockImplementationOnce(() => { throw same; });
    try {
      optionsRenderer.updateEncoded({ data: "safe", style: DEFAULT_STYLE, size: 512 });
      throw new Error("Expected options failure");
    } catch (error) {
      expect(qrRenderFailureCode(error)).toBe("render-failed");
    }

    vi.spyOn(Ctor.prototype, "_setupSvg").mockImplementationOnce(() => { throw same; });
    const drawing = await QrRenderer.load();
    expectFixed(() => drawing.updateEncoded({ data: "safe", style: DEFAULT_STYLE, size: 512 }), "render-failed");

    const color = await QrRenderer.load();
    try {
      color.updateEncoded({ data: same, style: { ...DEFAULT_STYLE, fgColor: same }, size: 512 });
    } catch (error) {
      expect(qrRenderFailureCode(error)).toBe("render-failed");
    }

    const raw = await QrRenderer.load();
    raw.updateEncoded({ data: "safe", style: DEFAULT_STYLE, size: 512 });
    vi.spyOn(Ctor.prototype, "getRawData").mockRejectedValueOnce(same);
    await expect(raw.toBlob("svg")).rejects.toMatchObject({ code: "render-failed", message: fixed.generic });
  });

  async function attachedVendor() {
    const Ctor = await loadQrCodeStyling();
    const setup = vi.spyOn(Ctor.prototype, "_setupSvg").mockImplementation(function (this: InstanceType<typeof Ctor>) {
      this._svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      this._svgDrawingPromise = Promise.resolve();
    });
    const renderer = await QrRenderer.load();
    renderer.updateEncoded({ data: "valid A", style: DEFAULT_STYLE, size: 512 });
    const vendor = setup.mock.contexts.at(-1) as InstanceType<typeof Ctor>;
    const host = document.createElement("div");
    renderer.attach(host);
    return { Ctor, renderer, vendor, host };
  }

  it("keeps an actual attached-container clear look-alike generic and restores state", async () => {
    const { renderer, vendor, host } = await attachedVendor();
    const same = "code length overflow. (2>1)";
    const beforeSvg = Object.getOwnPropertyDescriptor(vendor, "_setupSvg");
    const beforeCanvas = Object.getOwnPropertyDescriptor(vendor, "_setupCanvas");
    Object.defineProperty(host, "innerHTML", {
      configurable: true,
      set() { throw same; },
    });
    expectFixed(() => renderer.updateEncoded({ data: "B", style: DEFAULT_STYLE, size: 512 }), "render-failed");
    expect(Object.getOwnPropertyDescriptor(vendor, "_setupSvg")).toEqual(beforeSvg);
    expect(Object.getOwnPropertyDescriptor(vendor, "_setupCanvas")).toEqual(beforeCanvas);
    Reflect.deleteProperty(host, "innerHTML");
    const recovery = document.createElement("div");
    renderer.attach(recovery);
    expect(renderer.updateEncoded({ data: "clear recovery", style: DEFAULT_STYLE, size: 512 }).data).toBe("clear recovery");
    expect(recovery.querySelector("svg")).not.toBeNull();
  });

  it("keeps an actual vendor-options look-alike generic and restores state", async () => {
    const { Ctor, renderer, vendor } = await attachedVendor();
    const same = "code length overflow. (2>1)";
    const beforeSvg = Object.getOwnPropertyDescriptor(vendor, "_setupSvg");
    const beforeCanvas = Object.getOwnPropertyDescriptor(vendor, "_setupCanvas");
    const original = Ctor.prototype.update;
    const update = vi.spyOn(Ctor.prototype, "update").mockImplementation(function () {
      throw same;
    });
    expectFixed(() => renderer.updateEncoded({ data: "B", style: DEFAULT_STYLE, size: 512 }), "render-failed");
    expect(Object.getOwnPropertyDescriptor(vendor, "_setupSvg")).toEqual(beforeSvg);
    expect(Object.getOwnPropertyDescriptor(vendor, "_setupCanvas")).toEqual(beforeCanvas);
    update.mockRestore();
    expect(renderer.updateEncoded({ data: "options recovery", style: DEFAULT_STYLE, size: 512 }).data).toBe("options recovery");
    expect(original).toBe(Ctor.prototype.update);
  });

  it("keeps an actual attached-vendor append look-alike generic and restores state", async () => {
    const { Ctor, renderer, vendor, host } = await attachedVendor();
    const same = "code length overflow. (2>1)";
    const beforeSvg = Object.getOwnPropertyDescriptor(vendor, "_setupSvg");
    const beforeCanvas = Object.getOwnPropertyDescriptor(vendor, "_setupCanvas");
    const original = Ctor.prototype.append;
    const append = vi.spyOn(Ctor.prototype, "append").mockImplementation(function (this: InstanceType<typeof Ctor>, container) {
      if (container === host) throw same;
      original.call(this, container);
    });
    expectFixed(() => renderer.updateEncoded({ data: "B", style: DEFAULT_STYLE, size: 512 }), "render-failed");
    expect(Object.getOwnPropertyDescriptor(vendor, "_setupSvg")).toEqual(beforeSvg);
    expect(Object.getOwnPropertyDescriptor(vendor, "_setupCanvas")).toEqual(beforeCanvas);
    append.mockRestore();
    const recovery = document.createElement("div");
    renderer.attach(recovery);
    expect(renderer.updateEncoded({ data: "append recovery", style: DEFAULT_STYLE, size: 512 }).data).toBe("append recovery");
    expect(recovery.querySelector("svg")).not.toBeNull();
  });
});
