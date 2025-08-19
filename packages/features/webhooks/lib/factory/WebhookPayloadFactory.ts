import type { WebhookTriggerEvents } from "@calcom/prisma/enums";
import { getUTCOffsetByTimezone } from "@calcom/lib/dayjs";
import { getHumanReadableLocationValue } from "@calcom/app-store/locations";
import type { Person } from "@calcom/types/Calendar";

import type {
  WebhookEventDTO,
  BookingCreatedDTO,
  BookingCancelledDTO,
  BookingRequestedDTO,
  BookingRescheduledDTO,
  BookingPaidDTO,
  BookingNoShowDTO,
  OOOCreatedDTO,
  FormSubmittedDTO,
} from "../dto/types";
import type { EventPayloadType, OOOEntryPayloadType, BookingNoShowUpdatedPayload } from "../sendPayload";

export interface WebhookPayload {
  triggerEvent: string;
  createdAt: string;
  payload: EventPayloadType | OOOEntryPayloadType | BookingNoShowUpdatedPayload;
}

/**
 * Factory responsible for creating webhook payloads from DTOs
 * Handles mapping, normalization, and defaulting logic
 */
export class WebhookPayloadFactory {
  /**
   * Creates a webhook payload from a DTO
   */
  static createPayload(dto: WebhookEventDTO): WebhookPayload {
    switch (dto.triggerEvent) {
      case WebhookTriggerEvents.BOOKING_CREATED:
        return this.createBookingCreatedPayload(dto as BookingCreatedDTO);
      case WebhookTriggerEvents.BOOKING_CANCELLED:
        return this.createBookingCancelledPayload(dto as BookingCancelledDTO);
      case WebhookTriggerEvents.BOOKING_REQUESTED:
        return this.createBookingRequestedPayload(dto as BookingRequestedDTO);
      case WebhookTriggerEvents.BOOKING_RESCHEDULED:
        return this.createBookingRescheduledPayload(dto as BookingRescheduledDTO);
      case WebhookTriggerEvents.BOOKING_PAID:
        return this.createBookingPaidPayload(dto as BookingPaidDTO);
      case WebhookTriggerEvents.BOOKING_NO_SHOW_UPDATED:
        return this.createBookingNoShowPayload(dto as BookingNoShowDTO);
      case WebhookTriggerEvents.OOO_CREATED:
        return this.createOOOCreatedPayload(dto as OOOCreatedDTO);
      case WebhookTriggerEvents.FORM_SUBMITTED:
        return this.createFormSubmittedPayload(dto as FormSubmittedDTO);
      default:
        throw new Error(`Unsupported webhook trigger event: ${dto.triggerEvent}`);
    }
  }

  private static createBookingCreatedPayload(dto: BookingCreatedDTO): WebhookPayload {
    const eventPayload = this.buildEventPayload({
      evt: dto.evt,
      eventType: dto.eventType,
      bookingId: dto.booking.id,
      eventTypeId: dto.eventType?.id,
      status: dto.status,
      smsReminderNumber: dto.booking.smsReminderNumber || undefined,
      metadata: dto.metadata,
      ...(dto.platformParams || {}),
    });

    return {
      triggerEvent: dto.triggerEvent,
      createdAt: dto.createdAt,
      payload: eventPayload,
    };
  }

  private static createBookingCancelledPayload(dto: BookingCancelledDTO): WebhookPayload {
    const eventPayload = this.buildEventPayload({
      evt: dto.evt,
      eventType: dto.eventType,
      bookingId: dto.booking.id,
      eventTypeId: dto.eventType?.id,
      status: "CANCELLED",
      smsReminderNumber: dto.booking.smsReminderNumber || undefined,
      cancelledBy: dto.cancelledBy,
      cancellationReason: dto.cancellationReason,
    });

    return {
      triggerEvent: dto.triggerEvent,
      createdAt: dto.createdAt,
      payload: eventPayload,
    };
  }

  private static createBookingRequestedPayload(dto: BookingRequestedDTO): WebhookPayload {
    const eventPayload = this.buildEventPayload({
      evt: dto.evt,
      eventType: dto.eventType,
      bookingId: dto.booking.id,
      eventTypeId: dto.eventType?.id,
      status: "PENDING",
    });

    return {
      triggerEvent: dto.triggerEvent,
      createdAt: dto.createdAt,
      payload: eventPayload,
    };
  }

  private static createBookingRescheduledPayload(dto: BookingRescheduledDTO): WebhookPayload {
    const eventPayload = this.buildEventPayload({
      evt: dto.evt,
      eventType: dto.eventType,
      bookingId: dto.booking.id,
      eventTypeId: dto.eventType?.id,
      status: "ACCEPTED",
      smsReminderNumber: dto.booking.smsReminderNumber || undefined,
      rescheduleId: dto.rescheduleId,
      rescheduleUid: dto.rescheduleUid,
      rescheduleStartTime: dto.rescheduleStartTime,
      rescheduleEndTime: dto.rescheduleEndTime,
      rescheduledBy: dto.rescheduledBy,
    });

    return {
      triggerEvent: dto.triggerEvent,
      createdAt: dto.createdAt,
      payload: eventPayload,
    };
  }

  private static createBookingPaidPayload(dto: BookingPaidDTO): WebhookPayload {
    const eventPayload = this.buildEventPayload({
      evt: dto.evt,
      eventType: dto.eventType,
      bookingId: dto.booking.id,
      eventTypeId: dto.eventType?.id,
      status: "ACCEPTED",
      paymentId: dto.paymentId,
      paymentData: dto.paymentData,
    });

    return {
      triggerEvent: dto.triggerEvent,
      createdAt: dto.createdAt,
      payload: eventPayload,
    };
  }

  private static createBookingNoShowPayload(dto: BookingNoShowDTO): WebhookPayload {
    const payload: BookingNoShowUpdatedPayload = {
      message: dto.message,
      bookingUid: dto.bookingUid,
      bookingId: dto.bookingId,
      attendees: dto.attendees,
    };

    return {
      triggerEvent: dto.triggerEvent,
      createdAt: dto.createdAt,
      payload,
    };
  }

  private static createOOOCreatedPayload(dto: OOOCreatedDTO): WebhookPayload {
    const payload: OOOEntryPayloadType = {
      oooEntry: dto.oooEntry,
    };

    return {
      triggerEvent: dto.triggerEvent,
      createdAt: dto.createdAt,
      payload,
    };
  }

  private static createFormSubmittedPayload(dto: FormSubmittedDTO): WebhookPayload {
    // For form submissions, we create a custom payload structure
    const payload = {
      form: dto.form,
      response: dto.response,
    } as any; // Form submissions have their own payload structure

    return {
      triggerEvent: dto.triggerEvent,
      createdAt: dto.createdAt,
      payload,
    };
  }

  /**
   * Builds a standardized event payload with UTC offsets
   */
  private static buildEventPayload(params: {
    evt: any;
    eventType: any;
    bookingId?: number;
    eventTypeId?: number;
    status?: string;
    smsReminderNumber?: string;
    metadata?: any;
    cancelledBy?: string;
    cancellationReason?: string;
    rescheduleId?: number;
    rescheduleUid?: string;
    rescheduleStartTime?: string;
    rescheduleEndTime?: string;
    rescheduledBy?: string;
    paymentId?: number;
    paymentData?: any;
    [key: string]: any;
  }): EventPayloadType {
    const { evt, eventType, ...additionalData } = params;

    // Add UTC offsets
    const eventWithUTCOffset = this.addUTCOffset(evt);

    const payload: EventPayloadType = {
      ...eventWithUTCOffset,
      // Event type information
      eventTitle: eventType?.title,
      eventDescription: eventType?.description,
      requiresConfirmation: eventType?.requiresConfirmation || null,
      price: eventType?.price,
      currency: eventType?.currency,
      length: eventType?.length,
      // Additional data
      ...additionalData,
    };

    return payload;
  }

  /**
   * Adds UTC offset information to event data
   */
  private static addUTCOffset(evt: any) {
    if (!evt) return evt;

    const eventWithOffset = { ...evt };

    // Add UTC offset for organizer
    if (eventWithOffset.organizer?.timeZone && eventWithOffset.startTime) {
      eventWithOffset.organizer.utcOffset = getUTCOffsetByTimezone(
        eventWithOffset.organizer.timeZone,
        eventWithOffset.startTime
      );
    }

    // Add UTC offset for attendees
    if (eventWithOffset.attendees?.length && eventWithOffset.startTime) {
      eventWithOffset.attendees = eventWithOffset.attendees.map((attendee: Person) => ({
        ...attendee,
        utcOffset: getUTCOffsetByTimezone(attendee.timeZone, eventWithOffset.startTime),
      }));
    }

    return eventWithOffset;
  }
}
