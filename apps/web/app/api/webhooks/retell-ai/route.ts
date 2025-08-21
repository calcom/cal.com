import { defaultResponderForAppDir } from "app/api/defaultResponderForAppDir";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { Retell } from "retell-sdk";
import { z } from "zod";

import { CreditService } from "@calcom/features/ee/billing/credit-service";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import { PrismaPhoneNumberRepository } from "@calcom/lib/server/repository/PrismaPhoneNumberRepository";

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

/**
 * Process a `call_analyzed` webhook payload: validate duration, resolve the originating phone number, compute cost, and charge credits.
 *
 * Expects `callData` to contain at least `{ from_number, call_id, call_cost }` where `call_cost.total_duration_seconds` is a positive finite number.
 *
 * @param callData - The parsed webhook call object (should include `from_number`, `call_id`, and a `call_cost` with `total_duration_seconds`).
 * @returns An object `{ success: boolean, message: string }` on successful charge or when charging fails; returns `undefined` if validation fails or the call cannot be processed (e.g., missing phone record or owner).
 */
async function handleCallAnalyzed(callData: any) {
  const { from_number, call_id, call_cost } = callData;
  if (
    !call_cost ||
    typeof call_cost.total_duration_seconds !== "number" ||
    !Number.isFinite(call_cost.total_duration_seconds) ||
    call_cost.total_duration_seconds <= 0
  ) {
    log.error(
      `Invalid or missing call_cost.total_duration_seconds for call ${call_id}: ${safeStringify(call_cost)}`
    );
    return;
  }

  const phoneNumber = await PrismaPhoneNumberRepository.findByPhoneNumber({ phoneNumber: from_number });

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

  const rawRatePerMinute = process.env.CAL_AI_CALL_RATE_PER_MINUTE ?? "0.29";
  const ratePerMinute = Number.parseFloat(rawRatePerMinute);
  const safeRatePerMinute = Number.isFinite(ratePerMinute) && ratePerMinute > 0 ? ratePerMinute : 0.29;

  const durationInMinutes = call_cost.total_duration_seconds / 60;
  const callCost = durationInMinutes * safeRatePerMinute;
  // Convert to cents and round up to ensure we don't undercharge
  const creditsToDeduct = Math.ceil(callCost * 100);

  const creditService = new CreditService();

  try {
    await creditService.chargeCredits({
      userId: userId ?? undefined,
      teamId: teamId ?? undefined,
      credits: creditsToDeduct,
      callDuration: call_cost.total_duration_seconds,
      externalRef: `retell:${call_id}`,
    });
  } catch (e) {
    log.error("Error charging credits for Retell AI call", {
      error: e,
      call_id,
      call_cost,
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

  return {
    success: true,
    message: `Successfully charged ${creditsToDeduct} credits (${
      call_cost.total_duration_seconds
    }s at $${safeRatePerMinute}/min) for ${teamId ? `team:${teamId}` : ""} ${
      userId ? `user:${userId}` : ""
    }, call ${call_id}`,
  };
}

/**
 * Next.js POST handler for Retell AI webhooks.
 *
 * Verifies the Retell webhook signature, accepts only `call_analyzed` events for outbound calls,
 * and delegates charging to `handleCallAnalyzed`. Inbound calls and non-`call_analyzed` events are
 * ignored and return 200. Signature or API key failures return 401.
 *
 * Configuration:
 * - Register this endpoint in your Retell AI dashboard (e.g. https://yourdomain.com/api/webhooks/retell-ai).
 * - Set RETELL_AI_KEY to the Retell webhook secret used to verify `x-retell-signature`.
 *
 * Responses:
 * - 401 when the signature or RETELL_AI_KEY is missing/invalid.
 * - 200 for ignored events (non-`call_analyzed`), inbound calls, successful processing, and internal
 *   errors (internal errors return 200 intentionally to prevent Retell from retrying).
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
    if (callData.direction === "inbound") {
      return NextResponse.json(
        {
          success: true,
          message: `Inbound calls are not charged or supported for now. Ignoring call ${callData.call_id}`,
        },
        { status: 200 }
      );
    }

    log.info(`Received Retell AI webhook: ${payload.event} for call ${callData.call_id}`);

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
