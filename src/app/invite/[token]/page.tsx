import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/modules/identity/infrastructure/auth-options";
import { invitationPreview } from "@/modules/saas/application/saas-service";
import { InviteAcceptForm } from "./invite-accept-form";

export const metadata = { title: "Join a store" };
export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params; const session = await getServerSession(authOptions);
  let invitation: Awaited<ReturnType<typeof invitationPreview>> | null = null;
  try { invitation = await invitationPreview(token); } catch { /* Public copy deliberately avoids invitation details. */ }
  if (!invitation) return <main className="standalone"><section className="card invite-page invite-card"><span className="empty-icon"><span aria-hidden="true">!</span></span><h1>This invitation is no longer available.</h1><p className="text-muted">Ask the store owner to create a new invitation.</p><Link className="btn btn-primary" href="/sign-in">Go to sign in</Link></section></main>;
  return <main className="standalone"><section className="card invite-page invite-card"><div><h1>Join {invitation.store.name}</h1><p className="text-muted" style={{ marginTop: "var(--space-2)" }}>You were invited as staff. Your access stays separate from the owner’s account.</p></div><div className="invite-store"><strong>{invitation.email}</strong><p className="text-sm text-muted">Staff account</p></div><InviteAcceptForm token={token} invitedEmail={invitation.email} signedInEmail={session?.user.email ?? null}/>{!session?.user.id && <p className="text-sm text-muted" style={{ textAlign: "center" }}>Already have an account? <Link href={`/sign-in?callbackUrl=${encodeURIComponent(`/invite/${token}`)}`} style={{ color: "var(--color-brand-primary)", fontWeight: "var(--weight-semibold)" }}>Sign in with the invited email</Link></p>}</section></main>;
}
