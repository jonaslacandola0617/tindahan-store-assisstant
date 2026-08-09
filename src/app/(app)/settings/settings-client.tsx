"use client";

import { useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { AppToast } from "@/components/app-toast";
import { Icon } from "@/components/icon";
import { LoadingButtonContent } from "@/components/loading";
import { PasswordInput } from "@/components/password-input";
import { applyThemePreference, type ThemePreference } from "@/components/theme-preference";
import { isPhoneNumber, sanitizePhoneInput } from "@/modules/saas/domain/settings";

type SettingsData = {
  role: "OWNER" | "STAFF";
  user: { name: string | null; email: string; phone: string | null; preferredLanguage: "EN" | "FIL"; preferredTheme: ThemePreference };
  store: { name: string; storeType: string; address: string | null; contact: string | null };
  preference: { lowStockEnabled: boolean; dailySummaryEnabled: boolean; receiptNotifications: boolean; receiptRetentionDays: number };
  subscription: { plan: "PILOT" | "TRIAL" | "STANDARD"; status: "TRIALING" | "ACTIVE" | "GRACE" | "RESTRICTED" | "CANCELED"; trialEndsAt: string | null; currentPeriodEndsAt: string | null; graceEndsAt: string | null };
  members: { id: string; role: "OWNER" | "STAFF"; status: string; user: { name: string | null; email: string } }[];
  invitations: { id: string; email: string; expiresAt: string; createdAt: string }[];
};

const copy = {
  EN: {
    title: "Settings", intro: "A few preferences — nothing technical to configure.", store: "Store information", storeName: "Store name", address: "Address", contact: "Contact number", storeType: "Store type", account: "Account", yourName: "Your name", email: "Email address", mobile: "Mobile number", password: "Password", changePassword: "Change password", cancelPassword: "Cancel", currentPassword: "Current password", newPassword: "New password", confirmPassword: "Confirm new password", updatePassword: "Update password", preferences: "Preferences", language: "Language", languageHelp: "Applies across the app", theme: "Appearance", themeHelp: "Use your device setting or choose a theme", system: "Use device setting", light: "Light", dark: "Dark", notifications: "Notifications", low: "Low stock alerts", lowHelp: "Get a reminder before you run out", daily: "Daily summary", dailyHelp: "A short recap every evening", receipt: "New receipt ready", receiptHelp: "When a scanned receipt is ready to review", retention: "Receipt photo retention", retentionHelp: "Structured receipt and inventory history is always kept.", threeMonths: "3 months", sixMonths: "6 months", oneYear: "1 year", team: "Staff access", teamHelp: "Invite staff without sharing your owner password.", inviteEmail: "Staff email address", invite: "Create invitation", copyLink: "Copy link", revoke: "Revoke", active: "Active", pending: "Pending", plan: "Plan", pilot: "Pilot access", trial: "Free trial", standard: "Standard", trialing: "Trial active", activePlan: "Active", grace: "Payment attention needed", restricted: "Read-only", canceled: "Canceled", planHelp: "Your records and exports remain available even if changes are paused.", save: "Save changes", saved: "Settings saved.", passwordSaved: "Password updated.", inviteCreated: "Invitation created. Copy and send the private link.", copied: "Invitation link copied.", genericError: "We couldn't save that. Nothing was changed.", phoneError: "Enter a valid phone number using digits, spaces, parentheses, +, or hyphens.", passwordLength: "Use at least 10 characters for the new password.", passwordMismatch: "The new passwords do not match.", passwordDifferent: "Choose a password different from your current password.", ownerOnly: "Only the store owner can change store, staff, plan, and retention settings.",
  },
  FIL: {
    title: "Mga Setting", intro: "Ilang kagustuhan lang — walang teknikal na dapat i-configure.", store: "Impormasyon ng tindahan", storeName: "Pangalan ng tindahan", address: "Address", contact: "Numero ng contact", storeType: "Uri ng tindahan", account: "Account", yourName: "Iyong pangalan", email: "Email address", mobile: "Numero ng cellphone", password: "Password", changePassword: "Palitan ang password", cancelPassword: "Kanselahin", currentPassword: "Kasalukuyang password", newPassword: "Bagong password", confirmPassword: "Ulitin ang bagong password", updatePassword: "I-update ang password", preferences: "Kagustuhan", language: "Wika", languageHelp: "Ginagamit sa buong app", theme: "Itsura", themeHelp: "Sundin ang device o pumili ng tema", system: "Sundin ang device", light: "Maliwanag", dark: "Madilim", notifications: "Mga Abiso", low: "Abiso sa paubos na stock", lowHelp: "Bigyan ng paalala bago maubos", daily: "Pang-araw-araw na buod", dailyHelp: "Maikling buod tuwing gabi", receipt: "Bagong resibong handa", receiptHelp: "Kapag handa nang suriin ang na-scan na resibo", retention: "Pag-iingat ng larawan ng resibo", retentionHelp: "Palaging nakaingat ang detalye ng resibo at kasaysayan ng imbentaryo.", threeMonths: "3 buwan", sixMonths: "6 buwan", oneYear: "1 taon", team: "Access ng staff", teamHelp: "Mag-imbita ng staff nang hindi ibinabahagi ang owner password.", inviteEmail: "Email ng staff", invite: "Gumawa ng imbitasyon", copyLink: "Kopyahin ang link", revoke: "Bawiin", active: "Aktibo", pending: "Naghihintay", plan: "Plan", pilot: "Pilot access", trial: "Libreng trial", standard: "Standard", trialing: "Aktibo ang trial", activePlan: "Aktibo", grace: "Kailangang ayusin ang bayad", restricted: "Basahin lamang", canceled: "Kinansela", planHelp: "Mananatiling available ang records at exports kahit pansamantalang ihinto ang pagbabago.", save: "I-save ang pagbabago", saved: "Nai-save ang mga setting.", passwordSaved: "Na-update ang password.", inviteCreated: "Nagawa ang imbitasyon. Kopyahin at ipadala ang pribadong link.", copied: "Nakopya ang invitation link.", genericError: "Hindi ito na-save. Walang nabago.", phoneError: "Maglagay ng wastong numero gamit ang digit, espasyo, panaklong, +, o gitling.", passwordLength: "Gumamit ng hindi bababa sa 10 character para sa bagong password.", passwordMismatch: "Hindi magkatugma ang mga bagong password.", passwordDifferent: "Pumili ng password na iba sa kasalukuyang password.", ownerOnly: "May-ari lamang ang maaaring magbago ng tindahan, staff, plan, at retention.",
  },
} as const;

async function responseMessage(response: Response, fallback: string) {
  const body = await response.json().catch(() => ({})) as { error?: string };
  if (!response.ok) throw new Error(body.error || fallback);
  return body;
}

export function SettingsClient({ initial, locale }: { initial: SettingsData; locale: "EN" | "FIL" }) {
  const router = useRouter();
  const t = copy[locale];
  const owner = initial.role === "OWNER";
  const savedTheme = useRef<ThemePreference>(initial.user.preferredTheme);
  const [data, setData] = useState(initial);
  const [pending, setPending] = useState(false);
  const [toast, setToast] = useState("");
  const [error, setError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [passwords, setPasswords] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [inviteUrl, setInviteUrl] = useState("");

  const field = (key: keyof SettingsData["store"], value: string) => setData(current => ({ ...current, store: { ...current.store, [key]: value } }));
  function selectTheme(theme: ThemePreference) { applyThemePreference(theme); setData(current => ({ ...current, user: { ...current.user, preferredTheme: theme } })); }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPending(true); setError("");
    if (!isPhoneNumber(data.user.phone ?? "") || !isPhoneNumber(data.store.contact ?? "")) { setError(t.phoneError); setPending(false); return; }
    try {
      const response = await fetch("/api/settings", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: data.user.name, phone: data.user.phone, storeName: data.store.name, storeType: data.store.storeType, address: data.store.address, contact: data.store.contact, language: data.user.preferredLanguage, theme: data.user.preferredTheme, ...data.preference }) });
      await responseMessage(response, t.genericError);
      document.cookie = `tindahan-language=${data.user.preferredLanguage};path=/;max-age=31536000;samesite=lax`;
      document.cookie = `tindahan-theme=${data.user.preferredTheme};path=/;max-age=31536000;samesite=lax`;
      document.documentElement.lang = data.user.preferredLanguage === "FIL" ? "fil" : "en";
      savedTheme.current = data.user.preferredTheme; applyThemePreference(data.user.preferredTheme); setToast(t.saved); router.refresh();
    } catch (cause) { applyThemePreference(savedTheme.current); setError(cause instanceof Error ? cause.message : t.genericError); }
    finally { setPending(false); }
  }

  async function changePassword() {
    setPasswordError("");
    if (passwords.newPassword.length < 10) return setPasswordError(t.passwordLength);
    if (passwords.newPassword !== passwords.confirmPassword) return setPasswordError(t.passwordMismatch);
    if (passwords.currentPassword === passwords.newPassword) return setPasswordError(t.passwordDifferent);
    setPending(true);
    try {
      const response = await fetch("/api/settings/password", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(passwords) });
      await responseMessage(response, t.genericError); setPasswords({ currentPassword: "", newPassword: "", confirmPassword: "" }); setPasswordOpen(false); setToast(t.passwordSaved);
    } catch (cause) { setPasswordError(cause instanceof Error ? cause.message : t.genericError); }
    finally { setPending(false); }
  }

  function passwordKeyDown(event: KeyboardEvent<HTMLDivElement>) { if (event.key === "Enter") { event.preventDefault(); void changePassword(); } }

  async function invite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const formElement = event.currentTarget; const form = new FormData(formElement); setPending(true); setError("");
    try { const response = await fetch("/api/settings/staff", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: form.get("email") }) }); const result = await responseMessage(response, t.genericError) as { id: string; email: string; expiresAt: string; inviteUrl: string }; setData(current => ({ ...current, invitations: [{ id: result.id, email: result.email, expiresAt: result.expiresAt, createdAt: new Date().toISOString() }, ...current.invitations] })); setInviteUrl(result.inviteUrl); formElement.reset(); setToast(t.inviteCreated); }
    catch (cause) { setError(cause instanceof Error ? cause.message : t.genericError); } finally { setPending(false); }
  }

  async function revoke(id: string) {
    setPending(true); setError("");
    try { const response = await fetch(`/api/settings/staff/invitations/${id}`, { method: "DELETE" }); await responseMessage(response, t.genericError); setData(current => ({ ...current, invitations: current.invitations.filter(item => item.id !== id) })); setInviteUrl(""); }
    catch (cause) { setError(cause instanceof Error ? cause.message : t.genericError); } finally { setPending(false); }
  }

  const planLabel = data.subscription.plan === "PILOT" ? t.pilot : data.subscription.plan === "TRIAL" ? t.trial : t.standard;
  const statusLabel = ({ TRIALING: t.trialing, ACTIVE: t.activePlan, GRACE: t.grace, RESTRICTED: t.restricted, CANCELED: t.canceled })[data.subscription.status];

  return <>
    <div className="content-header settings-header"><h1>{t.title}</h1><p className="text-muted">{t.intro}</p></div>
    {error && <p className="form-alert settings-alert" role="alert">{error}</p>}{!owner && <div className="info-banner settings-alert"><Icon name="info"/><span>{t.ownerOnly}</span></div>}
    <form onSubmit={save} className="settings-form">
      {owner && <SettingsGroup title={t.store}><div className="settings-fields"><Field label={t.storeName}><input className="input" value={data.store.name} maxLength={100} onChange={event => field("name", event.target.value)} required/></Field><div className="form-row"><Field label={t.address}><input className="input" value={data.store.address ?? ""} maxLength={240} onChange={event => field("address", event.target.value)}/></Field><Field label={t.contact}><input className="input" type="tel" inputMode="tel" value={data.store.contact ?? ""} maxLength={24} pattern="[0-9+() -]{7,24}" onChange={event => field("contact", sanitizePhoneInput(event.target.value))}/></Field></div><Field label={t.storeType}><select className="select" value={data.store.storeType} onChange={event => field("storeType", event.target.value)}><option>Sari-sari store</option><option>Mini-mart</option><option>Convenience store</option><option>Other small store</option></select></Field></div></SettingsGroup>}

      <SettingsGroup title={t.account}><div className="settings-fields"><div className="form-row"><Field label={t.yourName}><input className="input" value={data.user.name ?? ""} maxLength={100} onChange={event => setData(current => ({ ...current, user: { ...current.user, name: event.target.value } }))} required/></Field><Field label={t.mobile}><input className="input" type="tel" inputMode="tel" value={data.user.phone ?? ""} maxLength={24} pattern="[0-9+() -]{7,24}" onChange={event => setData(current => ({ ...current, user: { ...current.user, phone: sanitizePhoneInput(event.target.value) } }))}/></Field></div><Field label={t.email}><input className="input" value={data.user.email} disabled/></Field><div className="settings-password-row"><span><strong>{t.password}</strong></span><button className="btn btn-secondary" type="button" aria-expanded={passwordOpen} onClick={() => { setPasswordError(""); setPasswordOpen(value => !value); }}>{passwordOpen ? t.cancelPassword : t.changePassword}</button></div>{passwordOpen && <div className="settings-password-editor" onKeyDown={passwordKeyDown}><div className="field"><label className="field-label" htmlFor="current-password">{t.currentPassword}</label><PasswordInput id="current-password" autoFocus autoComplete="current-password" value={passwords.currentPassword} onChange={event => setPasswords(current => ({ ...current, currentPassword: event.target.value }))} required locale={locale}/></div><div className="form-row"><div className="field"><label className="field-label" htmlFor="new-password">{t.newPassword}</label><PasswordInput id="new-password" autoComplete="new-password" minLength={10} value={passwords.newPassword} onChange={event => setPasswords(current => ({ ...current, newPassword: event.target.value }))} required locale={locale}/></div><div className="field"><label className="field-label" htmlFor="confirm-password">{t.confirmPassword}</label><PasswordInput id="confirm-password" autoComplete="new-password" minLength={10} value={passwords.confirmPassword} onChange={event => setPasswords(current => ({ ...current, confirmPassword: event.target.value }))} required locale={locale}/></div></div>{passwordError && <p className="field-error" role="alert">{passwordError}</p>}<button className="btn btn-secondary settings-inline-action" type="button" disabled={pending} aria-busy={pending} onClick={() => void changePassword()}>{pending ? <LoadingButtonContent message={t.updatePassword}/> : t.updatePassword}</button></div>}</div></SettingsGroup>

      <SettingsGroup title={t.preferences}><div className="settings-row"><span className="row-main"><span className="row-title">{t.language}</span><span className="row-meta">{t.languageHelp}</span></span><div className="segmented" role="group" aria-label={t.language}><button type="button" className={data.user.preferredLanguage === "EN" ? "active" : ""} aria-pressed={data.user.preferredLanguage === "EN"} onClick={() => setData(current => ({ ...current, user: { ...current.user, preferredLanguage: "EN" } }))}>EN</button><button type="button" className={data.user.preferredLanguage === "FIL" ? "active" : ""} aria-pressed={data.user.preferredLanguage === "FIL"} onClick={() => setData(current => ({ ...current, user: { ...current.user, preferredLanguage: "FIL" } }))}>FIL</button></div></div><div className="settings-row"><span className="row-main"><span className="row-title">{t.theme}</span><span className="row-meta">{t.themeHelp}</span></span><select className="select settings-select" aria-label={t.theme} value={data.user.preferredTheme} onChange={event => selectTheme(event.target.value as ThemePreference)}><option value="SYSTEM">{t.system}</option><option value="LIGHT">{t.light}</option><option value="DARK">{t.dark}</option></select></div></SettingsGroup>
      {owner && <SettingsGroup title={t.notifications}><Toggle label={t.low} help={t.lowHelp} checked={data.preference.lowStockEnabled} onChange={value => setData(current => ({ ...current, preference: { ...current.preference, lowStockEnabled: value } }))}/><Toggle label={t.daily} help={t.dailyHelp} checked={data.preference.dailySummaryEnabled} onChange={value => setData(current => ({ ...current, preference: { ...current.preference, dailySummaryEnabled: value } }))}/><Toggle label={t.receipt} help={t.receiptHelp} checked={data.preference.receiptNotifications} onChange={value => setData(current => ({ ...current, preference: { ...current.preference, receiptNotifications: value } }))}/></SettingsGroup>}
      {owner && <SettingsGroup title={t.retention}><div className="settings-row"><span className="row-main"><span className="row-title">{t.retention}</span><span className="row-meta">{t.retentionHelp}</span></span><select className="select settings-select" aria-label={t.retention} value={data.preference.receiptRetentionDays} onChange={event => setData(current => ({ ...current, preference: { ...current.preference, receiptRetentionDays: Number(event.target.value) } }))}><option value="90">{t.threeMonths}</option><option value="180">{t.sixMonths}</option><option value="365">{t.oneYear}</option></select></div></SettingsGroup>}
      <button className="btn btn-primary settings-save" disabled={pending} type="submit">{pending ? <LoadingButtonContent message={t.save}/> : t.save}</button>
    </form>

    {owner && <><SettingsGroup title={t.team}><p className="text-muted text-sm settings-group-help">{t.teamHelp}</p><form className="settings-invite-form" onSubmit={invite}><input className="input" name="email" type="email" placeholder="staff@example.com" aria-label={t.inviteEmail} required/><button className="btn btn-secondary" disabled={pending}><Icon name="plus"/>{t.invite}</button></form>{inviteUrl && <div className="info-banner invite-link"><span className="text-sm">{inviteUrl}</span><button className="btn btn-secondary btn-sm" type="button" onClick={async () => { await navigator.clipboard.writeText(inviteUrl); setToast(t.copied); }}>{t.copyLink}</button></div>}<div className="settings-team-list">{data.members.map(member => <div className="row-item" key={member.id}><span className="avatar">{(member.user.name || member.user.email).slice(0, 2).toUpperCase()}</span><span className="row-main"><span className="row-title">{member.user.name || member.user.email}</span><span className="row-meta">{member.user.email} · {member.role === "OWNER" ? "Owner" : "Staff"}</span></span><span className="badge badge-success">{t.active}</span></div>)}{data.invitations.map(invitation => <div className="row-item" key={invitation.id}><span className="avatar"><Icon name="plus"/></span><span className="row-main"><span className="row-title">{invitation.email}</span><span className="row-meta">{t.pending}</span></span><button className="btn btn-ghost btn-sm" type="button" disabled={pending} onClick={() => void revoke(invitation.id)}>{t.revoke}</button></div>)}</div></SettingsGroup><SettingsGroup title={t.plan}><div className="settings-plan-row"><span><strong>{planLabel}</strong><span className="row-meta">{t.planHelp}</span></span><span className={`badge ${data.subscription.status === "RESTRICTED" || data.subscription.status === "CANCELED" ? "badge-danger" : data.subscription.status === "GRACE" ? "badge-warning" : "badge-success"}`}>{statusLabel}</span></div></SettingsGroup></>}
    <AppToast message={toast} locale={locale} onDismiss={() => setToast("")}/>
  </>;
}

function SettingsGroup({ title, children }: { title: string; children: React.ReactNode }) { return <section className="settings-group"><h2 className="settings-group-title">{title}</h2><div className="card settings-card">{children}</div></section>; }
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="field"><span className="field-label">{label}</span>{children}</label>; }
function Toggle({ label, help, checked, onChange }: { label: string; help: string; checked: boolean; onChange: (value: boolean) => void }) { return <div className="settings-row"><span className="row-main"><span className="row-title">{label}</span><span className="row-meta">{help}</span></span><label className="switch"><input type="checkbox" checked={checked} onChange={event => onChange(event.target.checked)} aria-label={label}/><span className="switch-track"/><span className="switch-thumb"/></label></div>; }
