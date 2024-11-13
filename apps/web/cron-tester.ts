import { CronJob } from "cron";

async function fetchCron(endpoint: string) {
  const apiKey = process.env.CRON_API_KEY;

  const res = await fetch(`http://localhost:3000/api${endpoint}?${apiKey}`, {
    headers: {
      "Content-Type": "application/json",
      authorization: `Bearer ${process.env.CRON_SECRET}`,
    },
  });
  const json = await res.json();
  console.log(endpoint, json);
}

try {
  console.log("⏳ Running cron endpoints");
  new CronJob(
    // Each 5 seconds
    "*/5 * * * * *",
    async function () {
      await Promise.allSettled([
        fetchCron("/tasks/cron"),
        // fetchCron("/cron/calVideoNoShowWebhookTriggers"),
        //
        // fetchCron("/tasks/cleanup"),
      ]);
    },
    null,
    true,
    "America/Los_Angeles"
  );
} catch (_err) {
  console.error("❌ ❌ ❌ Something went wrong ❌ ❌ ❌");
  process.exit(1);
}
