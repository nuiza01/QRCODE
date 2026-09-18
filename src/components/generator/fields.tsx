"use client";

/**
 * Form-field building blocks.
 *
 * They exist so that every field in ten different forms wires up validation the
 * same way: a real `<Label htmlFor>`, `aria-invalid` when it is wrong, and
 * `aria-describedby` pointing at whichever of help text / error message is
 * actually on screen. Getting that wrong once per form is ten chances to ship a
 * field a screen reader announces as unnamed and valid while it is red.
 */
import { useId, type ReactNode } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/cn";

export interface FieldShellProps {
  id: string;
  label: string;
  optionalText?: string;
  help?: string;
  error?: string;
  className?: string;
  /** Receives the ids it must put on the control. */
  children: (aria: { id: string; describedBy?: string; invalid: boolean }) => ReactNode;
}

export function FieldShell({
  id,
  label,
  optionalText,
  help,
  error,
  className,
  children,
}: FieldShellProps) {
  const helpId = `${id}-help`;
  const errorId = `${id}-error`;
  // Both, when both are showing: the help text explains the field and the error
  // explains the failure, and a user who cannot see the field needs each.
  const describedBy =
    [help ? helpId : null, error ? errorId : null].filter(Boolean).join(" ") || undefined;

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Label htmlFor={id} optionalText={optionalText}>
        {label}
      </Label>
      {children({ id, describedBy, invalid: Boolean(error) })}
      {help ? (
        <p id={helpId} className="text-xs text-muted-foreground">
          {help}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="text-sm font-medium text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export interface TextFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  help?: string;
  error?: string;
  optionalText?: string;
  type?: "text" | "url" | "email" | "tel" | "number" | "date" | "datetime-local";
  inputMode?: "text" | "numeric" | "decimal" | "tel" | "email" | "url";
  multiline?: boolean;
  rows?: number;
  className?: string;
  step?: string;
}

export function TextField({
  label,
  value,
  onChange,
  onBlur,
  placeholder,
  help,
  error,
  optionalText,
  type = "text",
  inputMode,
  multiline,
  rows,
  className,
  step,
}: TextFieldProps) {
  const id = useId();

  return (
    <FieldShell
      id={id}
      label={label}
      optionalText={optionalText}
      help={help}
      error={error}
      className={className}
    >
      {({ id: controlId, describedBy, invalid }) =>
        multiline ? (
          <Textarea
            id={controlId}
            value={value}
            rows={rows}
            placeholder={placeholder || undefined}
            aria-describedby={describedBy}
            aria-invalid={invalid || undefined}
            onChange={(event) => onChange(event.target.value)}
            onBlur={onBlur}
          />
        ) : (
          <Input
            id={controlId}
            type={type}
            value={value}
            inputMode={inputMode}
            step={step}
            placeholder={placeholder || undefined}
            aria-describedby={describedBy}
            aria-invalid={invalid || undefined}
            onChange={(event) => onChange(event.target.value)}
            onBlur={onBlur}
          />
        )
      }
    </FieldShell>
  );
}

export interface SelectFieldOption<T extends string> {
  value: T;
  label: string;
}

export interface SelectFieldProps<T extends string> {
  label: string;
  value: T;
  options: readonly SelectFieldOption<T>[];
  onChange: (value: T) => void;
  help?: string;
  error?: string;
  disabled?: boolean;
  className?: string;
}

export function SelectField<T extends string>({
  label,
  value,
  options,
  onChange,
  help,
  error,
  disabled,
  className,
}: SelectFieldProps<T>) {
  const id = useId();

  return (
    <FieldShell id={id} label={label} help={help} error={error} className={className}>
      {({ id: controlId, describedBy, invalid }) => (
        <Select value={value} onValueChange={(next) => onChange(next as T)} disabled={disabled}>
          <SelectTrigger
            id={controlId}
            aria-describedby={describedBy}
            aria-invalid={invalid || undefined}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </FieldShell>
  );
}

export interface SwitchFieldProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  help?: string;
  className?: string;
}

export function SwitchField({ label, checked, onChange, help, className }: SwitchFieldProps) {
  const id = useId();
  const helpId = `${id}-help`;

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <div className="flex items-center justify-between gap-4">
        <Label htmlFor={id}>{label}</Label>
        <Switch
          id={id}
          checked={checked}
          aria-describedby={help ? helpId : undefined}
          onCheckedChange={onChange}
        />
      </div>
      {help ? (
        <p id={helpId} className="text-xs text-muted-foreground">
          {help}
        </p>
      ) : null}
    </div>
  );
}

/** Two-column row for fields that only make sense side by side (lat/lng, from/to). */
export function FieldRow({ children }: { children: ReactNode }) {
  return <div className="grid gap-4 sm:grid-cols-2">{children}</div>;
}
