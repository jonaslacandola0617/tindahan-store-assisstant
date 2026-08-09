const transientProviderFailures = new Set(["PROVIDER_RATE_LIMITED", "PROVIDER_UNAVAILABLE", "PROVIDER_TIMEOUT"]);

export function receiptRetryDelayMs(code: string, completedAttempts: number, maxAttempts: number) {
  if (!transientProviderFailures.has(code) || completedAttempts >= maxAttempts) return null;
  return Math.min(30_000 * 2 ** Math.max(0, completedAttempts - 1), 5 * 60_000);
}
