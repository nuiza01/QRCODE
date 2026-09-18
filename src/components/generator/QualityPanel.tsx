"use client";

/**
 * Live scan-quality feedback.
 *
 * ## Why this is a polite live region
 *
 * `inspectStyle()` re-runs on every keystroke and on every frame of a dragged
 * colour picker. Wrapping that in `role="alert"` (assertive) makes a screen
 * reader abandon whatever it was saying and start again, continuously, for as
 * long as the user holds the mouse down — the panel becomes unusable for the
 * people it helps most. So the panel itself is `role="status"` and the
 * individual `Alert`s inside it are marked `role="presentation"`: nesting a
 * live region inside a live region makes the same text get announced twice.
 * `role="alert"` is reserved for one-shot failures, which live in the download
 * bar, not here.
 */
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { Locale } from "@/i18n/config";
import type { QualityIssue } from "@/qr/quality";
import { describePrintSize } from "@/qr/render/strings";

import { SelectField } from "./fields";
import { qualityMessage } from "./qualityMessages";
import type { GeneratorStrings } from "./strings";

/** Arm's length, a table tent, a poster, a wall sign, a banner. */
export const SCAN_DISTANCES_MM = [300, 500, 1000, 2000, 5000] as const;

export interface QualityPanelProps {
  issues: QualityIssue[];
  blocked: boolean;
  /** Real count from `QrPreview`'s `onRender`, not an estimate. */
  moduleCount: number;
  quietZoneModules: number;
  scanDistanceMm: number;
  onScanDistanceChange: (millimetres: number) => void;
  /** The PNG size currently selected, so the dpi warning matches what they'd get. */
  exportSizePx: number;
  locale: Locale;
  s: GeneratorStrings;
}

export function QualityPanel({
  issues,
  blocked,
  moduleCount,
  quietZoneModules,
  scanDistanceMm,
  onScanDistanceChange,
  exportSizePx,
  locale,
  s,
}: QualityPanelProps) {
  const print = describePrintSize(
    { scanDistanceMm, exportSizePx, moduleCount, quietZoneModules },
    locale,
  );

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-sm font-semibold tracking-tight">{s.quality.title}</h3>

      <div role="status" aria-live="polite" className="flex flex-col gap-2">
        {issues.map((issue) => (
          <Alert
            key={issue.code}
            role="presentation"
            variant={issue.level === "error" ? "destructive" : "warning"}
          >
            <AlertDescription>{qualityMessage(issue, locale)}</AlertDescription>
          </Alert>
        ))}

        {issues.length === 0 ? (
          <Alert role="presentation" variant="success">
            <AlertDescription>{s.quality.allClear}</AlertDescription>
          </Alert>
        ) : null}

        {blocked ? (
          <Alert role="presentation" variant="destructive">
            <AlertTitle>{s.quality.blockedTitle}</AlertTitle>
            <AlertDescription>{s.quality.blockedBody}</AlertDescription>
          </Alert>
        ) : null}
      </div>

      <SelectField<string>
        label={s.quality.scanDistance}
        value={String(scanDistanceMm)}
        options={SCAN_DISTANCES_MM.map((millimetres) => ({
          value: String(millimetres),
          label: s.quality.scanDistanceOption(millimetres / 1000),
        }))}
        onChange={(value) => onScanDistanceChange(Number(value))}
      />

      {/*
        Derived from the geometry that was really drawn — module count and quiet
        zone both come back from the renderer — so the millimetres quoted here
        are the millimetres the file will need, not a guess from a default
        version-4 symbol.
      */}
      <div className="flex flex-col gap-1 rounded-lg border border-border bg-muted/40 p-3">
        <p className="text-xs font-medium text-foreground">{s.quality.printTitle}</p>
        <p className="text-xs text-muted-foreground">{print.headline}</p>
        {print.resolution ? (
          <p className="text-xs text-muted-foreground">{print.resolution}</p>
        ) : null}
        <p className="text-xs text-muted-foreground">{print.vectorNote}</p>
      </div>
    </div>
  );
}
