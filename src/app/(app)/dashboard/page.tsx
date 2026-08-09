import Link from "next/link";
import { cookies } from "next/headers";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { Icon } from "@/components/icon";
import { authOptions } from "@/modules/identity/infrastructure/auth-options";
import { searchProducts } from "@/modules/inventory/application/inventory-service";
import { dashboardSales } from "@/modules/sales/application/sales-service";
import { listReceipts, receiptDashboardIndicators } from "@/modules/receipts/application/receipt-service";

type AttentionProduct = Awaited<ReturnType<typeof searchProducts>>["items"][number];

const money = (value: string) => new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(Number(value));

function unitLabel(product: AttentionProduct, fil: boolean) {
  if (product.sellingUnit === "OTHER") return product.otherUnitRaw?.trim() || (fil ? "iba" : "unit");
  const labels: Record<string, [string, string]> = {
    PIECE: ["piece", "piraso"], PACK: ["pack", "pakete"], BOTTLE: ["bottle", "bote"], CAN: ["can", "lata"],
    SACHET: ["sachet", "sachet"], KILOGRAM: ["kilogram", "kilo"], GRAM: ["gram", "gramo"],
    LITER: ["liter", "litro"], MILLILITER: ["milliliter", "mililitro"],
  };
  return labels[product.sellingUnit]?.[fil ? 1 : 0] ?? product.sellingUnit.toLowerCase();
}

function includedProducts(products: AttentionProduct[], fil: boolean) {
  const names = products.slice(0, 3).map(product => product.name);
  const list = new Intl.ListFormat(fil ? "fil-PH" : "en-PH", { style: "long", type: "conjunction" }).format(names);
  return fil ? `Kasama ang ${list}` : `Including ${list}`;
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user.id) redirect("/sign-in");
  const locale = (await cookies()).get("tindahan-language")?.value === "FIL" ? "FIL" : "EN";
  const fil = locale === "FIL";
  const [sales, lowInventory, outInventory, receiptAttention, recentReceipts, receiptIndicators] = await Promise.all([
    dashboardSales(session.user.id),
    searchProducts(session.user.id, { filter: "low", sort: "quantity", limit: 3 }),
    searchProducts(session.user.id, { filter: "out", sort: "name", limit: 3 }),
    listReceipts(session.user.id, { status: "attention", limit: 3 }),
    listReceipts(session.user.id, { status: "confirmed", limit: 3 }),
    receiptDashboardIndicators(session.user.id),
  ]);
  const attentionCount = lowInventory.counts.low + outInventory.counts.out;
  const dashboardAttentionCount = attentionCount + receiptAttention.counts.attention;
  const date = new Intl.DateTimeFormat(fil ? "fil-PH" : "en-PH", { weekday: "long", month: "long", day: "numeric", timeZone: "Asia/Manila" }).format(new Date());
  const firstName = session.user.name?.split(" ")[0] ?? (fil ? "kaibigan" : "there");
  const recentActivity = [
    ...sales.recent.map(sale => ({
      id: sale.id,
      href: `/sales/${sale.id}`,
      icon: "bag" as const,
      title: sale.status === "CORRECTED" ? (fil ? "Itinamang benta" : "Sale corrected") : (fil ? `Naitalang benta · ${sale.totalQuantity} item` : `Sale recorded · ${sale.totalQuantity} items`),
      occurredAt: sale.confirmedAt ?? new Date(0).toISOString(),
      value: money(sale.totalAmount),
    })),
    ...recentReceipts.items.map(receipt => ({
      id: receipt.id,
      href: `/receipts/${receipt.id}`,
      icon: "receipt" as const,
      title: receipt.reversed ? (fil ? "Binaligtad na resibo" : "Receipt reversed") : (fil ? `Nakumpirmang resibo · ${receipt.totalQuantity} item` : `Receipt confirmed · ${receipt.totalQuantity} items`),
      occurredAt: receipt.confirmedAt ?? receipt.createdAt,
      value: receipt.supplier ?? (fil ? "Resibo ng supplier" : "Supplier receipt"),
    })),
  ].sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime()).slice(0, 5);

  return <>
    <div className="content-header"><h1>{fil ? `Magandang araw, ${firstName}` : `Good day, ${firstName}`}</h1><p className="text-muted">{fil ? `Narito ang nangyayari sa tindahan mo ngayong ${date}.` : `Here's what's happening at your store today, ${date}.`}</p></div>
    <section className="section">
      <div className="section-header"><h2 className="section-heading"><Icon name="alert"/>{fil ? "Kailangan ng iyong pansin" : "Needs your attention"}</h2></div>
      {dashboardAttentionCount > 0 ? <div className="card card-tint-cream card-pad">
        {outInventory.counts.out > 0 && <InventoryAttention kind="out" count={outInventory.counts.out} products={outInventory.items} fil={fil}/>}
        {lowInventory.counts.low > 0 && <InventoryAttention kind="low" count={lowInventory.counts.low} products={lowInventory.items} fil={fil}/>}
        {receiptAttention.counts.attention > 0 && <ReceiptAttention items={receiptAttention.items} count={receiptAttention.counts.attention} fil={fil}/>}
      </div> : <div className="card empty-state dashboard-calm-state"><span className="empty-icon"><Icon name="check"/></span><h3>{fil ? "Walang kailangang asikasuhin ngayon" : "Nothing needs attention right now"}</h3><p className="empty-body">{fil ? "Lalabas dito ang mga produktong paubos o ubos na." : "Low and out-of-stock products will appear here."}</p></div>}
    </section>
    <section className="section"><div className="section-header"><h2 className="section-heading"><Icon name="receipt"/>{fil ? "Kalagayan ng mga resibo" : "Receipt activity"}</h2><Link className="section-link" href="/receipts">{fil ? "Tingnan ang mga resibo →" : "View receipts →"}</Link></div><div className="card card-pad receipt-dashboard-grid"><ReceiptStatusStat value={receiptIndicators.processing.count} label={fil ? "Inihahanda" : "Processing"} tone="warning" icon="loader"/><ReceiptStatusStat value={receiptIndicators.needsMapping.count} label={fil ? "Kailangang itugma" : "Needs product mapping"} tone="warning" icon="alert"/><ReceiptStatusStat value={receiptIndicators.awaitingApproval.count} label={fil ? "Handa nang kumpirmahin" : "Awaiting approval"} tone="info" icon="check"/><ReceiptStatusStat value={receiptIndicators.failed.count} label={fil ? "Kailangang subukan ulit" : "Needs another try"} tone="danger" icon="alert"/></div></section>
    <section className="section"><div className="section-header"><h2 className="section-heading">{fil ? "Buod ngayong araw" : "Today's summary"}</h2><Link className="section-link" href="/sales">{fil ? "Tingnan ang mga benta →" : "See sales →"}</Link></div><div className="card card-pad"><div className="grid-3"><Stat value={money(sales.summary.amount)} label={fil ? "Kabuuang benta" : "Total sales"}/><Stat value={String(sales.summary.quantity)} label={fil ? "Naibentang item" : "Items sold"}/><Stat value={String(sales.summary.count)} label={fil ? "Naitalang benta" : "Sales recorded"}/></div></div></section>
    <section className="section"><div className="section-header"><h2 className="section-heading">{fil ? "Mabilisang gawain" : "Quick actions"}</h2></div><div className="card card-tint-brand card-pad"><div className="quick-actions"><Quick href="/receipts/new" icon="camera" label={fil ? "I-scan ang resibo" : "Scan receipt"}/><Quick href="/sales/new" icon="bag" label={fil ? "Itala ang benta" : "Record sale"}/><Quick href="/inventory" icon="package" label={fil ? "Magdagdag ng stock" : "Add inventory"}/><Quick href="/search" icon="search" label={fil ? "Maghanap ng produkto" : "Find product"}/></div></div></section>
    <section className="section"><div className="section-header"><h2 className="section-heading">{fil ? "Kamakailang aktibidad" : "Recent activity"}</h2><Link className="section-link" href="/receipts">{fil ? "Tingnan lahat →" : "View all →"}</Link></div>{recentActivity.length ? <div className="row-list">{recentActivity.map(activity => <Link className="row-item" href={activity.href} key={`${activity.icon}-${activity.id}`}><span className="attn-icon info"><Icon name={activity.icon}/></span><span className="row-main"><span className="row-title">{activity.title}</span><span className="row-meta">{new Intl.DateTimeFormat(fil ? "fil-PH" : "en-PH", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Manila" }).format(new Date(activity.occurredAt))}</span></span><span className="row-value">{activity.value}</span></Link>)}</div> : <div className="card empty-state dashboard-calm-state"><span className="empty-icon"><Icon name="receipt"/></span><p className="empty-body">{fil ? "Lalabas dito ang mga benta at nakumpirmang resibo." : "Recorded sales and confirmed receipts will appear here."}</p></div>}</section>
    <section className="section"><div className="section-header"><h2 className="section-heading">{fil ? "Kapaki-pakinabang na impormasyon" : "Helpful insights"}</h2></div><div className="card card-tint-olive card-pad"><span className="badge badge-olive">{fil ? "Kalagayan ng stock" : "Stock check"}</span><p className="font-medium dashboard-insight">{attentionCount > 0 ? (fil ? `${attentionCount} produkto ang nangangailangan ng pansin.` : `${attentionCount} products need attention.`) : (fil ? "Maayos ang kasalukuyang kalagayan ng stock." : "Current stock levels look clear.")}</p><Link className="section-link" href="/inventory">{fil ? "Buksan ang imbentaryo →" : "Open inventory →"}</Link></div></section>
  </>;
}

function InventoryAttention({ kind, count, products, fil }: { kind: "out" | "low"; count: number; products: AttentionProduct[]; fil: boolean }) {
  const single = count === 1 ? products[0] : undefined;
  const title = single
    ? kind === "out" ? (fil ? `Ubos na ang ${single.name}` : `${single.name} is out of stock`) : (fil ? `Paubos na ang ${single.name}` : `${single.name} is almost out`)
    : kind === "out" ? (fil ? `${count} produktong ubos na` : `${count} products are out of stock`) : (fil ? `${count} produktong paubos na` : `${count} products are almost out`);
  const meta = single
    ? kind === "out"
      ? (fil ? `Wala nang stock · ${money(single.sellingPrice)} bawat isa` : `No stock remaining · sold at ${money(single.sellingPrice)} each`)
      : (fil ? `${single.quantity} ${unitLabel(single, true)} ang natitira · ${money(single.sellingPrice)} bawat isa` : `${single.quantity} ${unitLabel(single, false)} remaining · sold at ${money(single.sellingPrice)} each`)
    : includedProducts(products, fil);
  return <div className="attn-item">
    <span className={`attn-icon ${kind === "out" ? "danger" : "warning"}`}><Icon name={kind === "out" ? "xCircle" : "alert"}/></span>
    <span className="attn-body"><span className="attn-title">{title}</span><span className="attn-meta">{meta}</span></span>
    <Link className="btn btn-secondary btn-sm" href={single ? `/inventory/${single.id}` : "/inventory"}>{single ? (fil ? "Magdagdag ng stock" : "Restock") : (fil ? "Tingnan ang imbentaryo" : "Review inventory")}</Link>
  </div>;
}

function ReceiptAttention({ items, count, fil }: { items: Awaited<ReturnType<typeof listReceipts>>["items"]; count: number; fil: boolean }) {
  const first = items[0];
  const single = count === 1 ? first : undefined;
  const ready = single?.status === "REVIEW_READY";
  const title = single
    ? ready
      ? (fil ? "May resibong handa nang suriin" : "A receipt is ready to review")
      : (fil ? "May resibong kailangang ihanda ulit" : "A receipt needs another try")
    : (fil ? `${count} resibo ang nangangailangan ng pansin` : `${count} receipts need attention`);
  const suppliers = new Intl.ListFormat(fil ? "fil-PH" : "en-PH", { style: "long", type: "conjunction" }).format([...new Set(items.slice(0, 3).map(item => item.supplier ?? (fil ? "Resibo ng supplier" : "Supplier receipt")))]);
  const meta = single ? (single.supplier ?? (fil ? "Resibo ng supplier" : "Supplier receipt")) : (fil ? `Kasama ang ${suppliers}` : `Including ${suppliers}`);
  const href = single ? `/receipts/${single.id}${ready ? "/review" : ""}` : "/receipts";
  return <div className="attn-item">
    <span className={`attn-icon ${ready ? "info" : "warning"}`}><Icon name={ready ? "receipt" : "alert"}/></span>
    <span className="attn-body"><span className="attn-title">{title}</span><span className="attn-meta">{meta}</span></span>
    <Link className={`btn btn-sm ${ready ? "btn-primary" : "btn-secondary"}`} href={href}>{single ? (ready ? (fil ? "Suriin ang resibo" : "Review receipt") : (fil ? "Subukan ulit" : "Try again")) : (fil ? "Tingnan ang mga resibo" : "Review receipts")}</Link>
  </div>;
}

function Stat({ value, label }: { value: string; label: string }) { return <div><div className="stat-row"><span className="stat-value">{value}</span></div><span className="stat-label">{label}</span></div>; }
function ReceiptStatusStat({ value, label, tone, icon }: { value: number; label: string; tone: "info" | "warning" | "danger"; icon: "loader" | "alert" | "check" }) { return <div className="receipt-dashboard-stat"><span className={`attn-icon ${tone}`}><Icon name={icon} className={`icon${icon === "loader" ? " loading-icon-spin" : ""}`}/></span><span><strong>{value}</strong><span className="stat-label">{label}</span></span></div>; }
function Quick({ href, icon, label }: { href: string; icon: "camera" | "bag" | "package" | "search"; label: string }) { return <Link className="quick-action" href={href}><span className="quick-action-icon"><Icon name={icon}/></span><span className="quick-action-label">{label}</span></Link>; }
