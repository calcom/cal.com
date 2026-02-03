import { z } from "zod";

import { WebhookVersion } from "@calcom/features/webhooks/lib/interface/IWebhookRepository";
import sendPayload from "@calcom/features/webhooks/lib/sendPayload";

const sendWebhookPayloadSchema = z.object({
  secretKey: z.string().nullable(),
  triggerEvent: z.string(),
  createdAt: z.string(),
  webhook: z.object({
    subscriberUrl: z.string().url(),
    appId: z.string().nullable(),
    payloadTemplate: z.string().nullable(),
    version: z.nativeEnum(WebhookVersion),
  }),
  // TODO: Define the data schema
  data: z.any(),
});

export async function sendWebhook(payload: string): Promise<void> {
  try {
    const { secretKey, triggerEvent, createdAt, webhook, data } = sendWebhookPayloadSchema.parse(
      JSON.parse(payload)
    );
    await sendPayload(secretKey, triggerEvent, createdAt, webhook, data);
  } catch (error) {
    console.error(error);
    throw error;
  }
}
