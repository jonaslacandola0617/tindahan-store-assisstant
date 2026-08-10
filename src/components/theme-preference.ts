export type ThemePreference = "SYSTEM" | "LIGHT" | "DARK";
export type ResolvedTheme = "light" | "dark";

export const THEME_CHANGED_EVENT = "tindahan-theme-changed";

export function resolveTheme(preference: ThemePreference): ResolvedTheme {
  if (preference === "DARK") return "dark";
  if (preference === "LIGHT") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export async function persistThemePreference(
  preference: ThemePreference,
  request: typeof fetch = fetch,
): Promise<void> {
  const response = await request("/api/preferences", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ theme: preference }),
    keepalive: true,
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({})) as { error?: string };
    throw new Error(body.error || "We couldn't change the appearance. Try again.");
  }
}

export function applyThemePreference(
  preference: ThemePreference,
  { persist = true }: { persist?: boolean } = {},
): ResolvedTheme {
  const resolved = resolveTheme(preference);
  document.documentElement.dataset.themePreference = preference;
  document.documentElement.dataset.theme = resolved;
  document.documentElement.style.colorScheme = resolved;
  document.cookie = `tindahan-theme=${preference};path=/;max-age=31536000;samesite=lax`;
  window.dispatchEvent(new CustomEvent(THEME_CHANGED_EVENT, { detail: { preference, resolved } }));

  if (persist) void persistThemePreference(preference).catch(() => undefined);
  return resolved;
}
