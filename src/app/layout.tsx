/* eslint-disable @next/next/no-page-custom-font -- the prototype's exact Google Fonts request is the visual contract. */
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { ThemeRuntime } from "@/components/theme-runtime";
import type { ThemePreference } from "@/components/theme-preference";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Tindahan", template: "%s · Tindahan" },
  description: "A store operating assistant for small neighborhood stores.",
  robots: { index: false, follow: false, nocache: true },
  icons: {
    icon: "data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22><rect width=%2224%22 height=%2224%22 rx=%226%22 fill=%22%231B4D3E%22/><path d=%22M4.5 9 5.5 5h13l1 4%22 stroke=%22white%22 stroke-width=%222%22 fill=%22none%22 stroke-linecap=%22round%22/><path d=%22M5.5 9v9.5h13V9%22 stroke=%22white%22 stroke-width=%222%22 fill=%22none%22 stroke-linecap=%22round%22/></svg>",
  },
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const cookieStore = await cookies();
  const locale = cookieStore.get("tindahan-language")?.value === "FIL" ? "fil" : "en";
  const storedTheme = cookieStore.get("tindahan-theme")?.value;
  const themePreference: ThemePreference = storedTheme === "DARK" || storedTheme === "LIGHT" ? storedTheme : "SYSTEM";
  const initialTheme = themePreference === "DARK" ? "dark" : "light";
  return (
    <html lang={locale} data-theme={initialTheme} data-theme-preference={themePreference} style={{ colorScheme: initialTheme }} suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&family=DM+Sans:wght@400;500&display=swap" rel="stylesheet" />
      </head>
      <body><ThemeRuntime preference={themePreference}/>{children}</body>
    </html>
  );
}
