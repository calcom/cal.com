import { EventTypesRepository_2024_06_14 } from "@/ee/event-types/event-types_2024_06_14/event-types.repository";
import { Injectable, BadRequestException } from "@nestjs/common";

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
  transformApiEventTypeColors,
  transformApiSeatOptions,
} from "@calcom/platform-libraries-1.2.3";
import { CreateEventTypeInput_2024_06_14, UpdateEventTypeInput_2024_06_14 } from "@calcom/platform-types";

import { OutputEventTypesService_2024_06_14 } from "./output-event-types.service";

@Injectable()
export class InputEventTypesService_2024_06_14 {
  constructor(
    private readonly eventTypesRepository: EventTypesRepository_2024_06_14,
    private readonly outputEventTypesService: OutputEventTypesService_2024_06_14
  ) {}
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
      color,
      recurrence,
      seats,
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
      requiresConfirmationWillBlockSlot:
        requiresConfirmationTransformed?.requiresConfirmationWillBlockSlot ?? undefined,
      eventTypeColor: this.transformInputEventTypeColor(color),
      recurringEvent: recurrence ? this.transformInputRecurrignEvent(recurrence) : undefined,
      ...this.transformInputSeatOptions(seats),
    };

    return eventType;
  }

  async transformInputUpdateEventType(inputEventType: UpdateEventTypeInput_2024_06_14, eventTypeId: number) {
    const {
      lengthInMinutes,
      locations,
      bookingFields,
      bookingLimitsCount,
      bookingLimitsDuration,
      bookingWindow,
      bookerLayouts,
      requiresConfirmation,
      color,
      recurrence,
      seats,
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
      bookingLimits: bookingLimitsCount ? this.transformInputIntervalLimits(bookingLimitsCount) : undefined,
      durationLimits: bookingLimitsDuration
        ? this.transformInputIntervalLimits(bookingLimitsDuration)
        : undefined,
      ...this.transformInputBookingWindow(bookingWindow),
      metadata: {
        ...metadataTransformed,
        bookerLayouts: this.transformInputBookerLayouts(bookerLayouts),
        requiresConfirmationThreshold:
          requiresConfirmationTransformed?.requiresConfirmationThreshold ?? undefined,
      },
      recurringEvent: recurrence ? this.transformInputRecurrignEvent(recurrence) : undefined,
      requiresConfirmation: requiresConfirmationTransformed?.requiresConfirmation ?? undefined,
      requiresConfirmationWillBlockSlot:
        requiresConfirmationTransformed?.requiresConfirmationWillBlockSlot ?? undefined,
      eventTypeColor: this.transformInputEventTypeColor(color),
      ...this.transformInputSeatOptions(seats),
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

  transformInputEventTypeColor(color: CreateEventTypeInput_2024_06_14["color"]) {
    return transformApiEventTypeColors(color);
  }

  transformInputSeatOptions(seats: CreateEventTypeInput_2024_06_14["seats"]) {
    return transformApiSeatOptions(seats);
  }
  async validateEventTypeInputs(
    eventTypeId?: number,
    seatsEnabled?: boolean,
    locations?: ReturnType<typeof this.transformInputLocations>,
    requiresConfirmation?: boolean
  ) {
    // Retrieve event type details from the database if eventTypeId is provided

    if (eventTypeId != null) {
      const eventTypeDb = await this.eventTypesRepository.getEventTypeWithSeats(eventTypeId);
      const seatsEnabledDb = !!eventTypeDb?.seatsPerTimeSlot && eventTypeDb.seatsPerTimeSlot > 0;
      const locationsDb = this.outputEventTypesService.transformLocations(eventTypeDb?.locations);
      const requiresConfirmationDb = eventTypeDb?.requiresConfirmation ?? false;

      seatsEnabled &&
        (await this.validateSeatsInput(
          locations,
          requiresConfirmation,
          locationsDb,
          requiresConfirmationDb,
          true
        ));
      locations &&
        locations.length > 1 &&
        (await this.validateLocationsInput(seatsEnabled, locations, seatsEnabledDb, true));
      requiresConfirmation &&
        (await this.validateRequiresConfirmationInput(
          requiresConfirmation,
          seatsEnabled,
          seatsEnabledDb,
          true
        ));
    } else {
      seatsEnabled &&
        (await this.validateSeatsInput(locations, requiresConfirmation, undefined, undefined, false));
      locations?.length > 1 && (await this.validateLocationsInput(seatsEnabled, locations, undefined, false));
      requiresConfirmation &&
        (await this.validateRequiresConfirmationInput(requiresConfirmation, seatsEnabled, undefined, false));
    }
  }
  async validateSeatsInput(
    locations?: ReturnType<typeof this.transformInputLocations>,
    requiresConfirmation?: boolean,
    locationsDb?: ReturnType<typeof this.transformInputLocations>,
    requiresConfirmationDb?: boolean,
    validateDb = false
  ) {
    if (validateDb) {
      // Validate based on both provided and database values

      // 1. Check if provided locations have more than one entry
      if (locations && locations.length > 1) {
        throw new BadRequestException("Seats Validation failed: More than one location provided.");
      }

      // 2. If no locations are provided, validate based on the stored locations
      if (!locations && locationsDb.length > 1) {
        throw new BadRequestException(
          "Seats Validation failed: More than one location stored in the database."
        );
      }

      // 3. Check if requiresConfirmation is true
      if (requiresConfirmation === true) {
        throw new BadRequestException("Seats Validation failed: Requires confirmation is true.");
      }

      // 4. If requiresConfirmation is not provided, validate based on the stored value
      if (requiresConfirmation == null && requiresConfirmationDb === true) {
        throw new BadRequestException("Validation failed: Requires confirmation is true in the database.");
      }

      // If all checks are passed, validation is successful
      return;
    } else {
      // Validate based on the provided locations and requiresConfirmation values

      // 1. If locations are provided and the length is greater than 1, throw an error.
      if (locations && locations.length > 1) {
        throw new BadRequestException("Seats Validation failed: More than one location provided.");
      }

      // 2. If requiresConfirmation is true, throw an error.
      if (requiresConfirmation === true) {
        throw new BadRequestException("Seats Validation failed: Requires confirmation is true.");
      }

      // 3. If no failing conditions were met, pass validation.
      return;
    }
  }
  async validateLocationsInput(
    seatsEnabled?: boolean,
    locations?: ReturnType<typeof this.transformInputLocations>,
    seatsEnabledDb?: boolean,
    validateDb = false
  ) {
    if (validateDb) {
      // Validate based on both provided and database values

      // 1. If seats are enabled and multiple locations are provided, validate the count
      if (seatsEnabled && locations && locations.length > 1) {
        throw new BadRequestException(
          "Locations Validation failed: Seats are enabled but more than one location provided."
        );
      }

      // 2. If no locations are provided, validate based on the stored locations and seatsEnabled status
      if (seatsEnabledDb === true && locations && locations.length > 1) {
        throw new BadRequestException(
          "Locations Validation failed: Seats are enabled in database but more than one location provided."
        );
      }

      // If all checks are passed, validation is successful
      return;
    } else {
      // Validate based on the provided seatsEnabled and locations values

      // 1. If seats are enabled and more than one location is provided, throw an error.
      if (seatsEnabled && locations && locations.length > 1) {
        throw new BadRequestException(
          "Locations Validation failed: Seats are enabled but more than one location provided."
        );
      }

      // If no failing conditions were met, pass validation.
      return;
    }
  }
  async validateRequiresConfirmationInput(
    requiresConfirmation?: boolean,
    seatsEnabled?: boolean,
    seatsEnabledDb?: boolean,
    validateDb = false
  ) {
    if (validateDb) {
      // Validate based on both provided and database values

      // 1. If seats are enabled and requiresConfirmation is true, validate based on the stored value
      if (seatsEnabled && requiresConfirmation) {
        throw new BadRequestException(
          "RequiresConfirmation Validation failed: RequiresConfirmation is set but Seats are enabled."
        );
      }

      // 2. If seats are enabled in the database and requiresConfirmation is true, throw an error
      if (seatsEnabledDb && requiresConfirmation) {
        throw new BadRequestException(
          "RequiresConfirmation Validation failed: RequiresConfirmation is set but Seats are enabled in the database."
        );
      }

      // If all checks are passed, validation is successful
      return;
    } else {
      // Validate based on the provided requiresConfirmation and seatsEnabled values

      // 1. If seats are enabled and requiresConfirmation is true, throw an error.
      if (seatsEnabled && requiresConfirmation === true) {
        throw new BadRequestException(
          "RequiresConfirmation Validation failed: RequiresConfirmation is set but Seats are enabled."
        );
      }

      // If no failing conditions were met, pass validation.
      return;
    }
  }
}
