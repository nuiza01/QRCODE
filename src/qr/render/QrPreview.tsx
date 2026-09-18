"use client";

/**
 * Live QR preview.
 *
 * Three things make this more than a wrapper.
 *
 * 1. `qr-code-styling` is loaded lazily inside an effect, so nothing about it
 *    exists during prerender — importing it at module scope takes down the
 *    build the moment a page containing this component is statically rendered.
 * 2. The draw effect is keyed on the *encoded string* and a *normalized style
 *    signature*, not on the prop objects. A controlled form rebuilds its
 *    payload object on every keystroke; keying on identity would redraw the
 *    symbol for edits that cannot change it.
 * 3. The instance is updated in place. Recreating it would remount the SVG and
 *    make the preview blink while somebody types.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { defaultLocale, type Locale } from "@/i18n/config";
import { encodePayload } from "@/qr/payload/encode";
import { normalizeStyle } from "@/qr/quality";
import type { EccLevel, QrPayload, QrStyle } from "@/qr/types";
import { QrRenderer, type QrRenderResult } from "@/qr/render/engine";
import { qrRenderFailureCode, type QrRenderFailureCode } from "@/qr/render/errors";
import { prepareRenderStyleLogo } from "@/qr/render/logo";
import { renderCopy } from "@/qr/render/strings";

/** Comfortably above the 209px a version-40 symbol needs at one pixel per module. */
export const DEFAULT_PREVIEW_SIZE = 320;

interface QrPreviewBaseProps {
  payload: QrPayload;
  style: QrStyle;
  /** Side of the rendered artwork in CSS pixels, quiet zone included. */
  size?: number;
  className?: string;
  locale?: Locale;
  /**
   * Fires after every successful draw with the real module count and the
   * geometry that was rendered. Feed `moduleCount` and `quietZoneModules` into
   * `describePrintSize` to get honest print guidance. Need not be memoized.
   */
  onRender?: (result: QrRenderResult) => void;
}

export type QrPreviewStatus =
  | { revision: number; state: "pending" }
  | {
      revision: number;
      state: "success";
      moduleCount: number;
      quietZoneModules: number;
      effectiveEcc: EccLevel;
    }
  | { revision: number; state: "error"; code: QrRenderFailureCode };

type LegacyPreviewStatusProps = { renderRevision?: never; onStatus?: never };
type EnabledPreviewStatusProps = {
  /** Caller-owned synchronous generation revision; never derived in QrPreview. */
  renderRevision: number;
  /** Reports success/error only. The future Generator owns synchronous pending. */
  onStatus: (status: QrPreviewStatus) => void;
};

export type QrPreviewProps = QrPreviewBaseProps &
  (LegacyPreviewStatusProps | EnabledPreviewStatusProps);

type DrawState = "pending" | "ok" | "failed";

export function QrPreview({
  payload,
  style,
  size = DEFAULT_PREVIEW_SIZE,
  className,
  locale = defaultLocale,
  onRender,
  renderRevision,
  onStatus,
}: QrPreviewProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [renderer, setRenderer] = useState<QrRenderer | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [drawState, setDrawState] = useState<DrawState>("pending");
  const copy = renderCopy(locale);

  const onRenderRef = useRef(onRender);
  const statusTargetRef = useRef<EnabledPreviewStatusProps | null>(null);
  const lastStatusKeyRef = useRef<string | null>(null);
  const lastStatusRevisionRef = useRef<number | null>(null);
  useEffect(() => {
    onRenderRef.current = onRender;
  });

  useEffect(() => {
    const target: EnabledPreviewStatusProps | null =
      renderRevision === undefined || onStatus === undefined
        ? null
        : { renderRevision, onStatus };
    if (lastStatusRevisionRef.current !== target?.renderRevision) {
      lastStatusRevisionRef.current = target?.renderRevision ?? null;
      lastStatusKeyRef.current = null;
    }
    statusTargetRef.current = target;
  });

  useEffect(() => () => {
    statusTargetRef.current = null;
  }, []);

  const emitStatus = useCallback((status: QrPreviewStatus) => {
    const target = statusTargetRef.current;
    if (!target || target.renderRevision !== status.revision) return;
    const key = status.state === "success"
      ? `${status.revision}:success:${status.moduleCount}:${status.quietZoneModules}:${status.effectiveEcc}`
      : status.state === "error"
        ? `${status.revision}:error:${status.code}`
        : `${status.revision}:pending`;
    if (lastStatusKeyRef.current === key) return;
    lastStatusKeyRef.current = key;
    target.onStatus(status);
  }, []);

  const emitCurrentGenericFailure = useCallback(() => {
    const target = statusTargetRef.current;
    if (target) emitStatus({
      revision: target.renderRevision,
      state: "error",
      code: "render-failed",
    });
  }, [emitStatus]);

  // `null` means the payload cannot be encoded at all — an event with an
  // unparseable date, say. Derived during render, so it needs no state.
  const data = useMemo(() => {
    try {
      return encodePayload(payload);
    } catch {
      return null;
    }
  }, [payload]);

  // Round-tripping through JSON yields a style object whose identity changes
  // only when its contents do, which is what keeps the draw effect quiet while
  // a parent re-renders. `QrStyle` is plain JSON data, so this is lossless.
  const styleKey = useMemo(() => JSON.stringify(normalizeStyle(style)), [style]);
  const stableStyle = useMemo(() => JSON.parse(styleKey) as QrStyle, [styleKey]);

  useEffect(() => {
    let active = true;
    let created: QrRenderer | null = null;

    QrRenderer.load()
      .then((instance) => {
        if (!active) {
          instance.destroy();
          return;
        }
        created = instance;
        setRenderer(instance);
      })
      .catch(() => {
        if (active) {
          setLoadFailed(true);
          emitCurrentGenericFailure();
        }
      });

    return () => {
      active = false;
      created?.destroy();
    };
  }, [emitCurrentGenericFailure]);

  useEffect(() => {
    if (data !== null || renderRevision === undefined) return;
    let cancelled = false;
    void Promise.resolve().then(() => {
      if (!cancelled) emitStatus({
        revision: renderRevision,
        state: "error",
        code: "render-failed",
      });
    });
    return () => { cancelled = true; };
  }, [data, renderRevision, emitStatus]);

  useEffect(() => {
    const host = hostRef.current;
    if (!renderer || !host || data === null) return;

    let cancelled = false;
    const logoController = new AbortController();

    void (async () => {
      let outcome: QrRenderResult | null = null;
      let failureCode: QrRenderFailureCode = "render-failed";
      try {
        const preparedStyle = stableStyle.logoUrl
          ? await prepareRenderStyleLogo(stableStyle, { signal: logoController.signal })
          : stableStyle;
        if (cancelled) return;
        // Synchronous, so the symbol is in the DOM before the next paint.
        const rendered = renderer.updateEncoded({
          data,
          style: preparedStyle,
          size,
          // SVG on screen: sharp on a retina display, and no rasterisation per
          // keystroke. PNG export builds its own canvas at export size.
          drawType: "svg",
        });
        outcome = { ...rendered, style: stableStyle };
        renderer.attach(host);
      } catch (failure) {
        outcome = null;
        failureCode = qrRenderFailureCode(failure);
      }

      // Reporting the outcome back to React waits a microtask on purpose: an
      // effect body is for pushing state into an external system, not for
      // pulling state out of it, and a synchronous setState here would cascade.
      await Promise.resolve();
      if (cancelled) return;

      setDrawState(outcome ? "ok" : "failed");
      if (outcome) {
        onRenderRef.current?.(outcome);
        if (renderRevision !== undefined) emitStatus({
          revision: renderRevision,
          state: "success",
          moduleCount: outcome.moduleCount,
          quietZoneModules: outcome.geometry.quietZoneModules,
          effectiveEcc: outcome.style.ecc,
        });
      } else if (renderRevision !== undefined) {
        emitStatus({ revision: renderRevision, state: "error", code: failureCode });
      }
    })();

    return () => {
      cancelled = true;
      logoController.abort();
    };
  }, [renderer, data, stableStyle, size, renderRevision, emitStatus]);

  const failed = loadFailed || data === null || drawState === "failed";
  // Stays "ok" through an update, so the previous symbol remains on screen
  // while the new one is drawn rather than flashing back to the placeholder.
  const showPlaceholder = failed || drawState !== "ok";

  return (
    <div
      className={cn("relative inline-block", className)}
      // Fixed from the first paint, before the library has loaded, so nothing
      // below the preview jumps when the symbol appears.
      style={{ width: size, height: size }}
    >
      <div
        ref={hostRef}
        role="img"
        aria-label={copy.previewLabel}
        aria-busy={showPlaceholder && !failed}
        className="h-full w-full [&>canvas]:block [&>canvas]:h-full [&>canvas]:w-full [&>svg]:block [&>svg]:h-full [&>svg]:w-full"
      />

      {showPlaceholder && (
        <div
          className={cn(
            "absolute inset-0 flex items-center justify-center rounded-md bg-black/5 p-4 text-center text-sm",
            !failed && "animate-pulse",
          )}
        >
          {failed ? (
            copy.previewError
          ) : (
            <span className="sr-only">{copy.previewLoading}</span>
          )}
        </div>
      )}
    </div>
  );
}

export default QrPreview;
