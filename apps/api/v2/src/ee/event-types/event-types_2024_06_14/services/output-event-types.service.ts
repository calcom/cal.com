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
} from "@calcom/platform-libraries-0.0.12";

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
  | "schedule"
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
    } = databaseEventType;

    const locations = this.transformLocations(databaseEventType.locations);
    const bookingFields = this.transformBookingFields(databaseEventType.bookingFields);
    const recurringEvent = this.transformRecurringEvent(databaseEventType.recurringEvent);
    const metadata = this.transformMetadata(databaseEventType.metadata) || {};
    const schedule = await this.getSchedule(databaseEventType);
    const users = this.transformUsers(databaseEventType.users);

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
      schedule,
    };
  }

  transformLocations(locations: any) {
    if (!locations) return [];
    return getResponseEventTypeLocations(TransformedLocationsSchema.parse(locations));
  }

  transformBookingFields(inputBookingFields: any) {
    if (!inputBookingFields) return [];
    return getResponseEventTypeBookingFields(BookingFieldsSchema.parse(inputBookingFields));
  }

  transformRecurringEvent(recurringEvent: any) {
    if (!recurringEvent) return null;
    return parseRecurringEvent(recurringEvent);
  }

  transformMetadata(metadata: any) {
    if (!metadata) return {};
    return EventTypeMetaDataSchema.parse(metadata);
  }

  async getSchedule(databaseEventType: Input) {
    return databaseEventType.schedule || null;
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
}
