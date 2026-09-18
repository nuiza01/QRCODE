"use client";

/**
 * The style editor.
 *
 * It edits the *raw* `QrStyle`, never the normalized one. That distinction is
 * the whole reason the "ECC forced to H" message can exist: `normalizeStyle`
 * overrides `ecc` while a logo is set, and if this editor wrote H back into
 * state, removing the logo would silently leave the user on H and the warning
 * from `inspectStyle` would never fire. So the control *displays* the effective
 * value and says why, while state keeps what the user actually chose.
 */
import { useId, useRef, useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { focusRing } from "@/components/ui/focus-ring";
import { cn } from "@/lib/cn";
import {
  MAX_LOGO_SIZE_RATIO,
  MIN_QUIET_ZONE_MODULES,
  normalizeStyle,
} from "@/qr/quality";
import type {
  CornerDotStyle,
  CornerSquareStyle,
  DotStyle,
  EccLevel,
  QrStyle,
} from "@/qr/types";

import { SelectField, SwitchField } from "./fields";
import type { GeneratorStrings } from "./strings";

/**
 * 512 KB of source image. The logo never leaves the browser, so the limit is
 * not about upload cost — it is about the data URL this turns into, which is
 * held in React state, re-read on every redraw and embedded in the PDF.
 */
export const MAX_LOGO_BYTES = 512 * 1024;

const DOT_STYLES: readonly DotStyle[] = [
  "square",
  "rounded",
  "dots",
  "classy",
  "classy-rounded",
  "extra-rounded",
];
const CORNER_SQUARE_STYLES: readonly CornerSquareStyle[] = ["square", "dot", "extra-rounded"];
const CORNER_DOT_STYLES: readonly CornerDotStyle[] = ["square", "dot"];
const ECC_LEVELS: readonly EccLevel[] = ["L", "M", "Q", "H"];

const MAX_QUIET_ZONE_MODULES = 16;
const MIN_LOGO_RATIO = 0.1;

export interface StyleEditorProps {
  style: QrStyle;
  s: GeneratorStrings;
  onChange: (patch: Partial<QrStyle>) => void;
  onReset: () => void;
  className?: string;
}

function SectionHeading({ children }: { children: ReactNode }) {
  return (
    <h3 className="text-sm font-semibold tracking-tight text-foreground">{children}</h3>
  );
}

/** A swatch and a hex box editing the same value; either one is enough. */
function ColorField({
  label,
  value,
  onChange,
  s,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  s: GeneratorStrings;
}) {
  const id = useId();
  const hexId = `${id}-hex`;

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex items-center gap-2">
        <input
          id={id}
          type="color"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={cn(
            "h-10 w-12 shrink-0 cursor-pointer rounded-md border border-input bg-card p-1",
            focusRing,
          )}
        />
        <Input
          id={hexId}
          value={value}
          aria-label={s.style.hexLabel(label)}
          spellCheck={false}
          className="font-mono"
          onChange={(event) => onChange(event.target.value)}
        />
      </div>
    </div>
  );
}

/** Slider plus a visible number, because a position is not a value. */
function SliderField({
  label,
  readout,
  value,
  min,
  max,
  step,
  onChange,
  help,
}: {
  label: string;
  readout: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  help?: string;
}) {
  const id = useId();
  const helpId = `${id}-help`;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-4">
        <Label htmlFor={id}>{label}</Label>
        <span className="font-mono text-xs text-muted-foreground">{readout}</span>
      </div>
      <Slider
        id={id}
        aria-label={label}
        aria-describedby={help ? helpId : undefined}
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={([next]) => onChange(next)}
      />
      {help ? (
        <p id={helpId} className="text-xs text-muted-foreground">
          {help}
        </p>
      ) : null}
    </div>
  );
}

export function StyleEditor({ style, s, onChange, onReset, className }: StyleEditorProps) {
  const effective = normalizeStyle(style);
  const hasLogo = Boolean(style.logoUrl);
  const [logoError, setLogoError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logoInputId = useId();
  const logoErrorId = `${logoInputId}-error`;

  /**
   * Reads the file straight into a data URL in the browser. There is no upload
   * endpoint anywhere in this product and there must not be one — "your data
   * never leaves your device" is a selling point, and a logo is data.
   */
  function handleLogoFile(file: File | undefined): void {
    setLogoError(null);
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setLogoError(s.style.logoNotAnImage);
      return;
    }
    if (file.size > MAX_LOGO_BYTES) {
      setLogoError(s.style.logoTooLarge(Math.round(MAX_LOGO_BYTES / 1024)));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        setLogoError(s.style.logoReadFailed);
        return;
      }
      onChange({
        logoUrl: result,
        logoSizeRatio: style.logoSizeRatio ?? MAX_LOGO_SIZE_RATIO,
      });
    };
    reader.onerror = () => setLogoError(s.style.logoReadFailed);
    reader.readAsDataURL(file);
  }

  function removeLogo(): void {
    setLogoError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    onChange({ logoUrl: undefined, logoSizeRatio: undefined });
  }

  const gradient = style.fgGradient;

  return (
    <div className={cn("flex flex-col gap-6", className)}>
      <section className="flex flex-col gap-4">
        <SectionHeading>{s.style.colorsGroup}</SectionHeading>
        <div className="grid gap-4 sm:grid-cols-2">
          <ColorField
            label={s.style.fgColor}
            value={style.fgColor}
            onChange={(fgColor) => onChange({ fgColor })}
            s={s}
          />
          <ColorField
            label={s.style.bgColor}
            value={style.bgColor}
            onChange={(bgColor) => onChange({ bgColor })}
            s={s}
          />
        </div>

        <SwitchField
          label={s.style.gradientToggle}
          checked={Boolean(gradient)}
          onChange={(on) =>
            onChange({
              fgGradient: on
                ? { type: "linear", rotation: 0, from: style.fgColor, to: style.fgColor }
                : undefined,
            })
          }
        />

        {gradient ? (
          <div className="flex flex-col gap-4 rounded-lg border border-border p-4">
            <SelectField<"linear" | "radial">
              label={s.style.gradientType}
              value={gradient.type}
              options={(["linear", "radial"] as const).map((value) => ({
                value,
                label: s.style.gradientTypeOption[value],
              }))}
              onChange={(type) => onChange({ fgGradient: { ...gradient, type } })}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <ColorField
                label={s.style.gradientFrom}
                value={gradient.from}
                onChange={(from) => onChange({ fgGradient: { ...gradient, from } })}
                s={s}
              />
              <ColorField
                label={s.style.gradientTo}
                value={gradient.to}
                onChange={(to) => onChange({ fgGradient: { ...gradient, to } })}
                s={s}
              />
            </div>
            {/* Degrees, per the QrStyle contract; the renderer converts to radians. */}
            <SliderField
              label={s.style.rotation}
              readout={s.style.rotationValue(gradient.rotation ?? 0)}
              value={gradient.rotation ?? 0}
              min={0}
              max={360}
              step={1}
              onChange={(rotation) => onChange({ fgGradient: { ...gradient, rotation } })}
            />
          </div>
        ) : null}
      </section>

      <section className="flex flex-col gap-4">
        <SectionHeading>{s.style.shapesGroup}</SectionHeading>
        <SelectField<DotStyle>
          label={s.style.dotStyle}
          value={style.dotStyle}
          options={DOT_STYLES.map((value) => ({
            value,
            label: s.style.dotStyleOption[value],
          }))}
          onChange={(dotStyle) => onChange({ dotStyle })}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField<CornerSquareStyle>
            label={s.style.cornerSquareStyle}
            value={style.cornerSquareStyle}
            options={CORNER_SQUARE_STYLES.map((value) => ({
              value,
              label: s.style.cornerSquareOption[value],
            }))}
            onChange={(cornerSquareStyle) => onChange({ cornerSquareStyle })}
          />
          <SelectField<CornerDotStyle>
            label={s.style.cornerDotStyle}
            value={style.cornerDotStyle}
            options={CORNER_DOT_STYLES.map((value) => ({
              value,
              label: s.style.cornerDotOption[value],
            }))}
            onChange={(cornerDotStyle) => onChange({ cornerDotStyle })}
          />
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <SectionHeading>{s.style.reliabilityGroup}</SectionHeading>
        {/*
          The slider cannot go below 4. `normalizeStyle` clamps it anyway, but a
          control that offers an illegal value and then quietly corrects it
          teaches the user that the number on screen is not the number used.
        */}
        <SliderField
          label={s.style.margin}
          readout={s.style.marginValue(style.marginModules)}
          value={style.marginModules}
          min={MIN_QUIET_ZONE_MODULES}
          max={MAX_QUIET_ZONE_MODULES}
          step={1}
          help={s.style.marginHelp}
          onChange={(marginModules) => onChange({ marginModules })}
        />

        <SelectField<EccLevel>
          label={s.style.ecc}
          // The effective level, not the stored one: with a logo set these differ,
          // and the one that matters is the one being rendered.
          value={effective.ecc}
          options={ECC_LEVELS.map((value) => ({
            value,
            label: s.style.eccOption[value],
          }))}
          disabled={hasLogo}
          help={hasLogo ? s.style.eccLockedByLogo : s.style.eccHelp}
          onChange={(ecc) => onChange({ ecc })}
        />
      </section>

      <section className="flex flex-col gap-4">
        <SectionHeading>{s.style.logoGroup}</SectionHeading>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={logoInputId}>{s.style.logoFile}</Label>
          <Input
            ref={fileInputRef}
            id={logoInputId}
            type="file"
            accept="image/*"
            aria-describedby={logoError ? logoErrorId : undefined}
            aria-invalid={logoError ? true : undefined}
            className="h-auto py-2"
            onChange={(event) => handleLogoFile(event.target.files?.[0])}
          />
          <p className="text-xs text-muted-foreground">{s.style.logoHelp}</p>
          <p className="text-xs text-muted-foreground">{s.style.logoPrivacy}</p>
          {logoError ? (
            <p id={logoErrorId} className="text-sm font-medium text-destructive">
              {logoError}
            </p>
          ) : null}
        </div>

        {style.logoUrl ? (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element -- a client-side
                  data: URL; next/image has nothing to optimise and cannot fetch it. */}
              <img
                src={style.logoUrl}
                alt={s.style.logoAlt}
                className="size-12 rounded-md border border-border object-contain"
              />
              <Button variant="outline" size="sm" onClick={removeLogo}>
                {s.style.logoRemove}
              </Button>
            </div>
            <SliderField
              label={s.style.logoSize}
              readout={s.style.logoSizeValue(
                Math.round((style.logoSizeRatio ?? MAX_LOGO_SIZE_RATIO) * 100),
              )}
              value={style.logoSizeRatio ?? MAX_LOGO_SIZE_RATIO}
              min={MIN_LOGO_RATIO}
              max={MAX_LOGO_SIZE_RATIO}
              step={0.01}
              onChange={(logoSizeRatio) => onChange({ logoSizeRatio })}
            />
          </div>
        ) : null}
      </section>

      <div>
        <Button variant="ghost" size="sm" onClick={onReset}>
          {s.style.reset}
        </Button>
      </div>
    </div>
  );
}
