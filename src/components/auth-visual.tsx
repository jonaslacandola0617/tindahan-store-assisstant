import { Brand } from "./brand";
import { dictionary, type Locale } from "@/modules/i18n/messages";

export function AuthVisual({ locale }: { locale: Locale }) {
  const copy = dictionary(locale);
  return <div className="standalone-visual"><div><Brand inverse linked={false}/></div><div><h2 style={{ color: "#fff", fontSize: "var(--text-2xl)", maxWidth: 320, lineHeight: 1.3 }}>{copy.authTagline}</h2><p style={{ color: "rgba(255,255,255,0.78)", marginTop: "var(--space-3)", maxWidth: 300 }}>{copy.authDescription}</p></div><div className="step-indicator" aria-hidden="true"><span className="step-dot active"/><span className="step-dot"/><span className="step-dot"/></div></div>;
}
