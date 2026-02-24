import type { WorkflowContext } from "@calid/job-dispatcher";

import { createWebhookSignature, jsonParse } from "@calcom/features/webhooks/lib/sendPayload";
import logger from "@calcom/lib/logger";
import type { PrismaClient } from "@calcom/prisma";

import type { TriggerScheduledWebhookData } from "./type";

const log = logger.getSubLogger({ prefix: ["[trigger-scheduled-webhook]"] });

// ─────────────────────────────────────────────────────────────────────────
// Error hierarchy
// ─────────────────────────────────────────────────────────────────────────

export class WebhookTriggerError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = "WebhookTriggerError";
  }
}

export class WebhookNotFoundError extends Error {
  constructor(id: number) {
    super(`Scheduled webhook job with id ${id} not found`);
    this.name = "WebhookNotFoundError";
  }
}

export class WebhookRejectedError extends Error {
  constructor(public readonly status: number, public readonly webhookId: number) {
    super(`Webhook rejected with status ${status}`);
    this.name = "WebhookRejectedError";
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Data types
// ─────────────────────────────────────────────────────────────────────────

export interface TriggerScheduledWebhookResult {
  success: boolean;
}

// ─────────────────────────────────────────────────────────────────────────
// Service implementation with workflow context
// ─────────────────────────────────────────────────────────────────────────

export async function triggerScheduledWebhookService(
  data: TriggerScheduledWebhookData,
  prisma: PrismaClient,
  ctx: WorkflowContext
): Promise<TriggerScheduledWebhookResult> {
  ctx.log(`Triggering scheduled webhook for id: ${data.id}`, "info");

  // ── Step 1: Fetch webhook job from database ─────────────────────────────
  const job = await ctx.run("fetch-webhook-job", async () => {
    const result = await prisma.webhookScheduledTriggers.findFirst({
      where: { id: data.id },
      select: {
        id: true,
        jobName: true,
        payload: true,
        subscriberUrl: true,
        webhook: {
          select: { secret: true },
        },
      },
    });

    if (!result) {
      throw new WebhookNotFoundError(data.id);
    }

    ctx.log(`Fetched webhook job: ${result.subscriberUrl}`, "info");
    return result;
  });

  // ── Step 2: Resolve webhook secret (support legacy jobs) ────────────────
  const webhook = await ctx.run("resolve-webhook-secret", async () => {
    if (job.webhook) {
      ctx.log("Using webhook secret from relationship", "info");
      return job.webhook;
    }

    if (!job.jobName) {
      ctx.log("No webhook secret available", "warn");
      return null;
    }

    const [appId, subscriberId] = job.jobName.split("_");
    try {
      const legacyWebhook = await prisma.webhook.findUniqueOrThrow({
        where: {
          id: subscriberId,
          appId: appId !== "null" ? appId : null,
        },
      });
      ctx.log(`Resolved legacy webhook configuration for ${subscriberId}`, "info");
      return legacyWebhook;
    } catch {
      ctx.log(`Failed to resolve legacy webhook for ${subscriberId}`, "warn");
      return null;
    }
  });

  // ── Step 3: Execute webhook HTTP POST ───────────────────────────────────
  await ctx.run("send-webhook-request", async () => {
    const headers: Record<string, string> = {
      "Content-Type":
        !job.payload || jsonParse(job.payload) ? "application/json" : "application/x-www-form-urlencoded",
    };

    if (webhook) {
      headers["X-Cal-Signature-256"] = createWebhookSignature({
        secret: webhook.secret,
        body: job.payload,
      });
    }

    ctx.log(`Sending webhook request to ${job.subscriberUrl}`, "info");

    const res = await fetch(job.subscriberUrl, {
      method: "POST",
      body: job.payload,
      headers,
    });

    if (!res.ok) {
      if (res.status >= 500 || res.status === 429) {
        ctx.log(`Webhook request failed with status ${res.status}`, "warn");
        throw new WebhookTriggerError(`Webhook failed with status ${res.status}`);
      }

      ctx.log(`Webhook rejected with status ${res.status}`, "error");
      throw new WebhookRejectedError(res.status, data.id);
    }

    ctx.log(`Webhook request successful (${res.status})`, "info");
    return { status: res.status };
  });

  // ── Step 4: Cleanup successful job ──────────────────────────────────────
  await ctx.run("cleanup-webhook-job", async () => {
    await prisma.webhookScheduledTriggers.delete({
      where: { id: job.id },
    });
    ctx.log("Webhook job cleaned up from database", "info");
    return true;
  });

  ctx.log("Scheduled webhook triggered successfully", "info");
  return { success: true };
}
