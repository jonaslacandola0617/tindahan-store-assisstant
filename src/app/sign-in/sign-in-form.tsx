"use client";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useState } from "react";
import { LoadingButtonContent } from "@/components/loading";
import { PasswordInput } from "@/components/password-input";
import { loadingCopy, type Locale, type dictionary } from "@/modules/i18n/messages";

export function SignInForm({ copy, locale, callbackUrl = "/dashboard" }: { copy: ReturnType<typeof dictionary>; locale: Locale; callbackUrl?: string }) {
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPending(true); setError("");
    const data = new FormData(event.currentTarget);
    try {
      const result = await signIn("credentials", { email: data.get("email"), password: data.get("password"), redirect: false });
      if (result?.ok) window.location.assign(callbackUrl);
      else setError(locale === "FIL" ? "Hindi tama ang email o password." : "The email or password is incorrect.");
    } catch {
      setError(locale === "FIL" ? "Hindi makapag-sign in ngayon. Subukan muli." : "We couldn't sign you in right now. Try again.");
    } finally {
      setPending(false);
    }
  }
  return <><form className="auth-form" onSubmit={submit}>{error && <p className="form-alert" role="alert">{error}</p>}<div className="field"><label className="field-label" htmlFor="email">{copy.email}</label><input className="input" id="email" name="email" type="email" placeholder="you@example.com" autoComplete="email" required/></div><div className="field"><label className="field-label" htmlFor="pass">{copy.password}</label><PasswordInput id="pass" name="password" placeholder="••••••••" autoComplete="current-password" required maxLength={128} aria-describedby="password-hint" locale={locale}/><span className="field-hint" id="password-hint">{copy.passwordHint}</span></div><button className="btn btn-primary btn-lg btn-block" type="submit" disabled={pending} aria-busy={pending}>{pending ? <LoadingButtonContent message={loadingCopy(locale, "signingIn")}/> : copy.signIn}</button></form><div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", margin: "var(--space-6) 0" }}><hr className="divider" style={{ margin: 0, flex: 1 }}/><span className="text-sm text-faint">{copy.or}</span><hr className="divider" style={{ margin: 0, flex: 1 }}/></div><Link className="btn btn-secondary btn-lg btn-block" href="/register">{copy.newStore}</Link></>;
}
