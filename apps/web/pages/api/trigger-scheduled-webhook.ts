// import { createWebhookSignature, jsonParse } from "./sendPayload";
import { NonRetriableError } from "inngest";

import { createWebhookSignature, jsonParse } from "@calcom/features/webhooks/lib/sendPayload";
import logger from "@calcom/lib/logger";
import { prisma } from "@calcom/prisma";

const log = logger.getSubLogger({ prefix: ["[inngest-webhook-trigger]"] });

// WebhookTriggerError error is retriable, other errors shouldn't be retried by inngest else we risk spamming
export class WebhookTriggerError extends Error {
  message: string;
  cause: any;

  constructor(message: string, cause?: any) {
    super(message);
    this.message = message;
    this.cause = cause;
  }
}

interface WebhookTriggerData {
  id: number;
}

export const triggerScheduledWebhook = async ({
  event,
  step,
  logger,
}: {
  event: { data: WebhookTriggerData };
  step: any;
  logger: any;
}) => {
  logger.info("Triggering scheduled webhook", { id: event.data.id });
  const data = event.data as WebhookTriggerData;

  const result = await step.run("trigger-scheduled-webhook", async () => {
    try {
      const job = await prisma.webhookScheduledTriggers.findFirst({
        where: {
          id: data.id,
        },
        select: {
          id: true,
          jobName: true,
          startAfter: true,
          payload: true,
          subscriberUrl: true,
          webhook: {
            select: {
              secret: true,
            },
          },
        },
      });

      if (!job) {
        throw new NonRetriableError(`Scheduled webhook job with id ${data.id} not found`);
      }

      // Fetch the webhook configuration so that we can get the secret.
      let webhook = job.webhook;

      // only needed to support old jobs that don't have the webhook relationship yet
      if (!webhook && job.jobName) {
        const [appId, subscriberId] = job.jobName.split("_");
        try {
          webhook = await prisma.webhook.findUniqueOrThrow({
            where: { id: subscriberId, appId: appId !== "null" ? appId : null },
          });
        } catch {
          logger.info(`Error finding webhook for subscriberId: ${subscriberId}, appId: ${appId}`);
        }
      }

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

      const res = await fetch(job.subscriberUrl, {
        method: "POST",
        body: job.payload,
        headers,
      });

      if (!res.ok) {
        // Retry only on transient failures
        if (res.status >= 500 || res.status === 429) {
          // Can also sleep here before retrying
          throw new WebhookTriggerError(`Webhook failed with status ${res.status}`);
        }

        // 4xx → permanent failure
        throw new NonRetriableError(`Webhook rejected with status ${res.status}`);
      }

      // clean finished job
      await prisma.webhookScheduledTriggers.delete({
        where: {
          id: job.id,
        },
      });

      return { success: true };
    } catch (error) {
      log.error("Failed to trigger webhook", {
        id: data.id,
        error: error instanceof Error ? error.message : error,
      });

      if (error instanceof NonRetriableError) {
        throw error;
      } else if (error instanceof WebhookTriggerError) {
        throw error;
      } else {
        throw new NonRetriableError(
          `Failed to trigger webhook: ${error instanceof Error ? error.message : error}`
        );
      }
    }
  });

  return result;
};
