import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AuthVisual } from "@/components/auth-visual";
import { LanguageToggle } from "@/components/language-toggle";
import { type Locale } from "@/modules/i18n/messages";
import { serverEnvironment } from "@/platform/environment/server";
import { RegisterForm } from "./register-form";

export const metadata = { title: "Create account" };

export default async function RegisterPage() {
  if (serverEnvironment.showcaseMode) redirect("/sign-in");
  const locale: Locale = (await cookies()).get("tindahan-language")?.value === "FIL" ? "FIL" : "EN";
  return <><a className="skip-link" href="#main">{locale === "FIL" ? "Lumaktaw papunta sa nilalaman" : "Skip to content"}</a><main className="standalone" id="main"><div className="standalone-panel"><AuthVisual locale={locale}/><div className="standalone-form"><div style={{ alignSelf: "flex-end", marginBottom: "var(--space-6)" }}><LanguageToggle locale={locale}/></div><RegisterForm locale={locale}/></div></div></main><div className="toast-region" role="status" aria-live="polite"/></>;
}
