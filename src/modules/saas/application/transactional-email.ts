import { database } from "@/platform/persistence/prisma";
import { emailProvider, type TransactionalEmail } from "../infrastructure/email-provider";

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!);

type EmailFrameOptions = {
  title: string;
  message: string;
  action?: { label: string; url: string };
  note?: string;
  eyebrow?: string;
};

const emailLogo = `<table role="presentation" width="44" height="44" cellspacing="0" cellpadding="0" border="0" bgcolor="#1B4D3E" style="width:44px;height:44px;border-radius:12px;background:#1B4D3E"><tr><td align="center" valign="middle" style="padding:0"><table role="presentation" width="24" cellspacing="0" cellpadding="0" border="0" style="width:24px"><tr><td height="7" style="height:7px;border:2px solid #FFFFFF;border-bottom:0;border-radius:4px 4px 0 0"></td></tr><tr><td height="16" align="center" valign="bottom" style="height:16px;border:2px solid #FFFFFF;border-radius:0 0 3px 3px;padding:0 0 2px"><span style="display:inline-block;width:2px;height:8px;background:#FFFFFF;font-size:0;line-height:0">&nbsp;</span></td></tr></table></td></tr></table>`;

function frame({ title, message, action, note, eyebrow = "Store operating assistant" }: EmailFrameOptions): TransactionalEmail {
  const actionText = action ? `\n\n${action.label}: ${action.url}` : "";
  const noteText = note ? `\n\n${note}` : "";
  const actionHtml = action
    ? `<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:26px 0 24px"><tr><td bgcolor="#1B4D3E" style="border-radius:12px"><a href="${escapeHtml(action.url)}" style="display:inline-block;padding:14px 22px;color:#FFFFFF;text-decoration:none;font-size:15px;font-weight:700;line-height:20px">${escapeHtml(action.label)}</a></td></tr></table>`
    : "";
  const noteHtml = note
    ? `<div style="margin-top:26px;padding:16px 18px;border-radius:12px;background:#E8F2EE;color:#315D50;font-size:13px;line-height:20px">${escapeHtml(note)}</div>`
    : "";

  return {
    to: "",
    subject: title,
    text: `${message}${actionText}${noteText}\n\nTindahan — Run the store. Tindahan keeps up.`,
    html: `<!doctype html><html><body style="margin:0;padding:0;background:#FAF8F5;color:#1A1D1A"><div style="display:none;max-height:0;overflow:hidden;opacity:0">${escapeHtml(message)}</div><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;background:#FAF8F5"><tr><td align="center" style="padding:36px 16px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:600px"><tr><td style="padding:0 6px 18px"><table role="presentation" cellspacing="0" cellpadding="0" border="0"><tr><td style="vertical-align:middle">${emailLogo}</td><td style="padding-left:12px;vertical-align:middle"><div style="font-family:'Plus Jakarta Sans','DM Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;color:#1A1D1A;font-size:20px;font-weight:800;letter-spacing:-0.3px">Tindahan</div><div style="margin-top:2px;font-family:'Plus Jakarta Sans','DM Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;color:#6B7B52;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase">${escapeHtml(eyebrow)}</div></td></tr></table></td></tr><tr><td style="overflow:hidden;border:1px solid #E6E2DC;border-radius:20px;background:#FFFFFF;box-shadow:0 4px 12px rgba(27,77,62,0.04)"><div style="height:5px;background:#1B4D3E"></div><div style="padding:34px 34px 32px;font-family:'Plus Jakarta Sans','DM Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif"><h1 style="margin:0 0 14px;color:#1A1D1A;font-size:26px;line-height:34px;font-weight:800;letter-spacing:-0.5px">${escapeHtml(title)}</h1><p style="margin:0;color:#5F665E;font-size:15px;line-height:25px">${escapeHtml(message)}</p>${actionHtml}${noteHtml}<div style="margin-top:30px;padding-top:20px;border-top:1px solid #E6E2DC;color:#7A8179;font-size:12px;line-height:19px">Run the store. Tindahan keeps up.<br/>This is an account message from Tindahan.</div></div></td></tr></table></td></tr></table></div></body></html>`,
  };
}

export function staffInvitationEmail(storeName: string, inviterName: string, inviteUrl: string) {
  return frame({
    eyebrow: "Staff invitation",
    title: `Join ${storeName}`,
    message: `${inviterName} invited you to join ${storeName} as staff on Tindahan. You’ll use your own account, so the owner never needs to share a password.`,
    action: { label: "Accept invitation", url: inviteUrl },
    note: "This invitation is private. If you were not expecting it, you can safely ignore this email.",
  });
}

export function accountVerificationEmail(name: string, verificationUrl: string) {
  return frame({
    eyebrow: "Account verification",
    title: "Verify your email",
    message: `Hi ${name}, confirm this email address for your Tindahan account. It only takes one tap and helps keep your store account connected to the right person.`,
    action: { label: "Verify email", url: verificationUrl },
    note: "If you did not create a Tindahan account, you can safely ignore this email.",
  });
}

export function invitationAcceptedEmail(storeName: string, staffName: string) {
  return frame({ title: "Staff invitation accepted", message: `${staffName} has joined ${storeName} as staff.` });
}

export function billingStatusEmail(storeName: string, kind: "activated" | "failed" | "canceled" | "changed") {
  const content: [string, string] = kind === "activated" ? ["Plan activated", `Your Standard plan for ${storeName} is active.`] : kind === "failed" ? ["Payment needs attention", `We could not complete the latest plan payment for ${storeName}. Review your billing details in Settings.`] : kind === "canceled" ? ["Plan canceled", `The plan for ${storeName} has been canceled. Your records remain available.`] : ["Plan updated", `The plan for ${storeName} has been updated.`];
  return frame({ title: content[0], message: content[1] });
}

export async function deliverEmail(input: { storeId: string; userId?: string; invitationId?: string; kind: string; recipient: string; idempotencyKey: string; email: TransactionalEmail }) {
  const provider = emailProvider();
  const existing = await database().emailDelivery.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
  if (existing?.status === "SENT") return { status: "SENT" as const, messageId: existing.providerMessageId };
  const delivery = await database().emailDelivery.upsert({ where: { idempotencyKey: input.idempotencyKey }, update: { status: "PENDING", failureCode: null }, create: { storeId: input.storeId, userId: input.userId, invitationId: input.invitationId, kind: input.kind, recipient: input.recipient, provider: provider.id, idempotencyKey: input.idempotencyKey } });
  try {
    const result = await provider.send({ ...input.email, to: input.recipient }, input.idempotencyKey);
    await database().emailDelivery.update({ where: { id: delivery.id }, data: { status: "SENT", providerMessageId: result.messageId } });
    return { status: "SENT" as const, messageId: result.messageId };
  } catch (error) {
    const failureCode = error instanceof Error ? error.name : "EMAIL_PROVIDER_ERROR";
    await database().emailDelivery.update({ where: { id: delivery.id }, data: { status: "FAILED", failureCode } });
    return { status: "FAILED" as const, messageId: null };
  }
}
