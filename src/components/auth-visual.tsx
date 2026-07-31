import { Brand } from "./brand";

export function AuthVisual() {
  return <div className="standalone-visual"><Brand inverse /><div><h2 style={{ color: "#fff", fontSize: "var(--text-2xl)", maxWidth: 320, lineHeight: 1.3 }}>Your store, organized.</h2><p style={{ color: "rgba(255,255,255,.78)", marginTop: "var(--space-3)", maxWidth: 300 }}>Scan receipts, track what&apos;s running low, and record sales in seconds — right from the counter.</p></div><div className="step-indicator" aria-hidden="true"><span className="step-dot active"/><span className="step-dot"/><span className="step-dot"/></div></div>;
}
