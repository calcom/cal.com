import { Injectable } from "@nestjs/common";

import {
  transformApiEventTypeBookingFields,
  transformApiEventTypeLocations,
} from "@calcom/platform-libraries-0.0.13";
import { CreateEventTypeInput_2024_06_14, UpdateEventTypeInput_2024_06_14 } from "@calcom/platform-types";

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

    const eventType = {
      ...rest,
      length: lengthInMinutes,
      locations: this.transformInputLocations(locations || defaultLocations),
      bookingFields: this.transformInputBookingFields(bookingFields),
    };

    return eventType;
  }

  transformInputUpdateEventType(inputEventType: UpdateEventTypeInput_2024_06_14) {
    const { locations, bookingFields, ...rest } = inputEventType;

    const eventType = {
      ...rest,
      locations: locations ? this.transformInputLocations(locations) : undefined,
      bookingFields: bookingFields ? this.transformInputBookingFields(bookingFields) : undefined,
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
