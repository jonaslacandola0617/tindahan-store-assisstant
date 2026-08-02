import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { serverEnvironment } from "@/platform/environment/server";

const globalDatabase = globalThis as unknown as { prisma?: PrismaClient };

export function database(): PrismaClient {
  if (!serverEnvironment.DATABASE_URL) throw new Error("DATABASE_URL is not configured.");
  if (!globalDatabase.prisma) {
    const connectionUrl = new URL(serverEnvironment.DATABASE_URL);
    const schema = connectionUrl.searchParams.get("schema") ?? undefined;
    globalDatabase.prisma = new PrismaClient({
      adapter: new PrismaPg({ connectionString: serverEnvironment.DATABASE_URL }, { schema }),
    });
  }
  return globalDatabase.prisma;
}
