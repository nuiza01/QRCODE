import {
  createSavedQrSchema,
  FREE_SAVED_STATIC_QR_LIMIT,
  MAX_SAVED_QR_REQUEST_BYTES,
  SAVED_STATIC_QR_QUOTA_ERROR,
} from "@/features/saved-qr/contracts";
import { createSavedQrCode } from "@/features/saved-qr/data";
import {
  authorizeSavedQrMutation,
  savedQrJson,
  withSavedQrApiBoundary,
} from "@/features/saved-qr/api";
import { readBoundedJson } from "@/lib/bounded-json";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  return withSavedQrApiBoundary(async () => {
    const auth = await authorizeSavedQrMutation(request);
    if (auth.kind === "response") return auth.response;

    // Authentication and account rate limiting intentionally precede body IO.
    const body = await readBoundedJson(request, MAX_SAVED_QR_REQUEST_BYTES);
    if (!body.ok) return savedQrJson({ error: body.error }, body.status);
    const parsed = createSavedQrSchema.safeParse(body.value);
    if (!parsed.success) return savedQrJson({ error: "invalid_qr" }, 400);

    const saved = await createSavedQrCode(auth.user.id, parsed.data);
    if (saved.status === "quota_exceeded") {
      return savedQrJson(
        { error: SAVED_STATIC_QR_QUOTA_ERROR, limit: FREE_SAVED_STATIC_QR_LIMIT },
        409,
      );
    }
    if (saved.status === "owner_missing") {
      return savedQrJson({ error: "unauthorized" }, 401);
    }
    return savedQrJson({ id: saved.id }, 201);
  });
}
