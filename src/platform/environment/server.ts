import { z } from "zod";

const blankToUndefined = (value: unknown) => typeof value === "string" && value.trim() === "" ? undefined : value;
const optionalText = z.preprocess(blankToUndefined, z.string().trim().min(1).optional());
const optionalUrl = z.preprocess(blankToUndefined, z.string().url().optional());
const optionalSecret = z.preprocess(blankToUndefined, z.string().min(24).optional());

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  AWS_LAMBDA_FUNCTION_NAME: optionalText,
  AWS_EXECUTION_ENV: optionalText,
  DATABASE_URL: z.string().url().optional(),
  DIRECT_URL: z.string().url().optional(),
  TEST_DATABASE_URL: z.string().url().optional(),
  TEST_DIRECT_DATABASE_URL: z.string().url().optional(),
  TEST_DATABASE: z.string().url().optional(),
  NEXTAUTH_SECRET: z.string().min(32).optional(),
  NEXTAUTH_URL: z.string().url().optional(),
  AUTH_DEMO_MODE: z.enum(["true", "false"]).default("false"),
  DEMO_EMAIL: z.string().email().default("rosa@tindahan.local"),
  DEMO_PASSWORD: z.string().min(8).default("tindahan123"),
  BILLING_PROVIDER: z.enum(["manual"]).default("manual"),
  TRIAL_DAYS: z.coerce.number().int().min(1).max(90).default(30),
  BILLING_GRACE_DAYS: z.coerce.number().int().min(1).max(30).default(7),
  STAFF_INVITE_TTL_DAYS: z.coerce.number().int().min(1).max(30).default(7),
  RECEIPT_STORAGE_PROVIDER: z.enum(["local", "aws", "s3"]).default("local"),
  RECEIPT_STORAGE_DIR: z.string().default(".tindahan-private/receipts"),
  RECEIPT_S3_ENDPOINT: optionalUrl,
  RECEIPT_S3_REGION: optionalText,
  RECEIPT_S3_BUCKET: optionalText,
  RECEIPT_S3_ACCESS_KEY_ID: optionalText,
  RECEIPT_S3_SECRET_ACCESS_KEY: optionalText,
  RECEIPT_S3_FORCE_PATH_STYLE: z.enum(["true", "false"]).default("false"),
  RECEIPT_UPLOAD_TTL_SECONDS: z.coerce.number().int().min(60).max(3600).default(600),
  RECEIPT_READ_TTL_SECONDS: z.coerce.number().int().min(30).max(3600).default(300),
  RECEIPT_JOB_PROVIDER: z.enum(["database", "webhook"]).default("database"),
  RECEIPT_JOB_WAKE_URL: optionalUrl,
  RECEIPT_JOB_SECRET: optionalSecret,
  RECEIPT_OCR_PROVIDER: z.enum(["mock", "http", "azure"]).default("mock"),
  RECEIPT_OCR_ENDPOINT: optionalUrl,
  RECEIPT_OCR_API_KEY: optionalText,
  RECEIPT_OCR_API_VERSION: optionalText,
  AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT: optionalUrl,
  AZURE_DOCUMENT_INTELLIGENCE_API_KEY: optionalText,
  AZURE_DOCUMENT_INTELLIGENCE_API_VERSION: optionalText,
});

export type ServerEnvironment = z.infer<typeof schema> & { demoMode: boolean };

export function parseServerEnvironment(source: NodeJS.ProcessEnv): ServerEnvironment {
  const parsed = schema.parse(source);
  const value = {
    ...parsed,
    RECEIPT_OCR_ENDPOINT: parsed.RECEIPT_OCR_ENDPOINT ?? parsed.AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT,
    RECEIPT_OCR_API_KEY: parsed.RECEIPT_OCR_API_KEY ?? parsed.AZURE_DOCUMENT_INTELLIGENCE_API_KEY,
    RECEIPT_OCR_API_VERSION: parsed.RECEIPT_OCR_API_VERSION ?? parsed.AZURE_DOCUMENT_INTELLIGENCE_API_VERSION ?? "2024-11-30",
  };
  const demoMode = value.AUTH_DEMO_MODE === "true";
  const lambdaRuntime = Boolean(value.AWS_LAMBDA_FUNCTION_NAME || value.AWS_EXECUTION_ENV?.startsWith("AWS_Lambda_"));
  // `next build` evaluates server modules while collecting route metadata. It
  // does not serve requests or access receipt infrastructure, so production
  // runtime checks belong to `next start`, not the compilation phase.
  const productionRuntime = value.NODE_ENV === "production" && source.NEXT_PHASE !== "phase-production-build";

  if (productionRuntime && demoMode) {
    throw new Error("AUTH_DEMO_MODE cannot be enabled in production.");
  }

  if (productionRuntime && (!value.DATABASE_URL || (!lambdaRuntime && !value.NEXTAUTH_SECRET))) {
    throw new Error(lambdaRuntime ? "DATABASE_URL is required in the Lambda worker." : "DATABASE_URL and NEXTAUTH_SECRET are required in production.");
  }
  if (productionRuntime && value.RECEIPT_STORAGE_PROVIDER === "local") {
    throw new Error("RECEIPT_STORAGE_PROVIDER must use private S3 storage in production.");
  }
  const hasAccessKey = Boolean(value.RECEIPT_S3_ACCESS_KEY_ID);
  const hasSecretKey = Boolean(value.RECEIPT_S3_SECRET_ACCESS_KEY);
  if (hasAccessKey !== hasSecretKey) throw new Error("S3 receipt credentials must be configured as a complete pair.");
  if (value.RECEIPT_STORAGE_PROVIDER !== "local" && (!value.RECEIPT_S3_REGION || !value.RECEIPT_S3_BUCKET || (!lambdaRuntime && !hasAccessKey))) {
    throw new Error("S3 receipt storage configuration is incomplete.");
  }
  if (productionRuntime && value.RECEIPT_OCR_PROVIDER === "mock") {
    throw new Error("RECEIPT_OCR_PROVIDER must be configured for production.");
  }
  if (value.RECEIPT_OCR_PROVIDER === "http" && !value.RECEIPT_OCR_ENDPOINT) {
    throw new Error("RECEIPT_OCR_ENDPOINT is required for the HTTP receipt provider.");
  }
  if (value.RECEIPT_OCR_PROVIDER === "azure") {
    if (!value.RECEIPT_OCR_ENDPOINT || !value.RECEIPT_OCR_API_KEY) throw new Error("Azure receipt OCR configuration is incomplete.");
    if (new URL(value.RECEIPT_OCR_ENDPOINT).protocol !== "https:") throw new Error("Azure receipt OCR endpoint must use HTTPS.");
    if (value.RECEIPT_OCR_API_VERSION !== "2024-11-30") throw new Error("Unsupported Azure Document Intelligence API version.");
  }
  if (productionRuntime && value.RECEIPT_OCR_PROVIDER !== "azure") {
    throw new Error("RECEIPT_OCR_PROVIDER must be azure in production.");
  }
  if (productionRuntime && value.RECEIPT_JOB_PROVIDER === "webhook" && (!value.RECEIPT_JOB_WAKE_URL || !value.RECEIPT_JOB_SECRET)) {
    throw new Error("Receipt job webhook configuration is incomplete.");
  }

  return { ...value, demoMode };
}

export const serverEnvironment = parseServerEnvironment(process.env);
