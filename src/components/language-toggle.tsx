"use client";
import { useState } from "react";

function writeLanguageCookie(language: "EN" | "FIL") {
  document.cookie = `tindahan-language=${language}; Path=/; Max-Age=31536000; SameSite=Lax`;
}

export function LanguageToggle({ locale }: { locale: "EN" | "FIL" }) {
  const [pending, setPending] = useState(false);
  function select(language: "EN" | "FIL") {
    setPending(true);
    writeLanguageCookie(language);
    void fetch("/api/preferences", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ language }), keepalive: true });
    window.location.reload();
  }
  return <div className="segmented" role="group" aria-label="Language">{(["EN", "FIL"] as const).map((language) => <button key={language} type="button" className={locale === language ? "active" : ""} disabled={pending} onClick={() => select(language)}>{language}</button>)}</div>;
}
