import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CreateCta } from "./create-cta";

describe("the call to action that replaced the generator", () => {
  it("links into the gated generator and keeps the locale", () => {
    render(<CreateCta locale="en" />);
    const link = screen.getByRole("link", { name: "Open the QR generator" });
    expect(link).toHaveAttribute("href", "/en/create");
  });

  it("carries the type through, so signing in does not lose why the visitor came", () => {
    render(<CreateCta locale="th" typeSlug="promptpay" />);
    expect(screen.getByRole("link")).toHaveAttribute("href", "/th/create?type=promptpay");
  });

  it("escapes a slug rather than pasting it into the query", () => {
    render(<CreateCta locale="en" typeSlug="a b&c=d" />);
    expect(screen.getByRole("link")).toHaveAttribute("href", "/en/create?type=a%20b%26c%3Dd");
  });

  it("says why in the visitor's language", () => {
    const view = render(<CreateCta locale="th" />);
    expect(screen.getByText("เข้าสู่ระบบเพื่อสร้าง QR")).toBeInTheDocument();
    view.unmount();
    render(<CreateCta locale="en" />);
    expect(screen.getByText("Sign in to create a QR code")).toBeInTheDocument();
  });
});
