export type ThemePreference = "SYSTEM" | "LIGHT" | "DARK";
export type ResolvedTheme = "light" | "dark";

export const THEME_CHANGED_EVENT = "tindahan-theme-changed";

export function resolveTheme(preference: ThemePreference): ResolvedTheme {
  if (preference === "DARK") return "dark";
  if (preference === "LIGHT") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function applyThemePreference(preference: ThemePreference): ResolvedTheme {
  const resolved = resolveTheme(preference);
  document.documentElement.dataset.themePreference = preference;
  document.documentElement.dataset.theme = resolved;
  document.documentElement.style.colorScheme = resolved;
  window.dispatchEvent(new CustomEvent(THEME_CHANGED_EVENT, { detail: { preference, resolved } }));
  return resolved;
}

