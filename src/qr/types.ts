/** Content kinds the generator can encode. Mirrors the `qr_content_type` enum. */
export type QrContentType =
  | "url"
  | "text"
  | "wifi"
  | "vcard"
  | "email"
  | "sms"
  | "tel"
  | "geo"
  | "event"
  | "promptpay";

export type WifiEncryption = "WPA" | "WEP" | "nopass";

export interface UrlPayload {
  type: "url";
  url: string;
}

export interface TextPayload {
  type: "text";
  text: string;
}

export interface WifiPayload {
  type: "wifi";
  ssid: string;
  password?: string;
  encryption: WifiEncryption;
  hidden?: boolean;
}

export interface VCardPayload {
  type: "vcard";
  firstName: string;
  lastName?: string;
  organization?: string;
  title?: string;
  phone?: string;
  mobile?: string;
  email?: string;
  website?: string;
  street?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  note?: string;
}

export interface EmailPayload {
  type: "email";
  to: string;
  subject?: string;
  body?: string;
}

export interface SmsPayload {
  type: "sms";
  phone: string;
  message?: string;
}

export interface TelPayload {
  type: "tel";
  phone: string;
}

export interface GeoPayload {
  type: "geo";
  latitude: number;
  longitude: number;
}

export interface EventPayload {
  type: "event";
  title: string;
  /** ISO 8601. For all-day events only the date part is used. */
  start: string;
  end?: string;
  allDay?: boolean;
  location?: string;
  description?: string;
}

/** PromptPay target kinds, per the Thai EMVCo profile. */
export type PromptPayTargetType = "mobile" | "nationalId" | "ewallet";

export interface PromptPayPayload {
  type: "promptpay";
  targetType: PromptPayTargetType;
  /** Digits only after normalization; formatting is stripped on encode. */
  target: string;
  /** Optional THB amount. Omitting it produces a reusable (static) code. */
  amount?: number;
}

export type QrPayload =
  | UrlPayload
  | TextPayload
  | WifiPayload
  | VCardPayload
  | EmailPayload
  | SmsPayload
  | TelPayload
  | GeoPayload
  | EventPayload
  | PromptPayPayload;

/**
 * Error correction level. Higher levels survive more damage (and more logo
 * coverage) at the cost of a denser symbol.
 *   L ~7%   M ~15%   Q ~25%   H ~30%
 */
export type EccLevel = "L" | "M" | "Q" | "H";

export type DotStyle =
  | "square"
  | "rounded"
  | "dots"
  | "classy"
  | "classy-rounded"
  | "extra-rounded";

export type CornerSquareStyle = "square" | "dot" | "extra-rounded";
export type CornerDotStyle = "square" | "dot";

export interface QrGradient {
  type: "linear" | "radial";
  rotation?: number;
  from: string;
  to: string;
}

export interface QrStyle {
  /** Module (dark) color. */
  fgColor: string;
  /** Background (light) color. */
  bgColor: string;
  fgGradient?: QrGradient;
  dotStyle: DotStyle;
  cornerSquareStyle: CornerSquareStyle;
  cornerDotStyle: CornerDotStyle;
  /** Quiet zone width, measured in modules. Never below 4. */
  marginModules: number;
  ecc: EccLevel;
  logoUrl?: string;
  /** Logo width as a fraction of symbol width. Capped by the quality rules. */
  logoSizeRatio?: number;
}

export const DEFAULT_STYLE: QrStyle = {
  fgColor: "#000000",
  bgColor: "#ffffff",
  dotStyle: "square",
  cornerSquareStyle: "square",
  cornerDotStyle: "square",
  marginModules: 4,
  ecc: "M",
};
