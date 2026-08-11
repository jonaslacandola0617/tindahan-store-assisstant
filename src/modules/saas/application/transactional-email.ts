import { database } from "@/platform/persistence/prisma";
import { emailProvider, type TransactionalEmail } from "../infrastructure/email-provider";

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!);
const escapeMultiline = (value: string) => escapeHtml(value).replace(/\n/g, "<br/>");

export type OperationalEmailLocale = "EN" | "FIL";
export type StockEmailItem = { name: string; quantity: number; unit: string; status: "LOW" | "OUT" };
export type DailyStoreSummary = {
  salesAmount: string;
  saleCount: number;
  lowStockCount: number;
  outOfStockCount: number;
  receiptsReadyCount: number;
  receiptsFailedCount: number;
};

type EmailDetail = { label: string; value: string; emphasis?: "normal" | "warning" };
type EmailFrameOptions = {
  title: string;
  message: string;
  action?: { label: string; url: string };
  note?: string;
  eyebrow?: string;
  details?: EmailDetail[];
  footer?: string;
};

const emailLogo = `<table role="presentation" width="44" height="44" cellspacing="0" cellpadding="0" border="0" bgcolor="#1B4D3E" style="width:44px;height:44px;border-radius:12px;background:#1B4D3E;border-collapse:separate"><tr><td width="44" height="44" align="center" valign="middle" style="width:44px;height:44px;padding:0"><table role="presentation" width="24" height="28" cellspacing="0" cellpadding="0" border="0" style="width:24px;height:28px;border-collapse:separate"><tr><td width="24" height="28" align="center" valign="bottom" style="width:20px;height:24px;padding:0 0 2px;border:2px solid #FFFFFF;border-radius:3px"><table role="presentation" width="8" height="11" cellspacing="0" cellpadding="0" border="0" style="width:8px;height:11px;border-collapse:separate"><tr><td width="8" height="11" style="width:6px;height:9px;padding:0;border:2px solid #FFFFFF;border-bottom:0;font-size:0;line-height:0">&nbsp;</td></tr></table></td></tr></table></td></tr></table>`;

function frame({ title, message, action, note, eyebrow = "Store operating assistant", details = [], footer = "This is an account message from Tindahan." }: EmailFrameOptions): TransactionalEmail {
  const actionText = action ? `\n\n${action.label}: ${action.url}` : "";
  const detailText = details.length ? `\n\n${details.map(detail => `${detail.label}: ${detail.value}`).join("\n")}` : "";
  const noteText = note ? `\n\n${note}` : "";
  const actionHtml = action
    ? `<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:26px 0 24px"><tr><td bgcolor="#1B4D3E" style="border-radius:12px"><a href="${escapeHtml(action.url)}" style="display:inline-block;padding:14px 22px;color:#FFFFFF;text-decoration:none;font-size:15px;font-weight:700;line-height:20px">${escapeHtml(action.label)}</a></td></tr></table>`
    : "";
  const detailsHtml = details.length
    ? `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;margin-top:24px;border:1px solid #E6E2DC;border-radius:14px;border-collapse:separate;overflow:hidden">${details.map((detail, index) => `<tr><td style="padding:13px 16px;${index ? "border-top:1px solid #E6E2DC;" : ""}color:#5F665E;font-size:13px;line-height:19px">${escapeHtml(detail.label)}</td><td align="right" style="padding:13px 16px;${index ? "border-top:1px solid #E6E2DC;" : ""}color:${detail.emphasis === "warning" ? "#B85E1B" : "#1A1D1A"};font-size:13px;line-height:19px;font-weight:700">${escapeHtml(detail.value)}</td></tr>`).join("")}</table>`
    : "";
  const noteHtml = note
    ? `<div style="margin-top:26px;padding:16px 18px;border-radius:12px;background:#E8F2EE;color:#315D50;font-size:13px;line-height:20px">${escapeMultiline(note)}</div>`
    : "";

  return {
    to: "",
    subject: title,
    text: `${message}${detailText}${actionText}${noteText}\n\nTindahan — Run the store. Tindahan keeps up.`,
    html: `<!doctype html><html><body style="margin:0;padding:0;background:#FAF8F5;color:#1A1D1A"><div style="display:none;max-height:0;overflow:hidden;opacity:0">${escapeHtml(message)}</div><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;background:#FAF8F5"><tr><td align="center" style="padding:36px 16px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:600px"><tr><td style="padding:0 6px 18px"><table role="presentation" cellspacing="0" cellpadding="0" border="0"><tr><td style="vertical-align:middle">${emailLogo}</td><td style="padding-left:12px;vertical-align:middle"><div style="font-family:'Plus Jakarta Sans','DM Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;color:#1A1D1A;font-size:20px;font-weight:800;letter-spacing:-0.3px">Tindahan</div><div style="margin-top:2px;font-family:'Plus Jakarta Sans','DM Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;color:#6B7B52;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase">${escapeHtml(eyebrow)}</div></td></tr></table></td></tr><tr><td style="overflow:hidden;border:1px solid #E6E2DC;border-radius:20px;background:#FFFFFF;box-shadow:0 4px 12px rgba(27,77,62,0.04)"><div style="height:5px;background:#1B4D3E"></div><div style="padding:34px 34px 32px;font-family:'Plus Jakarta Sans','DM Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif"><h1 style="margin:0 0 14px;color:#1A1D1A;font-size:26px;line-height:34px;font-weight:800;letter-spacing:-0.5px">${escapeHtml(title)}</h1><p style="margin:0;color:#5F665E;font-size:15px;line-height:25px">${escapeMultiline(message)}</p>${detailsHtml}${actionHtml}${noteHtml}<div style="margin-top:30px;padding-top:20px;border-top:1px solid #E6E2DC;color:#7A8179;font-size:12px;line-height:19px">Run the store. Tindahan keeps up.<br/>${escapeHtml(footer)}</div></div></td></tr></table></td></tr></table></div></body></html>`,
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

function stockValue(item: StockEmailItem, locale: OperationalEmailLocale) {
  if (item.status === "OUT") return locale === "FIL" ? "Ubos na" : "Out of stock";
  const unit = item.unit ? ` ${item.unit}` : "";
  return locale === "FIL" ? `${item.quantity}${unit} na lang` : `${item.quantity}${unit} left`;
}

export function stockAttentionEmail(storeName: string, items: StockEmailItem[], inventoryUrl: string, locale: OperationalEmailLocale) {
  const outCount = items.filter(item => item.status === "OUT").length;
  const lowCount = items.length - outCount;
  if (locale === "FIL") {
    const title = outCount && !lowCount ? `${outCount} paninda ang ubos na` : lowCount && !outCount ? `${lowCount} paninda ang paubos na` : "May stock na kailangang tingnan";
    return frame({
      eyebrow: "Stock alert",
      title,
      message: `May pagbabago sa stock ng ${storeName} na maaaring kailangan nang i-restock.`,
      details: items.map(item => ({ label: item.name, value: stockValue(item, locale), emphasis: "warning" })),
      action: { label: "Tingnan ang imbentaryo", url: inventoryUrl },
      note: "Nagpapadala lang ang Tindahan kapag unang naging paubos ang isang paninda o kapag tuluyan itong naubos.",
      footer: "Ito ay store update mula sa Tindahan.",
    });
  }
  const title = outCount && !lowCount ? `${outCount} product${outCount === 1 ? " is" : "s are"} out of stock` : lowCount && !outCount ? `${lowCount} product${lowCount === 1 ? " is" : "s are"} running low` : "Stock needs attention";
  return frame({
    eyebrow: "Stock alert",
    title,
    message: `Tindahan noticed a stock change at ${storeName} that may need restocking.`,
    details: items.map(item => ({ label: item.name, value: stockValue(item, locale), emphasis: "warning" })),
    action: { label: "Review inventory", url: inventoryUrl },
    note: "Tindahan only emails when a product first becomes low or moves from low stock to out of stock.",
    footer: "This is a store update from Tindahan.",
  });
}

export function receiptStatusEmail(input: { storeName: string; supplier: string | null; itemCount: number; status: "REVIEW_READY" | "FAILED"; receiptUrl: string; locale: OperationalEmailLocale }) {
  const supplier = input.supplier || (input.locale === "FIL" ? "Supplier receipt" : "Supplier receipt");
  if (input.locale === "FIL") {
    if (input.status === "FAILED") return frame({
      eyebrow: "Receipt update",
      title: "Hindi naproseso ang resibo",
      message: `Hindi natapos ng Tindahan ang pagbasa sa resibo para sa ${input.storeName}.`,
      details: [{ label: "Resibo", value: supplier, emphasis: "warning" }],
      action: { label: "Tingnan ang resibo", url: input.receiptUrl },
      note: "Walang nabago sa iyong imbentaryo. Maaari mong subukan muli o mag-upload ng mas malinaw na larawan.",
      footer: "Ito ay store update mula sa Tindahan.",
    });
    return frame({
      eyebrow: "Receipt update",
      title: "Handa nang suriin ang resibo",
      message: `Natapos nang basahin ng Tindahan ang resibo para sa ${input.storeName}.`,
      details: [{ label: supplier, value: `${input.itemCount} item${input.itemCount === 1 ? "" : "s"} na nakita` }],
      action: { label: "Suriin ang resibo", url: input.receiptUrl },
      note: "Wala pang nababago sa iyong imbentaryo. Ikaw pa rin ang magsusuri at mag-aapruba ng stock update.",
      footer: "Ito ay store update mula sa Tindahan.",
    });
  }
  if (input.status === "FAILED") return frame({
    eyebrow: "Receipt update",
    title: "We couldn't finish reading your receipt",
    message: `Tindahan couldn't finish processing a receipt for ${input.storeName}.`,
    details: [{ label: "Receipt", value: supplier, emphasis: "warning" }],
    action: { label: "View receipt", url: input.receiptUrl },
    note: "Your inventory was not changed. You can try again or upload a clearer photo.",
    footer: "This is a store update from Tindahan.",
  });
  return frame({
    eyebrow: "Receipt update",
    title: "Your receipt is ready to review",
    message: `Tindahan finished reading a supplier receipt for ${input.storeName}.`,
    details: [{ label: supplier, value: `${input.itemCount} item${input.itemCount === 1 ? "" : "s"} found` }],
    action: { label: "Review receipt", url: input.receiptUrl },
    note: "Nothing has changed in your inventory yet. Review what Tindahan found and approve the stock update when it looks right.",
    footer: "This is a store update from Tindahan.",
  });
}

export function dailyStoreSummaryEmail(storeName: string, summary: DailyStoreSummary, dashboardUrl: string, locale: OperationalEmailLocale, dateLabel: string) {
  if (locale === "FIL") return frame({
    eyebrow: "Daily store summary",
    title: `${storeName} — buod ngayong araw`,
    message: `Narito ang maikling buod ng tindahan para sa ${dateLabel}.`,
    details: [
      { label: "Benta ngayong araw", value: summary.salesAmount },
      { label: "Bilang ng benta", value: String(summary.saleCount) },
      { label: "Ubos na", value: String(summary.outOfStockCount), emphasis: summary.outOfStockCount ? "warning" : "normal" },
      { label: "Paubos na", value: String(summary.lowStockCount), emphasis: summary.lowStockCount ? "warning" : "normal" },
      { label: "Resibong hinihintay ang review", value: String(summary.receiptsReadyCount) },
      { label: "Resibong hindi naproseso", value: String(summary.receiptsFailedCount), emphasis: summary.receiptsFailedCount ? "warning" : "normal" },
    ],
    action: { label: "Buksan ang Tindahan", url: dashboardUrl },
    note: "Maikling buod lang ito para makita mo agad kung may kailangang asikasuhin.",
    footer: "Ito ang daily store summary mo mula sa Tindahan.",
  });
  return frame({
    eyebrow: "Daily store summary",
    title: `${storeName} — today at a glance`,
    message: `Here’s a quick store summary for ${dateLabel}.`,
    details: [
      { label: "Sales today", value: summary.salesAmount },
      { label: "Sales recorded", value: String(summary.saleCount) },
      { label: "Out of stock", value: String(summary.outOfStockCount), emphasis: summary.outOfStockCount ? "warning" : "normal" },
      { label: "Running low", value: String(summary.lowStockCount), emphasis: summary.lowStockCount ? "warning" : "normal" },
      { label: "Receipts waiting for review", value: String(summary.receiptsReadyCount) },
      { label: "Receipt processing failures", value: String(summary.receiptsFailedCount), emphasis: summary.receiptsFailedCount ? "warning" : "normal" },
    ],
    action: { label: "Open Tindahan", url: dashboardUrl },
    note: "A short recap, so you can see what needs attention without opening every report.",
    footer: "This is your daily store summary from Tindahan.",
  });
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
