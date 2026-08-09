import { z } from "zod";

export const setupCredentialsInput = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(10).max(128),
});

export const accountSetupInput = setupCredentialsInput.extend({
  confirmPassword: z.string(),
}).superRefine((value, context) => {
  if (value.password !== value.confirmPassword) {
    context.addIssue({ code: "custom", path: ["confirmPassword"], message: "Passwords do not match." });
  }
});

export const registrationInput = setupCredentialsInput.extend({
  name: z.string().trim().min(2).max(80),
});
