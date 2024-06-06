import { SchedulesService } from "@/ee/schedules/services/schedules.service";
import { Injectable } from "@nestjs/common";
import type { EventType, User, Schedule } from "@prisma/client";

import {
  EventTypeMetaDataSchema,
  userMetadata,
  getResponseEventTypeLocations,
  getResponseEventTypeBookingFields,
  parseRecurringEvent,
} from "@calcom/platform-libraries";
import { TransformedLocationsSchema, BookingFieldsSchema } from "@calcom/platform-libraries";

type EventTypeRelations = { users: User[]; schedule: Schedule | null };
type DatabaseEventType = EventType & EventTypeRelations;

@Injectable()
export class OutputEventTypesService {
  async getResponseEventType(ownerId: number, databaseEventType: DatabaseEventType) {
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
      disableGuests,
      slotInterval,
      minimumBookingNotice,
      beforeEventBuffer,
      afterEventBuffer,
      schedulingType,
      recurringEvent,
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

  transformLocations(locations: EventType["locations"]) {
    return getResponseEventTypeLocations(TransformedLocationsSchema.parse(locations));
  }

  transformBookingFields(inputBookingFields: EventType["bookingFields"]) {
    return getResponseEventTypeBookingFields(BookingFieldsSchema.parse(inputBookingFields));
  }

  transformRecurringEvent(obj: unknown) {
    return parseRecurringEvent(obj);
  }

  transformMetadata(obj: unknown) {
    return EventTypeMetaDataSchema.parse(obj);
  }

  async getSchedule(databaseEventType: DatabaseEventType) {
    return databaseEventType.schedule || null;
  }

  transformUsers(users: User[]) {
    return users.map((user) => {
      const metadata = userMetadata.parse(user.metadata) || {};
      return {
        id: user.id,
        name: user.name,
        username: user.username,
        avatarUrl: user.avatarUrl,
        brandColor: user.brandColor,
        darkBrandColor: user.darkBrandColor,
        weekStart: user.weekStart,
        metadata,
      };
    });
  }
}
