"use client";
import { useState } from "react";

export function LanguageToggle({ locale }: { locale: "EN" | "FIL" }) {
  const [pending, setPending] = useState(false);
  async function select(language: "EN" | "FIL") {
    setPending(true);
    await fetch("/api/preferences", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ language }) });
    window.location.reload();
  }
  return <div className="segmented" role="group" aria-label="Language">{(["EN", "FIL"] as const).map((language) => <button key={language} type="button" className={locale === language ? "active" : ""} disabled={pending} onClick={() => select(language)}>{language}</button>)}</div>;
}
