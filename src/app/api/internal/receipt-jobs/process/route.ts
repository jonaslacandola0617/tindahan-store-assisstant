import { NextResponse } from "next/server";
import { processReceiptJob, runQueuedReceiptJobs } from "@/modules/receipts/application/receipt-service";
import { serverEnvironment } from "@/platform/environment/server";

export async function POST(request: Request) {
  const expected = serverEnvironment.RECEIPT_JOB_SECRET;
  if (!expected || request.headers.get("authorization") !== `Bearer ${expected}`) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const body = await request.json().catch(() => ({})) as { jobId?: string };
  return NextResponse.json(body.jobId ? await processReceiptJob(body.jobId) : await runQueuedReceiptJobs());
}

