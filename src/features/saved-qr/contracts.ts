import { z } from "zod";

import { qrPayloadSchema, qrStyleSchema } from "@/qr/schemas";

export {
  canSaveStaticQr,
  FREE_SAVED_STATIC_QR_LIMIT,
  SAVED_STATIC_QR_QUOTA_ERROR,
} from "./quota";

export const FREE_DYNAMIC_QR_LIMIT = 5;
export const MAX_SAVED_QR_REQUEST_BYTES = 800_000;

const nameSchema = z.string().trim().min(1).max(160);

export const createSavedQrSchema = z
  .object({
    name: nameSchema,
    mode: z.literal("static").default("static"),
    payload: qrPayloadSchema,
    style: qrStyleSchema,
  })
  .superRefine((value, context) => {
    const bytes = new TextEncoder().encode(JSON.stringify(value)).byteLength;
    if (bytes > MAX_SAVED_QR_REQUEST_BYTES) {
      context.addIssue({ code: "custom", message: "savedQr.tooLarge" });
    }
  });

export const renameSavedQrSchema = z.object({ name: nameSchema });

export type CreateSavedQrInput = z.infer<typeof createSavedQrSchema>;

export function canCreateDynamicQr(activeDynamicCount: number): boolean {
  return (
    Number.isSafeInteger(activeDynamicCount) &&
    activeDynamicCount >= 0 &&
    activeDynamicCount < FREE_DYNAMIC_QR_LIMIT
  );
}
