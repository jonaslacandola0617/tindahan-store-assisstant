"use client";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import { Brand } from "./brand";
import { Icon, type IconName } from "./icon";
import { LanguageToggle } from "./language-toggle";
import { ThemeToggle } from "./theme-toggle";
import { dictionary } from "@/modules/i18n/messages";

const routes: { href: string; key: "dashboard"|"inventory"|"sales"|"receipts"|"reports"|"settings"; icon: IconName }[] = [
  { href: "/dashboard", key: "dashboard", icon: "home" }, { href: "/inventory", key: "inventory", icon: "package" },
  { href: "/sales", key: "sales", icon: "bag" }, { href: "/receipts", key: "receipts", icon: "receipt" },
  { href: "/reports", key: "reports", icon: "chart" }, { href: "/settings", key: "settings", icon: "sliders" },
];

export function AppShell({ children, storeName, role, locale }: { children: React.ReactNode; storeName: string; role: string; locale: "EN"|"FIL" }) {
  const pathname = usePathname(); const copy = dictionary(locale);
  const active = routes.find((route) => pathname.startsWith(route.href)) ?? routes[0]!;
  return <><a className="skip-link" href="#main">Skip to content</a><div className="app-shell"><aside className="sidebar"><div className="sidebar-header"><Brand/></div><nav className="sidebar-nav" aria-label="Primary">{routes.map((route) => <Link key={route.href} className={`nav-item${active.href === route.href ? " active" : ""}`} href={route.href}><Icon name={route.icon}/><span className="nav-label">{copy[route.key]}</span>{route.key === "inventory" && <span className="badge badge-warning nav-badge">6</span>}{route.key === "receipts" && <span className="badge badge-info nav-badge">1</span>}</Link>)}</nav><div className="sidebar-footer"><div className="sidebar-store"><span className="avatar">{storeName.split(/\s+/).slice(0,2).map(word => word[0]).join("").toUpperCase()}</span><span style={{ minWidth: 0 }}><span className="sidebar-store-name" style={{ display: "block" }}>{storeName}</span><span className="sidebar-store-role">{role === "OWNER" ? "Owner" : "Staff"}</span></span></div><button className="nav-item shell-signout" type="button" onClick={() => signOut({ callbackUrl: "/sign-in" })}><Icon name="logout"/><span className="nav-label">{copy.signOut}</span></button></div></aside><div className="main-col"><header className="topbar"><div className="topbar-left"><h1 className="topbar-title">{copy[active.key]}</h1></div><Link className="topbar-search" href="/search"><Icon name="search"/><span className="topbar-search-text">{copy.search}</span><span className="kbd">/</span></Link><div className="topbar-right"><LanguageToggle locale={locale}/><ThemeToggle/><Link className="btn-icon btn-ghost" href="/notifications" aria-label={copy.notifications} style={{ position: "relative" }}><Icon name="bell"/><span className="badge badge-danger" style={{ position: "absolute", top: 4, right: 4, padding: "1px 5px", fontSize: 10 }}>3</span></Link></div></header><main className="content" id="main">{children}</main></div></div><nav className="mobile-nav" aria-label="Primary"><Link className={`mobile-nav-item${active.key === "dashboard" ? " active" : ""}`} href="/dashboard"><Icon name="home"/><span>Home</span></Link><Link className={`mobile-nav-item${active.key === "inventory" ? " active" : ""}`} href="/inventory"><Icon name="package"/><span>Stock</span></Link><Link className="mobile-nav-fab" href="/receipt-upload" aria-label="Scan receipt"><Icon name="camera"/></Link><Link className={`mobile-nav-item${active.key === "sales" ? " active" : ""}`} href="/sales"><Icon name="bag"/><span>Sales</span></Link><Link className="mobile-nav-item" href="/notifications"><Icon name="bell"/><span>Alerts</span></Link></nav></>;
}
