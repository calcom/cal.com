import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import { z } from "zod";

const log = logger.getSubLogger({ prefix: ["cancelProrationReminder"] });

export const cancelProrationReminderPayloadSchema = z.object({
  prorationId: z.string(),
});

export async function cancelProrationReminder(payload: string): Promise<void> {
  try {
    const { prorationId } = cancelProrationReminderPayloadSchema.parse(JSON.parse(payload));

    log.debug(`Processing cancelProrationReminder task for prorationId ${prorationId}`);

    const { default: tasker } = await import("@calcom/features/tasker");

    await tasker.cancelWithReference(`proration-reminder-${prorationId}`, "sendProrationReminderEmail");

    log.debug(`Successfully cancelled proration reminder for prorationId ${prorationId}`);
  } catch (error) {
    log.warn(
      `Failed to cancel proration reminder`,
      safeStringify({ payload, error: error instanceof Error ? error.message : String(error) })
    );
    // Don't throw - cancellation failure is non-critical
  }
}
