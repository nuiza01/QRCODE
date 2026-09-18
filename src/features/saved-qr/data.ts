import "server-only";

import { randomUUID } from "node:crypto";

import { and, count, desc, eq } from "drizzle-orm";

import { getDb, schema } from "@/db";
import type { CreateSavedQrInput } from "@/features/saved-qr/contracts";
import { canSaveStaticQr } from "@/features/saved-qr/quota";

export type SavedQrSummary = Pick<
  typeof schema.qrCodes.$inferSelect,
  "id" | "name" | "mode" | "contentType" | "isActive" | "createdAt" | "updatedAt"
>;

export async function listSavedQrCodes(userId: string): Promise<SavedQrSummary[]> {
  return getDb()
    .select({
      id: schema.qrCodes.id,
      name: schema.qrCodes.name,
      mode: schema.qrCodes.mode,
      contentType: schema.qrCodes.contentType,
      isActive: schema.qrCodes.isActive,
      createdAt: schema.qrCodes.createdAt,
      updatedAt: schema.qrCodes.updatedAt,
    })
    .from(schema.qrCodes)
    .where(eq(schema.qrCodes.userId, userId))
    .orderBy(desc(schema.qrCodes.updatedAt), desc(schema.qrCodes.createdAt));
}

export async function createSavedQrCode(
  userId: string,
  input: CreateSavedQrInput,
): Promise<
  | { status: "created"; id: string }
  | { status: "quota_exceeded" }
  | { status: "owner_missing" }
> {
  return getDb().transaction(async (transaction) => {
    // All saved-static insert paths lock this durable per-user row first.
    // Concurrent transactions for one account therefore count and insert in
    // series, while different accounts remain independent.
    const [owner] = await transaction
      .select({ id: schema.user.id })
      .from(schema.user)
      .where(eq(schema.user.id, userId))
      .limit(1)
      .for("update");
    if (!owner) return { status: "owner_missing" } as const;

    const [aggregate] = await transaction
      .select({ value: count() })
      .from(schema.qrCodes)
      .where(
        and(eq(schema.qrCodes.userId, userId), eq(schema.qrCodes.mode, "static")),
      );
    if (!canSaveStaticQr(Number(aggregate?.value ?? 0))) {
      return { status: "quota_exceeded" } as const;
    }

    const id = randomUUID();
    await transaction.insert(schema.qrCodes).values({
      id,
      userId,
      name: input.name,
      mode: "static",
      contentType: input.payload.type,
      payload: input.payload,
      style: input.style,
    });
    return { status: "created", id } as const;
  });
}

async function findOwnedQrCode(userId: string, id: string) {
  const [record] = await getDb()
    .select()
    .from(schema.qrCodes)
    .where(and(eq(schema.qrCodes.id, id), eq(schema.qrCodes.userId, userId)))
    .limit(1);
  return record ?? null;
}

export async function renameSavedQrCode(
  userId: string,
  id: string,
  name: string,
): Promise<boolean> {
  if (!(await findOwnedQrCode(userId, id))) return false;
  await getDb()
    .update(schema.qrCodes)
    .set({ name, updatedAt: new Date() })
    .where(and(eq(schema.qrCodes.id, id), eq(schema.qrCodes.userId, userId)));
  return true;
}

export async function deleteSavedQrCode(userId: string, id: string): Promise<boolean> {
  if (!(await findOwnedQrCode(userId, id))) return false;
  await getDb()
    .delete(schema.qrCodes)
    .where(and(eq(schema.qrCodes.id, id), eq(schema.qrCodes.userId, userId)));
  return true;
}

export async function duplicateSavedQrCode(
  userId: string,
  id: string,
): Promise<
  | { status: "created"; id: string }
  | { status: "quota_exceeded" }
  | { status: "not_found" }
> {
  return getDb().transaction(async (transaction) => {
    const [owner] = await transaction
      .select({ id: schema.user.id })
      .from(schema.user)
      .where(eq(schema.user.id, userId))
      .limit(1)
      .for("update");
    if (!owner) return { status: "not_found" } as const;

    const [source] = await transaction
      .select()
      .from(schema.qrCodes)
      .where(and(eq(schema.qrCodes.id, id), eq(schema.qrCodes.userId, userId)))
      .limit(1);
    if (!source) return { status: "not_found" } as const;

    const [aggregate] = await transaction
      .select({ value: count() })
      .from(schema.qrCodes)
      .where(
        and(eq(schema.qrCodes.userId, userId), eq(schema.qrCodes.mode, "static")),
      );
    if (!canSaveStaticQr(Number(aggregate?.value ?? 0))) {
      return { status: "quota_exceeded" } as const;
    }

    const copyId = randomUUID();
    await transaction.insert(schema.qrCodes).values({
      id: copyId,
      userId,
      folderId: source.folderId,
      name: `${source.name.slice(0, 153)} copy`,
      mode: "static",
      contentType: source.contentType,
      payload: source.payload,
      style: source.style,
      isActive: true,
    });
    return { status: "created", id: copyId } as const;
  });
}
