export type ReceiptExtractionInput = {
  receiptId: string;
  objectKey: string;
  originalFilename: string;
  mimeType: string;
  bytes: Uint8Array;
};

export type ExtractedReceiptLine = {
  rawText: string;
  name: string | null;
  barcode?: string | null;
  quantity: string | number | null;
  unitPrice: string | number | null;
  lineTotal: string | number | null;
  packagingText?: string | null;
  internalConfidence?: number | null;
};

export type ReceiptExtractionResult = {
  operationId?: string;
  rawText: string;
  supplier: string | null;
  receiptDate: string | null;
  subtotal?: string | number | null;
  tax?: string | number | null;
  grandTotal: string | number | null;
  lines: ExtractedReceiptLine[];
  warnings?: string[];
  internalConfidence?: Record<string, number | null>;
  rawProviderPayload?: unknown;
};

export interface ReceiptExtractionProvider {
  readonly id: string;
  readonly version: string;
  extract(input: ReceiptExtractionInput): Promise<ReceiptExtractionResult>;
}
