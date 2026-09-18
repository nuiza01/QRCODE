import { describe, expect, it } from "vitest";

import {
  isAccountAuthConfigured,
  isGoogleAuthConfigured,
  readDatabaseConfiguration,
  readGoogleAuthConfiguration,
  type AuthEnvironment,
} from "./auth-config";

const complete = {
  NODE_ENV: "production",
  NEXT_PUBLIC_APP_URL: "https://nqr.orenvis.com",
  BETTER_AUTH_URL: "https://nqr.orenvis.com",
  BETTER_AUTH_SECRET: "a".repeat(32),
  GOOGLE_CLIENT_ID: "123-example.apps.googleusercontent.com",
  GOOGLE_CLIENT_SECRET: "google-secret",
  DATABASE_URL: "mysql://nqr:secret@localhost:3306/nexora_qr",
} satisfies AuthEnvironment;

describe("Google auth configuration gate", () => {
  it("accepts a complete HTTPS production configuration", () => {
    expect(readGoogleAuthConfiguration(complete)).toEqual({
      baseURL: "https://nqr.orenvis.com",
      clientId: complete.GOOGLE_CLIENT_ID,
      clientSecret: complete.GOOGLE_CLIENT_SECRET,
      secret: complete.BETTER_AUTH_SECRET,
    });
    expect(isGoogleAuthConfigured(complete)).toBe(true);
    expect(isAccountAuthConfigured(complete)).toBe(true);
    expect(readDatabaseConfiguration(complete)).toEqual({
      url: complete.DATABASE_URL,
    });
  });

  it("keeps Google configured but disables account auth without MariaDB", () => {
    const withoutDatabase = { ...complete, DATABASE_URL: undefined };
    expect(isGoogleAuthConfigured(withoutDatabase)).toBe(true);
    expect(isAccountAuthConfigured(withoutDatabase)).toBe(false);
  });

  it.each([
    "postgresql://nqr:secret@localhost:5432/nexora_qr",
    "mysql://localhost:3306/nexora_qr",
    "mysql://nqr:secret@localhost:3306",
    "not-a-dsn",
  ])("rejects an incomplete or non-MariaDB database DSN: %s", (DATABASE_URL) => {
    expect(
      readDatabaseConfiguration({ ...complete, DATABASE_URL }),
    ).toBeNull();
    expect(isAccountAuthConfigured({ ...complete, DATABASE_URL })).toBe(false);
  });

  it.each([
    "BETTER_AUTH_SECRET",
    "GOOGLE_CLIENT_ID",
    "GOOGLE_CLIENT_SECRET",
  ] as const)("fails closed when %s is absent", (key) => {
    expect(isGoogleAuthConfigured({ ...complete, [key]: undefined })).toBe(false);
  });

  it("rejects short secrets and non-Google OAuth client IDs", () => {
    expect(
      isGoogleAuthConfigured({ ...complete, BETTER_AUTH_SECRET: "too-short" }),
    ).toBe(false);
    expect(
      isGoogleAuthConfigured({ ...complete, GOOGLE_CLIENT_ID: "not-google" }),
    ).toBe(false);
  });

  it.each([
    "http://nqr.orenvis.com",
    "https://user:password@nqr.orenvis.com",
    "https://nqr.orenvis.com/path",
    "https://nqr.orenvis.com?query=1",
    "not-a-url",
  ])("rejects an unsafe production auth origin: %s", (BETTER_AUTH_URL) => {
    expect(isGoogleAuthConfigured({ ...complete, BETTER_AUTH_URL })).toBe(false);
  });

  it("permits an HTTP localhost origin outside production", () => {
    expect(
      isGoogleAuthConfigured({
        ...complete,
        NODE_ENV: "development",
        BETTER_AUTH_URL: "http://localhost:3000",
      }),
    ).toBe(true);
  });
});
