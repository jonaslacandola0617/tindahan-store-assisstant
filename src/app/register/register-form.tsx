"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { accountSetupInput } from "@/modules/identity/domain/registration";
import type { Locale } from "@/modules/i18n/messages";
import { PasswordInput } from "@/components/password-input";

const copy = {
  EN: {
    title: "Create your account", intro: "Start with your account details, then tell us about your store.",
    email: "Email address", password: "Password", confirm: "Confirm password", passwordHint: "Use at least 10 characters.",
    continue: "Continue to store setup", existing: "Already have an account?", signIn: "Sign in",
    check: "Check the highlighted details.", emailError: "Enter a valid email address.", passwordError: "Use at least 10 characters for your password.", confirmError: "The passwords do not match.",
  },
  FIL: {
    title: "Gumawa ng account", intro: "Ilagay muna ang detalye ng account, pagkatapos ay ang tungkol sa iyong tindahan.",
    email: "Email address", password: "Password", confirm: "Ulitin ang password", passwordHint: "Gumamit ng hindi bababa sa 10 character.",
    continue: "Magpatuloy sa pag-set up ng tindahan", existing: "May account ka na?", signIn: "Mag-sign in",
    check: "Ayusin ang mga naka-highlight na detalye.", emailError: "Maglagay ng wastong email address.", passwordError: "Gumamit ng hindi bababa sa 10 character para sa password.", confirmError: "Hindi magkatugma ang mga password.",
  },
} as const;

type Errors = { email?: string; password?: string; confirmPassword?: string };

export function RegisterForm({ locale }: { locale: Locale }) {
  const router = useRouter();
  const text = copy[locale];
  const [error, setError] = useState("");
  const [errors, setErrors] = useState<Errors>({});

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const result = accountSetupInput.safeParse({
      email: form.get("email"),
      password: form.get("password"),
      confirmPassword: form.get("confirmPassword"),
    });
    if (!result.success) {
      const fields = result.error.flatten().fieldErrors;
      const nextErrors = {
        email: fields.email ? text.emailError : undefined,
        password: fields.password ? text.passwordError : undefined,
        confirmPassword: fields.confirmPassword ? text.confirmError : undefined,
      };
      setErrors(nextErrors);
      setError(text.check);
      document.getElementById(nextErrors.email ? "register-email" : nextErrors.password ? "register-password" : "register-confirm-password")?.focus();
      return;
    }

    sessionStorage.setItem("tindahan-setup-credentials", JSON.stringify({ email: result.data.email, password: result.data.password }));
    router.push("/onboarding");
  }

  const clear = (field: keyof Errors) => setErrors(current => ({ ...current, [field]: undefined }));
  return <><h1 style={{ marginBottom: "var(--space-2)" }}>{text.title}</h1><p className="text-muted" style={{ marginBottom: "var(--space-6)" }}>{text.intro}</p><form className="auth-form" onSubmit={submit}>{error && <p className="form-alert" role="alert">{error}</p>}<div className="field"><label className="field-label" htmlFor="register-email">{text.email}</label><input className={`input${errors.email ? " has-error" : ""}`} id="register-email" name="email" type="email" placeholder="you@example.com" autoComplete="email" required aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? "register-email-error" : undefined} onChange={() => clear("email")}/>{errors.email && <span className="field-error" id="register-email-error">{errors.email}</span>}</div><div className="field"><label className="field-label" htmlFor="register-password">{text.password}</label><PasswordInput className={`input${errors.password ? " has-error" : ""}`} id="register-password" name="password" placeholder="••••••••" autoComplete="new-password" required maxLength={128} aria-invalid={Boolean(errors.password)} aria-describedby={errors.password ? "register-password-error" : "register-password-hint"} onChange={() => clear("password")} locale={locale}/>{errors.password ? <span className="field-error" id="register-password-error">{errors.password}</span> : <span className="field-hint" id="register-password-hint">{text.passwordHint}</span>}</div><div className="field"><label className="field-label" htmlFor="register-confirm-password">{text.confirm}</label><PasswordInput className={`input${errors.confirmPassword ? " has-error" : ""}`} id="register-confirm-password" name="confirmPassword" placeholder="••••••••" autoComplete="new-password" required maxLength={128} aria-invalid={Boolean(errors.confirmPassword)} aria-describedby={errors.confirmPassword ? "register-confirm-error" : undefined} onChange={() => clear("confirmPassword")} locale={locale}/>{errors.confirmPassword && <span className="field-error" id="register-confirm-error">{errors.confirmPassword}</span>}</div><button className="btn btn-primary btn-lg btn-block" type="submit">{text.continue}</button></form><p className="text-sm text-muted" style={{ textAlign: "center", marginTop: "var(--space-6)" }}>{text.existing} <Link href="/sign-in" style={{ color: "var(--color-brand-primary)", fontWeight: "var(--weight-semibold)" }}>{text.signIn}</Link></p></>;
}
