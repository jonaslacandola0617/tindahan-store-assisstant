import { beforeEach, describe, expect, it } from "vitest";
import { consumeRateLimit, rateLimitKey, resetMemoryRateLimitsForTests } from "./rate-limit";

describe("shared rate-limit boundary", () => {
  beforeEach(() => {
    process.env.RATE_LIMIT_PROVIDER = "memory";
    resetMemoryRateLimitsForTests();
  });

  it("stores only a stable one-way key instead of the subject", () => {
    const result = rateLimitKey("credential-sign-in", "Owner@Example.com");
    expect(result).toMatch(/^[a-f0-9]{64}$/);
    expect(result).not.toContain("owner@example.com");
    expect(result).toBe(rateLimitKey("credential-sign-in", "owner@example.com"));
  });

  it("allows the configured count and then returns a retry window", async () => {
    await expect(consumeRateLimit("test", "subject", 2, 60_000)).resolves.toEqual({ allowed: true, retryAfterSeconds: 0 });
    await expect(consumeRateLimit("test", "subject", 2, 60_000)).resolves.toEqual({ allowed: true, retryAfterSeconds: 0 });
    const denied = await consumeRateLimit("test", "subject", 2, 60_000);
    expect(denied.allowed).toBe(false);
    expect(denied.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("keeps scopes isolated", async () => {
    await consumeRateLimit("one", "subject", 1, 60_000);
    await expect(consumeRateLimit("two", "subject", 1, 60_000)).resolves.toEqual({ allowed: true, retryAfterSeconds: 0 });
  });
});
