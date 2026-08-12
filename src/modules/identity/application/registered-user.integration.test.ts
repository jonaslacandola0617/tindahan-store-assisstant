import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { database } from "@/platform/persistence/prisma";
import { registeredUserExists } from "./registered-user";

describe("registeredUserExists", () => {
  const email = `session-user-${crypto.randomUUID()}@example.test`;
  let userId = "";

  beforeAll(async () => {
    userId = (await database().user.create({ data: { email }, select: { id: true } })).id;
  });

  afterAll(async () => {
    await database().user.deleteMany({ where: { email } });
  });

  it("accepts a session only while its user still exists", async () => {
    await expect(registeredUserExists(userId)).resolves.toBe(true);
    await database().user.delete({ where: { id: userId } });
    await expect(registeredUserExists(userId)).resolves.toBe(false);
  });

  it("rejects a missing session identifier", async () => {
    await expect(registeredUserExists(undefined)).resolves.toBe(false);
  });
});
