"use client";

/**
 * The "test scan" affordance.
 *
 * `PLAN.md` calls this a support-ticket killer, and the reason is narrow: a
 * code that fails on paper almost always fails on screen first, at the size it
 * will be printed. So this shows the symbol at its recommended *physical* print
 * width and asks the user to point a phone at it before spending money at a
 * printer.
 *
 * Presentational on purpose — a bordered block with a slot for actions, no
 * dialog primitives, no state beyond what sizing needs. FORMS owns the dialog
 * it goes inside.
 */
import { useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { defaultLocale, type Locale } from "@/i18n/config";
import { normalizeStyle } from "@/qr/quality";
import type { QrPayload, QrStyle } from "@/qr/types";
import { DEFAULT_PDF_SYMBOL_WIDTH_MM } from "@/qr/render/export";
import { PREVIEW_MODULE_COUNT_HINT } from "@/qr/render/options";
import { formatLength, mmToCssPx } from "@/qr/render/print";
import { QrPreview } from "@/qr/render/QrPreview";
import { describePrintSize, renderCopy } from "@/qr/render/strings";

export interface TestScanCardProps {
  payload: QrPayload;
  style: QrStyle;
  /** Printed width of the symbol itself. Defaults to the 0.5 m scan-distance rule. */
  symbolWidthMm?: number;
  locale?: Locale;
  className?: string;
  /** Download buttons, a "looks good" confirmation — whatever FORMS needs below. */
  actions?: ReactNode;
}

export function TestScanCard({
  payload,
  style,
  symbolWidthMm = DEFAULT_PDF_SYMBOL_WIDTH_MM,
  locale = defaultLocale,
  className,
  actions,
}: TestScanCardProps) {
  const copy = renderCopy(locale);

  // Starts from the provisional count and settles on the real one after the
  // first draw. Re-rendering with the same count is a no-op, so this converges
  // in one step rather than looping.
  const [moduleCount, setModuleCount] = useState(PREVIEW_MODULE_COUNT_HINT);
  const quietZoneModules = normalizeStyle(style).marginModules;

  // The box on screen holds the whole artwork, so it has to be wider than the
  // symbol by exactly the quiet zone — otherwise the symbol inside it comes out
  // undersized and the "this is print size" promise is wrong.
  const artworkWidthMm =
    (symbolWidthMm * (moduleCount + 2 * quietZoneModules)) / moduleCount;

  const { headline } = describePrintSize({ moduleCount, quietZoneModules }, locale);

  return (
    <div className={cn("flex flex-col items-center gap-4 rounded-lg border p-6 text-center", className)}>
      <h2 className="text-base font-semibold">{copy.testScanTitle}</h2>

      <QrPreview
        payload={payload}
        style={style}
        size={mmToCssPx(artworkWidthMm)}
        locale={locale}
        onRender={(result) => setModuleCount(result.moduleCount)}
      />

      <p className="max-w-prose text-sm">{copy.testScanBody}</p>

      <p className="max-w-prose text-xs opacity-70">
        {copy.testScanSizeNote(formatLength(artworkWidthMm / 10))} {copy.testScanRulerNote}
      </p>

      <p className="max-w-prose text-xs opacity-70">{headline}</p>

      {actions}
    </div>
  );
}

export default TestScanCard;
