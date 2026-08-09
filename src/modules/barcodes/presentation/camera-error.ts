export type CameraErrorKind = "denied" | "missing" | "busy" | "unsupported" | "unavailable";

export function shouldAutoStartCamera(permission: PermissionState | undefined) {
  return permission === "granted";
}

export function cameraErrorKind(error: unknown): CameraErrorKind {
  const name = error instanceof Error ? error.name : "";

  if (name === "NotAllowedError" || name === "SecurityError") return "denied";
  if (name === "NotFoundError" || name === "OverconstrainedError") return "missing";
  if (name === "NotReadableError" || name === "AbortError") return "busy";
  if (name === "TypeError") return "unsupported";
  return "unavailable";
}
