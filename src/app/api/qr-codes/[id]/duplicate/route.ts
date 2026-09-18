import { z } from "zod";

import { duplicateSavedQrCode } from "@/features/saved-qr/data";
import {
  FREE_SAVED_STATIC_QR_LIMIT,
  SAVED_STATIC_QR_QUOTA_ERROR,
} from "@/features/saved-qr/quota";
import {
  authorizeSavedQrMutation,
  savedQrJson,
  withSavedQrApiBoundary,
} from "@/features/saved-qr/api";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  return withSavedQrApiBoundary(async () => {
    const auth = await authorizeSavedQrMutation(request);
    if (auth.kind === "response") return auth.response;
    const id = z.uuid().safeParse((await params).id);
    if (!id.success) return savedQrJson({ error: "not_found" }, 404);
    const copy = await duplicateSavedQrCode(auth.user.id, id.data);
    if (copy.status === "quota_exceeded") {
      return savedQrJson(
        { error: SAVED_STATIC_QR_QUOTA_ERROR, limit: FREE_SAVED_STATIC_QR_LIMIT },
        409,
      );
    }
    return copy.status === "created"
      ? savedQrJson({ id: copy.id }, 201)
      : savedQrJson({ error: "not_found" }, 404);
  });
}
