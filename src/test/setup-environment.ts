// Integration tests must never inherit the development or production database.
// Unit tests can run without a database, while database-backed tests opt in by
// providing TEST_DATABASE_URL.
const testDatabaseUrl = process.env.TEST_DATABASE_URL ?? process.env.TEST_DATABASE;

if (testDatabaseUrl) {
  process.env.DATABASE_URL = testDatabaseUrl;
  process.env.DIRECT_URL = testDatabaseUrl;
}
