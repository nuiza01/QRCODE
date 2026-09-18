"use client";

/**
 * Export controls.
 *
 * The download buttons are the second half of the quality contract. `RENDER`
 * clamps the style on the way to the renderer so a bad style cannot produce a
 * bad file; this component makes sure a blocking issue cannot produce a file at
 * all. `disabled` rather than `aria-disabled` on purpose — a user must not be
 * able to export a code that will not scan, and the reason is spelled out in
 * the quality panel above and repeated here in text next to the buttons.
 *
 * The one `role="alert"` in the generator lives here: an export that throws is
 * a one-shot failure the user asked for and is waiting on, which is exactly the
 * case an assertive announcement is for.
 */
import { useLayoutEffect, useRef, useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { qrRenderFailureCode } from "@/qr/render/errors";
import { PNG_EXPORT_SIZES, type PngExportSize } from "@/qr/render/export-options";
import { qrFilename } from "@/qr/render/filename";
import type { QrPreviewStatus } from "@/qr/render/QrPreview";
import type { QrRenderResult } from "@/qr/render/engine";
import type { QrPayload, QrStyle } from "@/qr/types";

import { SelectField } from "./fields";
import type { GeneratorStrings } from "./strings";

export interface DownloadBarProps {
  /** Current validated payload only; `null` for any invalid draft. */
  payload: QrPayload | null;
  style: QrStyle;
  /** Independent style/quality admission block. */
  blocked: boolean;
  /** Exact-current capacity result; pending and generic failures never set it. */
  capacityBlocked?: boolean;
  /** Generator-owned monotonic revision for the current render inputs. */
  renderRevision?: number;
  /** Safe, payload-free status channel back to Generator. */
  onStatus?: (status: QrPreviewStatus) => void;
  pngSize: PngExportSize;
  onPngSizeChange: (size: PngExportSize) => void;
  /** Printed width of the symbol in the PDF, from the print-size guidance. */
  pdfSymbolWidthMm: number;
  s: GeneratorStrings;
}

type Busy = "png" | "svg" | "pdf" | null;

/** The only side effect after rendering; called only for a still-current job. */
function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  try {
    anchor.click();
  } finally {
    anchor.remove();
    // Immediate revocation can cancel Safari's download.
    requestAnimationFrame(() => URL.revokeObjectURL(url));
  }
}

export function DownloadBar({
  payload,
  style,
  blocked,
  capacityBlocked = false,
  renderRevision = 0,
  onStatus,
  pngSize,
  onPngSizeChange,
  pdfSymbolWidthMm,
  s,
}: DownloadBarProps) {
  const [busy, setBusy] = useState<Busy>(null);
  const [failed, setFailed] = useState(false);
  const version = useRef(0);
  const inFlight = useRef(false);

  const inputKey = JSON.stringify([
    payload, style, blocked, capacityBlocked, pngSize, pdfSymbolWidthMm, renderRevision,
  ]);
  useLayoutEffect(() => {
    // Invalidate before another browser event or promise continuation. A
    // monotonic revision also rejects A -> invalid -> A and unmounted jobs.
    return () => { version.current += 1; };
  }, [inputKey]);

  const disabled = blocked || capacityBlocked || payload === null || busy !== null;

  async function run(kind: Exclude<Busy, null>) {
    // Belt and braces: the buttons are disabled, but this is the only function
    // that can reach the exporters and it should refuse on its own terms too.
    if (payload === null || blocked || capacityBlocked || inFlight.current) return;
    const startedAt = version.current;
    inFlight.current = true;
    setFailed(false);
    setBusy(kind);
    try {
      // Event-only import: none of the renderer, QR vendor or PDF stack belongs
      // in the initial route graph merely because download buttons are visible.
      const { renderPdfBlob, renderPngBlob, renderSvgString } =
        await import("@/qr/render");
      // The convenience download* APIs save inside their async operation and
      // cannot be cancelled. Use the existing render APIs, then authorize the
      // save after their last await. Encoding/normalization still live in RENDER.
      let blob: Blob;
      let render: QrRenderResult | undefined;
      let variant: string | number | undefined;
      if (kind === "png") {
        const result = await renderPngBlob({ payload, style, size: pngSize });
        ({ blob, render } = result);
        variant = pngSize;
      } else if (kind === "svg") {
        const result = await renderSvgString({ payload, style });
        const { svg } = result;
        render = result.render;
        blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
      } else {
        const result = await renderPdfBlob({
          payload, style, symbolWidthMm: pdfSymbolWidthMm,
          page: "a4", orientation: "portrait",
        });
        blob = result.blob;
        render = result.render;
        variant = `${Math.round(result.artworkWidthMm)}mm`;
      }
      if (version.current !== startedAt) return;
      if (render && onStatus) onStatus({
        revision: renderRevision,
        state: "success",
        moduleCount: render.moduleCount,
        quietZoneModules: render.geometry.quietZoneModules,
        effectiveEcc: render.style.ecc,
      });
      // Default filenames reveal only type/variant, never payload-derived labels.
      saveBlob(blob, qrFilename({
        contentType: payload.type,
        extension: kind, variant,
      }));
    } catch (failure) {
      if (version.current === startedAt) {
        // The classifier only recognizes renderer-branded errors through a
        // WeakMap. It never reads vendor message/cause/stack/payload bytes.
        if (qrRenderFailureCode(failure) === "capacity-exceeded" && onStatus) {
          onStatus({ revision: renderRevision, state: "error", code: "capacity-exceeded" });
        } else {
          setFailed(true);
        }
      }
    } finally {
      inFlight.current = false;
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-sm font-semibold tracking-tight">{s.download.title}</h3>

      <SelectField<string>
        label={s.download.pngSize}
        value={String(pngSize)}
        options={PNG_EXPORT_SIZES.map((size) => ({
          value: String(size),
          label: `${size} × ${size} px`,
        }))}
        onChange={(value) => onPngSizeChange(Number(value) as PngExportSize)}
      />

      <div className="flex flex-wrap gap-2">
        <Button
          disabled={disabled}
          onClick={() => run("png")}
        >
          {s.download.png}
        </Button>
        <Button
          variant="outline"
          disabled={disabled}
          onClick={() => run("svg")}
        >
          {s.download.svg}
        </Button>
        <Button
          variant="outline"
          disabled={disabled}
          onClick={() => run("pdf")}
        >
          {s.download.pdf}
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        {s.download.pdfNote(Math.round(pdfSymbolWidthMm))}
      </p>

      {/* Polite: this is a standing explanation of a disabled control, not news. */}
      <div role="status" aria-live="polite" className="flex flex-col gap-2">
        {busy !== null ? (
          <p className="text-xs text-muted-foreground">{s.download.working}</p>
        ) : null}
        {payload === null && !blocked ? (
          <p className="text-xs text-muted-foreground">{s.download.needsPayload}</p>
        ) : null}
        {blocked ? (
          <p className="text-xs font-medium text-destructive">{s.quality.blockedBody}</p>
        ) : null}
      </div>

      {failed ? (
        <Alert variant="destructive" role="alert">
          <AlertDescription>{s.download.failed()}</AlertDescription>
        </Alert>
      ) : null}

      <p className="text-xs text-muted-foreground">{s.privacyNote}</p>
    </div>
  );
}
