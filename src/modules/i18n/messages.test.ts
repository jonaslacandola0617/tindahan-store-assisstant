import { describe, expect, it } from "vitest";
import { dictionary } from "./messages";

describe("bilingual messages", () => {
  it("falls back to English and resolves Filipino explicitly", () => {
    expect(dictionary(undefined).dashboard).toBe("Dashboard");
    expect(dictionary("FIL").dashboard).toBe("Buod");
  });
});
