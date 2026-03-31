import type { WebhookTriggerEvents } from "@calcom/prisma/enums";
import type { WebhookTaskPayload } from "../types/webhookTask";

export interface SubscriberContext {
  triggerEvent: WebhookTriggerEvents;
  userId?: number;
  eventTypeId?: number;
  teamId?: number | number[] | null;
  orgId?: number;
  oAuthClientId?: string | null;
}

/**
 * Result of fetching webhook event data.
 *
 * - `data` contains the fetched event data, or `null` if the entity was legitimately not found.
 * - `error` is set when an infrastructure error (e.g. Prisma timeout) occurred during fetching.
 *   The caller can inspect this to decide whether to retry.
 */
export type FetchEventDataResult = {
  data: Record<string, unknown> | null;
  error?: Error;
};

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

  fetchEventData(payload: WebhookTaskPayload): Promise<FetchEventDataResult>;

  getSubscriberContext(payload: WebhookTaskPayload): SubscriberContext;
}
