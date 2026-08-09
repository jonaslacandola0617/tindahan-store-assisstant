"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon, type IconName } from "@/components/icon";

type Item = { id: string; type: string; titleKey: string; bodyKey: string; data: { href?: string; count?: number; names?: string[]; receiptId?: string; itemCount?: number; supplier?: string }; readAt: string | null; createdAt: string };

export function NotificationsClient({ initial, locale }: { initial: { items: Item[]; unreadCount: number }; locale: "EN" | "FIL" }) {
  const [items, setItems] = useState(initial.items); const [busy, setBusy] = useState(false); const router = useRouter(); const fil = locale === "FIL";
  const unread = items.filter(item => !item.readAt).length;
  async function mark(notificationId?: string) {
    setItems(current => current.map(item => !notificationId || item.id === notificationId ? { ...item, readAt: item.readAt || new Date().toISOString() } : item));
    await fetch("/api/notifications", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(notificationId ? { notificationId } : {}) });
    router.refresh();
  }
  return <>
    <div className="content-header"><div className="content-header-row"><div><h1>{fil ? "Mga Abiso" : "Notifications"}</h1><p className="text-muted">{unread} {fil ? "hindi pa nababasa" : "unread"}</p></div><button className="btn btn-secondary" type="button" disabled={!unread || busy} onClick={async () => { setBusy(true); await mark(); setBusy(false); }}>{fil ? "Markahan lahat bilang nabasa" : "Mark all as read"}</button></div></div>
    {items.length ? <div className="notif-list-card">{items.map(item => { const copy = notificationCopy(item, fil); const icon = notificationIcon(item.type); return <Link href={item.data.href || "/dashboard"} onClick={() => { if (!item.readAt) void mark(item.id); }} className={`notif-item${item.readAt ? "" : " is-unread"}`} key={item.id}><span className={`notif-dot${item.readAt ? " is-read" : ""}`} /><span className={`attn-icon ${icon.tone}`}><Icon name={icon.name} /></span><span className="row-main"><span className="row-title">{copy.title}</span><span className="row-meta">{copy.body}</span><time className="text-xs text-faint notif-time" dateTime={item.createdAt}>{formatWhen(item.createdAt, fil)}</time></span><Icon name="chevronRight" className="icon notif-chevron" /></Link>; })}</div> : <div className="empty-state card"><span className="empty-icon"><Icon name="bell" /></span><h2 className="empty-title">{fil ? "Wala pang abiso" : "No notifications yet"}</h2><p className="empty-body">{fil ? "Lalabas dito ang mahahalagang paalala at susunod na hakbang." : "Important reminders and next steps will appear here."}</p></div>}
  </>;
}

function notificationIcon(type: string): { name: IconName; tone: "warning" | "danger" | "info" } {
  if (type === "LOW_STOCK") return { name: "alert", tone: "warning" };
  if (type === "RECEIPT_FAILED" || type === "INVENTORY_CONFLICT") return { name: "xCircle", tone: "danger" };
  return { name: type === "RECEIPT_READY" ? "receipt" : "check", tone: "info" };
}
function notificationCopy(item: Item, fil: boolean) {
  const count = item.data.count ?? 0; const names = item.data.names?.join(", "); const supplier = item.data.supplier;
  if (item.titleKey === "low-stock") return { title: fil ? `${count} ${count === 1 ? "produkto ang paubos" : "produkto ang paubos"}` : `${count} ${count === 1 ? "product is" : "products are"} almost out`, body: names ? (fil ? `Tingnan ang stock para sa ${names}` : `Check inventory for ${names}`) : (fil ? "Tingnan kung ano ang kailangang idagdag" : "Check what needs restocking") };
  if (item.titleKey === "receipt-ready") return { title: fil ? `Handa nang suriin ang${supplier ? ` resibo mula ${supplier}` : " resibo"}` : `${supplier ? `Receipt from ${supplier}` : "A receipt"} is ready to review`, body: fil ? `${item.data.itemCount ?? 0} item ang nakita · Suriin bago baguhin ang stock` : `${item.data.itemCount ?? 0} items detected · Review before stock changes` };
  if (item.titleKey === "receipt-failed") return { title: fil ? "Hindi naproseso ang isang resibo" : "A receipt couldn't be processed", body: fil ? "Subukan muli o mag-upload ng mas malinaw na larawan" : "Try again or upload a clearer photo" };
  return { title: fil ? "May update sa tindahan" : "Your store has an update", body: fil ? "Buksan para makita ang detalye" : "Open to see the details" };
}
function formatWhen(value: string, fil: boolean) { return new Intl.DateTimeFormat(fil ? "fil-PH" : "en-PH", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)); }
