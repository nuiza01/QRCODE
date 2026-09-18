"use client";

import * as LabelPrimitive from "@radix-ui/react-label";
import type * as React from "react";

import { cn } from "@/lib/cn";

/**
 * Always give a control a `<Label htmlFor>` — placeholder text is not a label,
 * and a control with only a placeholder is announced as unnamed.
 *
 * `optional` renders the hint instead of the more common "*" for required
 * fields: most fields in this product are required, so marking the exceptions
 * is both shorter and clearer than starring almost every row.
 */
export function Label({
  className,
  children,
  optionalText,
  ...props
}: React.ComponentProps<typeof LabelPrimitive.Root> & {
  /** Localised "(optional)" hint. Pass from the caller's own string bundle. */
  optionalText?: string;
}) {
  return (
    <LabelPrimitive.Root
      data-slot="label"
      className={cn(
        "flex items-center gap-1.5 text-sm leading-none font-medium text-foreground select-none",
        "group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50",
        "peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
        className,
      )}
      {...props}
    >
      {children}
      {optionalText ? (
        <span className="text-xs font-normal text-muted-foreground">
          {optionalText}
        </span>
      ) : null}
    </LabelPrimitive.Root>
  );
}
