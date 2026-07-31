import { randomBytes, scrypt as nodeScrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(nodeScrypt);
const KEY_LENGTH = 64;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = (await scrypt(password, salt, KEY_LENGTH)) as Buffer;
  return `scrypt:${salt.toString("base64")}:${key.toString("base64")}`;
}

export async function verifyPassword(password: string, encoded: string): Promise<boolean> {
  const [algorithm, saltText, expectedText] = encoded.split(":");
  if (algorithm !== "scrypt" || !saltText || !expectedText) return false;
  const expected = Buffer.from(expectedText, "base64");
  const actual = (await scrypt(password, Buffer.from(saltText, "base64"), expected.length)) as Buffer;
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
