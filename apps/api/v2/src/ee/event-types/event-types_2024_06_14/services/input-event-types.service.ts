import { Injectable } from "@nestjs/common";

import {
  transformBookingFieldsApiToInternal,
  transformLocationsApiToInternal,
  transformIntervalLimitsApiToInternal,
  transformFutureBookingLimitsApiToInternal,
  transformRecurrenceApiToInternal,
  systemBeforeFieldName,
  systemBeforeFieldEmail,
  systemAfterFieldRescheduleReason,
} from "@calcom/platform-libraries";
import { systemBeforeFieldLocation } from "@calcom/platform-libraries";
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

    const {
      lengthInMinutes,
      locations,
      bookingFields,
      bookingLimitsCount,
      bookingLimitsDuration,
      bookingWindow,
      recurrence,
      ...rest
    } = inputEventType;

    const hasMultipleLocations = (locations || defaultLocations).length > 1;
    const eventType = {
      ...rest,
      length: lengthInMinutes,
      locations: this.transformInputLocations(locations || defaultLocations),
      bookingFields: this.transformInputBookingFields(bookingFields, hasMultipleLocations),
      bookingLimits: bookingLimitsCount ? this.transformInputIntervalLimits(bookingLimitsCount) : undefined,
      durationLimits: bookingLimitsDuration
        ? this.transformInputIntervalLimits(bookingLimitsDuration)
        : undefined,
      ...this.transformInputBookingWindow(bookingWindow),
      recurringEvent: recurrence ? this.transformInputRecurrignEvent(recurrence) : undefined,
    };

    return eventType;
  }

  transformInputUpdateEventType(inputEventType: UpdateEventTypeInput_2024_06_14) {
    const {
      lengthInMinutes,
      locations,
      bookingFields,
      scheduleId,
      bookingLimitsCount,
      bookingLimitsDuration,
      bookingWindow,
      recurrence,
      ...rest
    } = inputEventType;

    const hasMultipleLocations = !!(locations && locations?.length > 1);

    const eventType = {
      ...rest,
      length: lengthInMinutes,
      locations: locations ? this.transformInputLocations(locations) : undefined,
      bookingFields: bookingFields
        ? this.transformInputBookingFields(bookingFields, hasMultipleLocations)
        : undefined,
      schedule: scheduleId,
      bookingLimits: bookingLimitsCount ? this.transformInputIntervalLimits(bookingLimitsCount) : undefined,
      durationLimits: bookingLimitsDuration
        ? this.transformInputIntervalLimits(bookingLimitsDuration)
        : undefined,
      ...this.transformInputBookingWindow(bookingWindow),
      recurringEvent: recurrence ? this.transformInputRecurrignEvent(recurrence) : undefined,
    };

    return eventType;
  }

  transformInputLocations(inputLocations: CreateEventTypeInput_2024_06_14["locations"]) {
    return transformLocationsApiToInternal(inputLocations);
  }

  transformInputBookingFields(
    inputBookingFields: CreateEventTypeInput_2024_06_14["bookingFields"],
    hasMultipleLocations: boolean
  ) {
    const defaultFieldsBefore = [systemBeforeFieldName, systemBeforeFieldEmail];
    // note(Lauris): if event type has multiple locations then a radio button booking field has to be displayed to allow booker to pick location
    if (hasMultipleLocations) {
      defaultFieldsBefore.push(systemBeforeFieldLocation);
    }

    const customFields = transformBookingFieldsApiToInternal(inputBookingFields);
    const defaultFieldsAfter = [systemAfterFieldRescheduleReason];

    return [...defaultFieldsBefore, ...customFields, ...defaultFieldsAfter];
  }

  transformInputIntervalLimits(inputBookingFields: CreateEventTypeInput_2024_06_14["bookingLimitsCount"]) {
    return transformIntervalLimitsApiToInternal(inputBookingFields);
  }

  transformInputBookingWindow(inputBookingWindow: CreateEventTypeInput_2024_06_14["bookingWindow"]) {
    const res = transformFutureBookingLimitsApiToInternal(inputBookingWindow);
    return !!res ? res : {};
  }

  transformInputRecurrignEvent(recurrence: CreateEventTypeInput_2024_06_14["recurrence"]) {
    return transformRecurrenceApiToInternal(recurrence);
  }
}
