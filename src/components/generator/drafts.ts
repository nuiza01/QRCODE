/**
 * Form-shaped mirrors of the payload types.
 *
 * Every field here is a string or a boolean, because that is what an `<input>`
 * actually holds. The payload types in `src/qr/types.ts` have numbers, optional
 * fields and an ISO datetime — none of which survive a half-typed keystroke.
 * Keeping the two apart is what lets the form stay editable ("-", "12.", "")
 * while the preview only ever sees a payload that passed the zod schemas.
 *
 * One draft per content type is kept alive at once, so switching from WiFi to
 * vCard and back does not throw away what was typed.
 */
import type { PromptPayTargetType, QrContentType, WifiEncryption } from "@/qr/types";

export const CONTENT_TYPES = [
  "url",
  "text",
  "wifi",
  "vcard",
  "email",
  "sms",
  "tel",
  "geo",
  "event",
  "promptpay",
] as const satisfies readonly QrContentType[];

export interface UrlDraft {
  url: string;
}

export interface TextDraft {
  text: string;
}

export interface WifiDraft {
  ssid: string;
  password: string;
  encryption: WifiEncryption;
  hidden: boolean;
}

export interface VCardDraft {
  firstName: string;
  lastName: string;
  organization: string;
  title: string;
  phone: string;
  mobile: string;
  email: string;
  website: string;
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  note: string;
}

export interface EmailDraft {
  to: string;
  subject: string;
  body: string;
}

export interface SmsDraft {
  phone: string;
  message: string;
}

export interface TelDraft {
  phone: string;
}

export interface GeoDraft {
  latitude: string;
  longitude: string;
}

export interface EventDraft {
  title: string;
  /** Value of a `datetime-local` (or `date` when all-day) input — no offset. */
  start: string;
  end: string;
  allDay: boolean;
  location: string;
  description: string;
}

export interface PromptPayDraft {
  targetType: PromptPayTargetType;
  target: string;
  /**
   * Separate from `amount` on purpose. "Blank" and "off" mean the same thing to
   * the encoder but not to the user: the toggle is where we get to say out loud
   * that a fixed amount makes the code single-use.
   */
  withAmount: boolean;
  amount: string;
}

export interface DraftMap {
  url: UrlDraft;
  text: TextDraft;
  wifi: WifiDraft;
  vcard: VCardDraft;
  email: EmailDraft;
  sms: SmsDraft;
  tel: TelDraft;
  geo: GeoDraft;
  event: EventDraft;
  promptpay: PromptPayDraft;
}

export type DraftFor<T extends QrContentType> = DraftMap[T];

/** Every field starts empty; nothing is prefilled with a URL nobody asked for. */
export function emptyDrafts(): DraftMap {
  return {
    url: { url: "" },
    text: { text: "" },
    wifi: { ssid: "", password: "", encryption: "WPA", hidden: false },
    vcard: {
      firstName: "",
      lastName: "",
      organization: "",
      title: "",
      phone: "",
      mobile: "",
      email: "",
      website: "",
      street: "",
      city: "",
      state: "",
      postalCode: "",
      country: "",
      note: "",
    },
    email: { to: "", subject: "", body: "" },
    sms: { phone: "", message: "" },
    tel: { phone: "" },
    geo: { latitude: "", longitude: "" },
    event: { title: "", start: "", end: "", allDay: false, location: "", description: "" },
    promptpay: { targetType: "mobile", target: "", withAmount: false, amount: "" },
  };
}
