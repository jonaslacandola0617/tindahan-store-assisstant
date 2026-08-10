import { describe, expect, it } from "vitest";
import { dailyStoreSummaryEmail, receiptStatusEmail, stockAttentionEmail } from "./transactional-email";

describe("operational notification email templates", () => {
  it("groups low and out-of-stock products into one branded alert", () => {
    const email = stockAttentionEmail("Lia & Leo", [
      { name: "Coke 1.5L", quantity: 0, unit: "bottle", status: "OUT" },
      { name: "Sardines", quantity: 4, unit: "can", status: "LOW" },
    ], "https://app.trytindahan.store/inventory?filter=low", "EN");

    expect(email.subject).toBe("Stock needs attention");
    expect(email.text).toContain("Coke 1.5L: Out of stock");
    expect(email.text).toContain("Sardines: 4 can left");
    expect(email.html).toContain("Review inventory");
    expect(email.html).toContain("#1B4D3E");
  });

  it("keeps receipt-ready emails explicit that inventory has not changed", () => {
    const email = receiptStatusEmail({
      storeName: "Lia & Leo",
      supplier: "ABC Wholesale",
      itemCount: 12,
      status: "REVIEW_READY",
      receiptUrl: "https://app.trytindahan.store/receipts/receipt-1/review",
      locale: "EN",
    });

    expect(email.subject).toBe("Your receipt is ready to review");
    expect(email.text).toContain("Nothing has changed in your inventory yet");
    expect(email.html).toContain("Review receipt");
  });

  it("renders a concise Filipino daily summary", () => {
    const email = dailyStoreSummaryEmail("Lia & Leo", {
      salesAmount: "₱4,280.00",
      saleCount: 18,
      lowStockCount: 3,
      outOfStockCount: 1,
      receiptsReadyCount: 1,
      receiptsFailedCount: 0,
    }, "https://app.trytindahan.store/dashboard", "FIL", "Agosto 11, 2026");

    expect(email.subject).toContain("buod ngayong araw");
    expect(email.text).toContain("Benta ngayong araw: ₱4,280.00");
    expect(email.text).toContain("Ubos na: 1");
    expect(email.html).toContain("Buksan ang Tindahan");
  });
});
