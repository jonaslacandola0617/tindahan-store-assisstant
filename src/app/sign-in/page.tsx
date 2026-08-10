import { cookies } from "next/headers";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { AuthVisual } from "@/components/auth-visual";
import { LanguageToggle } from "@/components/language-toggle";
import { accountAccessState } from "@/modules/identity/application/account-access";
import { dictionary } from "@/modules/i18n/messages";
import { authOptions } from "@/modules/identity/infrastructure/auth-options";
import { SignInForm } from "./sign-in-form";

export const metadata = { title: "Sign in" };

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ callbackUrl?: string; deactivated?: string }> }) {
  const session = await getServerSession(authOptions);
  if (session?.user.id) {
    const state = await accountAccessState(session.user.id);
    if (state === "ACTIVE") redirect("/dashboard");
    if (state === "DISABLED") redirect("/account-inactive");
    redirect("/onboarding");
  }

  const locale = (await cookies()).get("tindahan-language")?.value === "FIL" ? "FIL" : "EN";
  const copy = dictionary(locale);
  const params = await searchParams;
  const requested = params.callbackUrl;
  const callbackUrl = requested?.startsWith("/invite/") ? requested : "/dashboard";
  const deactivated = params.deactivated === "1";
  return <><a className="skip-link" href="#main">{locale === "FIL" ? "Lumaktaw papunta sa nilalaman" : "Skip to content"}</a><main className="standalone" id="main"><div className="standalone-panel"><AuthVisual locale={locale}/><div className="standalone-form"><div style={{ alignSelf: "flex-end", marginBottom: "var(--space-6)" }}><LanguageToggle locale={locale}/></div><h1 style={{ marginBottom: "var(--space-2)" }}>{copy.welcome}</h1><p className="text-muted" style={{ marginBottom: "var(--space-6)" }}>{copy.signInHelp}</p>{deactivated && <p className="form-alert" role="status" style={{ marginBottom: "var(--space-4)" }}>{locale === "FIL" ? "Na-deactivate na ang account at naka-sign out ka na." : "Your account has been deactivated and you’ve been signed out."}</p>}<SignInForm copy={copy} locale={locale} callbackUrl={callbackUrl}/></div></div></main><div className="toast-region" role="status" aria-live="polite"/></>;
}
