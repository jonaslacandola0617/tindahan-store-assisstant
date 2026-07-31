"use client";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useState } from "react";

export function RegisterForm() {
  const [error, setError] = useState(""); const [pending, setPending] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPending(true); setError(""); const form = new FormData(event.currentTarget);
    const body = { name: form.get("name"), email: form.get("email"), password: form.get("password") };
    const response = await fetch("/api/register", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    if (!response.ok) { const result = await response.json() as { error?: string }; setError(result.error ?? "Account creation failed."); setPending(false); return; }
    await signIn("credentials", { email: body.email, password: body.password, callbackUrl: "/onboarding" });
  }
  return <><form className="auth-form" onSubmit={submit}>{error && <p className="form-alert" role="alert">{error}</p>}<div className="field"><label className="field-label" htmlFor="name">Your name</label><input className="input" id="name" name="name" autoComplete="name" required minLength={2}/></div><div className="field"><label className="field-label" htmlFor="email">Email</label><input className="input" id="email" name="email" type="email" autoComplete="email" required/></div><div className="field"><label className="field-label" htmlFor="password">Password</label><input className="input" id="password" name="password" type="password" autoComplete="new-password" required minLength={10}/><span className="field-hint">Use at least 10 characters.</span></div><button className="btn btn-primary btn-lg btn-block" disabled={pending}>{pending ? "Creating account…" : "Continue"}</button></form><p className="text-sm text-muted" style={{ marginTop: "var(--space-5)", textAlign: "center" }}>Already have an account? <Link className="section-link" href="/sign-in">Sign in</Link></p></>;
}
