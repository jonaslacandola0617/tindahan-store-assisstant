"use client";
import { useState, type FormEvent } from "react";
import { LoadingButtonContent } from "@/components/loading";
import { PasswordInput } from "@/components/password-input";

export function InviteAcceptForm({ token, signedIn }: { token: string; signedIn: boolean }) {
  const [pending, setPending] = useState(false); const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const form = new FormData(event.currentTarget); setPending(true); setError(""); try { const response = await fetch("/api/invitations/accept", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token, name: form.get("name") || undefined, password: form.get("password") || undefined }) }); const body = await response.json() as { error?: string }; if (!response.ok) throw new Error(body.error || "We couldn't accept this invitation."); window.location.assign(signedIn ? "/dashboard" : "/sign-in?joined=1"); } catch (cause) { setError(cause instanceof Error ? cause.message : "We couldn't accept this invitation."); } finally { setPending(false); } }
  return <form className="auth-form" onSubmit={submit}>{error && <p className="form-alert" role="alert">{error}</p>}{!signedIn && <><label className="field"><span className="field-label">Your name</span><input className="input" name="name" autoComplete="name" required/></label><div className="field"><label className="field-label" htmlFor="invite-password">Create password</label><PasswordInput id="invite-password" name="password" autoComplete="new-password" minLength={10} maxLength={128} required/><span className="field-hint">Use at least 10 characters.</span></div></>}<button className="btn btn-primary btn-lg btn-block" disabled={pending}>{pending ? <LoadingButtonContent message="Joining store…"/> : signedIn ? "Accept invitation" : "Create staff account"}</button></form>;
}
