import Link from "next/link";
import { Icon } from "./icon";

export function Brand({ inverse = false }: { inverse?: boolean }) {
  return <Link className="brand-mark" href="/dashboard" aria-label="Tindahan home"><span className="brand-glyph" style={inverse ? { background: "rgba(255,255,255,.16)" } : undefined}><Icon name="store" /></span><span className="brand-word" style={inverse ? { color: "#fff" } : undefined}>Tindahan</span></Link>;
}
