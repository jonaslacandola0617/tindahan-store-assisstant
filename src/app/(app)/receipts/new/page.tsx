import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { serverEnvironment } from "@/platform/environment/server";
import { ReceiptUploadClient } from "./receipt-upload-client";

export default async function NewReceiptPage(){
  if(serverEnvironment.showcaseMode) redirect("/receipts");
  const locale=(await cookies()).get("tindahan-language")?.value==="FIL"?"FIL":"EN";
  return <ReceiptUploadClient locale={locale}/>;
}
