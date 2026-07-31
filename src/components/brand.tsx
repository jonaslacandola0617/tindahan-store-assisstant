import Link from "next/link";
import { Icon } from "./icon";

export function Brand({ inverse = false, linked = true }: { inverse?: boolean; linked?: boolean }) {
  const contents = <><span className="brand-glyph" style={inverse ? { background: "rgba(255,255,255,0.16)" } : undefined}><Icon name="store" /></span><span className="brand-word" style={inverse ? { color: "#fff" } : undefined}>Tindahan</span></>;
  return linked
    ? <Link className="brand-mark" href="/dashboard" aria-label="Tindahan home">{contents}</Link>
    : <span className="brand-mark">{contents}</span>;
}
