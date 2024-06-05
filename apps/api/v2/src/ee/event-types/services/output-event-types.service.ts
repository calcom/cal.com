import { Injectable } from "@nestjs/common";
import type { EventType, User, Profile, Schedule, Host } from "@prisma/client";

import { getResponseEventTypeLocations, getResponseEventTypeBookingFields } from "@calcom/platform-libraries";
import { TransformedLocationsSchema, BookingFieldsSchema } from "@calcom/platform-libraries";

type EventTypeRelations = { users: User; profile: Profile; schedule: Schedule; hosts: Host };

@Injectable()
export class OutputEventTypesService {
  getResponseEventType(ownerId: number, databaseEventType: EventType & EventTypeRelations) {
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
      recurringEvent,
      users,
      schedule,
      hosts,
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
    } = databaseEventType;

    const locations = this.transformLocations(databaseEventType.locations);
    const bookingFields = this.transformBookingFields(databaseEventType.bookingFields);

    return {
      id,
      ownerId,
      lengthInMinutes: length,
      title,
      slug,
      description,
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
      hosts,
    };
  }

  transformLocations(locations: EventType["locations"]) {
    return getResponseEventTypeLocations(TransformedLocationsSchema.parse(locations));
  }

  transformBookingFields(inputBookingFields: EventType["bookingFields"]) {
    return getResponseEventTypeBookingFields(BookingFieldsSchema.parse(inputBookingFields));
  }
}
