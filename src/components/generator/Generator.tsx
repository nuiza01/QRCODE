"use client";

/**
 * The generator.
 *
 * ## State shape
 *
 * Four pieces of state, deliberately kept apart:
 *
 *  - `drafts` — one form-shaped draft per content type, all ten alive at once.
 *    Switching from WiFi to vCard and back does not lose what was typed, which
 *    matters because the type switcher stays visible on the per-type SEO
 *    landing pages: a user who lands on /qr/wifi and then wants a vCard must
 *    not be punished for changing their mind.
 *  - `style` — the *raw* `QrStyle`, never the normalized one. `normalizeStyle`
 *    is applied for display and by the renderer; storing its output would make
 *    "ECC forced to H by the logo" permanent after the logo is removed.
 *  - `lastValidPayload` — the last payload that passed the schema *and*
 *    encoded. The preview reads this, so a half-typed URL does not blank the
 *    symbol on every keystroke.
 *  - `geometry` — module count and quiet zone reported back by the renderer,
 *    so print guidance describes what was drawn rather than a default guess.
 *
 * Validation state is *not* stored. It is derived from `drafts` on every
 * render through `validateDraft`, which is the zod schemas and nothing else.
 * `touched` only decides whether an error is shown, never whether it exists.
 */
import dynamic from "next/dynamic";
import { useCallback, useMemo, useRef, useState, type ReactElement } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { type Locale, t } from "@/i18n/config";
import { cn } from "@/lib/cn";
import { hasBlockingIssue, inspectStyle, normalizeStyle } from "@/qr/quality";
import { DEFAULT_PNG_SIZE, type PngExportSize } from "@/qr/render/export-options";
import { PREVIEW_MODULE_COUNT_HINT } from "@/qr/render/options";
import type { QrPreviewStatus } from "@/qr/render/QrPreview";
import { describePrintSize } from "@/qr/render/strings";
import { DEFAULT_STYLE, type QrContentType, type QrPayload, type QrStyle } from "@/qr/types";

import { DownloadBar } from "./DownloadBar";
import { PayloadForm } from "./PayloadForm";
import { QualityPanel } from "./QualityPanel";
import { SaveQrCard } from "./SaveQrCard";
import { StyleEditor } from "./StyleEditor";
import { TestScanDialog } from "./TestScanDialog";
import { CONTENT_TYPES, emptyDrafts, type DraftMap } from "./drafts";
import { FORM_ERROR_KEY, validateDraft, type FieldErrors } from "./payload";
import { generatorStrings } from "./strings";

const DEFAULT_SCAN_DISTANCE_MM = 500;

// `dynamic()` must own the literal import at module scope for Next to keep the
// renderer/vendor graph out of every route's initial client scripts.
const QrPreview = dynamic(
  () => import("@/qr/render").then((module) => module.QrPreview),
  {
    loading: () => (
      <div
        aria-hidden="true"
        className="h-80 w-80 max-w-full rounded-lg border border-dashed border-border"
      />
    ),
  },
);

export interface GeneratorProps {
  locale: Locale;
  /** Type the generator opens on. Defaults to "url". */
  initialType?: QrContentType;
  accountEnabled?: boolean;
  className?: string;
}

interface Geometry {
  moduleCount: number;
  quietZoneModules: number;
}

type EligibilityStatus =
  | { revision: number; state: "success" }
  | {
      revision: number;
      state: "error";
      code: "capacity-exceeded" | "render-failed";
    };

export function Generator({
  locale,
  initialType = "url",
  accountEnabled = false,
  className,
}: GeneratorProps): ReactElement {
  const s = t(generatorStrings, locale);

  const [type, setType] = useState<QrContentType>(initialType);
  const [drafts, setDrafts] = useState<DraftMap>(emptyDrafts);
  /** Keyed `type.field`, so the same field name in two forms stays independent. */
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [style, setStyle] = useState<QrStyle>(() => ({ ...DEFAULT_STYLE }));
  const [geometry, setGeometry] = useState<Geometry>({
    moduleCount: PREVIEW_MODULE_COUNT_HINT,
    quietZoneModules: DEFAULT_STYLE.marginModules,
  });
  const [scanDistanceMm, setScanDistanceMm] = useState(DEFAULT_SCAN_DISTANCE_MM);
  const [pngSize, setPngSize] = useState<PngExportSize>(DEFAULT_PNG_SIZE);
  const renderRevisionRef = useRef(1);
  const [renderRevision, setRenderRevision] = useState(1);
  const [eligibilityStatus, setEligibilityStatus] = useState<EligibilityStatus | null>(null);
  /**
   * Last payload that validated, per content type. Written from the change
   * handler rather than from an effect or a ref: it is a consequence of an
   * edit, so the edit is where it belongs. Keyed by type so switching tabs
   * cannot show a WiFi code on the vCard tab, and so coming back to a tab
   * restores the preview it had.
   */
  const [lastValid, setLastValid] = useState<Partial<Record<QrContentType, QrPayload>>>(
    {},
  );

  // Memoized on the drafts object, so `validation.payload` keeps a stable
  // identity between renders that did not change the form.
  const validation = useMemo(
    () => validateDraft(type, drafts[type], s.errors, locale),
    [type, drafts, s.errors, locale],
  );

  const visibleErrors: FieldErrors = useMemo(() => {
    // Any field of *this* type having been touched, not merely a field that
    // happens to be in the error map: a form-level error (an unencodable
    // PromptPay target, say) has no field key of its own, so keying off the
    // error map would hide it forever.
    const prefix = `${type}.`;
    const anyTouched = Object.entries(touched).some(
      ([key, value]) => value && key.startsWith(prefix),
    );
    const shown: FieldErrors = {};
    for (const [field, message] of Object.entries(validation.errors)) {
      // A form-level error (an unencodable PromptPay target, say) has no field
      // of its own to hang off, so it appears once anything has been touched.
      if (field === FORM_ERROR_KEY ? anyTouched : touched[`${type}.${field}`]) {
        shown[field] = message;
      }
    }
    return shown;
  }, [validation.errors, touched, type]);

  // The live payload when the form is valid, the last good one while the user
  // is mid-keystroke. Without the fallback the symbol would blank out every
  // time somebody deleted a character.
  const previewPayload = validation.payload ?? lastValid[type] ?? null;

  const issues = useMemo(() => inspectStyle(style), [style]);
  const blocked = hasBlockingIssue(issues);
  // Preview continuity is not output eligibility. Exporters render this
  // current, synchronously validated payload themselves; neither a pending
  // preview draw nor a late onRender callback may authorize the fallback.
  const outputPayload = validation.payload;
  const capacityBlocked =
    eligibilityStatus?.revision === renderRevision &&
    eligibilityStatus.state === "error" &&
    eligibilityStatus.code === "capacity-exceeded";
  const effectiveStyle = useMemo(() => normalizeStyle(style), [style]);
  const canLowerEcc = !style.logoUrl && effectiveStyle.ecc !== "L";

  const print = describePrintSize(
    {
      scanDistanceMm,
      moduleCount: geometry.moduleCount,
      quietZoneModules: geometry.quietZoneModules,
    },
    locale,
  );

  const advanceRenderRevision = useCallback(() => {
    renderRevisionRef.current += 1;
    setRenderRevision(renderRevisionRef.current);
    // Pending is derived synchronously from the new revision and this cleared
    // metadata. Old success/capacity callbacks can no longer match it.
    setEligibilityStatus(null);
  }, []);

  const handleRenderStatus = useCallback((status: QrPreviewStatus) => {
    if (status.revision !== renderRevisionRef.current) return;
    if (status.state === "success") {
      setGeometry((previous) =>
        previous.moduleCount === status.moduleCount &&
        previous.quietZoneModules === status.quietZoneModules
          ? previous
          : {
              moduleCount: status.moduleCount,
              quietZoneModules: status.quietZoneModules,
            },
      );
      setEligibilityStatus({ revision: status.revision, state: "success" });
    } else if (status.state === "error") {
      setEligibilityStatus({
        revision: status.revision,
        state: "error",
        code: status.code,
      });
    }
  }, []);

  const handleDraftChange = useCallback(
    <T extends QrContentType>(draftType: T, patch: Partial<DraftMap[T]>) => {
      const nextDraft = { ...drafts[draftType], ...patch };
      advanceRenderRevision();
      setDrafts((previous) => ({ ...previous, [draftType]: nextDraft }));

      const result = validateDraft(draftType, nextDraft, s.errors, locale);
      if (result.payload) {
        const valid = result.payload;
        setLastValid((previous) => ({ ...previous, [draftType]: valid }));
      }

      // Editing a field counts as touching it: validation is live, not on
      // submit, and there is no submit button to wait for.
      setTouched((previous) => {
        const next = { ...previous };
        for (const field of Object.keys(patch)) next[`${draftType}.${field}`] = true;
        return next;
      });
    },
    [advanceRenderRevision, drafts, s.errors, locale],
  );

  const handleTouch = useCallback(
    (field: string) => {
      setTouched((previous) =>
        previous[`${type}.${field}`] ? previous : { ...previous, [`${type}.${field}`]: true },
      );
    },
    [type],
  );

  return (
    <div className={cn("grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-8", className)}>
      <div className="flex min-w-0 flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle as="h2">{s.contentTitle}</CardTitle>
            <CardDescription>{s.contentDescription}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            <Tabs
              value={type}
              onValueChange={(value) => {
                advanceRenderRevision();
                setType(value as QrContentType);
              }}
            >
              <TabsList aria-label={s.typeSwitcherLabel}>
                {CONTENT_TYPES.map((contentType) => (
                  <TabsTrigger key={contentType} value={contentType}>
                    {s.typeLabel[contentType]}
                  </TabsTrigger>
                ))}
              </TabsList>

              <TabsContent value={type}>
                <PayloadForm
                  type={type}
                  drafts={drafts}
                  errors={visibleErrors}
                  s={s}
                  onChange={handleDraftChange}
                  onTouch={handleTouch}
                />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle as="h2">{s.styleTitle}</CardTitle>
            <CardDescription>{s.styleDescription}</CardDescription>
          </CardHeader>
          <CardContent>
            <StyleEditor
              style={style}
              s={s}
              onChange={(patch) => {
                advanceRenderRevision();
                setStyle((previous) => ({ ...previous, ...patch }));
              }}
              onReset={() => {
                advanceRenderRevision();
                setStyle({ ...DEFAULT_STYLE });
              }}
            />
          </CardContent>
        </Card>
      </div>

      <div className="flex min-w-0 flex-col gap-6 lg:sticky lg:top-20 lg:self-start">
        <Card>
          <CardHeader>
            <CardTitle as="h2">{s.previewTitle}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            {previewPayload ? (
              <QrPreview
                payload={previewPayload}
                style={style}
                locale={locale}
                renderRevision={renderRevision}
                onStatus={handleRenderStatus}
                className="max-w-full"
              />
            ) : (
              <p className="flex h-40 items-center justify-center rounded-lg border border-dashed border-border px-4 text-center text-sm text-muted-foreground">
                {s.previewEmpty}
              </p>
            )}

            {capacityBlocked ? (
              <Alert variant="destructive" role="alert" data-testid="capacity-guidance">
                <AlertTitle>{s.capacity.title}</AlertTitle>
                <AlertDescription className="flex flex-col gap-1">
                  <p>{style.logoUrl ? s.capacity.withLogo : s.capacity.reduceContent}</p>
                  {canLowerEcc ? <p>{s.capacity.lowerEcc}</p> : null}
                </AlertDescription>
              </Alert>
            ) : null}

            {outputPayload && !blocked && !capacityBlocked ? (
              <TestScanDialog
                // A new input must not reuse an open dialog's previous QR
                // while its renderer loads. Invalid input unmounts it too.
                key={JSON.stringify([
                  renderRevision, outputPayload, style, print.guidance.minSymbolWidthMm,
                ])}
                payload={outputPayload}
                style={style}
                symbolWidthMm={print.guidance.minSymbolWidthMm}
                locale={locale}
                s={s}
              />
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <QualityPanel
              issues={issues}
              blocked={blocked}
              moduleCount={geometry.moduleCount}
              quietZoneModules={geometry.quietZoneModules}
              scanDistanceMm={scanDistanceMm}
              onScanDistanceChange={setScanDistanceMm}
              exportSizePx={pngSize}
              locale={locale}
              s={s}
            />
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <DownloadBar
              payload={outputPayload}
              style={style}
              blocked={blocked}
              capacityBlocked={capacityBlocked}
              renderRevision={renderRevision}
              onStatus={handleRenderStatus}
              pngSize={pngSize}
              onPngSizeChange={setPngSize}
              pdfSymbolWidthMm={print.guidance.minSymbolWidthMm}
              s={s}
            />
          </CardContent>
        </Card>

        {accountEnabled ? (
          <Card>
            <CardContent>
              <SaveQrCard
                blocked={blocked || capacityBlocked}
                locale={locale}
                payload={outputPayload}
                style={style}
              />
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
}

export default Generator;
