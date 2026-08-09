import { notFound } from "next/navigation";
import { Icon, type IconName } from "@/components/icon";

const modules: Record<string, { title: string; message: string; icon: IconName }> = {
  inventory: { title: "Inventory", message: "Product and stock workflows arrive in Phase 2.", icon: "package" },
  sales: { title: "Sales", message: "Atomic sale recording arrives in Phase 2.", icon: "bag" },
  receipts: { title: "Receipts", message: "Receipt intake and review arrive in Phase 3.", icon: "receipt" },
  reports: { title: "Reports", message: "Operational reporting arrives in Phase 6.", icon: "chart" },
  settings: { title: "Settings", message: "Store preferences are ready; expanded settings arrive with each module.", icon: "sliders" },
  search: { title: "Search", message: "Global product and supplier search arrives in Phase 2.", icon: "search" },
  notifications: { title: "Notifications", message: "The notification boundary is modeled and will activate with operational events.", icon: "bell" },
  "receipt-upload": { title: "Scan receipt", message: "Private upload and OCR processing arrive in Phase 3.", icon: "camera" },
};

export default async function ModulePage({ params }: { params: Promise<{ module: string }> }) {
  const { module } = await params; const item = modules[module]; if (!item) notFound();
  return <div className="placeholder-page"><div><div className="empty-icon"><Icon name={item.icon}/></div><h1>{item.title}</h1><p className="text-muted" style={{ marginTop: "var(--space-2)" }}>{item.message}</p></div></div>;
}
