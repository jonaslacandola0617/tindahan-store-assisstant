import { afterAll, describe, expect, it } from "vitest";
import { database } from "@/platform/persistence/prisma";
import { registerOwnerStore } from "./register-owner-store";

const databaseTests = process.env.TEST_DATABASE_URL || process.env.TEST_DATABASE ? describe : describe.skip;

databaseTests("owner and store registration PostgreSQL integration", () => {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const email = `registration-${suffix}@example.test`;
  let userId = "";
  let storeId = "";

  afterAll(async () => {
    const db = database();
    if (storeId) await db.store.deleteMany({ where: { id: storeId } });
    if (userId) await db.user.deleteMany({ where: { id: userId } });
  });

  it("creates the owner, store, membership, and preferences atomically", async () => {
    const result = await registerOwnerStore({
      account: { name: "Audit Owner", email, password: "Tindahan-Audit-2026!" },
      store: {
        name: "Authentication Audit Store",
        storeType: "Mini-mart",
        language: "FIL",
        lowStockEnabled: false,
        dailySummaryEnabled: false,
      },
    });
    userId = result.user.id;
    storeId = result.store.id;

    const stored = await database().store.findUnique({
      where: { id: storeId },
      include: { memberships: true, preference: true, subscription: true },
    });
    expect(stored).toMatchObject({
      name: "Authentication Audit Store",
      storeType: "Mini-mart",
      preference: { defaultLanguage: "FIL", lowStockEnabled: false, dailySummaryEnabled: false },
      subscription: { plan: "TRIAL", status: "TRIALING" },
    });
    expect(stored?.memberships).toEqual([expect.objectContaining({ userId, role: "OWNER", status: "ACTIVE" })]);
  });

  it("does not create another store when the email already exists", async () => {
    const before = await database().store.count();
    await expect(registerOwnerStore({
      account: { name: "Another Owner", email, password: "Tindahan-Audit-2026!" },
      store: { name: "Should Not Exist", storeType: "Sari-sari store" },
    })).rejects.toMatchObject({ code: "P2002" });
    expect(await database().store.count()).toBe(before);
  });
});
