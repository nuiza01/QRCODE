import { beforeEach, describe, expect, it, vi } from "vitest";

const requestAuthState = vi.hoisted(() => ({
  getAuth: vi.fn(),
  getSession: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth", () => ({
  getAuth: requestAuthState.getAuth,
}));
vi.mock("@/lib/auth-config", () => ({
  readGoogleAuthConfiguration: vi.fn(() => null),
}));

import { getRequestUser } from "./request-auth";

describe("request authentication", () => {
  beforeEach(() => {
    requestAuthState.getAuth.mockReset();
    requestAuthState.getSession.mockReset();
    requestAuthState.getAuth.mockResolvedValue({
      api: { getSession: requestAuthState.getSession },
    });
  });

  it("forces an authoritative, non-refreshing database session read", async () => {
    const headers = new Headers({ cookie: "nqr.session_token=test" });
    const user = { id: "user-id", email: "owner@example.com" };
    requestAuthState.getSession.mockResolvedValueOnce({ user });

    await expect(getRequestUser(headers)).resolves.toBe(user);
    expect(requestAuthState.getSession).toHaveBeenCalledWith({
      headers,
      query: {
        disableCookieCache: true,
        disableRefresh: true,
      },
    });
  });

  it("fails closed when the authoritative session is absent", async () => {
    requestAuthState.getSession.mockResolvedValueOnce(null);
    await expect(getRequestUser(new Headers())).resolves.toBeNull();
  });

  it("contains synchronous getSession throws and hostile asynchronous rejections", async () => {
    requestAuthState.getSession.mockImplementationOnce(() => {
      throw Object.create(null);
    });
    await expect(getRequestUser(new Headers())).rejects.toThrow(
      "NQR_AUTH_OPERATION_FAILED",
    );
    requestAuthState.getSession.mockRejectedValueOnce(Object.create(null));
    await expect(getRequestUser(new Headers())).rejects.toThrow(
      "NQR_AUTH_OPERATION_FAILED",
    );
  });

  it("does not enter getSession after readiness outlives the request deadline", async () => {
    vi.useFakeTimers();
    try {
      let resolveAuth: (value: {
        api: { getSession: typeof requestAuthState.getSession };
      }) => void = () => undefined;
      requestAuthState.getAuth.mockReturnValueOnce(new Promise((resolve) => {
        resolveAuth = resolve;
      }));

      const result = getRequestUser(new Headers()).catch((error) => error);
      await vi.advanceTimersByTimeAsync(5_000);
      expect((await result).message).toBe("NQR_AUTH_OPERATION_TIMEOUT");

      resolveAuth({ api: { getSession: requestAuthState.getSession } });
      await Promise.resolve();
      await Promise.resolve();
      expect(requestAuthState.getSession).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });
});
