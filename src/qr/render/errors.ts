/** Fixed, payload-free failure codes safe to cross the renderer/UI boundary. */
export type QrRenderFailureCode = "capacity-exceeded" | "render-failed";

const MESSAGES: Record<QrRenderFailureCode, string> = {
  "capacity-exceeded": "QR data exceeds the current encoding capacity.",
  "render-failed": "QR rendering failed.",
};
const SAFE_RENDER_ERROR_CODES = new WeakMap<object, QrRenderFailureCode>();

/**
 * A safe renderer failure. It deliberately has no `cause`: an unknown vendor
 * value must never be retained, inspected, logged or echoed to UI state.
 */
export class QrRenderError extends Error {
  declare readonly code: QrRenderFailureCode;

  constructor(code: QrRenderFailureCode) {
    const safeCode: QrRenderFailureCode =
      code === "capacity-exceeded" ? "capacity-exceeded" : "render-failed";
    super(MESSAGES[safeCode]);
    this.name = "QrRenderError";
    Object.defineProperty(this, "code", {
      value: safeCode,
      enumerable: true,
      writable: false,
      configurable: false,
    });
    SAFE_RENDER_ERROR_CODES.set(this, safeCode);
  }
}

const MAX_VENDOR_OVERFLOW_LENGTH = 64;
const VENDOR_OVERFLOW = /^code length overflow\. \(([0-9]{1,8})>([0-9]{1,8})\)$/;

/**
 * Internal adapter for the exact qr-code-styling matrix operation only.
 * Call-site provenance matters: matching text from drawing, raw data, PDF or
 * DOM work is generic and must never be routed through this function.
 */
export function classifyQrCodeStylingMatrixFailure(value: unknown): QrRenderError {
  if (typeof value !== "string" || value.length > MAX_VENDOR_OVERFLOW_LENGTH) {
    return new QrRenderError("render-failed");
  }
  const match = VENDOR_OVERFLOW.exec(value);
  if (!match) return new QrRenderError("render-failed");
  const usedBits = Number(match[1]);
  const availableBits = Number(match[2]);
  return new QrRenderError(
    usedBits > availableBits ? "capacity-exceeded" : "render-failed",
  );
}

/** Maps any non-branded unknown to a fixed generic code without inspecting it. */
export function qrRenderFailureCode(value: unknown): QrRenderFailureCode {
  if ((typeof value !== "object" && typeof value !== "function") || value === null) {
    return "render-failed";
  }
  return SAFE_RENDER_ERROR_CODES.get(value) ?? "render-failed";
}

export function genericQrRenderError(): QrRenderError {
  return new QrRenderError("render-failed");
}
