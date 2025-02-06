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
  systemBeforeFieldLocation,
  systemAfterFieldTitle,
  systemAfterFieldNotes,
  systemAfterFieldGuests,
  systemAfterFieldRescheduleReason,
  EventTypeMetaDataSchema,
  transformBookerLayoutsApiToInternal,
  transformConfirmationPolicyApiToInternal,
  transformEventColorsApiToInternal,
  validateCustomEventName,
  transformSeatsApiToInternal,
  SystemField,
  CustomField,
} from "@calcom/platform-libraries";
import {
  CreateEventTypeInput_2024_06_14,
  DestinationCalendar_2024_06_14,
  InputEventTransformed_2024_06_14,
  UpdateEventTypeInput_2024_06_14,
} from "@calcom/platform-types";

import { OutputEventTypesService_2024_06_14 } from "./output-event-types.service";

interface ValidationContext {
  eventTypeId?: number;
  seatsPerTimeSlot?: number | null;
  locations?: InputEventTransformed_2024_06_14["locations"];
  requiresConfirmation?: boolean;
  eventName?: string;
}

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

    await this.validateEventTypeInputs({
      seatsPerTimeSlot: transformedBody.seatsPerTimeSlot,
      locations: transformedBody.locations,
      requiresConfirmation: transformedBody.requiresConfirmation,
      eventName: transformedBody.eventName,
    });

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

    await this.validateEventTypeInputs({
      eventTypeId: eventTypeId,
      seatsPerTimeSlot: transformedBody.seatsPerTimeSlot,
      locations: transformedBody.locations,
      requiresConfirmation: transformedBody.requiresConfirmation,
      eventName: transformedBody.eventName,
    });

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
      lengthInMinutesOptions,
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
        multipleDuration: lengthInMinutesOptions,
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
      lengthInMinutesOptions,
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
        multipleDuration: lengthInMinutesOptions,
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
    const internalFields: (SystemField | CustomField)[] = inputBookingFields
      ? transformBookingFieldsApiToInternal(inputBookingFields)
      : [];
    const systemCustomFields = internalFields.filter((field) => !this.isUserCustomField(field));
    const userCustomFields = internalFields.filter((field) => this.isUserCustomField(field));

    const systemCustomNameField = systemCustomFields?.find((field) => field.type === "name");
    const systemCustomEmailField = systemCustomFields?.find((field) => field.type === "email");
    const systemCustomTitleField = systemCustomFields?.find((field) => field.name === "title");
    const systemCustomNotesField = systemCustomFields?.find((field) => field.name === "notes");
    const systemCustomGuestsField = systemCustomFields?.find((field) => field.name === "guests");
    const systemCustomRescheduleReasonField = systemCustomFields?.find(
      (field) => field.name === "rescheduleReason"
    );

    const defaultFieldsBefore: (SystemField | CustomField)[] = [
      systemCustomNameField || systemBeforeFieldName,
      systemCustomEmailField || systemBeforeFieldEmail,
      systemBeforeFieldLocation,
    ];

    const defaultFieldsAfter = [
      systemCustomTitleField || systemAfterFieldTitle,
      systemCustomNotesField || systemAfterFieldNotes,
      systemCustomGuestsField || systemAfterFieldGuests,
      systemCustomRescheduleReasonField || systemAfterFieldRescheduleReason,
    ];

    return [...defaultFieldsBefore, ...userCustomFields, ...defaultFieldsAfter];
  }

  isUserCustomField(field: SystemField | CustomField): field is CustomField {
    return (
      field.type !== "name" &&
      field.type !== "email" &&
      field.name !== "title" &&
      field.name !== "notes" &&
      field.name !== "guests" &&
      field.name !== "rescheduleReason"
    );
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
    if (!recurrence || recurrence.disabled) {
      return undefined;
    }

    return transformRecurrenceApiToInternal(recurrence);
  }

  transformInputEventTypeColor(color: CreateEventTypeInput_2024_06_14["color"]) {
    return transformEventColorsApiToInternal(color);
  }

  transformInputSeatOptions(seats: CreateEventTypeInput_2024_06_14["seats"]) {
    return transformSeatsApiToInternal(seats);
  }
  async validateEventTypeInputs({
    eventTypeId,
    seatsPerTimeSlot,
    locations,
    requiresConfirmation,
    eventName,
  }: ValidationContext) {
    let seatsPerTimeSlotDb: number | null = null;
    let locationsDb: ReturnType<typeof this.transformInputLocations> = [];
    let requiresConfirmationDb = false;

    if (eventTypeId != null) {
      const eventTypeDb = await this.eventTypesRepository.getEventTypeWithSeats(eventTypeId);
      seatsPerTimeSlotDb = eventTypeDb?.seatsPerTimeSlot ?? null;
      locationsDb = this.outputEventTypesService.transformLocations(eventTypeDb?.locations) ?? [];
      requiresConfirmationDb = eventTypeDb?.requiresConfirmation ?? false;
    }

    const seatsPerTimeSlotFinal = seatsPerTimeSlot !== undefined ? seatsPerTimeSlot : seatsPerTimeSlotDb;
    const seatsEnabledFinal = seatsPerTimeSlotFinal != null && seatsPerTimeSlotFinal > 0;

    const locationsFinal = locations !== undefined ? locations : locationsDb;
    const requiresConfirmationFinal =
      requiresConfirmation !== undefined ? requiresConfirmation : requiresConfirmationDb;

    this.validateSeatsSingleLocationRule(seatsEnabledFinal, locationsFinal);
    this.validateSeatsRequiresConfirmationFalseRule(seatsEnabledFinal, requiresConfirmationFinal);
    this.validateMultipleLocationsSeatsDisabledRule(locationsFinal, seatsEnabledFinal);
    this.validateRequiresConfirmationSeatsDisabledRule(requiresConfirmationFinal, seatsEnabledFinal);

    if (eventName) {
      await this.validateCustomEventNameInput(eventName);
    }
  }
  validateSeatsSingleLocationRule(
    seatsEnabled: boolean,
    locations: ReturnType<typeof this.transformInputLocations>
  ) {
    if (seatsEnabled && locations.length > 1) {
      throw new BadRequestException(
        "Seats Validation failed: Seats are enabled but more than one location provided."
      );
    }
  }

  validateSeatsRequiresConfirmationFalseRule(seatsEnabled: boolean, requiresConfirmation: boolean) {
    if (seatsEnabled && requiresConfirmation) {
      throw new BadRequestException(
        "Seats Validation failed: Seats are enabled but requiresConfirmation is true."
      );
    }
  }

  validateMultipleLocationsSeatsDisabledRule(
    locations: ReturnType<typeof this.transformInputLocations>,
    seatsEnabled: boolean
  ) {
    if (locations.length > 1 && seatsEnabled) {
      throw new BadRequestException("Locations Validation failed: Multiple locations but seats are enabled.");
    }
  }

  validateRequiresConfirmationSeatsDisabledRule(requiresConfirmation: boolean, seatsEnabled: boolean) {
    if (requiresConfirmation && seatsEnabled) {
      throw new BadRequestException(
        "RequiresConfirmation Validation failed: Seats are enabled but requiresConfirmation is true."
      );
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
