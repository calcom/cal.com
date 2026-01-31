import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import { z } from "zod";

const log = logger.getSubLogger({ prefix: ["sendProrationInvoiceEmail"] });

export const sendProrationInvoiceEmailPayloadSchema = z.object({
  prorationId: z.string(),
  teamId: z.number(),
  isAutoCharge: z.boolean(),
});

export async function sendProrationInvoiceEmail(payload: string): Promise<void> {
  try {
    const { prorationId, teamId, isAutoCharge } = sendProrationInvoiceEmailPayloadSchema.parse(
      JSON.parse(payload)
    );

    log.debug(`Processing sendProrationInvoiceEmail task for prorationId ${prorationId}, teamId ${teamId}`);

    const { ProrationEmailService } = await import(
      "@calcom/features/ee/billing/service/proration/ProrationEmailService"
    );

    const emailService = new ProrationEmailService();
    await emailService.sendInvoiceEmail({ prorationId, teamId, isAutoCharge });
  } catch (error) {
    log.error(
      `Failed to send proration invoice email`,
      safeStringify({ payload, error: error instanceof Error ? error.message : String(error) })
    );
    throw error;
  }
}
