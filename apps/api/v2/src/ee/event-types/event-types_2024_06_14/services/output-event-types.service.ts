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
} from "@calcom/platform-libraries";
import { TransformFutureBookingsLimitSchema_2024_06_14 } from "@calcom/platform-types";

type EventTypeRelations = { users: User[]; schedule: Schedule | null };
type DatabaseEventType = EventType & EventTypeRelations;

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
>;

@Injectable()
export class OutputEventTypesService_2024_06_14 {
  async getResponseEventType(ownerId: number, databaseEventType: Input) {
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
      requiresConfirmation,
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
    } = databaseEventType;

    const locations = this.transformLocations(databaseEventType.locations);
    const bookingFields = databaseEventType.bookingFields
      ? this.transformBookingFields(BookingFieldsSchema.parse(databaseEventType.bookingFields))
      : [];
    const recurringEvent = this.transformRecurringEvent(databaseEventType.recurringEvent);
    const metadata = this.transformMetadata(databaseEventType.metadata) || {};
    const users = this.transformUsers(databaseEventType.users);
    const bookingLimitsCount = this.transformIntervalLimits(databaseEventType.bookingLimits);
    const bookingLimitsDuration = this.transformIntervalLimits(databaseEventType.durationLimits);
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
      recurringEvent,
      disableGuests,
      slotInterval,
      minimumBookingNotice,
      beforeEventBuffer,
      afterEventBuffer,
      schedulingType,
      metadata,
      requiresConfirmation,
      price,
      currency,
      lockTimeZoneToggleOnBookingPage,
      seatsPerTimeSlot,
      forwardParamsSuccessRedirect,
      successRedirectUrl,
      seatsShowAvailabilityCount,
      isInstantEvent,
      users,
      scheduleId,
      bookingLimitsCount,
      bookingLimitsDuration,
      onlyShowFirstAvailableSlot,
      offsetStart,
      bookingWindow,
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
    return parseRecurringEvent(recurringEvent);
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
}
