import { database } from "@/platform/persistence/prisma";
import { emailProvider, type TransactionalEmail } from "../infrastructure/email-provider";

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!);
function frame(title: string, message: string, action?: { label: string; url: string }): TransactionalEmail {
  const actionText = action ? `\n\n${action.label}: ${action.url}` : "";
  const actionHtml = action ? `<p style="margin:24px 0"><a href="${escapeHtml(action.url)}" style="background:#195847;color:#fff;text-decoration:none;padding:12px 20px;border-radius:10px;display:inline-block">${escapeHtml(action.label)}</a></p>` : "";
  return { to: "", subject: title, text: `${message}${actionText}\n\nTindahan`, html: `<div style="font-family:Arial,sans-serif;background:#faf8f4;padding:32px;color:#151915"><div style="max-width:560px;margin:auto;background:#fff;border:1px solid #e5dfd5;border-radius:18px;padding:32px"><h1 style="font-size:24px;margin:0 0 16px">${escapeHtml(title)}</h1><p style="line-height:1.6">${escapeHtml(message)}</p>${actionHtml}<p style="color:#68706a;font-size:13px;margin-top:28px">Tindahan sent this account notification.</p></div></div>` };
}

export function staffInvitationEmail(storeName: string, inviterName: string, inviteUrl: string) { return frame(`Join ${storeName} on Tindahan`, `${inviterName} invited you to join ${storeName} as staff. Your account stays separate from the owner’s account.`, { label: "Accept invitation", url: inviteUrl }); }
export function invitationAcceptedEmail(storeName: string, staffName: string) { return frame("Staff invitation accepted", `${staffName} has joined ${storeName} as staff.`); }
export function billingStatusEmail(storeName: string, kind: "activated" | "failed" | "canceled" | "changed") {
  const content: [string, string] = kind === "activated" ? ["Plan activated", `Your Standard plan for ${storeName} is active.`] : kind === "failed" ? ["Payment needs attention", `We could not complete the latest plan payment for ${storeName}. Review your billing details in Settings.`] : kind === "canceled" ? ["Plan canceled", `The plan for ${storeName} has been canceled. Your records remain available.`] : ["Plan updated", `The plan for ${storeName} has been updated.`];
  return frame(content[0], content[1]);
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
