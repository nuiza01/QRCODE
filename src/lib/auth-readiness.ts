import "server-only";

import {
  createAuthOperationFailure,
  withAuthOperationDeadline,
} from "@/lib/auth-operation";

type Initializable = { $context: PromiseLike<unknown> };

type ReadinessOptions = {
  cooldownMs: number;
  initializationTimeoutMs: number;
};

export class AuthReadinessCache<T extends Initializable> {
  private cached: T | null = null;
  private generation = 0;
  private pending: { generation: number; value: Promise<T> } | null = null;
  private retryAfter = 0;

  constructor(
    private readonly build: () => T,
    private readonly options: ReadinessOptions,
  ) {}

  async get(): Promise<T> {
    if (this.cached) return this.cached;
    if (this.pending) return this.pending.value;
    if (Date.now() < this.retryAfter) throw createAuthOperationFailure();

    const generation = ++this.generation;
    const value = withAuthOperationDeadline(async () => {
      const auth = this.build();
      await auth.$context;
      return auth;
    }, this.options.initializationTimeoutMs).then(
      (auth) => {
        if (this.generation === generation) {
          this.cached = auth;
          this.pending = null;
        }
        return auth;
      },
      () => {
        if (this.generation === generation) {
          this.pending = null;
          this.retryAfter = Date.now() + this.options.cooldownMs;
        }
        throw createAuthOperationFailure();
      },
    );
    this.pending = { generation, value };
    return value;
  }
}
