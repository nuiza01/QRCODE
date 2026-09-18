import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { readBoundedJson } from "./bounded-json";

const encoder = new TextEncoder();

function streamedRequest(
  chunks: Array<string | Uint8Array>,
  headers: Record<string, string> = { "Content-Type": "application/json" },
): Request {
  const encoded = chunks.map((chunk) => typeof chunk === "string" ? encoder.encode(chunk) : chunk);
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of encoded) controller.enqueue(chunk);
      controller.close();
    },
  });
  return new Request("https://nqr.orenvis.com/api/qr-codes", {
    method: "POST",
    headers,
    body: stream,
    duplex: "half",
  } as RequestInit & { duplex: "half" });
}

describe("readBoundedJson", () => {
  it("accepts JSON at the exact streamed-byte boundary with parameters", async () => {
    const body = "{\"ok\":1}";
    const result = await readBoundedJson(
      streamedRequest(["{\"", "ok", "\":1}"], { "Content-Type": "Application/JSON; charset=utf-8" }),
      encoder.encode(body).byteLength,
    );
    expect(result).toEqual({ ok: true, value: { ok: 1 } });
  });

  it("rejects a chunked body whose actual bytes exceed the boundary", async () => {
    const result = await readBoundedJson(streamedRequest(["{\"ok\":", "12345}"]), 10);
    expect(result).toEqual({ ok: false, error: "too_large", status: 413 });
  });

  it("rejects actual oversize bytes when Content-Length is understated", async () => {
    const result = await readBoundedJson(
      streamedRequest(["{\"ok\":", "12345}"], {
        "Content-Type": "application/json",
        "Content-Length": "2",
      }),
      10,
    );
    expect(result).toEqual({ ok: false, error: "too_large", status: 413 });
  });

  it("uses an oversized Content-Length only as an early rejection", async () => {
    const result = await readBoundedJson(
      streamedRequest(["{}"], {
        "Content-Type": "application/json",
        "Content-Length": "11",
      }),
      10,
    );
    expect(result).toEqual({ ok: false, error: "too_large", status: 413 });
  });

  it.each([undefined, "text/plain", "application/json-patch+json", "application/jsonp"])(
    "rejects a missing or unsupported content type: %s",
    async (contentType) => {
      const headers: Record<string, string> = contentType ? { "Content-Type": contentType } : {};
      const result = await readBoundedJson(streamedRequest(["{}"], headers), 10);
      expect(result).toEqual({ ok: false, error: "invalid_content_type", status: 415 });
    },
  );

  it("rejects malformed JSON and malformed UTF-8", async () => {
    await expect(readBoundedJson(streamedRequest(["{"]), 10)).resolves.toEqual({
      ok: false,
      error: "invalid_json",
      status: 400,
    });
    await expect(readBoundedJson(streamedRequest([new Uint8Array([0xc3, 0x28])]), 10)).resolves.toEqual({
      ok: false,
      error: "invalid_json",
      status: 400,
    });
  });

  it("rejects an already-consumed request body instead of throwing", async () => {
    const request = streamedRequest(["{}"]);
    await request.text();
    await expect(readBoundedJson(request, 10)).resolves.toEqual({
      ok: false,
      error: "invalid_json",
      status: 400,
    });
  });
});
