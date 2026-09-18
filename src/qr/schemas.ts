/**
 * Zod schemas for every payload kind (zod v4).
 *
 * Shared by the client form and any server route, so a payload that reaches the
 * database has passed the same checks either way.
 *
 * **Messages are stable codes, not sentences.** A schema does not know who is
 * reading — the browser form has a locale, a Phase 2 bulk-CSV route does not —
 * so the rule says which check failed and `src/qr/messages.ts` decides how to
 * phrase it. Codes are dot-namespaced and part of this module's contract:
 * renaming one is a breaking change, rewording its Thai is not.
 */
import { z } from "zod";
import type { QrPayload, QrStyle } from "@/qr/types";
import { MAX_LOGO_SIZE_RATIO, MIN_QUIET_ZONE_MODULES } from "@/qr/quality";

/**
 * Only http(s) survives. `javascript:` and `data:` URLs in a QR code are a
 * phishing primitive, and they matter doubly once dynamic codes let someone
 * retarget a printed sign after the fact.
 */
export const safeUrlSchema = z
  .url({ error: "url.invalid" })
  .refine(
    (value) => {
      try {
        const protocol = new URL(value).protocol;
        return protocol === "http:" || protocol === "https:";
      } catch {
        return false;
      }
    },
    { message: "url.protocol" },
  );

export const urlPayloadSchema = z.object({
  type: z.literal("url"),
  url: safeUrlSchema,
});

export const textPayloadSchema = z.object({
  type: z.literal("text"),
  // Past ~1,200 characters the symbol gets too dense to scan from a phone.
  text: z.string().min(1, "text.required").max(1200, "text.tooLong"),
});

export const wifiPayloadSchema = z
  .object({
    type: z.literal("wifi"),
    ssid: z.string().min(1, "wifi.ssid.required").max(32, "common.tooLong"),
    password: z.string().max(63, "common.tooLong").optional(),
    encryption: z.enum(["WPA", "WEP", "nopass"]),
    hidden: z.boolean().optional(),
  })
  .refine((v) => v.encryption === "nopass" || Boolean(v.password), {
    message: "wifi.password.required",
    path: ["password"],
  });

export const vcardPayloadSchema = z.object({
  type: z.literal("vcard"),
  firstName: z
    .string()
    .min(1, "vcard.firstName.required")
    .max(64, "common.tooLong"),
  lastName: z.string().max(64, "common.tooLong").optional(),
  organization: z.string().max(128, "common.tooLong").optional(),
  title: z.string().max(128, "common.tooLong").optional(),
  phone: z.string().max(32, "common.tooLong").optional(),
  mobile: z.string().max(32, "common.tooLong").optional(),
  email: z.email("email.invalid").optional(),
  website: safeUrlSchema.optional(),
  street: z.string().max(128, "common.tooLong").optional(),
  city: z.string().max(64, "common.tooLong").optional(),
  state: z.string().max(64, "common.tooLong").optional(),
  postalCode: z.string().max(16, "common.tooLong").optional(),
  country: z.string().max(64, "common.tooLong").optional(),
  note: z.string().max(256, "common.tooLong").optional(),
});

export const emailPayloadSchema = z.object({
  type: z.literal("email"),
  to: z.email("email.invalid"),
  subject: z.string().max(200, "common.tooLong").optional(),
  body: z.string().max(800, "common.tooLong").optional(),
});

const phoneSchema = z
  .string()
  .min(3, "phone.invalid")
  .max(20, "common.tooLong")
  .regex(/^[+0-9\s()-]+$/, "phone.unsupportedCharacters");

export const smsPayloadSchema = z.object({
  type: z.literal("sms"),
  phone: phoneSchema,
  message: z.string().max(500, "common.tooLong").optional(),
});

export const telPayloadSchema = z.object({
  type: z.literal("tel"),
  phone: phoneSchema,
});

export const geoPayloadSchema = z.object({
  type: z.literal("geo"),
  latitude: z
    .number({ error: "geo.latitude.required" })
    .min(-90, "geo.latitude.range")
    .max(90, "geo.latitude.range"),
  longitude: z
    .number({ error: "geo.longitude.required" })
    .min(-180, "geo.longitude.range")
    .max(180, "geo.longitude.range"),
});

export const eventPayloadSchema = z
  .object({
    type: z.literal("event"),
    title: z.string().min(1, "event.title.required").max(200, "common.tooLong"),
    start: z.iso.datetime({ offset: true, error: "event.start.invalid" }),
    end: z.iso.datetime({ offset: true, error: "event.end.invalid" }).optional(),
    allDay: z.boolean().optional(),
    location: z.string().max(200, "common.tooLong").optional(),
    description: z.string().max(500, "common.tooLong").optional(),
  })
  .refine((v) => !v.end || new Date(v.end) >= new Date(v.start), {
    message: "event.end.beforeStart",
    path: ["end"],
  });

/**
 * Significant digit counts per PromptPay target kind.
 *
 * Mobile is a minimum rather than an exact count because the same number
 * reaches us as `0812345678`, `+66812345678` or `66812345678` — all carrying
 * the same nine significant digits, which is what
 * `normalizePromptPayTarget` keeps. National ID and e-wallet are fixed-width
 * identifiers with no such variation.
 */
const PROMPTPAY_MOBILE_MIN_DIGITS = 9;
const PROMPTPAY_NATIONAL_ID_DIGITS = 13;
const PROMPTPAY_EWALLET_DIGITS = 15;

export const promptPayPayloadSchema = z
  .object({
    type: z.literal("promptpay"),
    targetType: z.enum(["mobile", "nationalId", "ewallet"]),
    target: z
      .string()
      .min(9, "promptpay.target.required")
      .max(20, "common.tooLong"),
    // A negative or zero amount would silently produce a reusable code instead.
    amount: z
      .number()
      .positive("promptpay.amount.positive")
      .max(999_999.99, "promptpay.amount.tooLarge")
      .optional(),
  })
  /**
   * The digit rules belong here, not only in `normalizePromptPayTarget`.
   *
   * They used to live solely in the encoder, which meant a 10-digit national ID
   * passed validation and then threw at encode time — fine for the browser form,
   * which encodes as a safety net, and useless for a Phase 2 server route that
   * validates a bulk upload without ever rendering a symbol. A rule that only
   * exists in the encoder is a rule the API does not have.
   */
  .superRefine((value, ctx) => {
    const digits = value.target.replace(/\D/g, "");

    const failed =
      value.targetType === "mobile"
        ? digits.length < PROMPTPAY_MOBILE_MIN_DIGITS
        : value.targetType === "nationalId"
          ? digits.length !== PROMPTPAY_NATIONAL_ID_DIGITS
          : digits.length !== PROMPTPAY_EWALLET_DIGITS;

    if (failed) {
      ctx.addIssue({
        code: "custom",
        message: `promptpay.target.${value.targetType}`,
        path: ["target"],
      });
    }
  });

export const qrPayloadSchema: z.ZodType<QrPayload> = z.discriminatedUnion("type", [
  urlPayloadSchema,
  textPayloadSchema,
  wifiPayloadSchema,
  vcardPayloadSchema,
  emailPayloadSchema,
  smsPayloadSchema,
  telPayloadSchema,
  geoPayloadSchema,
  eventPayloadSchema,
  promptPayPayloadSchema,
]);

const hexColorSchema = z
  .string()
  .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, "style.color.hex");

export const qrStyleSchema: z.ZodType<QrStyle> = z.object({
  fgColor: hexColorSchema,
  bgColor: hexColorSchema,
  fgGradient: z
    .object({
      type: z.enum(["linear", "radial"]),
      rotation: z.number().optional(),
      from: hexColorSchema,
      to: hexColorSchema,
    })
    .optional(),
  dotStyle: z.enum([
    "square",
    "rounded",
    "dots",
    "classy",
    "classy-rounded",
    "extra-rounded",
  ]),
  cornerSquareStyle: z.enum(["square", "dot", "extra-rounded"]),
  cornerDotStyle: z.enum(["square", "dot"]),
  marginModules: z.number().int().min(MIN_QUIET_ZONE_MODULES).max(16),
  ecc: z.enum(["L", "M", "Q", "H"]),
  logoUrl: z.string().optional(),
  logoSizeRatio: z.number().positive().max(MAX_LOGO_SIZE_RATIO).optional(),
});
