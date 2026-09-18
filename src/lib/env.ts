import "server-only";
import { z } from "zod";

/**
 * Server environment.
 *
 * Parsed lazily rather than at module load: `next build` imports every module
 * to collect route metadata, and a top-level parse would make the build fail on
 * any machine without a database — including CI, which has no reason to have one.
 */
const serverEnvSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  /** Salt for hashing scan IPs. Rotating it deliberately breaks visitor linkage. */
  SCAN_IP_SALT: z.string().min(16).optional(),
  /** Public origin, used to build short links. */
  NEXT_PUBLIC_APP_URL: z.string().optional(),
  /** Short domain that serves /r/[code]. Falls back to the app origin. */
  NEXT_PUBLIC_SHORT_URL: z.string().optional(),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

let cached: ServerEnv | null = null;

export function getEnv(): ServerEnv {
  if (cached) return cached;

  const parsed = serverEnvSchema.safeParse(process.env);
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `  ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(`Invalid environment variables:\n${details}`);
  }

  cached = parsed.data;
  return cached;
}
