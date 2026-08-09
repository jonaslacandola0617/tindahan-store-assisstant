import { cookies } from "next/headers";
import { ReceiptUploadClient } from "./receipt-upload-client";
export default async function NewReceiptPage(){const locale=(await cookies()).get("tindahan-language")?.value==="FIL"?"FIL":"EN";return <ReceiptUploadClient locale={locale}/>;}

