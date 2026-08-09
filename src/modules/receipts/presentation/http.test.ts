import { describe, expect, it } from "vitest";
import { receiptDatabaseErrorContext } from "./http";

describe("receipt database error logging", () => {
  it("keeps useful Prisma diagnostics without logging the raw provider message", () => {
    const error = Object.assign(new Error("contains database details"), {
      name: "PrismaClientKnownRequestError",
      code: "P2028",
      meta: { modelName: "ReceiptLine", operation: "query", timeout: 5_000, timeTaken: 5_806 },
    });

    expect(receiptDatabaseErrorContext(error)).toEqual({
      error: "PrismaClientKnownRequestError",
      databaseCode: "P2028",
      databaseModel: "ReceiptLine",
      databaseOperation: "query",
      databaseTimeoutMs: 5_000,
    });
  });

  it("does not treat arbitrary error codes as Prisma diagnostics", () => {
    expect(receiptDatabaseErrorContext({ name: "Error", code: "SECRET_VALUE" })).toEqual({
      error: "unknown",
      databaseCode: undefined,
      databaseModel: undefined,
      databaseOperation: undefined,
      databaseTimeoutMs: undefined,
    });
  });
});
