import { z } from "zod";

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().url().optional(),
  DIRECT_URL: z.string().url().optional(),
  TEST_DATABASE_URL: z.string().url().optional(),
  TEST_DATABASE: z.string().url().optional(),
  NEXTAUTH_SECRET: z.string().min(32).optional(),
  NEXTAUTH_URL: z.string().url().optional(),
  AUTH_DEMO_MODE: z.enum(["true", "false"]).default("false"),
  DEMO_EMAIL: z.string().email().default("rosa@tindahan.local"),
  DEMO_PASSWORD: z.string().min(8).default("tindahan123"),
});

export type ServerEnvironment = z.infer<typeof schema> & { demoMode: boolean };

export function parseServerEnvironment(source: NodeJS.ProcessEnv): ServerEnvironment {
  const value = schema.parse(source);
  const demoMode = value.AUTH_DEMO_MODE === "true";

  if (value.NODE_ENV === "production" && demoMode) {
    throw new Error("AUTH_DEMO_MODE cannot be enabled in production.");
  }

  if (value.NODE_ENV === "production" && (!value.DATABASE_URL || !value.NEXTAUTH_SECRET)) {
    throw new Error("DATABASE_URL and NEXTAUTH_SECRET are required in production.");
  }

  return { ...value, demoMode };
}

export const serverEnvironment = parseServerEnvironment(process.env);
