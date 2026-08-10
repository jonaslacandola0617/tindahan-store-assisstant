"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { PasswordInput } from "@/components/password-input";
import styles from "./account-deactivation.module.css";

const copy = {
  EN: {
    section: "Account access",
    title: "Deactivate account",
    help: "Signs you out and disables your Tindahan access without deleting store records or activity history.",
    ownerHelp: "As the store owner, remove active staff first. Pending invitations will be revoked automatically.",
    open: "Deactivate account",
    password: "Current password",
    confirmHelp: "Enter your current password to confirm. This cannot be undone from inside the app during the pilot.",
    cancel: "Cancel",
    confirm: "Deactivate my account",
    error: "We couldn't deactivate the account.",
  },
  FIL: {
    section: "Access ng account",
    title: "I-deactivate ang account",
    help: "Isi-sign out ka at idi-disable ang access mo sa Tindahan nang hindi binubura ang store records o activity history.",
    ownerHelp: "Bilang may-ari, alisin muna ang aktibong staff. Awtomatikong babawiin ang mga pending invitation.",
    open: "I-deactivate ang account",
    password: "Kasalukuyang password",
    confirmHelp: "Ilagay ang kasalukuyang password para kumpirmahin. Hindi ito maibabalik mula sa loob ng app habang pilot.",
    cancel: "Kanselahin",
    confirm: "I-deactivate ang account ko",
    error: "Hindi ma-deactivate ang account.",
  },
} as const;

export function AccountDeactivation({ locale, isOwner }: { locale: "EN" | "FIL"; isOwner: boolean }) {
  const t = copy[locale];
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function deactivate() {
    if (!password) return;
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/settings/account", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ currentPassword: password }),
      });
      const body = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(body.error || t.error);
      await signOut({ callbackUrl: "/sign-in?deactivated=1" });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t.error);
      setPending(false);
    }
  }

  return <section className="settings-group">
    <h2 className="settings-group-title">{t.section}</h2>
    <div className={`card ${styles.card}`}>
      <div className={styles.row}>
        <div className={styles.copy}>
          <strong className={styles.title}>{t.title}</strong>
          <p className={styles.help}>{t.help}</p>
          {isOwner && <p className={styles.help} style={{ marginTop: "var(--space-1)" }}>{t.ownerHelp}</p>}
        </div>
        <button className={`btn btn-secondary ${styles.dangerButton}`} type="button" aria-expanded={open} onClick={() => { setError(""); setOpen(value => !value); }}>{open ? t.cancel : t.open}</button>
      </div>
      {open && <div className={styles.editor}>
        <div className="field">
          <label className="field-label" htmlFor="deactivate-current-password">{t.password}</label>
          <PasswordInput id="deactivate-current-password" autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} required locale={locale}/>
          <span className="field-hint">{t.confirmHelp}</span>
        </div>
        {error && <p className="field-error" role="alert">{error}</p>}
        <div className={styles.actions}>
          <button className="btn btn-ghost" type="button" disabled={pending} onClick={() => { setOpen(false); setPassword(""); setError(""); }}>{t.cancel}</button>
          <button className={`btn btn-secondary ${styles.dangerButton}`} type="button" disabled={pending || !password} onClick={() => void deactivate()}>{pending ? "…" : t.confirm}</button>
        </div>
      </div>}
    </div>
  </section>;
}
