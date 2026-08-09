import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";
import { authOptions } from "@/modules/identity/infrastructure/auth-options";
import { getBillingStatement } from "@/modules/saas/application/billing-service";
import { StatementPrintButton } from "./statement-print-button";

export const metadata = { title: "Billing statement" };
export default async function StatementPage({ params }: { params: Promise<{ statementId: string }> }) {
  const session = await getServerSession(authOptions); if (!session?.user.id) redirect("/sign-in");
  let statement: Awaited<ReturnType<typeof getBillingStatement>>; try { statement = await getBillingStatement(session.user.id, (await params).statementId); } catch { notFound(); }
  const items = Array.isArray(statement.lineItems) ? statement.lineItems as { description?: string; quantity?: number; amount?: number }[] : [];
  return <div className="billing-statement card"><div className="billing-statement-head"><div><p className="eyebrow">Billing statement</p><h1>{statement.statementNumber}</h1><p className="text-muted">TINDAHAN subscription record — not an official tax invoice.</p></div><StatementPrintButton/></div><div className="billing-statement-grid"><div><span className="row-meta">Billed to</span><strong>{statement.store.name}</strong><span>{statement.store.address || "Address not provided"}</span></div><div><span className="row-meta">Date</span><strong>{statement.createdAt.toLocaleDateString("en-PH", { dateStyle: "long" })}</strong><span>{statement.paymentStatus === "PAID" ? "Paid" : statement.paymentStatus}</span></div></div><div className="billing-statement-lines">{items.map((item, index) => <div key={index} className="billing-statement-line"><span>{item.description || "Subscription"}</span><strong>{new Intl.NumberFormat("en-PH", { style: "currency", currency: statement.currency }).format(item.amount ?? 0)}</strong></div>)}</div><div className="billing-statement-totals"><span>Subtotal <strong>₱{statement.subtotal}</strong></span><span>Tax <strong>₱{statement.tax}</strong></span><span className="billing-total">Total <strong>₱{statement.total}</strong></span></div><p className="text-sm text-muted">Payment reference: {statement.providerReference || "Not available"}</p></div>;
}
