"use client";
import Link from "next/link";
import { useState } from "react";
import { signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import { Brand } from "./brand";
import { Icon, type IconName } from "./icon";
import { LanguageToggle } from "./language-toggle";
import { ThemeToggle } from "./theme-toggle";
import { dictionary } from "@/modules/i18n/messages";

const routes: {
  href: string;
  key:
    | "dashboard"
    | "inventory"
    | "sales"
    | "receipts"
    | "reports"
    | "settings";
  icon: IconName;
}[] = [
  { href: "/dashboard", key: "dashboard", icon: "home" },
  { href: "/inventory", key: "inventory", icon: "package" },
  { href: "/sales", key: "sales", icon: "bag" },
  { href: "/receipts", key: "receipts", icon: "receipt" },
  { href: "/reports", key: "reports", icon: "chart" },
  { href: "/settings", key: "settings", icon: "sliders" },
];

export function AppShell({
  children,
  storeName,
  role,
  locale,
  inventoryAttention = 0,
  receiptAttention = 0,
  notificationAttention = 0,
}: {
  children: React.ReactNode;
  storeName: string;
  role: string;
  locale: "EN" | "FIL";
  inventoryAttention?: number;
  receiptAttention?: number;
  notificationAttention?: number;
}) {
  const pathname = usePathname();
  const copy = dictionary(locale);
  const [collapsed, setCollapsed] = useState(false);
  const active =
    routes.find((route) => pathname.startsWith(route.href)) ?? routes[0]!;
  const contextualTitle = pathname === "/search"
    ? locale === "FIL" ? "Maghanap" : "Search"
    : pathname === "/notifications"
      ? locale === "FIL" ? "Mga Abiso" : "Notifications"
      : pathname === "/sales/new"
    ? locale === "FIL" ? "Itala ang benta" : "Record a sale"
    : /^\/sales\/[^/]+$/.test(pathname)
      ? locale === "FIL" ? "Detalye ng benta" : "Sale details"
      : pathname === "/receipts/new"
        ? locale === "FIL" ? "I-scan ang resibo" : "Scan a receipt"
        : /^\/receipts\/[^/]+\/review$/.test(pathname)
          ? locale === "FIL" ? "Suriin ang resibo" : "Review receipt"
          : /^\/receipts\/[^/]+$/.test(pathname)
            ? locale === "FIL" ? "Detalye ng resibo" : "Receipt details"
            : copy[active.key];
  const mobile =
    locale === "FIL"
      ? {
          home: "Buod",
          stock: "Stock",
          sales: "Benta",
          alerts: "Abiso",
          scan: "I-scan ang resibo",
          skip: "Lumaktaw sa nilalaman",
          owner: "May-ari",
        }
      : {
          home: "Home",
          stock: "Stock",
          sales: "Sales",
          alerts: "Alerts",
          scan: "Scan receipt",
          skip: "Skip to content",
          owner: "Owner",
        };
  return (
    <>
      <a className="skip-link" href="#main">
        {mobile.skip}
      </a>
      <div className={`app-shell${collapsed ? " is-collapsed" : ""}`}>
        <aside className="sidebar">
          <div className="sidebar-header">
            <Brand />
            <button
              className="sidebar-collapse-btn"
              type="button"
              aria-label={
                locale === "FIL" ? "Paliitin ang sidebar" : "Collapse sidebar"
              }
              aria-expanded={!collapsed}
              onClick={() => setCollapsed(true)}
            >
              <Icon name="chevronsUpDown" />
            </button>
          </div>
          <nav className="sidebar-nav" aria-label="Primary">
            {routes.map((route) => (
              <Link
                key={route.href}
                className={`nav-item${active.href === route.href ? " active" : ""}`}
                href={route.href}
              >
                <Icon name={route.icon} />
                <span className="nav-label">{copy[route.key]}</span>
                {route.key === "inventory" && inventoryAttention > 0 && (
                  <span className="badge badge-warning nav-badge">
                    {inventoryAttention}
                  </span>
                )}
                {route.key === "receipts" && receiptAttention > 0 && (
                  <span className="badge badge-info nav-badge">{receiptAttention}</span>
                )}
              </Link>
            ))}
          </nav>
          <button
            className="sidebar-expand-btn"
            type="button"
            aria-label={
              locale === "FIL" ? "Palakihin ang sidebar" : "Expand sidebar"
            }
            aria-expanded={!collapsed}
            onClick={() => setCollapsed(false)}
          >
            <Icon name="menu" />
          </button>
          <div className="sidebar-footer">
            <div className="sidebar-store">
              <span className="avatar">
                {storeName
                  .split(/\s+/)
                  .slice(0, 2)
                  .map((word) => word[0])
                  .join("")
                  .toUpperCase()}
              </span>
              <span style={{ minWidth: 0 }}>
                <span
                  className="sidebar-store-name"
                  style={{ display: "block" }}
                >
                  {storeName}
                </span>
                <span className="sidebar-store-role">
                  {role === "OWNER" ? mobile.owner : "Staff"}
                </span>
              </span>
            </div>
            <button
              className="nav-item shell-signout"
              type="button"
              onClick={() => signOut({ callbackUrl: "/sign-in" })}
            >
              <Icon name="logout" />
              <span className="nav-label">{copy.signOut}</span>
            </button>
          </div>
        </aside>
        <div className="main-col">
          <header className="topbar">
            <div className="topbar-left">
              <h1 className="topbar-title">{contextualTitle}</h1>
            </div>
            <Link className="topbar-search" href="/search">
              <Icon name="search" />
              <span className="topbar-search-text">{copy.search}</span>
              <span className="kbd">/</span>
            </Link>
            <div className="topbar-right">
              <LanguageToggle locale={locale} />
              <ThemeToggle />
              <Link
                className="btn-icon btn-ghost shell-notification-link"
                href="/notifications"
                aria-label={copy.notifications}
              >
                <Icon name="bell" />
                {notificationAttention > 0 && <span className="badge badge-danger shell-notification-badge">{Math.min(notificationAttention, 99)}</span>}
              </Link>
            </div>
          </header>
          <main className="content" id="main">
            {children}
          </main>
        </div>
      </div>
      <nav className="mobile-nav" aria-label="Primary">
        <Link
          className={`mobile-nav-item${active.key === "dashboard" ? " active" : ""}`}
          href="/dashboard"
        >
          <Icon name="home" />
          <span>{mobile.home}</span>
        </Link>
        <Link
          className={`mobile-nav-item${active.key === "inventory" ? " active" : ""}`}
          href="/inventory"
        >
          <Icon name="package" />
          <span>{mobile.stock}</span>
        </Link>
        <Link
          className="mobile-nav-fab"
          href="/receipts/new"
          aria-label={mobile.scan}
        >
          <Icon name="camera" />
        </Link>
        <Link
          className={`mobile-nav-item${active.key === "sales" ? " active" : ""}`}
          href="/sales"
        >
          <Icon name="bag" />
          <span>{mobile.sales}</span>
        </Link>
        <Link className={`mobile-nav-item${pathname.startsWith("/notifications") ? " active" : ""}`} href="/notifications">
          <Icon name="bell" />
          <span>{mobile.alerts}</span>
          {notificationAttention > 0 && <span className="badge badge-danger mobile-alert-badge">{Math.min(notificationAttention, 99)}</span>}
        </Link>
      </nav>
    </>
  );
}
