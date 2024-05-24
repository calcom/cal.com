import { Injectable } from "@nestjs/common";
import type { EventType } from "@prisma/client";

import { getResponseEventTypeLocations, getResponseEventTypeBookingFields } from "@calcom/platform-libraries";
import { TransformedLocationsSchema, BookingFieldsSchema } from "@calcom/platform-libraries";

@Injectable()
export class OutputEventTypesService {
  async getResponseEventType(databaseEventType: EventType) {
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
    } = databaseEventType;

    const locations = this.transformLocations(databaseEventType.locations);
    const bookingFields = this.transformBookingFields(databaseEventType.bookingFields);

    return {
      id,
      lengthInMinutes: length,
      title,
      description,
      locations,
      bookingFields,
      disableGuests,
      slotInterval,
      minimumBookingNotice,
      beforeEventBuffer,
      afterEventBuffer,
    };
  }

  transformLocations(locations: EventType["locations"]) {
    return getResponseEventTypeLocations(TransformedLocationsSchema.parse(locations));
  }

  transformBookingFields(inputBookingFields: EventType["bookingFields"]) {
    return getResponseEventTypeBookingFields(BookingFieldsSchema.parse(inputBookingFields));
  }
}
