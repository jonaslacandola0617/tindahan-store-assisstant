"use client";
import { useEffect, useState } from "react";
import { Icon } from "./icon";
import { applyThemePreference, THEME_CHANGED_EVENT } from "./theme-preference";

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
    const previous = dark ? "DARK" : "LIGHT";
    applyThemePreference(next ? "DARK" : "LIGHT");
    const response = await fetch("/api/preferences", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ theme: next ? "DARK" : "LIGHT" }) });
    if (!response.ok) applyThemePreference(previous);
  }
  return <button className="btn-icon btn-ghost" type="button" aria-label="Toggle dark mode" aria-pressed={dark} onClick={toggle}><Icon name="moon" /></button>;
}
