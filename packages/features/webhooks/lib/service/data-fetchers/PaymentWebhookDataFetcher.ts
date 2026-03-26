import { WebhookTriggerEvents } from "@calcom/prisma/enums";
import type { IWebhookDataFetcher, SubscriberContext } from "../../interface/IWebhookDataFetcher";
import type { ILogger } from "../../interface/infrastructure";
import type { PaymentWebhookTaskPayload } from "../../types/webhookTask";

export class PaymentWebhookDataFetcher implements IWebhookDataFetcher {
  private readonly PAYMENT_TRIGGERS = new Set([
    WebhookTriggerEvents.BOOKING_PAYMENT_INITIATED,
    WebhookTriggerEvents.BOOKING_PAID,
  ]);

  constructor(private readonly logger: ILogger) {}

  canHandle(triggerEvent: WebhookTriggerEvents): boolean {
    return this.PAYMENT_TRIGGERS.has(triggerEvent as never);
  }

  async fetchEventData(payload: PaymentWebhookTaskPayload): Promise<Record<string, unknown> | null> {
    const { bookingUid } = payload;

    if (!bookingUid) {
      this.logger.warn("Missing bookingUid for payment webhook");
      return null;
    }

    // TODO: Implement using BookingRepository/PaymentRepository (Phase 1+)
    this.logger.debug("Payment data fetch not implemented yet (Phase 0 scaffold)", { bookingUid });
    return { bookingUid, _scaffold: true };
  }

  getSubscriberContext(payload: PaymentWebhookTaskPayload): SubscriberContext {
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
