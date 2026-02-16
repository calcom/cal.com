import { z } from "zod";

import { WebhookVersion } from "@calcom/features/webhooks/lib/interface/IWebhookRepository";
import sendPayload from "@calcom/features/webhooks/lib/sendPayload";

const webhookDataSchema = z.union([
  z.object({
    id: z.number(),
    uid: z.string(),
    title: z.string(),
    startTime: z.string(),
    endTime: z.string(),
    attendees: z.array(z.object({ email: z.string(), name: z.string() })),
    organizer: z.object({ email: z.string(), name: z.string() }),
  }),
  // Add other payload types if needed, but for now this covers the main booking payload
  z.any(),
]);

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
  data: webhookDataSchema,
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
