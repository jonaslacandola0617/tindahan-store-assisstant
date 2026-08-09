import { cookies } from "next/headers";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/modules/identity/infrastructure/auth-options";
import { listNotifications } from "@/modules/operating-view/application/operating-view-service";
import { NotificationsClient } from "./notifications-client";

export const metadata = { title: "Notifications" };
export default async function NotificationsPage() {
  const session = await getServerSession(authOptions); if (!session?.user.id) redirect("/sign-in");
  const [initial, cookieStore] = await Promise.all([listNotifications(session.user.id), cookies()]);
  return <NotificationsClient initial={initial} locale={cookieStore.get("tindahan-language")?.value === "FIL" ? "FIL" : "EN"} />;
}
