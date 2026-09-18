import { StrictMode } from "react";
import { act, render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, expectTypeOf, it, vi } from "vitest";
import { QrPreview, type QrPreviewProps, type QrPreviewStatus } from "@/qr/render/QrPreview";
import { TestScanCard } from "@/qr/render/TestScanCard";
import { QrRenderer, type QrRenderResult } from "@/qr/render/engine";
import { DEFAULT_STYLE } from "@/qr/types";

const io = vi.hoisted(() => ({ update: vi.fn(), append: vi.fn() }));
vi.mock("@/qr/render/logo", () => ({
  prepareRenderStyleLogo: async (style: typeof DEFAULT_STYLE & { logoUrl?: string }) =>
    style.logoUrl ? { ...style, logoUrl: "data:image/png;base64,iVBORw0KGgo=" } : style,
  assertPreparedLogoForVendor: () => undefined,
}));
vi.mock("qr-code-styling", () => ({
  default: class {
    _qr = { getModuleCount: () => 33 };
    update(options?: { data?: string }) {
      io.update(options);
      if (options?.data?.length === 3600) throw "code length overflow. (28820>10208)";
    }
    append(host: HTMLElement) {
      io.append();
      host.replaceChildren(document.createElementNS("http://www.w3.org/2000/svg", "svg"));
    }
  },
}));

const payload = { type: "text" as const, text: "STATUS_PRIVATE ไทย😀" };
const markerLogo = "data:image/svg+xml,PRIVATE_LOGO_MARKER";

afterEach(() => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

describe("QrPreview backward-compatible status foundation", () => {
  it("keeps legacy props and TestScanCard working without any status callback", async () => {
    const legacy: QrPreviewProps = { payload, style: DEFAULT_STYLE };
    expectTypeOf(legacy).toMatchTypeOf<QrPreviewProps>();
    const preview = render(<QrPreview {...legacy} />);
    await waitFor(() => expect(preview.container.querySelector("svg")).not.toBeNull());
    preview.unmount();
    const scan = render(<TestScanCard payload={payload} style={DEFAULT_STYLE} />);
    await waitFor(() => expect(scan.container.querySelector("svg")).not.toBeNull());
  });

  it("requires renderRevision and onStatus together at the type boundary", () => {
    const enabled: QrPreviewProps = { payload, style: DEFAULT_STYLE, renderRevision: 7, onStatus: () => {} };
    expectTypeOf(enabled).toMatchTypeOf<QrPreviewProps>();
    // @ts-expect-error status callback without a caller-owned revision is forbidden.
    const missingRevision: QrPreviewProps = { payload, style: DEFAULT_STYLE, onStatus: () => {} };
    // @ts-expect-error revision without a status callback is forbidden.
    const missingCallback: QrPreviewProps = { payload, style: DEFAULT_STYLE, renderRevision: 7 };
    expect(missingRevision).toBeDefined();
    expect(missingCallback).toBeDefined();
  });

  it("reports minimal current success metadata without payload, logo URL or full style", async () => {
    const statuses: QrPreviewStatus[] = [];
    const legacyResults: QrRenderResult[] = [];
    const style = { ...DEFAULT_STYLE, ecc: "L" as const, logoUrl: markerLogo, logoSizeRatio: 0.2 };
    const view = render(<QrPreview payload={payload} style={style} renderRevision={11} onStatus={(s) => statuses.push(s)} onRender={(r) => legacyResults.push(r)} />);
    await waitFor(() => expect(statuses).toHaveLength(1));
    expect(statuses[0]).toEqual({ revision: 11, state: "success", moduleCount: 33, quietZoneModules: 4, effectiveEcc: "H" });
    const serialized = JSON.stringify(statuses);
    expect(serialized).not.toContain("STATUS_PRIVATE");
    expect(serialized).not.toContain("PRIVATE_LOGO_MARKER");
    expect(Object.keys(statuses[0])).toEqual(["revision", "state", "moduleCount", "quietZoneModules", "effectiveEcc"]);
    expect(view.container.textContent).not.toContain("STATUS_PRIVATE");
    expect(legacyResults).toHaveLength(1);
    expect(legacyResults[0].data).toBe(payload.text); // Existing public callback remains unchanged.
    expect(legacyResults[0].style.logoUrl).toBe(markerLogo);
  });

  it("reports only a fixed capacity code and recovers on a newer revision", async () => {
    const statuses: QrPreviewStatus[] = [];
    const onStatus = (status: QrPreviewStatus) => statuses.push(status);
    const view = render(<QrPreview payload={{ type: "text", text: "ก".repeat(1200) }} style={{ ...DEFAULT_STYLE, ecc: "H" }} renderRevision={20} onStatus={onStatus} />);
    await waitFor(() => expect(statuses).toEqual([{ revision: 20, state: "error", code: "capacity-exceeded" }]));
    expect(JSON.stringify(statuses)).not.toContain("28820");
    view.rerender(<QrPreview payload={payload} style={DEFAULT_STYLE} renderRevision={21} onStatus={onStatus} />);
    await waitFor(() => expect(statuses.at(-1)).toMatchObject({ revision: 21, state: "success" }));
  });

  it("keeps encoding/color failures generic and private", async () => {
    const statuses: QrPreviewStatus[] = [];
    const onStatus = (status: QrPreviewStatus) => statuses.push(status);
    const view = render(<QrPreview payload={{ type: "event", title: "PRIVATE_EVENT", start: "invalid" }} style={DEFAULT_STYLE} renderRevision={30} onStatus={onStatus} />);
    await waitFor(() => expect(statuses).toContainEqual({ revision: 30, state: "error", code: "render-failed" }));
    view.rerender(<QrPreview payload={payload} style={{ ...DEFAULT_STYLE, fgColor: "code length overflow. (2>1)" }} renderRevision={31} onStatus={onStatus} />);
    await waitFor(() => expect(statuses).toContainEqual({ revision: 31, state: "error", code: "render-failed" }));
    expect(JSON.stringify(statuses)).not.toMatch(/PRIVATE_EVENT|STATUS_PRIVATE|code length overflow/);
  });

  it("drops superseded success/error callbacks and reports the latest revision only", async () => {
    const statuses: QrPreviewStatus[] = [];
    const onStatus = (status: QrPreviewStatus) => statuses.push(status);
    const view = render(<QrPreview payload={payload} style={DEFAULT_STYLE} renderRevision={40} onStatus={onStatus} />);
    view.rerender(<QrPreview payload={{ type: "text", text: "ก".repeat(1200) }} style={{ ...DEFAULT_STYLE, ecc: "H" }} renderRevision={41} onStatus={onStatus} />);
    view.rerender(<QrPreview payload={{ type: "text", text: "LATEST" }} style={DEFAULT_STYLE} renderRevision={42} onStatus={onStatus} />);
    await waitFor(() => expect(statuses).toHaveLength(1));
    expect(statuses[0]).toMatchObject({ revision: 42, state: "success" });
  });

  it("does not report after unmount or duplicate a status in StrictMode", async () => {
    const unmounted = vi.fn();
    const view = render(<QrPreview payload={payload} style={DEFAULT_STYLE} renderRevision={50} onStatus={unmounted} />);
    view.unmount();
    await act(async () => { await Promise.resolve(); await Promise.resolve(); });
    expect(unmounted).not.toHaveBeenCalled();

    const strict = vi.fn();
    render(<StrictMode><QrPreview payload={payload} style={DEFAULT_STYLE} renderRevision={51} onStatus={strict} /></StrictMode>);
    await waitFor(() => expect(strict).toHaveBeenCalledTimes(1));
    expect(strict.mock.calls[0][0]).toMatchObject({ revision: 51, state: "success" });
  });

  it("attributes a late loader failure only to the latest caller revision", async () => {
    let rejectLoad!: (error: unknown) => void;
    vi.spyOn(QrRenderer, "load").mockReturnValueOnce(new Promise((_, reject) => { rejectLoad = reject; }));
    const statuses: QrPreviewStatus[] = [];
    const onStatus = (status: QrPreviewStatus) => statuses.push(status);
    const view = render(<QrPreview payload={payload} style={DEFAULT_STYLE} renderRevision={70} onStatus={onStatus} />);
    view.rerender(<QrPreview payload={payload} style={DEFAULT_STYLE} renderRevision={71} onStatus={onStatus} />);
    await act(async () => { rejectLoad(new Error("PRIVATE_LOADER")); await Promise.resolve(); });
    expect(statuses).toEqual([{ revision: 71, state: "error", code: "render-failed" }]);
    expect(JSON.stringify(statuses)).not.toContain("PRIVATE_LOADER");
  });

  it("does not emit pending because the future Generator owns it synchronously", async () => {
    const statuses: QrPreviewStatus[] = [];
    render(<QrPreview payload={payload} style={DEFAULT_STYLE} renderRevision={60} onStatus={(s) => statuses.push(s)} />);
    await waitFor(() => expect(statuses).toHaveLength(1));
    expect(statuses.some((status) => status.state === "pending")).toBe(false);
  });
});
