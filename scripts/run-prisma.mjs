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

const connectionUrl =
  target === "test"
    ? process.env.TEST_DATABASE_URL ?? process.env.TEST_DATABASE
    : process.env.DIRECT_URL ?? process.env.DATABASE_URL;

if (!connectionUrl) {
  const requiredName = target === "test" ? "TEST_DATABASE_URL (or legacy TEST_DATABASE)" : "DIRECT_URL or DATABASE_URL";
  console.error(`${requiredName} must be configured before running this command.`);
  process.exit(1);
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
