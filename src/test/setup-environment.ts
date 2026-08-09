// Integration tests must never inherit the development or production database.
// Unit tests can run without a database, while database-backed tests opt in by
// providing TEST_DATABASE_URL.
try { process.loadEnvFile(".env"); } catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }
// The normal suite is deterministic and must never contact paid cloud providers.
process.env.RECEIPT_STORAGE_PROVIDER = "local";
process.env.RECEIPT_OCR_PROVIDER = "mock";
process.env.RATE_LIMIT_PROVIDER = "memory";
const testDatabaseUrl = process.env.TEST_DATABASE_URL ?? process.env.TEST_DATABASE;

if (testDatabaseUrl) {
  const isolatedUrl = new URL(testDatabaseUrl);
  isolatedUrl.searchParams.set("schema", "tindahan_phase3_test");
  process.env.DATABASE_URL = isolatedUrl.toString();
  process.env.DIRECT_URL = isolatedUrl.toString();
}
