import { JobName, dispatcher } from "@calid/job-dispatcher";
import { QueueName } from "@calid/queue";

import logger from "@calcom/lib/logger";

const log = logger.getSubLogger({ prefix: ["[setup-whatsapp-template-sync]"] });

const WHATSAPP_TEMPLATE_SYNC_CRON = process.env.WHATSAPP_TEMPLATE_SYNC_CRON ?? "0 * * * *";

/**
 * Sets up the recurring WhatsApp template sync job.
 *
 * This should be called once on app startup.
 * BullMQ persists the repeat configuration in Redis, so it only
 * needs to be called once (survives restarts).
 */
export async function setupWhatsappTemplateSync(): Promise<void> {
  log.info("Setting up WhatsApp template sync recurring job", {
    pattern: WHATSAPP_TEMPLATE_SYNC_CRON,
  });

  try {
    await dispatcher.dispatch({
      queue: QueueName.SCHEDULED,
      name: JobName.WHATSAPP_TEMPLATE_SYNC,
      data: {},
      // No inngestTs needed for cron jobs (not a one-time delayed job)
      bullmqOptions: {
        repeat: {
          pattern: WHATSAPP_TEMPLATE_SYNC_CRON,
          // Optional: specify timezone
          // tz: "UTC",
        },
        attempts: 3, // Inngest retries: 2 → BullMQ attempts: 3
        backoff: {
          type: "exponential",
          delay: 5000,
        },
        removeOnComplete: {
          count: 100,
          age: 86400, // 24 hours
        },
        removeOnFail: {
          count: 1000,
        },
      },
    });

    log.info("WhatsApp template sync recurring job configured successfully");
  } catch (error) {
    log.error("Failed to setup WhatsApp template sync", {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}
