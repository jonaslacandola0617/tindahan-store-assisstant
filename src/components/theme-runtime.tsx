"use client";

import { useEffect } from "react";
import { applyThemePreference, type ThemePreference } from "./theme-preference";

export function ThemeRuntime({ preference }: { preference: ThemePreference }) {
  useEffect(() => {
    applyThemePreference(preference);
    if (preference !== "SYSTEM") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const update = () => applyThemePreference("SYSTEM");
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, [preference]);
  return null;
}

