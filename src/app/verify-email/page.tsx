import Link from "next/link";
import { cookies } from "next/headers";
import { getServerSession } from "next-auth";
import { Brand } from "@/components/brand";
import { Icon } from "@/components/icon";
import { LanguageToggle } from "@/components/language-toggle";
import { verifyEmailToken } from "@/modules/identity/application/email-verification";
import { authOptions } from "@/modules/identity/infrastructure/auth-options";
import styles from "./verify-email.module.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Verify email", robots: { index: false, follow: false } };

const copy = {
  EN: {
    successTitle: "Email verified",
    success: "Your email is confirmed. Your Tindahan account is ready to keep using.",
    invalidTitle: "This verification link is no longer available",
    invalid: "The link may have expired or already been used. If you already verified your email, there’s nothing else you need to do.",
    dashboard: "Go to dashboard",
    signIn: "Go to sign in",
  },
  FIL: {
    successTitle: "Beripikado na ang email",
    success: "Kumpirmado na ang iyong email. Maaari mong ipagpatuloy ang paggamit ng Tindahan.",
    invalidTitle: "Hindi na available ang verification link na ito",
    invalid: "Maaaring nag-expire na o nagamit na ang link. Kung na-verify mo na ang email mo, wala ka nang kailangang gawin.",
    dashboard: "Pumunta sa dashboard",
    signIn: "Pumunta sa sign in",
  },
} as const;

export default async function VerifyEmailPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const locale = (await cookies()).get("tindahan-language")?.value === "FIL" ? "FIL" : "EN";
  const t = copy[locale];
  const token = (await searchParams).token?.trim();
  const result = token ? await verifyEmailToken(token) : { verified: false as const, reason: "INVALID" as const };
  const session = await getServerSession(authOptions);
  const destination = session?.user.id ? "/dashboard" : "/sign-in";
  const action = session?.user.id ? t.dashboard : t.signIn;

  return <>
    <a className="skip-link" href="#main">{locale === "FIL" ? "Lumaktaw papunta sa nilalaman" : "Skip to content"}</a>
    <main className="standalone" id="main">
      <section className={`card ${styles.card}`}>
        <div className={styles.top}><Brand linked={false}/><LanguageToggle locale={locale}/></div>
        <div className={`${styles.icon}${result.verified ? "" : ` ${styles.warning}`}`}><Icon name={result.verified ? "check" : "alert"}/></div>
        <h1>{result.verified ? t.successTitle : t.invalidTitle}</h1>
        <p className={`text-muted ${styles.message}`}>{result.verified ? t.success : t.invalid}</p>
        <Link className={`btn btn-primary btn-lg ${styles.action}`} href={destination}>{action}</Link>
      </section>
    </main>
  </>;
}
