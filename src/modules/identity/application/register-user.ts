import { hashPassword } from "../domain/password";
import { registrationInput } from "../domain/registration";
import { database } from "@/platform/persistence/prisma";

export async function registerUser(input: unknown) {
  const value = registrationInput.parse(input);
  const passwordHash = await hashPassword(value.password);
  return database().user.create({
    data: { name: value.name, email: value.email, passwordHash },
    select: { id: true, name: true, email: true },
  });
}
