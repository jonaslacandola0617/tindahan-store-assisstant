import { cookies } from "next/headers";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { authOptions } from "@/modules/identity/infrastructure/auth-options";
import { resolveStoreContext } from "@/modules/stores/application/store-context";
import { serverEnvironment } from "@/platform/environment/server";
import { searchProducts } from "@/modules/inventory/application/inventory-service";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user.id) redirect("/sign-in");
  const context = serverEnvironment.demoMode
    ? { store: { name: "Aling Rosa's Store" }, role: "OWNER" as const }
    : await resolveStoreContext(session.user.id);
  if (!context) redirect("/onboarding");
  const locale =
    (await cookies()).get("tindahan-language")?.value === "FIL" ? "FIL" : "EN";
  const inventoryAttention = serverEnvironment.demoMode
    ? 0
    : (await searchProducts(session.user.id, { limit: 1 })).counts.low;
  return (
    <AppShell
      storeName={context.store.name}
      role={context.role}
      locale={locale}
      inventoryAttention={inventoryAttention}
    >
      {children}
    </AppShell>
  );
}
