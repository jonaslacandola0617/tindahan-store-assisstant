import { database } from "../src/platform/persistence/prisma";
import { hashPassword } from "../src/modules/identity/domain/password";

const prisma = database();
const email = "owner@example.test";
const owner = await prisma.user.upsert({
  where: { email },
  update: {},
  create: { name: "Rosa Santos", email, passwordHash: await hashPassword("change-this-demo-password") },
});

const existing = await prisma.storeMembership.findFirst({ where: { userId: owner.id, role: "OWNER" } });
if (!existing) {
  await prisma.store.create({
    data: {
      name: "Aling Rosa's Store",
      preference: { create: {} },
      memberships: { create: { userId: owner.id, role: "OWNER" } },
    },
  });
}

await prisma.$disconnect();
