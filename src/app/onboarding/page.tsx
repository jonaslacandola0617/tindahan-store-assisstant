import { cookies } from "next/headers";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { Brand } from "@/components/brand";
import { LanguageToggle } from "@/components/language-toggle";
import { accountAccessState } from "@/modules/identity/application/account-access";
import { authOptions } from "@/modules/identity/infrastructure/auth-options";
import { registeredUserExists } from "@/modules/identity/application/registered-user";
import { OnboardingForm } from "./onboarding-form";

export const metadata = { title: "Set up your store" };
export default async function OnboardingPage() {
  const session = await getServerSession(authOptions);
  if (session?.user.id && await accountAccessState(session.user.id) === "DISABLED") redirect("/account-inactive");
  const isAuthenticated = await registeredUserExists(session?.user.id);
  const locale = (await cookies()).get("tindahan-language")?.value === "FIL" ? "FIL" : "EN";
  return <><a className="skip-link" href="#main">{locale === "FIL" ? "Lumaktaw papunta sa nilalaman" : "Skip to content"}</a><main className="standalone" id="main"><div className="standalone-card"><div className="card card-pad" style={{ boxShadow: "var(--shadow-overlay)" }}><div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--space-6)" }}><Brand linked={false}/><LanguageToggle locale={locale}/></div><OnboardingForm locale={locale} isAuthenticated={isAuthenticated}/></div></div></main><div className="toast-region" role="status" aria-live="polite"/></>;
}
