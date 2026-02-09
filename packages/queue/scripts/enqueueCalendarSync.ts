import { getCalendarSyncQueue } from "@calid/queue";

async function main() {
  const queue = getCalendarSyncQueue();

  const job = await queue.add(
    "calendar-sync-test",
    {
      userId: "test-user-123",
      provider: "google",
      syncType: "full",
    },
    {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 3000,
      },
      removeOnComplete: false,
      removeOnFail: false,
    }
  );

  console.log("📨 Job enqueued:", job.id);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
