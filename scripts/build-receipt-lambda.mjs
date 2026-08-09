import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";
import { zipSync } from "fflate";

const outputDirectory = path.resolve("dist/lambda");
const bundlePath = path.join(outputDirectory, "index.mjs");
const packagePath = path.join(outputDirectory, "tindahan-receipt-worker.zip");

await rm(outputDirectory, { recursive: true, force: true });
await mkdir(outputDirectory, { recursive: true });
await build({
  entryPoints: [path.resolve("src/lambda/receipt-worker.ts")],
  outfile: bundlePath,
  bundle: true,
  platform: "node",
  format: "esm",
  banner: { js: "import { createRequire as __createRequire } from 'node:module'; const require = __createRequire(import.meta.url);" },
  target: "node22",
  packages: "bundle",
  minify: false,
  sourcemap: false,
  legalComments: "none",
  treeShaking: true,
  logLevel: "warning",
});

const bundle = new Uint8Array(await readFile(bundlePath));
await writeFile(packagePath, zipSync({ "index.mjs": bundle }, { level: 9 }));
const packagedHandler = await import(`${pathToFileURL(bundlePath).href}?verification=${Date.now()}`);
if (typeof packagedHandler.handler !== "function") throw new Error("Lambda bundle does not export index.handler.");

console.log("Lambda handler: index.handler");
console.log("Lambda package: dist/lambda/tindahan-receipt-worker.zip");
