import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./password";

describe("password hashing", () => {
  it("accepts the original password and rejects a different password", async () => {
    const hash = await hashPassword("safe-password-123");
    expect(await verifyPassword("safe-password-123", hash)).toBe(true);
    expect(await verifyPassword("wrong-password", hash)).toBe(false);
  });
});
