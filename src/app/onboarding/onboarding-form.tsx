"use client";

import { signIn } from "next-auth/react";
import Link from "next/link";
import { useState } from "react";
import { Icon } from "@/components/icon";
import { LoadingButtonContent } from "@/components/loading";
import { registrationInput } from "@/modules/identity/domain/registration";
import { loadingCopy, type Locale } from "@/modules/i18n/messages";
import { storeInput, storeTypes } from "@/modules/stores/domain/store";

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
    storeNameError: "Enter a store name with at least 2 characters.", ownerNameError: "Enter your name with at least 2 characters.",
    credentialsError: "Your account details are missing or invalid. Return to account creation and try again.",
    setupError: "We couldn't finish setting up your store. Nothing was changed. Try again.", signInError: "Your store was created, but automatic sign-in failed. Sign in to continue.", signInAction: "Go to sign in", createAccountAction: "Create account",
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
    storeNameError: "Maglagay ng pangalan ng tindahan na may hindi bababa sa 2 character.", ownerNameError: "Ilagay ang iyong pangalan na may hindi bababa sa 2 character.",
    credentialsError: "Kulang o hindi wasto ang detalye ng account. Bumalik sa paggawa ng account at subukan muli.",
    setupError: "Hindi natapos ang pag-set up ng tindahan. Walang binago. Subukan muli.", signInError: "Nagawa ang tindahan, pero hindi ka awtomatikong na-sign in. Mag-sign in para magpatuloy.", signInAction: "Pumunta sa sign in", createAccountAction: "Gumawa ng account",
  },
} as const;

type SetupCredentials = { email: string; password: string };

export function OnboardingForm({ locale, isAuthenticated }: { locale: Locale; isAuthenticated: boolean }) {
  const text = copy[locale];
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{ storeName?: string; ownerName?: string }>({});
  const [recovery, setRecovery] = useState<{ href: string; label: string } | null>(null);
  const [accountCreated, setAccountCreated] = useState(false);
  const [pending, setPending] = useState(false);

  function root() {
    return document.getElementById("store-setup-form")!;
  }

  function value(name: string) {
    return (root().querySelector(`[name="${name}"]`) as HTMLInputElement | HTMLSelectElement | null)?.value ?? "";
  }

  function checked(name: string) {
    return (root().querySelector(`[name="${name}"]`) as HTMLInputElement | null)?.checked ?? false;
  }

  function validateStoreDetails() {
    const nextErrors = {
      storeName: value("storeName").trim().length < 2 ? text.storeNameError : undefined,
      ownerName: value("ownerName").trim().length < 2 ? text.ownerNameError : undefined,
    };
    setFieldErrors(nextErrors);
    if (nextErrors.storeName || nextErrors.ownerName) {
      setError("");
      setStep(1);
      setTimeout(() => document.getElementById(nextErrors.storeName ? "storeName" : "ownerName")?.focus());
      return false;
    }
    return true;
  }

  function goToPreferences() {
    setError("");
    setRecovery(null);
    if (validateStoreDetails()) setStep(2);
  }

  async function completeSetup() {
    if (!validateStoreDetails()) return;
    setPending(true);
    setError("");
    setRecovery(null);

    const store = {
      name: value("storeName"),
      language: locale,
      lowStockEnabled: checked("lowStock"),
      dailySummaryEnabled: checked("dailySummary"),
      storeType: value("storeType"),
    };

    const parsedStore = storeInput.safeParse(store);
    if (!parsedStore.success) {
      setError(text.setupError);
      setPending(false);
      return;
    }

    try {
      if (!isAuthenticated) {
        let credentials: SetupCredentials | null = null;
        try {
          const stored = sessionStorage.getItem("tindahan-setup-credentials");
          credentials = stored ? JSON.parse(stored) as SetupCredentials : null;
        } catch {
          credentials = null;
        }
        const account = registrationInput.safeParse({ name: value("ownerName"), ...credentials });
        if (!account.success) {
          setError(text.credentialsError);
          setRecovery({ href: "/register", label: text.createAccountAction });
          return;
        }

        if (!accountCreated) {
          const registration = await fetch("/api/onboarding/register", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ account: account.data, store: parsedStore.data }),
          });
          if (!registration.ok) {
            const result = await registration.json() as { error?: string };
            setError(result.error ?? text.setupError);
            setRecovery(registration.status === 409 ? { href: "/sign-in", label: text.signInAction } : null);
            return;
          }
          setAccountCreated(true);
        }

        const authentication = await signIn("credentials", { email: account.data.email, password: account.data.password, redirect: false });
        if (!authentication?.ok) {
          setError(text.signInError);
          setRecovery({ href: "/sign-in", label: text.signInAction });
          return;
        }
      } else {
        const response = await fetch("/api/onboarding", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(parsedStore.data),
        });
        if (!response.ok) {
          const result = await response.json() as { error?: string };
          setError(result.error ?? text.setupError);
          return;
        }
      }

      sessionStorage.removeItem("tindahan-setup-credentials");
      setStep(3);
    } catch {
      setError(text.setupError);
    } finally {
      setPending(false);
    }
  }

  return <div id="store-setup-form">
    <div className="step-indicator" style={{ marginBottom: "var(--space-6)" }} aria-hidden="true">
      {[1, 2, 3].map((dot) => <span key={dot} className={`step-dot${dot === step ? " active" : ""}${dot < step ? " done" : ""}`}/>)
      }
    </div>

    {error && <div className="form-alert" role="alert" style={{ marginBottom: "var(--space-4)" }}><span>{error}</span>{recovery && <span style={{ display: "block", marginTop: "var(--space-2)" }}><Link href={recovery.href} style={{ color: "inherit", fontWeight: "var(--weight-semibold)", textDecoration: "underline" }}>{recovery.label}</Link></span>}</div>}

    <section hidden={step !== 1}>
      <h1 style={{ marginBottom: "var(--space-2)" }}>{text.title1}</h1>
      <p className="text-muted" style={{ marginBottom: "var(--space-6)" }}>{text.intro1}</p>
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
        <div className="field"><label className="field-label" htmlFor="storeName">{text.storeName}</label><input className={`input${fieldErrors.storeName ? " has-error" : ""}`} id="storeName" name="storeName" type="text" placeholder={text.storeNamePlaceholder} autoComplete="organization" required minLength={2} maxLength={100} aria-invalid={Boolean(fieldErrors.storeName)} aria-describedby={fieldErrors.storeName ? "store-name-error" : undefined} onChange={() => fieldErrors.storeName && setFieldErrors(current => ({ ...current, storeName: undefined }))}/>{fieldErrors.storeName && <span className="field-error" id="store-name-error">{fieldErrors.storeName}</span>}</div>
        <div className="field"><label className="field-label" htmlFor="ownerName">{text.ownerName}</label><input className={`input${fieldErrors.ownerName ? " has-error" : ""}`} id="ownerName" name="ownerName" type="text" placeholder={text.ownerNamePlaceholder} autoComplete="name" required minLength={2} maxLength={80} aria-invalid={Boolean(fieldErrors.ownerName)} aria-describedby={fieldErrors.ownerName ? "owner-name-error" : undefined} onChange={() => fieldErrors.ownerName && setFieldErrors(current => ({ ...current, ownerName: undefined }))}/>{fieldErrors.ownerName && <span className="field-error" id="owner-name-error">{fieldErrors.ownerName}</span>}</div>
        <div className="field"><label className="field-label" htmlFor="storeType">{text.storeType}</label><div className="select-wrap"><select className="select" id="storeType" name="storeType" defaultValue="Sari-sari store">{storeTypes.map(type => <option key={type}>{type}</option>)}</select><Icon name="chevronDown"/></div></div>
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
      {step > 1 && <button className="btn btn-secondary" type="button" onClick={() => { setError(""); setRecovery(null); setStep((step - 1) as 1 | 2); }}>{text.back}</button>}
      {step === 1 && <button className="btn btn-primary btn-block" type="button" onClick={goToPreferences}>{text.continue}</button>}
      {step === 2 && <button className="btn btn-primary btn-block" type="button" disabled={pending} aria-busy={pending} onClick={completeSetup}>{pending ? <LoadingButtonContent message={loadingCopy(locale, "settingUpStore")}/> : text.continue}</button>}
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
