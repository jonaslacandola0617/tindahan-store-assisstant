import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: {
    environment: "node",
    testTimeout: 30_000,
    hookTimeout: 60_000,
    include: ["src/**/*.test.ts"],
    setupFiles: [fileURLToPath(new URL("./src/test/setup-environment.ts", import.meta.url))]
  }
});
