import { z } from "zod";

import { ssrfSafeUrlSchema } from "@calcom/lib/zod/ssrfSafeUrl";

import { webhookIdAndEventTypeIdSchema } from "./types";

export const ZTestTriggerInputSchema = webhookIdAndEventTypeIdSchema.extend({
  url: ssrfSafeUrlSchema,
  secret: z.string().optional(),
  type: z.string(),
  payloadTemplate: z.string().optional().nullable(),
});

export type TTestTriggerInputSchema = z.infer<typeof ZTestTriggerInputSchema>;
