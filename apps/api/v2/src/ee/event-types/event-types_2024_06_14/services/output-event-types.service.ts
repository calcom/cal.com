import { Injectable } from "@nestjs/common";
import type { EventType, User, Schedule } from "@prisma/client";

import {
  EventTypeMetaDataSchema,
  userMetadata,
  getResponseEventTypeLocations,
  getResponseEventTypeBookingFields,
  parseRecurringEvent,
  TransformedLocationsSchema,
  BookingFieldsSchema,
  SystemField,
  UserField,
  parseBookingLimit,
  getResponseEventTypeIntervalLimits,
  getResponseEventTypeFutureBookingLimits,
  getResponseEventTypeRecurrence,
} from "@calcom/platform-libraries";
import {
  getResponseEventTypeBookerLayouts,
  getResponseEventTypeRequiresConfirmation,
  getResponseEventTypeColors,
  parseEventTypeColor,
  getResponseSeatOptions,
} from "@calcom/platform-libraries-1.2.3";
import {
  TransformFutureBookingsLimitSchema_2024_06_14,
  BookerLayoutsTransformedSchema,
} from "@calcom/platform-types";
import { NoticeThreshold_2024_06_14 } from "@calcom/platform-types";

type EventTypeRelations = { users: User[]; schedule: Schedule | null };
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
>;

@Injectable()
export class OutputEventTypesService_2024_06_14 {
  getResponseEventType(ownerId: number, databaseEventType: Input) {
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
      schedulingType,
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
    } = databaseEventType;

    const locations = this.transformLocations(databaseEventType.locations);
    const bookingFields = databaseEventType.bookingFields
      ? this.transformBookingFields(BookingFieldsSchema.parse(databaseEventType.bookingFields))
      : [];
    const recurrence = this.transformRecurringEvent(databaseEventType.recurringEvent);
    const metadata = this.transformMetadata(databaseEventType.metadata) || {};
    const users = this.transformUsers(databaseEventType.users || []);
    const bookingLimitsCount = this.transformIntervalLimits(databaseEventType.bookingLimits);
    const bookingLimitsDuration = this.transformIntervalLimits(databaseEventType.durationLimits);
    const eventTypeColor = this.transformEventTypeColor(databaseEventType.eventTypeColor);
    const bookerLayouts = this.transformBookerLayouts(
      metadata.bookerLayouts as unknown as BookerLayoutsTransformedSchema
    );
    const requiresConfirmation = this.transformRequiresConfirmation(
      databaseEventType.requiresConfirmation,
      metadata.requiresConfirmationThreshold as NoticeThreshold_2024_06_14,
      databaseEventType.requiresConfirmationWillBlockSlot
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
      schedulingType,
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
      requiresConfirmation,
      requiresBookerEmailVerification,
      hideCalendarNotes,
      eventTypeColor,
      seats,
    };
  }

  transformLocations(locations: any) {
    if (!locations) return [];
    return getResponseEventTypeLocations(TransformedLocationsSchema.parse(locations));
  }

  transformBookingFields(inputBookingFields: (SystemField | UserField)[] | null) {
    if (!inputBookingFields) return [];
    const userFields = inputBookingFields.filter((field) => field.editable === "user") as UserField[];
    return getResponseEventTypeBookingFields(userFields);
  }

  transformRecurringEvent(recurringEvent: any) {
    if (!recurringEvent) return null;
    const recurringEventParsed = parseRecurringEvent(recurringEvent);
    return getResponseEventTypeRecurrence(recurringEventParsed);
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
    return getResponseEventTypeIntervalLimits(bookingLimitsParsed);
  }

  transformBookingWindow(bookingLimits: TransformFutureBookingsLimitSchema_2024_06_14) {
    return getResponseEventTypeFutureBookingLimits(bookingLimits);
  }

  transformBookerLayouts(bookerLayouts: BookerLayoutsTransformedSchema) {
    if (!bookerLayouts) return undefined;
    return getResponseEventTypeBookerLayouts(bookerLayouts);
  }

  transformRequiresConfirmation(
    requiresConfirmation: boolean,
    requiresConfirmationThreshold: NoticeThreshold_2024_06_14,
    requiresConfirmationWillBlockSlot: boolean
  ) {
    return getResponseEventTypeRequiresConfirmation(
      requiresConfirmation,
      requiresConfirmationThreshold,
      requiresConfirmationWillBlockSlot
    );
  }

  transformEventTypeColor(eventTypeColor: any) {
    if (!eventTypeColor) return undefined;
    const parsedeventTypeColor = parseEventTypeColor(eventTypeColor);
    return getResponseEventTypeColors(parsedeventTypeColor);
  }

  transformSeats(
    seatsPerTimeSlot: number | null,
    seatsShowAttendees: boolean | null,
    seatsShowAvailabilityCount: boolean | null
  ) {
    if (!seatsPerTimeSlot) return undefined;
    return getResponseSeatOptions({
      seatsPerTimeSlot,
      seatsShowAttendees: !!seatsShowAttendees,
      seatsShowAvailabilityCount: !!seatsShowAvailabilityCount,
    });
  }
}
