import { z } from "zod";

import { WEBHOOK_TRIGGER_EVENTS } from "@calcom/features/webhooks/lib/constants";

import { calidWebhookIdAndEventTypeIdSchema } from "./types";

export const ZCalIdListInputSchema = calidWebhookIdAndEventTypeIdSchema
  .extend({
    eventTriggers: z.enum(WEBHOOK_TRIGGER_EVENTS).array().optional(),
  })
  .optional();

export type TCalIdListInputSchema = z.infer<typeof ZCalIdListInputSchema>;
