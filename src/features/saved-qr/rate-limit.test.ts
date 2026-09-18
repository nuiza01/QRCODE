import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  consumeSavedQrMutation,
  resetSavedQrMutationRateLimitForTests,
  SAVED_QR_MUTATION_RATE_LIMIT,
  SAVED_QR_MUTATION_RATE_WINDOW_SECONDS,
} from "./rate-limit";

describe("saved QR account mutation limiter", () => {
  beforeEach(() => {
    resetSavedQrMutationRateLimitForTests();
  });

  it("allows 30 account mutations per minute and returns a bounded retry", () => {
    for (let index = 0; index < SAVED_QR_MUTATION_RATE_LIMIT; index += 1) {
      expect(consumeSavedQrMutation("owner", 1_000)).toEqual({ allowed: true });
    }
    expect(consumeSavedQrMutation("owner", 1_000)).toEqual({
      allowed: false,
      retryAfter: SAVED_QR_MUTATION_RATE_WINDOW_SECONDS,
    });
    expect(consumeSavedQrMutation("owner", 60_999)).toEqual({
      allowed: false,
      retryAfter: 1,
    });
    expect(consumeSavedQrMutation("owner", 61_000)).toEqual({ allowed: true });
  });

  it("isolates authenticated accounts without using an IP key", () => {
    for (let index = 0; index < SAVED_QR_MUTATION_RATE_LIMIT; index += 1) {
      consumeSavedQrMutation("owner-a", 1_000);
    }
    expect(consumeSavedQrMutation("owner-a", 1_000).allowed).toBe(false);
    expect(consumeSavedQrMutation("owner-b", 1_000)).toEqual({ allowed: true });
  });
});
