"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/icon";
import { AppToast } from "@/components/app-toast";
import { CategoryCombobox } from "@/components/category-combobox";
import { InlineLoading, LoadingButtonContent, SectionLoading } from "@/components/loading";
import { loadingCopy } from "@/modules/i18n/messages";
import { BarcodeCameraDialog } from "@/modules/barcodes/presentation/barcode-camera-dialog";

type Item = {
  id: string;
  name: string;
  sellingUnit: string;
  sellingPrice: string;
  quantity: number;
  lowStockThreshold: number;
  stockStatus: "in_stock" | "low_stock" | "out_of_stock";
  category: { name: string } | null;
  supplier: string | null;
  hasBarcode: boolean;
};
type Results = { items: Item[]; counts: { all: number; low: number; out: number; recent: number; categories: number }; nextCursor: string | null };

const units = ["PIECE", "PACK", "SACHET", "BOTTLE", "CAN", "BOX", "DOZEN", "GRAM", "KILOGRAM", "MILLILITER", "LITER", "SACK", "CASE", "TRAY", "OTHER"] as const;
const unitNames: Record<(typeof units)[number], { EN: string; FIL: string }> = {
  PIECE: { EN: "Piece", FIL: "Piraso" }, PACK: { EN: "Pack", FIL: "Pakete" }, SACHET: { EN: "Sachet / Tingi", FIL: "Sachet / Tingi" },
  BOTTLE: { EN: "Bottle", FIL: "Bote" }, CAN: { EN: "Can", FIL: "Lata" }, BOX: { EN: "Box", FIL: "Kahon" }, DOZEN: { EN: "Dozen", FIL: "Dosena" },
  GRAM: { EN: "Gram", FIL: "Gramo" }, KILOGRAM: { EN: "Kilogram", FIL: "Kilo" }, MILLILITER: { EN: "Milliliter", FIL: "Mililitro" },
  LITER: { EN: "Liter", FIL: "Litro" }, SACK: { EN: "Sack / Sako", FIL: "Sako" }, CASE: { EN: "Case", FIL: "Kaha" }, TRAY: { EN: "Tray", FIL: "Tray" }, OTHER: { EN: "Other", FIL: "Iba pa" },
};

const copy = {
  EN: {
    productsAcross: "products across", productAcross: "product across", categories: "categories", category: "category", add: "Add product", addTitle: "Add a product", addSubtitle: "You can edit this anytime.",
    all: "All", low: "Low Stock", out: "Out of Stock", recent: "Recently Updated", search: "Search products by name, barcode, category, or supplier", list: "List view", grid: "Grid view",
    inStock: "In stock", lowStock: "Low stock", outStock: "Out of stock", noMatch: "No products match", noMatchBody: "Try a different search or clear the current filter.", clear: "Clear search and filters",
    empty: "No products yet", emptyBody: "Add your first product to start tracking stock.", loading: "Loading products…", error: "We couldn't load inventory. Try again.", retry: "Try again",
    name: "Product name", namePlaceholder: "e.g. Powdered Milk, 33g", categoryLabel: "Category", supplier: "Supplier", description: "Description (optional)", soldBy: "Sold by", otherUnit: "How do you sell it?",
    otherHint: "We'll keep your wording for now and help standardize it later.", barcodeOption: "Add a barcode option", identify: "How should this product be identified?", scanEnter: "Scan or enter",
    packageBarcode: "Use the barcode on the package", generate: "Generate barcode", tingi: "Best for tingi items", none: "No barcode", without: "Continue without one", manufacturer: "Manufacturer barcode", scan: "Scan", scanned: "Barcode scanned and ready.",
    price: "Price", cost: "Purchase cost (optional)", starting: "Starting quantity", threshold: "Low-stock threshold", more: "More details", less: "Hide extra details", cancel: "Cancel", close: "Close", save: "Add product",
    added: "Product added.", barcodeSaved: "Barcode saved", loadMore: "Load more",
  },
  FIL: {
    productsAcross: "produkto sa", productAcross: "produkto sa", categories: "kategorya", category: "kategorya", add: "Magdagdag ng produkto", addTitle: "Magdagdag ng produkto", addSubtitle: "Puwede mo itong baguhin anumang oras.",
    all: "Lahat", low: "Paubos na", out: "Ubos na", recent: "Kamakailang Binago", search: "Maghanap ayon sa pangalan, barcode, kategorya, o supplier", list: "Listahan", grid: "Grid",
    inStock: "May stock", lowStock: "Paubos na", outStock: "Ubos na", noMatch: "Walang tugmang produkto", noMatchBody: "Subukan ang ibang search o alisin ang kasalukuyang filter.", clear: "Alisin ang search at filter",
    empty: "Wala pang produkto", emptyBody: "Idagdag ang unang produkto para masimulang subaybayan ang stock.", loading: "Kinukuha ang mga produkto…", error: "Hindi makuha ang imbentaryo. Subukan ulit.", retry: "Subukan ulit",
    name: "Pangalan ng produkto", namePlaceholder: "hal. Powdered Milk, 33g", categoryLabel: "Kategorya", supplier: "Supplier", description: "Paglalarawan (opsyonal)", soldBy: "Ibinebenta bilang", otherUnit: "Paano ito ibinebenta?",
    otherHint: "Itatabi muna namin ang tawag mo at aayusin ito sa susunod.", barcodeOption: "Magdagdag ng opsyon sa barcode", identify: "Paano kikilalanin ang produktong ito?", scanEnter: "I-scan o ilagay",
    packageBarcode: "Gamitin ang barcode sa pakete", generate: "Gumawa ng barcode", tingi: "Para sa tingi na produkto", none: "Walang barcode", without: "Magpatuloy nang wala nito", manufacturer: "Barcode ng gumawa", scan: "I-scan", scanned: "Nabasa na ang barcode.",
    price: "Presyo", cost: "Halaga ng bili (opsyonal)", starting: "Panimulang dami", threshold: "Bilang bago matawag na paubos", more: "Iba pang detalye", less: "Itago ang ibang detalye", cancel: "Kanselahin", close: "Isara", save: "Idagdag",
    added: "Naidagdag ang produkto.", barcodeSaved: "May barcode", loadMore: "Magpakita pa",
  },
} as const;

export function InventoryClient({ initial, initialView, locale }: { initial: Results; initialView: "LIST" | "GRID"; locale: "EN" | "FIL" }) {
  const t = copy[locale];
  const router = useRouter();
  const [results, setResults] = useState(initial);
  const [view, setView] = useState(initialView);
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [formError, setFormError] = useState("");
  const [modal, setModal] = useState(false);
  const [barcodeOpen, setBarcodeOpen] = useState(false);
  const [barcodeChoice, setBarcodeChoice] = useState<"NONE" | "MANUFACTURER" | "INTERNAL">("NONE");
  const [barcodeScanner, setBarcodeScanner] = useState(false);
  const [manufacturerBarcode, setManufacturerBarcode] = useState("");
  const [barcodeNotice, setBarcodeNotice] = useState("");
  const [moreDetails, setMoreDetails] = useState(false);
  const [other, setOther] = useState(false);
  const [notice, setNotice] = useState("");
  const dialog = useRef<HTMLDivElement>(null);
  const closeBarcodeScanner = useCallback(() => setBarcodeScanner(false), []);
  const acceptScannedBarcode = useCallback((code: string) => { setManufacturerBarcode(code); setBarcodeNotice(copy[locale].scanned); setBarcodeScanner(false); }, [locale]);

  const unitLabel = (unit: string) => unitNames[unit as keyof typeof unitNames]?.[locale] ?? unit.toLowerCase();
  const resultLabel = locale === "FIL" ? "produkto" : results.items.length === 1 ? "product" : "products";
  const summaryProduct = results.counts.all === 1 ? t.productAcross : t.productsAcross;
  const summaryCategory = results.counts.categories === 1 ? t.category : t.categories;

  async function load(q = query, f = filter, cursor?: string) {
    setLoading(true); setLoadError("");
    try {
      const response = await fetch(`/api/inventory/products?q=${encodeURIComponent(q)}&filter=${f}${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`);
      if (!response.ok) throw new Error();
      const next = await response.json() as Results;
      setResults(current => cursor ? { ...next, items: [...current.items, ...next.items] } : next);
    } catch { setLoadError(t.error); } finally { setLoading(false); }
  }

  // The timer intentionally keys only on query/filter state; load reads both values.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { const timer = setTimeout(() => void load(query, filter), 300); return () => clearTimeout(timer); }, [query, filter]);
  useEffect(() => {
    if (!modal) return;
    const previous = document.activeElement as HTMLElement | null;
    dialog.current?.querySelector<HTMLElement>("input")?.focus();
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !barcodeScanner) setModal(false);
      if (event.key === "Tab" && dialog.current) {
        const focus = [...dialog.current.querySelectorAll<HTMLElement>("button,input,select,textarea")].filter(element => !element.hasAttribute("disabled"));
        const first = focus[0], last = focus.at(-1);
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    };
    document.addEventListener("keydown", key);
    return () => { document.removeEventListener("keydown", key); previous?.focus(); };
  }, [barcodeScanner, modal]);

  function closeModal() { setBarcodeScanner(false); setModal(false); setFormError(""); setBarcodeNotice(""); }
  async function changeView(next: "LIST" | "GRID") { setView(next); await fetch("/api/inventory/view", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ view: next }) }); }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true); setFormError("");
    try {
      const form = new FormData(event.currentTarget); const payload = Object.fromEntries(form);
      const response = await fetch("/api/inventory/products", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...payload, barcodeChoice, idempotencyKey: crypto.randomUUID(), sellingPrice: Number(payload.sellingPrice), latestPurchaseCost: payload.latestPurchaseCost ? Number(payload.latestPurchaseCost) : null, startingQuantity: Number(payload.startingQuantity), lowStockThreshold: Number(payload.lowStockThreshold ?? 0) }) });
      const body = await response.json() as { error?: string };
      if (!response.ok) { setFormError(body.error ?? t.error); return; }
      closeModal(); setNotice(t.added); await load(); router.refresh();
    } catch { setFormError(t.error); } finally { setSubmitting(false); }
  }
  const status = (item: Item) => item.stockStatus === "out_of_stock" ? ["badge-danger", t.outStock, "x"] : item.stockStatus === "low_stock" ? ["badge-warning", t.lowStock, "alert"] : ["badge-success", t.inStock, "check"];

  return <>
    <div className="content-header"><div className="content-header-row"><div><h1>{locale === "FIL" ? "Imbentaryo" : "Inventory"}</h1><p className="text-muted">{results.counts.all} {summaryProduct} {results.counts.categories} {summaryCategory}</p></div><button className="btn btn-primary" onClick={() => setModal(true)}><Icon name="plus"/>{t.add}</button></div></div>
    <div className="section-header" style={{ marginBottom: "var(--space-4)" }}><div className="chip-row" role="group" aria-label={locale === "FIL" ? "Salain ang imbentaryo" : "Filter inventory"}>{[["all", t.all, results.counts.all], ["low", t.low, results.counts.low], ["out", t.out, results.counts.out], ["recent", t.recent, results.counts.recent]].map(([key, label, count]) => <button key={String(key)} type="button" className={`chip${filter === key ? " active" : ""}`} aria-pressed={filter === key} onClick={() => setFilter(String(key))}>{label} <span className="count">{count}</span></button>)}</div></div>
    <div className="input-group inventory-search"><Icon name="search"/><input className="input" value={query} onChange={event => setQuery(event.target.value)} placeholder={t.search} aria-label={t.search}/></div>
    <div className="inventory-results-bar"><p className="text-sm text-muted" role="status" aria-live="polite">{loading ? <InlineLoading message={loadingCopy(locale, "products")} size="compact" announce={false}/> : `${results.items.length} ${resultLabel}`}</p><div className="segmented view-toggle" role="group" aria-label={locale === "FIL" ? "Ayos ng imbentaryo" : "Inventory view"}><button className={view === "LIST" ? "active" : ""} aria-pressed={view === "LIST"} onClick={() => changeView("LIST")}><Icon name="list" className="icon icon-sm"/>{t.list}</button><button className={view === "GRID" ? "active" : ""} aria-pressed={view === "GRID"} onClick={() => changeView("GRID")}><Icon name="grid" className="icon icon-sm"/>{t.grid}</button></div></div>

    {loading && results.items.length === 0 ? <SectionLoading message={loadingCopy(locale, "products")}/>
      : loadError ? <div className="empty-state"><div className="empty-icon"><Icon name="alert"/></div><h3>{loadError}</h3><button className="btn btn-secondary" onClick={() => load()}>{t.retry}</button></div>
      : results.items.length === 0 ? <div className="empty-state"><div className="empty-icon"><Icon name="package"/></div><h3>{query || filter !== "all" ? t.noMatch : t.empty}</h3><p className="empty-body">{query || filter !== "all" ? t.noMatchBody : t.emptyBody}</p>{query || filter !== "all" ? <button className="btn btn-secondary" onClick={() => { setQuery(""); setFilter("all"); }}>{t.clear}</button> : <button className="btn btn-secondary" onClick={() => setModal(true)}>{t.add}</button>}</div>
      : view === "LIST" ? <div className="row-list">{results.items.map(item => { const s = status(item); return <Link className="row-item is-interactive" href={`/inventory/${item.id}`} key={item.id}><span className="product-thumb"><Icon name="bag"/></span><span className="row-main"><span className="row-title">{item.name}</span><span className="row-meta">{item.category?.name ?? (locale === "FIL" ? "Walang kategorya" : "Uncategorized")}{item.supplier ? ` · ${item.supplier}` : ""}</span></span><span className={`badge ${s[0]}`}><Icon name={s[2] as "check" | "alert" | "x"} className="icon icon-sm"/>{s[1]}</span><span className="row-value">{item.quantity} <span className="text-muted text-sm font-medium">{unitLabel(item.sellingUnit)}</span></span></Link>; })}</div>
      : <div className="inventory-grid">{results.items.map(item => { const s = status(item); return <Link className="inventory-card" href={`/inventory/${item.id}`} key={item.id}><div className="inventory-card-header"><span className="inventory-card-thumb"><Icon name="package"/></span><span className={`badge ${s[0]}`}><Icon name={s[2] as "check" | "alert" | "x"} className="icon icon-sm"/>{s[1]}</span></div><div className="inventory-card-copy"><span className="inventory-card-name">{item.name}</span><span className="inventory-card-category">{item.category?.name ?? (locale === "FIL" ? "Walang kategorya" : "Uncategorized")}</span></div><div className="inventory-card-stock"><span><strong>{item.quantity}</strong> {unitLabel(item.sellingUnit)}</span><strong>₱{Number(item.sellingPrice).toFixed(2)}</strong></div>{item.hasBarcode && <div className="inventory-card-footer"><span className="inventory-card-barcode"><Icon name="tag" className="icon icon-sm"/>{t.barcodeSaved}</span></div>}</Link>; })}</div>}
    {results.nextCursor && <div className="load-more-row"><button className="btn btn-secondary" disabled={loading} aria-busy={loading} onClick={() => load(query, filter, results.nextCursor!)}>{loading ? <LoadingButtonContent message={loadingCopy(locale, "products")}/> : t.loadMore}</button></div>}
    <AppToast message={notice} locale={locale} onDismiss={() => setNotice("")} />

    {modal && <><div className="overlay-scrim is-open" onClick={closeModal}/><div className="modal inventory-product-modal is-open" role="dialog" aria-modal={!barcodeScanner} aria-hidden={barcodeScanner || undefined} aria-labelledby="add-title"><div className="modal-card" ref={dialog}>
      <div className="modal-header"><div><h3 id="add-title">{t.addTitle}</h3><p className="card-subtitle">{t.addSubtitle}</p></div><button className="btn-icon btn-ghost" type="button" aria-label={t.close} onClick={closeModal}><Icon name="x"/></button></div>
      <form onSubmit={submit} className="modal-form">
        <div className="field"><label className="field-label" htmlFor="p-name">{t.name}</label><input className="input" id="p-name" name="name" placeholder={t.namePlaceholder} required maxLength={160}/></div>
        <div className="grid-2 compact-grid"><CategoryCombobox id="p-cat" label={t.categoryLabel} locale={locale}/><div className="field"><label className="field-label" htmlFor="p-unit">{t.soldBy}</label><div className="select-wrap"><select className="select" id="p-unit" name="sellingUnit" required onChange={event => setOther(event.target.value === "OTHER")}>{units.map(unit => <option value={unit} key={unit}>{unitNames[unit][locale]}</option>)}</select><Icon name="chevronDown"/></div></div></div>
        {other && <div className="field"><label className="field-label" htmlFor="p-other">{t.otherUnit}</label><input className="input" id="p-other" name="otherUnitRaw" required/><p className="field-hint">{t.otherHint}</p></div>}
        <button type="button" className="btn btn-soft" aria-expanded={barcodeOpen} onClick={() => setBarcodeOpen(!barcodeOpen)}><Icon name="tag"/>{t.barcodeOption}</button>
        {barcodeOpen && <section className="barcode-panel"><p className="field-label">{t.identify}</p><div className="barcode-choice-grid">{([["MANUFACTURER", t.scanEnter, t.packageBarcode], ["INTERNAL", t.generate, t.tingi], ["NONE", t.none, t.without]] as const).map(([value, title, body]) => <label className="barcode-choice" key={value}><input type="radio" name="choice" checked={barcodeChoice === value} onChange={() => setBarcodeChoice(value)}/><span><strong>{title}</strong><br/><span className="text-sm text-muted">{body}</span></span></label>)}</div>{barcodeChoice === "MANUFACTURER" && <div className="field"><label className="field-label" htmlFor="p-barcode">{t.manufacturer}</label><div className="scanner-input-row"><input className="input" id="p-barcode" name="manufacturerBarcode" inputMode="numeric" pattern="[0-9 -]{8,20}" value={manufacturerBarcode} onChange={event => { setManufacturerBarcode(event.target.value); setBarcodeNotice(""); }} required/><button className="btn btn-secondary" type="button" onClick={() => setBarcodeScanner(true)}><Icon name="camera"/>{t.scan}</button></div>{barcodeNotice && <p className="field-hint" role="status">{barcodeNotice}</p>}</div>}</section>}
        <div className="grid-2 compact-grid"><div className="field"><label className="field-label" htmlFor="p-price">{t.price}</label><input className="input" id="p-price" name="sellingPrice" type="number" placeholder="0.00" min="0" step="0.01" required/></div><div className="field"><label className="field-label" htmlFor="p-qty">{t.starting}</label><input className="input" id="p-qty" name="startingQuantity" type="number" placeholder="0" min="0" step="1" defaultValue="0" required/></div></div>
        <button type="button" className="secondary-disclosure" aria-expanded={moreDetails} onClick={() => setMoreDetails(!moreDetails)}><Icon name="chevronDown" className={`icon icon-sm${moreDetails ? " is-rotated" : ""}`}/>{moreDetails ? t.less : t.more}</button>
        {moreDetails && <div className="secondary-fields"><div className="field"><label className="field-label" htmlFor="p-description">{t.description}</label><textarea className="textarea" id="p-description" name="description" maxLength={1000}/></div><div className="field"><label className="field-label" htmlFor="p-supplier">{t.supplier}</label><input className="input" id="p-supplier" name="supplier"/></div><div className="grid-2 compact-grid"><div className="field"><label className="field-label" htmlFor="p-cost">{t.cost}</label><input className="input" id="p-cost" name="latestPurchaseCost" type="number" min="0" step="0.01"/></div><div className="field"><label className="field-label" htmlFor="p-threshold">{t.threshold}</label><input className="input" id="p-threshold" name="lowStockThreshold" type="number" min="0" step="1" defaultValue="0" required/></div></div></div>}
        {formError && <p className="field-error" role="alert">{formError}</p>}
        <div className="modal-actions"><button type="button" className="btn btn-secondary" onClick={closeModal} disabled={submitting}>{t.cancel}</button><button className="btn btn-primary" type="submit" disabled={submitting} aria-busy={submitting}>{submitting ? <LoadingButtonContent message={loadingCopy(locale, "addingProduct")}/> : t.save}</button></div>
      </form>
    </div></div></>}
    <BarcodeCameraDialog open={barcodeScanner} locale={locale} onClose={closeBarcodeScanner} onDetected={acceptScannedBarcode}/>
  </>;
}
