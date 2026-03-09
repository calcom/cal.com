import dotenv from "dotenv";
import fs from "fs";
import path from "path";

type ClosableWorker = {
  close: () => Promise<void>;
};

let workers: ClosableWorker[] = [];

function findEnvFile(startDir: string): string | null {
  let currentDir = path.resolve(startDir);

  while (true) {
    const envPath = path.join(currentDir, ".env");
    if (fs.existsSync(envPath)) {
      return envPath;
    }

    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) {
      return null;
    }

    currentDir = parentDir;
  }
}

function loadRootEnv() {
  const searchDirs = [process.cwd(), __dirname];

  for (const dir of searchDirs) {
    const envPath = findEnvFile(dir);
    if (!envPath) continue;

    dotenv.config({ path: envPath });
    console.log(`📦 Loaded environment from ${envPath}`);
    return;
  }

  console.warn("⚠️ No .env file found for worker bootstrap");
}

async function start() {
  loadRootEnv();

  const [{ dataSyncWorker }, { defaultWorker }, { scheduledWorker }] = await Promise.all([
    import("./workers/dataSync.worker.js"),
    import("./workers/default.worker.js"),
    import("./workers/scheduled.worker.js"),
  ]);

  workers = [defaultWorker, scheduledWorker, dataSyncWorker];

  console.log("🚀 Starting worker process...");
  console.log("Workers are up");
}

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

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));

start().catch((err) => {
  console.error("❌ Worker failed to start", err);
  process.exit(1);
});
