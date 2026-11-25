import "server-only";
import { z } from "zod";

/**
 * Server environment configuration. Parsed lazily on first use so that
 * `next build` does not require production secrets to be present.
 * In ECS these values come from the task definition (plain config) and
 * AWS Secrets Manager (secrets such as MONGODB_URI).
 */
const boolish = z
  .enum(["true", "false", "1", "0"])
  .optional()
  .transform((v) => v === "true" || v === "1");

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  /**
   * Deployment environment. Independent of NODE_ENV (which is always
   * "production" inside the built image). staging/production enforce SES,
   * S3 and an https APP_URL.
   */
  APP_ENV: z.enum(["development", "staging", "production"]).default("development"),
  APP_URL: z.url(),
  MONGODB_URI: z.string().min(1),
  MONGODB_DB_NAME: z.string().min(1).default("codka_bulshada"),

  SESSION_TTL_DAYS: z.coerce.number().int().min(1).max(90).default(14),
  /**
   * Number of trusted reverse proxies in front of the app that append to
   * X-Forwarded-For. CloudFront -> ALB -> app = 2. Direct ALB = 1. Local = 0.
   */
  TRUSTED_PROXY_HOPS: z.coerce.number().int().min(0).max(5).default(0),

  /** When false (default), users can post, comment and upload without verifying their email. */
  REQUIRE_EMAIL_VERIFICATION: boolish,
  /** "s3" (staging/production) or "mongodb" (local development: images stored in GridFS). */
  STORAGE_DRIVER: z.enum(["s3", "mongodb"]).default("s3"),

  AWS_REGION: z.string().min(1).default("eu-west-1"),
  S3_BUCKET: z.string().min(1).optional(),
  S3_UPLOAD_URL_TTL_SECONDS: z.coerce.number().int().min(60).max(3600).default(300),
  S3_DOWNLOAD_URL_TTL_SECONDS: z.coerce.number().int().min(60).max(3600).default(900),
  CLOUDFRONT_URL: z.url().optional(),
  // Optional custom endpoint (e.g. LocalStack / MinIO) for local development only.
  S3_ENDPOINT: z.url().optional(),
  S3_FORCE_PATH_STYLE: boolish,

  EMAIL_TRANSPORT: z.enum(["ses", "console"]).default("console"),
  SES_FROM_EMAIL: z.string().min(3).optional(),
  SES_CONFIGURATION_SET: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | null = null;

export function getEnv(): Env {
  if (cached) return cached;
  // Empty strings in .env files count as "unset".
  const raw = Object.fromEntries(Object.entries(process.env).filter(([, v]) => v !== ""));
  const parsed = envSchema.safeParse(raw);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new Error(`Invalid environment configuration: ${issues}`);
  }
  const env = parsed.data;
  if (env.APP_ENV !== "development") {
    if (env.EMAIL_TRANSPORT !== "ses") {
      throw new Error(`EMAIL_TRANSPORT must be 'ses' when APP_ENV=${env.APP_ENV}`);
    }
    if (!env.SES_FROM_EMAIL) throw new Error(`SES_FROM_EMAIL is required when APP_ENV=${env.APP_ENV}`);
    if (env.STORAGE_DRIVER !== "s3") throw new Error(`STORAGE_DRIVER must be 's3' when APP_ENV=${env.APP_ENV}`);
    if (!env.S3_BUCKET) throw new Error(`S3_BUCKET is required when APP_ENV=${env.APP_ENV}`);
    if (!env.APP_URL.startsWith("https://")) throw new Error(`APP_URL must use https when APP_ENV=${env.APP_ENV}`);
  }
  cached = env;
  return env;
}

/** Test helper: forget the cached env so tests can change process.env. */
export function resetEnvCache() {
  cached = null;
}

/** Cookies are marked Secure (and use the __Host- prefix) whenever the app is served over https. */
export function isSecureOrigin() {
  return getEnv().APP_URL.startsWith("https://");
}
