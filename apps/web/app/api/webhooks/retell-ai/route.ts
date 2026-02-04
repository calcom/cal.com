import { defaultResponderForAppDir } from "app/api/defaultResponderForAppDir";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { Retell } from "retell-sdk";
import { z } from "zod";

import { PrismaAgentRepository } from "@calcom/features/calAIPhone/repositories/PrismaAgentRepository";
import { PrismaPhoneNumberRepository } from "@calcom/features/calAIPhone/repositories/PrismaPhoneNumberRepository";
import { CreditService } from "@calcom/features/ee/billing/credit-service";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import { prisma } from "@calcom/prisma";
import { CreditUsageType } from "@calcom/prisma/enums";

const log = logger.getSubLogger({ prefix: ["retell-ai-webhook"] });

const RetellWebhookSchema = z.object({
  event: z.enum(["call_started", "call_ended", "call_analyzed"]),
  call: z
    .object({
      call_id: z.string(),
      agent_id: z.string().optional(),
      // Make phone fields optional for web calls
      from_number: z.string().optional(),
      to_number: z.string().optional(),
      direction: z.enum(["inbound", "outbound"]).optional(),
      call_type: z.string().optional(),
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

type RetellCallData = z.infer<typeof RetellWebhookSchema>["call"];

async function chargeCreditsForCall({
  userId,
  teamId,
  callCost,
  callId,
  callDuration,
}: {
  userId?: number;
  teamId?: number;
  callCost: number;
  callId: string;
  callDuration: number;
}) {
  const rawRatePerMinute = process.env.CAL_AI_CALL_RATE_PER_MINUTE ?? "0.29";
  const ratePerMinute = Number.parseFloat(rawRatePerMinute);
  const safeRatePerMinute = Number.isFinite(ratePerMinute) && ratePerMinute > 0 ? ratePerMinute : 0.29;

  const durationInMinutes = callDuration / 60;
  const calculatedCallCost = durationInMinutes * safeRatePerMinute;
  // Convert to cents and round up to ensure we don't undercharge
  const creditsToDeduct = Math.ceil(calculatedCallCost * 100);

  const creditService = new CreditService();

  try {
    await creditService.chargeCredits({
      userId: userId ?? undefined,
      teamId: teamId ?? undefined,
      credits: creditsToDeduct,
      callDuration: callDuration,
      creditFor: CreditUsageType.CAL_AI_PHONE_CALL,
      externalRef: `retell:${callId}`,
    });

    return {
      success: true,
      message: `Successfully charged ${creditsToDeduct} credits (${callDuration}s at $${safeRatePerMinute}/min) for ${
        teamId ? `team:${teamId}` : ""
      } ${userId ? `user:${userId}` : ""}, call ${callId}`,
    };
  } catch (e) {
    log.error("Error charging credits for Retell AI call", {
      error: e,
      call_id: callId,
      call_cost: callCost,
      userId,
      teamId,
    });
    return {
      success: false,
      message: `Error charging credits for Retell AI call: ${
        e instanceof Error ? e.message : "Unknown error"
      }`,
    };
  }
}

async function handleCallAnalyzed(callData: RetellCallData) {
  const { from_number, call_id, call_cost, call_type, agent_id } = callData;

  if (
    !call_cost ||
    typeof call_cost.total_duration_seconds !== "number" ||
    !Number.isFinite(call_cost.total_duration_seconds) ||
    call_cost.total_duration_seconds <= 0
  ) {
    log.info(
      `Invalid or missing call_cost.total_duration_seconds for call ${call_id}: ${safeStringify(call_cost)}`
    );
    return {
      success: true,
      message: `Invalid or missing call_cost.total_duration_seconds for call ${call_id}`,
    };
  }

  let userId: number | undefined;
  let teamId: number | undefined;

  // Handle web calls vs phone calls
  if (call_type === "web_call" || !from_number) {
    if (!agent_id) {
      log.error(`Web call ${call_id} missing agent_id, cannot charge credits`);
      return {
        success: false,
        message: `Web call ${call_id} missing agent_id, cannot charge credits`,
      };
    }

    const agentRepo = new PrismaAgentRepository(prisma);
    const agent = await agentRepo.findByProviderAgentId({
      providerAgentId: agent_id,
    });

    if (!agent) {
      log.error(`No agent found for providerAgentId ${agent_id}, call ${call_id}`);
      return {
        success: false,
        message: `No agent found for providerAgentId ${agent_id}, call ${call_id}`,
      };
    }

    userId = agent.userId ?? undefined;
    teamId = agent.team?.parentId ?? agent.teamId ?? undefined;

    log.info(`Processing web call ${call_id} for agent ${agent_id}, user ${userId}, team ${teamId}`);
  } else {
    const phoneNumberRepo = new PrismaPhoneNumberRepository(prisma);
    const phoneNumber = await phoneNumberRepo.findByPhoneNumber({
      phoneNumber: from_number,
    });

    if (!phoneNumber) {
      const msg = `No phone number found for ${from_number}, call ${call_id}`;
      log.error(msg);
      return { success: false, message: msg };
    }

    userId = phoneNumber.userId ?? undefined;
    teamId = phoneNumber.team?.parentId ?? phoneNumber.teamId ?? undefined;

    log.info(`Processing phone call ${call_id} from ${from_number}, user ${userId}, team ${teamId}`);
  }

  if (!userId && !teamId) {
    log.error(`Call ${call_id} has no associated user or team`);
    return {
      success: false,
      message: `Call ${call_id} has no associated user or team`,
    };
  }

  return await chargeCreditsForCall({
    userId,
    teamId,
    callCost: call_cost.combined_cost || 0,
    callId: call_id,
    callDuration: call_cost.total_duration_seconds,
  });
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

    // Skip inbound calls (only for phone calls, web calls don't have direction)
    if (callData.direction === "inbound") {
      return NextResponse.json(
        {
          success: true,
          message: `Inbound calls are not charged or supported for now. Ignoring call ${callData.call_id}`,
        },
        { status: 200 }
      );
    }

    log.info(`Received Retell AI webhook: ${payload.event} for call ${callData.call_id}`, {
      call_id: callData.call_id,
    });

    const result = await handleCallAnalyzed(callData);

    return NextResponse.json(
      {
        success: result?.success ?? true,
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
