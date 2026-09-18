import { cva, type VariantProps } from "class-variance-authority";
import { CircleAlert, CircleCheck, Info, TriangleAlert } from "lucide-react";
import type * as React from "react";

import { cn } from "@/lib/cn";

/**
 * Alert — the surface for `inspectStyle()` output.
 *
 * The generator produces `QualityIssue[]` with `level: "error" | "warning"`,
 * and blocking errors must be impossible to miss because the consequence of
 * ignoring one is a QR code that scans on the designer's monitor and fails on
 * a phone in a shop. Map `level` straight onto `variant`:
 *
 *   error   -> "destructive"
 *   warning -> "warning"
 *
 * `role` defaults to `"status"` (polite). The style editor re-runs
 * `inspectStyle()` on every keystroke, and `role="alert"` would make a screen
 * reader interrupt itself continuously while someone drags a colour picker.
 * Pass `role="alert"` for a one-shot failure, e.g. a rejected export.
 */
const alertVariants = cva(
  "relative grid w-full grid-cols-[auto_1fr] items-start gap-x-3 gap-y-1 rounded-lg border px-4 py-3 text-sm",
  {
    variants: {
      variant: {
        info: "border-border bg-muted text-foreground [&>svg]:text-muted-foreground",
        warning:
          "border-warning/35 bg-warning/10 text-foreground [&>svg]:text-warning",
        destructive:
          "border-destructive/40 bg-destructive/10 text-foreground [&>svg]:text-destructive",
        success:
          "border-success/35 bg-success/10 text-foreground [&>svg]:text-success",
      },
    },
    defaultVariants: { variant: "info" },
  },
);

const defaultIcons = {
  info: Info,
  warning: TriangleAlert,
  destructive: CircleAlert,
  success: CircleCheck,
} as const;

export interface AlertProps
  extends React.ComponentProps<"div">,
    VariantProps<typeof alertVariants> {
  /** Override the variant's icon, or pass `false` for no icon at all. */
  icon?: React.ReactNode | false;
}

export function Alert({
  className,
  variant = "info",
  icon,
  children,
  role = "status",
  ...props
}: AlertProps) {
  const DefaultIcon = defaultIcons[variant ?? "info"];
  return (
    <div
      data-slot="alert"
      role={role}
      className={cn(alertVariants({ variant }), className)}
      {...props}
    >
      {icon === false ? null : icon ? (
        // A caller-supplied node is decorative from the alert's point of view;
        // the text carries the meaning.
        <span aria-hidden="true" className="mt-0.5 flex size-4 items-center justify-center">
          {icon}
        </span>
      ) : (
        <DefaultIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      )}
      <div className="col-start-2 flex min-w-0 flex-col gap-1">{children}</div>
    </div>
  );
}

export function AlertTitle({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="alert-title"
      className={cn("font-medium tracking-tight", className)}
      {...props}
    />
  );
}

export function AlertDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-description"
      className={cn("text-sm text-muted-foreground [&_p]:leading-relaxed", className)}
      {...props}
    />
  );
}

export { alertVariants };
