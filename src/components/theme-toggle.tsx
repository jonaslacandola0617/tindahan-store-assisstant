"use client";
import { useState } from "react";
import { Icon } from "./icon";

export function ThemeToggle() {
  const [dark, setDark] = useState(false);
  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.dataset.theme = next ? "dark" : "light";
    void fetch("/api/preferences", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ theme: next ? "DARK" : "LIGHT" }) });
  }
  return <button className="btn-icon btn-ghost" type="button" aria-label="Toggle dark mode" aria-pressed={dark} onClick={toggle}><Icon name="moon" /></button>;
}
