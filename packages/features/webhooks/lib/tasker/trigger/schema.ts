/**
 * Re-export the webhook task payload schema from the types file
 *
 * This schema is used by the trigger.dev task to validate the payload.
 * We re-export from the canonical source to ensure type consistency.
 */
export { webhookTaskPayloadSchema as webhookDeliveryTaskSchema } from "../../types/webhookTask";
export type { WebhookTaskPayload as WebhookDeliveryTaskPayload } from "../../types/webhookTask";
