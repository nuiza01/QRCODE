"use client";

import * as SliderPrimitive from "@radix-ui/react-slider";
import * as React from "react";

import { cn } from "@/lib/cn";

import { focusRing } from "./focus-ring";

/**
 * Slider. Renders one thumb per value, so range sliders work without a
 * separate component.
 *
 * A slider on its own is unlabelled; pass `aria-label` (or `aria-labelledby`).
 * For the style editor's numeric settings (quiet zone, logo size) also pair it
 * with a visible numeric readout — a slider that only shows its value as a
 * position is unusable for anyone who needs an exact number, and the quality
 * rules in `src/qr/quality.ts` are expressed in exact numbers.
 */
export function Slider({
  className,
  defaultValue,
  value,
  min = 0,
  max = 100,
  ...props
}: React.ComponentProps<typeof SliderPrimitive.Root>) {
  const thumbCount = React.useMemo(() => {
    if (Array.isArray(value)) return value.length;
    if (Array.isArray(defaultValue)) return defaultValue.length;
    return 1;
  }, [value, defaultValue]);

  return (
    <SliderPrimitive.Root
      data-slot="slider"
      defaultValue={defaultValue}
      value={value}
      min={min}
      max={max}
      className={cn(
        "relative flex w-full touch-none items-center select-none",
        "data-[orientation=vertical]:h-44 data-[orientation=vertical]:w-auto data-[orientation=vertical]:flex-col",
        "data-[disabled]:opacity-50",
        className,
      )}
      {...props}
    >
      <SliderPrimitive.Track
        data-slot="slider-track"
        className={cn(
          "relative grow overflow-hidden rounded-full bg-muted",
          "data-[orientation=horizontal]:h-1.5 data-[orientation=horizontal]:w-full",
          "data-[orientation=vertical]:h-full data-[orientation=vertical]:w-1.5",
        )}
      >
        <SliderPrimitive.Range
          data-slot="slider-range"
          className="absolute bg-primary data-[orientation=horizontal]:h-full data-[orientation=vertical]:w-full"
        />
      </SliderPrimitive.Track>
      {Array.from({ length: thumbCount }, (_, index) => (
        <SliderPrimitive.Thumb
          key={index}
          data-slot="slider-thumb"
          className={cn(
            "block size-5 shrink-0 rounded-full border-2 border-primary bg-card shadow-sm",
            "transition-[box-shadow] hover:shadow-md",
            "disabled:pointer-events-none",
            focusRing,
          )}
        />
      ))}
    </SliderPrimitive.Root>
  );
}
