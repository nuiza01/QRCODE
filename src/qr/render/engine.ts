/**
 * The only place `qr-code-styling` is ever loaded.
 *
 * The library reads `document` while its module body runs, so a static import
 * anywhere in the graph takes down `next build` the moment a page is
 * prerendered. Everything here loads it through `await import()` behind a
 * `window` guard, which keeps the module itself safe to import from anywhere —
 * including the barrel that server components pull print guidance out of.
 *
 * The other job of this module is the module→pixel quiet zone. The conversion
 * needs the symbol's module count, which is only known once the data has been
 * encoded, so the renderer builds the symbol, reads the count back off the
 * instance, and re-applies the margin. See `options.ts` for the arithmetic.
 */
import { encodePayload } from "@/qr/payload/encode";
import { normalizeRenderStyle } from "@/qr/render/colors";
import {
  classifyQrCodeStylingMatrixFailure,
  genericQrRenderError,
} from "@/qr/render/errors";
import {
  LogoPreparationError,
  prepareRenderStyleLogo,
  type PrepareLogoOptions,
} from "@/qr/render/logo";
import type { QrPayload, QrStyle } from "@/qr/types";
import {
  minCanvasSizePx,
  PREVIEW_MODULE_COUNT_HINT,
  quietZoneMarginPx,
  renderedGeometry,
  roundSizeForDrawType,
  toStylingOptions,
  type DrawType,
  type RenderedGeometry,
} from "@/qr/render/options";

type QrCodeStylingCtor = (typeof import("qr-code-styling"))["default"];
type QrCodeStylingInstance = InstanceType<QrCodeStylingCtor>;

/** Marks a synchronous post-matrix drawing throw without retaining its value. */
const VENDOR_DRAWING_FAILURE = Symbol("vendor-drawing-failure");

let ctorPromise: Promise<QrCodeStylingCtor> | null = null;

/**
 * Loads the library once and caches the promise, so a page with a preview and
 * three export buttons still only fetches the chunk a single time.
 */
export function loadQrCodeStyling(): Promise<QrCodeStylingCtor> {
  if (typeof window === "undefined") {
    return Promise.reject(
      new Error(
        "qr-code-styling is browser-only. Render QR codes from a client component or an event handler.",
      ),
    );
  }
  ctorPromise ??= import("qr-code-styling").then((mod) => mod.default);
  return ctorPromise;
}

export interface QrEncodedRenderInput {
  /** Already through `encodePayload` — never build this string by hand. */
  data: string;
  style: QrStyle;
  /** Total artwork side in pixels, quiet zone included. */
  size: number;
  /** `svg` for anything on screen or headed for PDF; `canvas` only for PNG. */
  drawType?: DrawType;
}

export interface QrRenderInput extends Omit<QrEncodedRenderInput, "data"> {
  payload: QrPayload;
}

export interface QrRenderResult {
  /** Modules across the symbol, read off the encoded code rather than guessed. */
  moduleCount: number;
  geometry: RenderedGeometry;
  /** The style after `normalizeStyle` — what was actually drawn. */
  style: QrStyle;
  /** The encoded string that went into the symbol. */
  data: string;
}

/**
 * A single `qr-code-styling` instance that is updated in place.
 *
 * Recreating the instance on every keystroke would remount the SVG and make the
 * preview flicker while someone types, so `update` mutates the existing one and
 * lets the library diff its own DOM.
 */
export class QrRenderer {
  private readonly Ctor: QrCodeStylingCtor;
  private instance: QrCodeStylingInstance | null = null;
  private container: HTMLElement | null = null;
  /** Last successfully applied module count; seeds the next first-pass margin. */
  private knownModuleCount = PREVIEW_MODULE_COUNT_HINT;
  /** Every attempt supersedes output, including failures before the vendor runs. */
  private outputRevision = 0;
  private outputReady = false;

  private constructor(Ctor: QrCodeStylingCtor) {
    this.Ctor = Ctor;
  }

  static async load(): Promise<QrRenderer> {
    return new QrRenderer(await loadQrCodeStyling());
  }

  get moduleCount(): number {
    return this.knownModuleCount;
  }

  /**
   * Encodes, normalizes, renders. Throws rather than rendering something wrong:
   * an unencodable payload or a canvas too small to hold the symbol are both
   * conditions the caller has to surface, not paper over.
   */
  update(input: QrRenderInput): QrRenderResult {
    const revision = this.invalidateOutput();
    return this.renderEncoded({
      data: encodePayload(input.payload),
      style: input.style,
      size: input.size,
      drawType: input.drawType,
    }, revision);
  }

  /**
   * Same, for a caller that already holds the encoded string. `QrPreview` uses
   * this so it can key its effect on the encoded data instead of the payload
   * object, whose identity changes on every parent render and would otherwise
   * redraw the symbol on keystrokes that did not change it.
   */
  updateEncoded(input: QrEncodedRenderInput): QrRenderResult {
    return this.renderEncoded(input, this.invalidateOutput());
  }

  private invalidateOutput(): number {
    this.outputReady = false;
    return ++this.outputRevision;
  }

  private requireCurrentOutput(revision: number): QrCodeStylingInstance {
    if (!this.outputReady || revision !== this.outputRevision || !this.instance) {
      throw new Error("QR output is unavailable. Complete a successful current update first.");
    }
    return this.instance;
  }

  /**
   * Runs the pinned vendor's stages with positive matrix-failure provenance.
   * DOM clear, option normalization and append are outside the parser. The
   * data-bearing `update()` receives no options and has no attached container;
   * its only throwing stages are matrix build and the shielded drawing calls.
   */
  private updateVendorMatrix(
    instance: QrCodeStylingInstance,
    options: Parameters<QrCodeStylingInstance["update"]>[0],
  ): void {
    // Inert unit doubles do not expose the pinned vendor's internal state. Keep
    // their historical single-update contract; production always takes the
    // guarded `_options` branch, enforced by installed-version drift tests.
    if (!("_options" in (instance as unknown as object))) {
      try {
        instance.update(options);
      } catch (failure) {
        throw classifyQrCodeStylingMatrixFailure(failure);
      }
      return;
    }

    // A margin-only second pass reuses data whose matrix already succeeded.
    // Keep that vendor call intact for compatibility, but treat every failure
    // from its combined clear/options/matrix/draw/append pipeline as generic.
    if (options?.data === undefined) {
      try {
        instance.update(options);
      } catch {
        throw genericQrRenderError();
      }
      return;
    }

    const originalSvg = instance._setupSvg;
    const originalCanvas = instance._setupCanvas;
    const svgOwn = Object.getOwnPropertyDescriptor(instance, "_setupSvg");
    const canvasOwn = Object.getOwnPropertyDescriptor(instance, "_setupCanvas");
    const containerOwn = Object.getOwnPropertyDescriptor(instance, "_container");
    const container = instance._container ?? this.container ?? undefined;

    try {
      if (typeof this.Ctor._clearContainer === "function") {
        this.Ctor._clearContainer(container);
      } else if (container) {
        container.innerHTML = "";
      }
    } catch {
      throw genericQrRenderError();
    }

    try {
      instance._container = undefined;
      instance._setupSvg = function shieldSvg(this: QrCodeStylingInstance) {
        try {
          originalSvg.call(this);
        } catch {
          throw VENDOR_DRAWING_FAILURE;
        }
      };
      instance._setupCanvas = function shieldCanvas(this: QrCodeStylingInstance) {
        try {
          originalCanvas.call(this);
        } catch {
          throw VENDOR_DRAWING_FAILURE;
        }
      };

      const matrixData = options?.data ?? instance._options.data;
      try {
        // Vendor merge/sanitize runs here with no data, so it cannot reach the
        // matrix or drawing stages and any throw is unambiguously generic.
        instance.update({ ...options, data: "" });
        instance._options.data = matrixData;
      } catch {
        throw genericQrRenderError();
      }

      try {
        // No options means no merge/sanitize. The detached container makes
        // clear/append no-ops; drawing throws carry the private marker above.
        instance.update();
      } catch (failure) {
        throw failure === VENDOR_DRAWING_FAILURE
          ? genericQrRenderError()
          : classifyQrCodeStylingMatrixFailure(failure);
      }
    } finally {
      if (svgOwn) Object.defineProperty(instance, "_setupSvg", svgOwn);
      else Reflect.deleteProperty(instance, "_setupSvg");
      if (canvasOwn) Object.defineProperty(instance, "_setupCanvas", canvasOwn);
      else Reflect.deleteProperty(instance, "_setupCanvas");
      if (containerOwn) Object.defineProperty(instance, "_container", containerOwn);
      else Reflect.deleteProperty(instance, "_container");
    }

    if (container) {
      try {
        instance.append(container);
      } catch {
        throw genericQrRenderError();
      }
    }
  }

  private renderEncoded(input: QrEncodedRenderInput, revision: number): QrRenderResult {
    const { data } = input;
    const style = normalizeRenderStyle(input.style);
    const drawType = input.drawType ?? "svg";
    const roundSize = roundSizeForDrawType(drawType);

    const options = toStylingOptions({
      data,
      style,
      size: input.size,
      moduleCount: this.knownModuleCount,
      drawType,
    });

    if (!this.instance) {
      try {
        // Construct empty, then run the data-bearing update through the exact
        // matrix boundary below. Constructor/drawing look-alikes stay generic.
        this.instance = new this.Ctor();
      } catch {
        throw genericQrRenderError();
      }
    }
    this.updateVendorMatrix(this.instance, options);

    // Second pass: the instance now holds the encoded symbol, so the module
    // count is a fact instead of an estimate. Re-apply the margin only when it
    // moved — while someone types inside one QR version this is a no-op, which
    // is what keeps live typing to a single draw per keystroke.
    const actual = this.instance._qr?.getModuleCount();
    if (actual && actual !== this.knownModuleCount) {
      const required = minCanvasSizePx(actual, style.marginModules);
      if (input.size < required) {
        throw new Error(
          `A ${actual}-module symbol with a ${style.marginModules}-module quiet zone needs at least ${required}px; got ${input.size}px.`,
        );
      }
      this.updateVendorMatrix(this.instance, {
        margin: quietZoneMarginPx(input.size, actual, style.marginModules, roundSize),
      });
      // A failed second pass must not make a retry skip geometry validation.
      this.knownModuleCount = actual;
    }

    const result = {
      moduleCount: this.knownModuleCount,
      geometry: renderedGeometry(
        input.size,
        this.knownModuleCount,
        style.marginModules,
        roundSize,
      ),
      style,
      data,
    };
    // Only a fully completed current update can authorize reads. Keep the
    // vendor/host for preview continuity; it may still cache an older drawing
    // after a throw, which must never make that drawing exportable again.
    if (revision === this.outputRevision) this.outputReady = true;
    this.requireCurrentOutput(revision);
    return result;
  }

  /** Mounts the rendered node into a host element, and keeps it there on update. */
  attach(container: HTMLElement): void {
    this.container = container;
    try {
      this.instance?.append(container);
    } catch {
      throw genericQrRenderError();
    }
  }

  destroy(): void {
    this.invalidateOutput();
    // React never owns children of the host node — the library appends into it
    // — so clearing it here is the only way the node gets cleaned up when the
    // renderer outlives a re-attach.
    if (this.container) this.container.innerHTML = "";
    this.container = null;
    this.instance = null;
  }

  /** Reads only the current successful update; a new attempt/destroy revokes pending reads. */
  async toBlob(extension: "png" | "svg"): Promise<Blob> {
    const revision = this.outputRevision;
    const instance = this.requireCurrentOutput(revision);
    let raw: Awaited<ReturnType<QrCodeStylingInstance["getRawData"]>>;
    try {
      raw = await instance.getRawData(extension);
    } catch {
      throw genericQrRenderError();
    }
    this.requireCurrentOutput(revision);
    if (!(raw instanceof Blob)) {
      throw new Error(`qr-code-styling returned no ${extension} data.`);
    }
    return raw;
  }

  /** Real vector output — the same markup the PDF exporter embeds. */
  async toSvgString(): Promise<string> {
    const revision = this.outputRevision;
    const blob = await this.toBlob("svg");
    this.requireCurrentOutput(revision);
    const svg = await blob.text();
    this.requireCurrentOutput(revision);
    return svg;
  }
}

/**
 * One-shot render for the export paths, which need a fresh instance at the
 * export size rather than the one the preview is driving.
 */
export async function renderOnce(
  input: QrRenderInput,
  logoOptions: PrepareLogoOptions = {},
): Promise<{ renderer: QrRenderer; result: QrRenderResult }> {
  // Reject unsafe paint before loading/constructing any browser vendor.
  const style = normalizeRenderStyle(input.style);
  const preparedStyle = await prepareRenderStyleLogo(style, logoOptions);
  const renderer = await QrRenderer.load();
  try {
    if (logoOptions.signal?.aborted) throw new LogoPreparationError("logo-cancelled");
    const rendered = renderer.update({ ...input, style: preparedStyle });
    // Logo rasterization is an internal transport detail. Keep the public
    // result style compatible with the caller's normalized source style.
    return { renderer, result: { ...rendered, style } };
  } catch (error) {
    renderer.destroy();
    throw error;
  }
}
