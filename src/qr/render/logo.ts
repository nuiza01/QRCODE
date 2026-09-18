/**
 * Client-only logo admission and rasterization.
 *
 * Nothing in this module touches a browser global at import time. Callers run
 * `prepareLogoForRender` from an effect or export handler before a logo is
 * allowed to reach qr-code-styling. SVG input is admitted as a small passive
 * subset and every accepted format is decoded and re-encoded as a local PNG.
 */

export const MAX_LOGO_SOURCE_BYTES = 512 * 1024;
export const MAX_LOGO_SOURCE_DIMENSION = 2048;
export const MAX_LOGO_SOURCE_PIXELS = 4_194_304;
export const MAX_LOGO_RASTER_DIMENSION = 1024;
export const MAX_LOGO_RASTER_BYTES = 2 * 1024 * 1024;
const MAX_LOGO_RASTER_PIXELS = MAX_LOGO_RASTER_DIMENSION * MAX_LOGO_RASTER_DIMENSION;
export const MAX_LOGO_PREPARATION_TIMEOUT_MS = 3_000;
export const MAX_LOGO_SVG_ELEMENTS = 512;
export const MAX_LOGO_SVG_ATTRIBUTES = 4_096;

export type LogoPreparationFailureCode =
  | "logo-invalid"
  | "logo-too-large"
  | "logo-decode-failed"
  | "logo-timeout"
  | "logo-cancelled";

const LOGO_MESSAGES: Record<LogoPreparationFailureCode, string> = {
  "logo-invalid": "The logo is not an accepted local image.",
  "logo-too-large": "The logo exceeds the safe image limits.",
  "logo-decode-failed": "The logo could not be prepared safely.",
  "logo-timeout": "Logo preparation timed out.",
  "logo-cancelled": "Logo preparation was cancelled.",
};

const LOGO_ERRORS = new WeakMap<object, LogoPreparationFailureCode>();

/** A fixed, input-free error suitable for a later localized FORMS adapter. */
export class LogoPreparationError extends Error {
  declare readonly code: LogoPreparationFailureCode;

  constructor(code: LogoPreparationFailureCode) {
    const safeCode: LogoPreparationFailureCode =
      code === "logo-invalid" ||
      code === "logo-too-large" ||
      code === "logo-timeout" ||
      code === "logo-cancelled"
        ? code
        : "logo-decode-failed";
    super(LOGO_MESSAGES[safeCode]);
    this.name = "LogoPreparationError";
    Object.defineProperty(this, "code", {
      value: safeCode,
      enumerable: true,
      writable: false,
      configurable: false,
    });
    LOGO_ERRORS.set(this, safeCode);
  }
}

/** Reads only private branding; unknown values are fixed decode failures. */
export function logoPreparationFailureCode(value: unknown): LogoPreparationFailureCode {
  if ((typeof value !== "object" && typeof value !== "function") || value === null) {
    return "logo-decode-failed";
  }
  return LOGO_ERRORS.get(value) ?? "logo-decode-failed";
}

const RASTER_MIMES = new Set(["image/png", "image/jpeg", "image/gif", "image/webp"]);
const SVG_MIME = "image/svg+xml";
const BASE64 = /^[A-Za-z0-9+/]*={0,2}$/;
const PREPARED_PNG_PREFIX = "data:image/png;base64,";

interface ParsedLogoDataUrl {
  mime: string;
  bytes: Uint8Array;
}

function fail(code: LogoPreparationFailureCode): never {
  throw new LogoPreparationError(code);
}

function decodeLocalDataUrl(source: string): ParsedLogoDataUrl {
  if (typeof source !== "string" || !source.startsWith("data:")) fail("logo-invalid");
  const comma = source.indexOf(",");
  if (comma < 5) fail("logo-invalid");
  const header = source.slice(5, comma).split(";").map((part) => part.trim().toLowerCase());
  const mime = header.shift() ?? "";
  if ((mime !== SVG_MIME && !RASTER_MIMES.has(mime)) || header.length !== 1 || header[0] !== "base64") {
    fail("logo-invalid");
  }

  const encoded = source.slice(comma + 1);
  if (!encoded || !BASE64.test(encoded) || encoded.length % 4 === 1) fail("logo-invalid");
  const estimatedBytes = Math.floor((encoded.length * 3) / 4);
  if (estimatedBytes > MAX_LOGO_SOURCE_BYTES + 2) fail("logo-too-large");

  let binary: string;
  try {
    binary = atob(encoded);
  } catch {
    fail("logo-invalid");
  }
  if (binary.length > MAX_LOGO_SOURCE_BYTES) fail("logo-too-large");
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index++) bytes[index] = binary.charCodeAt(index);
  return { mime, bytes };
}

function hasRasterMagic(mime: string, bytes: Uint8Array): boolean {
  if (mime === "image/png") {
    return bytes.length >= 8 && [137, 80, 78, 71, 13, 10, 26, 10].every((byte, i) => bytes[i] === byte);
  }
  if (mime === "image/jpeg") return bytes.length >= 3 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  if (mime === "image/gif") {
    if (bytes.length < 6) return false;
    const signature = String.fromCharCode(...bytes.slice(0, 6));
    return signature === "GIF87a" || signature === "GIF89a";
  }
  return mime === "image/webp" &&
    bytes.length >= 12 &&
    String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
}

const PASSIVE_ELEMENTS = new Set([
  "svg", "g", "defs", "path", "rect", "circle", "ellipse", "line", "polyline", "polygon",
  "linearGradient", "radialGradient", "stop", "clipPath", "mask", "title", "desc", "text", "tspan",
]);

const PASSIVE_ATTRIBUTES = new Set([
  "id", "x", "y", "x1", "y1", "x2", "y2", "cx", "cy", "r", "rx", "ry", "dx", "dy",
  "width", "height", "viewBox", "version", "preserveAspectRatio", "points", "d", "transform",
  "fill", "fill-rule", "fill-opacity", "stroke", "stroke-width", "stroke-linecap", "stroke-linejoin",
  "stroke-miterlimit", "stroke-dasharray", "stroke-dashoffset", "stroke-opacity", "opacity", "offset",
  "stop-color", "stop-opacity", "gradientUnits", "gradientTransform", "spreadMethod", "clip-path", "mask",
  "maskUnits", "maskContentUnits", "clipPathUnits", "font-family", "font-size", "font-style", "font-weight",
  "text-anchor", "dominant-baseline", "rotate", "lengthAdjust", "textLength", "vector-effect", "shape-rendering",
]);

const LOCAL_FRAGMENT_PAINT = /^url\(#[A-Za-z_][A-Za-z0-9_.-]*\)$/;
const SOLID_PAINT = /^#[0-9A-Fa-f]{3}(?:[0-9A-Fa-f]{3})?$/;
const PAINT_ATTRIBUTES = new Set(["fill", "stroke"]);
const SOLID_PAINT_ATTRIBUTES = new Set(["stop-color"]);
const LOCAL_FRAGMENT_ATTRIBUTES = new Set(["clip-path", "mask"]);
const UNSAFE_SVG_SOURCE_SYNTAX = /<!--|&|[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/;
const SVG_LENGTH = /^(?:0|[1-9][0-9]{0,3})(?:\.[0-9]{1,4})?(?:px)?$/;

function canonicalSolidPaint(value: string): string | null {
  if (!SOLID_PAINT.test(value)) return null;
  const hex = value.slice(1).toLowerCase();
  return hex.length === 3
    ? `#${hex[0]}${hex[0]}${hex[1]}${hex[1]}${hex[2]}${hex[2]}`
    : `#${hex}`;
}

function canonicalPresentationValue(name: string, value: string): string | null {
  if (value !== value.trim()) return null;
  if (PAINT_ATTRIBUTES.has(name)) {
    if (value === "none" || LOCAL_FRAGMENT_PAINT.test(value)) return value;
    return canonicalSolidPaint(value);
  }
  if (SOLID_PAINT_ATTRIBUTES.has(name)) {
    if (value === "none") return value;
    return canonicalSolidPaint(value);
  }
  if (LOCAL_FRAGMENT_ATTRIBUTES.has(name)) {
    return value === "none" || LOCAL_FRAGMENT_PAINT.test(value) ? value : null;
  }
  return value;
}

function validateRootDimension(value: string | null): void {
  if (value === null) return;
  if (!SVG_LENGTH.test(value)) fail("logo-invalid");
  const numeric = Number.parseFloat(value);
  if (!(numeric > 0) || numeric > MAX_LOGO_SOURCE_DIMENSION) fail("logo-too-large");
}

function validatePassiveSvg(bytes: Uint8Array): string {
  let markup: string;
  try {
    markup = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    fail("logo-invalid");
  }
  if (/<!DOCTYPE|<!ENTITY|<\?xml-stylesheet/i.test(markup) || UNSAFE_SVG_SOURCE_SYNTAX.test(markup)) {
    fail("logo-invalid");
  }
  if (typeof DOMParser === "undefined") fail("logo-decode-failed");

  const parsed = new DOMParser().parseFromString(markup, "image/svg+xml");
  const root = parsed.documentElement;
  if (
    root.localName !== "svg" ||
    root.namespaceURI !== "http://www.w3.org/2000/svg" ||
    root.getElementsByTagName("parsererror").length > 0
  ) {
    fail("logo-invalid");
  }
  validateRootDimension(root.getAttribute("width"));
  validateRootDimension(root.getAttribute("height"));

  const elements = [root, ...Array.from(root.querySelectorAll("*"))];
  if (elements.length > MAX_LOGO_SVG_ELEMENTS) fail("logo-too-large");
  let attributeCount = 0;
  for (const element of elements) {
    if (element.namespaceURI !== "http://www.w3.org/2000/svg" || !PASSIVE_ELEMENTS.has(element.localName)) {
      fail("logo-invalid");
    }
    for (const attribute of Array.from(element.attributes)) {
      attributeCount++;
      if (attributeCount > MAX_LOGO_SVG_ATTRIBUTES) fail("logo-too-large");
      const name = attribute.name;
      const value = attribute.value;
      if (name === "xmlns" && element === root && value === "http://www.w3.org/2000/svg") continue;
      if (
        attribute.namespaceURI ||
        name.toLowerCase() === "style" ||
        name.toLowerCase().startsWith("on") ||
        !PASSIVE_ATTRIBUTES.has(name)
      ) {
        fail("logo-invalid");
      }
      const canonicalValue = canonicalPresentationValue(name, value);
      if (canonicalValue === null) fail("logo-invalid");
      if (canonicalValue !== value) element.setAttribute(name, canonicalValue);
    }
  }
  if (typeof XMLSerializer === "undefined") fail("logo-decode-failed");
  const sanitized = new XMLSerializer().serializeToString(root);
  return `data:${SVG_MIME};base64,${bytesToBase64(new TextEncoder().encode(sanitized))}`;
}

export interface LogoRasterResult {
  dataUrl: string;
  width: number;
  height: number;
  byteLength: number;
}

export interface LogoRasterRuntime {
  rasterize(source: string, signal: AbortSignal): Promise<LogoRasterResult>;
}

function validateDimensions(
  width: number,
  height: number,
  maxDimension: number,
  maxPixels: number,
): void {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) {
    fail("logo-decode-failed");
  }
  if (
    width > maxDimension ||
    height > maxDimension ||
    width * height > maxPixels
  ) {
    fail("logo-too-large");
  }
}

function validateSourceDimensions(width: number, height: number): void {
  validateDimensions(width, height, MAX_LOGO_SOURCE_DIMENSION, MAX_LOGO_SOURCE_PIXELS);
}

function validatePreparedDimensions(width: number, height: number): void {
  validateDimensions(width, height, MAX_LOGO_RASTER_DIMENSION, MAX_LOGO_RASTER_PIXELS);
}

interface ParsedPreparedPng {
  byteLength: number;
  width: number;
  height: number;
}

function readU32(bytes: Uint8Array, offset: number): number {
  return (
    bytes[offset]! * 0x1000000 +
    (bytes[offset + 1]! << 16) +
    (bytes[offset + 2]! << 8) +
    bytes[offset + 3]!
  ) >>> 0;
}

function pngCrc32(bytes: Uint8Array, start: number, end: number): number {
  let crc = 0xffffffff;
  for (let index = start; index < end; index++) {
    crc ^= bytes[index]!;
    for (let bit = 0; bit < 8; bit++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function parsePreparedPng(value: string): ParsedPreparedPng | null {
  if (!value.startsWith(PREPARED_PNG_PREFIX)) return null;
  const encoded = value.slice(PREPARED_PNG_PREFIX.length);
  if (
    encoded.length === 0 ||
    encoded.length > Math.ceil((MAX_LOGO_RASTER_BYTES * 4) / 3) + 4 ||
    !BASE64.test(encoded) ||
    encoded.length % 4 === 1
  ) return null;
  let binary: string;
  try {
    binary = atob(encoded);
  } catch {
    return null;
  }
  if (binary.length > MAX_LOGO_RASTER_BYTES || binary.length < 57) return null;
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  if (![137, 80, 78, 71, 13, 10, 26, 10].every((byte, index) => bytes[index] === byte)) return null;

  let offset = 8;
  let width = 0;
  let height = 0;
  let colorType = -1;
  let sawIhdr = false;
  let sawPlte = false;
  let sawIdat = false;
  let idatEnded = false;
  let sawIend = false;
  while (offset < bytes.length) {
    if (bytes.length - offset < 12) return null;
    const length = readU32(bytes, offset);
    if (length > bytes.length - offset - 12) return null;
    const typeStart = offset + 4;
    const dataStart = offset + 8;
    const crcOffset = dataStart + length;
    const typeBytes = bytes.subarray(typeStart, dataStart);
    if (!Array.from(typeBytes).every((byte) => (byte >= 65 && byte <= 90) || (byte >= 97 && byte <= 122))) {
      return null;
    }
    // PNG reserves the third type byte as uppercase; accepting lowercase here
    // would create a parser differential with conforming decoders.
    if (typeBytes[2]! < 65 || typeBytes[2]! > 90) return null;
    const type = String.fromCharCode(...typeBytes);
    if (pngCrc32(bytes, typeStart, crcOffset) !== readU32(bytes, crcOffset)) return null;
    if (!sawIhdr && type !== "IHDR") return null;

    if (type === "IHDR") {
      if (sawIhdr || offset !== 8 || length !== 13) return null;
      width = readU32(bytes, dataStart);
      height = readU32(bytes, dataStart + 4);
      const bitDepth = bytes[dataStart + 8]!;
      colorType = bytes[dataStart + 9]!;
      const validDepth = (
        (colorType === 0 && [1, 2, 4, 8, 16].includes(bitDepth)) ||
        (colorType === 2 && [8, 16].includes(bitDepth)) ||
        (colorType === 3 && [1, 2, 4, 8].includes(bitDepth)) ||
        ((colorType === 4 || colorType === 6) && [8, 16].includes(bitDepth))
      );
      if (
        width === 0 || height === 0 ||
        width > MAX_LOGO_RASTER_DIMENSION || height > MAX_LOGO_RASTER_DIMENSION ||
        width * height > MAX_LOGO_RASTER_PIXELS ||
        !validDepth || bytes[dataStart + 10] !== 0 || bytes[dataStart + 11] !== 0 ||
        (bytes[dataStart + 12] !== 0 && bytes[dataStart + 12] !== 1)
      ) return null;
      sawIhdr = true;
    } else if (type === "PLTE") {
      if (!sawIhdr || sawPlte || sawIdat || length === 0 || length > 768 || length % 3 !== 0) return null;
      if (colorType === 0 || colorType === 4) return null;
      sawPlte = true;
    } else if (type === "IDAT") {
      if (!sawIhdr || idatEnded || length === 0 || (colorType === 3 && !sawPlte)) return null;
      sawIdat = true;
    } else if (type === "IEND") {
      if (!sawIdat || sawIend || length !== 0 || crcOffset + 4 !== bytes.length) return null;
      sawIend = true;
    } else {
      if (typeBytes[0]! >= 65 && typeBytes[0]! <= 90) return null;
      if (sawIdat) idatEnded = true;
    }
    if (type !== "IDAT" && sawIdat && type !== "IEND") idatEnded = true;
    offset = crcOffset + 4;
  }
  if (!sawIhdr || !sawIdat || !sawIend || offset !== bytes.length) return null;
  return { byteLength: bytes.length, width, height };
}

/** Synchronous last gate immediately before qr-code-styling receives a logo. */
export function assertPreparedLogoForVendor(value: string): void {
  if (parsePreparedPng(value) === null) fail("logo-invalid");
}

function abortable<T>(promise: Promise<T>, signal: AbortSignal): Promise<T> {
  if (signal.aborted) return Promise.reject(new LogoPreparationError("logo-cancelled"));
  return new Promise<T>((resolve, reject) => {
    let settled = false;
    const finish = (action: () => void) => {
      if (settled) return;
      settled = true;
      signal.removeEventListener("abort", abort);
      action();
    };
    const abort = () => finish(() => reject(new LogoPreparationError("logo-cancelled")));
    signal.addEventListener("abort", abort, { once: true });
    promise.then(
      (value) => finish(() => resolve(value)),
      (error: unknown) => finish(() => reject(error)),
    );
  });
}

function loadLocalImage(source: string, signal: AbortSignal): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    let settled = false;
    const finish = (action: () => void) => {
      if (settled) return;
      settled = true;
      signal.removeEventListener("abort", abort);
      image.onload = null;
      image.onerror = null;
      action();
    };
    const abort = () => finish(() => {
      image.src = "";
      reject(new LogoPreparationError("logo-cancelled"));
    });
    signal.addEventListener("abort", abort, { once: true });
    image.onload = () => finish(() => resolve(image));
    image.onerror = () => finish(() => reject(new LogoPreparationError("logo-decode-failed")));
    if (signal.aborted) abort();
    else image.src = source;
  });
}

function canvasPng(canvas: HTMLCanvasElement, signal: AbortSignal): Promise<Blob> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (action: () => void) => {
      if (settled) return;
      settled = true;
      signal.removeEventListener("abort", abort);
      action();
    };
    const abort = () => finish(() => reject(new LogoPreparationError("logo-cancelled")));
    signal.addEventListener("abort", abort, { once: true });
    canvas.toBlob((blob) => finish(() => {
      if (!blob || blob.type !== "image/png") reject(new LogoPreparationError("logo-decode-failed"));
      else resolve(blob);
    }), "image/png");
    if (signal.aborted) abort();
  });
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunk) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunk));
  }
  return btoa(binary);
}

const browserLogoRasterRuntime: LogoRasterRuntime = {
  async rasterize(source, signal) {
    if (typeof Image === "undefined" || typeof document === "undefined") fail("logo-decode-failed");
    const image = await loadLocalImage(source, signal);
    const width = image.naturalWidth;
    const height = image.naturalHeight;
    validateSourceDimensions(width, height);

    const scale = Math.min(1, MAX_LOGO_RASTER_DIMENSION / Math.max(width, height));
    const outputWidth = Math.max(1, Math.round(width * scale));
    const outputHeight = Math.max(1, Math.round(height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = outputWidth;
    canvas.height = outputHeight;
    try {
      const context = canvas.getContext("2d");
      if (!context) fail("logo-decode-failed");
      context.drawImage(image, 0, 0, outputWidth, outputHeight);
      const blob = await canvasPng(canvas, signal);
      if (blob.size <= 0 || blob.size > MAX_LOGO_RASTER_BYTES) fail("logo-too-large");
      const buffer = await abortable(blob.arrayBuffer(), signal);
      const dataUrl = `${PREPARED_PNG_PREFIX}${bytesToBase64(new Uint8Array(buffer))}`;
      return { dataUrl, width: outputWidth, height: outputHeight, byteLength: blob.size };
    } finally {
      canvas.width = 0;
      canvas.height = 0;
    }
  },
};

export interface PrepareLogoOptions {
  signal?: AbortSignal;
  timeoutMs?: number;
  /** Test seam for deterministic decoding; production callers omit it. */
  runtime?: LogoRasterRuntime;
}

/**
 * Validates a local logo, applies one bounded decode, and returns a PNG data
 * URL. The original data URL/SVG markup never crosses the vendor boundary.
 */
export async function prepareLogoForRender(
  source: string,
  options: PrepareLogoOptions = {},
): Promise<string> {
  if (options.signal?.aborted) fail("logo-cancelled");
  const parsed = decodeLocalDataUrl(source);
  const admittedSource = parsed.mime === SVG_MIME ? validatePassiveSvg(parsed.bytes) : source;
  if (parsed.mime !== SVG_MIME && !hasRasterMagic(parsed.mime, parsed.bytes)) fail("logo-invalid");

  const controller = new AbortController();
  let cancelled = false;
  let timedOut = false;
  const cancel = () => { cancelled = true; controller.abort(); };
  options.signal?.addEventListener("abort", cancel, { once: true });
  const requestedTimeout = Number.isFinite(options.timeoutMs) ? Math.floor(options.timeoutMs ?? 0) : 0;
  const timeoutMs = Math.min(
    MAX_LOGO_PREPARATION_TIMEOUT_MS,
    Math.max(1, requestedTimeout > 0 ? requestedTimeout : MAX_LOGO_PREPARATION_TIMEOUT_MS),
  );
  const timeout = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  try {
    const rasterPromise = Promise.resolve().then(() => {
      if (controller.signal.aborted) fail("logo-cancelled");
      return (options.runtime ?? browserLogoRasterRuntime).rasterize(admittedSource, controller.signal);
    });
    const result = await abortable(rasterPromise, controller.signal);
    if (controller.signal.aborted) fail(timedOut ? "logo-timeout" : "logo-cancelled");
    validatePreparedDimensions(result.width, result.height);
    const png = parsePreparedPng(result.dataUrl);
    if (
      !Number.isInteger(result.byteLength) ||
      result.byteLength <= 0 ||
      result.byteLength > MAX_LOGO_RASTER_BYTES ||
      png === null ||
      png.byteLength !== result.byteLength ||
      png.width !== result.width ||
      png.height !== result.height
    ) {
      fail(result.byteLength > MAX_LOGO_RASTER_BYTES ? "logo-too-large" : "logo-decode-failed");
    }
    return result.dataUrl;
  } catch (error) {
    if (timedOut) throw new LogoPreparationError("logo-timeout");
    if (cancelled || options.signal?.aborted) throw new LogoPreparationError("logo-cancelled");
    const branded = (typeof error === "object" || typeof error === "function") && error !== null
      ? LOGO_ERRORS.get(error)
      : undefined;
    throw new LogoPreparationError(branded ?? "logo-decode-failed");
  } finally {
    clearTimeout(timeout);
    options.signal?.removeEventListener("abort", cancel);
  }
}

/** Clones only when a logo exists; all non-logo style fields remain unchanged. */
export async function prepareRenderStyleLogo(
  style: import("@/qr/types").QrStyle,
  options: PrepareLogoOptions = {},
): Promise<import("@/qr/types").QrStyle> {
  if (options.signal?.aborted) fail("logo-cancelled");
  if (!style.logoUrl) return style;
  return { ...style, logoUrl: await prepareLogoForRender(style.logoUrl, options) };
}
