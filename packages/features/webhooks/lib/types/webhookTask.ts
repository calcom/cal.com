import { z } from "zod";

import { WebhookTriggerEvents } from "@calcom/prisma/enums";

/**
 * Webhook Task Payload Schema (Zod)
 * 
 * Used for runtime validation of webhook task payloads.
 */
export const webhookTaskPayloadSchema = z.object({
  operationId: z.string(),
  triggerEvent: z.nativeEnum(WebhookTriggerEvents),
  bookingUid: z.string().optional(),
  eventTypeId: z.number().optional(),
  teamId: z.number().nullable().optional(),
  userId: z.number().optional(),
  orgId: z.number().optional(),
  formId: z.string().optional(),
  recordingId: z.string().optional(),
  oooEntryId: z.number().optional(),
  oAuthClientId: z.string().nullable().optional(),
  metadata: z.record(z.unknown()).optional(),
  timestamp: z.string(),
});

/**
 * Webhook Task Payload
 * 
 * This is the minimal payload structure queued by WebhookTaskerProducerService
 * and processed by WebhookTaskConsumer.
 * 
 * It contains only IDs/references - the Consumer fetches full data from DB.
 */
export type WebhookTaskPayload = z.infer<typeof webhookTaskPayloadSchema>;
