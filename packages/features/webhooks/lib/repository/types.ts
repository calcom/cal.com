import type { WebhookTriggerEvents } from "@calcom/prisma/enums";

export interface GetSubscribersOptions {
  userId?: number | null;
  eventTypeId?: number | null;
  triggerEvent: WebhookTriggerEvents;
  teamId?: number | number[] | null;
  orgId?: number | null;
  oAuthClientId?: string | null;
}
