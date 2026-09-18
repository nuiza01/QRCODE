"use client";

/**
 * "Test scan" — `PLAN.md` calls this the single highest-value support-ticket
 * reducer, and the reason is that a code which fails on paper fails on screen
 * first, at the size it will be printed. `TestScanCard` (RENDER) does the
 * sizing; this file only wires it to a dialog and to the live print guidance.
 */
import dynamic from "next/dynamic";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { Locale } from "@/i18n/config";
import type { QrPayload, QrStyle } from "@/qr/types";

import type { GeneratorStrings } from "./strings";

const TestScanCard = dynamic(
  () => import("@/qr/render").then((module) => module.TestScanCard),
  { loading: () => <div aria-hidden="true" className="h-80" /> },
);

export interface TestScanDialogProps {
  payload: QrPayload;
  style: QrStyle;
  /** Printed width of the symbol itself, from the live print-size guidance. */
  symbolWidthMm: number;
  locale: Locale;
  s: GeneratorStrings;
}

export function TestScanDialog({
  payload,
  style,
  symbolWidthMm,
  locale,
  s,
}: TestScanDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary">{s.testScan.open}</Button>
      </DialogTrigger>

      <DialogContent
        closeLabel={s.testScan.close}
        showCloseButton={false}
        // The card supplies the body copy, so there is no separate description
        // element to point at.
        aria-describedby={undefined}
        className="p-4"
      >
        <DialogTitle className="mb-4 text-center">{s.testScan.dialogTitle}</DialogTitle>

        <TestScanCard
          payload={payload}
          style={style}
          symbolWidthMm={symbolWidthMm}
          locale={locale}
          // The dialog title is the single visible/semantic heading for this
          // assembly. Keep the presentational card contract unchanged.
          className="test-scan-dialog-card border-0 p-0 [&>h2]:hidden"
          actions={
            <DialogClose asChild>
              <Button variant="outline">{s.testScan.close}</Button>
            </DialogClose>
          }
        />
      </DialogContent>
    </Dialog>
  );
}
