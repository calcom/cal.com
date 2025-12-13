import { getUTCOffsetByTimezone } from "@calcom/lib/dayjs";
import { BookingStatus, WebhookTriggerEvents } from "@calcom/prisma/enums";
import type { CalendarEvent } from "@calcom/types/Calendar";

import type { EventTypeInfo, BookingWebhookEventDTO } from "../../dto/types";
import type { WebhookPayload } from "../types";
import type { IBookingPayloadBuilder } from "../versioned/PayloadBuilderFactory";

/**
 * Extra data shape per booking trigger event
 */
export type BookingExtraDataMap = {
  [WebhookTriggerEvents.BOOKING_CREATED]: null;
  [WebhookTriggerEvents.BOOKING_CANCELLED]: { cancelledBy?: string; cancellationReason?: string };
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
 * Base booking payload builder with shared logic.
 * Version-specific builders can extend this and override methods as needed.
 *
 * @example Creating a new version with modified payload
 * ```ts
 * export class BookingPayloadBuilderV2 extends BaseBookingPayloadBuilder {
 *   // Override to add new fields or change structure
 *   protected buildBasePayload<T extends keyof BookingExtraDataMap>(
 *     params: BookingPayloadParams<T>
 *   ): WebhookPayload {
 *     const basePayload = super.buildBasePayload(params);
 *     return {
 *       ...basePayload,
 *       payload: {
 *         ...basePayload.payload,
 *         apiVersion: "2024-12-01",
 *         // Add new fields...
 *       },
 *     };
 *   }
 * }
 * ```
 */
export abstract class BaseBookingPayloadBuilder implements IBookingPayloadBuilder {
  /**
   * Build the base booking webhook payload.
   * Override this method in version-specific builders to modify the payload structure.
   */
  protected buildBasePayload<T extends keyof BookingExtraDataMap>(
    params: BookingPayloadParams<T>
  ): WebhookPayload {
    const utcOffsetOrganizer = getUTCOffsetByTimezone(params.evt.organizer?.timeZone, params.evt.startTime);
    const organizer = { ...params.evt.organizer, utcOffset: utcOffsetOrganizer };

    return {
      triggerEvent: params.triggerEvent,
      createdAt: params.createdAt,
      payload: {
        ...params.evt,
        bookingId: params.booking.id,
        startTime: params.evt.startTime,
        endTime: params.evt.endTime,
        title: params.evt.title,
        type: params.evt.type,
        organizer,
        attendees:
          params.evt.attendees?.map((a) => ({
            ...a,
            utcOffset: getUTCOffsetByTimezone(a.timeZone, params.evt.startTime),
          })) ?? [],
        location: params.evt.location,
        uid: params.evt.uid,
        customInputs: params.evt.customInputs,
        responses: params.evt.responses,
        userFieldsResponses: params.evt.userFieldsResponses,
        status: params.status,
        eventTitle: params.eventType?.eventTitle,
        eventDescription: params.eventType?.eventDescription,
        requiresConfirmation: params.eventType?.requiresConfirmation,
        price: params.eventType?.price,
        currency: params.eventType?.currency,
        length: params.eventType?.length,
        smsReminderNumber: params.booking.smsReminderNumber || undefined,
        description: params.evt.description || params.evt.additionalNotes,
        ...(params.extra || {}),
      },
    };
  }

  /**
   * Build the no-show updated payload.
   * Override for version-specific changes.
   */
  protected buildNoShowPayload(dto: BookingWebhookEventDTO): WebhookPayload {
    if (dto.triggerEvent !== WebhookTriggerEvents.BOOKING_NO_SHOW_UPDATED) {
      throw new Error("Invalid trigger event for no-show payload");
    }
    return {
      triggerEvent: dto.triggerEvent,
      createdAt: dto.createdAt,
      payload: {
        bookingUid: dto.bookingUid,
        bookingId: dto.bookingId,
        attendees: dto.attendees,
        message: dto.message,
      },
    };
  }

  /**
   * Main build method - routes to appropriate handler based on trigger event.
   * Generally should not need to be overridden.
   */
  build(dto: BookingWebhookEventDTO): WebhookPayload {
    switch (dto.triggerEvent) {
      case WebhookTriggerEvents.BOOKING_CREATED:
        return this.buildBasePayload({
          booking: dto.booking,
          eventType: dto.eventType,
          evt: dto.evt,
          status: BookingStatus.ACCEPTED,
          triggerEvent: dto.triggerEvent,
          createdAt: dto.createdAt,
        });

      case WebhookTriggerEvents.BOOKING_CANCELLED:
        return this.buildBasePayload({
          booking: dto.booking,
          eventType: dto.eventType,
          evt: dto.evt,
          status: BookingStatus.CANCELLED,
          triggerEvent: dto.triggerEvent,
          createdAt: dto.createdAt,
          extra: {
            cancelledBy: dto.cancelledBy,
            cancellationReason: dto.cancellationReason,
          },
        });

      case WebhookTriggerEvents.BOOKING_REQUESTED:
        return this.buildBasePayload({
          booking: dto.booking,
          eventType: dto.eventType,
          evt: dto.evt,
          status: BookingStatus.PENDING,
          triggerEvent: dto.triggerEvent,
          createdAt: dto.createdAt,
        });

      case WebhookTriggerEvents.BOOKING_REJECTED:
        return this.buildBasePayload({
          booking: dto.booking,
          eventType: dto.eventType,
          evt: dto.evt,
          status: BookingStatus.REJECTED,
          triggerEvent: dto.triggerEvent,
          createdAt: dto.createdAt,
        });

      case WebhookTriggerEvents.BOOKING_RESCHEDULED:
        return this.buildBasePayload({
          booking: dto.booking,
          eventType: dto.eventType,
          evt: dto.evt,
          status: BookingStatus.ACCEPTED,
          triggerEvent: dto.triggerEvent,
          createdAt: dto.createdAt,
          extra: {
            rescheduleId: dto.rescheduleId,
            rescheduleUid: dto.rescheduleUid,
            rescheduleStartTime: dto.rescheduleStartTime,
            rescheduleEndTime: dto.rescheduleEndTime,
            rescheduledBy: dto.rescheduledBy,
          },
        });

      case WebhookTriggerEvents.BOOKING_PAID:
        return this.buildBasePayload({
          booking: dto.booking,
          eventType: dto.eventType,
          evt: dto.evt,
          status: BookingStatus.ACCEPTED,
          triggerEvent: dto.triggerEvent,
          createdAt: dto.createdAt,
          extra: {
            paymentId: dto.paymentId,
            paymentData: dto.paymentData,
          },
        });

      case WebhookTriggerEvents.BOOKING_PAYMENT_INITIATED:
        return this.buildBasePayload({
          booking: dto.booking,
          eventType: dto.eventType,
          evt: dto.evt,
          status: BookingStatus.ACCEPTED,
          triggerEvent: dto.triggerEvent,
          createdAt: dto.createdAt,
          extra: {
            paymentId: dto.paymentId,
            paymentData: dto.paymentData,
          },
        });

      case WebhookTriggerEvents.BOOKING_NO_SHOW_UPDATED:
        return this.buildNoShowPayload(dto);

      default: {
        const _exhaustiveCheck: never = dto;
        throw new Error(`Unsupported booking trigger: ${JSON.stringify(_exhaustiveCheck)}`);
      }
    }
  }
}

