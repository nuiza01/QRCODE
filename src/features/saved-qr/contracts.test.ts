import { describe, expect, it } from "vitest";

import { DEFAULT_STYLE } from "@/qr/types";

import {
  canCreateDynamicQr,
  canSaveStaticQr,
  createSavedQrSchema,
  FREE_DYNAMIC_QR_LIMIT,
  FREE_SAVED_STATIC_QR_LIMIT,
  MAX_SAVED_QR_REQUEST_BYTES,
  renameSavedQrSchema,
} from "./contracts";

describe("saved QR contracts", () => {
  const valid = {
    name: "  Campaign QR  ",
    mode: "static",
    payload: { type: "url", url: "https://example.com" },
    style: DEFAULT_STYLE,
  } as const;

  it("validates and trims a portable static QR record", () => {
    const parsed = createSavedQrSchema.parse(valid);
    expect(parsed.name).toBe("Campaign QR");
    expect(parsed.payload).toEqual(valid.payload);
    expect(parsed.style).toEqual(DEFAULT_STYLE);
  });

  it("keeps Dynamic activation outside Phase 2A", () => {
    expect(createSavedQrSchema.safeParse({ ...valid, mode: "dynamic" }).success).toBe(false);
  });

  it("rejects invalid payloads, styles, names and oversized JSON", () => {
    expect(createSavedQrSchema.safeParse({ ...valid, name: " " }).success).toBe(false);
    expect(createSavedQrSchema.safeParse({ ...valid, payload: { type: "url", url: "javascript:alert(1)" } }).success).toBe(false);
    expect(createSavedQrSchema.safeParse({ ...valid, style: { ...DEFAULT_STYLE, marginModules: 0 } }).success).toBe(false);
    expect(createSavedQrSchema.safeParse({ ...valid, style: { ...DEFAULT_STYLE, logoUrl: `data:image/png;base64,${"A".repeat(MAX_SAVED_QR_REQUEST_BYTES)}` } }).success).toBe(false);
  });

  it("enforces stable rename limits", () => {
    expect(renameSavedQrSchema.parse({ name: "  Renamed  " })).toEqual({ name: "Renamed" });
    expect(renameSavedQrSchema.safeParse({ name: "x".repeat(161) }).success).toBe(false);
  });

  it("defines the Free Dynamic QR boundary at five", () => {
    expect(FREE_DYNAMIC_QR_LIMIT).toBe(5);
    expect(canCreateDynamicQr(0)).toBe(true);
    expect(canCreateDynamicQr(4)).toBe(true);
    expect(canCreateDynamicQr(5)).toBe(false);
    expect(canCreateDynamicQr(-1)).toBe(false);
    expect(canCreateDynamicQr(1.5)).toBe(false);
  });

  it("allows the 25th saved static QR and rejects the 26th", () => {
    expect(FREE_SAVED_STATIC_QR_LIMIT).toBe(25);
    expect(canSaveStaticQr(24)).toBe(true);
    expect(canSaveStaticQr(25)).toBe(false);
    expect(canSaveStaticQr(-1)).toBe(false);
    expect(canSaveStaticQr(24.5)).toBe(false);
  });
});
