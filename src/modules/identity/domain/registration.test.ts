import { describe, expect, it } from "vitest";
import { accountSetupInput, registrationInput, setupCredentialsInput } from "./registration";

describe("registration validation", () => {
  it("normalizes valid setup credentials", () => {
    expect(setupCredentialsInput.parse({ email: "  Owner@Example.COM ", password: "secure-pass" })).toEqual({
      email: "owner@example.com",
      password: "secure-pass",
    });
  });

  it("rejects malformed emails and short passwords before onboarding", () => {
    expect(setupCredentialsInput.safeParse({ email: "not-an-email", password: "short" }).success).toBe(false);
  });

  it("requires a usable owner name", () => {
    expect(registrationInput.safeParse({ name: " ", email: "owner@example.com", password: "secure-pass" }).success).toBe(false);
  });

  it("rejects a mistyped password confirmation", () => {
    expect(accountSetupInput.safeParse({
      email: "owner@example.com",
      password: "secure-password",
      confirmPassword: "different-password",
    }).success).toBe(false);
  });
});
