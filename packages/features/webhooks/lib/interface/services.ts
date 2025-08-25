import type { WebhookTriggerEvents } from "@calcom/prisma/enums";

import type { WebhookSubscriber, WebhookTriggerArgs } from "../dto/types";
import type {
  BookingPaymentInitiatedParams,
  BookingCreatedParams,
  BookingCancelledParams,
  BookingRequestedParams,
  BookingRescheduledParams,
  BookingPaidParams,
  BookingNoShowParams,
  BookingRejectedParams,
  ScheduleMeetingWebhooksParams,
  CancelScheduledMeetingWebhooksParams,
  ScheduleNoShowWebhooksParams,
} from "../types/params";

export interface GetSubscribersOptions {
  userId?: number | null;
  eventTypeId?: number | null;
  triggerEvent: WebhookTriggerEvents;
  teamId?: number | null;
  orgId?: number | null;
  oAuthClientId?: string | null;
}

export interface IWebhookService {
  getSubscribers(options: GetSubscribersOptions): Promise<WebhookSubscriber[]>;
  scheduleTimeBasedWebhook(
    trigger: WebhookTriggerEvents,
    scheduledAt: Date,
    bookingData: any,
    subscriber: any,
    evt: Record<string, unknown>,
    isDryRun?: boolean
  ): Promise<void>;
  cancelScheduledWebhooks(
    bookingId: number,
    triggers: WebhookTriggerEvents[],
    isDryRun?: boolean
  ): Promise<void>;
}

export interface IBookingWebhookService {
  // Event emission from args
  emitBookingCreatedFromArgs(args: WebhookTriggerArgs): Promise<void>;
  emitBookingCancelledFromArgs(args: WebhookTriggerArgs): Promise<void>;
  emitBookingRequestedFromArgs(args: WebhookTriggerArgs): Promise<void>;
  emitBookingRescheduledFromArgs(args: WebhookTriggerArgs): Promise<void>;
  emitBookingPaidFromArgs(args: WebhookTriggerArgs): Promise<void>;

  // Direct event emission
  emitBookingPaymentInitiated(params: BookingPaymentInitiatedParams): Promise<void>;
  emitBookingCreated(params: BookingCreatedParams): Promise<void>;
  emitBookingCancelled(params: BookingCancelledParams): Promise<void>;
  emitBookingRequested(params: BookingRequestedParams): Promise<void>;
  emitBookingRescheduled(params: BookingRescheduledParams): Promise<void>;
  emitBookingPaid(params: BookingPaidParams): Promise<void>;
  emitBookingNoShow(params: BookingNoShowParams): Promise<void>;
  emitBookingRejected(params: BookingRejectedParams): Promise<void>;

  // Webhook scheduling
  scheduleMeetingWebhooks(params: ScheduleMeetingWebhooksParams): Promise<void>;
  cancelScheduledMeetingWebhooks(params: CancelScheduledMeetingWebhooksParams): Promise<void>;
  scheduleNoShowWebhooks(params: ScheduleNoShowWebhooksParams): Promise<void>;
}
