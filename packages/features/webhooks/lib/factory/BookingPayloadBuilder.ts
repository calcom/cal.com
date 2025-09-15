import { getUTCOffsetByTimezone } from "@calcom/lib/dayjs";
import { BookingStatus, WebhookTriggerEvents } from "@calcom/prisma/enums";
import type { CalendarEvent } from "@calcom/types/Calendar";

import type { EventTypeInfo, BookingWebhookEventDTO } from "../dto/types";
import type { WebhookPayload } from "./types";

type BookingExtraDataMap = {
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

interface CreateBookingWebhookPayloadParams<T extends keyof BookingExtraDataMap> {
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

function createBookingWebhookPayload<T extends keyof BookingExtraDataMap>(
  params: CreateBookingWebhookPayloadParams<T>
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
  canHandle(triggerEvent: WebhookTriggerEvents): boolean {
    return BOOKING_WEBHOOK_EVENTS.includes(triggerEvent);
  }

  build(dto: BookingWebhookEventDTO): WebhookPayload {
    switch (dto.triggerEvent) {
      case WebhookTriggerEvents.BOOKING_CREATED:
        return createBookingWebhookPayload({
          booking: dto.booking,
          eventType: dto.eventType,
          evt: dto.evt,
          status: BookingStatus.ACCEPTED,
          triggerEvent: dto.triggerEvent,
          createdAt: dto.createdAt,
        });

      case WebhookTriggerEvents.BOOKING_CANCELLED:
        return createBookingWebhookPayload({
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
        return createBookingWebhookPayload({
          booking: dto.booking,
          eventType: dto.eventType,
          evt: dto.evt,
          status: BookingStatus.PENDING,
          triggerEvent: dto.triggerEvent,
          createdAt: dto.createdAt,
        });

      case WebhookTriggerEvents.BOOKING_REJECTED:
        return createBookingWebhookPayload({
          booking: dto.booking,
          eventType: dto.eventType,
          evt: dto.evt,
          status: BookingStatus.REJECTED,
          triggerEvent: dto.triggerEvent,
          createdAt: dto.createdAt,
        });

      case WebhookTriggerEvents.BOOKING_RESCHEDULED:
        return createBookingWebhookPayload({
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
        return createBookingWebhookPayload({
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
        return createBookingWebhookPayload({
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
