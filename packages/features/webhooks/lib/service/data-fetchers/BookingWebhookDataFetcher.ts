import { WebhookTriggerEvents } from "@calcom/prisma/enums";
import type { IWebhookDataFetcher, SubscriberContext } from "../../interface/IWebhookDataFetcher";
import type { ILogger } from "../../interface/infrastructure";
import type { BookingWebhookTaskPayload } from "../../types/webhookTask";

export class BookingWebhookDataFetcher implements IWebhookDataFetcher {
  private readonly BOOKING_TRIGGERS = new Set([
    WebhookTriggerEvents.BOOKING_CREATED,
    WebhookTriggerEvents.BOOKING_CANCELLED,
    WebhookTriggerEvents.BOOKING_RESCHEDULED,
    WebhookTriggerEvents.BOOKING_REQUESTED,
    WebhookTriggerEvents.BOOKING_REJECTED,
    WebhookTriggerEvents.BOOKING_NO_SHOW_UPDATED,
  ]);

  constructor(private readonly logger: ILogger) {}

  canHandle(triggerEvent: WebhookTriggerEvents): boolean {
    return this.BOOKING_TRIGGERS.has(triggerEvent as never);
  }

  async fetchEventData(payload: BookingWebhookTaskPayload): Promise<Record<string, unknown> | null> {
    const { bookingUid } = payload;

    if (!bookingUid) {
      this.logger.warn("Missing bookingUid for booking webhook");
      return null;
    }

    // TODO: Implement using BookingRepository/EventTypeRepository/UserRepository (Phase 1+)
    this.logger.debug("Booking data fetch not implemented yet (Phase 0 scaffold)", { bookingUid });
    return { bookingUid, _scaffold: true };
  }

  getSubscriberContext(payload: BookingWebhookTaskPayload): SubscriberContext {
    return {
      triggerEvent: payload.triggerEvent,
      userId: payload.userId,
      eventTypeId: payload.eventTypeId,
      teamId: payload.teamId,
      orgId: payload.orgId,
      oAuthClientId: payload.oAuthClientId,
    };
  }
}
