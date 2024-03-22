import { z } from "zod";

const sendWebhookPayloadSchema = z.object({
  url: z.string().url(),
  payload: z.string(),
});

export async function sendWebhook(payload: string): Promise<void> {
  try {
    const parsedPayload = sendWebhookPayloadSchema.parse(JSON.parse(payload));
    console.log(parsedPayload);
    // 30% chance of failing
    if (Math.random() > 0.7) throw new Error("Failed to send webhook");
    // ... send webhook
  } catch (error) {
    // ... handle error
    console.error(error);
    throw error;
  }
}
