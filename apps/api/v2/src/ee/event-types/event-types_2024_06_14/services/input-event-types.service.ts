import { Injectable } from "@nestjs/common";

import {
  slugify,
  transformApiEventTypeBookingFields,
  transformApiEventTypeLocations,
} from "@calcom/platform-libraries-0.0.6";
import { CreateEventTypeInput_2024_06_14 } from "@calcom/platform-types";

@Injectable()
export class InputEventTypesService_2024_06_14 {
  transformInputCreateEventType(inputEventType: CreateEventTypeInput_2024_06_14) {
    const defaultLocations: CreateEventTypeInput_2024_06_14["locations"] = [
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

  transformInputLocations(inputLocations: CreateEventTypeInput_2024_06_14["locations"]) {
    return transformApiEventTypeLocations(inputLocations);
  }

  transformInputBookingFields(inputBookingFields: CreateEventTypeInput_2024_06_14["bookingFields"]) {
    return transformApiEventTypeBookingFields(inputBookingFields);
  }
}
