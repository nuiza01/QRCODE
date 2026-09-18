"use client";

/**
 * The ten content forms.
 *
 * Every field is controlled and every error string comes from `validateDraft`,
 * which means from the zod schemas — nothing here decides what "valid" is.
 */
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import type {
  PromptPayTargetType,
  QrContentType,
  WifiEncryption,
} from "@/qr/types";

import type { DraftMap } from "./drafts";
import { FieldRow, SelectField, SwitchField, TextField } from "./fields";
import { FORM_ERROR_KEY, type FieldErrors } from "./payload";
import type { GeneratorStrings } from "./strings";

export interface PayloadFormProps {
  type: QrContentType;
  drafts: DraftMap;
  /** Already filtered to fields the user has touched. */
  errors: FieldErrors;
  s: GeneratorStrings;
  onChange: <T extends QrContentType>(type: T, patch: Partial<DraftMap[T]>) => void;
  onTouch: (field: string) => void;
}

/**
 * Switching the all-day toggle changes which input renders, and the two speak
 * different value formats. Reshaping the string here means the date the user
 * already picked survives the toggle instead of silently emptying the field.
 */
function reshapeDateValue(value: string, allDay: boolean): string {
  if (!value) return value;
  if (allDay) return value.slice(0, 10);
  return value.length === 10 ? `${value}T09:00` : value;
}

export function PayloadForm({
  type,
  drafts,
  errors,
  s,
  onChange,
  onTouch,
}: PayloadFormProps) {
  const formError = errors[FORM_ERROR_KEY];

  const formLevelAlert = formError ? (
    <Alert variant="destructive" role="presentation">
      <AlertDescription>{formError}</AlertDescription>
    </Alert>
  ) : null;

  const body = (() => {
    switch (type) {
      case "url": {
        const draft = drafts[type];
        const copy = s.fields.url;
        return (
          <TextField
            label={copy.url.label}
            placeholder={copy.url.placeholder}
            help={copy.url.help}
            error={errors.url}
            value={draft.url}
            type="url"
            inputMode="url"
            onChange={(url) => onChange(type, { url })}
            onBlur={() => onTouch("url")}
          />
        );
      }

      case "text": {
        const draft = drafts[type];
        const copy = s.fields.text;
        return (
          <TextField
            label={copy.text.label}
            placeholder={copy.text.placeholder}
            help={copy.text.help}
            error={errors.text}
            value={draft.text}
            multiline
            rows={4}
            onChange={(text) => onChange(type, { text })}
            onBlur={() => onTouch("text")}
          />
        );
      }

      case "wifi": {
        const draft = drafts[type];
        const copy = s.fields.wifi;
        return (
          <>
            <TextField
              label={copy.ssid.label}
              placeholder={copy.ssid.placeholder}
              error={errors.ssid}
              value={draft.ssid}
              onChange={(ssid) => onChange(type, { ssid })}
              onBlur={() => onTouch("ssid")}
            />
            <SelectField<WifiEncryption>
              label={copy.encryption.label}
              value={draft.encryption}
              options={(["WPA", "WEP", "nopass"] as const).map((value) => ({
                value,
                label: s.wifiEncryption[value],
              }))}
              onChange={(encryption) => onChange(type, { encryption })}
            />
            {draft.encryption !== "nopass" ? (
              <TextField
                label={copy.password.label}
                placeholder={copy.password.placeholder}
                error={errors.password}
                value={draft.password}
                onChange={(password) => onChange(type, { password })}
                onBlur={() => onTouch("password")}
              />
            ) : null}
            <SwitchField
              label={copy.hidden.label}
              help={copy.hidden.help}
              checked={draft.hidden}
              onChange={(hidden) => onChange(type, { hidden })}
            />
          </>
        );
      }

      case "vcard": {
        const draft = drafts[type];
        const copy = s.fields.vcard;
        const optionalField = (
          field: Exclude<keyof DraftMap["vcard"], "firstName">,
        ) => (
          <TextField
            key={field}
            label={copy[field].label}
            placeholder={copy[field].placeholder}
            optionalText={s.optional}
            error={errors[field]}
            value={draft[field]}
            type={field === "email" ? "email" : field === "website" ? "url" : "text"}
            inputMode={
              field === "phone" || field === "mobile"
                ? "tel"
                : field === "email"
                  ? "email"
                  : undefined
            }
            onChange={(value) =>
              onChange(type, { [field]: value } as Partial<DraftMap["vcard"]>)
            }
            onBlur={() => onTouch(field)}
          />
        );

        return (
          <>
            <FieldRow>
              <TextField
                label={copy.firstName.label}
                placeholder={copy.firstName.placeholder}
                error={errors.firstName}
                value={draft.firstName}
                onChange={(firstName) => onChange(type, { firstName })}
                onBlur={() => onTouch("firstName")}
              />
              {optionalField("lastName")}
            </FieldRow>
            <FieldRow>
              {optionalField("organization")}
              {optionalField("title")}
            </FieldRow>
            <FieldRow>
              {optionalField("mobile")}
              {optionalField("phone")}
            </FieldRow>
            <FieldRow>
              {optionalField("email")}
              {optionalField("website")}
            </FieldRow>
            {optionalField("street")}
            <FieldRow>
              {optionalField("city")}
              {optionalField("state")}
            </FieldRow>
            <FieldRow>
              {optionalField("postalCode")}
              {optionalField("country")}
            </FieldRow>
            {optionalField("note")}
          </>
        );
      }

      case "email": {
        const draft = drafts[type];
        const copy = s.fields.email;
        return (
          <>
            <TextField
              label={copy.to.label}
              placeholder={copy.to.placeholder}
              error={errors.to}
              value={draft.to}
              type="email"
              inputMode="email"
              onChange={(to) => onChange(type, { to })}
              onBlur={() => onTouch("to")}
            />
            <TextField
              label={copy.subject.label}
              placeholder={copy.subject.placeholder}
              optionalText={s.optional}
              error={errors.subject}
              value={draft.subject}
              onChange={(subject) => onChange(type, { subject })}
              onBlur={() => onTouch("subject")}
            />
            <TextField
              label={copy.body.label}
              placeholder={copy.body.placeholder}
              optionalText={s.optional}
              error={errors.body}
              value={draft.body}
              multiline
              rows={3}
              onChange={(body) => onChange(type, { body })}
              onBlur={() => onTouch("body")}
            />
          </>
        );
      }

      case "sms": {
        const draft = drafts[type];
        const copy = s.fields.sms;
        return (
          <>
            <TextField
              label={copy.phone.label}
              placeholder={copy.phone.placeholder}
              error={errors.phone}
              value={draft.phone}
              type="tel"
              inputMode="tel"
              onChange={(phone) => onChange(type, { phone })}
              onBlur={() => onTouch("phone")}
            />
            <TextField
              label={copy.message.label}
              placeholder={copy.message.placeholder}
              optionalText={s.optional}
              error={errors.message}
              value={draft.message}
              multiline
              rows={3}
              onChange={(message) => onChange(type, { message })}
              onBlur={() => onTouch("message")}
            />
          </>
        );
      }

      case "tel": {
        const draft = drafts[type];
        const copy = s.fields.tel;
        return (
          <TextField
            label={copy.phone.label}
            placeholder={copy.phone.placeholder}
            help={copy.phone.help}
            error={errors.phone}
            value={draft.phone}
            type="tel"
            inputMode="tel"
            onChange={(phone) => onChange(type, { phone })}
            onBlur={() => onTouch("phone")}
          />
        );
      }

      case "geo": {
        const draft = drafts[type];
        const copy = s.fields.geo;
        return (
          <>
            <FieldRow>
              <TextField
                label={copy.latitude.label}
                placeholder={copy.latitude.placeholder}
                error={errors.latitude}
                value={draft.latitude}
                inputMode="decimal"
                onChange={(latitude) => onChange(type, { latitude })}
                onBlur={() => onTouch("latitude")}
              />
              <TextField
                label={copy.longitude.label}
                placeholder={copy.longitude.placeholder}
                error={errors.longitude}
                value={draft.longitude}
                inputMode="decimal"
                onChange={(longitude) => onChange(type, { longitude })}
                onBlur={() => onTouch("longitude")}
              />
            </FieldRow>
            <p className="text-xs text-muted-foreground">{copy.help}</p>
          </>
        );
      }

      case "event": {
        const draft = drafts[type];
        const copy = s.fields.event;
        return (
          <>
            <TextField
              label={copy.title.label}
              placeholder={copy.title.placeholder}
              error={errors.title}
              value={draft.title}
              onChange={(title) => onChange(type, { title })}
              onBlur={() => onTouch("title")}
            />
            <SwitchField
              label={copy.allDay.label}
              checked={draft.allDay}
              onChange={(allDay) =>
                onChange(type, {
                  allDay,
                  start: reshapeDateValue(draft.start, allDay),
                  end: reshapeDateValue(draft.end, allDay),
                })
              }
            />
            <FieldRow>
              <TextField
                label={copy.start.label}
                error={errors.start}
                value={draft.start}
                type={draft.allDay ? "date" : "datetime-local"}
                onChange={(start) => onChange(type, { start })}
                onBlur={() => onTouch("start")}
              />
              <TextField
                label={copy.end.label}
                optionalText={s.optional}
                error={errors.end}
                value={draft.end}
                type={draft.allDay ? "date" : "datetime-local"}
                onChange={(end) => onChange(type, { end })}
                onBlur={() => onTouch("end")}
              />
            </FieldRow>
            <TextField
              label={copy.location.label}
              placeholder={copy.location.placeholder}
              optionalText={s.optional}
              error={errors.location}
              value={draft.location}
              onChange={(location) => onChange(type, { location })}
              onBlur={() => onTouch("location")}
            />
            <TextField
              label={copy.description.label}
              placeholder={copy.description.placeholder}
              optionalText={s.optional}
              error={errors.description}
              value={draft.description}
              multiline
              rows={3}
              onChange={(description) => onChange(type, { description })}
              onBlur={() => onTouch("description")}
            />
          </>
        );
      }

      case "promptpay": {
        const draft = drafts[type];
        const copy = s.fields.promptpay;
        const targetCopy = copy.target[draft.targetType];
        const messaging = draft.withAmount ? copy.singleUse : copy.reusable;

        return (
          <>
            <fieldset className="flex flex-col gap-3">
              <legend className="mb-2 text-sm leading-none font-medium text-foreground">
                {copy.targetType.label}
              </legend>
              <RadioGroup
                value={draft.targetType}
                aria-label={copy.targetType.label}
                className="grid gap-2 sm:grid-cols-3"
                onValueChange={(value) =>
                  onChange(type, { targetType: value as PromptPayTargetType })
                }
              >
                {(["mobile", "nationalId", "ewallet"] as const).map((value) => (
                  <div
                    key={value}
                    className="flex items-center gap-2 rounded-md border border-border px-3 py-2"
                  >
                    <RadioGroupItem value={value} id={`promptpay-target-${value}`} />
                    <Label htmlFor={`promptpay-target-${value}`} className="font-normal">
                      {s.promptPayTarget[value]}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </fieldset>

            {/*
              A payload-privacy warning, not a scannability one, so it is not a
              `QualityIssue` and never goes near `inspectStyle()`. It also does
              not block anything: invoicing a business counterparty from a
              national ID is perfectly legitimate. It shows on *selecting* the
              target type, before an ID has been typed, because that is while
              the choice is still cheap to change.
            */}
            {draft.targetType === "nationalId" ? (
              <Alert variant="warning" role="presentation">
                <AlertTitle>{copy.nationalIdPrivacy.title}</AlertTitle>
                <AlertDescription>{copy.nationalIdPrivacy.body}</AlertDescription>
              </Alert>
            ) : null}

            <TextField
              label={targetCopy.label}
              placeholder={targetCopy.placeholder}
              help={targetCopy.help}
              error={errors.target}
              value={draft.target}
              inputMode="numeric"
              onChange={(target) => onChange(type, { target })}
              onBlur={() => onTouch("target")}
            />

            <SwitchField
              label={copy.withAmount.label}
              checked={draft.withAmount}
              onChange={(withAmount) => onChange(type, { withAmount })}
            />

            {draft.withAmount ? (
              <TextField
                label={copy.amount.label}
                placeholder={copy.amount.placeholder}
                error={errors.amount}
                value={draft.amount}
                inputMode="decimal"
                step="0.01"
                onChange={(amount) => onChange(type, { amount })}
                onBlur={() => onTouch("amount")}
              />
            ) : null}

            {/*
              The single most misunderstood thing about a PromptPay code, and it
              is invisible in the symbol: tag 01 flips from "11" (reusable) to
              "12" (single use) the moment an amount is present.
            */}
            <Alert variant={draft.withAmount ? "warning" : "info"} role="presentation">
              <AlertTitle>{messaging.title}</AlertTitle>
              <AlertDescription>{messaging.body}</AlertDescription>
            </Alert>
          </>
        );
      }
    }
  })();

  return (
    <div className="flex flex-col gap-4">
      {body}
      {formLevelAlert}
    </div>
  );
}
