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

  it("accepts distinct pooled, direct, and test database connections", () => {
    const environment = parseServerEnvironment({
      NODE_ENV: "development",
      DATABASE_URL: "postgresql://runtime.example.test/tindahan",
      DIRECT_URL: "postgresql://direct.example.test/tindahan",
      TEST_DATABASE_URL: "postgresql://test.example.test/tindahan_test",
    });

    expect(environment.DATABASE_URL).toContain("runtime.example.test");
    expect(environment.DIRECT_URL).toContain("direct.example.test");
    expect(environment.TEST_DATABASE_URL).toContain("test.example.test");
  });
});
