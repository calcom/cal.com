import { ConnectedCalendarsData } from "@/ee/calendars/outputs/connected-calendars.output";
import { CalendarsService } from "@/ee/calendars/services/calendars.service";
import { EventTypesRepository_2024_06_14 } from "@/ee/event-types/event-types_2024_06_14/event-types.repository";
import { UserWithProfile } from "@/modules/users/users.repository";
import { Injectable, BadRequestException } from "@nestjs/common";

import {
  transformBookingFieldsApiToInternal,
  transformLocationsApiToInternal,
  transformIntervalLimitsApiToInternal,
  transformFutureBookingLimitsApiToInternal,
  transformRecurrenceApiToInternal,
  systemBeforeFieldName,
  systemBeforeFieldEmail,
  systemAfterFieldRescheduleReason,
  EventTypeMetaDataSchema,
  systemBeforeFieldLocation,
} from "@calcom/platform-libraries";
import {
  transformBookerLayoutsApiToInternal,
  transformConfirmationPolicyApiToInternal,
  transformEventColorsApiToInternal,
  validateCustomEventName,
  transformSeatsApiToInternal,
} from "@calcom/platform-libraries-1.2.3";
import {
  CreateEventTypeInput_2024_06_14,
  DestinationCalendar_2024_06_14,
  UpdateEventTypeInput_2024_06_14,
} from "@calcom/platform-types";

import { OutputEventTypesService_2024_06_14 } from "./output-event-types.service";

@Injectable()
export class InputEventTypesService_2024_06_14 {
  constructor(
    private readonly eventTypesRepository: EventTypesRepository_2024_06_14,
    private readonly outputEventTypesService: OutputEventTypesService_2024_06_14,
    private readonly calendarsService: CalendarsService
  ) {}

  async transformAndValidateCreateEventTypeInput(
    userId: UserWithProfile["id"],
    inputEventType: CreateEventTypeInput_2024_06_14
  ) {
    const transformedBody = this.transformInputCreateEventType(inputEventType);

    await this.validateEventTypeInputs(
      undefined,
      !!(transformedBody.seatsPerTimeSlot && transformedBody?.seatsPerTimeSlot > 0),
      transformedBody.locations,
      transformedBody.requiresConfirmation,
      transformedBody.eventName
    );

    transformedBody.destinationCalendar &&
      (await this.validateInputDestinationCalendar(userId, transformedBody.destinationCalendar));

    transformedBody.useEventTypeDestinationCalendarEmail &&
      (await this.validateInputUseDestinationCalendarEmail(userId));

    return transformedBody;
  }

  async transformAndValidateUpdateEventTypeInput(
    inputEventType: UpdateEventTypeInput_2024_06_14,
    userId: UserWithProfile["id"],
    eventTypeId: number
  ) {
    const transformedBody = await this.transformInputUpdateEventType(inputEventType, eventTypeId);

    await this.validateEventTypeInputs(
      eventTypeId,
      !!(transformedBody?.seatsPerTimeSlot && transformedBody?.seatsPerTimeSlot > 0),
      transformedBody.locations,
      transformedBody.requiresConfirmation,
      transformedBody.eventName
    );

    transformedBody.destinationCalendar &&
      (await this.validateInputDestinationCalendar(userId, transformedBody.destinationCalendar));

    transformedBody.useEventTypeDestinationCalendarEmail &&
      (await this.validateInputUseDestinationCalendarEmail(userId));

    return transformedBody;
  }

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
      confirmationPolicy,
      color,
      recurrence,
      seats,
      customName,
      useDestinationCalendarEmail,
      ...rest
    } = inputEventType;
    const confirmationPolicyTransformed = this.transformInputConfirmationPolicy(confirmationPolicy);

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
      metadata: {
        bookerLayouts: this.transformInputBookerLayouts(bookerLayouts),
        requiresConfirmationThreshold:
          confirmationPolicyTransformed?.requiresConfirmationThreshold ?? undefined,
      },
      requiresConfirmation: confirmationPolicyTransformed?.requiresConfirmation ?? undefined,
      requiresConfirmationWillBlockSlot:
        confirmationPolicyTransformed?.requiresConfirmationWillBlockSlot ?? undefined,
      eventTypeColor: this.transformInputEventTypeColor(color),
      recurringEvent: recurrence ? this.transformInputRecurrignEvent(recurrence) : undefined,
      ...this.transformInputSeatOptions(seats),
      eventName: customName,
      useEventTypeDestinationCalendarEmail: useDestinationCalendarEmail,
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
      confirmationPolicy,
      color,
      recurrence,
      seats,
      customName,
      useDestinationCalendarEmail,
      ...rest
    } = inputEventType;
    const eventTypeDb = await this.eventTypesRepository.getEventTypeWithMetaData(eventTypeId);
    const metadataTransformed = !!eventTypeDb?.metadata
      ? EventTypeMetaDataSchema.parse(eventTypeDb.metadata)
      : {};

    const confirmationPolicyTransformed = this.transformInputConfirmationPolicy(confirmationPolicy);
    const hasMultipleLocations = !!(locations && locations?.length > 1);

    const eventType = {
      ...rest,
      length: lengthInMinutes,
      locations: locations ? this.transformInputLocations(locations) : undefined,
      bookingFields: bookingFields
        ? this.transformInputBookingFields(bookingFields, hasMultipleLocations)
        : undefined,
      schedule: inputEventType.scheduleId,
      bookingLimits: bookingLimitsCount ? this.transformInputIntervalLimits(bookingLimitsCount) : undefined,
      durationLimits: bookingLimitsDuration
        ? this.transformInputIntervalLimits(bookingLimitsDuration)
        : undefined,
      ...this.transformInputBookingWindow(bookingWindow),
      metadata: {
        ...metadataTransformed,
        bookerLayouts: this.transformInputBookerLayouts(bookerLayouts),
        requiresConfirmationThreshold:
          confirmationPolicyTransformed?.requiresConfirmationThreshold ?? undefined,
      },
      recurringEvent: recurrence ? this.transformInputRecurrignEvent(recurrence) : undefined,
      requiresConfirmation: confirmationPolicyTransformed?.requiresConfirmation ?? undefined,
      requiresConfirmationWillBlockSlot:
        confirmationPolicyTransformed?.requiresConfirmationWillBlockSlot ?? undefined,
      eventTypeColor: this.transformInputEventTypeColor(color),
      ...this.transformInputSeatOptions(seats),
      eventName: customName,
      useEventTypeDestinationCalendarEmail: useDestinationCalendarEmail,
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

  transformInputBookerLayouts(inputBookerLayouts: CreateEventTypeInput_2024_06_14["bookerLayouts"]) {
    return transformBookerLayoutsApiToInternal(inputBookerLayouts);
  }

  transformInputConfirmationPolicy(
    requiresConfirmation: CreateEventTypeInput_2024_06_14["confirmationPolicy"]
  ) {
    return transformConfirmationPolicyApiToInternal(requiresConfirmation);
  }
  transformInputRecurrignEvent(recurrence: CreateEventTypeInput_2024_06_14["recurrence"]) {
    return transformRecurrenceApiToInternal(recurrence);
  }

  transformInputEventTypeColor(color: CreateEventTypeInput_2024_06_14["color"]) {
    return transformEventColorsApiToInternal(color);
  }

  transformInputSeatOptions(seats: CreateEventTypeInput_2024_06_14["seats"]) {
    return transformSeatsApiToInternal(seats);
  }
  async validateEventTypeInputs(
    eventTypeId?: number,
    seatsEnabled?: boolean,
    locations?: ReturnType<typeof this.transformInputLocations>,
    requiresConfirmation?: boolean,
    eventName?: string
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
      eventName && (await this.validateCustomEventNameInput(eventName));
    } else {
      seatsEnabled &&
        (await this.validateSeatsInput(locations, requiresConfirmation, undefined, undefined, false));
      locations?.length > 1 && (await this.validateLocationsInput(seatsEnabled, locations, undefined, false));
      requiresConfirmation &&
        (await this.validateRequiresConfirmationInput(requiresConfirmation, seatsEnabled, undefined, false));
      eventName && (await this.validateCustomEventNameInput(eventName));
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

  async validateCustomEventNameInput(value: string) {
    const validationResult = validateCustomEventName(value);
    if (validationResult !== true) {
      throw new BadRequestException(`Invalid event name variables: ${validationResult}`);
    }
    return;
  }

  async validateInputDestinationCalendar(
    userId: number,
    destinationCalendar: DestinationCalendar_2024_06_14
  ) {
    const calendars: ConnectedCalendarsData = await this.calendarsService.getCalendars(userId);

    const allCals = calendars.connectedCalendars.map((cal) => cal.calendars ?? []).flat();

    const matchedCalendar = allCals.find(
      (cal) =>
        cal.externalId === destinationCalendar.externalId &&
        cal.integration === destinationCalendar.integration
    );

    if (!matchedCalendar) {
      throw new BadRequestException("Invalid destinationCalendarId: Calendar does not exist");
    }

    if (matchedCalendar.readOnly) {
      throw new BadRequestException("Invalid destinationCalendarId: Calendar does not have write permission");
    }

    return;
  }

  async validateInputUseDestinationCalendarEmail(userId: number) {
    const calendars: ConnectedCalendarsData = await this.calendarsService.getCalendars(userId);

    const allCals = calendars.connectedCalendars.map((cal) => cal.calendars ?? []).flat();

    const primaryCalendar = allCals.find((cal) => cal.primary);

    if (!primaryCalendar) {
      throw new BadRequestException(
        "Validation failed: A primary connected calendar is required to set useDestinationCalendarEmail"
      );
    }

    return;
  }
}
