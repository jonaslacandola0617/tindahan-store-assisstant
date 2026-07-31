import { describe, expect, it } from "vitest";
import { parseServerEnvironment } from "./server";

describe("server environment", () => {
  it("rejects demo authentication in production", () => {
    expect(() => parseServerEnvironment({ NODE_ENV: "production", AUTH_DEMO_MODE: "true" })).toThrow(
      "AUTH_DEMO_MODE",
    );
  });

  it("allows an explicit development demo", () => {
    expect(parseServerEnvironment({ NODE_ENV: "development", AUTH_DEMO_MODE: "true" }).demoMode).toBe(true);
  });
});
