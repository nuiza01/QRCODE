import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DEFAULT_STYLE } from "@/qr/types";

import { TestScanDialog } from "./TestScanDialog";
import { generatorStrings } from "./strings";

vi.mock("@/qr/render/QrPreview", () => ({
  QrPreview: () => <div data-testid="qr-preview" />,
}));

const payload = { type: "url", url: "https://example.invalid/test-scan" } as const;
let scopedStyle: HTMLStyleElement;

beforeEach(() => {
  // Component tests do not load Tailwind's generated stylesheet. Model the one
  // scoped descendant utility used by this assembly so role queries observe
  // the same display:none semantics as the browser.
  scopedStyle = document.createElement("style");
  scopedStyle.textContent = ".test-scan-dialog-card > h2 { display: none; }";
  document.head.append(scopedStyle);
});

afterEach(() => {
  scopedStyle.remove();
  vi.restoreAllMocks();
});

function renderDialog(locale: "th" | "en") {
  const s = generatorStrings[locale];
  render(
    <TestScanDialog
      payload={payload}
      style={DEFAULT_STYLE}
      symbolWidthMm={50}
      locale={locale}
      s={s}
    />,
  );
  return s;
}

describe("TestScanDialog semantics", () => {
  it.each(["th", "en"] as const)(
    "exposes one visible title and one intended close action in %s",
    async (locale) => {
      const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
      const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
      const user = userEvent.setup();
      const s = renderDialog(locale);

      await user.click(screen.getByRole("button", { name: s.testScan.open }));
      const dialog = await screen.findByRole("dialog", { name: s.testScan.dialogTitle });
      await waitFor(() => {
        expect(dialog.querySelector(".test-scan-dialog-card")).toHaveClass("[&>h2]:hidden");
      });

      const headings = within(dialog).getAllByRole("heading", { level: 2 });
      expect(headings).toHaveLength(1);
      expect(headings[0]).toBeVisible();
      expect(headings[0]).toHaveAccessibleName(s.testScan.dialogTitle);

      const closes = within(dialog).getAllByRole("button");
      expect(closes).toHaveLength(1);
      expect(closes[0]).toBeVisible();
      expect(closes[0]).toHaveAccessibleName(s.testScan.close);

      await waitFor(() => {
        expect(error).not.toHaveBeenCalled();
        expect(warn).not.toHaveBeenCalled();
      });
    },
  );

  it("keeps initial focus trapped, closes by Escape, and restores trigger focus", async () => {
    const user = userEvent.setup();
    const s = renderDialog("en");
    const trigger = screen.getByRole("button", { name: s.testScan.open });

    trigger.focus();
    await user.click(trigger);
    const dialog = await screen.findByRole("dialog", { name: s.testScan.dialogTitle });
    const close = await within(dialog).findByRole("button", { name: s.testScan.close });
    await waitFor(() => expect(close).toHaveFocus());

    await user.tab();
    expect(close).toHaveFocus();
    await user.tab({ shift: true });
    expect(close).toHaveFocus();

    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();

    await user.click(trigger);
    const reopened = await screen.findByRole("dialog", { name: s.testScan.dialogTitle });
    fireEvent.click(within(reopened).getByRole("button", { name: s.testScan.close }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();

    await user.click(trigger);
    await screen.findByRole("dialog", { name: s.testScan.dialogTitle });
    const overlay = document.querySelector<HTMLElement>('[data-slot="dialog-overlay"]');
    expect(overlay).not.toBeNull();
    fireEvent.pointerDown(overlay!, { button: 0, ctrlKey: false });
    fireEvent.click(overlay!);
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
  });
});
