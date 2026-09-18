import "server-only";

import { isAccountAuthConfigured } from "@/lib/auth-config";
import { getRequestUser, isTrustedMutationRequest } from "@/lib/request-auth";

import {
  consumeSavedQrMutation,
  SAVED_QR_RATE_LIMIT_ERROR,
} from "./rate-limit";

export const SAVED_QR_OPERATION_ERROR = "saved_qr_operation_failed";

export function savedQrJson(
  body: object,
  status: number,
  headers?: Record<string, string>,
) {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store", ...headers },
  });
}

export async function withSavedQrApiBoundary(
  operation: () => Promise<Response>,
): Promise<Response> {
  try {
    return await operation();
  } catch {
    // Never inspect, stringify, log, or echo unknown database/runtime errors.
    return savedQrJson({ error: SAVED_QR_OPERATION_ERROR }, 500);
  }
}

export type SavedQrAuthorization =
  | { kind: "user"; user: { id: string } }
  | { kind: "response"; response: Response };

export async function authorizeSavedQrMutation(
  request: Request,
): Promise<SavedQrAuthorization> {
  if (!isAccountAuthConfigured(process.env)) {
    return { kind: "response", response: savedQrJson({ error: "unavailable" }, 503) };
  }
  if (!isTrustedMutationRequest(request)) {
    return { kind: "response", response: savedQrJson({ error: "forbidden" }, 403) };
  }
  const user = await getRequestUser(request.headers);
  if (!user) {
    return { kind: "response", response: savedQrJson({ error: "unauthorized" }, 401) };
  }
  const decision = consumeSavedQrMutation(user.id);
  if (!decision.allowed) {
    return {
      kind: "response",
      response: savedQrJson(
        { error: SAVED_QR_RATE_LIMIT_ERROR },
        429,
        { "Retry-After": String(decision.retryAfter) },
      ),
    };
  }
  return { kind: "user", user };
}
