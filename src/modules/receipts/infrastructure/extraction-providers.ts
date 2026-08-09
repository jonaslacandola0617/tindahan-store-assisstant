import { createHash } from "node:crypto";
import { serverEnvironment } from "@/platform/environment/server";
import type { ReceiptExtractionInput, ReceiptExtractionProvider, ReceiptExtractionResult } from "../application/extraction-provider";

export class DeterministicMockReceiptProvider implements ReceiptExtractionProvider {
  readonly id = "deterministic-mock";
  readonly version = "1.0";

  async extract(input: ReceiptExtractionInput): Promise<ReceiptExtractionResult> {
    const fixture = input.originalFilename.toLocaleLowerCase("en-PH");
    if (fixture.includes("provider-fail") || fixture.includes("timeout")) {
      const error = new Error("MOCK_PROVIDER_FAILURE");
      (error as Error & { code?: string }).code = fixture.includes("timeout") ? "PROVIDER_TIMEOUT" : "PROVIDER_FAILED";
      throw error;
    }
    const unreadable = fixture.includes("unreadable");
    const digest = createHash("sha256").update(input.bytes).digest("hex").slice(0, 12);
    const lines = unreadable
      ? [
          { rawText: "PANCIT CANTON x12 180.00", name: "Pancit Canton", quantity: 12, unitPrice: 15, lineTotal: 180, internalConfidence: 0.98 },
          { rawText: ".......... x?? ???", name: null, quantity: null, unitPrice: null, lineTotal: null, internalConfidence: 0.12 },
        ]
      : [
          { rawText: "PANCIT CANTON x24 360.00", name: "Pancit Canton", barcode: "4800016640017", quantity: 24, unitPrice: 15, lineTotal: 360, internalConfidence: 0.99 },
          { rawText: "FRESH EGGS MED x30 240.00", name: "Fresh Eggs (Medium)", barcode: "2800000000068", quantity: 30, unitPrice: 8, lineTotal: 240, packagingText: "1 tray / 30 pieces", internalConfidence: 0.96 },
          { rawText: "BOTTLED WATER 500ML x12 180.00", name: "Bottled Water, 500ml", quantity: 12, unitPrice: 15, lineTotal: 180, internalConfidence: 0.86 },
          { rawText: "TUNA FLAKES 155G x6 210.00", name: "Tuna Flakes, 155g", quantity: 6, unitPrice: 35, lineTotal: 210, internalConfidence: 0.72 },
          { rawText: "DELIVERY FEE 50.00", name: "Delivery fee", quantity: null, unitPrice: null, lineTotal: 50, internalConfidence: 0.98 },
        ];
    return {
      operationId: `mock-${digest}`,
      rawText: ["HOME TABLE FOODS", "AUG 02 2026", ...lines.map(line => line.rawText), unreadable ? "TOTAL 180.00" : "TOTAL 1040.00"].join("\n"),
      supplier: "Home Table Foods",
      receiptDate: "2026-08-02",
      grandTotal: unreadable ? 180 : 1040,
      lines,
      warnings: unreadable ? ["partially_unreadable"] : [],
      internalConfidence: { supplier: 0.94, date: 0.91, total: unreadable ? 0.68 : 0.97 },
    };
  }
}

class HttpReceiptProvider implements ReceiptExtractionProvider {
  readonly id = "configured-http";
  readonly version = "1.0";

  async extract(input: ReceiptExtractionInput): Promise<ReceiptExtractionResult> {
    const response = await fetch(serverEnvironment.RECEIPT_OCR_ENDPOINT!, {
      method: "POST",
      headers: { "content-type": input.mimeType, ...(serverEnvironment.RECEIPT_OCR_API_KEY ? { authorization: `Bearer ${serverEnvironment.RECEIPT_OCR_API_KEY}` } : {}) },
      body: Buffer.from(input.bytes),
      signal: AbortSignal.timeout(45_000),
    });
    if (!response.ok) {
      const error = new Error("RECEIPT_PROVIDER_FAILED");
      (error as Error & { code?: string }).code = response.status === 408 || response.status === 504 ? "PROVIDER_TIMEOUT" : "PROVIDER_FAILED";
      throw error;
    }
    return await response.json() as ReceiptExtractionResult;
  }
}

type JsonRecord = Record<string, unknown>;
type AzureConfig = { endpoint: string; apiKey: string; apiVersion: string };

function record(value: unknown): JsonRecord | undefined { return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : undefined; }
function textField(value: unknown) {
  const field = record(value);
  const result = field?.valueString ?? field?.valueDate ?? field?.content;
  return typeof result === "string" && result.trim() ? result.trim() : null;
}
function numericField(value: unknown) {
  const field = record(value);
  const currency = record(field?.valueCurrency)?.amount;
  if (typeof field?.valueNumber === "number") return field.valueNumber;
  if (typeof currency === "number") return currency;
  if (typeof field?.content === "string") {
    const parsed = Number(field.content.replace(/[^0-9.-]/g, ""));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}
function confidence(value: unknown) { const result = record(value)?.confidence; return typeof result === "number" ? result : null; }

export function mapAzureReceiptResult(payload: unknown, operationId?: string): ReceiptExtractionResult {
  const root = record(payload);
  const analyzeResult = record(root?.analyzeResult);
  const documents = Array.isArray(analyzeResult?.documents) ? analyzeResult.documents : [];
  const document = record(documents[0]);
  const fields = record(document?.fields) ?? {};
  const itemsField = record(fields.Items);
  const itemValues = Array.isArray(itemsField?.valueArray) ? itemsField.valueArray : [];
  const lines = itemValues.map((entry, index) => {
    const item = record(entry);
    const values = record(item?.valueObject) ?? {};
    const description = textField(values.Description ?? values.Name);
    const rawText = typeof item?.content === "string" && item.content.trim() ? item.content.trim() : description ?? `Line ${index + 1}`;
    return {
      rawText,
      name: description,
      quantity: numericField(values.Quantity),
      unitPrice: numericField(values.Price),
      lineTotal: numericField(values.TotalPrice),
      internalConfidence: confidence(values.Description ?? values.Name),
    };
  });
  const rawText = typeof analyzeResult?.content === "string" ? analyzeResult.content : "";
  return {
    operationId,
    rawText,
    supplier: textField(fields.MerchantName),
    receiptDate: textField(fields.TransactionDate),
    subtotal: numericField(fields.Subtotal),
    tax: numericField(fields.TotalTax ?? fields.Tax),
    grandTotal: numericField(fields.Total),
    lines,
    warnings: documents.length ? [] : ["receipt_fields_not_detected"],
    internalConfidence: {
      supplier: confidence(fields.MerchantName),
      date: confidence(fields.TransactionDate),
      subtotal: confidence(fields.Subtotal),
      tax: confidence(fields.TotalTax ?? fields.Tax),
      total: confidence(fields.Total),
    },
  };
}

type ProviderFailureCode = "PROVIDER_AUTHENTICATION" | "PROVIDER_INVALID_ENDPOINT" | "PROVIDER_QUOTA" | "PROVIDER_RATE_LIMITED" | "PROVIDER_UNAVAILABLE" | "PROVIDER_TIMEOUT" | "UNSUPPORTED_IMAGE" | "UNREADABLE_RECEIPT" | "MALFORMED_PROVIDER_RESPONSE" | "PROVIDER_CANCELLED" | "PROVIDER_FAILED";

function providerError(code: ProviderFailureCode) {
  const error = new Error(code);
  (error as Error & { code: ProviderFailureCode }).code = code;
  return error;
}

export function classifyAzureProviderError(status: number, providerCode?: string): ProviderFailureCode {
  const code = providerCode?.toLowerCase() ?? "";
  if (status === 401 || status === 403) return "PROVIDER_AUTHENTICATION";
  if (status === 404) return "PROVIDER_INVALID_ENDPOINT";
  if (status === 408 || status === 504) return "PROVIDER_TIMEOUT";
  if (status === 429) return code.includes("quota") ? "PROVIDER_QUOTA" : "PROVIDER_RATE_LIMITED";
  if (status === 400 && /invalidcontent|unsupported|badrequest/.test(code)) return "UNSUPPORTED_IMAGE";
  if (status >= 500) return "PROVIDER_UNAVAILABLE";
  return "PROVIDER_FAILED";
}

async function responseProviderCode(response: Response) {
  try { return String(record(record(await response.json())?.error)?.code ?? ""); } catch { return ""; }
}

export class AzureDocumentIntelligenceReceiptProvider implements ReceiptExtractionProvider {
  readonly id = "azure-document-intelligence";
  readonly version: string;
  private readonly config: AzureConfig;
  private readonly request: typeof fetch;
  private readonly pause: (milliseconds: number) => Promise<void>;

  constructor(config: AzureConfig = { endpoint: serverEnvironment.RECEIPT_OCR_ENDPOINT!, apiKey: serverEnvironment.RECEIPT_OCR_API_KEY!, apiVersion: serverEnvironment.RECEIPT_OCR_API_VERSION! }, request: typeof fetch = fetch, pause = (milliseconds: number) => new Promise<void>(resolve => setTimeout(resolve, milliseconds))) {
    this.config = config;
    this.version = config.apiVersion;
    this.request = request;
    this.pause = pause;
  }

  async extract(input: ReceiptExtractionInput): Promise<ReceiptExtractionResult> {
    const endpoint = this.config.endpoint.endsWith("/") ? this.config.endpoint : `${this.config.endpoint}/`;
    const analyzeUrl = new URL("documentintelligence/documentModels/prebuilt-receipt:analyze", endpoint);
    analyzeUrl.searchParams.set("_overload", "analyzeDocument");
    analyzeUrl.searchParams.set("api-version", this.config.apiVersion);
    let response: Response;
    try {
      response = await this.request(analyzeUrl, { method: "POST", headers: { "content-type": "application/json", "Ocp-Apim-Subscription-Key": this.config.apiKey }, body: JSON.stringify({ base64Source: Buffer.from(input.bytes).toString("base64") }), signal: AbortSignal.timeout(45_000) });
    } catch (error) {
      throw providerError(error instanceof DOMException && error.name === "TimeoutError" ? "PROVIDER_TIMEOUT" : "PROVIDER_UNAVAILABLE");
    }
    if (response.status !== 202) throw providerError(classifyAzureProviderError(response.status, await responseProviderCode(response)));
    const operationLocation = response.headers.get("operation-location");
    if (!operationLocation) throw providerError("MALFORMED_PROVIDER_RESPONSE");
    const operationUrl = new URL(operationLocation);
    if (operationUrl.protocol !== "https:" || operationUrl.origin !== new URL(endpoint).origin) throw providerError("MALFORMED_PROVIDER_RESPONSE");
    const operationId = operationUrl.pathname.split("/").filter(Boolean).at(-1);
    const deadline = Date.now() + 90_000;
    while (Date.now() < deadline) {
      await this.pause(Math.min(Number(response.headers.get("retry-after") ?? 1) * 1000, 5_000));
      try {
        response = await this.request(operationUrl, { headers: { "Ocp-Apim-Subscription-Key": this.config.apiKey }, signal: AbortSignal.timeout(30_000) });
      } catch (error) {
        if (error instanceof DOMException && error.name === "TimeoutError") throw providerError("PROVIDER_TIMEOUT");
        throw providerError("PROVIDER_UNAVAILABLE");
      }
      if (!response.ok) throw providerError(classifyAzureProviderError(response.status, await responseProviderCode(response)));
      let payload: unknown;
      try { payload = await response.json(); } catch { throw providerError("MALFORMED_PROVIDER_RESPONSE"); }
      const status = String(record(payload)?.status ?? "").toLowerCase();
      if (status === "succeeded") return mapAzureReceiptResult(payload, operationId);
      if (status === "failed") throw providerError("PROVIDER_FAILED");
      if (status === "canceled" || status === "cancelled") throw providerError("PROVIDER_CANCELLED");
      if (status !== "running" && status !== "notstarted") throw providerError("MALFORMED_PROVIDER_RESPONSE");
    }
    throw providerError("PROVIDER_TIMEOUT");
  }
}

export function receiptExtractionProvider(): ReceiptExtractionProvider {
  if (serverEnvironment.RECEIPT_OCR_PROVIDER === "azure") return new AzureDocumentIntelligenceReceiptProvider();
  return serverEnvironment.RECEIPT_OCR_PROVIDER === "http" ? new HttpReceiptProvider() : new DeterministicMockReceiptProvider();
}
