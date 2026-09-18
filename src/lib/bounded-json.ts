import "server-only";

export type BoundedJsonError = "invalid_content_type" | "invalid_json" | "too_large";

export type BoundedJsonResult =
  | { ok: true; value: unknown }
  | { ok: false; error: BoundedJsonError; status: 400 | 413 | 415 };

const invalidJson = (): BoundedJsonResult => ({ ok: false, error: "invalid_json", status: 400 });
const tooLarge = (): BoundedJsonResult => ({ ok: false, error: "too_large", status: 413 });

function isJsonContentType(value: string | null): boolean {
  if (!value) return false;
  return value.split(";", 1)[0]?.trim().toLowerCase() === "application/json";
}

function advertisedLengthExceedsLimit(value: string | null, maxBytes: number): boolean {
  if (!value || !/^\d+$/.test(value.trim())) return false;
  return BigInt(value.trim()) > BigInt(maxBytes);
}

function cancelWithoutWaiting(reader: ReadableStreamDefaultReader<Uint8Array>): void {
  try {
    void reader.cancel().catch(() => undefined);
  } catch {
    // The response is already fixed; cancellation is best-effort cleanup only.
  }
}

/**
 * Reads JSON while enforcing the actual number of streamed bytes.
 * Content-Length is only an early rejection hint and is never trusted as the
 * body-size boundary because it can be absent or smaller than a chunked body.
 */
export async function readBoundedJson(request: Request, maxBytes: number): Promise<BoundedJsonResult> {
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 1) {
    throw new RangeError("maxBytes must be a positive safe integer");
  }
  if (!isJsonContentType(request.headers.get("content-type"))) {
    return { ok: false, error: "invalid_content_type", status: 415 };
  }
  if (advertisedLengthExceedsLimit(request.headers.get("content-length"), maxBytes)) {
    return tooLarge();
  }
  if (!request.body) return invalidJson();

  let reader: ReadableStreamDefaultReader<Uint8Array>;
  try {
    reader = request.body.getReader();
  } catch {
    return invalidJson();
  }
  const chunks: Uint8Array[] = [];
  let byteLength = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      byteLength += value.byteLength;
      if (byteLength > maxBytes) {
        cancelWithoutWaiting(reader);
        return tooLarge();
      }
      chunks.push(value);
    }
  } catch {
    return invalidJson();
  }

  const bytes = new Uint8Array(byteLength);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  try {
    const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    return { ok: true, value: JSON.parse(text) as unknown };
  } catch {
    return invalidJson();
  }
}
