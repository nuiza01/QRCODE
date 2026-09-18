import { beforeEach, describe, expect, it, vi } from "vitest";

import { DEFAULT_STYLE } from "@/qr/types";

vi.mock("server-only", () => ({}));

const mocks = vi.hoisted(() => ({
  configured: vi.fn(() => true),
  create: vi.fn(async () => ({
    status: "created" as const,
    id: "11111111-1111-4111-8111-111111111111",
  })),
  trusted: vi.fn(() => true),
  user: vi.fn(async () => ({ id: "owner-id" } as const)),
}));

vi.mock("@/lib/auth-config", () => ({ isAccountAuthConfigured: mocks.configured }));
vi.mock("@/lib/request-auth", () => ({
  getRequestUser: mocks.user,
  isTrustedMutationRequest: mocks.trusted,
}));
vi.mock("@/features/saved-qr/data", () => ({ createSavedQrCode: mocks.create }));

import { resetSavedQrMutationRateLimitForTests } from "@/features/saved-qr/rate-limit";

import { POST } from "./route";

const validBody = {
  name: "Campaign",
  mode: "static",
  payload: { type: "url", url: "https://example.com" },
  style: DEFAULT_STYLE,
};

function request(body: unknown = validBody) {
  return new Request("https://nqr.orenvis.com/api/qr-codes", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: "https://nqr.orenvis.com" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/qr-codes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.configured.mockReturnValue(true);
    mocks.trusted.mockReturnValue(true);
    mocks.user.mockResolvedValue({ id: "owner-id" });
    mocks.create.mockResolvedValue({
      status: "created",
      id: "11111111-1111-4111-8111-111111111111",
    });
    resetSavedQrMutationRateLimitForTests();
  });

  it("fails closed before reading auth on a cross-origin mutation", async () => {
    mocks.trusted.mockReturnValue(false);
    const response = await POST(request());
    expect(response.status).toBe(403);
    expect(mocks.user).not.toHaveBeenCalled();
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("requires an authenticated persisted user", async () => {
    mocks.user.mockResolvedValue(null as never);
    const response = await POST(request());
    expect(response.status).toBe(401);
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("authenticates before reading an untrusted request body", async () => {
    mocks.user.mockResolvedValue(null as never);
    const bodyRead = vi.fn();
    const original = request();
    const protectedBody = new Proxy(original, {
      get(target, property) {
        if (property === "body") {
          bodyRead();
          throw new Error("body must not be read before auth");
        }
        const value = Reflect.get(target, property, target);
        return typeof value === "function" ? value.bind(target) : value;
      },
    });

    const response = await POST(protectedBody);
    expect(response.status).toBe(401);
    expect(bodyRead).not.toHaveBeenCalled();
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("rejects invalid or Dynamic records in Phase 2A", async () => {
    const response = await POST(request({ ...validBody, mode: "dynamic" }));
    expect(response.status).toBe(400);
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("passes only validated data with the authenticated owner ID", async () => {
    const response = await POST(request({ ...validBody, name: "  Campaign  " }));
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ id: "11111111-1111-4111-8111-111111111111" });
    expect(mocks.create).toHaveBeenCalledWith("owner-id", {
      ...validBody,
      name: "Campaign",
    });
  });

  it("maps the stable saved-static quota result without leaking database details", async () => {
    mocks.create.mockResolvedValueOnce({ status: "quota_exceeded" } as never);
    const response = await POST(request());
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      error: "saved_static_qr_quota_exceeded",
      limit: 25,
    });
  });

  it("does not parse oversized bodies", async () => {
    const oversized = request();
    oversized.headers.set("Content-Length", "900000");
    const response = await POST(oversized);
    expect(response.status).toBe(413);
    expect(mocks.user).toHaveBeenCalledOnce();
  });

  it("rejects a streamed oversize body even when Content-Length is understated", async () => {
    const prefix = JSON.stringify(validBody).slice(0, -1);
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(prefix));
        controller.enqueue(new Uint8Array(800_000));
        controller.close();
      },
    });
    const streamed = new Request("https://nqr.orenvis.com/api/qr-codes", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": "2",
        Origin: "https://nqr.orenvis.com",
      },
      body: stream,
      duplex: "half",
    } as RequestInit & { duplex: "half" });

    const response = await POST(streamed);
    expect(response.status).toBe(413);
    expect(mocks.user).toHaveBeenCalledOnce();
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("returns a fixed no-store response without inspecting a hostile DAL failure", async () => {
    const inspected = vi.fn(() => {
      throw new Error("must not inspect");
    });
    const hostile = new Proxy(Object.create(null), {
      get: inspected,
      getPrototypeOf: inspected,
    });
    mocks.create.mockRejectedValueOnce(hostile);

    const response = await POST(request());
    expect(response.status).toBe(500);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({ error: "saved_qr_operation_failed" });
    expect(inspected).not.toHaveBeenCalled();
  });

  it("does not echo Drizzle messages, payloads, or connection details", async () => {
    const marker = "mysql://user:secret@host/nqr payload=PRIVATE";
    mocks.create.mockRejectedValueOnce(new Error(marker));
    const response = await POST(request());
    expect(response.status).toBe(500);
    expect(await response.text()).not.toContain(marker);
  });

  it("rate limits by authenticated account before body parsing", async () => {
    for (let index = 0; index < 30; index += 1) {
      expect((await POST(request())).status).toBe(201);
    }
    const response = await POST(request());
    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toMatch(/^\d+$/);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({ error: "saved_qr_rate_limited" });
    expect(mocks.create).toHaveBeenCalledTimes(30);
  });
});
