export class ReceiptUploadTransportError extends Error {
  constructor(readonly code: "UPLOAD_REJECTED" | "UPLOAD_NETWORK_ERROR" | "UPLOAD_TIMEOUT") {
    super(code);
    this.name = "ReceiptUploadTransportError";
  }
}

export function receiptUploadErrorMessage(locale: "EN" | "FIL", error: unknown) {
  if (error instanceof ReceiptUploadTransportError) {
    if (locale === "FIL") {
      if (error.code === "UPLOAD_TIMEOUT") return "Masyadong matagal ang pag-upload. Suriin ang koneksyon at subukan ulit.";
      return "Hindi na-upload ang litrato sa secure storage. Suriin ang koneksyon at subukan ulit.";
    }
    if (error.code === "UPLOAD_TIMEOUT") return "The upload took too long. Check your connection and try again.";
    return "The photo couldn't reach secure storage. Check your connection and try again.";
  }
  if (error instanceof Error && error.message) return error.message;
  return locale === "FIL" ? "Hindi na-upload ang resibo. Subukan ulit." : "We couldn't upload this receipt. Try again.";
}
