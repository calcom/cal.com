import { WebhookTriggerEvents } from "@calcom/prisma/enums";
import type { IWebhookDataFetcher, SubscriberContext } from "../../interface/IWebhookDataFetcher";
import type { ILogger } from "../../interface/infrastructure";
import type { OOOWebhookTaskPayload } from "../../types/webhookTask";

export class OOOWebhookDataFetcher implements IWebhookDataFetcher {
  constructor(private readonly logger: ILogger) {}

  canHandle(triggerEvent: WebhookTriggerEvents): boolean {
    return triggerEvent === WebhookTriggerEvents.OOO_CREATED;
  }

  async fetchEventData(payload: OOOWebhookTaskPayload): Promise<Record<string, unknown> | null> {
    const { oooEntryId } = payload;

    if (!oooEntryId) {
      this.logger.warn("Missing oooEntryId for OOO webhook");
      return null;
    }

    // TODO: Implement using OOORepository (Phase 1+)
    this.logger.debug("OOO data fetch not implemented yet (Phase 0 scaffold)", { oooEntryId });
    return { oooEntryId, _scaffold: true };
  }

  getSubscriberContext(payload: OOOWebhookTaskPayload): SubscriberContext {
    return {
      triggerEvent: payload.triggerEvent,
      userId: payload.userId,
      eventTypeId: undefined,
      teamId: payload.teamId,
      orgId: undefined,
      oAuthClientId: payload.oAuthClientId,
    };
  }
}
