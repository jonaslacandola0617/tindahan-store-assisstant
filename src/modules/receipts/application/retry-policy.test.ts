import { describe, expect, it } from "vitest";
import { receiptRetryDelayMs } from "./retry-policy";

describe("receipt provider retry policy", () => {
  it("retries transient provider failures with bounded backoff", () => {
    expect(receiptRetryDelayMs("PROVIDER_TIMEOUT", 1, 3)).toBe(30_000);
    expect(receiptRetryDelayMs("PROVIDER_RATE_LIMITED", 2, 3)).toBe(60_000);
    expect(receiptRetryDelayMs("PROVIDER_UNAVAILABLE", 10, 20)).toBe(300_000);
  });

  it("stops at the attempt limit and does not retry permanent failures", () => {
    expect(receiptRetryDelayMs("PROVIDER_TIMEOUT", 3, 3)).toBeNull();
    expect(receiptRetryDelayMs("PROVIDER_AUTHENTICATION", 1, 3)).toBeNull();
    expect(receiptRetryDelayMs("UNSUPPORTED_IMAGE", 1, 3)).toBeNull();
  });
});
