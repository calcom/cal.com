import { EventTypesRepository_2024_06_14 } from "@/ee/event-types/event-types_2024_06_14/event-types.repository";
import { Injectable } from "@nestjs/common";

import {
  transformApiEventTypeBookingFields,
  transformApiEventTypeLocations,
  transformApiEventTypeIntervalLimits,
  transformApiEventTypeFutureBookingLimits,
  EventTypeMetaDataSchema,
  transformApiEventTypeRecurrence,
} from "@calcom/platform-libraries";
import {
  transformApiEventTypeBookerLayouts,
  transformApiEventTypeRequiresConfirmation,
} from "@calcom/platform-libraries-1.2.3";
import { CreateEventTypeInput_2024_06_14, UpdateEventTypeInput_2024_06_14 } from "@calcom/platform-types";

@Injectable()
export class InputEventTypesService_2024_06_14 {
  constructor(private readonly eventTypesRepository: EventTypesRepository_2024_06_14) {}
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
      bookerLayouts,
      requiresConfirmation,
      recurrence,
      ...rest
    } = inputEventType;
    const requiresConfirmationTransformed =
      this.transformInputRequiresConfirmationThreshold(requiresConfirmation);

    const eventType = {
      ...rest,
      length: lengthInMinutes,
      locations: this.transformInputLocations(locations || defaultLocations),
      bookingFields: this.transformInputBookingFields(bookingFields),
      bookingLimits: bookingLimitsCount ? this.transformInputIntervalLimits(bookingLimitsCount) : undefined,
      durationLimits: bookingLimitsDuration
        ? this.transformInputIntervalLimits(bookingLimitsDuration)
        : undefined,
      ...this.transformInputBookingWindow(bookingWindow),
      metadata: {
        bookerLayouts: this.transformInputBookerLayouts(bookerLayouts),
        requiresConfirmationThreshold:
          requiresConfirmationTransformed?.requiresConfirmationThreshold ?? undefined,
      },
      requiresConfirmation: requiresConfirmationTransformed?.requiresConfirmation ?? undefined,
      recurringEvent: recurrence ? this.transformInputRecurrignEvent(recurrence) : undefined,
    };

    return eventType;
  }

  async transformInputUpdateEventType(inputEventType: UpdateEventTypeInput_2024_06_14, eventTypeId: number) {
    const {
      lengthInMinutes,
      locations,
      bookingFields,
      scheduleId,
      bookingLimitsCount,
      bookingLimitsDuration,
      bookingWindow,
      bookerLayouts,
      requiresConfirmation,
      recurrence,
      ...rest
    } = inputEventType;
    const eventTypeDb = await this.eventTypesRepository.getEventTypeWithMetaData(eventTypeId);
    const metadataTransformed = !!eventTypeDb?.metadata
      ? EventTypeMetaDataSchema.parse(eventTypeDb.metadata)
      : {};

    const requiresConfirmationTransformed =
      this.transformInputRequiresConfirmationThreshold(requiresConfirmation);
    const eventType = {
      ...rest,
      length: lengthInMinutes,
      locations: locations ? this.transformInputLocations(locations) : undefined,
      bookingFields: bookingFields ? this.transformInputBookingFields(bookingFields) : undefined,
      schedule: scheduleId,
      bookingLimits: bookingLimitsCount ? this.transformInputIntervalLimits(bookingLimitsCount) : undefined,
      durationLimits: bookingLimitsDuration
        ? this.transformInputIntervalLimits(bookingLimitsDuration)
        : undefined,
      ...this.transformInputBookingWindow(bookingWindow),
      metadata: {
        ...metadataTransformed,
        bookerLayouts: this.transformInputBookerLayouts(bookerLayouts),
        requiresConfirmationThreshold: requiresConfirmationTransformed.requiresConfirmationThreshold,
      },
      requiresConfirmation: requiresConfirmationTransformed.requiresConfirmation,
      recurringEvent: recurrence ? this.transformInputRecurrignEvent(recurrence) : undefined,
    };

    return eventType;
  }

  transformInputLocations(inputLocations: CreateEventTypeInput_2024_06_14["locations"]) {
    return transformApiEventTypeLocations(inputLocations);
  }

  transformInputBookingFields(inputBookingFields: CreateEventTypeInput_2024_06_14["bookingFields"]) {
    return transformApiEventTypeBookingFields(inputBookingFields);
  }

  transformInputIntervalLimits(inputBookingFields: CreateEventTypeInput_2024_06_14["bookingLimitsCount"]) {
    return transformApiEventTypeIntervalLimits(inputBookingFields);
  }

  transformInputBookingWindow(inputBookingWindow: CreateEventTypeInput_2024_06_14["bookingWindow"]) {
    const res = transformApiEventTypeFutureBookingLimits(inputBookingWindow);
    return !!res ? res : {};
  }

  transformInputBookerLayouts(inputBookerLayouts: CreateEventTypeInput_2024_06_14["bookerLayouts"]) {
    return transformApiEventTypeBookerLayouts(inputBookerLayouts);
  }

  transformInputRequiresConfirmationThreshold(
    requiresConfirmation: CreateEventTypeInput_2024_06_14["requiresConfirmation"]
  ) {
    return transformApiEventTypeRequiresConfirmation(requiresConfirmation);
  }
  transformInputRecurrignEvent(recurrence: CreateEventTypeInput_2024_06_14["recurrence"]) {
    return transformApiEventTypeRecurrence(recurrence);
  }
}
