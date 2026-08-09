import { cookies } from "next/headers";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/modules/identity/infrastructure/auth-options";
import { getSettings } from "@/modules/saas/application/saas-service";
import { SettingsClient } from "./settings-client";

export const metadata = { title: "Settings" };
export default async function SettingsPage() {
  const session = await getServerSession(authOptions); if (!session?.user.id) redirect("/sign-in");
  const [settings, cookieStore] = await Promise.all([getSettings(session.user.id), cookies()]);
  const locale = cookieStore.get("tindahan-language")?.value === "FIL" ? "FIL" : "EN";
  return <SettingsClient initial={JSON.parse(JSON.stringify(settings))} locale={locale}/>;
}
