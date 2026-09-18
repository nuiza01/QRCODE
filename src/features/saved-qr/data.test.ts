import { beforeEach, describe, expect, it, vi } from "vitest";

import { DEFAULT_STYLE } from "@/qr/types";

vi.mock("server-only", () => ({}));

type SavedRecord = {
  id: string;
  userId: string;
  folderId: string | null;
  name: string;
  mode: "static" | "dynamic";
  contentType: "url";
  payload: { type: "url"; url: string };
  style: typeof DEFAULT_STYLE;
  isActive: boolean;
};

const state = vi.hoisted(() => ({
  records: [] as SavedRecord[],
  lockCalls: [] as string[],
  users: new Set<string>(),
  transactionTail: Promise.resolve(),
}));

vi.mock("drizzle-orm", async (importOriginal) => {
  const actual = await importOriginal<typeof import("drizzle-orm")>();

  return {
    ...actual,
    and: (...conditions: unknown[]) => conditions,
    count: () => ({ kind: "count" }),
    desc: (column: unknown) => column,
    eq: (column: { name: string }, value: unknown) => ({ column: column.name, value }),
  };
});

vi.mock("@/db", async () => {
  const schema = await import("@/db/schema");

  const transaction = {
    select(selection?: Record<string, unknown>) {
      let conditions: Array<{ column: string; value: unknown }> = [];
      const rows = () => {
        const value = (column: string) =>
          conditions.find((condition) => condition.column === column)?.value;
        const userId = String(value("user_id") ?? value("id") ?? "");

        if (selection && "value" in selection) {
          return [
            {
              value: state.records.filter(
                (record) => record.userId === userId && record.mode === "static",
              ).length,
            },
          ];
        }
        if (selection && "id" in selection) {
          return state.users.has(userId) ? [{ id: userId }] : [];
        }

        const recordId = String(value("id") ?? "");
        return state.records.filter(
          (record) => record.id === recordId && record.userId === String(value("user_id")),
        );
      };
      const builder = {
        from() {
          return builder;
        },
        where(condition: unknown) {
          conditions = (Array.isArray(condition) ? condition : [condition]) as Array<{
            column: string;
            value: unknown;
          }>;
          return builder;
        },
        limit() {
          return builder;
        },
        for(strength: string) {
          state.lockCalls.push(strength);
          return Promise.resolve(rows());
        },
        then(resolve: (value: unknown) => unknown, reject: (error: unknown) => unknown) {
          return Promise.resolve(rows()).then(resolve, reject);
        },
      };
      return builder;
    },
    insert() {
      return {
        async values(value: SavedRecord) {
          await Promise.resolve();
          state.records.push({ ...value, folderId: value.folderId ?? null, isActive: true });
        },
      };
    },
  };

  const database = {
    async transaction<T>(callback: (value: typeof transaction) => Promise<T>): Promise<T> {
      let release = () => {};
      const turn = new Promise<void>((resolve) => {
        release = resolve;
      });
      const previous = state.transactionTail;
      state.transactionTail = previous.then(() => turn);
      await previous;
      try {
        return await callback(transaction);
      } finally {
        release();
      }
    },
  };

  return { getDb: () => database, schema };
});

import { createSavedQrCode, duplicateSavedQrCode } from "./data";

const ownerId = "11111111-1111-4111-8111-111111111111";
const input = {
  name: "Campaign",
  mode: "static" as const,
  payload: { type: "url" as const, url: "https://example.com" },
  style: DEFAULT_STYLE,
};

function seed(count: number) {
  state.records = Array.from({ length: count }, (_, index) => ({
    id: `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
    userId: ownerId,
    folderId: null,
    name: `QR ${index}`,
    mode: "static" as const,
    contentType: "url" as const,
    payload: input.payload,
    style: DEFAULT_STYLE,
    isActive: true,
  }));
}

describe("atomic saved-static quota", () => {
  beforeEach(() => {
    state.records = [];
    state.lockCalls = [];
    state.users = new Set([ownerId]);
    state.transactionTail = Promise.resolve();
  });

  it("allows 24 to become 25 and rejects the next save", async () => {
    seed(24);
    await expect(createSavedQrCode(ownerId, input)).resolves.toMatchObject({
      status: "created",
    });
    await expect(createSavedQrCode(ownerId, input)).resolves.toEqual({
      status: "quota_exceeded",
    });
    expect(state.records).toHaveLength(25);
    expect(state.lockCalls).toEqual(["update", "update"]);
  });

  it("serializes concurrent create and duplicate so only one can claim slot 25", async () => {
    seed(24);
    const sourceId = state.records[0]!.id;
    const results = await Promise.all([
      createSavedQrCode(ownerId, input),
      duplicateSavedQrCode(ownerId, sourceId),
    ]);
    expect(results.map((result) => result.status).sort()).toEqual([
      "created",
      "quota_exceeded",
    ]);
    expect(state.records).toHaveLength(25);
    expect(state.lockCalls).toEqual(["update", "update"]);
  });

  it("never duplicates a record owned by another account", async () => {
    seed(1);
    const intruder = "22222222-2222-4222-8222-222222222222";
    state.users.add(intruder);
    await expect(duplicateSavedQrCode(intruder, state.records[0]!.id)).resolves.toEqual({
      status: "not_found",
    });
    expect(state.records).toHaveLength(1);
  });
});
