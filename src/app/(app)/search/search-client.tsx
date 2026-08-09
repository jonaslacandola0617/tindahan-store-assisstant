"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/icon";

type Result = {
  query: string;
  count: number;
  products: Array<{ id: string; name: string; category: string | null; quantity: number; unit: string; barcode: string | null }>;
  categories: Array<{ id: string; name: string; productCount: number }>;
  suppliers: Array<{ id: string; name: string; productCount: number }>;
  receipts: Array<{ id: string; supplier: string; status: string; createdAt: string }>;
};
const empty: Result = { query: "", count: 0, products: [], categories: [], suppliers: [], receipts: [] };

export function SearchClient({ categories, locale }: { categories: Array<{ id: string; name: string; productCount: number }>; locale: "EN" | "FIL" }) {
  const fil = locale === "FIL";
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<Result>(empty);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const key = (event: KeyboardEvent) => { if (event.key === "/" && document.activeElement?.tagName !== "INPUT") { event.preventDefault(); inputRef.current?.focus(); } };
    window.addEventListener("keydown", key); return () => window.removeEventListener("keydown", key);
  }, []);
  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true); setError("");
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}`, { signal: controller.signal });
        const data = await response.json() as Result & { error?: string };
        if (!response.ok) throw new Error(data.error || "Search failed");
        setResult(data);
      } catch (caught) {
        if ((caught as Error).name !== "AbortError") setError(fil ? "Hindi ma-load ang mga resulta. Subukan muli." : "We couldn't load the results. Try again.");
      } finally { if (!controller.signal.aborted) setLoading(false); }
    }, 250);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [query, fil]);
  function changeQuery(value: string) {
    setQuery(value);
    if (!value.trim()) { setResult(empty); setLoading(false); setError(""); }
  }
  const hasQuery = query.trim().length > 0;
  return <>
    <div className="content-header search-page-header"><h1>{fil ? "Maghanap" : "Search"}</h1><p className="text-muted">{fil ? "Hanapin ang produkto, kategorya, supplier, o resibo." : "Find a product, category, supplier, or receipt."}</p></div>
    <div className="input-group global-search-input"><Icon name="search" className="icon icon-lg" /><input ref={inputRef} className="input" value={query} onChange={event => changeQuery(event.target.value)} placeholder={fil ? "Subukan ang “gatas” o barcode" : "Try “milk” or scan a barcode"} aria-label={fil ? "Maghanap" : "Search your store"} /><span className="kbd">/</span></div>
    <div className="chip-row search-category-chips">{categories.map(category => <button type="button" className="chip" key={category.id} onClick={() => changeQuery(category.name)}>{category.name}</button>)}</div>
    {!hasQuery && <div className="search-prompt card"><span className="empty-icon"><Icon name="search" /></span><div><h2>{fil ? "Ano ang hinahanap mo?" : "What are you looking for?"}</h2><p>{fil ? "Mag-type ng pangalan, kategorya, supplier, o barcode." : "Type a name, category, supplier, or barcode."}</p></div></div>}
    {loading && <div className="section-loading section-loading-compact"><span className="inline-loading"><Icon name="loader" className="loading-icon loading-icon-standard" />{fil ? "Naghahanap…" : "Searching…"}</span></div>}
    {error && <div className="form-alert" role="alert">{error}</div>}
    {!loading && !error && hasQuery && <>
      <p className="text-sm text-muted search-count">{result.count} {fil ? "resulta" : result.count === 1 ? "result" : "results"}</p>
      {result.count === 0 ? <div className="empty-state"><span className="empty-icon"><Icon name="search" /></span><h2 className="empty-title">{fil ? "Walang nahanap" : "Nothing found"}</h2><p className="empty-body">{fil ? "Subukan ang ibang salita o tingnan kung tama ang barcode." : "Try a different word or check the barcode."}</p></div> : <div className="search-result-groups">
        {result.products.length > 0 && <SearchGroup title={fil ? "Mga produkto" : "Products"}>{result.products.map(product => <Link className="row-item is-interactive" href={`/inventory/${product.id}`} key={product.id}><span className="product-thumb"><Icon name="package" /></span><span className="row-main"><span className="row-title">{product.name}</span><span className="row-meta">{product.category || (fil ? "Walang kategorya" : "Uncategorized")}{product.barcode ? ` · ${product.barcode}` : ""}</span></span><span className="row-value">{product.quantity} {product.unit}</span></Link>)}</SearchGroup>}
        {result.categories.length > 0 && <SearchGroup title={fil ? "Mga kategorya" : "Categories"}>{result.categories.map(category => <Link className="row-item is-interactive" href={`/inventory?query=${encodeURIComponent(category.name)}`} key={category.id}><span className="product-thumb"><Icon name="tag" /></span><span className="row-main"><span className="row-title">{category.name}</span><span className="row-meta">{category.productCount} {fil ? "produkto" : category.productCount === 1 ? "product" : "products"}</span></span><Icon name="chevronRight" /></Link>)}</SearchGroup>}
        {result.suppliers.length > 0 && <SearchGroup title={fil ? "Mga supplier" : "Suppliers"}>{result.suppliers.map(supplier => <Link className="row-item is-interactive" href={`/inventory?query=${encodeURIComponent(supplier.name)}`} key={supplier.id}><span className="product-thumb"><Icon name="truck" /></span><span className="row-main"><span className="row-title">{supplier.name}</span><span className="row-meta">{supplier.productCount} {fil ? "kaugnay na produkto" : "linked products"}</span></span><Icon name="chevronRight" /></Link>)}</SearchGroup>}
        {result.receipts.length > 0 && <SearchGroup title={fil ? "Mga resibo" : "Receipts"}>{result.receipts.map(receipt => <Link className="row-item is-interactive" href={receipt.status === "REVIEW_READY" ? `/receipts/${receipt.id}/review` : `/receipts/${receipt.id}`} key={receipt.id}><span className="product-thumb"><Icon name="receipt" /></span><span className="row-main"><span className="row-title">{receipt.supplier}</span><span className="row-meta">{new Intl.DateTimeFormat(fil ? "fil-PH" : "en-PH", { dateStyle: "medium" }).format(new Date(receipt.createdAt))}</span></span><Icon name="chevronRight" /></Link>)}</SearchGroup>}
      </div>}
    </>}
  </>;
}

function SearchGroup({ title, children }: { title: string; children: React.ReactNode }) { return <section className="search-result-group"><h2>{title}</h2><div className="row-list">{children}</div></section>; }
