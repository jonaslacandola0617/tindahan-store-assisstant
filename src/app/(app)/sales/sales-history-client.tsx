"use client";

import Link from "next/link";
import { useState } from "react";
import { Icon } from "@/components/icon";
import { InlineLoading, LoadingButtonContent, SectionLoading } from "@/components/loading";
import { loadingCopy } from "@/modules/i18n/messages";

type Sale = {
  id: string;
  status: "CONFIRMED" | "CORRECTED";
  totalAmount: string;
  totalQuantity: number;
  confirmedAt: string | null;
  createdBy: { name: string | null; email: string };
  lines: { productNameSnapshot: string; quantity: number }[];
};
type Result = {
  items: Sale[];
  nextCursor: string | null;
  summary: { amount: string; quantity: number; count: number };
};

const COPY = {
  EN: { title: "Sales", subtitle: "A record of what's been sold — not a checkout.", record: "Record sale", total: "Today's total", items: "Items sold", count: "Sales recorded", today: "Today", week: "This week", month: "This month", empty: "No sales recorded yet", emptyBody: "Record a sale when products are sold. It will appear here.", details: "View sale details", load: "Load more", loading: "Loading sales…", retry: "Try again", error: "We couldn't load sales. Try again.", corrected: "Corrected", recordedBy: "Recorded by", product: "product", products: "products", item: "item" },
  FIL: { title: "Benta", subtitle: "Talaan ng mga nabenta — hindi ito checkout.", record: "Itala ang benta", total: "Kabuuan", items: "Naibentang item", count: "Naitalang benta", today: "Ngayon", week: "Ngayong linggo", month: "Ngayong buwan", empty: "Wala pang naitalang benta", emptyBody: "Magtala ng benta kapag may produktong nabenta. Lalabas ito rito.", details: "Tingnan ang detalye", load: "Magpakita pa", loading: "Kinukuha ang mga benta…", retry: "Subukan ulit", error: "Hindi makuha ang mga benta. Subukan ulit.", corrected: "Itinama", recordedBy: "Nagtala", product: "produkto", products: "produkto", item: "item" },
} as const;

const money = (value: string) => new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 2 }).format(Number(value));

export function SalesHistoryClient({ initial, locale }: { initial: Result; locale: "EN" | "FIL" }) {
  const c = COPY[locale];
  const [result, setResult] = useState(initial);
  const [range, setRange] = useState("today");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [open, setOpen] = useState<string | null>(null);

  async function load(nextRange = range, cursor?: string) {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/sales/history?range=${nextRange}${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setResult((current) => cursor ? { ...data, items: [...current.items, ...data.items] } : data);
      setRange(nextRange);
    } catch {
      setError(c.error);
    } finally {
      setBusy(false);
    }
  }

  return <>
    <div className="content-header">
      <div className="content-header-row">
        <div><h1>{c.title}</h1><p className="text-muted">{c.subtitle}</p></div>
        <Link className="btn btn-primary" href="/sales/new"><Icon name="plus" />{c.record}</Link>
      </div>
    </div>
    <div className="card card-pad sales-summary-card">
      <div className="grid-3"><Stat value={money(result.summary.amount)} label={c.total} /><Stat value={String(result.summary.quantity)} label={c.items} /><Stat value={String(result.summary.count)} label={c.count} /></div>
    </div>
    <div className="section-header">
      <div className="segmented" role="group" aria-label={locale === "FIL" ? "Saklaw ng oras" : "Time range"}>
        {[["today", c.today], ["week", c.week], ["month", c.month]].map(([value, label]) => <button key={value} type="button" className={range === value ? "active" : ""} aria-pressed={range === value} onClick={() => load(value)} disabled={busy}>{label}</button>)}
      </div>
      {busy && result.items.length > 0 && <InlineLoading message={loadingCopy(locale, "sales")} size="compact"/>}
    </div>
    {error && <div className="banner banner-danger sales-state"><Icon name="alert" /><span>{error}</span><button className="btn btn-secondary btn-sm" onClick={() => load()}>{c.retry}</button></div>}
    {busy && !result.items.length && <div className="card card-pad sales-state"><SectionLoading message={loadingCopy(locale, "sales")} compact/></div>}
    {!busy && !error && !result.items.length ? <div className="card empty-state sales-empty"><span className="empty-icon"><Icon name="bag" /></span><h2>{c.empty}</h2><p className="empty-body">{c.emptyBody}</p></div> :
      <div className="sales-history-list">{result.items.map((sale) => {
        const productSummary = sale.lines.map((line) => line.productNameSnapshot).join(", ");
        const date = new Intl.DateTimeFormat(locale === "FIL" ? "fil-PH" : "en-PH", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Manila" }).format(new Date(sale.confirmedAt ?? 0));
        return <div className="sale-row" key={sale.id}>
          <button className="sale-row-header" type="button" aria-expanded={open === sale.id} onClick={() => setOpen(open === sale.id ? null : sale.id)}>
            <span className="attn-icon info"><Icon name="bag" /></span>
            <span className="row-main">
              <span className="row-title">{sale.totalQuantity} {locale === "FIL" || sale.totalQuantity === 1 ? c.item : `${c.item}s`} · {productSummary}</span>
              <span className="row-meta">{date} · {c.recordedBy} {sale.createdBy.name ?? sale.createdBy.email}</span>
            </span>
            {sale.status === "CORRECTED" && <span className="badge badge-warning"><Icon name="alert" />{c.corrected}</span>}
            <span className="row-value">{money(sale.totalAmount)}</span>
            <Icon name="chevronDown" className={`icon sale-row-chevron${open === sale.id ? " is-open" : ""}`} />
          </button>
          {open === sale.id && <div className="sale-row-body">{sale.lines.map((line, index) => <div className="sale-row-line" key={index}><span>{line.productNameSnapshot} × {line.quantity}</span></div>)}<Link className="section-link sale-details-link" href={`/sales/${sale.id}`}>{c.details} →</Link></div>}
        </div>;
      })}</div>}
    {result.nextCursor && <div className="load-more-row"><button className="btn btn-secondary" disabled={busy} aria-busy={busy} onClick={() => load(range, result.nextCursor!)}>{busy ? <LoadingButtonContent message={loadingCopy(locale, "sales")}/> : c.load}</button></div>}
  </>;
}

function Stat({ value, label }: { value: string; label: string }) {
  return <div><div className="stat-row"><span className="stat-value">{value}</span></div><span className="stat-label">{label}</span></div>;
}
