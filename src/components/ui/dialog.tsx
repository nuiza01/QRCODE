"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type * as React from "react";

import { cn } from "@/lib/cn";

import { focusRing } from "./focus-ring";

/**
 * Dialog — modal surface built on Radix, which supplies the parts that are
 * genuinely hard: focus trapping, focus restoration on close, `aria-modal`,
 * scroll locking, and Escape / outside-click dismissal.
 *
 * Two rules the type system cannot enforce:
 *
 * 1. **Every dialog needs a `DialogTitle`.** It is the accessible name; without
 *    one, screen readers announce an unnamed dialog and Radix logs a warning.
 *    When the content already renders its own visible heading, keep the title
 *    but mark it `className="sr-only"` rather than dropping it.
 * 2. **Either render a `DialogDescription` or pass `aria-describedby={undefined}`
 *    to `DialogContent`.** Radix otherwise warns about a missing description on
 *    every open.
 *
 * `closeLabel` is required on `DialogContent` because the corner close button
 * is an icon: its accessible name has to come from the caller's own string
 * bundle, the same way `Label` takes `optionalText`. There is no English
 * default here to accidentally ship to a Thai user.
 */
export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogPortal = DialogPrimitive.Portal;
export const DialogClose = DialogPrimitive.Close;

export function DialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      data-slot="dialog-overlay"
      // `bg-scrim`, not a tint of `--foreground`: a foreground-derived scrim
      // inverts to a white veil in dark mode, brightening the page instead of
      // dimming it. `--scrim` is dark in both themes and carries its own alpha.
      //
      // Fades via `fade-in` / `fade-out`, which are opacity-only — the
      // full-viewport edge-sliver problem that ruled out `pop-in` here is
      // exactly why those keyframes exist in globals.css.
      className={cn(
        "fixed inset-0 z-50 bg-scrim backdrop-blur-[2px]",
        "data-[state=open]:animate-fade-in data-[state=closed]:animate-fade-out",
        className,
      )}
      {...props}
    />
  );
}

export interface DialogContentProps
  extends React.ComponentProps<typeof DialogPrimitive.Content> {
  /** Localised accessible name for the corner close button. */
  closeLabel: string;
  /** Drop the corner button when the content provides its own close affordance. */
  showCloseButton?: boolean;
}

export function DialogContent({
  className,
  children,
  closeLabel,
  showCloseButton = true,
  ...props
}: DialogContentProps) {
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        data-slot="dialog-content"
        className={cn(
          "fixed top-1/2 left-1/2 z-50 -translate-x-1/2 -translate-y-1/2",
          "w-[min(32rem,calc(100vw-2rem))] max-h-[calc(100dvh-2rem)] overflow-y-auto",
          "rounded-xl border border-border bg-card p-6 text-card-foreground shadow-lg outline-none",
          // Safe to scale here: Tailwind v4 emits the `translate` property for
          // the centering utilities above, so `pop-in`'s `transform: scale()`
          // composes with them instead of replacing them.
          "data-[state=open]:animate-pop-in data-[state=closed]:animate-pop-out",
          className,
        )}
        {...props}
      >
        {children}
        {showCloseButton ? (
          <DialogPrimitive.Close
            data-slot="dialog-close"
            className={cn(
              "absolute top-3 right-3 rounded-md p-1.5 text-muted-foreground",
              "transition-colors hover:bg-accent hover:text-accent-foreground",
              "disabled:pointer-events-none",
              focusRing,
            )}
          >
            <X aria-hidden="true" className="size-4" />
            <span className="sr-only">{closeLabel}</span>
          </DialogPrimitive.Close>
        ) : null}
      </DialogPrimitive.Content>
    </DialogPortal>
  );
}

export function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-header"
      className={cn("flex flex-col gap-1.5 pr-8", className)}
      {...props}
    />
  );
}

export function DialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn("flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", className)}
      {...props}
    />
  );
}

export function DialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn("text-base leading-snug font-semibold", className)}
      {...props}
    />
  );
}

export function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  );
}
