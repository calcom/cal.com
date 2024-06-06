import { Injectable } from "@nestjs/common";

import {
  slugify,
  transformApiEventTypeBookingFields,
  transformApiEventTypeLocations,
} from "@calcom/platform-libraries";
import { CreateEventTypeInput } from "@calcom/platform-types";

@Injectable()
export class InputEventTypesService {
  transformInputCreateEventType(inputEventType: CreateEventTypeInput) {
    const defaultLocations: CreateEventTypeInput["locations"] = [
      {
        type: "integration",
        integration: "cal-video",
      },
    ];

    const { lengthInMinutes, locations, bookingFields, ...rest } = inputEventType;

    const random = Math.floor(100000 + Math.random() * 900000);
    const timestamp = new Date().valueOf();

    const slug = `${slugify(rest.title)}-${timestamp}${random}`;

    const eventType = {
      ...rest,
      length: lengthInMinutes,
      slug,
      locations: this.transformInputLocations(locations || defaultLocations),
      bookingFields: this.transformInputBookingFields(bookingFields),
    };

    return eventType;
  }

  transformInputLocations(inputLocations: CreateEventTypeInput["locations"]) {
    return transformApiEventTypeLocations(inputLocations);
  }

  transformInputBookingFields(inputBookingFields: CreateEventTypeInput["bookingFields"]) {
    return transformApiEventTypeBookingFields(inputBookingFields);
  }
}
