import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mocks = vi.hoisted(() => ({
  configured: vi.fn(() => true),
  remove: vi.fn(async () => true),
  rename: vi.fn(async () => true),
  trusted: vi.fn(() => true),
  user: vi.fn(async () => ({ id: "owner-id" } as const)),
}));

vi.mock("@/lib/auth-config", () => ({ isAccountAuthConfigured: mocks.configured }));
vi.mock("@/lib/request-auth", () => ({
  getRequestUser: mocks.user,
  isTrustedMutationRequest: mocks.trusted,
}));
vi.mock("@/features/saved-qr/data", () => ({
  deleteSavedQrCode: mocks.remove,
  renameSavedQrCode: mocks.rename,
}));

import { resetSavedQrMutationRateLimitForTests } from "@/features/saved-qr/rate-limit";

import { DELETE, PATCH } from "./route";

const context = { params: Promise.resolve({ id: "11111111-1111-4111-8111-111111111111" }) };

describe("PATCH /api/qr-codes/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.configured.mockReturnValue(true);
    mocks.trusted.mockReturnValue(true);
    mocks.user.mockResolvedValue({ id: "owner-id" });
    mocks.remove.mockResolvedValue(true);
    mocks.rename.mockResolvedValue(true);
    resetSavedQrMutationRateLimitForTests();
  });

  it("requires application/json", async () => {
    const request = new Request("https://nqr.orenvis.com/api/qr-codes/id", {
      method: "PATCH",
      headers: { "Content-Type": "text/plain", Origin: "https://nqr.orenvis.com" },
      body: "name=Campaign",
    });
    const response = await PATCH(request, context);
    expect(response.status).toBe(415);
    expect(mocks.rename).not.toHaveBeenCalled();
  });

  it("rejects malformed JSON without calling the mutation", async () => {
    const request = new Request("https://nqr.orenvis.com/api/qr-codes/id", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Origin: "https://nqr.orenvis.com" },
      body: "{",
    });
    const response = await PATCH(request, context);
    expect(response.status).toBe(400);
    expect(mocks.rename).not.toHaveBeenCalled();
  });

  it("renames only after bounded JSON validation", async () => {
    const request = new Request("https://nqr.orenvis.com/api/qr-codes/id", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Origin: "https://nqr.orenvis.com" },
      body: JSON.stringify({ name: "  Campaign  " }),
    });
    const response = await PATCH(request, context);
    expect(response.status).toBe(200);
    expect(mocks.rename).toHaveBeenCalledWith(
      "owner-id",
      "11111111-1111-4111-8111-111111111111",
      "Campaign",
    );
  });

  it("maps rename and delete DAL failures to the same fixed response", async () => {
    const marker = "DrizzleQueryError DATABASE_URL=PRIVATE payload=PRIVATE";
    mocks.rename.mockRejectedValueOnce(new Error(marker));
    const renameRequest = new Request("https://nqr.orenvis.com/api/qr-codes/id", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Origin: "https://nqr.orenvis.com" },
      body: JSON.stringify({ name: "Campaign" }),
    });
    const renameResponse = await PATCH(renameRequest, context);
    expect(renameResponse.status).toBe(500);
    expect(await renameResponse.text()).not.toContain(marker);

    mocks.remove.mockRejectedValueOnce(new Error(marker));
    const deleteRequest = new Request("https://nqr.orenvis.com/api/qr-codes/id", {
      method: "DELETE",
      headers: { Origin: "https://nqr.orenvis.com" },
    });
    const deleteResponse = await DELETE(deleteRequest, context);
    expect(deleteResponse.status).toBe(500);
    expect(deleteResponse.headers.get("cache-control")).toBe("no-store");
    expect(await deleteResponse.json()).toEqual({ error: "saved_qr_operation_failed" });
  });
});
