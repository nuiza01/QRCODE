/**
 * Component tests for the generator.
 *
 * `@/qr/render` is partially mocked: `QrPreview` and `TestScanCard` are
 * replaced with stubs so the tests never reach `qr-code-styling`, which wants a
 * real canvas. Blob renderers are spies; encoding, validation, quality, print
 * guidance and filename helpers stay real. These are UI wiring/race tests,
 * not evidence that generated images decode in a browser.
 */
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { resolveQrMessage } from "@/qr/messages";
import { encodePayload } from "@/qr/payload/encode";
import { hasBlockingIssue, inspectStyle } from "@/qr/quality";
import { QrRenderError, type QrPreviewStatus, type QrRenderResult } from "@/qr/render";
import { eventPayloadSchema, promptPayPayloadSchema } from "@/qr/schemas";
import { DEFAULT_STYLE, type QrContentType, type QrPayload, type QrStyle } from "@/qr/types";

import { DownloadBar, type DownloadBarProps } from "./DownloadBar";
import { Generator } from "./Generator";
import { QualityPanel } from "./QualityPanel";
import { emptyDrafts } from "./drafts";
import { toIsoWithOffset, validateDraft } from "./payload";
import { qualityMessage } from "./qualityMessages";
import { generatorStrings } from "./strings";

const renderer = vi.hoisted(() => ({
  png: vi.fn(), svg: vi.fn(), pdf: vi.fn(),
  holdPreview: false,
  callbacks: [] as Array<() => void>,
  previewTargets: [] as Array<{
    revision: number;
    onStatus: (status: QrPreviewStatus) => void;
  }>,
}));

vi.mock("@/qr/render", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/qr/render")>();
  const { createElement, useEffect } = await import("react");

  const { encodePayload } = await import("@/qr/payload/encode");
  const { normalizeStyle } = await import("@/qr/quality");
  const QrPreview = ({ onRender, onStatus, payload, renderRevision, style }: {
    onRender?: (result: QrRenderResult) => void;
    onStatus?: (status: QrPreviewStatus) => void;
    payload: QrPayload;
    renderRevision?: number;
    style: QrStyle;
  }) => {
    useEffect(() => {
      const result: QrRenderResult = {
        moduleCount: 33,
        geometry: {
          marginPx: 31,
          dotSizePx: 7,
          symbolPx: 231,
          quietZonePx: 28,
          quietZoneModules: 4,
        },
        style: normalizeStyle(style),
        data: encodePayload(payload),
      };
      const report = () => {
        onRender?.(result);
        if (renderRevision !== undefined && onStatus) onStatus({
          revision: renderRevision,
          state: "success",
          moduleCount: result.moduleCount,
          quietZoneModules: result.geometry.quietZoneModules,
          effectiveEcc: result.style.ecc,
        });
      };
      if (renderRevision !== undefined && onStatus) {
        renderer.previewTargets.push({ revision: renderRevision, onStatus });
      }
      if (renderer.holdPreview) renderer.callbacks.push(report);
      else report();
    }, [onRender, onStatus, payload, renderRevision, style]);
    return createElement("div", {
      "data-testid": "qr-preview",
      "data-payload": JSON.stringify(payload),
      "data-render-revision": renderRevision,
    });
  };

  const TestScanCard = ({ payload }: { payload: QrPayload }) => createElement("div", {
    "data-testid": "test-scan-card", "data-payload": JSON.stringify(payload),
  });

  return {
    ...actual, QrPreview, TestScanCard,
    renderPngBlob: renderer.png, renderSvgString: renderer.svg, renderPdfBlob: renderer.pdf,
  };
});

let saved: Array<{ href: string; filename: string }>;
function syntheticRender(style: QrStyle = DEFAULT_STYLE): QrRenderResult {
  return {
    moduleCount: 33,
    geometry: {
      marginPx: 31, dotSizePx: 7, symbolPx: 231,
      quietZonePx: 28, quietZoneModules: 4,
    },
    style,
    data: "NQR041_RENDER_DATA",
  };
}

beforeEach(() => {
  renderer.png.mockReset().mockResolvedValue({ blob: new Blob(["png"]), render: syntheticRender() });
  renderer.svg.mockReset().mockResolvedValue({ svg: "<svg/>", render: syntheticRender() });
  renderer.pdf.mockReset().mockResolvedValue({
    blob: new Blob(["pdf"]), artworkWidthMm: 58, render: syntheticRender(),
  });
  renderer.holdPreview = false;
  renderer.callbacks = [];
  renderer.previewTargets = [];
  saved = [];
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => { callback(0); return 0; });
  Object.defineProperty(URL, "createObjectURL", { configurable: true, value: vi.fn(() => "blob:synthetic") });
  Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: vi.fn() });
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
    saved.push({ href: this.href, filename: this.download });
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

beforeAll(() => {
  // Radix's Slider and Select measure their own elements.
  if (!("ResizeObserver" in globalThis)) {
    globalThis.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    } as unknown as typeof ResizeObserver;
  }
  Object.defineProperty(Element.prototype, "scrollIntoView", {
    configurable: true,
    value: vi.fn(),
  });
});

const th = generatorStrings.th;
const en = generatorStrings.en;

function pngButton(locale: "th" | "en" = "th") {
  return screen.getByRole("button", {
    name: generatorStrings[locale].download.png,
  });
}

describe("Generator", () => {
  it("keeps the last valid preview but blocks all output for the current invalid draft", async () => {
    render(<Generator locale="en" initialType="wifi" />);
    fireEvent.change(screen.getByLabelText(en.fields.wifi.ssid.label), {
      target: { value: "NQR014_Cafe" },
    });
    fireEvent.change(screen.getByLabelText(en.fields.wifi.password.label), {
      target: { value: "synthetic-password" },
    });
    expect(pngButton("en")).toBeEnabled();
    fireEvent.change(screen.getByLabelText(en.fields.wifi.ssid.label), {
      target: { value: "" },
    });
    expect(await screen.findByTestId("qr-preview")).toBeInTheDocument();
    for (const kind of ["png", "svg", "pdf"] as const) {
      expect(screen.getByRole("button", { name: en.download[kind] })).toBeDisabled();
    }
    expect(screen.queryByRole("button", { name: en.testScan.open })).not.toBeInTheDocument();
  });

  it("shows English quality errors on the English generator", () => {
    render(<Generator locale="en" />);
    fireEvent.change(screen.getByLabelText(en.style.hexLabel(en.style.fgColor)), {
      target: { value: "#ffffff" },
    });
    expect(screen.getByText(/Contrast is below the minimum/)).toBeInTheDocument();
    expect(screen.queryByText(/สีจุดกับสีพื้นตัดกันน้อยเกินไป/)).not.toBeInTheDocument();
  });

  it("closes a stale scan dialog on invalid input and on a new valid payload", async () => {
    render(<Generator locale="en" />);
    const input = screen.getByLabelText(en.fields.url.url.label);
    fireEvent.change(input, { target: { value: "https://example.com/old" } });
    fireEvent.click(screen.getByRole("button", { name: en.testScan.open }));
    expect(await screen.findByTestId("test-scan-card")).toHaveAttribute("data-payload", JSON.stringify({ type: "url", url: "https://example.com/old" }));
    fireEvent.change(input, { target: { value: "invalid" } });
    expect(screen.queryByTestId("test-scan-card")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: en.testScan.open })).not.toBeInTheDocument();
    fireEvent.change(input, { target: { value: "https://example.com/current" } });
    fireEvent.click(screen.getByRole("button", { name: en.testScan.open }));
    expect(screen.getByTestId("test-scan-card")).toHaveAttribute("data-payload", JSON.stringify({ type: "url", url: "https://example.com/current" }));
    fireEvent.change(input, { target: { value: "https://example.com/newer" } });
    expect(screen.queryByTestId("test-scan-card")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: en.testScan.open }));
    expect(screen.getByTestId("test-scan-card")).toHaveAttribute("data-payload", JSON.stringify({ type: "url", url: "https://example.com/newer" }));
  });

  it("does not authorize another type's saved preview after switching tabs", () => {
    render(<Generator locale="en" />);
    fireEvent.change(screen.getByLabelText(en.fields.url.url.label), { target: { value: "https://example.com/old" } });
    fireEvent.change(screen.getByLabelText(en.fields.url.url.label), { target: { value: "" } });
    fireEvent.mouseDown(screen.getByRole("tab", { name: en.typeLabel.tel }), { button: 0, ctrlKey: false });
    fireEvent.change(screen.getByLabelText(en.fields.tel.phone.label, { selector: "input" }), { target: { value: "+12025550123" } });
    expect(pngButton("en")).toBeEnabled();
    fireEvent.mouseDown(screen.getByRole("tab", { name: en.typeLabel.url }), { button: 0, ctrlKey: false });
    expect(pngButton("en")).toBeDisabled();
    expect(screen.getByTestId("qr-preview")).toHaveAttribute("data-payload", JSON.stringify({ type: "url", url: "https://example.com/old" }));
    expect(screen.queryByRole("button", { name: en.testScan.open })).not.toBeInTheDocument();
  });

  it("cancels an in-flight export when the form becomes invalid, then exports recovery", async () => {
    const job = deferred<{ blob: Blob }>();
    renderer.png.mockReturnValueOnce(job.promise);
    render(<Generator locale="en" />);
    const input = screen.getByLabelText(en.fields.url.url.label);
    fireEvent.change(input, { target: { value: "https://example.com/old" } });
    fireEvent.click(pngButton("en"));
    fireEvent.change(input, { target: { value: "javascript:alert(1)" } });
    await act(async () => { job.resolve({ blob: new Blob(["old"]) }); });
    expect(saved).toHaveLength(0);
    expect(pngButton("en")).toBeDisabled();
    fireEvent.change(input, { target: { value: "https://example.com/current" } });
    fireEvent.click(pngButton("en"));
    await waitFor(() => expect(saved).toHaveLength(1));
    expect(renderer.png).toHaveBeenLastCalledWith(expect.objectContaining({
      payload: { type: "url", url: "https://example.com/current" },
    }));
  });

  it("keeps the type switcher visible even when it opens on a given type", () => {
    render(<Generator locale="th" initialType="wifi" />);

    expect(screen.getByLabelText(th.fields.wifi.ssid.label)).toBeInTheDocument();
    // All ten tabs are still there — a user who landed on the WiFi page and
    // then wants a vCard must not have to navigate away.
    expect(screen.getByRole("tab", { name: th.typeLabel.vcard })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: th.typeLabel.promptpay })).toBeInTheDocument();
  });

  it("blocks download until there is a payload, then allows it", async () => {
    render(<Generator locale="th" />);

    expect(pngButton()).toBeDisabled();
    expect(screen.getByText(th.download.needsPayload)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(th.fields.url.url.label), {
      target: { value: "https://example.com" },
    });

    await waitFor(() => expect(pngButton()).toBeEnabled());
  });

  it("surfaces the zod schema's own message for a bad URL", async () => {
    render(<Generator locale="th" />);

    const input = screen.getByLabelText(th.fields.url.url.label);
    fireEvent.change(input, { target: { value: "javascript:alert(1)" } });
    fireEvent.blur(input);

    // The rule comes from `safeUrlSchema` in src/qr/schemas.ts, which emits the
    // code "url.protocol"; the sentence comes from src/qr/messages.ts.
    await waitFor(() =>
      expect(screen.getByText(resolveQrMessage("url.protocol", "th"))).toBeInTheDocument(),
    );
    expect(screen.getByText("รองรับเฉพาะลิงก์ http:// และ https:// เท่านั้น")).toBeInTheDocument();
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(pngButton()).toBeDisabled();
  });

  it("disables every download button when a quality rule is blocking", async () => {
    render(<Generator locale="th" />);

    fireEvent.change(screen.getByLabelText(th.fields.url.url.label), {
      target: { value: "https://example.com" },
    });
    await waitFor(() => expect(pngButton()).toBeEnabled());

    // White modules on a white background: contrast 1:1, which `inspectStyle`
    // reports as an error and `hasBlockingIssue` therefore blocks.
    fireEvent.change(screen.getByLabelText(th.style.hexLabel(th.style.fgColor)), {
      target: { value: "#ffffff" },
    });

    await waitFor(() => expect(pngButton()).toBeDisabled());
    expect(screen.getByRole("button", { name: th.download.svg })).toBeDisabled();
    expect(screen.getByRole("button", { name: th.download.pdf })).toBeDisabled();
    expect(screen.getAllByText(th.quality.blockedBody).length).toBeGreaterThan(0);
  });

  it("announces quality issues politely, not assertively", async () => {
    render(<Generator locale="th" />);

    const status = screen
      .getAllByRole("status")
      .find((node) => node.textContent?.includes(th.quality.allClear));

    expect(status).toBeDefined();
    expect(status).toHaveAttribute("aria-live", "polite");
    // Nothing in the live quality panel may be assertive: it re-runs on every
    // keystroke and would make a screen reader interrupt itself continuously.
    expect(status?.querySelector('[role="alert"]')).toBeNull();
  });

  it("switches PromptPay messaging between reusable and single-use", async () => {
    render(<Generator locale="th" initialType="promptpay" />);

    expect(screen.getByText(th.fields.promptpay.reusable.title)).toBeInTheDocument();
    expect(
      screen.queryByText(th.fields.promptpay.singleUse.title),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByLabelText(th.fields.promptpay.withAmount.label));

    await waitFor(() =>
      expect(screen.getByText(th.fields.promptpay.singleUse.title)).toBeInTheDocument(),
    );
    expect(screen.queryByText(th.fields.promptpay.reusable.title)).not.toBeInTheDocument();
    // The amount field only exists once the toggle is on.
    expect(screen.getByLabelText(th.fields.promptpay.amount.label)).toBeInTheDocument();
  });

  it("warns that a national ID is readable from the code, without blocking it", async () => {
    render(<Generator locale="th" initialType="promptpay" />);

    // Mobile is the default target and carries no such warning.
    expect(
      screen.queryByText(th.fields.promptpay.nationalIdPrivacy.title),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByLabelText(th.promptPayTarget.nationalId));

    // Present before an ID has been typed — the point is to reach the user
    // while the choice is still cheap to change.
    await waitFor(() =>
      expect(
        screen.getByText(th.fields.promptpay.nationalIdPrivacy.title),
      ).toBeInTheDocument(),
    );
    expect(
      screen.getByText(th.fields.promptpay.nationalIdPrivacy.body),
    ).toBeInTheDocument();

    // A warning, not a block: a valid 13-digit ID still exports.
    fireEvent.change(screen.getByLabelText(th.fields.promptpay.target.nationalId.label), {
      target: { value: "1234567890123" },
    });
    await waitFor(() => expect(pngButton()).toBeEnabled());
    expect(
      screen.getByText(th.fields.promptpay.nationalIdPrivacy.title),
    ).toBeInTheDocument();

    // And it goes away again when the target type changes back.
    fireEvent.click(screen.getByLabelText(th.promptPayTarget.mobile));
    await waitFor(() =>
      expect(
        screen.queryByText(th.fields.promptpay.nationalIdPrivacy.title),
      ).not.toBeInTheDocument(),
    );
  });

  it("shows the national-ID privacy warning in English too", async () => {
    render(<Generator locale="en" initialType="promptpay" />);

    fireEvent.click(screen.getByLabelText(en.promptPayTarget.nationalId));

    await waitFor(() =>
      expect(
        screen.getByText("Your national ID is readable from this code"),
      ).toBeInTheDocument(),
    );
  });

  it("reports a PromptPay target that passes the schema but cannot encode", async () => {
    render(<Generator locale="th" initialType="promptpay" />);

    fireEvent.click(screen.getByLabelText(th.promptPayTarget.nationalId));

    const target = screen.getByLabelText(th.fields.promptpay.target.nationalId.label);
    // Ten digits: long enough for `promptPayPayloadSchema` (min 9), but
    // `normalizePromptPayTarget` requires exactly 13 and throws.
    fireEvent.change(target, { target: { value: "1234567890" } });
    fireEvent.blur(target);

    await waitFor(() =>
      expect(
        screen.getByText("เลขประจำตัวประชาชน/เลขผู้เสียภาษีต้องมี 13 หลัก"),
      ).toBeInTheDocument(),
    );
    expect(pngButton()).toBeDisabled();
  });

  it("shows validation messages in English on the English locale", async () => {
    render(<Generator locale="en" />);

    const input = screen.getByLabelText(en.fields.url.url.label);
    fireEvent.change(input, { target: { value: "javascript:alert(1)" } });
    fireEvent.blur(input);

    await waitFor(() =>
      expect(
        screen.getByText("Only http:// and https:// links are supported."),
      ).toBeInTheDocument(),
    );
    expect(pngButton("en")).toBeDisabled();
  });

  it("localizes a PromptPay digit-count failure per locale", async () => {
    const { unmount } = render(<Generator locale="en" initialType="promptpay" />);

    fireEvent.click(screen.getByLabelText(en.promptPayTarget.nationalId));
    const target = screen.getByLabelText(en.fields.promptpay.target.nationalId.label);
    fireEvent.change(target, { target: { value: "1234567890" } });
    fireEvent.blur(target);

    await waitFor(() =>
      expect(
        screen.getByText("A national ID or tax ID must be 13 digits."),
      ).toBeInTheDocument(),
    );
    unmount();

    render(<Generator locale="th" initialType="promptpay" />);
    fireEvent.click(screen.getByLabelText(th.promptPayTarget.ewallet));
    const thaiTarget = screen.getByLabelText(th.fields.promptpay.target.ewallet.label);
    // Twelve digits: past the 9-character floor, so the object parses and the
    // superRefine gets to run; still not the 15 an e-wallet needs.
    fireEvent.change(thaiTarget, { target: { value: "123456789012" } });
    fireEvent.blur(thaiTarget);

    await waitFor(() =>
      expect(screen.getByText("หมายเลข e-Wallet ต้องมี 15 หลัก")).toBeInTheDocument(),
    );
  });

  it("accepts an event typed into a datetime-local input", async () => {
    render(<Generator locale="th" initialType="event" />);

    fireEvent.change(screen.getByLabelText(th.fields.event.title.label), {
      target: { value: "งานเปิดร้าน" },
    });
    fireEvent.change(screen.getByLabelText(th.fields.event.start.label), {
      target: { value: "2026-08-19T14:30" },
    });

    // Enabled downloads mean `eventPayloadSchema` accepted the value, which it
    // only does for an ISO string carrying a UTC offset.
    await waitFor(() => expect(pngButton()).toBeEnabled());
  });
});

function latestPreviewTarget() {
  const target = renderer.previewTargets.at(-1);
  if (!target) throw new Error("Generator did not provide preview status wiring");
  return target;
}

function reportPreviewError(
  target: ReturnType<typeof latestPreviewTarget>,
  code: "capacity-exceeded" | "render-failed",
) {
  act(() => target.onStatus({ revision: target.revision, state: "error", code }));
}

const capacityCopy = {
  th: {
    title: "ข้อมูลมากเกินความจุของ QR",
    reduce: "ลดปริมาณข้อมูลแล้วลองอีกครั้ง",
    lower: "ลองลดระดับการกู้คืนข้อผิดพลาด (ECC)",
  },
  en: {
    title: "The content exceeds QR capacity",
    reduce: "Shorten the content and try again.",
    lower: "You can also lower the error correction level (ECC).",
    logo: "Shorten the content or remove the logo, then try again.",
  },
} as const;

describe.each(["th", "en"] as const)("current capacity eligibility (%s)", (locale) => {
  const s = generatorStrings[locale];

  it("blocks only exact-current overflow and revokes it on valid→overflow→same-valid recovery", () => {
    render(<Generator locale={locale} initialType="text" />);
    const input = screen.getByLabelText(s.fields.text.text.label, { selector: "textarea" });
    const expanded = locale === "th" ? "ก".repeat(1200) : "A".repeat(1200);
    fireEvent.change(input, { target: { value: expanded } });
    const overflow = latestPreviewTarget();
    reportPreviewError(overflow, "capacity-exceeded");
    const alert = screen.getByTestId("capacity-guidance");
    expect(alert).toHaveAttribute("role", "alert");
    expect(alert).toHaveTextContent(capacityCopy[locale].title);
    expect(alert).toHaveTextContent(capacityCopy[locale].reduce);
    expect(alert).toHaveTextContent(capacityCopy[locale].lower);
    for (const kind of ["png", "svg", "pdf"] as const) {
      expect(screen.getByRole("button", { name: s.download[kind] })).toBeDisabled();
    }
    expect(screen.queryByRole("button", { name: s.testScan.open })).not.toBeInTheDocument();

    fireEvent.change(input, { target: { value: "same-valid" } });
    const recovered = latestPreviewTarget();
    expect(recovered.revision).toBeGreaterThan(overflow.revision);
    expect(pngButton(locale)).toBeEnabled();
    expect(screen.getByRole("button", { name: s.testScan.open })).toBeEnabled();
    reportPreviewError(overflow, "capacity-exceeded");
    expect(pngButton(locale)).toBeEnabled();

    fireEvent.change(input, { target: { value: expanded } });
    reportPreviewError(latestPreviewTarget(), "capacity-exceeded");
    fireEvent.change(input, { target: { value: "same-valid" } });
    expect(latestPreviewTarget().revision).toBeGreaterThan(recovered.revision);
    expect(screen.queryByTestId("capacity-guidance")).not.toBeInTheDocument();
  });

  it("keeps a generic current preview failure local", () => {
    render(<Generator locale={locale} initialType="text" />);
    fireEvent.change(screen.getByLabelText(s.fields.text.text.label, { selector: "textarea" }), {
      target: { value: "NQR041_GENERIC_PREVIEW" },
    });
    reportPreviewError(latestPreviewTarget(), "render-failed");
    expect(screen.queryByTestId("capacity-guidance")).not.toBeInTheDocument();
    expect(pngButton(locale)).toBeEnabled();
    expect(screen.getByRole("button", { name: s.testScan.open })).toBeEnabled();
  });

  it.each(["vcard", "event"] as const)("blocks expanded structured %s without retaining its marker in status UI", (type) => {
    render(<Generator locale={locale} initialType={type} />);
    if (type === "vcard") {
      fireEvent.change(screen.getByLabelText(s.fields.vcard.firstName.label), {
        target: { value: "NQR041_STRUCTURED_PRIVATE" },
      });
      fireEvent.change(screen.getByLabelText(new RegExp(s.fields.vcard.note.label)), {
        target: { value: "N".repeat(256) },
      });
    } else {
      fireEvent.change(screen.getByLabelText(s.fields.event.title.label), {
        target: { value: "NQR041_STRUCTURED_PRIVATE" },
      });
      fireEvent.change(screen.getByLabelText(s.fields.event.start.label), {
        target: { value: "2026-08-30T12:00" },
      });
      fireEvent.change(screen.getByLabelText(new RegExp(s.fields.event.description.label)), {
        target: { value: "N".repeat(800) },
      });
    }
    reportPreviewError(latestPreviewTarget(), "capacity-exceeded");
    const alert = screen.getByTestId("capacity-guidance");
    expect(alert).toHaveTextContent(capacityCopy[locale].title);
    expect(alert).not.toHaveTextContent("NQR041_STRUCTURED_PRIVATE");
    expect(alert.innerHTML).not.toContain("data:image");
  });
});

describe("capacity revision and export races", () => {
  it("advances for admission, style and type but not locale-only copy", () => {
    const view = render(<Generator locale="en" initialType="text" />);
    const input = screen.getByLabelText(en.fields.text.text.label, { selector: "textarea" });
    fireEvent.change(input, { target: { value: "same-valid" } });
    const valid = latestPreviewTarget().revision;
    fireEvent.change(input, { target: { value: "" } });
    const invalid = latestPreviewTarget().revision;
    fireEvent.change(input, { target: { value: "same-valid" } });
    const recovered = latestPreviewTarget().revision;
    expect(invalid).toBeGreaterThan(valid);
    expect(recovered).toBeGreaterThan(invalid);
    fireEvent.change(screen.getByLabelText(en.style.hexLabel(en.style.fgColor)), {
      target: { value: "#111111" },
    });
    const styled = latestPreviewTarget().revision;
    expect(styled).toBeGreaterThan(recovered);
    fireEvent.mouseDown(screen.getByRole("tab", { name: en.typeLabel.url }), {
      button: 0, ctrlKey: false,
    });
    expect(screen.queryByTestId("qr-preview")).not.toBeInTheDocument();
    fireEvent.mouseDown(screen.getByRole("tab", { name: en.typeLabel.text }), {
      button: 0, ctrlKey: false,
    });
    const typed = latestPreviewTarget().revision;
    expect(typed).toBeGreaterThan(styled);
    view.rerender(<Generator locale="th" initialType="text" />);
    expect(screen.getByTestId("qr-preview")).toHaveAttribute(
      "data-render-revision", String(typed),
    );
  });

  it("advances for ECC/logo changes and never offers lower ECC while a logo forces H", async () => {
    render(<Generator locale="en" initialType="text" />);
    fireEvent.change(screen.getByLabelText(en.fields.text.text.label, { selector: "textarea" }), {
      target: { value: "NQR041_CURRENT" },
    });
    const initial = latestPreviewTarget().revision;
    fireEvent.click(screen.getByLabelText(en.style.ecc));
    fireEvent.click(await screen.findByRole("option", { name: en.style.eccOption.L }));
    const eccTarget = latestPreviewTarget();
    const ecc = eccTarget.revision;
    expect(ecc).toBeGreaterThan(initial);
    reportPreviewError(eccTarget, "capacity-exceeded");
    expect(screen.getByTestId("capacity-guidance")).not.toHaveTextContent(capacityCopy.en.lower);

    vi.spyOn(FileReader.prototype, "readAsDataURL").mockImplementation(function (this: FileReader) {
      Object.defineProperty(this, "result", {
        configurable: true,
        value: "data:image/png;base64,NQR041_LOGO_PRIVATE",
      });
      this.onload?.(new ProgressEvent("load") as ProgressEvent<FileReader>);
    });
    fireEvent.change(screen.getByLabelText(en.style.logoFile), {
      target: { files: [new File(["logo"], "logo.png", { type: "image/png" })] },
    });
    const logo = latestPreviewTarget();
    expect(logo.revision).toBeGreaterThan(ecc);
    reportPreviewError(logo, "capacity-exceeded");
    const alert = screen.getByTestId("capacity-guidance");
    expect(alert).toHaveTextContent(capacityCopy.en.logo);
    expect(alert).not.toHaveTextContent(capacityCopy.en.lower);
    expect(alert.innerHTML).not.toContain("NQR041_LOGO_PRIVATE");

    fireEvent.click(screen.getByRole("button", { name: en.style.logoRemove }));
    expect(latestPreviewTarget().revision).toBeGreaterThan(logo.revision);
    expect(screen.queryByTestId("capacity-guidance")).not.toBeInTheDocument();
  });

  it.each(["png", "svg", "pdf"] as const)("reports current %s capacity without stale save/raw UI and ignores unmount", async (kind) => {
    const onStatus = vi.fn();
    const props = { ...downloadProps(), renderRevision: 41, capacityBlocked: false, onStatus };
    renderer[kind].mockRejectedValueOnce(new QrRenderError("capacity-exceeded"));
    const view = render(<DownloadBar {...props} />);
    fireEvent.click(screen.getByRole("button", { name: en.download[kind] }));
    await waitFor(() => expect(onStatus).toHaveBeenCalledWith({
      revision: 41, state: "error", code: "capacity-exceeded",
    }));
    expect(saved).toHaveLength(0);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();

    const stale = deferred<never>();
    renderer[kind].mockReturnValueOnce(stale.promise);
    view.rerender(<DownloadBar {...props} renderRevision={42} />);
    fireEvent.click(screen.getByRole("button", { name: en.download[kind] }));
    view.unmount();
    await act(async () => stale.reject(new QrRenderError("capacity-exceeded")));
    expect(onStatus).toHaveBeenCalledTimes(1);
  });

  it("lets pending fresh export success clear capacity while old callbacks stay stale", async () => {
    renderer.holdPreview = true;
    render(<Generator locale="en" initialType="text" />);
    fireEvent.change(screen.getByLabelText(en.fields.text.text.label, { selector: "textarea" }), {
      target: { value: "NQR041_CURRENT" },
    });
    const old = latestPreviewTarget();
    reportPreviewError(old, "capacity-exceeded");
    fireEvent.change(screen.getByLabelText(en.style.hexLabel(en.style.fgColor)), {
      target: { value: "#111111" },
    });
    expect(latestPreviewTarget().revision).toBeGreaterThan(old.revision);
    expect(pngButton("en")).toBeEnabled();
    fireEvent.click(pngButton("en"));
    await waitFor(() => expect(saved).toHaveLength(1));
    reportPreviewError(old, "capacity-exceeded");
    expect(pngButton("en")).toBeEnabled();
    expect(screen.queryByTestId("capacity-guidance")).not.toBeInTheDocument();
  });

  it("lets a pending fresh export report exact-current capacity to Generator", async () => {
    renderer.holdPreview = true;
    render(<Generator locale="en" initialType="text" />);
    fireEvent.change(screen.getByLabelText(en.fields.text.text.label, { selector: "textarea" }), {
      target: { value: "NQR041_EXPORT_CAPACITY" },
    });
    renderer.png.mockRejectedValueOnce(new QrRenderError("capacity-exceeded"));
    expect(pngButton("en")).toBeEnabled();
    fireEvent.click(pngButton("en"));
    await waitFor(() => expect(screen.getByTestId("capacity-guidance")).toHaveTextContent(
      capacityCopy.en.title,
    ));
    for (const kind of ["png", "svg", "pdf"] as const) {
      expect(screen.getByRole("button", { name: en.download[kind] })).toBeDisabled();
    }
    expect(screen.queryByRole("button", { name: en.testScan.open })).not.toBeInTheDocument();
    expect(saved).toHaveLength(0);

    fireEvent.change(screen.getByLabelText(en.fields.text.text.label, { selector: "textarea" }), {
      target: { value: "NQR041_EXPORT_RECOVERY" },
    });
    expect(pngButton("en")).toBeEnabled();
    expect(screen.queryByTestId("capacity-guidance")).not.toBeInTheDocument();
  });
});

describe.each(["th", "en"] as const)("current payload eligibility (%s)", (locale) => {
  const s = generatorStrings[locale];
  const f = s.fields;
  const fixtures: Array<{
    type: QrContentType;
    inputs: Array<[string, string]>;
    field: string;
    invalid: string;
    recovery: string;
    expected: Partial<QrPayload>;
  }> = [
    { type: "url", inputs: [[f.url.url.label, "https://example.com/old"]], field: f.url.url.label,
      invalid: "javascript:alert(1)", recovery: "https://example.com/current", expected: { url: "https://example.com/current" } },
    { type: "text", inputs: [[f.text.text.label, "old"]], field: f.text.text.label,
      invalid: "", recovery: "current ไทย", expected: { text: "current ไทย" } },
    { type: "wifi", inputs: [[f.wifi.ssid.label, "old"], [f.wifi.password.label, "synthetic"]], field: f.wifi.ssid.label,
      invalid: "", recovery: "current", expected: { ssid: "current", password: "synthetic" } },
    { type: "vcard", inputs: [[f.vcard.firstName.label, "old"]], field: f.vcard.firstName.label,
      invalid: "", recovery: "current", expected: { firstName: "current" } },
    { type: "email", inputs: [[f.email.to.label, "old@example.com"]], field: f.email.to.label,
      invalid: "bad-email", recovery: "current@example.com", expected: { to: "current@example.com" } },
    { type: "sms", inputs: [[f.sms.phone.label, "+12025550123"]], field: f.sms.phone.label,
      invalid: "", recovery: "+12025550124", expected: { phone: "+12025550124" } },
    { type: "tel", inputs: [[f.tel.phone.label, "+12025550123"]], field: f.tel.phone.label,
      invalid: "", recovery: "+12025550124", expected: { phone: "+12025550124" } },
    { type: "geo", inputs: [[f.geo.latitude.label, "0"], [f.geo.longitude.label, "0"]], field: f.geo.latitude.label,
      invalid: "91", recovery: "-90", expected: { latitude: -90, longitude: 0 } },
    { type: "event", inputs: [[f.event.title.label, "old"], [f.event.start.label, "2026-09-01T10:00"]], field: f.event.title.label,
      invalid: "", recovery: "current", expected: { title: "current" } },
    { type: "promptpay", inputs: [[f.promptpay.target.mobile.label, "0800000000"]], field: f.promptpay.target.mobile.label,
      invalid: "123", recovery: "0800000001", expected: { target: "0800000001" } },
  ];

  it.each(fixtures)("$type: blocks invalid and exports only recovery, even with preview pending", async (fixture) => {
    renderer.holdPreview = true;
    render(<Generator locale={locale} initialType={fixture.type} />);
    for (const [label, value] of fixture.inputs) {
      fireEvent.change(screen.getByLabelText(label, { selector: "input,textarea" }), { target: { value } });
    }
    expect(pngButton(locale)).toBeEnabled();
    const previous = screen.getByTestId("qr-preview").getAttribute("data-payload");
    fireEvent.change(screen.getByLabelText(fixture.field, { selector: "input,textarea" }), { target: { value: fixture.invalid } });
    expect(screen.getByTestId("qr-preview")).toHaveAttribute("data-payload", previous);
    // Even a late preview notification must not re-enable invalid output.
    act(() => { renderer.callbacks.forEach((report) => report()); });
    for (const kind of ["png", "svg", "pdf"] as const) {
      const button = screen.getByRole("button", { name: s.download[kind] });
      expect(button).toBeDisabled();
      fireEvent.click(button);
      expect(renderer[kind]).not.toHaveBeenCalled();
    }
    expect(screen.queryByRole("button", { name: s.testScan.open })).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(fixture.field, { selector: "input,textarea" }), { target: { value: fixture.recovery } });

    // No preview completion is required to export: the renderer receives the
    // validated current payload, never preview DOM or a debounced snapshot.
    for (const kind of ["png", "svg", "pdf"] as const) {
      fireEvent.click(screen.getByRole("button", { name: s.download[kind] }));
      await waitFor(() => expect(pngButton(locale)).toBeEnabled());
      expect(renderer[kind]).toHaveBeenLastCalledWith(expect.objectContaining({
        payload: expect.objectContaining({ type: fixture.type, ...fixture.expected }),
      }));
    }
    expect(saved).toHaveLength(3);
    fireEvent.click(screen.getByRole("button", { name: s.testScan.open }));
    expect(JSON.parse(screen.getByTestId("test-scan-card").getAttribute("data-payload")!))
      .toMatchObject({ type: fixture.type, ...fixture.expected });
  });
});

function downloadProps(): DownloadBarProps {
  return {
    payload: { type: "text", text: "old" }, style: DEFAULT_STYLE,
    blocked: false, pngSize: 1024, onPngSizeChange: vi.fn(),
    pdfSymbolWidthMm: 50, s: en,
  };
}

describe.each(["th", "en"] as const)("WiFi password preservation (%s)", (locale) => {
  const s = generatorStrings[locale];
  const raw63 = ` ${"S".repeat(61)} `;
  const raw64 = ` ${"S".repeat(62)} `;
  const fixtures = [
    { name: "outer spaces", raw: " SYNpass1 " },
    { name: "outer and internal TAB", raw: "\tSYN\tpass\t" },
    { name: "outer and internal CR", raw: "\rSYN\rpass\r" },
    { name: "outer and internal LF", raw: "\nSYN\npass\n" },
    { name: "outer and internal CRLF", raw: "\r\nSYN\r\npass\r\n" },
    { name: "mixed whitespace and accepted controls", raw: " \t\r\nSYN\u0000\u007f pass\t\r\n " },
    { name: "internal whitespace", raw: "SYN pass\tmid\r\nend" },
    { name: "escaped delimiters", raw: ' SYN\\;,:"pass ', encoded: String.raw` SYN\\\;\,\:\"pass ` },
    { name: "63 raw characters", raw: raw63 },
  ];

  async function expectRenderInputs(payload: QrPayload) {
    render(<DownloadBar {...downloadProps()} payload={payload} s={s} />);
    for (const kind of ["png", "svg", "pdf"] as const) {
      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: s.download[kind] }));
      });
      await waitFor(() => expect(renderer[kind]).toHaveBeenCalledTimes(1));
      expect(renderer[kind].mock.lastCall?.[0].payload).toBe(payload);
    }
    expect(saved.map(({ filename }) => filename)).toEqual([
      "nexora-qr-wifi-1024.png", "nexora-qr-wifi.svg", "nexora-qr-wifi-58mm.pdf",
    ]);
  }

  describe.each(["WPA", "WEP"] as const)("%s", (encryption) => {
    // Direct draft API fixtures deliberately include CR/LF. A native single-line
    // input may remove them before onChange; these tests do not claim otherwise.
    it.each(fixtures)("preserves $name through validation, WiFi P encoding and render input", async ({ raw, encoded }) => {
      const draft = { ...emptyDrafts().wifi, ssid: "SYN", encryption, password: raw };
      const result = validateDraft("wifi", draft, s.errors, locale);
      expect(result.errors).toEqual({});
      expect(result.payload).toEqual({
        type: "wifi", ssid: "SYN", encryption, password: raw, hidden: false,
      });
      expect(draft.password).toBe(raw);
      const wire = encodePayload(result.payload!);
      const expected = `WIFI:T:${encryption};S:SYN;P:${encoded ?? raw};;`;
      expect(wire).toBe(expected);
      expect(new TextEncoder().encode(wire)).toEqual(new TextEncoder().encode(expected));
      await expectRenderInputs(result.payload!);
    });

    it.each([
      { name: "empty", raw: "" },
      { name: "spaces", raw: "   " },
      { name: "TAB", raw: "\t" },
      { name: "CRLF", raw: "\r\n" },
      { name: "mixed whitespace", raw: " \t\r\n " },
    ])("keeps rejecting $name with the existing required-password message", ({ raw }) => {
      const result = validateDraft("wifi", {
        ...emptyDrafts().wifi, ssid: "SYN", encryption, password: raw,
      }, s.errors, locale);
      expect(result.payload).toBeNull();
      expect(result.errors).toEqual({ password: resolveQrMessage("wifi.password.required", locale) });
    });

    it.each([
      { name: "64 raw characters that trim to 62", raw: raw64 },
      { name: "64 nonblank characters", raw: "S".repeat(64) },
    ])("rejects $name with the existing length message", ({ raw }) => {
      expect(raw).toHaveLength(64);
      const result = validateDraft("wifi", {
        ...emptyDrafts().wifi, ssid: "SYN", encryption, password: raw,
      }, s.errors, locale);
      expect(result.payload).toBeNull();
      expect(result.errors).toEqual({ password: resolveQrMessage("common.tooLong", locale) });
    });
  });

  it.each([
    { name: "empty", raw: "" },
    { name: "whitespace only", raw: " \t\r\n " },
    { name: "mixed controls and delimiters", raw: ' \tSYN\r\n\\;,:"\u0000\u007f ' },
    { name: "64 raw characters", raw: raw64 },
  ])("nopass omits $name from validated payload, WiFi P encoding and render input", async ({ raw }) => {
    const result = validateDraft("wifi", {
      ...emptyDrafts().wifi, ssid: "SYN", encryption: "nopass", password: raw,
    }, s.errors, locale);
    expect(result.errors).toEqual({});
    expect(result.payload).toEqual({
      type: "wifi", ssid: "SYN", encryption: "nopass", password: undefined, hidden: false,
    });
    expect(encodePayload(result.payload!)).toBe("WIFI:T:nopass;S:SYN;;");
    await expectRenderInputs(result.payload!);
  });

  it("keeps ordinary spaces in the form preview and exports only the valid 63-character recovery", async () => {
    render(<Generator locale={locale} initialType="wifi" />);
    fireEvent.change(screen.getByLabelText(s.fields.wifi.ssid.label), { target: { value: "SYN" } });
    const input = screen.getByLabelText(s.fields.wifi.password.label);
    fireEvent.change(input, { target: { value: " SYNpass1 " } });
    const preview = screen.getByTestId("qr-preview");
    expect(JSON.parse(preview.getAttribute("data-payload")!)).toMatchObject({ password: " SYNpass1 " });

    for (const invalid of ["   ", raw64]) {
      fireEvent.change(input, { target: { value: invalid } });
      fireEvent.blur(input);
      expect(screen.getByText(resolveQrMessage(
        invalid === raw64 ? "common.tooLong" : "wifi.password.required", locale,
      ))).toBeInTheDocument();
      for (const kind of ["png", "svg", "pdf"] as const) {
        expect(screen.getByRole("button", { name: s.download[kind] })).toBeDisabled();
      }
      expect(JSON.parse(preview.getAttribute("data-payload")!)).toMatchObject({ password: " SYNpass1 " });
    }

    fireEvent.change(input, { target: { value: raw63 } });
    expect(input).toHaveValue(raw63);
    for (const kind of ["png", "svg", "pdf"] as const) {
      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: s.download[kind] }));
      });
      const payload = renderer[kind].mock.lastCall?.[0].payload;
      expect(payload).toMatchObject({ type: "wifi", password: raw63 });
      expect(encodePayload(payload)).toBe(`WIFI:T:WPA;S:SYN;P:${raw63};;`);
    }
    expect(saved).toHaveLength(3);
  });
});

describe.each(["th", "en"] as const)("private default filenames (%s)", (locale) => {
  const payloads: QrPayload[] = [
    { type: "url", url: "https://nqr023-private.example.com/private-path?token=NQR023_PRIVATE" },
    { type: "text", text: "NQR023_PRIVATE ข้อความส่วนตัว" },
    { type: "wifi", ssid: "NQR023_PRIVATE เครือข่าย", password: "NQR023_PASSWORD", encryption: "WPA" },
    { type: "vcard", firstName: "NQR023_PRIVATE", lastName: "นามสกุลส่วนตัว", organization: "NQR023_ORG" },
    { type: "email", to: "nqr023-private@example.com", subject: "NQR023_SUBJECT", body: "NQR023_BODY" },
    { type: "sms", phone: "+12025550123", message: "NQR023_PRIVATE ข้อความ" },
    { type: "tel", phone: "+12025550124" },
    { type: "geo", latitude: 13.7563, longitude: 100.5018 },
    { type: "event", title: "NQR023_PRIVATE นัดหมาย", start: "2026-09-01T10:00:00+07:00", location: "NQR023_LOCATION" },
    { type: "promptpay", targetType: "mobile", target: "0800000001", amount: 123.45 },
  ];

  it.each(payloads)("$type: omits payload labels across all five output variants without changing content", async (payload) => {
    const s = generatorStrings[locale];
    const props = { ...downloadProps(), payload, s };
    const view = render(<DownloadBar {...props} />);
    const names: string[] = [];

    for (const size of [512, 1024, 2048] as const) {
      view.rerender(<DownloadBar {...props} pngSize={size} />);
      fireEvent.click(screen.getByRole("button", { name: s.download.png }));
      names.push(`nexora-qr-${payload.type}-${size}.png`);
      await waitFor(() => expect(saved).toHaveLength(names.length));
      expect(saved.at(-1)?.filename).toBe(names.at(-1));
      expect(renderer.png).toHaveBeenLastCalledWith({ payload, style: props.style, size });
      expect(renderer.png.mock.lastCall?.[0].payload).toBe(payload);
    }

    fireEvent.click(screen.getByRole("button", { name: s.download.svg }));
    names.push(`nexora-qr-${payload.type}.svg`);
    await waitFor(() => expect(saved).toHaveLength(names.length));
    expect(saved.at(-1)?.filename).toBe(names.at(-1));
    expect(renderer.svg).toHaveBeenLastCalledWith({ payload, style: props.style });
    expect(renderer.svg.mock.lastCall?.[0].payload).toBe(payload);

    // The PDF suffix uses the returned artwork width, not the requested 50mm.
    renderer.pdf.mockResolvedValueOnce({ blob: new Blob(["pdf"]), artworkWidthMm: 58.6 });
    fireEvent.click(screen.getByRole("button", { name: s.download.pdf }));
    names.push(`nexora-qr-${payload.type}-59mm.pdf`);
    await waitFor(() => expect(saved).toHaveLength(names.length));
    expect(saved.map(({ filename }) => filename)).toEqual(names);
    expect(renderer.pdf).toHaveBeenLastCalledWith({
      payload, style: props.style, symbolWidthMm: props.pdfSymbolWidthMm,
      page: "a4", orientation: "portrait",
    });
    expect(renderer.pdf.mock.lastCall?.[0].payload).toBe(payload);
  });
});

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

describe.each(["png", "svg", "pdf"] as const)("async %s save guard", (kind) => {
  const artifact = () => ({ blob: new Blob(["synthetic"]), svg: "<svg/>", artworkWidthMm: 58 });

  it.each(["invalid", "changed", "same-after-invalid", "quality", "style", "size", "print", "unmount"])(
    "discards a completed old job after %s", async (change) => {
      const job = deferred<ReturnType<typeof artifact>>();
      renderer[kind].mockReturnValueOnce(job.promise);
      let props = downloadProps();
      const view = render(<DownloadBar {...props} />);
      const button = screen.getByRole("button", { name: en.download[kind] });
      fireEvent.click(button);
      fireEvent.click(button);
      await waitFor(() => expect(renderer[kind]).toHaveBeenCalledTimes(1));
      expect(button).toBeDisabled();

      switch (change) {
        case "invalid": props = { ...props, payload: null }; break;
        case "changed": props = { ...props, payload: { type: "text", text: "current" } }; break;
        case "same-after-invalid": view.rerender(<DownloadBar {...props} payload={null} />); break;
        case "quality": props = { ...props, blocked: true }; break;
        case "style": props = { ...props, style: { ...DEFAULT_STYLE, dotStyle: "dots" } }; break;
        case "size": props = { ...props, pngSize: 512 }; break;
        case "print": props = { ...props, pdfSymbolWidthMm: 80 }; break;
        case "unmount": view.unmount(); break;
      }
      if (change !== "unmount") view.rerender(<DownloadBar {...props} />);
      await act(async () => { job.resolve(artifact()); });
      expect(saved).toHaveLength(0);
      expect(URL.createObjectURL).not.toHaveBeenCalled();
      if (change === "unmount") return;

      props = { ...props, payload: { type: "text", text: "current" }, blocked: false };
      view.rerender(<DownloadBar {...props} />);
      fireEvent.click(screen.getByRole("button", { name: en.download[kind] }));
      await waitFor(() => expect(saved).toHaveLength(1));
      expect(renderer[kind]).toHaveBeenLastCalledWith(expect.objectContaining({ payload: props.payload }));
      expect(saved[0].filename).toBe(kind === "png" ? `nexora-qr-text-${props.pngSize}.png` : kind === "pdf" ? "nexora-qr-text-58mm.pdf" : "nexora-qr-text.svg");
      expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:synthetic");
    },
  );

  it("does not cancel for an unrelated rerender with equal input", async () => {
    const job = deferred<ReturnType<typeof artifact>>();
    renderer[kind].mockReturnValueOnce(job.promise);
    const props = downloadProps();
    const view = render(<DownloadBar {...props} />);
    fireEvent.click(screen.getByRole("button", { name: en.download[kind] }));
    view.rerender(<DownloadBar {...props} payload={{ type: "text", text: "old" }} style={{ ...DEFAULT_STYLE }} />);
    await act(async () => { job.resolve(artifact()); });
    expect(saved).toHaveLength(1);
  });

  it.each(["th", "en"] as const)("ignores a stale failure and keeps a current failure visible (%s)", async (locale) => {
    const job = deferred<ReturnType<typeof artifact>>();
    renderer[kind].mockReturnValueOnce(job.promise);
    const props = { ...downloadProps(), s: generatorStrings[locale] };
    const view = render(<DownloadBar {...props} />);
    fireEvent.click(screen.getByRole("button", { name: props.s.download[kind] }));
    view.rerender(<DownloadBar {...props} payload={null} />);
    await act(async () => { job.reject(new Error("old failure")); });
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    view.rerender(<DownloadBar {...props} />);
    renderer[kind].mockRejectedValueOnce(new Error("current failure"));
    fireEvent.click(screen.getByRole("button", { name: props.s.download[kind] }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(safeExportFailure[locale]));
    expect(screen.getByRole("alert")).not.toHaveTextContent("current failure");
    expect(saved).toHaveLength(0);
  });
});

const safeExportFailure = {
  th: "สร้างไฟล์ไม่สำเร็จ กรุณาลองดาวน์โหลดอีกครั้ง หรือลองรูปแบบไฟล์อื่น",
  en: "Could not build the file. Try downloading again or choose another file format.",
};

const rawExportError = "NQR027_SYNTHETIC https://NQR027_USER:NQR027_PASSWORD@example.invalid/private?token=NQR027_TOKEN\nNQR027_NEWLINE data:image/svg+xml;base64,TlFSMjdfTE9HT19CWVRFUw==";

describe.each(["th", "en"] as const)("safe export errors (%s)", (locale) => {
  describe.each(["png", "svg", "pdf"] as const)("%s", (kind) => {
    it.each(["Error", "string", "object", "null", "undefined", "accessor Error", "synchronous string"])(
      "redacts a current %s rejection and allows retry", async (form) => {
        // These spies observe without suppressing any console output.
        const logs = (["error", "warn", "log", "info", "debug"] as const)
          .map((method) => vi.spyOn(console, method));
        const inspectError = vi.fn(() => rawExportError);
        let thrown: unknown;
        switch (form) {
          case "Error": {
            const error = new Error(rawExportError, { cause: { detail: rawExportError } });
            error.stack = rawExportError;
            thrown = error;
            break;
          }
          case "string":
          case "synchronous string": thrown = rawExportError; break;
          case "object": thrown = { message: rawExportError, cause: rawExportError, stack: rawExportError, toString: inspectError }; break;
          case "null": thrown = null; break;
          case "undefined": thrown = undefined; break;
          case "accessor Error": {
            thrown = Object.defineProperties(new Error(), {
              message: { get: inspectError }, cause: { get: inspectError }, stack: { get: inspectError },
            });
            break;
          }
        }
        if (form === "synchronous string") renderer[kind].mockImplementationOnce(() => { throw thrown; });
        else renderer[kind].mockRejectedValueOnce(thrown);
        const failureCopy = vi.fn(generatorStrings[locale].download.failed);
        const s = generatorStrings[locale];
        const props = { ...downloadProps(), s: { ...s, download: { ...s.download, failed: failureCopy } } };
        const view = render(<DownloadBar {...props} />);
        const button = screen.getByRole("button", { name: props.s.download[kind] });
        fireEvent.click(button);
        if (form !== "synchronous string") expect(button).toBeDisabled();
        await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(safeExportFailure[locale]));
        expect(view.container.innerHTML).not.toContain("NQR027_");
        expect(view.container.innerHTML).not.toContain("data:image/svg+xml");
        expect(view.container.innerHTML).not.toContain("TlFSMjdfTE9HT19CWVRFUw==");
        expect(view.container.innerHTML).not.toContain("example.invalid");
        expect(inspectError).not.toHaveBeenCalled();
        expect(failureCopy).toHaveBeenCalledWith();
        expect(failureCopy.mock.calls.every((args) => args.length === 0)).toBe(true);
        expect(button).toBeEnabled();
        expect(saved).toHaveLength(0);

        fireEvent.click(button);
        expect(screen.queryByRole("alert")).not.toBeInTheDocument();
        expect(button).toBeDisabled();
        await waitFor(() => expect(saved).toHaveLength(1));
        expect(button).toBeEnabled();
        expect(renderer[kind]).toHaveBeenLastCalledWith(expect.objectContaining({ payload: props.payload, style: props.style }));
        expect(saved[0].filename).toBe(kind === "png" ? "nexora-qr-text-1024.png" : kind === "svg" ? "nexora-qr-text.svg" : "nexora-qr-text-58mm.pdf");
        for (const log of logs) expect(log).not.toHaveBeenCalled();
      },
    );
  });
});

describe("quality localization", () => {
  const cases: Array<{ code: string; patch: Partial<QrStyle>; enText: string; thText: string }> = [
    { code: "invalid-color", patch: { fgColor: "invalid" }, enText: "Invalid color format", thText: "รูปแบบสีไม่ถูกต้อง" },
    { code: "contrast-too-low", patch: { fgColor: "#ffffff" }, enText: "minimum 3:1", thText: "ขั้นต่ำ 3:1" },
    { code: "contrast-low", patch: { fgColor: "#777777" }, enText: "recommended 7:1", thText: "ค่าที่แนะนำ 7:1" },
    { code: "inverted", patch: { fgColor: "#ffffff", bgColor: "#000000" }, enText: "Inverted QR colors", thText: "QR แบบกลับสี" },
    { code: "quiet-zone-too-small", patch: { marginModules: 1 }, enText: "at least 4 modules", thText: "อย่างน้อย 4 โมดูล" },
    { code: "logo-needs-high-ecc", patch: { logoUrl: "data:image/png;base64,synthetic", ecc: "L" }, enText: "forces error correction to H", thText: "กู้คืนข้อมูลเป็น H" },
    { code: "logo-too-large", patch: { logoUrl: "data:image/png;base64,synthetic", logoSizeRatio: 0.3 }, enText: "25% of the QR width", thText: "25% ของความกว้าง QR" },
  ];

  it.each(cases)("maps $code by code, preserving severity and thresholds in both locales", ({ code, patch, enText, thText }) => {
    const issues = inspectStyle({ ...DEFAULT_STYLE, ...patch });
    expect(issues.some((issue) => issue.code === code)).toBe(true);
    const before = structuredClone(issues);
    for (const locale of ["th", "en"] as const) {
      const view = render(<QualityPanel
        issues={issues.map((issue) => ({ ...issue, message: "UNTRUSTED DOMAIN PROSE" }))}
        blocked={hasBlockingIssue(issues)} moduleCount={33} quietZoneModules={4}
        scanDistanceMm={500} onScanDistanceChange={vi.fn()} exportSizePx={1024}
        locale={locale} s={generatorStrings[locale]}
      />);
      expect(view.container.textContent).toContain(locale === "en" ? enText : thText);
      expect(view.container.textContent).not.toContain("UNTRUSTED DOMAIN PROSE");
      expect(view.container.textContent).not.toContain(code);
      if (locale === "en") expect(view.container.textContent).not.toMatch(/[\u0e00-\u0e7f]/);
      if (hasBlockingIssue(issues)) expect(screen.getByText(generatorStrings[locale].quality.blockedTitle)).toBeInTheDocument();
      view.unmount();
    }
    expect(issues).toEqual(before);
  });

  it("uses a localized generic fallback for an unknown code without leaking domain prose", () => {
    const issue = { code: "future-rule", level: "error" as const, message: "ข้อความจากโดเมน" };
    expect(qualityMessage(issue, "en")).toBe("This QR style fails a quality rule. Adjust the style before downloading.");
    expect(qualityMessage({ ...issue, level: "warning" }, "th")).toContain("กรุณาทดสอบสแกน");
  });
});

describe("schema messages", () => {
  it("rejects a PromptPay target with the wrong digit count at the schema, not at encode", () => {
    const tooShort = promptPayPayloadSchema.safeParse({
      type: "promptpay",
      targetType: "nationalId",
      target: "1234567890",
    });

    expect(tooShort.success).toBe(false);
    // A real field path, so the form can put it under the field it belongs to.
    expect(tooShort.error?.issues[0]?.path).toEqual(["target"]);
    expect(tooShort.error?.issues[0]?.message).toBe("promptpay.target.nationalId");

    // The same number with all 13 digits, formatting and all, passes.
    expect(
      promptPayPayloadSchema.safeParse({
        type: "promptpay",
        targetType: "nationalId",
        target: "1-2345-67890-12-3",
      }).success,
    ).toBe(true);
  });

  it("accepts the mobile formats PromptPay normalization accepts", () => {
    for (const target of ["0812345678", "+66812345678", "081-234-5678"]) {
      expect(
        promptPayPayloadSchema.safeParse({
          type: "promptpay",
          targetType: "mobile",
          target,
        }).success,
      ).toBe(true);
    }
  });

  it("resolves codes per locale and falls back to the raw code when unmapped", () => {
    expect(resolveQrMessage("wifi.password.required", "th")).toBe(
      "เครือข่ายที่มีการเข้ารหัสต้องกรอกรหัสผ่าน",
    );
    expect(resolveQrMessage("wifi.password.required", "en")).toBe(
      "A secured network needs a password.",
    );
    // Never blank, never a throw: an unmapped code shows as itself, which is
    // obviously a bug on screen rather than an empty red gap under a field.
    expect(resolveQrMessage("does.not.exist", "en")).toBe("does.not.exist");
  });
});

describe("event datetime offset", () => {
  it("attaches the local UTC offset to a datetime-local value", () => {
    const iso = toIsoWithOffset("2026-08-19T14:30", false);

    expect(iso).toMatch(/^2026-08-19T14:30:00[+-]\d{2}:\d{2}$/);
    expect(
      eventPayloadSchema.safeParse({ type: "event", title: "x", start: iso }).success,
    ).toBe(true);
  });

  it("keeps the calendar date the user picked for an all-day event", () => {
    const iso = toIsoWithOffset("2026-08-19", true);

    // `formatIcsDate` reads the date straight off the front of this string for
    // all-day events, so the leading date must be the one that was picked —
    // no UTC normalization anywhere in between.
    expect(iso?.startsWith("2026-08-19T00:00:00")).toBe(true);
    expect(iso).toMatch(/[+-]\d{2}:\d{2}$/);
    expect(
      eventPayloadSchema.safeParse({
        type: "event",
        title: "x",
        start: iso,
        allDay: true,
      }).success,
    ).toBe(true);
  });

  it("rejects a datetime that cannot be read, with localized copy", () => {
    const drafts = emptyDrafts();
    const result = validateDraft(
      "event",
      { ...drafts.event, title: "x", start: "not-a-date" },
      generatorStrings.th.errors,
    );

    expect(result.payload).toBeNull();
    expect(result.errors.start).toBe(generatorStrings.th.errors.invalidDateTime);
  });
});
