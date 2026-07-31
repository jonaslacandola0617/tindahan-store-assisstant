import { z } from "zod";
import { hashPassword } from "../domain/password";
import { database } from "@/platform/persistence/prisma";

export const registrationInput = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(10).max(128),
});

export async function registerUser(input: unknown) {
  const value = registrationInput.parse(input);
  const passwordHash = await hashPassword(value.password);
  return database().user.create({
    data: { name: value.name, email: value.email, passwordHash },
    select: { id: true, name: true, email: true },
  });
}
