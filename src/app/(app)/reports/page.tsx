import Link from "next/link";
import { cookies } from "next/headers";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { Icon } from "@/components/icon";
import { authOptions } from "@/modules/identity/infrastructure/auth-options";
import { getOperatingReport } from "@/modules/operating-view/application/operating-view-service";

export const metadata = { title: "Reports" };
export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const session = await getServerSession(authOptions); if (!session?.user.id) redirect("/sign-in");
  const params = await searchParams;
  const range = params.range === "week" ? "week" : "month";
  const [report, cookieStore] = await Promise.all([getOperatingReport(session.user.id, range), cookies()]);
  const fil = cookieStore.get("tindahan-language")?.value === "FIL";
  return <>
    <div className="content-header">
      <div className="content-header-row">
        <div><h1>{fil ? "Ulat" : "Reports"}</h1><p className="text-muted">{fil ? "Praktikal na sagot tungkol sa iyong tindahan — hindi dashboard na aaralin." : "Practical answers about your store — not a dashboard to study."}</p></div>
        <div className="report-header-actions">
          <div className="segmented" role="group" aria-label={fil ? "Saklaw ng panahon" : "Time range"}>
            <Link className={range === "week" ? "active" : ""} href="/reports?range=week">{fil ? "Ngayong linggo" : "This week"}</Link>
            <Link className={range === "month" ? "active" : ""} href="/reports?range=month">{fil ? "Ngayong buwan" : "This month"}</Link>
          </div>
          <a className="btn btn-secondary" href={`/api/reports/export?range=${range}`}><Icon name="download" />{fil ? "I-download" : "Download"}</a>
        </div>
      </div>
    </div>
    <div className="grid-2 report-grid">
      <section className="card card-pad">
        <div className="card-header"><div><h2 className="card-title">{fil ? "Ano ang pinakamabenta" : "What sold the most"}</h2><p className="card-subtitle">{fil ? "Top 5 na produkto ayon sa dami ng nabenta" : "Top 5 products by quantity sold"}</p></div></div>
        {report.topProducts.length ? <div className="report-ranking">{report.topProducts.map(product => <div className="report-rank-row" key={product.productId}><span title={product.name}>{product.name}</span><div className="progress-track"><div className="progress-fill" style={{ width: `${product.share}%` }} /></div><strong className="tabular-nums">{product.quantity}</strong></div>)}</div> : <ReportEmpty icon="chart" title={fil ? "Wala pang benta" : "No sales yet"} body={fil ? "Lalabas dito ang pinakamabentang produkto pagkatapos ng unang benta." : "Top-selling products will appear here after your first sale."} />}
      </section>
      <section className="card card-pad">
        <div className="card-header"><div><h2 className="card-title">{fil ? "Paubos na" : "Running low"}</h2><p className="card-subtitle">{fil ? "Mga produktong malapit nang maabot ang paalala" : "Products closest to their reminder point"}</p></div></div>
        {report.lowStock.length ? <div className="row-list">{report.lowStock.map(product => <Link className="row-item is-interactive" href={`/inventory/${product.id}`} key={product.id}><span className="product-thumb"><Icon name="bag" /></span><span className="row-main"><span className="row-title">{product.name}</span><span className="row-meta">{product.quantity} {product.unit} {fil ? "natitira · paalala sa" : "left · reminder at"} {product.threshold}</span></span><span className={`badge ${product.status === "out" ? "badge-danger" : "badge-warning"}`}>{product.status === "out" ? (fil ? "Ubos" : "Out") : (fil ? "Paubos" : "Low")}</span></Link>)}</div> : <ReportEmpty icon="check" title={fil ? "Maayos ang stock" : "Stock looks good"} body={fil ? "Walang produktong umabot sa paalala ngayon." : "No products are at their reminder point right now."} />}
      </section>
      <section className="card card-pad">
        <div className="card-header"><div><h2 className="card-title">{fil ? "Ano ang nagbago" : "What changed"}</h2><p className="card-subtitle">{fil ? "Galaw ng imbentaryo sa napiling panahon" : "Inventory movement during this period"}</p></div></div>
        {report.availability.movements === "available" ? <dl className="report-movement-list">
          <div><dt>{fil ? "Idinagdag mula sa resibo" : "Added from receipts"}</dt><dd className="positive">+{report.movementSummary.received}</dd></div>
          {report.movementSummary.manualAdded !== 0 && <div><dt>{fil ? "Manwal na idinagdag" : "Added manually"}</dt><dd className="positive">+{report.movementSummary.manualAdded}</dd></div>}
          <div><dt>{fil ? "Nabenta" : "Sold"}</dt><dd>−{report.movementSummary.sold}</dd></div>
          <div><dt>{fil ? "Manwal na pagwawasto" : "Manual corrections"}</dt><dd>{report.movementSummary.adjustments > 0 ? "+" : ""}{report.movementSummary.adjustments}</dd></div>
          {(report.movementSummary.opening !== 0 || report.movementSummary.reversals !== 0) && <div className="report-net"><dt>{fil ? "Kabuuang pagbabago" : "Net stock movement"}</dt><dd>{report.movementSummary.net > 0 ? "+" : ""}{report.movementSummary.net}</dd></div>}
        </dl> : <ReportEmpty icon="package" title={fil ? "Wala pang galaw" : "No stock movement yet"} body={fil ? "Lalabas dito ang natanggap, nabenta, at itinamang stock." : "Received, sold, and corrected stock will appear here."} />}
      </section>
      <section className="card card-pad">
        <div className="card-header"><div><h2 className="card-title">{fil ? "Hindi gumagalaw kamakailan" : "Hasn't moved recently"}</h2><p className="card-subtitle">{fil ? "Mga produktong maaaring kailangan ng pansin" : "Products that may need your attention"}</p></div></div>
        {report.inactive.length ? <div className="row-list">{report.inactive.map(product => <Link className="row-item is-interactive" href={`/inventory/${product.id}`} key={product.id}><span className="product-thumb"><Icon name="package" /></span><span className="row-main"><span className="row-title">{product.name}</span><span className="row-meta">{product.lastSoldAt ? (fil ? "Matagal nang walang benta" : "No recent sales") : (fil ? "Wala pang naitalang benta" : "No recorded sales yet")}</span></span><span className="row-value">{product.quantity} {product.unit}</span></Link>)}</div> : <ReportEmpty icon="check" title={fil ? "May galaw ang mga produkto" : "Products are moving"} body={fil ? "Walang produktong nangangailangan ng pansin sa panahong ito." : "No products need attention for inactivity in this period."} />}
      </section>
    </div>
    <p className="report-footnote">{fil ? "Batay ang ulat sa nakumpirmang benta at naitalang galaw ng stock." : "This report uses confirmed sales and recorded stock movements."}</p>
  </>;
}

function ReportEmpty({ icon, title, body }: { icon: "chart" | "check" | "package"; title: string; body: string }) {
  return <div className="report-empty"><span className="empty-icon"><Icon name={icon} /></span><div><h3>{title}</h3><p>{body}</p></div></div>;
}
