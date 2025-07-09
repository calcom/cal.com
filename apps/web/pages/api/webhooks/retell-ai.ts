import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";

import { CreditService } from "@calcom/features/ee/billing/credit-service";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import { prisma } from "@calcom/prisma";

const log = logger.getSubLogger({ prefix: ["retell-ai-webhook"] });

const RetellWebhookSchema = z.object({
  event: z.enum(["call_started", "call_ended", "call_analyzed"]),
  call: z.object({
    call_id: z.string(),
    agent_id: z.string().optional(),
    from_number: z.string(),
    to_number: z.string(),
    direction: z.enum(["inbound", "outbound"]),
    call_status: z.string(),
    start_timestamp: z.number(),
    end_timestamp: z.number().optional(),
    disconnection_reason: z.string().optional(),
    metadata: z.record(z.any()).optional(),
    retell_llm_dynamic_variables: z.record(z.any()).optional(),
    transcript: z.string().optional(),
    opt_out_sensitive_data_storage: z.boolean().optional(),
  }),
});

type RetellWebhookPayload = z.infer<typeof RetellWebhookSchema>;

/**
 * Handle call_ended events from Retell AI
 * Charges 1 credit per minute for AI voice calls
 */
async function handleCallEnded(callData: RetellWebhookPayload["call"]) {
  try {
    const { call_id, start_timestamp, end_timestamp, from_number, disconnection_reason } = callData;

    // Skip if call didn't complete properly
    if (!end_timestamp || !start_timestamp) {
      log.warn(`Call ${call_id} missing timestamps, skipping credit deduction`);
      return;
    }

    // Skip if call was cancelled or had an error
    if (disconnection_reason && ["cancelled", "error", "hang_up_by_agent"].includes(disconnection_reason)) {
      log.info(`Call ${call_id} ended with reason: ${disconnection_reason}, skipping credit deduction`);
      return;
    }

    const durationMs = end_timestamp - start_timestamp;
    const durationMinutes = Math.ceil(durationMs / (1000 * 60)); // Round up to nearest minute

    if (durationMinutes <= 0) {
      log.warn(`Call ${call_id} has invalid duration: ${durationMinutes} minutes`);
      return;
    }

    // Find the user associated with this phone number
    const phoneNumber = await prisma.calAiPhoneNumber.findFirst({
      where: {
        phoneNumber: from_number,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    if (!phoneNumber) {
      log.error(`No phone number found for ${from_number}, cannot deduct credits`);
      return;
    }

    const userId = phoneNumber.user.id;
    const creditsToDeduct = durationMinutes; // 1 credit per minute

    const creditService = new CreditService();

    // First check if user has enough credits
    const hasCredits = await creditService.hasAvailableCredits({ userId });

    if (!hasCredits) {
      log.error(
        `User ${userId} has insufficient credits for call ${call_id} (${creditsToDeduct} credits needed)`
      );
      // TODO: Consider sending notification to user about insufficient credits
      return;
    }

    await creditService.chargeCredits({
      userId,
      credits: creditsToDeduct,
      bookingUid: `cal-ai-call-${call_id}`,
    });

    log.info(
      `Successfully charged ${creditsToDeduct} credits for user ${userId}, call ${call_id} (${durationMinutes} minutes)`
    );
  } catch (error) {
    log.error("Error handling call_ended webhook:", safeStringify(error));
    throw error;
  }
}

/**
 * Retell AI Webhook Handler
 *
 * Setup Instructions:
 * 1. Add this webhook URL to your Retell AI dashboard: https://yourdomain.com/api/webhooks/retell-ai
 * 2. Select the "call_ended" event in the Retell AI webhook configuration
 * 3. Ensure your domain is accessible from the internet (for local development, use ngrok or similar)
 *
 * This webhook will:
 * - Receive call_ended events from Retell AI
 * - Calculate call duration in minutes (rounded up)
 * - Charge 1 credit per minute from the user's credit balance
 * - Log all transactions for audit purposes
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Parse and validate webhook payload
    const payload = RetellWebhookSchema.parse(req.body);

    log.info(`Received Retell AI webhook: ${payload.event} for call ${payload.call.call_id}`);

    switch (payload.event) {
      case "call_ended":
        await handleCallEnded(payload.call);
        break;

      default:
        log.warn(`Unhandled webhook event: ${payload.event}`);
    }

    res.status(200).json({
      success: true,
      message: `Processed ${payload.event} for call ${payload.call.call_id}`,
    });
  } catch (error) {
    log.error("Error processing Retell AI webhook:", safeStringify(error));

    res.status(500).json({
      error: "Internal server error",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
