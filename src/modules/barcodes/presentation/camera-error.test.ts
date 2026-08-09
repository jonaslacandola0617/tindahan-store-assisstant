import { describe, expect, it } from "vitest";
import { cameraErrorKind, shouldAutoStartCamera } from "./camera-error";

function namedError(name: string) {
  const error = new Error(name);
  error.name = name;
  return error;
}

describe("cameraErrorKind", () => {
  it.each([
    ["NotAllowedError", "denied"],
    ["SecurityError", "denied"],
    ["NotFoundError", "missing"],
    ["OverconstrainedError", "missing"],
    ["NotReadableError", "busy"],
    ["AbortError", "busy"],
    ["TypeError", "unsupported"],
    ["UnknownError", "unavailable"],
  ] as const)("maps %s to %s", (name, expected) => {
    expect(cameraErrorKind(namedError(name))).toBe(expected);
  });
});

describe("shouldAutoStartCamera", () => {
  it("starts immediately only after permission has already been granted", () => {
    expect(shouldAutoStartCamera("granted")).toBe(true);
    expect(shouldAutoStartCamera("prompt")).toBe(false);
    expect(shouldAutoStartCamera("denied")).toBe(false);
    expect(shouldAutoStartCamera(undefined)).toBe(false);
  });
});
