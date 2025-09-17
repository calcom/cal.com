import type { AssignmentReasonEnum } from "@calcom/prisma/enums";
import type { getAllWorkflowsFromEventType } from "@calcom/trpc/server/routers/viewer/workflows/util";
import type { CalendarEvent } from "@calcom/types/Calendar";

import type { BookingCreatedMessagePayload } from "../messageBus/types.d";

export class MessageBusPayloadBuilder {
  private payload: Partial<BookingCreatedMessagePayload> = {};

  constructor({
    bookingId,
    bookingUid,
    eventTypeId,
    organizerUserId,
    isDryRun,
    isConfirmedByDefault,
  }: {
    bookingId: number;
    bookingUid: string;
    eventTypeId: number;
    organizerUserId: number;
    isDryRun: boolean;
    isConfirmedByDefault: boolean;
  }) {
    this.payload = {
      bookingId,
      bookingUid,
      eventTypeId,
      organizerUserId,
      isDryRun,
      config: {
        isDryRun,
      },
      organizerUserId,
    };
  }

  withBooking(booking: BookingCreatedMessagePayload["booking"]): this {
    this.payload.booking = booking;
    return this;
  }

  withEventType(eventType: BookingCreatedMessagePayload["eventType"]): this {
    this.payload.eventType = eventType;
    return this;
  }

  withCalendarEvent(calendarEvent: CalendarEvent): this {
    this.payload.calendarEvent = calendarEvent;
    return this;
  }

  withContext(context: Partial<BookingCreatedMessagePayload["context"]>): this {
    this.payload.context = {
      ...this.payload.context!,
      ...context,
    };
    return this;
  }

  withIntegrations(integrations: BookingCreatedMessagePayload["integrations"]): this {
    this.payload.integrations = integrations;
    return this;
  }

  withFormData(formData: any): this {
    this.payload.formData = formData;
    return this;
  }

  withAppSyncData(additionalInformation?: any): this {
    this.payload.appSync = {
      additionalInformation,
    };
    return this;
  }

  withRouting(routing: BookingCreatedMessagePayload["routing"]): this {
    this.payload.routing = routing;
    return this;
  }

  withAssignmentReason(reasonEnum: AssignmentReasonEnum, reasonString: string): this {
    if (!this.payload.routing) {
      this.payload.routing = {};
    }
    this.payload.routing.assignmentReason = {
      reasonEnum,
      reasonString,
    };
    return this;
  }

  withWorkflows(workflows: Awaited<ReturnType<typeof getAllWorkflowsFromEventType>>): this {
    this.payload.workflows = workflows;
    return this;
  }

  build(): BookingCreatedMessagePayload {
    // Validate required fields
    if (!this.payload.booking) {
      throw new Error("BookingCreatedEventPayloadBuilder: booking is required");
    }
    if (!this.payload.eventType) {
      throw new Error("BookingCreatedEventPayloadBuilder: eventType is required");
    }
    if (!this.payload.calendarEvent) {
      throw new Error("BookingCreatedEventPayloadBuilder: calendarEvent is required");
    }
    if (!this.payload.integrations) {
      throw new Error("BookingCreatedEventPayloadBuilder: integrations is required");
    }
    if (this.payload.formData === undefined) {
      throw new Error("BookingCreatedEventPayloadBuilder: formData is required");
    }

    return this.payload as BookingCreatedMessagePayload;
  }

  /**
   * Static factory method for creating builder from existing payload structure
   */
  static fromLegacyData({
    bookingId,
    bookingUid,
    eventTypeId,
    organizerUserId,
    isDryRun,
    booking,
    eventType,
    calendarEvent,
    credentials,
    rawBookingData,
    isTeamEventType,
    teamId,
    hashedLink,
    contactOwnerEmail,
    routingFormResponseId,
    crmRecordId,
    reroutingFormResponses,
    assignmentReason,
    platformClientId,
    noEmail,
    additionalInformation,
    seatsPerTimeSlot,
    workflows,
    isConfirmedByDefault,
  }: {
    bookingId: number;
    bookingUid: string;
    eventTypeId: number;
    organizerUserId: number;
    isDryRun: boolean;
    booking: BookingCreatedMessagePayload["booking"];
    eventType: Omit<
      BookingCreatedMessagePayload["eventType"],
      "isTeamEventType" | "teamId" | "hashedLink" | "seatsPerTimeSlot"
    >;
    calendarEvent: CalendarEvent;
    credentials: any[];
    rawBookingData: any;
    isTeamEventType: boolean;
    teamId?: number | null;
    hashedLink?: string;
    seatsPerTimeSlot?: number | null;
    contactOwnerEmail?: string | null;
    routingFormResponseId?: number;
    crmRecordId?: string;
    reroutingFormResponses?: any;
    assignmentReason?: { reasonEnum: AssignmentReasonEnum; reasonString: string };
    platformClientId?: string;
    noEmail?: boolean;
    additionalInformation?: any;
    workflows: Awaited<ReturnType<typeof getAllWorkflowsFromEventType>>;
    isConfirmedByDefault: boolean;
  }): BookingCreatedMessagePayload {
    return new MessageBusPayloadBuilder({
      bookingId,
      bookingUid,
      eventTypeId,
      organizerUserId,
      isDryRun,
    })
      .withBooking(booking)
      .withEventType({
        ...eventType,
        isTeamEventType,
        teamId,
        hashedLink,
        seatsPerTimeSlot: seatsPerTimeSlot,
      })
      .withCalendarEvent(calendarEvent)
      .withContext({
        platformClientId,
        noEmail,
        isConfirmedByDefault,
      })
      .withIntegrations({
        credentials,
      })
      .withFormData(rawBookingData)
      .withAppSyncData(additionalInformation)
      .withRouting(
        routingFormResponseId ||
          contactOwnerEmail ||
          crmRecordId ||
          reroutingFormResponses ||
          assignmentReason
          ? {
              contactOwnerEmail,
              routingFormResponseId,
              crmRecordId,
              reroutingFormResponses,
              assignmentReason,
            }
          : undefined
      )
      .withWorkflows(workflows)
      .build();
  }
}
