"use client";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useState } from "react";
import type { dictionary } from "@/modules/i18n/messages";

export function SignInForm({ copy }: { copy: ReturnType<typeof dictionary> }) {
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPending(true); setError("");
    const data = new FormData(event.currentTarget);
    const result = await signIn("credentials", { email: data.get("email"), password: data.get("password"), redirect: false });
    if (result?.ok) window.location.assign("/dashboard");
    else { setError("The email or password is incorrect."); setPending(false); }
  }
  function rememberSetupCredentials() {
    const identifier = (document.getElementById("email") as HTMLInputElement | null)?.value ?? "";
    const password = (document.getElementById("pass") as HTMLInputElement | null)?.value ?? "";
    sessionStorage.setItem("tindahan-setup-credentials", JSON.stringify({ email: identifier, password }));
  }
  return <><form className="auth-form" onSubmit={submit}>{error && <p className="form-alert" role="alert">{error}</p>}<div className="field"><label className="field-label" htmlFor="email">{copy.email}</label><input className="input" id="email" name="email" type="email" placeholder="you@example.com" autoComplete="email" required/></div><div className="field"><label className="field-label" htmlFor="pass">{copy.password}</label><input className="input" id="pass" name="password" type="password" placeholder="••••••••" autoComplete="current-password" required/><span className="field-hint">{copy.passwordHint}</span></div><button className="btn btn-primary btn-lg btn-block" type="submit" disabled={pending}>{pending ? "Signing in…" : copy.signIn}</button></form><div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", margin: "var(--space-6) 0" }}><hr className="divider" style={{ margin: 0, flex: 1 }}/><span className="text-sm text-faint">{copy.or}</span><hr className="divider" style={{ margin: 0, flex: 1 }}/></div><Link className="btn btn-secondary btn-lg btn-block" href="/onboarding" onClick={rememberSetupCredentials}>{copy.newStore}</Link></>;
}
