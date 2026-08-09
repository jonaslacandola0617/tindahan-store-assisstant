import { describe, expect, it, vi } from "vitest";
import { logger, safeLogContext } from "./logger";

describe("privacy-safe structured logging", () => {
  it("redacts secrets and provider URLs recursively", () => {
    expect(safeLogContext({ password: "plain", nested: { apiKey: "key", signedUrl: "https://private" }, receiptId: "r1" })).toEqual({
      password: "[REDACTED]",
      nested: { apiKey: "[REDACTED]", signedUrl: "[REDACTED]" },
      receiptId: "r1",
    });
  });

  it("logs an error name without its potentially sensitive message or stack", () => {
    const output = vi.spyOn(console, "error").mockImplementation(() => undefined);
    logger.error("request_failed", { error: new Error("receipt text and secret") });
    const entry = JSON.parse(String(output.mock.calls[0]?.[0]));
    expect(entry.error).toEqual({ name: "Error" });
    expect(JSON.stringify(entry)).not.toContain("receipt text and secret");
    output.mockRestore();
  });
});
