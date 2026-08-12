import { cookies } from "next/headers";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/modules/identity/infrastructure/auth-options";
import { listReceipts } from "@/modules/receipts/application/receipt-service";
import { serverEnvironment } from "@/platform/environment/server";
import { ReceiptsClient } from "./receipts-client";

export default async function ReceiptsPage() {
  const session = await getServerSession(authOptions); if (!session?.user.id) redirect("/sign-in");
  const locale = (await cookies()).get("tindahan-language")?.value === "FIL" ? "FIL" : "EN";
  return <ReceiptsClient locale={locale} initial={await listReceipts(session.user.id)} showcase={serverEnvironment.showcaseMode} />;
}
