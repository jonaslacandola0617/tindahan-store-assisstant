import { cookies } from "next/headers";
import { AuthVisual } from "@/components/auth-visual";
import { LanguageToggle } from "@/components/language-toggle";
import { dictionary } from "@/modules/i18n/messages";
import { SignInForm } from "./sign-in-form";

export const metadata = { title: "Sign in" };

export default async function SignInPage() {
  const locale = (await cookies()).get("tindahan-language")?.value === "FIL" ? "FIL" : "EN";
  const copy = dictionary(locale);
  return <><a className="skip-link" href="#main">{locale === "FIL" ? "Lumaktaw papunta sa nilalaman" : "Skip to content"}</a><main className="standalone" id="main"><div className="standalone-panel"><AuthVisual locale={locale}/><div className="standalone-form"><div style={{ alignSelf: "flex-end", marginBottom: "var(--space-6)" }}><LanguageToggle locale={locale}/></div><h1 style={{ marginBottom: "var(--space-2)" }}>{copy.welcome}</h1><p className="text-muted" style={{ marginBottom: "var(--space-6)" }}>{copy.signInHelp}</p><SignInForm copy={copy}/></div></div></main><div className="toast-region" role="status" aria-live="polite"/></>;
}
