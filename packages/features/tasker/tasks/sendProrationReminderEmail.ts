import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import { z } from "zod";

const log = logger.getSubLogger({ prefix: ["sendProrationReminderEmail"] });

export const sendProrationReminderEmailPayloadSchema = z.object({
  prorationId: z.string(),
  teamId: z.number(),
});

export async function sendProrationReminderEmail(payload: string): Promise<void> {
  try {
    const { prorationId, teamId } = sendProrationReminderEmailPayloadSchema.parse(JSON.parse(payload));

    log.debug(`Processing sendProrationReminderEmail task for prorationId ${prorationId}, teamId ${teamId}`);

    const { ProrationEmailService } = await import(
      "@calcom/features/ee/billing/service/proration/ProrationEmailService"
    );

    const emailService = new ProrationEmailService();
    await emailService.sendReminderEmail({ prorationId, teamId });
  } catch (error) {
    log.error(
      `Failed to send proration reminder email`,
      safeStringify({ payload, error: error instanceof Error ? error.message : String(error) })
    );
    throw error;
  }
}
