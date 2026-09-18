import type * as React from "react";

import { cn } from "@/lib/cn";

import { focusRing } from "./focus-ring";

/**
 * Text input.
 *
 * `aria-invalid` is the wiring point for validation: set it (plus
 * `aria-describedby` pointing at the message element) and the field turns red
 * without any extra class juggling at the call site.
 */
export function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      data-slot="input"
      type={type}
      className={cn(
        "flex h-10 w-full min-w-0 rounded-md border border-input bg-card px-3 py-2 text-sm text-foreground",
        "transition-[color,box-shadow,border-color] duration-150",
        "placeholder:text-muted-foreground",
        "file:mr-3 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "aria-invalid:border-destructive aria-invalid:outline-destructive",
        focusRing,
        className,
      )}
      {...props}
    />
  );
}
