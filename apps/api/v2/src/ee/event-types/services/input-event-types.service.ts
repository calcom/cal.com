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

    const eventType = {
      length: lengthInMinutes,
      slug: slugify(rest.title),
      locations: this.transformInputLocations(locations || defaultLocations),
      bookingFields: this.transformInputBookingFields(bookingFields),
      ...rest,
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
