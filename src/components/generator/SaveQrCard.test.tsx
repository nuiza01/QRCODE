import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DEFAULT_STYLE } from "@/qr/types";

vi.mock("@/lib/auth-client", () => ({
  authClient: {
    useSession: () => ({
      data: { user: { id: "owner-id", email: "owner@example.com" } },
      isPending: false,
    }),
  },
}));

import { SaveQrCard } from "./SaveQrCard";

describe("SaveQrCard quota feedback", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows localized safe feedback for the saved-static quota", async () => {
    const fetch = vi.fn(async () =>
      Response.json(
        { error: "saved_static_qr_quota_exceeded", limit: 25 },
        { status: 409 },
      ),
    );
    vi.stubGlobal("fetch", fetch);
    render(
      <SaveQrCard
        blocked={false}
        locale="en"
        payload={{ type: "url", url: "https://example.com" }}
        style={DEFAULT_STYLE}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Save QR" }));
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(
        "A free account can save up to 25 static QR codes",
      ),
    );
    expect(screen.getByRole("alert")).not.toHaveTextContent(
      "saved_static_qr_quota_exceeded",
    );
  });

  it("does not inspect or expose an unknown fetch rejection", async () => {
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
      <SaveQrCard
        blocked={false}
        locale="en"
        payload={{ type: "url", url: "https://example.com" }}
        style={DEFAULT_STYLE}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Save QR" }));
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Could not save. Please try again.",
      ),
    );
    expect(inspected).not.toHaveBeenCalled();
  });
});
