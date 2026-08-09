import { describe, expect, it } from "vitest";
import { parseServerEnvironment } from "./server";

describe("server environment", () => {
  it("rejects demo authentication in production", () => {
    expect(() => parseServerEnvironment({ NODE_ENV: "production", AUTH_DEMO_MODE: "true" })).toThrow(
      "AUTH_DEMO_MODE",
    );
  });

  it("allows an explicit development demo", () => {
    expect(parseServerEnvironment({ NODE_ENV: "development", AUTH_DEMO_MODE: "true" }).demoMode).toBe(true);
  });

  it("allows Next.js to analyze routes during a production build", () => {
    expect(() => parseServerEnvironment({
      NODE_ENV: "production",
      NEXT_PHASE: "phase-production-build",
      RECEIPT_STORAGE_PROVIDER: "local",
      RECEIPT_OCR_PROVIDER: "mock",
    })).not.toThrow();
  });

  it("still rejects local receipt storage when the production server runs", () => {
    expect(() => parseServerEnvironment({
      NODE_ENV: "production",
      DATABASE_URL: "postgresql://runtime.example.test/tindahan",
      NEXTAUTH_SECRET: "production-secret-that-is-long-enough",
      RECEIPT_STORAGE_PROVIDER: "local",
      RECEIPT_OCR_PROVIDER: "http",
      RECEIPT_OCR_ENDPOINT: "https://ocr.example.test/extract",
    })).toThrow("RECEIPT_STORAGE_PROVIDER");
  });

  it("accepts distinct pooled, direct, and test database connections", () => {
    const environment = parseServerEnvironment({
      NODE_ENV: "development",
      DATABASE_URL: "postgresql://runtime.example.test/tindahan",
      DIRECT_URL: "postgresql://direct.example.test/tindahan",
      TEST_DATABASE_URL: "postgresql://test.example.test/tindahan_test",
    });

    expect(environment.DATABASE_URL).toContain("runtime.example.test");
    expect(environment.DIRECT_URL).toContain("direct.example.test");
    expect(environment.TEST_DATABASE_URL).toContain("test.example.test");
  });

  it("accepts standard AWS endpoint resolution and Azure aliases", () => {
    const environment = parseServerEnvironment({
      NODE_ENV: "production",
      DATABASE_URL: "postgresql://runtime.example.test/tindahan",
      NEXTAUTH_SECRET: "production-secret-that-is-long-enough",
      RECEIPT_STORAGE_PROVIDER: "aws",
      RECEIPT_S3_ENDPOINT: "",
      RECEIPT_S3_REGION: "ap-southeast-1",
      RECEIPT_S3_BUCKET: "  private-receipts  ",
      RECEIPT_S3_ACCESS_KEY_ID: "test-access-key",
      RECEIPT_S3_SECRET_ACCESS_KEY: "test-secret-key",
      RECEIPT_OCR_PROVIDER: "azure",
      AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT: "https://receipt-ai.example.test/",
      AZURE_DOCUMENT_INTELLIGENCE_API_KEY: "test-api-key",
      AZURE_DOCUMENT_INTELLIGENCE_API_VERSION: "2024-11-30",
      APP_URL: "https://tindahan.example.test",
      BILLING_PROVIDER: "xendit",
      BILLING_STANDARD_MONTHLY_AMOUNT_PHP: "499",
      XENDIT_SECRET_KEY: "xnd_development_secret",
      XENDIT_WEBHOOK_TOKEN: "xendit-callback-token",
      EMAIL_PROVIDER: "resend",
      RESEND_API_KEY: "re_development_key",
      RESEND_FROM_EMAIL: "notifications@tindahan.example.test",
    });
    expect(environment.RECEIPT_S3_ENDPOINT).toBeUndefined();
    expect(environment.RECEIPT_S3_BUCKET).toBe("private-receipts");
    expect(environment.RECEIPT_S3_FORCE_PATH_STYLE).toBe("false");
    expect(environment.RECEIPT_OCR_ENDPOINT).toBe("https://receipt-ai.example.test/");
  });

  it("rejects incomplete AWS and unsafe Azure configuration", () => {
    expect(() => parseServerEnvironment({ NODE_ENV: "development", RECEIPT_STORAGE_PROVIDER: "aws", RECEIPT_S3_REGION: "ap-southeast-1" })).toThrow("S3 receipt storage");
    expect(() => parseServerEnvironment({ NODE_ENV: "development", RECEIPT_OCR_PROVIDER: "azure", RECEIPT_OCR_ENDPOINT: "http://receipt-ai.example.test", RECEIPT_OCR_API_KEY: "key" })).toThrow("HTTPS");
    expect(() => parseServerEnvironment({ NODE_ENV: "development", RECEIPT_OCR_PROVIDER: "azure", RECEIPT_OCR_ENDPOINT: "https://receipt-ai.example.test", RECEIPT_OCR_API_KEY: "key", RECEIPT_OCR_API_VERSION: "2023-07-31" })).toThrow("Unsupported");
  });

  it("uses the Lambda execution role without static S3 credentials", () => {
    const environment = parseServerEnvironment({
      NODE_ENV: "production",
      AWS_LAMBDA_FUNCTION_NAME: "tindahan-receipt-worker",
      DATABASE_URL: "postgresql://runtime.example.test/tindahan",
      RECEIPT_STORAGE_PROVIDER: "aws",
      RECEIPT_S3_REGION: "ap-southeast-1",
      RECEIPT_S3_BUCKET: "private-receipts",
      RECEIPT_OCR_PROVIDER: "azure",
      RECEIPT_OCR_ENDPOINT: "https://receipt-ai.example.test/",
      RECEIPT_OCR_API_KEY: "test-api-key",
    });
    expect(environment.RECEIPT_S3_ACCESS_KEY_ID).toBeUndefined();
    expect(environment.NEXTAUTH_SECRET).toBeUndefined();
  });

  it("rejects partial explicit S3 credentials", () => {
    expect(() => parseServerEnvironment({ NODE_ENV: "development", RECEIPT_S3_ACCESS_KEY_ID: "access-only" })).toThrow("complete pair");
  });

  it("bounds receipt URL lifetimes", () => {
    expect(() => parseServerEnvironment({ NODE_ENV: "development", RECEIPT_UPLOAD_TTL_SECONDS: "0" })).toThrow();
    expect(() => parseServerEnvironment({ NODE_ENV: "development", RECEIPT_READ_TTL_SECONDS: "86400" })).toThrow();
  });

  it("provides bounded SaaS readiness defaults", () => {
    const environment = parseServerEnvironment({ NODE_ENV: "test" });
    expect(environment.BILLING_PROVIDER).toBe("manual");
    expect(environment.TRIAL_DAYS).toBe(30);
    expect(environment.BILLING_GRACE_DAYS).toBe(7);
    expect(environment.STAFF_INVITE_TTL_DAYS).toBe(7);
    expect(() => parseServerEnvironment({ NODE_ENV: "test", TRIAL_DAYS: "0" })).toThrow();
    expect(() => parseServerEnvironment({ NODE_ENV: "test", STAFF_INVITE_TTL_DAYS: "365" })).toThrow();
  });

  it("requires complete Xendit and Resend settings when selected", () => {
    expect(() => parseServerEnvironment({ NODE_ENV: "development", BILLING_PROVIDER: "xendit" })).toThrow("Xendit billing");
    expect(() => parseServerEnvironment({ NODE_ENV: "development", EMAIL_PROVIDER: "resend" })).toThrow("Resend email");
    expect(() => parseServerEnvironment({ NODE_ENV: "development", BILLING_TAX_ENABLED: "true", BILLING_TAX_RATE_BPS: "0" })).toThrow("BILLING_TAX_RATE_BPS");
  });

  it("requires shared database rate limiting in a production runtime", () => {
    expect(() => parseServerEnvironment({
      NODE_ENV: "production",
      RATE_LIMIT_PROVIDER: "memory",
      DATABASE_URL: "postgresql://runtime.example.test/tindahan",
      NEXTAUTH_SECRET: "production-secret-that-is-long-enough",
    })).toThrow("RATE_LIMIT_PROVIDER");
  });
});
