import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mocks = vi.hoisted(() => ({
  configured: vi.fn(() => true),
  list: vi.fn(),
  user: vi.fn(async () => ({ id: "owner-id" })),
}));

vi.mock("next/headers", () => ({ headers: vi.fn(async () => new Headers()) }));
vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("not-found");
  }),
  redirect: vi.fn(() => {
    throw new Error("redirect");
  }),
}));
vi.mock("@/features/saved-qr/data", () => ({ listSavedQrCodes: mocks.list }));
vi.mock("@/lib/auth-config", () => ({ isAccountAuthConfigured: mocks.configured }));
vi.mock("@/lib/request-auth", () => ({ getRequestUser: mocks.user }));

import DashboardPage from "./page";

describe("saved QR dashboard failure boundary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.configured.mockReturnValue(true);
    mocks.user.mockResolvedValue({ id: "owner-id" });
  });

  it("shows fixed copy without inspecting or echoing list failures", async () => {
    const inspected = vi.fn(() => {
      throw new Error("must not inspect");
    });
    mocks.list.mockRejectedValueOnce(
      new Proxy(Object.create(null), { get: inspected, getPrototypeOf: inspected }),
    );
    render(await DashboardPage({ params: Promise.resolve({ locale: "en" }) }));
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Saved QR codes are temporarily unavailable",
    );
    expect(inspected).not.toHaveBeenCalled();
  });
});
