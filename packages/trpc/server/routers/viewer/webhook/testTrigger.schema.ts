import { z } from "zod";

import { getUrlValidationService } from "@calcom/features/url-validation/di/UrlValidationService.container";

import { webhookIdAndEventTypeIdSchema } from "./types";

// SECURITY: Custom URL schema with SSRF protection
const urlValidationService = getUrlValidationService();
const secureWebhookUrlSchema = z
  .string()
  .url()
  .refine((url) => urlValidationService.validateSync(url), {
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
