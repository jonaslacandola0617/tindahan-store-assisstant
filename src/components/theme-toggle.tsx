"use client";
import { useEffect, useState } from "react";
import { Icon } from "./icon";
import { applyThemePreference, persistThemePreference, THEME_CHANGED_EVENT } from "./theme-preference";

export function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const sync = () => setDark(document.documentElement.dataset.theme === "dark");
    sync();
    window.addEventListener(THEME_CHANGED_EVENT, sync);
    return () => window.removeEventListener(THEME_CHANGED_EVENT, sync);
  }, []);

  async function toggle() {
    const next = !dark;
    const previousPreference = document.documentElement.dataset.themePreference === "SYSTEM"
      ? "SYSTEM"
      : dark ? "DARK" : "LIGHT";
    const nextPreference = next ? "DARK" : "LIGHT";

    applyThemePreference(nextPreference, { persist: false });
    try {
      await persistThemePreference(nextPreference);
    } catch {
      applyThemePreference(previousPreference, { persist: false });
    }
  }

  return (
    <button
      className="btn-icon btn-ghost"
      type="button"
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      aria-pressed={dark}
      onClick={toggle}
    >
      <Icon name={dark ? "sun" : "moon"} />
    </button>
  );
}
