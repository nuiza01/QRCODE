import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mocks = vi.hoisted(() => ({
  configured: vi.fn(() => true),
  user: vi.fn(async () => ({ id: "owner-id" }) as { id: string } | null),
}));

vi.mock("next/headers", () => ({ headers: vi.fn(async () => new Headers()) }));
vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("not-found");
  }),
}));
vi.mock("@/lib/auth-config", () => ({ isAccountAuthConfigured: mocks.configured }));
vi.mock("@/lib/request-auth", () => ({ getRequestUser: mocks.user }));
vi.mock("@/components/generator", () => ({
  Generator: ({ initialType }: { initialType?: string }) => (
    <div data-testid="generator" data-initial-type={initialType ?? ""} />
  ),
}));

import CreatePage from "./page";

const params = (locale = "en") => Promise.resolve({ locale });

describe("the generator is behind the account gate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.configured.mockReturnValue(true);
    mocks.user.mockResolvedValue({ id: "owner-id" });
  });

  it("renders the generator for a signed-in visitor", async () => {
    render(await CreatePage({ params: params() }));
    expect(screen.getByTestId("generator")).toBeInTheDocument();
  });

  it("never renders the generator for an anonymous visitor", async () => {
    mocks.user.mockResolvedValue(null);
    render(await CreatePage({ params: params() }));
    expect(screen.queryByTestId("generator")).not.toBeInTheDocument();
    expect(screen.getByText("Sign in to continue")).toBeInTheDocument();
  });

  it("refuses rather than opening the generator when accounts are not configured", async () => {
    mocks.configured.mockReturnValue(false);
    render(await CreatePage({ params: params() }));
    expect(screen.queryByTestId("generator")).not.toBeInTheDocument();
    expect(mocks.user).not.toHaveBeenCalled();
    expect(screen.getByText("Accounts are unavailable")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("Sign-in cannot be verified right now");
  });

  it("refuses without inspecting a failed session lookup", async () => {
    const inspected = vi.fn(() => {
      throw new Error("must not inspect");
    });
    mocks.user.mockRejectedValueOnce(
      new Proxy(Object.create(null), { get: inspected, getPrototypeOf: inspected }),
    );
    render(await CreatePage({ params: params() }));
    expect(screen.queryByTestId("generator")).not.toBeInTheDocument();
    expect(screen.getByText("Accounts are unavailable")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("Sign-in cannot be verified right now");
    expect(inspected).not.toHaveBeenCalled();
  });

  it("preselects a known type from the query and ignores anything else", async () => {
    render(await CreatePage({
      params: params(),
      searchParams: Promise.resolve({ type: "promptpay" }),
    }));
    expect(screen.getByTestId("generator")).toHaveAttribute("data-initial-type", "promptpay");

    const rejected: (string | string[] | undefined)[] = ["../admin", ["url", "wifi"], undefined, "nope"];
    for (const type of rejected) {
      const view = render(await CreatePage({
        params: params(),
        searchParams: Promise.resolve({ type }),
      }));
      expect(view.getAllByTestId("generator").at(-1)).toHaveAttribute("data-initial-type", "");
      view.unmount();
    }
  });

  it("rejects a locale that is not one of ours before touching the session", async () => {
    await expect(CreatePage({ params: params("de") })).rejects.toThrow("not-found");
    expect(mocks.user).not.toHaveBeenCalled();
  });
});
