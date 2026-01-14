import { getUTCOffsetByTimezone } from "@calcom/lib/dayjs";
import { BookingStatus, WebhookTriggerEvents } from "@calcom/prisma/enums";

import type { BookingWebhookEventDTO } from "../../../dto/types";
import type { WebhookPayload } from "../../types";
import {
  BaseBookingPayloadBuilder,
  type BookingExtraDataMap,
  type BookingPayloadParams,
} from "../../base/BaseBookingPayloadBuilder";

/**
 * Booking payload builder for webhook version 2021-10-20.
 *
 * This is the initial webhook payload format. It includes:
 * - Full CalendarEvent data spread into payload
 * - UTC offset calculations for organizer and attendees
 * - Event type metadata (title, description, price, etc.)
 * - Trigger-specific extra fields (cancellation reason, reschedule info, etc.)
 */
export class BookingPayloadBuilder extends BaseBookingPayloadBuilder {
  /**
   * Build the complete booking webhook payload for v2021-10-20.
   */
  build(dto: BookingWebhookEventDTO): WebhookPayload {
    switch (dto.triggerEvent) {
      case WebhookTriggerEvents.BOOKING_CREATED:
        return this.buildBookingPayload({
          booking: dto.booking,
          eventType: dto.eventType,
          evt: dto.evt,
          status: BookingStatus.ACCEPTED,
          triggerEvent: dto.triggerEvent,
          createdAt: dto.createdAt,
        });

      case WebhookTriggerEvents.BOOKING_CANCELLED:
        return this.buildBookingPayload({
          booking: dto.booking,
          eventType: dto.eventType,
          evt: dto.evt,
          status: BookingStatus.CANCELLED,
          triggerEvent: dto.triggerEvent,
          createdAt: dto.createdAt,
          extra: {
            cancelledBy: dto.cancelledBy,
            cancellationReason: dto.cancellationReason,
            requestReschedule: dto.requestReschedule ?? false,
          },
        });

      case WebhookTriggerEvents.BOOKING_REQUESTED:
        return this.buildBookingPayload({
          booking: dto.booking,
          eventType: dto.eventType,
          evt: dto.evt,
          status: BookingStatus.PENDING,
          triggerEvent: dto.triggerEvent,
          createdAt: dto.createdAt,
        });

      case WebhookTriggerEvents.BOOKING_REJECTED:
        return this.buildBookingPayload({
          booking: dto.booking,
          eventType: dto.eventType,
          evt: dto.evt,
          status: BookingStatus.REJECTED,
          triggerEvent: dto.triggerEvent,
          createdAt: dto.createdAt,
        });

      case WebhookTriggerEvents.BOOKING_RESCHEDULED:
        return this.buildBookingPayload({
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
        return this.buildBookingPayload({
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
        return this.buildBookingPayload({
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

  /**
   * Build the standard booking payload structure for v2021-10-20.
   */
  private buildBookingPayload<T extends keyof BookingExtraDataMap>(
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
   * Build the no-show updated payload for v2021-10-20.
   */
  private buildNoShowPayload(dto: BookingWebhookEventDTO): WebhookPayload {
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
}
