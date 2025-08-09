import type { GetSubscriberOptions } from "@calcom/features/webhooks/lib/getWebhooks";
import { WebhookService } from "@calcom/features/webhooks/lib/WebhookService";
import type { WebhookPayloadType } from "@calcom/features/webhooks/lib/sendPayload";
import { withReporting } from "@calcom/lib/sentryWrapper";
import logger from "@calcom/lib/logger";

async function _handleWebhookTrigger(args: {
  subscriberOptions: GetSubscriberOptions;
  eventTrigger: string;
  webhookData: WebhookPayloadType;
  isDryRun?: boolean;
}) {
  try {
    if (args.isDryRun) return;
    
    await WebhookService.sendWebhook(args.subscriberOptions, args.webhookData);
  } catch (error) {
    logger.error("Error while sending webhook", error);
  }
}

export const handleWebhookTrigger = withReporting(_handleWebhookTrigger, "handleWebhookTrigger");
