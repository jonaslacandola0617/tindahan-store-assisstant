"use client";
import { useState } from "react";

export function OnboardingForm() {
  const [error, setError] = useState(""); const [pending, setPending] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPending(true); const data = new FormData(event.currentTarget);
    const response = await fetch("/api/onboarding", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: data.get("name"), address: data.get("address"), contact: data.get("contact"), language: data.get("language") }) });
    if (response.ok) window.location.assign("/dashboard"); else { const result = await response.json() as { error?: string }; setError(result.error ?? "Store setup failed."); setPending(false); }
  }
  return <form className="auth-form" onSubmit={submit}>{error && <p className="form-alert" role="alert">{error}</p>}<div className="field"><label className="field-label" htmlFor="store-name">Store name</label><input className="input" id="store-name" name="name" defaultValue="Aling Rosa's Store" required/></div><div className="field"><label className="field-label" htmlFor="address">Address</label><input className="input" id="address" name="address" autoComplete="street-address"/></div><div className="field"><label className="field-label" htmlFor="contact">Contact number</label><input className="input" id="contact" name="contact" autoComplete="tel"/></div><div className="field"><label className="field-label" htmlFor="language">Default language</label><select className="select" id="language" name="language" defaultValue="EN"><option value="EN">English</option><option value="FIL">Filipino</option></select></div><button className="btn btn-primary btn-lg btn-block" disabled={pending}>{pending ? "Setting up…" : "Continue"}</button></form>;
}
