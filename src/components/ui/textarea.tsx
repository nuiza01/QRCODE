import type * as React from "react";

import { cn } from "@/lib/cn";

import { focusRing } from "./focus-ring";

export function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-20 w-full rounded-md border border-input bg-card px-3 py-2 text-sm text-foreground",
        "transition-[color,box-shadow,border-color] duration-150",
        "placeholder:text-muted-foreground",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "aria-invalid:border-destructive aria-invalid:outline-destructive",
        focusRing,
        className,
      )}
      {...props}
    />
  );
}
