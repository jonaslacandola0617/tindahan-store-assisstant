import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { Brand } from "@/components/brand";
import { authOptions } from "@/modules/identity/infrastructure/auth-options";
import { OnboardingForm } from "./onboarding-form";

export const metadata = { title: "Set up your store" };
export default async function OnboardingPage() {
  if (!(await getServerSession(authOptions))) redirect("/sign-in");
  return <main className="standalone"><div className="standalone-card"><div className="card card-pad" style={{ boxShadow: "var(--shadow-overlay)" }}><div style={{ marginBottom: "var(--space-6)" }}><Brand/></div><div className="step-indicator" style={{ marginBottom: "var(--space-6)" }} aria-hidden="true"><span className="step-dot active"/><span className="step-dot"/><span className="step-dot"/></div><h1 style={{ marginBottom: "var(--space-2)" }}>Tell us about your store</h1><p className="text-muted" style={{ marginBottom: "var(--space-6)" }}>This helps Tindahan feel like it was made for your store.</p><OnboardingForm/></div></div></main>;
}
