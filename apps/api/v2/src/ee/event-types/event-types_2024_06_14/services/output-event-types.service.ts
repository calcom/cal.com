import { Injectable } from "@nestjs/common";
import type { EventType, User, Schedule, DestinationCalendar } from "@prisma/client";

import {
  EventTypeMetaDataSchema,
  userMetadata,
  transformLocationsInternalToApi,
  transformBookingFieldsInternalToApi,
  parseRecurringEvent,
  TransformedLocationsSchema,
  BookingFieldsSchema,
  SystemField,
  CustomField,
  parseBookingLimit,
  transformIntervalLimitsInternalToApi,
  transformFutureBookingLimitsInternalToApi,
  transformRecurrenceInternalToApi,
  transformBookerLayoutsInternalToApi,
  transformRequiresConfirmationInternalToApi,
  transformEventTypeColorsInternalToApi,
  parseEventTypeColor,
  transformSeatsInternalToApi,
} from "@calcom/platform-libraries";
import {
  TransformFutureBookingsLimitSchema_2024_06_14,
  BookerLayoutsTransformedSchema,
  NoticeThresholdTransformedSchema,
  EventTypeOutput_2024_06_14,
} from "@calcom/platform-types";

type EventTypeRelations = {
  users: User[];
  schedule: Schedule | null;
  destinationCalendar?: DestinationCalendar | null;
};
export type DatabaseEventType = EventType & EventTypeRelations;

type Input = Pick<
  DatabaseEventType,
  | "id"
  | "length"
  | "title"
  | "description"
  | "disableGuests"
  | "slotInterval"
  | "minimumBookingNotice"
  | "beforeEventBuffer"
  | "afterEventBuffer"
  | "slug"
  | "schedulingType"
  | "requiresConfirmation"
  | "price"
  | "currency"
  | "lockTimeZoneToggleOnBookingPage"
  | "seatsPerTimeSlot"
  | "forwardParamsSuccessRedirect"
  | "successRedirectUrl"
  | "seatsShowAvailabilityCount"
  | "isInstantEvent"
  | "locations"
  | "bookingFields"
  | "recurringEvent"
  | "metadata"
  | "users"
  | "scheduleId"
  | "bookingLimits"
  | "durationLimits"
  | "onlyShowFirstAvailableSlot"
  | "offsetStart"
  | "periodType"
  | "periodDays"
  | "periodCountCalendarDays"
  | "periodStartDate"
  | "periodEndDate"
  | "requiresBookerEmailVerification"
  | "hideCalendarNotes"
  | "eventTypeColor"
  | "seatsShowAttendees"
  | "requiresConfirmationWillBlockSlot"
  | "eventName"
  | "destinationCalendar"
  | "useEventTypeDestinationCalendarEmail"
  | "hideCalendarEventDetails"
>;

@Injectable()
export class OutputEventTypesService_2024_06_14 {
  getResponseEventType(ownerId: number, databaseEventType: Input): EventTypeOutput_2024_06_14 {
    const {
      id,
      length,
      title,
      description,
      disableGuests,
      slotInterval,
      minimumBookingNotice,
      beforeEventBuffer,
      afterEventBuffer,
      slug,
      price,
      currency,
      lockTimeZoneToggleOnBookingPage,
      seatsPerTimeSlot,
      forwardParamsSuccessRedirect,
      successRedirectUrl,
      seatsShowAvailabilityCount,
      isInstantEvent,
      scheduleId,
      onlyShowFirstAvailableSlot,
      offsetStart,
      requiresBookerEmailVerification,
      hideCalendarNotes,
      seatsShowAttendees,
      useEventTypeDestinationCalendarEmail,
      hideCalendarEventDetails,
    } = databaseEventType;

    const locations = this.transformLocations(databaseEventType.locations);
    const customName = databaseEventType?.eventName ?? undefined;
    const bookingFields = databaseEventType.bookingFields
      ? this.transformBookingFields(BookingFieldsSchema.parse(databaseEventType.bookingFields))
      : [];
    const recurrence = this.transformRecurringEvent(databaseEventType.recurringEvent);
    const metadata = this.transformMetadata(databaseEventType.metadata) || {};
    const users = this.transformUsers(databaseEventType.users || []);
    const bookingLimitsCount = this.transformIntervalLimits(databaseEventType.bookingLimits);
    const bookingLimitsDuration = this.transformIntervalLimits(databaseEventType.durationLimits);
    const color = this.transformEventTypeColor(databaseEventType.eventTypeColor);
    const bookerLayouts = this.transformBookerLayouts(
      metadata.bookerLayouts as unknown as BookerLayoutsTransformedSchema
    );
    const confirmationPolicy = this.transformRequiresConfirmation(
      !!databaseEventType.requiresConfirmation,
      !!databaseEventType.requiresConfirmationWillBlockSlot,
      metadata.requiresConfirmationThreshold as NoticeThresholdTransformedSchema
    );
    delete metadata["bookerLayouts"];
    delete metadata["requiresConfirmationThreshold"];
    const seats = this.transformSeats(seatsPerTimeSlot, seatsShowAttendees, seatsShowAvailabilityCount);
    const bookingWindow = this.transformBookingWindow({
      periodType: databaseEventType.periodType,
      periodDays: databaseEventType.periodDays,
      periodCountCalendarDays: databaseEventType.periodCountCalendarDays,
      periodStartDate: databaseEventType.periodStartDate,
      periodEndDate: databaseEventType.periodEndDate,
    } as TransformFutureBookingsLimitSchema_2024_06_14);
    const destinationCalendar = this.transformDestinationCalendar(databaseEventType.destinationCalendar);

    return {
      id,
      ownerId,
      lengthInMinutes: length,
      title,
      slug,
      description: description || "",
      locations,
      bookingFields,
      recurrence,
      disableGuests,
      slotInterval,
      minimumBookingNotice,
      beforeEventBuffer,
      afterEventBuffer,
      metadata,
      price,
      currency,
      lockTimeZoneToggleOnBookingPage,
      forwardParamsSuccessRedirect,
      successRedirectUrl,
      isInstantEvent,
      users,
      scheduleId,
      bookingLimitsCount,
      bookingLimitsDuration,
      onlyShowFirstAvailableSlot,
      offsetStart,
      bookingWindow,
      bookerLayouts,
      confirmationPolicy,
      requiresBookerEmailVerification,
      hideCalendarNotes,
      color,
      seats,
      customName,
      destinationCalendar,
      useDestinationCalendarEmail: useEventTypeDestinationCalendarEmail,
      hideCalendarEventDetails,
    };
  }

  transformLocations(locations: any) {
    if (!locations) return [];
    return transformLocationsInternalToApi(TransformedLocationsSchema.parse(locations));
  }

  transformDestinationCalendar(destinationCalendar?: DestinationCalendar | null) {
    if (!destinationCalendar) return undefined;
    return {
      integration: destinationCalendar.integration,
      externalId: destinationCalendar.externalId,
    };
  }

  transformBookingFields(bookingFields: (SystemField | CustomField)[] | null) {
    if (!bookingFields) return [];

    return transformBookingFieldsInternalToApi(bookingFields);
  }

  transformRecurringEvent(recurringEvent: any) {
    if (!recurringEvent) return null;
    const recurringEventParsed = parseRecurringEvent(recurringEvent);
    if (!recurringEventParsed) return null;
    return transformRecurrenceInternalToApi(recurringEventParsed);
  }

  transformMetadata(metadata: any) {
    if (!metadata) return {};
    return EventTypeMetaDataSchema.parse(metadata);
  }

  transformUsers(users: User[]) {
    return users.map((user) => {
      const metadata = user.metadata ? userMetadata.parse(user.metadata) : {};
      return {
        id: user.id,
        name: user.name,
        username: user.username,
        avatarUrl: user.avatarUrl,
        brandColor: user.brandColor,
        darkBrandColor: user.darkBrandColor,
        weekStart: user.weekStart,
        metadata: metadata || {},
      };
    });
  }

  transformIntervalLimits(bookingLimits: any) {
    const bookingLimitsParsed = parseBookingLimit(bookingLimits);
    return transformIntervalLimitsInternalToApi(bookingLimitsParsed);
  }

  transformBookingWindow(bookingLimits: TransformFutureBookingsLimitSchema_2024_06_14) {
    return transformFutureBookingLimitsInternalToApi(bookingLimits);
  }

  transformBookerLayouts(bookerLayouts: BookerLayoutsTransformedSchema) {
    if (!bookerLayouts) return undefined;
    return transformBookerLayoutsInternalToApi(bookerLayouts);
  }

  transformRequiresConfirmation(
    requiresConfirmation: boolean,
    requiresConfirmationWillBlockSlot: boolean,
    requiresConfirmationThreshold?: NoticeThresholdTransformedSchema
  ) {
    return transformRequiresConfirmationInternalToApi(
      requiresConfirmation,
      requiresConfirmationWillBlockSlot,
      requiresConfirmationThreshold
    );
  }

  transformEventTypeColor(eventTypeColor: any) {
    if (!eventTypeColor) return undefined;
    const parsedeventTypeColor = parseEventTypeColor(eventTypeColor);
    return transformEventTypeColorsInternalToApi(parsedeventTypeColor);
  }

  transformSeats(
    seatsPerTimeSlot: number | null,
    seatsShowAttendees: boolean | null,
    seatsShowAvailabilityCount: boolean | null
  ) {
    return transformSeatsInternalToApi({
      seatsPerTimeSlot,
      seatsShowAttendees: !!seatsShowAttendees,
      seatsShowAvailabilityCount: !!seatsShowAvailabilityCount,
    });
  }
}
