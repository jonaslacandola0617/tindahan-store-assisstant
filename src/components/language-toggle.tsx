"use client";
import { useState } from "react";
import { LoadingIcon } from "@/components/loading";
import { loadingCopy } from "@/modules/i18n/messages";

function writeLanguageCookie(language: "EN" | "FIL") {
  document.cookie = `tindahan-language=${language}; Path=/; Max-Age=31536000; SameSite=Lax`;
}

export function LanguageToggle({ locale }: { locale: "EN" | "FIL" }) {
  const [pending, setPending] = useState<"EN" | "FIL" | null>(null);
  function select(language: "EN" | "FIL") {
    if (language === locale) return;
    setPending(language);
    writeLanguageCookie(language);
    void fetch("/api/preferences", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ language }), keepalive: true });
    window.location.reload();
  }
  return <div className="segmented" role="group" aria-label="Language" aria-busy={Boolean(pending)}>{(["EN", "FIL"] as const).map((language) => <button key={language} type="button" className={locale === language ? "active" : ""} disabled={Boolean(pending)} onClick={() => select(language)}>{pending === language ? <><LoadingIcon size="compact"/><span className="sr-only">{loadingCopy(locale, "changingLanguage")}</span></> : language}</button>)}</div>;
}
