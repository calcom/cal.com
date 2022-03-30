import { withValidation } from "next-validations";

import { _WebhookModel as Webhook } from "@calcom/prisma/zod";

export const schemaWebhookBodyParams = Webhook.omit({ id: true });

export const schemaWebhookPublic = Webhook.omit({});

export const withValidWebhook = withValidation({
  schema: schemaWebhookBodyParams,
  type: "Zod",
  mode: "body",
});
