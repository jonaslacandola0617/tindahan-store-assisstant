import { z } from "zod";
import { serverEnvironment } from "@/platform/environment/server";

export type TransactionalEmail = { to: string; subject: string; text: string; html: string };
export type EmailSendResult = { messageId: string };
export interface EmailProvider { readonly id: "mock" | "resend"; send(input: TransactionalEmail, idempotencyKey: string): Promise<EmailSendResult>; }
export class EmailProviderError extends Error { constructor(readonly code: "AUTH" | "RATE_LIMITED" | "UNAVAILABLE" | "REJECTED") { super("The email could not be sent."); this.name = "EmailProviderError"; } }

export class MockEmailProvider implements EmailProvider {
  readonly id = "mock" as const;
  async send(_input: TransactionalEmail, idempotencyKey: string) { return { messageId: `mock_${idempotencyKey}` }; }
}

const responseSchema = z.object({ id: z.string().min(1) });
export class ResendEmailProvider implements EmailProvider {
  readonly id = "resend" as const;
  constructor(private readonly apiKey = serverEnvironment.RESEND_API_KEY!, private readonly request: typeof fetch = fetch) {}
  async send(input: TransactionalEmail, idempotencyKey: string) {
    const response = await this.request("https://api.resend.com/emails", { method: "POST", headers: { authorization: `Bearer ${this.apiKey}`, "content-type": "application/json", "idempotency-key": idempotencyKey.slice(0, 256) }, body: JSON.stringify({ from: `${serverEnvironment.RESEND_FROM_NAME} <${serverEnvironment.RESEND_FROM_EMAIL}>`, to: [input.to], subject: input.subject, text: input.text, html: input.html }), signal: AbortSignal.timeout(15_000) }).catch(() => { throw new EmailProviderError("UNAVAILABLE"); });
    if (!response.ok) {
      if (response.status === 401 || response.status === 403) throw new EmailProviderError("AUTH");
      if (response.status === 429) throw new EmailProviderError("RATE_LIMITED");
      if (response.status >= 500) throw new EmailProviderError("UNAVAILABLE");
      throw new EmailProviderError("REJECTED");
    }
    const parsed = responseSchema.safeParse(await response.json());
    if (!parsed.success) throw new EmailProviderError("REJECTED");
    return { messageId: parsed.data.id };
  }
}

let cached: EmailProvider | undefined;
export function emailProvider(): EmailProvider {
  cached ??= serverEnvironment.EMAIL_PROVIDER === "resend" ? new ResendEmailProvider() : new MockEmailProvider();
  return cached;
}
