import { createHash, randomBytes } from "node:crypto";
import { database } from "@/platform/persistence/prisma";

const VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000;
const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export async function createEmailVerificationToken(userId: string) {
  const user = await database().user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, emailVerified: true },
  });
  if (!user) throw new Error("USER_NOT_FOUND");
  if (user.emailVerified) return { alreadyVerified: true as const, user };

  const token = randomBytes(32).toString("base64url");
  const expires = new Date(Date.now() + VERIFICATION_TTL_MS);
  await database().$transaction(async transaction => {
    await transaction.verificationToken.deleteMany({ where: { identifier: user.email } });
    await transaction.verificationToken.create({
      data: { identifier: user.email, token: hashToken(token), expires },
    });
  });

  return { alreadyVerified: false as const, user, token, expires };
}

export async function verifyEmailToken(token: string) {
  const tokenHash = hashToken(token);
  const record = await database().verificationToken.findUnique({ where: { token: tokenHash } });
  if (!record) return { verified: false as const, reason: "INVALID" as const };
  if (record.expires <= new Date()) {
    await database().verificationToken.deleteMany({ where: { identifier: record.identifier } });
    return { verified: false as const, reason: "EXPIRED" as const };
  }

  const user = await database().user.findUnique({ where: { email: record.identifier }, select: { id: true, emailVerified: true } });
  if (!user) {
    await database().verificationToken.deleteMany({ where: { identifier: record.identifier } });
    return { verified: false as const, reason: "INVALID" as const };
  }

  const verifiedAt = user.emailVerified ?? new Date();
  await database().$transaction(async transaction => {
    if (!user.emailVerified) await transaction.user.update({ where: { id: user.id }, data: { emailVerified: verifiedAt } });
    await transaction.verificationToken.deleteMany({ where: { identifier: record.identifier } });
  });
  return { verified: true as const, verifiedAt };
}
