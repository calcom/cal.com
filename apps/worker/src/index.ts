async function start() {
  console.log("🚀 Starting worker process...");

  // Import workers (side-effect imports)
  //as soon as they are imported in the entrypoint they start consuming the jobs enqueued
  await import("./workers/default.worker.js");
  await import("./workers/scheduled.worker.js");
  await import("./workers/dataSync.worker.js");
  // responsible for health checks
  console.log("Workers are up");
}

start().catch((err) => {
  console.error("❌ Worker failed to start", err);
  process.exit(1);
});

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("🛑 SIGTERM received. Shutting down workers...");
  process.exit(0);
});

process.on("SIGINT", async () => {
  console.log("🛑 SIGINT received. Shutting down workers...");
  process.exit(0);
});
