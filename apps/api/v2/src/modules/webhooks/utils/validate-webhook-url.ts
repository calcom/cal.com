import { validateUrlForSSRFSync } from "@calcom/platform-libraries";
import { BadRequestException } from "@nestjs/common";

export function validateWebhookUrl(subscriberUrl: string): void {
  const validation = validateUrlForSSRFSync(subscriberUrl);
  if (!validation.isValid) {
    throw new BadRequestException(`Webhook URL is not allowed: ${validation.error}`);
  }
}

export function validateWebhookUrlIfChanged(
  newSubscriberUrl: string | undefined,
  existingSubscriberUrl: string | undefined
): void {
  if (newSubscriberUrl && newSubscriberUrl !== existingSubscriberUrl) {
    validateWebhookUrl(newSubscriberUrl);
  }
}
