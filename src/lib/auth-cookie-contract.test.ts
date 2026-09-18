/**
 * The session cookie name is a deployment contract, not an implementation detail.
 *
 * `advanced.cookiePrefix` decides it, and nothing else in the suite pins it. If
 * it is ever edited, every signed-in person is silently signed out on deploy —
 * their browser keeps sending a cookie the new build no longer looks for, and
 * no test fails. This file makes that change loud.
 *
 * It also documents the name for whoever has to reason about a session by hand
 * (which is how a QA pass once concluded, wrongly, that the server was ignoring
 * a valid cookie: the check had guessed Better Auth's default prefix).
 */
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const base = {
  DATABASE_URL: "mysql://user:pass@127.0.0.1:3306/does_not_connect",
  BETTER_AUTH_SECRET: "contract-test-secret-0123456789abcdefghij",
  GOOGLE_CLIENT_ID: "contract.apps.googleusercontent.com",
  GOOGLE_CLIENT_SECRET: "contract-secret",
};

async function cookieName(baseURL: string): Promise<string> {
  vi.resetModules();
  for (const [key, value] of Object.entries({ ...base, BETTER_AUTH_URL: baseURL })) {
    vi.stubEnv(key, value);
  }
  const { getAuth } = await import("@/lib/auth");
  const context = await (await getAuth()).$context;
  return context.authCookies.sessionToken.name;
}

describe("session cookie contract", () => {
  it("uses the nqr prefix, plain over http", async () => {
    expect(await cookieName("http://localhost:3000")).toBe("nqr.session_token");
  });

  it("uses the __Secure- prefix over https, which is what production serves", async () => {
    expect(await cookieName("https://nqr.orenvis.com")).toBe("__Secure-nqr.session_token");
  });
});
