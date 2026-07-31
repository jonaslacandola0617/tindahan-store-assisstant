import { getServerSession } from "next-auth";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { authOptions } from "@/modules/identity/infrastructure/auth-options";
import { getInventoryView, searchProducts } from "@/modules/inventory/application/inventory-service";
import { InventoryClient } from "./inventory-client";

export default async function InventoryPage() {
  const session = await getServerSession(authOptions); if (!session?.user.id) redirect("/sign-in");
  const [result, view] = await Promise.all([searchProducts(session.user.id, {}), getInventoryView(session.user.id)]);
  const locale = (await cookies()).get("tindahan-language")?.value === "FIL" ? "FIL" : "EN";
  return <InventoryClient initial={result} initialView={view} locale={locale}/>;
}
