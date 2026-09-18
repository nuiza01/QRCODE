type GoogleIdentityInput = {
  source: {
    method: string;
    oauth?: {
      providerId: string;
      profile?: Record<string, unknown>;
    };
  };
  user: Record<string, unknown>;
};

export type AuthIdentityRejection = {
  error: string;
  errorDescription: string;
};

/**
 * Admission policy for the only supported identity provider.
 *
 * Better Auth has already verified Google's signature, issuer, audience,
 * expiry and OAuth state before this callback runs. This additional gate keeps
 * the enabled method narrow and requires the verified-email claim on every
 * sign-in, including returning stateless users.
 */
export function validateGoogleIdentity(
  input: GoogleIdentityInput,
): AuthIdentityRejection | undefined {
  const { source, user } = input;
  const profile = source.oauth?.profile;

  if (source.method !== "oauth" || source.oauth?.providerId !== "google") {
    return {
      error: "auth_method_not_allowed",
      errorDescription: "This sign-in method is not available.",
    };
  }

  if (
    user.emailVerified !== true ||
    profile?.email_verified !== true ||
    typeof user.email !== "string" ||
    user.email.length === 0 ||
    typeof profile.sub !== "string" ||
    profile.sub.length === 0
  ) {
    return {
      error: "google_identity_not_verified",
      errorDescription: "A verified Google account is required.",
    };
  }
}

