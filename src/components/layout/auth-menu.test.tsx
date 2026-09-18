import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { locales } from "@/i18n/config";

import { AuthMenuView, safeReturnPath } from "./auth-menu";
import { layoutStrings } from "./strings";

describe.each(locales)("AuthMenuView (%s)", (locale) => {
  const s = layoutStrings[locale].auth;

  it("offers optional Google sign-in without blocking anonymous use", () => {
    const onSignIn = vi.fn();
    render(
      <AuthMenuView
        locale={locale}
        onSignIn={onSignIn}
        onSignOut={vi.fn()}
      />,
    );

    const button = screen.getByRole("button", { name: s.signInWithGoogle });
    fireEvent.click(button);
    expect(onSignIn).toHaveBeenCalledOnce();
  });

  it("shows a minimal signed-in identity and a distinct sign-out control", () => {
    const onSignOut = vi.fn();
    render(
      <AuthMenuView
        locale={locale}
        onSignIn={vi.fn()}
        onSignOut={onSignOut}
        userName="Nexora User"
      />,
    );

    expect(
      screen.getByLabelText(s.signedInAs.replace("{name}", "Nexora User")),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: s.dashboard })).toHaveAttribute(
      "href",
      `/${locale}/dashboard`,
    );
    fireEvent.click(screen.getByRole("button", { name: s.signOut }));
    expect(onSignOut).toHaveBeenCalledOnce();
  });

  it("announces loading and fixed failures without exposing raw errors", () => {
    const { rerender } = render(
      <AuthMenuView
        busy
        locale={locale}
        onSignIn={vi.fn()}
        onSignOut={vi.fn()}
      />,
    );
    expect(screen.getByLabelText(s.loading)).toBeInTheDocument();

    rerender(
      <AuthMenuView
        error
        locale={locale}
        onSignIn={vi.fn()}
        onSignOut={vi.fn()}
      />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent(s.failed);
  });
});

describe("safeReturnPath", () => {
  it("keeps the visitor's own path and query so signing in does not lose their intent", () => {
    expect(safeReturnPath("th", "/th/create", "?type=promptpay")).toBe("/th/create?type=promptpay");
    expect(safeReturnPath("en", "/en")).toBe("/en");
    expect(safeReturnPath("en", "/en/qr/wifi")).toBe("/en/qr/wifi");
  });

  it("refuses anything that is not this locale's own path", () => {
    expect(safeReturnPath("th", "//evil.example/th")).toBe("/th");
    expect(safeReturnPath("th", "/thailand/create")).toBe("/th");
    expect(safeReturnPath("th", "/en/create")).toBe("/th");
    expect(safeReturnPath("th", "https://evil.example/th")).toBe("/th");
    expect(safeReturnPath("th", "")).toBe("/th");
  });

  it("ignores a query that is not one", () => {
    expect(safeReturnPath("en", "/en/create", "type=promptpay")).toBe("/en/create");
    expect(safeReturnPath("en", "/en/create", "#fragment")).toBe("/en/create");
  });
});
