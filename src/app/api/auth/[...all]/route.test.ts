import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth-config", () => ({ isAccountAuthConfigured: vi.fn(() => true) }));
vi.mock("@/lib/auth", () => ({ getAuth: vi.fn() }));
vi.mock("better-auth/next-js", () => ({ toNextJsHandler: vi.fn() }));

import { settleAuthHandler } from "@/lib/auth-route-handler";
import { getAuth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";
import * as route from "./route";

describe("Better Auth route settlement", () => {
  beforeEach(() => {
    vi.mocked(getAuth).mockReset();
    vi.mocked(toNextJsHandler).mockReset();
  });

  it("exports only the supported Next route contract", () => {
    expect(Object.keys(route).sort()).toEqual(["GET", "POST", "dynamic", "runtime"]);
  });
  it("contains a failed request and allows the next request to recover", async () => {
    const handler = vi.fn()
      .mockRejectedValueOnce(new Error("private database detail"))
      .mockResolvedValueOnce(Response.json({ user: { id: "user-id" } }));
    const request = new Request("http://localhost/api/auth/get-session");

    const failed = await settleAuthHandler(handler, request, 50);
    expect(failed.status).toBe(503);
    expect(await failed.json()).toEqual({ error: "authentication_unavailable" });

    const recovered = await settleAuthHandler(handler, request, 50);
    expect(recovered.status).toBe(200);
    expect(await recovered.json()).toEqual({ user: { id: "user-id" } });
  });

  it("settles a non-cooperative handler at the fixed unavailable response", async () => {
    vi.useFakeTimers();
    try {
      const result = settleAuthHandler(() => new Promise(() => undefined),
        new Request("http://localhost/api/auth/get-session"), 25);
      await vi.advanceTimersByTimeAsync(25);
      const response = await result;
      expect(response.status).toBe(503);
      expect(response.headers.get("cache-control")).toBe("no-store");
    } finally {
      vi.useRealTimers();
    }
  });

  it("contains a synchronous handler failure without exposing its detail", async () => {
    const response = await settleAuthHandler(() => {
      throw new Error("private synchronous failure");
    }, new Request("http://localhost/api/auth/get-session"), 25);
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain("private synchronous failure");
  });

  it.each(["GET", "POST"] as const)(
    "does not enter the %s vendor handler after caller abort while readiness is shared",
    async (method) => {
      let resolveAuth: (value: object) => void = () => undefined;
      const pendingAuth = new Promise<object>((resolve) => { resolveAuth = resolve; });
      const auth = {};
      const handler = vi.fn(async (request: Request) =>
        Response.json({ ok: !request.signal.aborted }));
      vi.mocked(getAuth).mockReturnValue(pendingAuth as never);
      vi.mocked(toNextJsHandler).mockReturnValue({
        GET: handler,
        POST: handler,
        PATCH: handler,
        PUT: handler,
        DELETE: handler,
      });

      const controller = new AbortController();
      const expiredResponse = route[method](new Request(
        `https://nqr076.invalid/api/auth/${method.toLowerCase()}`,
        { method, signal: controller.signal },
      ));
      const liveResponse = route[method](new Request(
        `https://nqr076.invalid/api/auth/${method.toLowerCase()}?live=1`,
        { method },
      ));
      await Promise.resolve();
      controller.abort();
      resolveAuth(auth);

      expect((await expiredResponse).status).toBe(503);
      expect((await liveResponse).status).toBe(200);
      await Promise.resolve();
      expect(handler).toHaveBeenCalledOnce();
      expect((handler.mock.calls[0]?.[0] as Request).signal.aborted).toBe(false);
    },
  );
});
