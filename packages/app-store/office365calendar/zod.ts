import { z } from "zod";

export const appKeysSchema = z.object({
  client_id: z.string().min(1),
  client_secret: z.string().min(1),
});

export const appDataSchema = z.object({
  client_id: z.string(),
  client_secret: z.string(),
});

export const graphValidationTokenChallengeSchema = z.object({
  validationToken: z.string().min(1),
});

/**
 * https://learn.microsoft.com/en-us/graph/api/resources/changenotification?view=graph-rest-1.0#properties
 */
export const changeNotificationWebhookPayloadSchema = z.object({
  value: z.array(
    z.object({
      changeType: z.enum(["created", "updated", "deleted"]),
      clientState: z.string().optional(),
      id: z.string().optional(),
      lifecycleEvent: z.enum(["missed", "subscriptionRemoved", "reauthorizationRequired"]),
      resource: z.string(),
      subscriptionExpirationDateTime: z.string().optional(),
      subscriptionId: z.string(),
      tenantId: z.string(),
    })
  ),
});

/**
 * https://learn.microsoft.com/en-us/graph/api/subscription-post-subscriptions?view=graph-rest-1.0&tabs=http#response-1
 */
export const startWatchingCalendarResponseSchema = z.object({
  subscriptionId: z.string(),
  expirationDateTime: z.string(),
});
