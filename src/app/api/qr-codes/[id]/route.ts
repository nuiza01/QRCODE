import { z } from "zod";

import { MAX_SAVED_QR_REQUEST_BYTES, renameSavedQrSchema } from "@/features/saved-qr/contracts";
import { deleteSavedQrCode, renameSavedQrCode } from "@/features/saved-qr/data";
import {
  authorizeSavedQrMutation,
  savedQrJson,
  withSavedQrApiBoundary,
} from "@/features/saved-qr/api";
import { readBoundedJson } from "@/lib/bounded-json";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const idSchema = z.uuid();

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  return withSavedQrApiBoundary(async () => {
    const auth = await authorizeSavedQrMutation(request);
    if (auth.kind === "response") return auth.response;
    const id = idSchema.safeParse((await params).id);
    if (!id.success) return savedQrJson({ error: "not_found" }, 404);

    const body = await readBoundedJson(request, MAX_SAVED_QR_REQUEST_BYTES);
    if (!body.ok) return savedQrJson({ error: body.error }, body.status);
    const parsed = renameSavedQrSchema.safeParse(body.value);
    if (!parsed.success) return savedQrJson({ error: "invalid_name" }, 400);
    const updated = await renameSavedQrCode(auth.user.id, id.data, parsed.data.name);
    return updated
      ? savedQrJson({ ok: true }, 200)
      : savedQrJson({ error: "not_found" }, 404);
  });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  return withSavedQrApiBoundary(async () => {
    const auth = await authorizeSavedQrMutation(request);
    if (auth.kind === "response") return auth.response;
    const id = idSchema.safeParse((await params).id);
    if (!id.success) return savedQrJson({ error: "not_found" }, 404);
    const deleted = await deleteSavedQrCode(auth.user.id, id.data);
    return deleted
      ? savedQrJson({ ok: true }, 200)
      : savedQrJson({ error: "not_found" }, 404);
  });
}
