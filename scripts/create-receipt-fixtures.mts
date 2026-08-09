import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { deflateSync } from "node:zlib";

const width = 640, height = 960;
const fixtureDir = path.resolve(process.cwd(), "docs", "fixtures", "receipts");
const names = ["receipt-normal.png", "unreadable-receipt.png", "provider-fail.png", "timeout.png"];

await mkdir(fixtureDir, { recursive: true });
const image = pngFixture();
await Promise.all(names.map(name => writeFile(path.join(fixtureDir, name), image)));
console.log(`Created ${names.length} deterministic receipt fixtures in ${fixtureDir}`);

function pngFixture() {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4); ihdr.set([8, 2, 0, 0, 0], 8);
  const stride = width * 3 + 1; const raw = Buffer.alloc(stride * height, 255);
  for (let y = 0; y < height; y++) {
    raw[y * stride] = 0;
    if (y > 100 && y < 760 && y % 74 < 8) for (let x = 84; x < width - 84; x++) raw.fill(70, y * stride + 1 + x * 3, y * stride + 1 + x * 3 + 3);
  }
  return Buffer.concat([signature, chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
}

function chunk(type: string, data: Buffer) { const name = Buffer.from(type); const output = Buffer.alloc(12 + data.length); output.writeUInt32BE(data.length, 0); name.copy(output, 4); data.copy(output, 8); output.writeUInt32BE(crc32(Buffer.concat([name, data])), 8 + data.length); return output; }
function crc32(bytes: Buffer) { let crc = 0xffffffff; for (const byte of bytes) { crc ^= byte; for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0); } return (crc ^ 0xffffffff) >>> 0; }
