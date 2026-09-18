import { TextDecoder, TextEncoder } from "node:util";
import { afterEach, describe, expect, it, vi } from "vitest";
import { loadQrCodeStyling, QrRenderer } from "@/qr/render/engine";
import { DEFAULT_STYLE, type QrPayload } from "@/qr/types";

type Matrix = { getModuleCount(): number; isDark(row: number, col: number): boolean };

/**
 * Independent, test-only bitstream reader for pristine version 1–6 / ECC M
 * matrices. No application/vendor encoder is used to derive expected bytes.
 * It removes function modules and masking, deinterleaves data blocks, then
 * reads a single Numeric/Alphanumeric/Byte segment. It does NOT correct damage
 * or decode images, so these tests do not replace independent browser/scan QA.
 */
function readSymbol(qr: Matrix): { mode: number; bytes: number[] } {
  const size = qr.getModuleCount();
  const version = (size - 17) / 4;
  if (!Number.isInteger(version) || version < 1 || version > 6) {
    throw new Error(`Fixture exceeds the test reader's version range: ${version}`);
  }
  let format = 0;
  for (let bit = 0; bit < 15; bit++) {
    const row = bit < 6 ? bit : bit < 8 ? bit + 1 : size - 15 + bit;
    if (qr.isDark(row, 8)) format |= 1 << bit;
  }
  const unmaskedFormat = format ^ 0x5412;
  // Validate BCH format bits rather than silently reading a wrong mask/ECC.
  let remainder = unmaskedFormat;
  for (let bit = 14; bit >= 10; bit--) {
    if (remainder & (1 << bit)) remainder ^= 0x537 << (bit - 10);
  }
  expect(remainder).toBe(0);
  expect(unmaskedFormat >> 13).toBe(0); // ECC M
  const mask = (unmaskedFormat >> 10) & 7;
  const masks = [
    (r: number, c: number) => (r + c) % 2 === 0,
    (r: number) => r % 2 === 0,
    (_r: number, c: number) => c % 3 === 0,
    (r: number, c: number) => (r + c) % 3 === 0,
    (r: number, c: number) => (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0,
    (r: number, c: number) => (r * c) % 2 + (r * c) % 3 === 0,
    (r: number, c: number) => ((r * c) % 2 + (r * c) % 3) % 2 === 0,
    (r: number, c: number) => ((r + c) % 2 + (r * c) % 3) % 2 === 0,
  ];
  const isFunction = (r: number, c: number) =>
    (r <= 8 && c <= 8) || // top-left finder, separator and format
    (r <= 8 && c >= size - 8) || // top-right
    (r >= size - 8 && c <= 8) || // bottom-left, including fixed dark module
    r === 6 || c === 6 || // timing
    (version > 1 && Math.abs(r - (size - 7)) <= 2 && Math.abs(c - (size - 7)) <= 2);

  const bits: number[] = [];
  let upwards = true;
  for (let right = size - 1; right > 0; right -= 2) {
    if (right === 6) right--;
    for (let step = 0; step < size; step++) {
      const row = upwards ? size - 1 - step : step;
      for (const col of [right, right - 1]) {
        if (!isFunction(row, col)) {
          bits.push(Number(qr.isDark(row, col) !== masks[mask](row, col)));
        }
      }
    }
    upwards = !upwards;
  }
  // Versions 1–6 at M have equal-sized data blocks. ECC bytes follow the data.
  const [blockCount, dataPerBlock] = [[1, 16], [1, 28], [1, 44], [2, 32], [2, 43], [4, 27]][version - 1];
  const dataBits: number[] = [];
  for (let block = 0; block < blockCount; block++) {
    for (let offset = 0; offset < dataPerBlock; offset++) {
      const start = (offset * blockCount + block) * 8;
      dataBits.push(...bits.slice(start, start + 8));
    }
  }
  let cursor = 0;
  const take = (width: number) => {
    if (cursor + width > dataBits.length) throw new Error("Truncated QR data");
    let value = 0;
    for (let i = 0; i < width; i++) value = value * 2 + dataBits[cursor++];
    return value;
  };
  const mode = take(4);
  if (mode === 4) return { mode, bytes: Array.from({ length: take(8) }, () => take(8)) };
  let text = "";
  if (mode === 1) {
    let count = take(10);
    while (count > 0) {
      const digits = Math.min(3, count);
      text += String(take(digits === 3 ? 10 : digits === 2 ? 7 : 4)).padStart(digits, "0");
      count -= digits;
    }
  } else if (mode === 2) {
    const alphabet = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:";
    let count = take(9);
    while (count >= 2) {
      const pair = take(11);
      text += alphabet[Math.floor(pair / 45)] + alphabet[pair % 45];
      count -= 2;
    }
    if (count) text += alphabet[take(6)];
  } else {
    throw new Error(`Unsupported fixture mode ${mode}`);
  }
  return { mode, bytes: Array.from(text, (char) => char.charCodeAt(0)) };
}

function readLastSymbol(contexts: unknown[]) {
  // Vitest cannot infer the class receiver of a method without an explicit
  // `this` parameter. This is the real vendor instance, never a mocked encoder.
  const vendor = contexts.at(-1) as { _qr?: Matrix } | undefined;
  if (!vendor?._qr) throw new Error("The vendor did not create a QR matrix");
  return readSymbol(vendor._qr);
}

afterEach(() => vi.restoreAllMocks());

describe("real QR rendering byte contract (jsdom, no browser or network)", () => {
  it("confirms the bundled vendor truncates raw Unicode without the adapter", async () => {
    const Ctor = await loadQrCodeStyling();
    const vendor = new Ctor({ type: "svg", data: "ไทย", qrOptions: { errorCorrectionLevel: "M" } });
    expect(readSymbol(vendor._qr!).bytes).toEqual([0x44, 0x17, 0x22]);
  });

  it.each([
    ["ASCII byte", "https://example.com/a?x=1&y=2", 4],
    ["ASCII numeric", "01234567890123456789", 1],
    ["ASCII alphanumeric", "NQR-013 ASCII / 2026", 2],
    ["QA-001 Thai", "NQR007_EN_RECOVER ไทย", 4],
    ["emoji", "QR 😀 🚀 👩🏽‍💻", 4],
    ["multilingual", "ไทย 日本語 中文 العربية café", 4],
    ["newlines and punctuation", "ไทย\nline 2\r\n\\;,:&\" + %", 4],
    ["combining marks", "กิ e\u0301 é", 4],
  ])("preserves %s through the real renderer", async (_label, data, mode) => {
    const Ctor = await loadQrCodeStyling();
    const updates = vi.spyOn(Ctor.prototype, "update");
    const renderer = await QrRenderer.load();
    const host = document.createElement("div");
    try {
      const result = renderer.updateEncoded({ data, style: DEFAULT_STYLE, size: 320 });
      renderer.attach(host);
      expect(host.querySelector("svg")).not.toBeNull();
      const decoded = readLastSymbol(updates.mock.contexts);
      expect(decoded.mode).toBe(mode);
      expect(decoded.bytes).toEqual(Array.from(new TextEncoder().encode(data)));
      expect(new TextDecoder("utf-8", { fatal: true }).decode(Uint8Array.from(decoded.bytes))).toBe(data);
      expect(result.data).toBe(data); // Public result stays Unicode, not transport bytes.
      expect(result.geometry.quietZoneModules).toBeCloseTo(4, 8);
    } finally {
      renderer.destroy();
    }
  });

  const structured: { name: string; payload: QrPayload; expected: string }[] = [
    {
      name: "Thai vCard",
      payload: { type: "vcard", firstName: "NQR007 ทดสอบ" },
      expected: "BEGIN:VCARD\nVERSION:3.0\nN:;NQR007 ทดสอบ;;;\nFN:NQR007 ทดสอบ\nEND:VCARD",
    },
    {
      name: "Thai SMS",
      payload: { type: "sms", phone: "+12025550123", message: "NQR007 ไทย & test" },
      expected: "SMSTO:+12025550123:NQR007 ไทย & test",
    },
    {
      name: "Thai WiFi",
      payload: { type: "wifi", ssid: "ไทย;Guest", password: "synthetic😀", encryption: "WPA" },
      expected: "WIFI:T:WPA;S:ไทย\\;Guest;P:synthetic😀;;",
    },
    {
      name: "Thai event",
      payload: { type: "event", title: "นัด😀", start: "2026-09-01", allDay: true },
      expected: "BEGIN:VEVENT\nSUMMARY:นัด😀\nDTSTART;VALUE=DATE:20260901\nEND:VEVENT",
    },
  ];

  it.each(structured)("preserves $name with an independently written expected payload", async ({ payload, expected }) => {
    const Ctor = await loadQrCodeStyling();
    const updates = vi.spyOn(Ctor.prototype, "update");
    const renderer = await QrRenderer.load();
    try {
      const result = renderer.update({ payload, style: DEFAULT_STYLE, size: 1024 });
      const { bytes } = readLastSymbol(updates.mock.contexts);
      expect(new TextDecoder("utf-8", { fatal: true }).decode(Uint8Array.from(bytes))).toBe(expected);
      expect(result.data).toBe(expected);
    } finally {
      renderer.destroy();
    }
  });

  it("does not double-encode updates or the second quiet-zone pass when QR version changes", async () => {
    const Ctor = await loadQrCodeStyling();
    const updates = vi.spyOn(Ctor.prototype, "update");
    const renderer = await QrRenderer.load();
    try {
      for (const data of ["abc", "ไทย😀".repeat(5), "NQR007_EN_RECOVER ไทย", "abc"]) {
        const result = renderer.update({ payload: { type: "text", text: data }, style: DEFAULT_STYLE, size: 512 });
        const { bytes } = readLastSymbol(updates.mock.contexts);
        expect(bytes).toEqual(Array.from(new TextEncoder().encode(data)));
        expect(result.data).toBe(data);
        expect(result.geometry.quietZoneModules).toBeCloseTo(4, 8);
      }
    } finally {
      renderer.destroy();
    }
  });
});
