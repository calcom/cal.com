import { _WebhookModel as Webhook } from "@calcom/prisma/zod";

export const schemaWebhookBodyParams = Webhook.omit({ id: true }).partial();

export const schemaWebhookPublic = Webhook.omit({});
