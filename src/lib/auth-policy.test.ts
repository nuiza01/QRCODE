import { describe, expect, it } from "vitest";

import { validateGoogleIdentity } from "./auth-policy";

const verified = {
  source: {
    method: "oauth",
    oauth: {
      providerId: "google",
      profile: { email_verified: true, sub: "google-subject" },
    },
  },
  user: { email: "user@gmail.com", emailVerified: true },
};

describe("Google identity admission", () => {
  it("accepts a verified Google identity", () => {
    expect(validateGoogleIdentity(verified)).toBeUndefined();
  });

  it.each([
    { source: { ...verified.source, method: "email-password" } },
    {
      source: {
        ...verified.source,
        oauth: { ...verified.source.oauth, providerId: "github" },
      },
    },
  ])("rejects any non-Google authentication method", (override) => {
    expect(validateGoogleIdentity({ ...verified, ...override })).toEqual({
      error: "auth_method_not_allowed",
      errorDescription: "This sign-in method is not available.",
    });
  });

  it.each([
    { user: { ...verified.user, emailVerified: false } },
    {
      source: {
        ...verified.source,
        oauth: {
          ...verified.source.oauth,
          profile: { email_verified: false, sub: "google-subject" },
        },
      },
    },
    { user: { ...verified.user, email: "" } },
    {
      source: {
        ...verified.source,
        oauth: {
          ...verified.source.oauth,
          profile: { email_verified: true, sub: "" },
        },
      },
    },
  ])("rejects an incomplete or unverified Google identity", (override) => {
    expect(validateGoogleIdentity({ ...verified, ...override })).toEqual({
      error: "google_identity_not_verified",
      errorDescription: "A verified Google account is required.",
    });
  });
});

