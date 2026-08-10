"use client";

import { Icon } from "@/components/icon";
import styles from "./invitation-result.module.css";

const copy = {
  EN: {
    sentTitle: "Invitation sent",
    sentHelp: (email: string) => `We sent an invitation to ${email}. You can also copy the private link below and send it directly.`,
    failedTitle: "Invitation ready",
    failedHelp: (email: string) => `We couldn't send the email to ${email}, but the invitation is ready. Copy the private link below and send it directly.`,
    link: "Private invitation link",
    copy: "Copy link",
  },
  FIL: {
    sentTitle: "Naipadala ang imbitasyon",
    sentHelp: (email: string) => `Naipadala namin ang imbitasyon sa ${email}. Maaari mo ring kopyahin ang pribadong link sa ibaba at direktang ipadala.`,
    failedTitle: "Handa na ang imbitasyon",
    failedHelp: (email: string) => `Hindi namin naipadala ang email sa ${email}, pero handa na ang imbitasyon. Kopyahin ang pribadong link sa ibaba at direktang ipadala.`,
    link: "Pribadong invitation link",
    copy: "Kopyahin ang link",
  },
} as const;

export function InvitationResult({
  locale,
  email,
  status,
  inviteUrl,
  onCopied,
}: {
  locale: "EN" | "FIL";
  email: string;
  status: "SENT" | "FAILED" | "PENDING" | null;
  inviteUrl: string;
  onCopied: () => void;
}) {
  const t = copy[locale];
  const sent = status === "SENT";
  return <div className={styles.result} role="status" aria-live="polite">
    <div className={styles.heading}>
      <span className={`${styles.icon}${sent ? "" : ` ${styles.iconFailed}`}`}><Icon name={sent ? "check" : "info"}/></span>
      <div className={styles.copy}>
        <strong className={styles.title}>{sent ? t.sentTitle : t.failedTitle}</strong>
        <p className={styles.help}>{sent ? t.sentHelp(email) : t.failedHelp(email)}</p>
      </div>
    </div>
    <div>
      <span className={styles.linkLabel}>{t.link}</span>
      <div className={styles.linkRow}>
        <code className={styles.url} title={inviteUrl}>{inviteUrl}</code>
        <button className="btn btn-secondary btn-sm" type="button" onClick={async () => { await navigator.clipboard.writeText(inviteUrl); onCopied(); }}>{t.copy}</button>
      </div>
    </div>
  </div>;
}
