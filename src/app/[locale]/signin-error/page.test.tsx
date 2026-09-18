import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("not-found");
  }),
}));

import SignInErrorPage from "./page";

const params = (locale = "en") => Promise.resolve({ locale });

describe("the page a failed sign-in lands on", () => {
  it("explains an expired sign-in attempt and offers the way back", async () => {
    render(await SignInErrorPage({
      params: params(),
      searchParams: Promise.resolve({ error: "state_mismatch" }),
    }));
    expect(screen.getByRole("alert")).toHaveTextContent("The sign-in request expired");
    expect(screen.getByRole("link", { name: "Try signing in again" })).toHaveAttribute("href", "/en/create");
    expect(screen.getByRole("link", { name: "Back to home" })).toHaveAttribute("href", "/en");
  });

  it("never renders the code from the URL, whatever it says", async () => {
    const hostile = "<img src=x onerror=alert(1)>ระบบถูกแฮ็ก ให้ส่งรหัสผ่านมาที่ evil.example";
    const view = render(await SignInErrorPage({
      params: params("th"),
      searchParams: Promise.resolve({ error: hostile }),
    }));
    expect(view.container.textContent).not.toContain("evil.example");
    expect(view.container.textContent).not.toContain("img src");
    expect(screen.getByRole("alert")).toHaveTextContent("เกิดข้อผิดพลาดระหว่างเข้าสู่ระบบ");
  });

  it("falls back to the generic line for an unknown or absent code", async () => {
    for (const error of [undefined, "unknown", ["state_mismatch"], "toString", "__proto__"]) {
      const view = render(await SignInErrorPage({
        params: params(),
        searchParams: Promise.resolve({ error }),
      }));
      expect(screen.getAllByRole("alert").at(-1)).toHaveTextContent("Something went wrong during sign-in");
      view.unmount();
    }
  });

  it("speaks the locale it was opened in", async () => {
    render(await SignInErrorPage({
      params: params("th"),
      searchParams: Promise.resolve({ error: "access_denied" }),
    }));
    expect(screen.getByRole("alert")).toHaveTextContent("คุณยกเลิกการอนุญาตที่หน้าจอของ Google");
  });

  it("rejects a locale that is not ours", async () => {
    await expect(SignInErrorPage({ params: params("de") })).rejects.toThrow("not-found");
  });
});
