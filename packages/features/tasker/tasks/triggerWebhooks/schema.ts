import z from "zod";

import { WebhookTriggerEvents } from "@calcom/prisma/enums";

export const ZTriggerWebhooksPayloadSchema = z.object({
  bookingId: z.number(),
  userId: z.number().nullable(),
  eventTypeId: z.number(),
  triggerEvent: z.nativeEnum(WebhookTriggerEvents),
  teamId: z.number().nullable(),
  orgId: z.number().nullable(),
  oAuthClientId: z.string().nullable(),
  isConfirmedByDefault: z.boolean(),
});
