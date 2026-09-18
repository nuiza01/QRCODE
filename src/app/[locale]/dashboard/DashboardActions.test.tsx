import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const navigation = vi.hoisted(() => ({ refresh: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: navigation.refresh }),
}));

import { DashboardActions } from "./DashboardActions";

describe("DashboardActions quota feedback", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("shows a localized quota message when duplicate cannot claim another slot", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json(
          { error: "saved_static_qr_quota_exceeded", limit: 25 },
          { status: 409 },
        ),
      ),
    );
    render(
      <DashboardActions
        id="11111111-1111-4111-8111-111111111111"
        locale="th"
        name="แคมเปญ"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "ทำสำเนา" }));
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(
        "บัญชีฟรีบันทึก Static QR ได้สูงสุด 25 รายการ",
      ),
    );
    expect(navigation.refresh).not.toHaveBeenCalled();
  });

  it("does not inspect or expose an unknown action rejection", async () => {
    const inspected = vi.fn(() => {
      throw new Error("must not inspect");
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Promise.reject(
          new Proxy(Object.create(null), { get: inspected, getPrototypeOf: inspected }),
        ),
      ),
    );
    render(
      <DashboardActions
        id="11111111-1111-4111-8111-111111111111"
        locale="en"
        name="Campaign"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Duplicate" }));
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent("The action failed"),
    );
    expect(inspected).not.toHaveBeenCalled();
  });
});
