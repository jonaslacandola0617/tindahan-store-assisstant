import { describe, expect, it, vi } from "vitest";
import { AzureDocumentIntelligenceReceiptProvider, classifyAzureProviderError, DeterministicMockReceiptProvider, mapAzureReceiptResult } from "./extraction-providers";

describe("deterministic receipt extraction provider", () => {
  const input = { receiptId: "r1", objectKey: "stores/s1/receipts/r1/file.png", originalFilename: "receipt.png", mimeType: "image/png", bytes: new Uint8Array([1, 2, 3]) };

  it("returns a stable normalized fixture without paid provider calls", async () => {
    const provider = new DeterministicMockReceiptProvider();
    const first = await provider.extract(input);
    expect(await provider.extract(input)).toEqual(first);
    expect(first.supplier).toBe("Home Table Foods");
    expect(first.lines).toHaveLength(5);
  });

  it("supports uncertain-line and provider-failure fixtures", async () => {
    const provider = new DeterministicMockReceiptProvider();
    const uncertain = await provider.extract({ ...input, originalFilename: "unreadable-receipt.png" });
    expect(uncertain.warnings).toContain("partially_unreadable");
    expect(uncertain.lines.some(line => line.quantity === null)).toBe(true);
    await expect(provider.extract({ ...input, originalFilename: "provider-fail.png" })).rejects.toMatchObject({ code: "PROVIDER_FAILED" });
    await expect(provider.extract({ ...input, originalFilename: "timeout.png" })).rejects.toMatchObject({ code: "PROVIDER_TIMEOUT" });
  });
});

describe("Azure Document Intelligence receipt provider", () => {
  const azurePayload = {
    status: "succeeded",
    analyzeResult: {
      content: "SARI-SARI STORE\nTUNA 2 35.00 70.00\nTOTAL 70.00",
      documents: [{ fields: {
        MerchantName: { valueString: "Sari-Sari Store", confidence: 0.97 },
        TransactionDate: { valueDate: "2026-08-02", confidence: 0.92 },
        Subtotal: { valueCurrency: { amount: 70 }, confidence: 0.9 },
        Total: { valueCurrency: { amount: 70 }, confidence: 0.96 },
        Items: { valueArray: [{ content: "TUNA 2 35.00 70.00", valueObject: { Description: { valueString: "Tuna", confidence: 0.89 }, Quantity: { valueNumber: 2 }, Price: { valueCurrency: { amount: 35 } }, TotalPrice: { valueCurrency: { amount: 70 } } } }] },
      } }],
    },
  };

  it("maps receipt fields into provider-neutral values and preserves missing fields", () => {
    const result = mapAzureReceiptResult(azurePayload, "operation-1");
    expect(result).toMatchObject({ operationId: "operation-1", supplier: "Sari-Sari Store", receiptDate: "2026-08-02", subtotal: 70, tax: null, grandTotal: 70 });
    expect(result.lines[0]).toMatchObject({ name: "Tuna", quantity: 2, unitPrice: 35, lineTotal: 70 });
    expect(mapAzureReceiptResult({ status: "succeeded", analyzeResult: { content: "", documents: [] } }).supplier).toBeNull();
  });

  it("submits server-retrieved bytes and polls the protected operation URL", async () => {
    const request = vi.fn()
      .mockResolvedValueOnce(new Response(null, { status: 202, headers: { "operation-location": "https://receipt-ai.example.test/documentintelligence/documentModels/prebuilt-receipt/analyzeResults/operation-1?api-version=2024-11-30", "retry-after": "0" } }))
      .mockResolvedValueOnce(Response.json(azurePayload));
    const provider = new AzureDocumentIntelligenceReceiptProvider({ endpoint: "https://receipt-ai.example.test/", apiKey: "not-a-real-key", apiVersion: "2024-11-30" }, request as unknown as typeof fetch, async () => {});
    const result = await provider.extract({ receiptId: "r1", objectKey: "receipts/s1/2026/08/r1/f1.png", originalFilename: "receipt.png", mimeType: "image/png", bytes: new Uint8Array([1, 2, 3]) });
    expect(result.supplier).toBe("Sari-Sari Store");
    expect(request).toHaveBeenCalledTimes(2);
    const post = request.mock.calls[0]![1] as RequestInit;
    expect(post.body).toContain("AQID");
    expect(JSON.stringify(post.headers)).not.toContain("Bearer");
  });

  it("classifies provider errors without returning provider payloads", () => {
    expect(classifyAzureProviderError(401)).toBe("PROVIDER_AUTHENTICATION");
    expect(classifyAzureProviderError(429, "QuotaExceeded")).toBe("PROVIDER_QUOTA");
    expect(classifyAzureProviderError(429, "TooManyRequests")).toBe("PROVIDER_RATE_LIMITED");
    expect(classifyAzureProviderError(503)).toBe("PROVIDER_UNAVAILABLE");
    expect(classifyAzureProviderError(400, "InvalidContent")).toBe("UNSUPPORTED_IMAGE");
  });
});
