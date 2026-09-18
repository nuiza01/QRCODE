import { describe, expect, it } from "vitest";
import { resolveQrMessage } from "@/qr/messages";
import {
  crc16ccitt,
  encodePromptPay,
  normalizePromptPayTarget,
  PromptPayError,
} from "@/qr/payload/promptpay";

describe("crc16ccitt", () => {
  // The canonical CRC-16/CCITT-FALSE check value for the string "123456789".
  it("matches the published check vector", () => {
    expect(crc16ccitt("123456789")).toBe("29B1");
  });
});

describe("normalizePromptPayTarget", () => {
  it("accepts a mobile number in any common local format", () => {
    const expected = "0066812345678";
    expect(normalizePromptPayTarget("mobile", "0812345678")).toBe(expected);
    expect(normalizePromptPayTarget("mobile", "081-234-5678")).toBe(expected);
    expect(normalizePromptPayTarget("mobile", "+66812345678")).toBe(expected);
    expect(normalizePromptPayTarget("mobile", "66812345678")).toBe(expected);
  });

  it("produces a 13-character mobile target", () => {
    expect(normalizePromptPayTarget("mobile", "0812345678")).toHaveLength(13);
  });

  it("rejects a national ID that is not 13 digits", () => {
    expect(() => normalizePromptPayTarget("nationalId", "123456")).toThrow(PromptPayError);
    expect(normalizePromptPayTarget("nationalId", "1-2345-67890-12-3")).toBe(
      "1234567890123",
    );
  });

  it("rejects an e-wallet id that is not 15 digits", () => {
    expect(() => normalizePromptPayTarget("ewallet", "12345678901234")).toThrow(
      PromptPayError,
    );
  });
});

describe("encodePromptPay", () => {
  it("builds a reusable payload when no amount is given", () => {
    const payload = encodePromptPay({
      type: "promptpay",
      targetType: "mobile",
      target: "0812345678",
    });

    expect(payload.startsWith("000201")).toBe(true);
    // 01 = point of initiation, length 02, value 11 = reusable.
    expect(payload).toContain("010211");
    expect(payload).toContain("A000000677010111");
    expect(payload).toContain("0066812345678");
    expect(payload).toContain("5303764");
    expect(payload).toContain("5802TH");
    // No amount field.
    expect(payload).not.toContain("54");
  });

  it("marks a payload with an amount as single-use and formats two decimals", () => {
    const payload = encodePromptPay({
      type: "promptpay",
      targetType: "mobile",
      target: "0812345678",
      amount: 100,
    });

    expect(payload).toContain("010212");
    expect(payload).toContain("5406100.00");
  });

  it("ends with a CRC computed over the payload including the CRC header", () => {
    const payload = encodePromptPay({
      type: "promptpay",
      targetType: "nationalId",
      target: "1234567890123",
    });

    const body = payload.slice(0, -4);
    expect(body.endsWith("6304")).toBe(true);
    expect(payload.slice(-4)).toBe(crc16ccitt(body));
  });

  it("changes the CRC when the amount changes", () => {
    const base = { type: "promptpay", targetType: "mobile", target: "0812345678" } as const;
    const a = encodePromptPay({ ...base, amount: 100 });
    const b = encodePromptPay({ ...base, amount: 200 });
    expect(a.slice(-4)).not.toBe(b.slice(-4));
  });
});

describe("PromptPayError carries a resolvable message code", () => {
  it("throws a code rather than a Thai sentence, and resolves in both locales", () => {
    let thrown: unknown;
    try {
      normalizePromptPayTarget("nationalId", "1234567890");
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(PromptPayError);
    const error = thrown as PromptPayError;
    expect(error.code).toBe("promptpay.target.nationalId");
    // A Phase 2 server route has no locale in scope when the encoder throws,
    // so the sentence has to be chosen by the caller, not baked in here.
    expect(resolveQrMessage(error.code, "th")).toContain("13 หลัก");
    expect(resolveQrMessage(error.code, "en")).toContain("13 digits");
  });
});

