import { AuthVisual } from "@/components/auth-visual";
import { RegisterForm } from "./register-form";

export const metadata = { title: "Create account" };
export default function RegisterPage() {
  return <main className="standalone"><div className="standalone-panel"><AuthVisual/><div className="standalone-form"><h1 style={{ marginBottom: "var(--space-2)" }}>Set up a new store</h1><p className="text-muted" style={{ marginBottom: "var(--space-6)" }}>Create your secure owner account first.</p><RegisterForm/></div></div></main>;
}
