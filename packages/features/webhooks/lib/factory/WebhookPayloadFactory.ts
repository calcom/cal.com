import { WebhookTriggerEvents } from "@calcom/prisma/enums";
import { getUTCOffsetByTimezone } from "@calcom/lib/dayjs";

import type { Person } from "@calcom/types/Calendar";

import type {
  WebhookEventDTO,
  BookingCreatedDTO,
  BookingCancelledDTO,
  BookingRequestedDTO,
  BookingRescheduledDTO,
  BookingPaidDTO,
  BookingPaymentInitiatedDTO,
  BookingNoShowDTO,
  OOOCreatedDTO,
  FormSubmittedDTO,
  FormSubmittedNoEventDTO,
  RecordingReadyDTO,
  TranscriptionGeneratedDTO,
} from "../dto/types";
import type { EventPayloadType, OOOEntryPayloadType, BookingNoShowUpdatedPayload } from "../sendPayload";

// Form-specific payload types
export interface FormSubmittedPayload {
  form: {
    id: string;
    name: string;
  };
  response: {
    id: number;
    data: Record<string, any>;
  };
}

export interface RecordingPayload {
  downloadLink?: string;
  transcriptionUrl?: string;
}

export interface WebhookPayload {
  triggerEvent: string;
  createdAt: string;
  payload: EventPayloadType | OOOEntryPayloadType | BookingNoShowUpdatedPayload | FormSubmittedPayload | RecordingPayload;
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
      case WebhookTriggerEvents.BOOKING_PAYMENT_INITIATED:
        return this.createBookingPaymentInitiatedPayload(dto as BookingPaymentInitiatedDTO);
      case WebhookTriggerEvents.BOOKING_NO_SHOW_UPDATED:
        return this.createBookingNoShowPayload(dto as BookingNoShowDTO);
      case WebhookTriggerEvents.OOO_CREATED:
        return this.createOOOCreatedPayload(dto as OOOCreatedDTO);
      case WebhookTriggerEvents.FORM_SUBMITTED:
        return this.createFormSubmittedPayload(dto as FormSubmittedDTO);
      case WebhookTriggerEvents.FORM_SUBMITTED_NO_EVENT:
        return this.createFormSubmittedNoEventPayload(dto as FormSubmittedNoEventDTO);
      case WebhookTriggerEvents.RECORDING_READY:
        return this.createRecordingReadyPayload(dto as RecordingReadyDTO);
      case WebhookTriggerEvents.RECORDING_TRANSCRIPTION_GENERATED:
        return this.createTranscriptionGeneratedPayload(dto as TranscriptionGeneratedDTO);
      default:
        throw new Error("Unsupported webhook trigger event");
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
    const payload: FormSubmittedPayload = {
      form: dto.form,
      response: dto.response,
    };

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

  private static createBookingPaymentInitiatedPayload(dto: BookingPaymentInitiatedDTO): WebhookPayload {
    const eventPayload = this.buildEventPayload({
      evt: dto.evt,
      eventType: dto.eventType,
      booking: dto.booking,
      status: "PENDING",
      paymentId: dto.paymentId,
      paymentData: dto.paymentData,
    });

    return {
      triggerEvent: dto.triggerEvent,
      createdAt: dto.createdAt,
      payload: eventPayload,
    };
  }

  private static createFormSubmittedNoEventPayload(dto: FormSubmittedNoEventDTO): WebhookPayload {
    const payload: FormSubmittedPayload = {
      form: dto.form,
      response: dto.response,
    };

    return {
      triggerEvent: dto.triggerEvent,
      createdAt: dto.createdAt,
      payload,
    };
  }

  private static createRecordingReadyPayload(dto: RecordingReadyDTO): WebhookPayload {
    const payload: RecordingPayload = {
      downloadLink: dto.downloadLink,
    };

    return {
      triggerEvent: dto.triggerEvent,
      createdAt: dto.createdAt,
      payload,
    };
  }

  private static createTranscriptionGeneratedPayload(dto: TranscriptionGeneratedDTO): WebhookPayload {
    const payload: RecordingPayload = {
      transcriptionUrl: dto.transcriptionUrl,
    };

    return {
      triggerEvent: dto.triggerEvent,
      createdAt: dto.createdAt,
      payload,
    };
  }
}
