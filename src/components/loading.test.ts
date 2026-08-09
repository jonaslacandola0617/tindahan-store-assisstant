import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { InlineLoading, LoadingButtonContent, TindahanLogoLoader, TindahanRouteLoading } from "./loading";
import { loadingCopy, loadingMessages } from "@/modules/i18n/messages";

describe("Tindahan loading system", () => {
  it("keeps English and Filipino loading messages in sync", () => {
    expect(Object.keys(loadingMessages.FIL)).toEqual(Object.keys(loadingMessages.EN));
    expect(loadingCopy("EN", "addingProduct")).toBe("Adding product");
    expect(loadingCopy("FIL", "addingProduct")).toBe("Idinaragdag ang produkto");
  });

  it("renders accessible inline and button pending content", () => {
    const inline = renderToStaticMarkup(createElement(InlineLoading, { message: "Loading products", size: "compact" }));
    const button = renderToStaticMarkup(createElement(LoadingButtonContent, { message: "Saving changes" }));
    expect(inline).toContain('role="status"');
    expect(inline).toContain('aria-busy="true"');
    expect(inline).toContain("loading-icon-compact");
    expect(button).toContain("Saving changes");
    expect(button).toContain("loading-icon");
  });

  it("renders the branded route loader in either language", () => {
    const english = renderToStaticMarkup(createElement(TindahanRouteLoading, { locale: "EN", region: "main" }));
    const filipino = renderToStaticMarkup(createElement(TindahanRouteLoading, { locale: "FIL" }));
    expect(english).toContain("Loading Tindahan");
    expect(english).toContain("route-loading-mark");
    expect(filipino).toContain("Nilo-load ang Tindahan");
    const synchronous = renderToStaticMarkup(createElement(TindahanRouteLoading, { region: "main" }));
    expect(synchronous).toContain("Loading Tindahan");
    expect(synchronous).toContain("Nilo-load ang Tindahan");
    expect(synchronous).toContain("route-loading-label-fil");
  });

  it("preserves the approved storefront geometry as separately animated strokes", () => {
    const logo = renderToStaticMarkup(createElement(TindahanLogoLoader));
    expect(logo).toContain('d="M3.5 9 4.5 4h15l1 5"');
    expect(logo).toContain('d="M4.5 9v10.5h15V9"');
    expect(logo).toContain('d="M9.5 19.5v-6h5v6"');
    expect(logo.match(/tindahan-logo-stroke/g)).toHaveLength(6);
  });

  it("disables loading animation when reduced motion is requested", () => {
    const cssPath = fileURLToPath(new URL("../app/globals.css", import.meta.url));
    const css = readFileSync(cssPath, "utf8");
    expect(css).toMatch(/\.loading-icon[^}]*animation:\s*tindahan-loader-spin 0\.8s linear infinite/);
    expect(css).toMatch(/@keyframes tindahan-loader-spin\s*\{\s*to\s*\{\s*transform:\s*rotate\(360deg\)/);
    expect(css).toContain("tindahan-logo-draw-awning 2.6s");
    expect(css).toContain("tindahan-logo-draw-store 2.6s");
    expect(css).toContain("tindahan-logo-draw-door 2.6s");
    expect(css).toMatch(/prefers-reduced-motion:\s*reduce/);
    expect(css).toMatch(/\.loading-icon\s*\{\s*animation:\s*none/);
    expect(css).toMatch(/\.tindahan-logo-stroke\s*\{\s*animation:\s*none/);
  });
});
