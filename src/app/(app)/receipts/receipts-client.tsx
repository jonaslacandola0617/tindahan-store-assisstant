"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Icon } from "@/components/icon";
import { InlineLoading, LoadingButtonContent, SectionLoading } from "@/components/loading";
import { loadingCopy } from "@/modules/i18n/messages";

type ReceiptItem = { id:string; status:string; supplier:string|null; receiptDate:string|null; createdAt:string; confirmedAt:string|null; grandTotal:string|null; duplicateWarning:boolean; lineCount:number; attentionCount:number; totalQuantity:number; actor:string|null; reversed:boolean; rejected:boolean };
type Results = { items:ReceiptItem[]; nextCursor:string|null; counts:{all:number;attention:number;confirmed:number} };

const copy={EN:{title:"Receipts",subtitle:"Scan a receipt and Tindahan will prepare it for your review.",scan:"Scan receipt",all:"All",attention:"Needs your attention",confirmed:"Confirmed",ready:"Ready to review",processing:"Processing receipt",failed:"Needs attention",reversed:"Reversed",rejected:"Rejected",items:"items detected",added:"items added to stock",duplicate:"Possible duplicate",details:"View receipt details",empty:"No receipts yet",emptyBody:"Scan your first supplier receipt to prepare incoming stock.",load:"Load more",error:"We couldn't load receipts. Try again.",retry:"Try again"},FIL:{title:"Resibo",subtitle:"I-scan ang resibo at ihahanda ito ng Tindahan para sa iyong pagsusuri.",scan:"I-scan ang resibo",all:"Lahat",attention:"Kailangan ng pansin",confirmed:"Nakumpirma",ready:"Handa nang suriin",processing:"Inihahanda ang resibo",failed:"Kailangan ng pansin",reversed:"Binaligtad",rejected:"Tinanggihan",items:"item ang nakita",added:"item ang naidagdag sa stock",duplicate:"Posibleng na-upload na",details:"Tingnan ang detalye ng resibo",empty:"Wala pang resibo",emptyBody:"I-scan ang unang resibo ng supplier para maihanda ang bagong stock.",load:"Magpakita pa",error:"Hindi makuha ang mga resibo. Subukan ulit.",retry:"Subukan ulit"}} as const;

export function ReceiptsClient({locale,initial}:{locale:"EN"|"FIL";initial:Results}){
  const t=copy[locale];
  const [results,setResults]=useState(initial);
  const [filter,setFilter]=useState("all");
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState("");
  const [expanded,setExpanded]=useState<string|null>(null);

  const load=useCallback(async(nextFilter=filter,cursor?:string)=>{
    setLoading(true); setError("");
    try {
      const response=await fetch(`/api/receipts?status=${nextFilter}${cursor?`&cursor=${encodeURIComponent(cursor)}`:""}`);
      const body=await response.json() as Results&{error?:string};
      if(!response.ok)throw new Error(body.error);
      setResults(current=>cursor?{...body,items:[...current.items,...body.items]}:body);
    } catch { setError(t.error); }
    finally { setLoading(false); }
  },[filter,t.error]);

  const hasProcessing=results.items.some(item=>item.status==="QUEUED"||item.status==="PROCESSING");
  useEffect(()=>{if(!hasProcessing)return;const timer=setInterval(()=>void load(filter),5000);return()=>clearInterval(timer);},[filter,hasProcessing,load]);

  function choose(value:string){setFilter(value);void load(value);}
  const format=(value:string)=>new Intl.DateTimeFormat(locale==="FIL"?"fil-PH":"en-PH",{dateStyle:"medium",timeStyle:"short"}).format(new Date(value));
  const status=(item:ReceiptItem)=>item.status==="REVIEW_READY"?["badge-info",t.ready,"info"]:item.status==="FAILED"?["badge-warning",t.failed,"alert"]:item.status==="CONFIRMED"?["badge-success",t.confirmed,"check"]:item.status==="REVERSED"?["badge-neutral",t.reversed,"refresh"]:item.status==="REJECTED"?["badge-neutral",t.rejected,"xCircle"]:["badge-warning",t.processing,"loader"];
  const rowIcon=(item:ReceiptItem)=>item.status==="PROCESSING"||item.status==="QUEUED"?"loader":item.status==="FAILED"?"alert":item.status==="REVERSED"?"refresh":item.status==="REJECTED"?"xCircle":"receipt";

  return <>
    <div className="content-header"><div className="content-header-row"><div><h1>{t.title}</h1><p className="text-muted">{t.subtitle}</p></div><Link className="btn btn-primary" href="/receipts/new"><Icon name="camera"/>{t.scan}</Link></div></div>
    <div className="chip-row receipt-filter-row" role="group" aria-label={locale==="FIL"?"Salain ang resibo":"Filter receipts"}>{[["all",t.all,results.counts.all],["attention",t.attention,results.counts.attention],["confirmed",t.confirmed,results.counts.confirmed]].map(([key,label,count])=><button key={String(key)} className={`chip${filter===key?" active":""}`} aria-pressed={filter===key} onClick={()=>choose(String(key))}>{label} <span className="count">{count}</span></button>)}</div>
    {loading&&results.items.length===0?<SectionLoading message={loadingCopy(locale,"receipts")}/>:error?<div className="empty-state"><div className="empty-icon"><Icon name="alert"/></div><h3>{error}</h3><button className="btn btn-secondary" onClick={()=>load()}>{t.retry}</button></div>:results.items.length===0?<div className="empty-state"><div className="empty-icon receipt-empty-icon"><Icon name="receipt"/></div><h3>{t.empty}</h3><p className="empty-body">{t.emptyBody}</p><Link className="btn btn-secondary" href="/receipts/new">{t.scan}</Link></div>:<div aria-busy={loading}>{results.items.map(item=>{
      const s=status(item);
      const interactive=item.status==="CONFIRMED"||item.status==="REVERSED"||item.status==="REJECTED";
      const meta=interactive?`${item.totalQuantity} ${t.added} · ${format(item.confirmedAt??item.createdAt)}`:`${item.lineCount} ${t.items} · ${format(item.createdAt)}`;
      const icon=rowIcon(item);
      return <div className="sale-row" key={item.id}><button className="sale-row-header" type="button" aria-expanded={expanded===item.id} onClick={()=>interactive?setExpanded(value=>value===item.id?null:item.id):location.assign(`/receipts/${item.id}${item.status==="REVIEW_READY"?"/review":""}`)}><span className={`attn-icon ${item.status==="FAILED"?"warning":item.status==="CONFIRMED"?"success":"info"}`}><Icon name={icon as "loader"|"alert"|"refresh"|"receipt"|"xCircle"} className={`icon${icon==="loader"?" loading-icon-spin":""}`}/></span><span className="row-main"><span className="row-title">{item.supplier??(locale==="FIL"?"Resibo ng supplier":"Supplier receipt")}</span><span className="row-meta">{meta}</span>{item.duplicateWarning&&<span className="receipt-inline-warning"><Icon name="alert" className="icon icon-sm"/>{t.duplicate}</span>}</span><span className={`badge ${s[0]}`}><Icon name={s[2] as "info"|"alert"|"check"|"refresh"|"loader"|"xCircle"} className={`icon icon-sm${s[2]==="loader"?" loading-icon-spin":""}`}/>{s[1]}</span><Icon name={interactive?"chevronDown":"chevronRight"} className={`icon icon-sm sale-row-chevron${expanded===item.id?" is-open":""}`}/></button>{expanded===item.id&&<div className="sale-row-body"><div className="receipt-history-summary"><span>{item.lineCount} {t.items}</span>{item.grandTotal&&<strong>₱{Number(item.grandTotal).toFixed(2)}</strong>}</div><Link className="btn btn-secondary btn-sm" href={`/receipts/${item.id}`}>{t.details}</Link></div>}</div>;
    })}</div>}
    {results.nextCursor&&<div className="load-more-row"><button className="btn btn-secondary" disabled={loading} onClick={()=>load(filter,results.nextCursor!)}>{loading?<LoadingButtonContent message={loadingCopy(locale,"receipts")}/>:t.load}</button></div>}
    {loading&&results.items.length>0&&<p className="receipt-refresh-status"><InlineLoading message={loadingCopy(locale,"receipts")} size="compact"/></p>}
  </>;
}
