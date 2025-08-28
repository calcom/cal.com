import { getUTCOffsetByTimezone } from "@calcom/lib/dayjs";
import { WebhookTriggerEvents } from "@calcom/prisma/enums";
import type { CalendarEvent } from "@calcom/types/Calendar";

import type {
  BookingCreatedDTO,
  BookingCancelledDTO,
  BookingRequestedDTO,
  BookingRescheduledDTO,
  BookingPaidDTO,
  BookingPaymentInitiatedDTO,
  BookingRejectedDTO,
  BookingNoShowDTO,
  EventTypeInfo,
} from "../dto/types";
import type { WebhookPayload } from "./types";

function createBookingWebhookPayload(
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
  extra: Record<string, unknown> = {}
): WebhookPayload {
  const utcOffsetOrganizer = getUTCOffsetByTimezone(evt.organizer?.timeZone, evt.startTime);
  const organizer = { ...evt.organizer, utcOffset: utcOffsetOrganizer };

  return {
    triggerEvent,
    createdAt,
    payload: {
      // Core CalendarEvent fields
      ...evt,
      // Override with normalized data
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
      // EventTypeInfo fields (legacy compatibility)
      eventTitle: eventType?.eventTitle,
      eventDescription: eventType?.eventDescription,
      requiresConfirmation: eventType?.requiresConfirmation,
      price: eventType?.price,
      currency: eventType?.currency,
      length: eventType?.length,
      // Booking-specific fields
      smsReminderNumber: booking.smsReminderNumber || undefined,
      // Handle description fallback like legacy
      description: evt.description || evt.additionalNotes,
      // Add any extra fields (cancelledBy, rescheduleId, etc.)
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

  build(
    dto:
      | BookingCreatedDTO
      | BookingCancelledDTO
      | BookingRequestedDTO
      | BookingRescheduledDTO
      | BookingPaidDTO
      | BookingPaymentInitiatedDTO
      | BookingRejectedDTO
      | BookingNoShowDTO
  ): WebhookPayload {
    const { triggerEvent, createdAt } = dto;

    switch (triggerEvent) {
      case WebhookTriggerEvents.BOOKING_CREATED: {
        const typedDto = dto as BookingCreatedDTO;
        return createBookingWebhookPayload(
          typedDto.booking,
          typedDto.eventType,
          typedDto.evt,
          "ACCEPTED",
          triggerEvent,
          createdAt
        );
      }

      case WebhookTriggerEvents.BOOKING_CANCELLED: {
        const typedDto = dto as BookingCancelledDTO;
        return createBookingWebhookPayload(
          typedDto.booking,
          typedDto.eventType,
          typedDto.evt,
          "CANCELLED",
          triggerEvent,
          createdAt,
          {
            cancelledBy: typedDto.cancelledBy,
            cancellationReason: typedDto.cancellationReason,
          }
        );
      }

      case WebhookTriggerEvents.BOOKING_REQUESTED: {
        const typedDto = dto as BookingRequestedDTO;
        return createBookingWebhookPayload(
          typedDto.booking,
          typedDto.eventType,
          typedDto.evt,
          "PENDING",
          triggerEvent,
          createdAt
        );
      }

      case WebhookTriggerEvents.BOOKING_REJECTED: {
        const typedDto = dto as BookingRejectedDTO;
        return createBookingWebhookPayload(
          typedDto.booking,
          typedDto.eventType,
          typedDto.evt,
          "REJECTED",
          triggerEvent,
          createdAt
        );
      }

      case WebhookTriggerEvents.BOOKING_RESCHEDULED: {
        const typedDto = dto as BookingRescheduledDTO;
        return createBookingWebhookPayload(
          typedDto.booking,
          typedDto.eventType,
          typedDto.evt,
          "ACCEPTED",
          triggerEvent,
          createdAt,
          {
            rescheduleId: typedDto.rescheduleId,
            rescheduleUid: typedDto.rescheduleUid,
            rescheduleStartTime: typedDto.rescheduleStartTime,
            rescheduleEndTime: typedDto.rescheduleEndTime,
            rescheduledBy: typedDto.rescheduledBy,
          }
        );
      }

      case WebhookTriggerEvents.BOOKING_PAID:
      case WebhookTriggerEvents.BOOKING_PAYMENT_INITIATED: {
        const typedDto = dto as BookingPaidDTO | BookingPaymentInitiatedDTO;
        return createBookingWebhookPayload(
          typedDto.booking,
          typedDto.eventType,
          typedDto.evt,
          "ACCEPTED",
          triggerEvent,
          createdAt,
          {
            paymentId: typedDto.paymentId,
            paymentData: typedDto.paymentData,
          }
        );
      }

      case WebhookTriggerEvents.BOOKING_NO_SHOW_UPDATED: {
        const typedDto = dto as BookingNoShowDTO;
        return {
          triggerEvent,
          createdAt,
          payload: {
            bookingUid: typedDto.bookingUid,
            bookingId: typedDto.bookingId,
            attendees: typedDto.attendees,
            message: typedDto.message,
          },
        };
      }

      default:
        throw new Error(`Unsupported booking trigger: ${triggerEvent}`);
    }
  }
}
