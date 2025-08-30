import { getUTCOffsetByTimezone } from "@calcom/lib/dayjs";
import { WebhookTriggerEvents } from "@calcom/prisma/enums";
import type { CalendarEvent } from "@calcom/types/Calendar";

import type { EventTypeInfo, BookingWebhookEventDTO } from "../dto/types";
import type { WebhookPayload } from "./types";

type BookingExtraDataMap = {
  [WebhookTriggerEvents.BOOKING_CREATED]: undefined;
  [WebhookTriggerEvents.BOOKING_CANCELLED]: { cancelledBy?: string; cancellationReason?: string };
  [WebhookTriggerEvents.BOOKING_REQUESTED]: undefined;
  [WebhookTriggerEvents.BOOKING_REJECTED]: undefined;
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

function createBookingWebhookPayload<T extends keyof BookingExtraDataMap>(
  booking: {
    id: number;
    eventTypeId: number | null;
    userId: number | null;
    smsReminderNumber?: string | null;
  },
  eventType: EventTypeInfo,
  evt: CalendarEvent,
  status: string,
  triggerEvent: string,
  createdAt: string,
  extra?: BookingExtraDataMap[T]
): WebhookPayload {
  const utcOffsetOrganizer = getUTCOffsetByTimezone(evt.organizer?.timeZone, evt.startTime);
  const organizer = { ...evt.organizer, utcOffset: utcOffsetOrganizer };

  return {
    triggerEvent,
    createdAt,
    payload: {
      ...evt,
      bookingId: booking.id,
      startTime: evt.startTime,
      endTime: evt.endTime,
      title: evt.title,
      type: evt.type,
      organizer,
      attendees:
        evt.attendees?.map((a) => ({
          ...a,
          utcOffset: getUTCOffsetByTimezone(a.timeZone, evt.startTime),
        })) ?? [],
      location: evt.location,
      uid: evt.uid,
      customInputs: evt.customInputs,
      responses: evt.responses,
      userFieldsResponses: evt.userFieldsResponses,
      status,
      eventTitle: eventType?.eventTitle,
      eventDescription: eventType?.eventDescription,
      requiresConfirmation: eventType?.requiresConfirmation,
      price: eventType?.price,
      currency: eventType?.currency,
      length: eventType?.length,
      smsReminderNumber: booking.smsReminderNumber || undefined,
      description: evt.description || evt.additionalNotes,
      ...extra,
    },
  };
}

const BOOKING_WEBHOOK_EVENTS: WebhookTriggerEvents[] = [
  WebhookTriggerEvents.BOOKING_CREATED,
  WebhookTriggerEvents.BOOKING_CANCELLED,
  WebhookTriggerEvents.BOOKING_REQUESTED,
  WebhookTriggerEvents.BOOKING_RESCHEDULED,
  WebhookTriggerEvents.BOOKING_REJECTED,
  WebhookTriggerEvents.BOOKING_PAID,
  WebhookTriggerEvents.BOOKING_PAYMENT_INITIATED,
  WebhookTriggerEvents.BOOKING_NO_SHOW_UPDATED,
];

export class BookingPayloadBuilder {
  canHandle(triggerEvent: string): boolean {
    return BOOKING_WEBHOOK_EVENTS.includes(triggerEvent as WebhookTriggerEvents);
  }

  build(dto: BookingWebhookEventDTO): WebhookPayload {
    // TypeScript automatically narrows the DTO type based on triggerEvent (discriminated union)
    switch (dto.triggerEvent) {
      case WebhookTriggerEvents.BOOKING_CREATED:
        return createBookingWebhookPayload(
          dto.booking,
          dto.eventType,
          dto.evt,
          "ACCEPTED",
          dto.triggerEvent,
          dto.createdAt
        );

      case WebhookTriggerEvents.BOOKING_CANCELLED:
        return createBookingWebhookPayload(
          dto.booking,
          dto.eventType,
          dto.evt,
          "CANCELLED",
          dto.triggerEvent,
          dto.createdAt,
          {
            cancelledBy: dto.cancelledBy,
            cancellationReason: dto.cancellationReason,
          }
        );

      case WebhookTriggerEvents.BOOKING_REQUESTED:
        return createBookingWebhookPayload(
          dto.booking,
          dto.eventType,
          dto.evt,
          "PENDING",
          dto.triggerEvent,
          dto.createdAt
        );

      case WebhookTriggerEvents.BOOKING_REJECTED:
        return createBookingWebhookPayload(
          dto.booking,
          dto.eventType,
          dto.evt,
          "REJECTED",
          dto.triggerEvent,
          dto.createdAt
        );

      case WebhookTriggerEvents.BOOKING_RESCHEDULED:
        return createBookingWebhookPayload(
          dto.booking,
          dto.eventType,
          dto.evt,
          "ACCEPTED",
          dto.triggerEvent,
          dto.createdAt,
          {
            rescheduleId: dto.rescheduleId,
            rescheduleUid: dto.rescheduleUid,
            rescheduleStartTime: dto.rescheduleStartTime,
            rescheduleEndTime: dto.rescheduleEndTime,
            rescheduledBy: dto.rescheduledBy,
          }
        );

      case WebhookTriggerEvents.BOOKING_PAID:
        return createBookingWebhookPayload(
          dto.booking,
          dto.eventType,
          dto.evt,
          "ACCEPTED",
          dto.triggerEvent,
          dto.createdAt,
          {
            paymentId: dto.paymentId,
            paymentData: dto.paymentData,
          }
        );

      case WebhookTriggerEvents.BOOKING_PAYMENT_INITIATED:
        return createBookingWebhookPayload(
          dto.booking,
          dto.eventType,
          dto.evt,
          "ACCEPTED",
          dto.triggerEvent,
          dto.createdAt,
          {
            paymentId: dto.paymentId,
            paymentData: dto.paymentData,
          }
        );

      case WebhookTriggerEvents.BOOKING_NO_SHOW_UPDATED:
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

      default: {
        // TypeScript exhaustiveness check - this should never happen if all cases are covered
        const _exhaustiveCheck: never = dto;
        throw new Error(`Unsupported booking trigger: ${JSON.stringify(_exhaustiveCheck)}`);
      }
    }
  }
}
