import { getCalendarSyncQueue } from "@calid/queue";
import dotenv from "dotenv";
import path from "path";

dotenv.config({
  path: path.resolve(process.cwd(), "../../.env"),
});
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
