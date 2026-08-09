import { createHash } from "node:crypto";
import { Prisma } from "@/generated/prisma/client";
import { database } from "@/platform/persistence/prisma";
import { serverEnvironment } from "@/platform/environment/server";

type Bucket = { count: number; resetAt: number };
const memoryBuckets = new Map<string, Bucket>();

export type RateLimitResult = { allowed: boolean; retryAfterSeconds: number };

export function rateLimitKey(scope: string, subject: string) {
  return createHash("sha256").update(`${scope}:${subject.trim().toLowerCase()}`).digest("hex");
}

function memoryLimit(keyHash: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const current = memoryBuckets.get(keyHash);
  if (!current || current.resetAt <= now) {
    memoryBuckets.set(keyHash, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSeconds: 0 };
  }
  if (current.count >= limit) return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000)) };
  current.count += 1;
  return { allowed: true, retryAfterSeconds: 0 };
}

async function databaseLimit(keyHash: string, scope: string, limit: number, windowMs: number, storeId?: string): Promise<RateLimitResult> {
  const db = database();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + windowMs);

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const current = await db.rateLimitBucket.findUnique({ where: { keyHash } });
    if (!current) {
      try {
        await db.rateLimitBucket.create({ data: { keyHash, scope, storeId, count: 1, expiresAt } });
        return { allowed: true, retryAfterSeconds: 0 };
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") continue;
        throw error;
      }
    }

    if (current.expiresAt <= now) {
      const reset = await db.rateLimitBucket.updateMany({ where: { id: current.id, expiresAt: { lte: now } }, data: { count: 1, expiresAt, scope, storeId } });
      if (reset.count === 1) return { allowed: true, retryAfterSeconds: 0 };
      continue;
    }

    const incremented = await db.rateLimitBucket.updateMany({ where: { id: current.id, expiresAt: { gt: now }, count: { lt: limit } }, data: { count: { increment: 1 } } });
    if (incremented.count === 1) return { allowed: true, retryAfterSeconds: 0 };
    const latest = await db.rateLimitBucket.findUnique({ where: { keyHash }, select: { expiresAt: true } });
    return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil(((latest?.expiresAt ?? current.expiresAt).getTime() - now.getTime()) / 1000)) };
  }

  return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil(windowMs / 1000)) };
}

export async function consumeRateLimit(scope: string, subject: string, limit: number, windowMs: number, storeId?: string) {
  if (!Number.isInteger(limit) || limit < 1 || !Number.isFinite(windowMs) || windowMs < 1) throw new Error("Invalid rate limit policy.");
  const keyHash = rateLimitKey(scope, subject);
  return serverEnvironment.RATE_LIMIT_PROVIDER === "memory" ? memoryLimit(keyHash, limit, windowMs) : databaseLimit(keyHash, scope, limit, windowMs, storeId);
}

export async function clearRateLimit(scope: string, subject: string) {
  const keyHash = rateLimitKey(scope, subject);
  if (serverEnvironment.RATE_LIMIT_PROVIDER === "memory") {
    memoryBuckets.delete(keyHash);
    return;
  }
  await database().rateLimitBucket.deleteMany({ where: { keyHash } });
}

export function resetMemoryRateLimitsForTests() {
  memoryBuckets.clear();
}
