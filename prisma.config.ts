import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations", seed: "node --env-file=.env --import tsx prisma/seed.ts" },
  datasource: {
    // Prisma CLI operations use the unpooled connection by default. The
    // application client remains independently configured with DATABASE_URL.
    url:
      process.env.PRISMA_COMMAND_DATABASE_URL ??
      process.env.DIRECT_URL ??
      process.env.DATABASE_URL ??
      "postgresql://postgres:postgres@127.0.0.1:5432/tindahan"
  }
});
