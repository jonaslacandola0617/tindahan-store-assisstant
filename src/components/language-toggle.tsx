"use client";
import { useState } from "react";
import { LoadingIcon } from "@/components/loading";
import { persistLanguagePreference } from "@/components/language-preference";
import { loadingCopy } from "@/modules/i18n/messages";

export function LanguageToggle({ locale }: { locale: "EN" | "FIL" }) {
  const [pending, setPending] = useState<"EN" | "FIL" | null>(null);

  async function select(language: "EN" | "FIL") {
    if (language === locale || pending) return;
    setPending(language);
    try {
      await persistLanguagePreference(language);
      window.location.reload();
    } catch {
      setPending(null);
    }
  }

  return <div className="segmented" role="group" aria-label="Language" aria-busy={Boolean(pending)}>{(["EN", "FIL"] as const).map((language) => <button key={language} type="button" className={locale === language ? "active" : ""} disabled={Boolean(pending)} onClick={() => void select(language)}>{pending === language ? <><LoadingIcon size="compact"/><span className="sr-only">{loadingCopy(locale, "changingLanguage")}</span></> : language}</button>)}</div>;
}
