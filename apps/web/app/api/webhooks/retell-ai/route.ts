import { defaultResponderForAppDir } from "app/api/defaultResponderForAppDir";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { Retell } from "retell-sdk";
import { z } from "zod";

import { CreditService } from "@calcom/features/ee/billing/credit-service";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import { prisma } from "@calcom/prisma";

const log = logger.getSubLogger({ prefix: ["retell-ai-webhook"] });

const RetellWebhookSchema = z.object({
  event: z.enum(["call_started", "call_ended", "call_analyzed"]),
  call: z
    .object({
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
      call_cost: z
        .object({
          product_costs: z
            .array(
              z.object({
                product: z.string(),
                unitPrice: z.number().optional(),
                cost: z.number().optional(),
              })
            )
            .optional(),
          total_duration_seconds: z.number().optional(),
          total_duration_unit_price: z.number().optional(),
          total_one_time_price: z.number().optional(),
          combined_cost: z.number().optional(),
        })
        .optional(),
      call_analysis: z
        .object({
          call_summary: z.string().optional(),
          in_voicemail: z.boolean().optional(),
          user_sentiment: z.string().optional(),
          call_successful: z.boolean().optional(),
          custom_analysis_data: z.record(z.any()).optional(),
        })
        .optional(),
    })
    .passthrough(),
});

async function handleCallAnalyzed(callData: any) {
  const { from_number, call_id, call_cost } = callData;
  if (!call_cost || typeof call_cost.combined_cost !== "number") {
    log.error(`No call_cost.combined_cost in payload for call ${call_id}`);
    return;
  }

  const phoneNumber = await prisma.calAiPhoneNumber.findFirst({
    where: { phoneNumber: from_number },
    include: {
      user: { select: { id: true, email: true, name: true } },
      team: { select: { id: true, name: true } },
    },
  });

  if (!phoneNumber) {
    log.error(`No phone number found for ${from_number}, cannot deduct credits`);
    return;
  }

  // Support both personal and team phone numbers
  const userId = phoneNumber.userId;
  const teamId = phoneNumber.teamId;

  if (!userId && !teamId) {
    log.error(`Phone number ${from_number} has no associated user or team`);
    return;
  }

  const baseCost = call_cost.combined_cost;
  // in cents
  const creditsToDeduct = Math.ceil(baseCost * 1.8);

  const creditService = new CreditService();

  await creditService.chargeCredits({
    userId: userId ?? undefined,
    teamId: teamId ?? undefined,
    credits: creditsToDeduct,
    callDuration: call_cost.total_duration_seconds,
  });

  return {
    success: true,
    message: `Successfully charged ${creditsToDeduct} credits for ${
      teamId ? `team ${teamId}` : `user ${userId}`
    }, call ${call_id} (base cost: ${baseCost} cents)`,
  };
}

/**
 * Retell AI Webhook Handler
 *
 * Setup Instructions:
 * 1. Add this webhook URL to your Retell AI dashboard: https://yourdomain.com/api/webhooks/retell-ai
 * 2. Ensure your domain is accessible from the internet (for local development, use ngrok or similar)
 * 3. Set the RETELL_AI_KEY environment variable with your Retell API key (must have webhook badge)
 *
 * This webhook will:
 * - Verify webhook signature for security
 * - Receive call_analyzed events from Retell AI
 * - Charge credits based on the call cost from the user's or team's credit balance
 * - Log all transactions for audit purposes
 */
async function handler(request: NextRequest) {
  const rawBody = await request.text();
  const body = JSON.parse(rawBody);

  // Verify webhook signature
  const signature = request.headers.get("x-retell-signature");
  const apiKey = process.env.RETELL_AI_KEY;

  if (!signature || !apiKey) {
    log.error("Missing signature or API key for webhook verification");
    return NextResponse.json(
      {
        error: "Unauthorized",
        message: "Missing signature or API key",
      },
      { status: 401 }
    );
  }

  if (!Retell.verify(rawBody, apiKey, signature)) {
    log.error("Invalid webhook signature");
    return NextResponse.json(
      {
        error: "Unauthorized",
        message: "Invalid signature",
      },
      { status: 401 }
    );
  }

  if (body.event !== "call_analyzed") {
    return NextResponse.json(
      {
        success: true,
        message: `No handling for ${body.event} for call ${body.call?.call_id ?? "unknown"}`,
      },
      { status: 200 }
    );
  }

  try {
    const payload = RetellWebhookSchema.parse(body);
    const callData = payload.call;
    log.info(`Received Retell AI webhook: ${payload.event} for call ${callData.call_id}`);

    const result = await handleCallAnalyzed(callData);

    return NextResponse.json(
      {
        success: true,
        message: result?.message ?? `Processed ${payload.event} for call ${callData.call_id}`,
      },
      { status: 200 }
    );
  } catch (error) {
    log.error("Error processing Retell AI webhook:", safeStringify(error));
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      // we need to return 200 to retell ai to avoid retries
      { status: 200 }
    );
  }
}

export const POST = defaultResponderForAppDir(handler);
