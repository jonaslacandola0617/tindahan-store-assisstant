import { cookies } from "next/headers";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { Brand } from "@/components/brand";
import { Icon } from "@/components/icon";
import { LanguageToggle } from "@/components/language-toggle";
import { accountAccessState } from "@/modules/identity/application/account-access";
import { authOptions } from "@/modules/identity/infrastructure/auth-options";
import { AccountInactiveClient } from "./account-inactive-client";

export const metadata = { title: "Account inactive", robots: { index: false, follow: false } };

const copy = {
  EN: {
    title: "This account is inactive",
    message: "Your Tindahan access has been deactivated. Your store records are still kept; you just can’t enter the app with this account right now.",
    help: "If you need access again during the pilot, the store owner can invite you again or Tindahan support can restore owner access.",
    signOut: "Return to sign in",
  },
  FIL: {
    title: "Hindi aktibo ang account na ito",
    message: "Na-deactivate ang access mo sa Tindahan. Nakaingat pa rin ang records ng tindahan; hindi mo lang maa-access ang app gamit ang account na ito sa ngayon.",
    help: "Kung kailangan mo ulit ng access habang pilot, maaaring imbitahan ka muli ng may-ari ng tindahan o maibalik ng Tindahan support ang owner access.",
    signOut: "Bumalik sa sign in",
  },
} as const;

export default async function AccountInactivePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user.id) redirect("/sign-in");
  const state = await accountAccessState(session.user.id);
  if (state === "ACTIVE") redirect("/dashboard");
  if (state === "UNATTACHED") redirect("/onboarding");

  const locale = (await cookies()).get("tindahan-language")?.value === "FIL" ? "FIL" : "EN";
  const t = copy[locale];
  return <>
    <a className="skip-link" href="#main">{locale === "FIL" ? "Lumaktaw papunta sa nilalaman" : "Skip to content"}</a>
    <main className="standalone" id="main">
      <section className="card card-pad" style={{ width: "min(520px, calc(100vw - var(--space-8)))", boxShadow: "var(--shadow-overlay)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "var(--space-4)", marginBottom: "var(--space-7)" }}><Brand linked={false}/><LanguageToggle locale={locale}/></div>
        <div className="empty-icon" style={{ marginBottom: "var(--space-4)" }}><Icon name="lock"/></div>
        <h1 style={{ marginBottom: "var(--space-2)" }}>{t.title}</h1>
        <p className="text-muted" style={{ lineHeight: "var(--leading-relaxed)", marginBottom: "var(--space-3)" }}>{t.message}</p>
        <p className="text-sm text-muted" style={{ lineHeight: "var(--leading-relaxed)", marginBottom: "var(--space-6)" }}>{t.help}</p>
        <AccountInactiveClient label={t.signOut}/>
      </section>
    </main>
  </>;
}
