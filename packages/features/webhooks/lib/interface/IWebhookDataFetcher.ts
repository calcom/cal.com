import type { WebhookTriggerEvents } from "@calcom/prisma/enums";
import type { WebhookTaskPayload } from "../types/webhookTask";

export interface SubscriberContext {
  triggerEvent: WebhookTriggerEvents;
  userId?: number;
  eventTypeId?: number;
  teamId?: number | null;
  orgId?: number;
  oAuthClientId?: string | null;
}

/**
 * Strategy interface for fetching webhook event data
 *
 * Each webhook category (booking, form, recording, etc.) implements this interface
 * to provide domain-specific data fetching logic.
 *
 * Benefits:
 * - Open/Closed: Add new webhook types without modifying consumer
 * - Single Responsibility: Each fetcher owns one domain's logic
 * - Dependency Inversion: Consumer depends on this interface, not concrete implementations
 *
 * Note: Uses WebhookTaskPayload (discriminated union) directly instead of generics
 * since type narrowing happens at runtime via canHandle().
 */
export interface IWebhookDataFetcher {
  canHandle(triggerEvent: WebhookTriggerEvents): boolean;

  fetchEventData(payload: WebhookTaskPayload): Promise<Record<string, unknown> | null>;

  getSubscriberContext(payload: WebhookTaskPayload): SubscriberContext;
}
