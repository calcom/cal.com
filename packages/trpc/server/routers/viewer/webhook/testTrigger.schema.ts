import { z } from "zod";

import { webhookUrlValidationService } from "@calcom/features/webhooks/lib/WebhookUrlValidationService";

import { webhookIdAndEventTypeIdSchema } from "./types";

// SECURITY: Custom URL schema with SSRF protection
const secureWebhookUrlSchema = z
  .string()
  .url()
  .refine((url) => webhookUrlValidationService.validateSync(url), {
    message:
      "Invalid webhook URL. Requests to private IPs, localhost, or non-HTTP(S) protocols are not allowed.",
  });

export const ZTestTriggerInputSchema = webhookIdAndEventTypeIdSchema.extend({
  url: secureWebhookUrlSchema,
  secret: z.string().optional(),
  type: z.string(),
  payloadTemplate: z.string().optional().nullable(),
});

export type TTestTriggerInputSchema = z.infer<typeof ZTestTriggerInputSchema>;
