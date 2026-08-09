import { database } from "../src/platform/persistence/prisma";
import { runReceiptPollingWorker } from "../src/modules/receipts/application/receipt-worker-runtime";

async function main() {
  await runReceiptPollingWorker({ once: process.argv.includes("--once") });
}

main()
  .catch((error: unknown) => { console.error("Receipt worker failed.", error); process.exitCode = 1; })
  .finally(async () => database().$disconnect());
