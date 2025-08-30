import { z } from "zod";

import { webhookIdAndEventTypeIdSchema } from "./types";

export const ZTestTriggerInputSchema = webhookIdAndEventTypeIdSchema.extend({
  url: z.string().url(),
  secret: z.string().optional(),
  type: z.string(),
  payloadTemplate: z.string().optional().nullable(),
});

export type TTestTriggerInputSchema = z.infer<typeof ZTestTriggerInputSchema>;
