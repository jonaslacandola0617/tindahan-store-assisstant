import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

function source(relative: string) {
  return readFileSync(fileURLToPath(new URL(relative, import.meta.url)), "utf8");
}

describe("release hardening contract", () => {
  it("ships the required browser security policy", () => {
    const config = source("../../../next.config.ts");
    for (const value of ["Content-Security-Policy", "frame-ancestors 'none'", "X-Content-Type-Options", "Permissions-Policy", "Strict-Transport-Security"]) {
      expect(config).toContain(value);
    }
  });

  it("separates liveness from database readiness", () => {
    expect(source("../../app/api/health/route.ts")).toContain('status: "ok"');
    const ready = source("../../app/api/ready/route.ts");
    expect(ready).toContain("SELECT 1");
    expect(ready).toContain("503");
    expect(ready).toContain('"cache-control": "no-store"');
  });

  it("keeps accessibility baselines in the application shell", () => {
    const css = source("../../app/globals.css");
    const shell = source("../../components/app-shell.tsx");
    expect(css).toMatch(/:focus-visible/);
    expect(css).toMatch(/prefers-reduced-motion:\s*reduce/);
    expect(shell).toContain("Skip to content");
  });
});
