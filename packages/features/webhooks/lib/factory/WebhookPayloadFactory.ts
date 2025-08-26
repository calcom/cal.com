import { getUTCOffsetByTimezone } from "@calcom/lib/dayjs";
import { WebhookTriggerEvents } from "@calcom/prisma/enums";
import type { Person, CalendarEvent } from "@calcom/types/Calendar";
import type { JsonValue } from "@calcom/types/JsonObject";

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
  EventPayloadType,
  OOOEntryPayloadType,
  BookingNoShowUpdatedPayload,
  BookingRejectedDTO,
  MeetingStartedDTO,
  MeetingEndedDTO,
  InstantMeetingDTO,
  AfterHostsNoShowDTO,
  AfterGuestsNoShowDTO,
  EventTypeInfo,
} from "../dto/types";
import type {
  WebhookPayload,
  FormSubmittedPayload,
  RecordingPayload,
  MeetingPayload,
  InstantMeetingPayload,
  NoShowWebhookPayload,
} from "./types";

// ============================================================================
// BOOKING NORMALIZATION TYPES & UTILITIES (merged from BookingWebhookFactory)
// ============================================================================

function isObjectButNotArray(obj: unknown): obj is Record<string, unknown> {
  return typeof obj === "object" && obj !== null && !Array.isArray(obj);
}

type DestinationCalendar = {
  id: number;
  integration: string;
  externalId: string;
  primaryEmail: string | null;
  userId: number | null;
  eventTypeId: number | null;
  credentialId: number | null;
  createdAt: Date | null;
  updatedAt: Date | null;
  delegationCredentialId: string | null;
  domainWideDelegationCredentialId: string | null;
};

type Response = {
  label: string;
  value: string | boolean | string[] | { value: string; optionValue: string } | Record<string, string>;
  isHidden?: boolean | undefined;
};

interface BaseWebhookPayload {
  bookingId: number;
  title: string;
  eventSlug: string | null;
  description: string | null;
  customInputs: JsonValue | null;
  responses: Record<string, Response>;
  userFieldsResponses: Record<string, Response>;
  startTime: string;
  endTime: string;
  organizer: Person;
  attendees: Person[];
  uid: string;
  location: string | null;
  destinationCalendar: DestinationCalendar | null;
  cancellationReason: string | null;
  iCalUID: string | null;
  smsReminderNumber?: string;
  cancelledBy: string | null;
}

export class WebhookPayloadFactory {
  getType(params: BaseWebhookPayload): string {
    return params.eventSlug || params.title || "";
  }
  getTitle(params: BaseWebhookPayload): string {
    return params.title || "";
  }

  getDestinationCalendar(params: BaseWebhookPayload): DestinationCalendar[] {
    return params.destinationCalendar ? [params.destinationCalendar] : [];
  }

  getCustomInputs(params: BaseWebhookPayload): Record<string, unknown> | undefined {
    return isObjectButNotArray(params.customInputs) ? params.customInputs : undefined;
  }

  createBookingBasePayload(params: BaseWebhookPayload): Record<string, unknown> {
    const {
      bookingId,
      title,
      eventSlug,
      description,
      customInputs,
      startTime,
      endTime,
      uid,
      location,
      organizer,
      attendees,
      responses,
      userFieldsResponses,
      destinationCalendar,
      smsReminderNumber,
      iCalUID,
    } = params;

    return {
      bookingId,
      type: this.getType(params),
      title: this.getTitle(params),
      description,
      customInputs: this.getCustomInputs(params),
      responses,
      userFieldsResponses,
      startTime,
      endTime,
      organizer,
      attendees,
      uid,
      location,
      destinationCalendar: this.getDestinationCalendar(params),
      iCalUID,
      smsReminderNumber,
    };
  }
  createPayload(dto: WebhookEventDTO): WebhookPayload {
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
      case WebhookTriggerEvents.BOOKING_REJECTED:
        return this.createBookingRejectedPayload(dto as BookingRejectedDTO);
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
      case WebhookTriggerEvents.MEETING_STARTED:
        return this.createMeetingStartedPayload(dto as MeetingStartedDTO);
      case WebhookTriggerEvents.MEETING_ENDED:
        return this.createMeetingEndedPayload(dto as MeetingEndedDTO);
      case WebhookTriggerEvents.INSTANT_MEETING:
        return this.createInstantMeetingPayload(dto as InstantMeetingDTO);
      case WebhookTriggerEvents.AFTER_HOSTS_CAL_VIDEO_NO_SHOW:
        return this.createAfterHostsNoShowPayload(dto as AfterHostsNoShowDTO);
      case WebhookTriggerEvents.AFTER_GUESTS_CAL_VIDEO_NO_SHOW:
        return this.createAfterGuestsNoShowPayload(dto as AfterGuestsNoShowDTO);
      default:
        throw new Error("Unsupported webhook trigger event");
    }
  }

  createBookingCreatedPayload(dto: BookingCreatedDTO): WebhookPayload {
    const eventPayload = this.buildEventPayload({
      evt: dto.evt,
      eventType: dto.eventType as EventTypeInfo,
      bookingId: dto.booking.id,
      eventTypeId: dto.eventType?.id,
      status: dto.status,
      smsReminderNumber: dto.booking.smsReminderNumber || undefined,
      metadata: dto.metadata,
      triggerEvent: dto.triggerEvent,
      ...(dto.platformParams || {}),
    });

    return {
      triggerEvent: dto.triggerEvent,
      createdAt: dto.createdAt,
      payload: eventPayload,
    };
  }

  createBookingCancelledPayload(dto: BookingCancelledDTO): WebhookPayload {
    const eventPayload = this.buildEventPayload({
      evt: dto.evt,
      eventType: dto.eventType as EventTypeInfo,
      bookingId: dto.booking.id,
      eventTypeId: dto.eventType?.id,
      status: "CANCELLED",
      smsReminderNumber: dto.booking.smsReminderNumber || undefined,
      cancelledBy: dto.cancelledBy,
      cancellationReason: dto.cancellationReason,
      triggerEvent: dto.triggerEvent,
    });

    return {
      triggerEvent: dto.triggerEvent,
      createdAt: dto.createdAt,
      payload: eventPayload,
    };
  }

  createBookingRequestedPayload(dto: BookingRequestedDTO): WebhookPayload {
    const eventPayload = this.buildEventPayload({
      evt: dto.evt,
      eventType: dto.eventType as EventTypeInfo,
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

  createBookingRescheduledPayload(dto: BookingRescheduledDTO): WebhookPayload {
    const eventPayload = this.buildEventPayload({
      evt: dto.evt,
      eventType: dto.eventType as EventTypeInfo,
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

  createBookingPaidPayload(dto: BookingPaidDTO): WebhookPayload {
    const eventPayload = this.buildEventPayload({
      evt: dto.evt,
      eventType: dto.eventType as EventTypeInfo,
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

  createBookingRejectedPayload(dto: BookingRejectedDTO): WebhookPayload {
    const eventPayload = this.buildEventPayload({
      evt: dto.evt,
      eventType: dto.eventType as EventTypeInfo,
      bookingId: dto.booking.id,
      eventTypeId: dto.eventType?.id,
      status: "REJECTED",
      smsReminderNumber: dto.booking.smsReminderNumber || undefined,
      triggerEvent: dto.triggerEvent,
    });

    return {
      triggerEvent: dto.triggerEvent,
      createdAt: dto.createdAt,
      payload: eventPayload,
    };
  }

  createBookingNoShowPayload(dto: BookingNoShowDTO): WebhookPayload {
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

  createOOOCreatedPayload(dto: OOOCreatedDTO): WebhookPayload {
    const payload: OOOEntryPayloadType = {
      oooEntry: dto.oooEntry,
    };

    return {
      triggerEvent: dto.triggerEvent,
      createdAt: dto.createdAt,
      payload,
    };
  }

  createFormSubmittedPayload(dto: FormSubmittedDTO): WebhookPayload {
    const payload: FormSubmittedPayload = {
      formId: dto.form.id,
      formName: dto.form.name,
      teamId: dto.teamId,
      responses: dto.response.data,
    };

    return {
      triggerEvent: dto.triggerEvent,
      createdAt: dto.createdAt,
      payload,
    };
  }

  buildEventPayload(params: {
    evt: CalendarEvent;
    eventType: EventTypeInfo;
    bookingId?: number;
    eventTypeId?: number;
    status?: string;
    smsReminderNumber?: string;
    metadata?: Record<string, unknown>;
    cancelledBy?: string;
    cancellationReason?: string;
    rescheduleId?: number;
    rescheduleUid?: string;
    rescheduleStartTime?: string;
    rescheduleEndTime?: string;
    rescheduledBy?: string;
    paymentId?: number;
    paymentData?: Record<string, unknown>;
    [key: string]: unknown;
  }): EventPayloadType {
    const { evt, eventType, ...additionalData } = params;

    // Add UTC offsets with proper typing
    const eventWithUTCOffset = this.addUTCOffset(evt);

    // Check if this is a booking-related trigger that should use enhanced normalization
    const bookingTriggers = [
      "BOOKING_CREATED",
      "BOOKING_CANCELLED",
      "BOOKING_REQUESTED",
      "BOOKING_RESCHEDULED",
      "BOOKING_REJECTED",
      "BOOKING_PAID",
      "BOOKING_PAYMENT_INITIATED",
    ];

    // Get trigger from additionalData or check if evt has booking structure
    const triggerFromContext = additionalData.triggerEvent as string;
    const hasBookingStructure = bookingTriggers.some(
      (trigger) =>
        triggerFromContext?.includes(trigger) || (evt && typeof evt === "object" && "bookingId" in evt)
    );

    let basePayload: Record<string, unknown>;

    if (hasBookingStructure) {
      // Use merged BookingWebhookFactory normalization for booking data
      try {
        basePayload = this.createBookingBasePayload(evt as unknown as BaseWebhookPayload);
      } catch {
        // Fallback to regular processing if normalization fails
        basePayload = eventWithUTCOffset;
      }
    } else {
      // For non-booking events, use the CalendarEvent data with basic normalization
      basePayload = {
        ...eventWithUTCOffset,
        // Apply basic normalization similar to BookingWebhookFactory
        type: evt.type || "",
        title: evt.title || "",
        uid: evt.uid || "",
        customInputs:
          evt.customInputs && isObjectButNotArray(evt.customInputs) ? evt.customInputs : undefined,
      };
    }

    const requiresConfirmation =
      typeof eventType?.requiresConfirmation === "boolean" ? eventType.requiresConfirmation : null;

    const payload: EventPayloadType = {
      type: (basePayload.type as string) || evt.type || "",
      title: (basePayload.title as string) || evt.title || "",
      startTime: (basePayload.startTime as string) || evt.startTime,
      endTime: (basePayload.endTime as string) || evt.endTime,
      organizer: (basePayload.organizer as Person) || evt.organizer,
      attendees: (basePayload.attendees as Person[]) || evt.attendees,
      uid: (basePayload.uid as string) || evt.uid || "",
      location: (basePayload.location as string | null) || evt.location || null,
      description: (basePayload.description as string | null) || evt.description || null,
      additionalNotes: (basePayload.additionalNotes as string | null) || evt.additionalNotes || null,

      customInputs: basePayload.customInputs || evt.customInputs || null,
      responses: (basePayload.responses as any) || evt.responses || undefined,
      userFieldsResponses: (basePayload.userFieldsResponses as any) || evt.userFieldsResponses || undefined,
      destinationCalendar: (basePayload.destinationCalendar as any) || evt.destinationCalendar || null,
      iCalUID: (basePayload.iCalUID as string | null) || evt.iCalUID || null,
      smsReminderNumber: (basePayload.smsReminderNumber as string) || undefined,
      bookingId: (basePayload.bookingId as number) || evt.bookingId || undefined,

      // Event type information
      eventTitle: eventType?.eventTitle as string,
      eventDescription: eventType?.eventDescription as string,
      requiresConfirmation: eventType?.requiresConfirmation ?? null,
      price: eventType?.price as number,
      currency: eventType?.currency as string,
      length: eventType?.length as number,

      // Additional data with proper metadata typing
      ...Object.fromEntries(
        Object.entries(additionalData).map(([key, value]) => [
          key,
          key === "metadata" && value && typeof value === "object" && value !== null
            ? Object.fromEntries(
                Object.entries(value as Record<string, unknown>).map(([k, v]) => [
                  k,
                  typeof v === "string" || typeof v === "number" || typeof v === "boolean" || v === null
                    ? v
                    : String(v),
                ])
              )
            : value,
        ])
      ),
    };

    return payload;
  }

  addUTCOffset(evt: CalendarEvent): Record<string, unknown> {
    if (!evt) return evt as Record<string, unknown>;

    const eventWithOffset = { ...evt } as Record<string, unknown>;

    // Add UTC offset to organizer
    if (
      eventWithOffset.organizer &&
      typeof eventWithOffset.organizer === "object" &&
      eventWithOffset.organizer !== null &&
      "timeZone" in eventWithOffset.organizer &&
      eventWithOffset.startTime
    ) {
      const organizer = eventWithOffset.organizer as Person & { utcOffset?: number };
      organizer.utcOffset =
        getUTCOffsetByTimezone(organizer.timeZone, eventWithOffset.startTime as string) || undefined;
    }

    // Add UTC offset to attendees
    if (
      Array.isArray(eventWithOffset.attendees) &&
      eventWithOffset.attendees.length > 0 &&
      eventWithOffset.startTime
    ) {
      eventWithOffset.attendees = eventWithOffset.attendees.map((attendee: unknown) => {
        if (attendee && typeof attendee === "object" && attendee !== null && "timeZone" in attendee) {
          const typedAttendee = attendee as Person;
          return {
            ...typedAttendee,
            utcOffset: getUTCOffsetByTimezone(typedAttendee.timeZone, eventWithOffset.startTime as string),
          };
        }
        return attendee;
      });
    }

    return eventWithOffset;
  }

  createBookingPaymentInitiatedPayload(dto: BookingPaymentInitiatedDTO): WebhookPayload {
    const eventPayload = this.buildEventPayload({
      evt: dto.evt,
      eventType: dto.eventType as EventTypeInfo,
      bookingId: dto.booking.id,
      eventTypeId: dto.eventType?.id,
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

  createFormSubmittedNoEventPayload(dto: FormSubmittedNoEventDTO): WebhookPayload {
    const payload: FormSubmittedPayload = {
      formId: dto.form.id,
      formName: dto.form.name,
      teamId: dto.teamId,
      responses: dto.response.data,
    };

    return {
      triggerEvent: dto.triggerEvent,
      createdAt: dto.createdAt,
      payload,
    };
  }

  createRecordingReadyPayload(dto: RecordingReadyDTO): WebhookPayload {
    const payload: RecordingPayload = {
      downloadLink: dto.downloadLink,
    };

    return {
      triggerEvent: dto.triggerEvent,
      createdAt: dto.createdAt,
      payload,
    };
  }

  createTranscriptionGeneratedPayload(dto: TranscriptionGeneratedDTO): WebhookPayload {
    const eventPayload = this.buildEventPayload({
      evt: dto.evt,
      eventType: null as unknown as EventTypeInfo,
      downloadLinks: dto.downloadLinks,
    });

    return {
      triggerEvent: dto.triggerEvent,
      createdAt: dto.createdAt,
      payload: eventPayload,
    };
  }

  createMeetingStartedPayload(dto: MeetingStartedDTO): WebhookPayload {
    // For meeting events, we use the booking data directly since it contains all necessary information
    const payload: MeetingPayload = { ...dto.booking };

    return {
      triggerEvent: dto.triggerEvent,
      createdAt: dto.createdAt,
      payload,
    };
  }

  createMeetingEndedPayload(dto: MeetingEndedDTO): WebhookPayload {
    const payload: MeetingPayload = { ...dto.booking };

    return {
      triggerEvent: dto.triggerEvent,
      createdAt: dto.createdAt,
      payload,
    };
  }

  createInstantMeetingPayload(dto: InstantMeetingDTO): WebhookPayload {
    const payload: InstantMeetingPayload = {
      title: dto.title,
      body: dto.body,
      icon: dto.icon,
      url: dto.url,
      actions: dto.actions,
      requireInteraction: dto.requireInteraction,
      type: dto.type,
    };

    return {
      triggerEvent: dto.triggerEvent,
      createdAt: dto.createdAt,
      payload,
    };
  }

  createAfterHostsNoShowPayload(dto: AfterHostsNoShowDTO): WebhookPayload {
    const payload: NoShowWebhookPayload = {
      bookingId: dto.bookingId,
      webhook: dto.webhook,
    };

    return {
      triggerEvent: dto.triggerEvent,
      createdAt: dto.createdAt,
      payload,
    };
  }

  createAfterGuestsNoShowPayload(dto: AfterGuestsNoShowDTO): WebhookPayload {
    const payload: NoShowWebhookPayload = {
      bookingId: dto.bookingId,
      webhook: dto.webhook,
    };

    return {
      triggerEvent: dto.triggerEvent,
      createdAt: dto.createdAt,
      payload,
    };
  }
}
