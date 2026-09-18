/**
 * PromptPay QR payload (EMVCo Merchant Presented Mode, Thai profile).
 *
 * Implemented in-house rather than pulled from a package: the validation rules
 * for Thai mobile / national ID / e-wallet targets are the part users get wrong,
 * and we want them enforced at the same layer that builds the payload.
 *
 * Field reference:
 *   00 Payload format indicator      "01"
 *   01 Point of initiation           "11" reusable · "12" single use (amount set)
 *   29 Merchant account info (PromptPay)
 *      00 AID                        "A000000677010111"
 *      01 mobile · 02 national ID · 03 e-wallet
 *   53 Currency                      "764" (THB)
 *   54 Transaction amount            optional, two decimals
 *   58 Country                       "TH"
 *   63 CRC                           CRC-16/CCITT-FALSE over everything incl. "6304"
 */
import type { PromptPayPayload, PromptPayTargetType } from "@/qr/types";
import type { QrMessageCode } from "@/qr/messages";

const AID = "A000000677010111";
const TAG_BY_TARGET: Record<PromptPayTargetType, string> = {
  mobile: "01",
  nationalId: "02",
  ewallet: "03",
};

/** `tag + zero-padded length + value`, the EMVCo TLV unit. */
function tlv(tag: string, value: string): string {
  return tag + value.length.toString().padStart(2, "0") + value;
}

/** CRC-16/CCITT-FALSE: poly 0x1021, init 0xFFFF, no reflection, no final xor. */
export function crc16ccitt(input: string): string {
  let crc = 0xffff;
  for (let i = 0; i < input.length; i++) {
    crc ^= input.charCodeAt(i) << 8;
    for (let bit = 0; bit < 8; bit++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

/**
 * Carries a message **code**, not a sentence — same contract as the schemas.
 * This throw can reach a Phase 2 server route validating a bulk upload, where
 * no locale is in scope, so the encoder states which rule broke and the caller
 * resolves it with `resolveQrMessage`.
 */
export class PromptPayError extends Error {
  readonly code: QrMessageCode;

  constructor(code: QrMessageCode) {
    super(code);
    this.name = "PromptPayError";
    this.code = code;
  }
}

/**
 * Normalizes a target to the digit string PromptPay expects.
 *   mobile      → 0066 + last 9 digits          (13 chars)
 *   nationalId  → 13 digits as-is
 *   ewallet     → 15 digits as-is
 */
export function normalizePromptPayTarget(
  targetType: PromptPayTargetType,
  raw: string,
): string {
  const digits = raw.replace(/\D/g, "");

  if (targetType === "mobile") {
    // Accept 0812345678, +66812345678, 66812345678 — all carry the same 9
    // significant digits once the leading zero or country code is dropped.
    if (digits.length < 9) {
      throw new PromptPayError("promptpay.target.mobile");
    }
    return "0066" + digits.slice(-9);
  }

  if (targetType === "nationalId") {
    if (digits.length !== 13) {
      throw new PromptPayError("promptpay.target.nationalId");
    }
    return digits;
  }

  if (digits.length !== 15) {
    throw new PromptPayError("promptpay.target.ewallet");
  }
  return digits;
}

export function encodePromptPay(payload: PromptPayPayload): string {
  const target = normalizePromptPayTarget(payload.targetType, payload.target);
  const hasAmount = typeof payload.amount === "number" && payload.amount > 0;

  if (hasAmount && !Number.isFinite(payload.amount)) {
    throw new PromptPayError("promptpay.amount.invalid");
  }

  const merchantAccount =
    tlv("00", AID) + tlv(TAG_BY_TARGET[payload.targetType], target);

  let body =
    tlv("00", "01") +
    // A code carrying a fixed amount is single-use by definition.
    tlv("01", hasAmount ? "12" : "11") +
    tlv("29", merchantAccount) +
    tlv("53", "764");

  if (hasAmount) {
    body += tlv("54", payload.amount!.toFixed(2));
  }

  body += tlv("58", "TH");

  // The CRC covers the tag and length of the CRC field itself.
  const withCrcHeader = body + "6304";
  return withCrcHeader + crc16ccitt(withCrcHeader);
}
