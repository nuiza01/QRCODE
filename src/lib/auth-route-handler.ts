import "server-only";

import { withAuthOperationDeadline } from "@/lib/auth-operation";

export type AuthHandler = (request: Request) => Promise<Response>;

export function unavailableAuthResponse(): Response {
  return Response.json(
    { error: "authentication_unavailable" },
    { status: 503, headers: { "Cache-Control": "no-store" } },
  );
}

export async function settleAuthHandler(
  handler: AuthHandler,
  request: Request,
  timeoutMs?: number,
): Promise<Response> {
  try {
    return await withAuthOperationDeadline(
      () => handler(request),
      timeoutMs,
      request.signal,
    );
  } catch {
    return unavailableAuthResponse();
  }
}
