import { Icon } from "@/components/icon";
import { loadingCopy, type Locale } from "@/modules/i18n/messages";

export function LoadingIcon({ size = "standard", className = "" }: { size?: "compact" | "standard"; className?: string }) {
  return <Icon name="loader" className={`loading-icon tindahan-loading-icon loading-icon-${size}${className ? ` ${className}` : ""}`}/>;
}

export function InlineLoading({ message, size = "standard", announce = true, className = "" }: { message: string; size?: "compact" | "standard"; announce?: boolean; className?: string }) {
  return <span className={`inline-loading inline-loading-${size}${className ? ` ${className}` : ""}`} role={announce ? "status" : undefined} aria-live={announce ? "polite" : undefined} aria-busy="true"><LoadingIcon size={size}/><span>{message}</span></span>;
}

export function SectionLoading({ message, compact = false }: { message: string; compact?: boolean }) {
  return <div className={`section-loading${compact ? " section-loading-compact" : ""}`} role="status" aria-live="polite" aria-busy="true"><InlineLoading message={message} announce={false}/></div>;
}

export function LoadingButtonContent({ message }: { message: string }) {
  return <><LoadingIcon size="compact"/><span>{message}</span></>;
}

export function TindahanLogoLoader() {
  return <svg className="tindahan-logo-loader" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path className="tindahan-logo-stroke tindahan-logo-stroke-awning" pathLength="25.2" d="M3.5 9 4.5 4h15l1 5"/>
    <path className="tindahan-logo-stroke tindahan-logo-stroke-store" pathLength="36" d="M4.5 9v10.5h15V9"/>
    <path className="tindahan-logo-stroke tindahan-logo-stroke-door" pathLength="17" d="M9.5 19.5v-6h5v6"/>
  </svg>;
}

export function TindahanRouteLoading({ locale, region = "viewport" }: { locale?: Locale; region?: "viewport" | "main" }) {
  return <div className={`route-loading route-loading-${region}`} role="status" aria-live="polite" aria-busy="true"><span className="route-loading-mark"><TindahanLogoLoader/></span>{locale ? <span className="route-loading-label">{loadingCopy(locale, "tindahan")}</span> : <><span className="route-loading-label route-loading-label-en">{loadingCopy("EN", "tindahan")}</span><span className="route-loading-label route-loading-label-fil">{loadingCopy("FIL", "tindahan")}</span></>}</div>;
}
