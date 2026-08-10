import { describe, expect, it } from "vitest";
import { accountVerificationEmail, staffInvitationEmail } from "./transactional-email";

describe("Tindahan transactional email templates", () => {
  it("renders a branded staff invitation with a direct acceptance link", () => {
    const email = staffInvitationEmail("Maria's Mini Mart", "Maria Santos", "https://app.example.test/invite/private-token");

    expect(email.subject).toBe("Join Maria's Mini Mart");
    expect(email.text).toContain("Accept invitation: https://app.example.test/invite/private-token");
    expect(email.text).toContain("Run the store. Tindahan keeps up.");
    expect(email.html).toContain("Tindahan");
    expect(email.html).toContain("#1B4D3E");
    expect(email.html).toContain("Accept invitation");
    expect(email.html).toContain("https://app.example.test/invite/private-token");
  });

  it("renders account verification using the same visual shell", () => {
    const email = accountVerificationEmail("Jonas", "https://app.example.test/verify-email?token=private-token");

    expect(email.subject).toBe("Verify your email");
    expect(email.text).toContain("Verify email: https://app.example.test/verify-email?token=private-token");
    expect(email.html).toContain("Account verification");
    expect(email.html).toContain("Verify email");
    expect(email.html).toContain("#FAF8F5");
  });

  it("escapes user-controlled names in the HTML template", () => {
    const email = staffInvitationEmail("<script>alert('x')</script>", "Owner & Co", "https://app.example.test/invite/token");

    expect(email.html).not.toContain("<script>alert");
    expect(email.html).toContain("&lt;script&gt;");
    expect(email.html).toContain("Owner &amp; Co");
  });
});
