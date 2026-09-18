/**
 * Draft -> payload -> validation.
 *
 * The rules live in `src/qr/schemas.ts` and nowhere else. What happens here is
 * only the two things a zod schema cannot do for a form:
 *
 *  1. **Coercion.** An `<input>` gives back a string. "12.5" has to become a
 *     number and "" has to become `undefined` (not "", which `z.email()`
 *     rejects with a message about email addresses rather than about a field
 *     the user has not filled in yet).
 *  2. **Encodability.** Passing the schema is necessary but not sufficient.
 *     The schemas now carry the PromptPay digit rules themselves, so the common
 *     case is caught with a proper field path — but `encodePayload` can still
 *     throw (a date that parses as ISO yet not as a `Date`, say), and a throw
 *     inside a render would blank the preview instead of explaining itself.
 *     Running it here keeps that a form error. Belt and braces.
 *
 * Localization: the schemas emit stable codes, so anything coming back from zod
 * goes through `localizeQrIssue`. The only sentences written in this file are
 * the two coercion messages, which are about a value an `<input>` produced
 * rather than about a domain rule.
 */
import { defaultLocale, type Locale } from "@/i18n/config";
import { localizeQrIssue, resolveQrMessage } from "@/qr/messages";
import { encodePayload } from "@/qr/payload/encode";
import { qrPayloadSchema } from "@/qr/schemas";
import type { QrContentType, QrPayload } from "@/qr/types";
import type { DraftMap } from "./drafts";

/** Key used for an error that belongs to the form as a whole, not one field. */
export const FORM_ERROR_KEY = "_form";

export type FieldErrors = Record<string, string>;

export interface ValidationResult {
  payload: QrPayload | null;
  errors: FieldErrors;
}

/** The two coercion messages this module needs, already localized by the caller. */
export interface CoercionCopy {
  notANumber: string;
  invalidDateTime: string;
}

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

/**
 * Attaches the user's UTC offset to a `datetime-local` / `date` input value.
 *
 * `eventPayloadSchema` wants `z.iso.datetime({ offset: true })`, and a
 * `datetime-local` input hands back `2026-08-19T14:30` — a wall-clock reading
 * with no zone at all. Appending "Z" would be a lie (it would move a Bangkok
 * appointment back seven hours); calling `toISOString()` would be the same lie
 * with extra steps.
 *
 * The offset is read from a `Date` built out of the *typed* components rather
 * than from `new Date()`, so an event booked across a DST boundary gets the
 * offset in force on that day rather than the one in force today. Thailand has
 * no DST, but the English locale of this product is not only for Thailand.
 *
 * All-day values keep midnight local. `formatIcsDate` reads the calendar date
 * straight off the string for all-day events precisely so that a Bangkok
 * midnight does not get normalized back to the previous day in UTC — this
 * function's job is to hand it a string whose leading `YYYY-MM-DD` is the date
 * the user picked.
 */
export function toIsoWithOffset(value: string, allDay: boolean): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const match = allDay
    ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed)
    : /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(trimmed);
  if (!match) return null;

  const [, year, month, day, hour = "00", minute = "00", second = "00"] = match;
  const local = new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    Number(second),
  );
  if (Number.isNaN(local.getTime())) return null;

  // getTimezoneOffset() is minutes *behind* UTC, so a Bangkok winter afternoon
  // reports -420 and the ISO offset it needs is "+07:00".
  const offsetMinutes = -local.getTimezoneOffset();
  const sign = offsetMinutes < 0 ? "-" : "+";
  const absolute = Math.abs(offsetMinutes);

  return `${year}-${month}-${day}T${hour}:${minute}:${second}${sign}${pad2(
    Math.floor(absolute / 60),
  )}:${pad2(absolute % 60)}`;
}

/** Empty string means "not filled in", which is `undefined` to a zod schema. */
function optional(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}

interface Candidate {
  value: unknown;
  errors: FieldErrors;
}

function buildCandidate<T extends QrContentType>(
  type: T,
  draft: DraftMap[T],
  copy: CoercionCopy,
): Candidate {
  const errors: FieldErrors = {};

  /** Parses a numeric field, recording a localized message instead of a NaN. */
  const num = (field: string, raw: string): number | undefined => {
    const trimmed = raw.trim();
    if (trimmed === "") {
      // Leave it undefined and let the schema decide whether it was required.
      return undefined;
    }
    const parsed = Number(trimmed);
    if (!Number.isFinite(parsed)) {
      errors[field] = copy.notANumber;
      return undefined;
    }
    return parsed;
  };

  switch (type) {
    case "url": {
      const d = draft as DraftMap["url"];
      return { value: { type, url: d.url.trim() }, errors };
    }
    case "text": {
      const d = draft as DraftMap["text"];
      return { value: { type, text: d.text }, errors };
    }
    case "wifi": {
      const d = draft as DraftMap["wifi"];
      return {
        value: {
          type,
          ssid: d.ssid,
          // Trim only to detect blank input; never change a nonblank credential.
          password:
            d.encryption === "nopass" || d.password.trim() === ""
              ? undefined
              : d.password,
          encryption: d.encryption,
          hidden: d.hidden,
        },
        errors,
      };
    }
    case "vcard": {
      const d = draft as DraftMap["vcard"];
      return {
        value: {
          type,
          firstName: d.firstName.trim(),
          lastName: optional(d.lastName),
          organization: optional(d.organization),
          title: optional(d.title),
          phone: optional(d.phone),
          mobile: optional(d.mobile),
          email: optional(d.email),
          website: optional(d.website),
          street: optional(d.street),
          city: optional(d.city),
          state: optional(d.state),
          postalCode: optional(d.postalCode),
          country: optional(d.country),
          note: optional(d.note),
        },
        errors,
      };
    }
    case "email": {
      const d = draft as DraftMap["email"];
      return {
        value: {
          type,
          to: d.to.trim(),
          subject: optional(d.subject),
          body: optional(d.body),
        },
        errors,
      };
    }
    case "sms": {
      const d = draft as DraftMap["sms"];
      return {
        value: { type, phone: d.phone.trim(), message: optional(d.message) },
        errors,
      };
    }
    case "tel": {
      const d = draft as DraftMap["tel"];
      return { value: { type, phone: d.phone.trim() }, errors };
    }
    case "geo": {
      const d = draft as DraftMap["geo"];
      const latitude = num("latitude", d.latitude);
      const longitude = num("longitude", d.longitude);
      return { value: { type, latitude, longitude }, errors };
    }
    case "event": {
      const d = draft as DraftMap["event"];
      const start = toIsoWithOffset(d.start, d.allDay);
      const end = toIsoWithOffset(d.end, d.allDay);
      if (d.start.trim() !== "" && start === null) errors.start = copy.invalidDateTime;
      if (d.end.trim() !== "" && end === null) errors.end = copy.invalidDateTime;
      return {
        value: {
          type,
          title: d.title.trim(),
          start: start ?? undefined,
          end: end ?? undefined,
          allDay: d.allDay,
          location: optional(d.location),
          description: optional(d.description),
        },
        errors,
      };
    }
    case "promptpay": {
      const d = draft as DraftMap["promptpay"];
      const amount = d.withAmount ? num("amount", d.amount) : undefined;
      return {
        value: {
          type,
          targetType: d.targetType,
          target: d.target.replace(/\s/g, ""),
          amount,
        },
        errors,
      };
    }
    default: {
      // Exhaustive: every QrContentType is handled above.
      return { value: { type }, errors };
    }
  }
}

/**
 * The single entry point the form uses. Returns a payload only when it passed
 * the schema *and* encodes, so the caller can hand it straight to the renderer.
 */
export function validateDraft<T extends QrContentType>(
  type: T,
  draft: DraftMap[T],
  copy: CoercionCopy,
  locale: Locale = defaultLocale,
): ValidationResult {
  const candidate = buildCandidate(type, draft, copy);
  if (Object.keys(candidate.errors).length > 0) {
    return { payload: null, errors: candidate.errors };
  }

  const parsed = qrPayloadSchema.safeParse(candidate.value);
  if (!parsed.success) {
    const errors: FieldErrors = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.length > 0 ? String(issue.path[0]) : FORM_ERROR_KEY;
      // The schema emits a stable code; `localizeQrIssue` turns it into the
      // reader's language and falls back to the raw code if it is unmapped.
      // First message per field wins: a field with three failing rules should
      // show the first thing to fix, not a stack of them.
      errors[key] ??= localizeQrIssue(issue, locale);
    }
    return { payload: null, errors };
  }

  try {
    encodePayload(parsed.data);
  } catch (error) {
    return {
      payload: null,
      errors: {
        // `PromptPayError.message` is a message *code*, not a sentence. Anything
        // unmapped falls through as itself rather than rendering a blank field.
        [FORM_ERROR_KEY]: resolveQrMessage(
          error instanceof Error ? error.message : String(error),
          locale,
        ),
      },
    };
  }

  return { payload: parsed.data, errors: {} };
}
