import { WebhookTriggerEvents } from "@calcom/prisma/enums";
import type { IWebhookDataFetcher, SubscriberContext } from "../../interface/IWebhookDataFetcher";
import type { ILogger } from "../../interface/infrastructure";
import type { FormWebhookTaskPayload } from "../../types/webhookTask";

export class FormWebhookDataFetcher implements IWebhookDataFetcher {
  constructor(private readonly logger: ILogger) {}

  canHandle(triggerEvent: WebhookTriggerEvents): boolean {
    return triggerEvent === WebhookTriggerEvents.FORM_SUBMITTED;
  }

  async fetchEventData(payload: FormWebhookTaskPayload): Promise<Record<string, unknown> | null> {
    const { formId } = payload;

    if (!formId) {
      this.logger.warn("Missing formId for form webhook");
      return null;
    }

    // TODO: Implement using FormRepository (Phase 1+)
    this.logger.debug("Form data fetch not implemented yet (Phase 0 scaffold)", { formId });
    return { formId, _scaffold: true };
  }

  getSubscriberContext(payload: FormWebhookTaskPayload): SubscriberContext {
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
