import { cookies } from "next/headers";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/modules/identity/infrastructure/auth-options";
import { readReceipt } from "@/modules/receipts/application/receipt-service";
import { ReceiptDetailsClient } from "./receipt-details-client";
export default async function ReceiptDetailsPage({params}:{params:Promise<{receiptId:string}>}){const session=await getServerSession(authOptions);if(!session?.user.id)redirect("/sign-in");const locale=(await cookies()).get("tindahan-language")?.value==="FIL"?"FIL":"EN";const receipt=await readReceipt(session.user.id,(await params).receiptId,process.env.NEXTAUTH_URL??"http://localhost:3000");return <ReceiptDetailsClient locale={locale} receipt={receipt}/>;}

