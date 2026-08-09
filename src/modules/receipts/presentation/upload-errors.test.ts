import { describe, expect, it } from "vitest";
import { receiptUploadErrorMessage, ReceiptUploadTransportError } from "./upload-errors";

describe("receipt upload errors", () => {
  it("does not present storage transport failures as invalid file errors", () => {
    expect(receiptUploadErrorMessage("EN", new ReceiptUploadTransportError("UPLOAD_NETWORK_ERROR"))).toBe("The photo couldn't reach secure storage. Check your connection and try again.");
    expect(receiptUploadErrorMessage("FIL", new ReceiptUploadTransportError("UPLOAD_REJECTED"))).toBe("Hindi na-upload ang litrato sa secure storage. Suriin ang koneksyon at subukan ulit.");
  });

  it("preserves safe API messages and has a generic fallback", () => {
    expect(receiptUploadErrorMessage("EN", new Error("The selected photo is too large."))).toBe("The selected photo is too large.");
    expect(receiptUploadErrorMessage("EN", new Error())).toBe("We couldn't upload this receipt. Try again.");
  });
});
