import "server-only";

import { getAuth } from "@/lib/auth";
import { readGoogleAuthConfiguration } from "@/lib/auth-config";
import {
  assertAuthOperationActive,
  withAuthOperationDeadline,
} from "@/lib/auth-operation";

export async function getRequestUser(headers: Headers) {
  const session = await withAuthOperationDeadline(async () => {
    const auth = await getAuth();
    assertAuthOperationActive();
    return auth.api.getSession({
      headers,
      query: {
        // Protected reads and mutations must observe revocation in MariaDB, not
        // a still-valid client-side session snapshot.
        disableCookieCache: true,
        disableRefresh: true,
      },
    });
  });
  return session?.user ?? null;
}

/** Every state-changing JSON endpoint is same-origin only. */
export function isTrustedMutationRequest(request: Request): boolean {
  const configuration = readGoogleAuthConfiguration(process.env);
  const origin = request.headers.get("origin");
  return Boolean(configuration && origin && origin === configuration.baseURL);
}
