import { dataSyncWorker } from "./workers/dataSync.worker.js";
import { defaultWorker } from "./workers/default.worker.js";
import { scheduledWorker } from "./workers/scheduled.worker.js";

const workers = [defaultWorker, scheduledWorker, dataSyncWorker];

async function start() {
  console.log("🚀 Starting worker process...");
  console.log("Workers are up");
}

start().catch((err) => {
  console.error("❌ Worker failed to start", err);
  process.exit(1);
});

async function shutdown(signal: string) {
  console.log(`🛑 ${signal} received. Gracefully shutting down...`);

  try {
    await Promise.all(workers.map((w) => w.close()));
    console.log("✅ All workers closed gracefully");
    process.exit(0);
  } catch (err) {
    console.error("❌ Error during shutdown", err);
    process.exit(1);
  }
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
