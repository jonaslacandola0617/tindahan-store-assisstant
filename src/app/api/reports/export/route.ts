import { NextRequest, NextResponse } from "next/server";
import { getOperatingReport } from "@/modules/operating-view/application/operating-view-service";
import { operatingViewHttpError, operatingViewUserId } from "@/modules/operating-view/presentation/http";

function csvCell(value: string | number) { return `"${String(value).replaceAll('"', '""')}"`; }

export async function GET(request: NextRequest) {
  try {
    const report = await getOperatingReport(await operatingViewUserId(), request.nextUrl.searchParams.get("range") ?? "month");
    const rows: Array<Array<string | number>> = [
      ["TINDAHAN OPERATIONAL REPORT"],
      ["Period", report.period.start, report.period.end],
      [],
      ["TOP PRODUCTS", "Quantity sold", "Sales amount"],
      ...report.topProducts.map(product => [product.name, product.quantity, product.amount]),
      [],
      ["RUNNING LOW", "Quantity", "Reminder point", "Unit"],
      ...report.lowStock.map(product => [product.name, product.quantity, product.threshold, product.unit]),
      [],
      ["INVENTORY MOVEMENT", "Items"],
      ["Received", report.movementSummary.received],
      ["Added manually", report.movementSummary.manualAdded],
      ["Sold", -report.movementSummary.sold],
      ["Manual corrections", report.movementSummary.adjustments],
      ["Opening stock", report.movementSummary.opening],
      ["Reversals", report.movementSummary.reversals],
      ["Net movement", report.movementSummary.net],
    ];
    const csv = `\uFEFF${rows.map(row => row.map(csvCell).join(",")).join("\r\n")}`;
    return new NextResponse(csv, { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="tindahan-${report.range}-report.csv"`, "cache-control": "private, no-store" } });
  } catch (error) { return operatingViewHttpError(error); }
}
