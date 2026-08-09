import { NextRequest, NextResponse } from "next/server";
import { receiptFilePolicy } from "@/modules/receipts/domain/receipt";
import { receiptStorage, storeLocalReceiptUpload, verifyLocalReceiptToken } from "@/platform/storage/receipt-storage";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    const contentLength = Number(request.headers.get("content-length") ?? 0);
    if (!contentLength || contentLength > receiptFilePolicy.maxBytes) return NextResponse.json({ error: "The selected photo is too large." }, { status: 413 });
    const bytes = new Uint8Array(await request.arrayBuffer());
    await storeLocalReceiptUpload(token, bytes, request.headers.get("content-type") ?? "");
    return new NextResponse(null, { status: 204 });
  } catch { return NextResponse.json({ error: "This upload link is no longer valid. Start the upload again." }, { status: 403 }); }
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    const payload = verifyLocalReceiptToken(token, "read");
    const stored = await receiptStorage().read(payload.key);
    return new NextResponse(Buffer.from(stored.bytes), { headers: { "content-type": payload.mimeType, "content-length": String(stored.sizeBytes), "cache-control": "private, max-age=60", "content-security-policy": "default-src 'none'", "x-content-type-options": "nosniff", ...(payload.downloadName ? { "content-disposition": `attachment; filename="${payload.downloadName}"` } : {}) } });
  } catch { return NextResponse.json({ error: "This image link has expired." }, { status: 403 }); }
}
