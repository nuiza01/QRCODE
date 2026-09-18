import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mocks = vi.hoisted(() => ({
  configured: vi.fn(() => true),
  duplicate: vi.fn(async () => ({
    status: "created" as const,
    id: "22222222-2222-4222-8222-222222222222",
  })),
  trusted: vi.fn(() => true),
  user: vi.fn(async () => ({ id: "owner-id" } as const)),
}));

vi.mock("@/lib/auth-config", () => ({ isAccountAuthConfigured: mocks.configured }));
vi.mock("@/lib/request-auth", () => ({
  getRequestUser: mocks.user,
  isTrustedMutationRequest: mocks.trusted,
}));
vi.mock("@/features/saved-qr/data", () => ({
  duplicateSavedQrCode: mocks.duplicate,
}));

import { resetSavedQrMutationRateLimitForTests } from "@/features/saved-qr/rate-limit";

import { POST } from "./route";

const id = "11111111-1111-4111-8111-111111111111";
const context = { params: Promise.resolve({ id }) };

function request() {
  return new Request(`https://nqr.orenvis.com/api/qr-codes/${id}/duplicate`, {
    method: "POST",
    headers: { Origin: "https://nqr.orenvis.com" },
  });
}

describe("POST /api/qr-codes/[id]/duplicate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.configured.mockReturnValue(true);
    mocks.trusted.mockReturnValue(true);
    mocks.user.mockResolvedValue({ id: "owner-id" });
    mocks.duplicate.mockResolvedValue({
      status: "created",
      id: "22222222-2222-4222-8222-222222222222",
    });
    resetSavedQrMutationRateLimitForTests();
  });

  it("duplicates only for the authenticated owner", async () => {
    const response = await POST(request(), context);
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({
      id: "22222222-2222-4222-8222-222222222222",
    });
    expect(mocks.duplicate).toHaveBeenCalledWith("owner-id", id);
  });

  it("keeps missing or non-owned records indistinguishable", async () => {
    mocks.duplicate.mockResolvedValueOnce({ status: "not_found" } as never);
    const response = await POST(request(), context);
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "not_found" });
  });

  it("returns the stable quota response", async () => {
    mocks.duplicate.mockResolvedValueOnce({ status: "quota_exceeded" } as never);
    const response = await POST(request(), context);
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      error: "saved_static_qr_quota_exceeded",
      limit: 25,
    });
  });

  it("does not inspect or echo an unknown duplicate failure", async () => {
    const inspected = vi.fn(() => {
      throw new Error("must not inspect");
    });
    mocks.duplicate.mockRejectedValueOnce(
      new Proxy(Object.create(null), { get: inspected, getPrototypeOf: inspected }),
    );
    const response = await POST(request(), context);
    expect(response.status).toBe(500);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({ error: "saved_qr_operation_failed" });
    expect(inspected).not.toHaveBeenCalled();
  });
});
