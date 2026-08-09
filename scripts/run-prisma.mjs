import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

try {
  process.loadEnvFile(resolve(".env"));
} catch (error) {
  if (error?.code !== "ENOENT") throw error;
}

const [target, ...prismaArguments] = process.argv.slice(2);

if (!(["direct", "test"].includes(target)) || prismaArguments.length === 0) {
  console.error("Usage: node scripts/run-prisma.mjs <direct|test> <prisma arguments...>");
  process.exit(1);
}

let connectionUrl =
  target === "test"
    ? process.env.TEST_DIRECT_DATABASE_URL ?? process.env.TEST_DATABASE_URL ?? process.env.TEST_DATABASE
    : process.env.DIRECT_URL ?? process.env.DATABASE_URL;

if (!connectionUrl) {
  const requiredName = target === "test" ? "TEST_DATABASE_URL (or legacy TEST_DATABASE)" : "DIRECT_URL or DATABASE_URL";
  console.error(`${requiredName} must be configured before running this command.`);
  process.exit(1);
}

// Keep automated tests out of the provider's shared `public` schema. This also
// makes the test target safe when a pooled database URL points at a reused DB.
if (target === "test") {
  const url = new URL(connectionUrl);
  // Neon runtime URLs commonly use the transaction pooler, which Prisma's
  // schema engine cannot use for migrations. Keep the same branch/database
  // and resolve its direct host when no explicit test direct URL is supplied.
  if (!process.env.TEST_DIRECT_DATABASE_URL && url.hostname.includes("-pooler.")) {
    url.hostname = url.hostname.replace("-pooler.", ".");
  }
  url.searchParams.set("schema", "tindahan_phase3_test");
  connectionUrl = url.toString();
}

const prismaCli = resolve("node_modules", "prisma", "build", "index.js");
const result = spawnSync(process.execPath, [prismaCli, ...prismaArguments], {
  cwd: process.cwd(),
  env: { ...process.env, PRISMA_COMMAND_DATABASE_URL: connectionUrl },
  stdio: "inherit",
});

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 1);
