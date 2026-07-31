"use client";

import { signIn } from "next-auth/react";
import Link from "next/link";
import { useState } from "react";
import { Icon } from "@/components/icon";
import type { Locale } from "@/modules/i18n/messages";

const copy = {
  EN: {
    title1: "Tell us about your store", intro1: "This helps Tindahan feel like it was made for your store.",
    storeName: "Store name", storeNamePlaceholder: "e.g., Maria's Sari-Sari Store", ownerName: "Your name", ownerNamePlaceholder: "e.g., Maria Santos", storeType: "What kind of store is it?",
    title2: "A few preferences", intro2: "You can always change these later in Settings.",
    lowStock: "Notify me about low stock", lowStockHelp: "Get a reminder before you run out",
    dailySummary: "Daily summary", dailySummaryHelp: "A short recap every evening",
    currency: "Amounts are shown in Philippine Peso (₱).", title3: "You're all set", intro3: "Here's what to do first.",
    scan: "Scan your first receipt", inventory: "Look through your inventory", sale: "Record your first sale",
    back: "Back", continue: "Continue", finish: "Go to my dashboard",
  },
  FIL: {
    title1: "Ikwento ang tungkol sa iyong tindahan", intro1: "Makakatulong ito para maangkop ang Tindahan sa iyong tindahan.",
    storeName: "Pangalan ng tindahan", storeNamePlaceholder: "hal., Tindahan ni Maria", ownerName: "Iyong pangalan", ownerNamePlaceholder: "hal., Maria Santos", storeType: "Anong uri ng tindahan?",
    title2: "Ilang kagustuhan", intro2: "Puwede mo pa rin itong baguhin sa Settings.",
    lowStock: "Ipaalam sa akin kung paubos na ang paninda", lowStockHelp: "Bigyan ng paalala bago maubos",
    dailySummary: "Pang-araw-araw na buod", dailySummaryHelp: "Maikling buod tuwing gabi",
    currency: "Ipinapakita ang halaga sa Philippine Peso (₱).", title3: "Handa ka na", intro3: "Ito ang unang dapat gawin.",
    scan: "I-scan ang una mong resibo", inventory: "Tingnan ang iyong imbentaryo", sale: "Itala ang unang benta",
    back: "Bumalik", continue: "Magpatuloy", finish: "Pumunta sa dashboard",
  },
} as const;

type SetupCredentials = { email: string; password: string };

export function OnboardingForm({ locale, isAuthenticated }: { locale: Locale; isAuthenticated: boolean }) {
  const text = copy[locale];
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function completeSetup() {
    const root = document.getElementById("store-setup-form")!;
    const value = (name: string) => (root.querySelector(`[name="${name}"]`) as HTMLInputElement | HTMLSelectElement | null)?.value ?? "";
    const checked = (name: string) => (root.querySelector(`[name="${name}"]`) as HTMLInputElement | null)?.checked ?? false;
    setPending(true);
    setError("");

    if (!isAuthenticated) {
      const stored = sessionStorage.getItem("tindahan-setup-credentials");
      const credentials = stored ? JSON.parse(stored) as SetupCredentials : null;
      if (!credentials?.email || !credentials.password) {
        setError("Return to sign in and enter the email address and password you want to use.");
        setPending(false);
        return;
      }
      const registration = await fetch("/api/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: value("ownerName"), email: credentials.email, password: credentials.password }),
      });
      if (!registration.ok) {
        const result = await registration.json() as { error?: string };
        setError(result.error ?? "Account creation failed.");
        setPending(false);
        return;
      }
      const authentication = await signIn("credentials", { email: credentials.email, password: credentials.password, redirect: false });
      if (!authentication?.ok) {
        setError("Your account was created, but sign-in failed. Return to sign in and try again.");
        setPending(false);
        return;
      }
    }

    const response = await fetch("/api/onboarding", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: value("storeName"),
        language: locale,
        lowStockEnabled: checked("lowStock"),
        dailySummaryEnabled: checked("dailySummary"),
        storeType: value("storeType"),
      }),
    });

    if (!response.ok) {
      const result = await response.json() as { error?: string };
      setError(result.error ?? "Store setup failed.");
      setPending(false);
      return;
    }

    sessionStorage.removeItem("tindahan-setup-credentials");
    setPending(false);
    setStep(3);
  }

  return <div id="store-setup-form">
    <div className="step-indicator" style={{ marginBottom: "var(--space-6)" }} aria-hidden="true">
      {[1, 2, 3].map((dot) => <span key={dot} className={`step-dot${dot === step ? " active" : ""}${dot < step ? " done" : ""}`}/>)
      }
    </div>

    {error && <p className="form-alert" role="alert" style={{ marginBottom: "var(--space-4)" }}>{error}</p>}

    <section hidden={step !== 1}>
      <h1 style={{ marginBottom: "var(--space-2)" }}>{text.title1}</h1>
      <p className="text-muted" style={{ marginBottom: "var(--space-6)" }}>{text.intro1}</p>
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
        <div className="field"><label className="field-label" htmlFor="storeName">{text.storeName}</label><input className="input" id="storeName" name="storeName" type="text" placeholder={text.storeNamePlaceholder} autoComplete="organization" required/></div>
        <div className="field"><label className="field-label" htmlFor="ownerName">{text.ownerName}</label><input className="input" id="ownerName" name="ownerName" type="text" placeholder={text.ownerNamePlaceholder} autoComplete="name" required/></div>
        <div className="field"><label className="field-label" htmlFor="storeType">{text.storeType}</label><div className="select-wrap"><select className="select" id="storeType" name="storeType" defaultValue="Sari-sari store"><option>Sari-sari store</option><option>Mini-mart</option><option>Convenience store</option><option>Other small store</option></select><Icon name="chevronDown"/></div></div>
      </div>
    </section>

    <section hidden={step !== 2}>
      <h1 style={{ marginBottom: "var(--space-2)" }}>{text.title2}</h1>
      <p className="text-muted" style={{ marginBottom: "var(--space-6)" }}>{text.intro2}</p>
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
        <PreferenceRow name="lowStock" title={text.lowStock} help={text.lowStockHelp}/>
        <PreferenceRow name="dailySummary" title={text.dailySummary} help={text.dailySummaryHelp}/>
        <div className="banner banner-info"><Icon name="info"/><span>{text.currency}</span></div>
      </div>
    </section>

    <section hidden={step !== 3} style={{ textAlign: "center" }}>
      <div className="empty-icon" style={{ margin: "0 auto var(--space-4)" }}><Icon name="check" className="icon icon-lg"/></div>
      <h1 style={{ marginBottom: "var(--space-2)" }}>{text.title3}</h1>
      <p className="text-muted" style={{ marginBottom: "var(--space-6)" }}>{text.intro3}</p>
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)", textAlign: "left", marginBottom: "var(--space-6)" }}>
        <FirstTask icon="camera" label={text.scan}/><FirstTask icon="package" label={text.inventory}/><FirstTask icon="bag" label={text.sale}/>
      </div>
    </section>

    <div style={{ display: "flex", gap: "var(--space-3)", marginTop: "var(--space-2)" }}>
      {step > 1 && <button className="btn btn-secondary" type="button" onClick={() => setStep((step - 1) as 1 | 2)}>{text.back}</button>}
      {step === 1 && <button className="btn btn-primary btn-block" type="button" onClick={() => setStep(2)}>{text.continue}</button>}
      {step === 2 && <button className="btn btn-primary btn-block" type="button" disabled={pending} onClick={completeSetup}>{pending ? "…" : text.continue}</button>}
      {step === 3 && <Link className="btn btn-primary btn-block" href="/dashboard">{text.finish}</Link>}
    </div>
  </div>;
}

function PreferenceRow({ name, title, help }: { name: string; title: string; help: string }) {
  return <div className="row-item" style={{ minHeight: "auto" }}><span className="row-main"><span className="row-title">{title}</span><span className="row-meta">{help}</span></span><label className="switch"><input name={name} type="checkbox" defaultChecked aria-label={title}/><span className="switch-track"/><span className="switch-thumb"/></label></div>;
}

function FirstTask({ icon, label }: { icon: "camera" | "package" | "bag"; label: string }) {
  return <div className="row-item" style={{ minHeight: "auto" }}><span className="attn-icon info"><Icon name={icon}/></span><span className="row-main"><span className="row-title">{label}</span></span></div>;
}
