import type { BookingStatus } from "@calcom/prisma/enums";
import { WebhookTriggerEvents } from "@calcom/prisma/enums";
import type { CalendarEvent } from "@calcom/types/Calendar";

import type { EventTypeInfo, BookingWebhookEventDTO } from "../../dto/types";
import type { WebhookPayload } from "../types";
import type { IBookingPayloadBuilder } from "../versioned/PayloadBuilderFactory";

/**
 * Extra data shape per booking trigger event
 */
export type BookingExtraDataMap = {
  [WebhookTriggerEvents.BOOKING_CREATED]: null;
  [WebhookTriggerEvents.BOOKING_CANCELLED]: {
    cancelledBy?: string;
    cancellationReason?: string;
    requestReschedule?: boolean;
  };
  [WebhookTriggerEvents.BOOKING_REQUESTED]: null;
  [WebhookTriggerEvents.BOOKING_REJECTED]: null;
  [WebhookTriggerEvents.BOOKING_RESCHEDULED]: {
    rescheduleId?: number;
    rescheduleUid?: string;
    rescheduleStartTime?: string;
    rescheduleEndTime?: string;
    rescheduledBy?: string;
  };
  [WebhookTriggerEvents.BOOKING_PAID]: { paymentId?: number; paymentData?: Record<string, unknown> };
  [WebhookTriggerEvents.BOOKING_PAYMENT_INITIATED]: {
    paymentId?: number;
    paymentData?: Record<string, unknown>;
  };
};

export interface BookingPayloadParams<T extends keyof BookingExtraDataMap> {
  booking: {
    id: number;
    eventTypeId: number | null;
    userId: number | null;
    smsReminderNumber?: string | null;
  };
  eventType: EventTypeInfo;
  evt: CalendarEvent;
  status: BookingStatus;
  triggerEvent: WebhookTriggerEvents;
  createdAt: string;
  extra?: BookingExtraDataMap[T];
}

/**
 * Abstract base class for booking payload builders.
 *
 * This class defines the interface that all version-specific booking payload
 * builders must implement. It does NOT contain any version-specific payload logic.
 *
 * Each webhook version should have its own concrete implementation in
 * versioned/v{VERSION}/BookingPayloadBuilder.ts
 */
export abstract class BaseBookingPayloadBuilder implements IBookingPayloadBuilder {
  /**
   * Build the booking webhook payload.
   * Each version must implement this method with its specific payload structure.
   */
  abstract build(dto: BookingWebhookEventDTO): WebhookPayload;
}
