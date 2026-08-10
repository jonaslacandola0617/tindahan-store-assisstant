import { cookies } from "next/headers";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/modules/identity/infrastructure/auth-options";
import { resolveStoreContext } from "@/modules/stores/application/store-context";
import { getSettings } from "@/modules/saas/application/saas-service";
import { getBillingHistory } from "@/modules/saas/application/billing-service";
import { SettingsClient } from "./settings-client";

export const metadata = { title: "Settings" };
export default async function SettingsPage() {
  const session = await getServerSession(authOptions); if (!session?.user.id) redirect("/sign-in");
  if (!(await resolveStoreContext(session.user.id))) redirect("/onboarding");
  const [settings, billing, cookieStore] = await Promise.all([getSettings(session.user.id), getBillingHistory(session.user.id), cookies()]);
  const locale = cookieStore.get("tindahan-language")?.value === "FIL" ? "FIL" : "EN";
  const activeSettings = { ...settings, members: settings.members.filter(member => member.status === "ACTIVE") };
  return <SettingsClient initial={JSON.parse(JSON.stringify(activeSettings))} initialBilling={JSON.parse(JSON.stringify(billing))} locale={locale}/>;
}
