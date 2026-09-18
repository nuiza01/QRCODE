import { toNextJsHandler } from "better-auth/next-js";

import { isAccountAuthConfigured } from "@/lib/auth-config";
import { getAuth } from "@/lib/auth";
import { assertAuthOperationActive } from "@/lib/auth-operation";
import {
  settleAuthHandler,
  unavailableAuthResponse,
  type AuthHandler,
} from "@/lib/auth-route-handler";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type AuthInstance = Awaited<ReturnType<typeof getAuth>>;
let cachedHandlers: {
  auth: AuthInstance;
  handlers: { GET: AuthHandler; POST: AuthHandler };
} | null = null;

function getHandlers(auth: AuthInstance) {
  if (cachedHandlers?.auth !== auth) {
    cachedHandlers = { auth, handlers: toNextJsHandler(auth) };
  }
  return cachedHandlers.handlers;
}

async function dispatch(
  method: "GET" | "POST",
  request: Request,
): Promise<Response> {
  if (!isAccountAuthConfigured(process.env)) return unavailableAuthResponse();
  return settleAuthHandler(async (currentRequest) => {
    const auth = await getAuth();
    assertAuthOperationActive();
    return getHandlers(auth)[method](currentRequest);
  }, request);
}

export async function GET(request: Request): Promise<Response> {
  try {
    return await dispatch("GET", request);
  } catch {
    return unavailableAuthResponse();
  }
}

export async function POST(request: Request): Promise<Response> {
  try {
    return await dispatch("POST", request);
  } catch {
    return unavailableAuthResponse();
  }
}
