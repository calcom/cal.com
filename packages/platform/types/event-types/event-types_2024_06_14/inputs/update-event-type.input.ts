import {
  ApiProperty as DocsProperty,
  ApiPropertyOptional as DocsPropertyOptional,
  getSchemaPath,
  ApiExtraModels,
} from "@nestjs/swagger";
import { Type, Transform } from "class-transformer";
import {
  IsString,
  IsInt,
  IsBoolean,
  IsOptional,
  Min,
  ValidateNested,
  IsArray,
  ArrayNotEmpty,
  ArrayUnique,
  IsUrl,
} from "class-validator";

import { BookerLayouts_2024_06_14 } from "./booker-layouts.input";
import type { InputBookingField_2024_06_14 } from "./booking-fields.input";
import {
  AddressFieldInput_2024_06_14,
  BooleanFieldInput_2024_06_14,
  CheckboxGroupFieldInput_2024_06_14,
  MultiEmailFieldInput_2024_06_14,
  MultiSelectFieldInput_2024_06_14,
  NumberFieldInput_2024_06_14,
  PhoneFieldInput_2024_06_14,
  RadioGroupFieldInput_2024_06_14,
  SelectFieldInput_2024_06_14,
  TextAreaFieldInput_2024_06_14,
  TextFieldInput_2024_06_14,
  ValidateInputBookingFields_2024_06_14,
} from "./booking-fields.input";
import type { BookingLimitsCount_2024_06_14 } from "./booking-limits-count.input";
import { BaseBookingLimitsCount_2024_06_14, ValidateBookingLimistsCount } from "./booking-limits-count.input";
import type { BookingLimitsDuration_2024_06_14 } from "./booking-limits-duration.input";
import {
  BaseBookingLimitsDuration_2024_06_14,
  ValidateBookingLimistsDuration,
} from "./booking-limits-duration.input";
import {
  BusinessDaysWindow_2024_06_14,
  CalendarDaysWindow_2024_06_14,
  RangeWindow_2024_06_14,
  ValidateBookingWindow,
  type BookingWindow_2024_06_14,
} from "./booking-window.input";
import type { ConfirmationPolicy_2024_06_14 } from "./confirmation-policy.input";
import { BaseConfirmationPolicy_2024_06_14, ValidateConfirmationPolicy } from "./confirmation-policy.input";
import {
  CREATE_EVENT_DESCRIPTION_EXAMPLE,
  CREATE_EVENT_LENGTH_EXAMPLE,
  CREATE_EVENT_SLUG_EXAMPLE,
  CREATE_EVENT_TITLE_EXAMPLE,
  Host,
} from "./create-event-type.input";
import { DestinationCalendar_2024_06_14 } from "./destination-calendar.input";
import { Disabled_2024_06_14 } from "./disabled.input";
import { EventTypeColor_2024_06_14 } from "./event-type-color.input";
import {
  InputAddressLocation_2024_06_14,
  InputAttendeeAddressLocation_2024_06_14,
  InputAttendeeDefinedLocation_2024_06_14,
  InputAttendeePhoneLocation_2024_06_14,
  InputIntegrationLocation_2024_06_14,
  InputLinkLocation_2024_06_14,
  InputPhoneLocation_2024_06_14,
  ValidateLocations_2024_06_14,
} from "./locations.input";
import type { InputLocation_2024_06_14 } from "./locations.input";
import { Recurrence_2024_06_14 } from "./recurrence.input";
import { Seats_2024_06_14 } from "./seats.input";

@ApiExtraModels(
  InputAddressLocation_2024_06_14,
  InputLinkLocation_2024_06_14,
  InputIntegrationLocation_2024_06_14,
  InputPhoneLocation_2024_06_14,
  PhoneFieldInput_2024_06_14,
  AddressFieldInput_2024_06_14,
  TextFieldInput_2024_06_14,
  NumberFieldInput_2024_06_14,
  TextAreaFieldInput_2024_06_14,
  SelectFieldInput_2024_06_14,
  MultiSelectFieldInput_2024_06_14,
  MultiEmailFieldInput_2024_06_14,
  CheckboxGroupFieldInput_2024_06_14,
  RadioGroupFieldInput_2024_06_14,
  BooleanFieldInput_2024_06_14,
  BusinessDaysWindow_2024_06_14,
  CalendarDaysWindow_2024_06_14,
  RangeWindow_2024_06_14,
  BaseBookingLimitsCount_2024_06_14,
  Disabled_2024_06_14,
  BaseBookingLimitsDuration_2024_06_14,
  Recurrence_2024_06_14,
  BaseConfirmationPolicy_2024_06_14,
  Seats_2024_06_14,
  InputAttendeeAddressLocation_2024_06_14,
  InputAttendeePhoneLocation_2024_06_14,
  InputAttendeeDefinedLocation_2024_06_14
)
export class UpdateEventTypeInput_2024_06_14 {
  @IsOptional()
  @IsInt()
  @Min(1)
  @DocsPropertyOptional({ example: CREATE_EVENT_LENGTH_EXAMPLE })
  lengthInMinutes?: number;

  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsInt({ each: true })
  @Min(1, { each: true })
  @DocsProperty({
    example: [15, 30, 60],
    description:
      "If you want that user can choose between different lengths of the event you can specify them here. Must include the provided `lengthInMinutes`.",
  })
  lengthInMinutesOptions?: number[];

  @IsOptional()
  @IsString()
  @DocsPropertyOptional({ example: CREATE_EVENT_TITLE_EXAMPLE })
  title?: string;

  @IsOptional()
  @IsString()
  @DocsPropertyOptional({ example: CREATE_EVENT_SLUG_EXAMPLE })
  slug?: string;

  @IsOptional()
  @IsString()
  @DocsPropertyOptional({ example: CREATE_EVENT_DESCRIPTION_EXAMPLE })
  description?: string;

  @IsOptional()
  @ValidateLocations_2024_06_14()
  @DocsPropertyOptional({
    description:
      "Locations where the event will take place. If not provided, cal video link will be used as the location.",
    oneOf: [
      { $ref: getSchemaPath(InputAddressLocation_2024_06_14) },
      { $ref: getSchemaPath(InputLinkLocation_2024_06_14) },
      { $ref: getSchemaPath(InputIntegrationLocation_2024_06_14) },
      { $ref: getSchemaPath(InputPhoneLocation_2024_06_14) },
      { $ref: getSchemaPath(InputAttendeeAddressLocation_2024_06_14) },
      { $ref: getSchemaPath(InputAttendeePhoneLocation_2024_06_14) },
      { $ref: getSchemaPath(InputAttendeeDefinedLocation_2024_06_14) },
    ],
    type: "array",
  })
  @Type(() => Object)
  locations?: InputLocation_2024_06_14[];

  @IsOptional()
  @ValidateInputBookingFields_2024_06_14()
  @DocsPropertyOptional({
    description:
      "Custom fields that can be added to the booking form when the event is booked by someone. By default booking form has name and email field.",
    oneOf: [
      { $ref: getSchemaPath(PhoneFieldInput_2024_06_14) },
      { $ref: getSchemaPath(AddressFieldInput_2024_06_14) },
      { $ref: getSchemaPath(TextFieldInput_2024_06_14) },
      { $ref: getSchemaPath(NumberFieldInput_2024_06_14) },
      { $ref: getSchemaPath(TextAreaFieldInput_2024_06_14) },
      { $ref: getSchemaPath(SelectFieldInput_2024_06_14) },
      { $ref: getSchemaPath(MultiSelectFieldInput_2024_06_14) },
      { $ref: getSchemaPath(MultiEmailFieldInput_2024_06_14) },
      { $ref: getSchemaPath(CheckboxGroupFieldInput_2024_06_14) },
      { $ref: getSchemaPath(RadioGroupFieldInput_2024_06_14) },
      { $ref: getSchemaPath(BooleanFieldInput_2024_06_14) },
    ],
    type: "array",
  })
  @Type(() => Object)
  bookingFields?: InputBookingField_2024_06_14[];

  @IsBoolean()
  @IsOptional()
  @DocsPropertyOptional({
    description: "If true, person booking this event't cant add guests via their emails.",
  })
  disableGuests?: boolean;

  @IsInt()
  @IsOptional()
  @DocsPropertyOptional({
    description: `Number representing length of each slot when event is booked. By default it equal length of the event type.
      If event length is 60 minutes then we would have slots 9AM, 10AM, 11AM etc. but if it was changed to 30 minutes then
      we would have slots 9AM, 9:30AM, 10AM, 10:30AM etc. as the available times to book the 60 minute event.`,
  })
  slotInterval?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  @DocsPropertyOptional({
    description: "Minimum number of minutes before the event that a booking can be made.",
  })
  minimumBookingNotice?: number;

  @IsInt()
  @IsOptional()
  @DocsPropertyOptional({
    description: "Time spaces that can be pre-pended before an event to give more time before it.",
  })
  beforeEventBuffer?: number;

  @IsInt()
  @IsOptional()
  @DocsPropertyOptional({
    description: "Time spaces that can be appended after an event to give more time after it.",
  })
  afterEventBuffer?: number;

  @IsInt()
  @IsOptional()
  @DocsPropertyOptional({
    description:
      "If you want that this event has different schedule than user's default one you can specify it here.",
  })
  scheduleId?: number;

  @IsOptional()
  @ValidateBookingLimistsCount()
  @DocsPropertyOptional({
    description: "Limit how many times this event can be booked",
    oneOf: [
      { $ref: getSchemaPath(BaseBookingLimitsCount_2024_06_14) },
      { $ref: getSchemaPath(Disabled_2024_06_14) },
    ],
  })
  @Type(() => Object)
  bookingLimitsCount?: BookingLimitsCount_2024_06_14;

  @IsOptional()
  @IsBoolean()
  @DocsPropertyOptional({
    description:
      "This will limit your availability for this event type to one slot per day, scheduled at the earliest available time.",
  })
  onlyShowFirstAvailableSlot?: boolean;

  @IsOptional()
  @ValidateBookingLimistsDuration()
  @DocsPropertyOptional({
    description: "Limit total amount of time that this event can be booked",
    oneOf: [
      { $ref: getSchemaPath(BaseBookingLimitsDuration_2024_06_14) },
      { $ref: getSchemaPath(Disabled_2024_06_14) },
    ],
  })
  @Type(() => Object)
  bookingLimitsDuration?: BookingLimitsDuration_2024_06_14;

  @IsOptional()
  @ValidateBookingWindow()
  @DocsPropertyOptional({
    description: "Limit how far in the future this event can be booked",
    oneOf: [
      { $ref: getSchemaPath(BusinessDaysWindow_2024_06_14) },
      { $ref: getSchemaPath(CalendarDaysWindow_2024_06_14) },
      { $ref: getSchemaPath(RangeWindow_2024_06_14) },
      { $ref: getSchemaPath(Disabled_2024_06_14) },
    ],
  })
  @Type(() => Object)
  bookingWindow?: BookingWindow_2024_06_14;

  @IsOptional()
  @IsInt()
  @Min(1)
  @DocsPropertyOptional({ description: "Offset timeslots shown to bookers by a specified number of minutes" })
  offsetStart?: number;

  @IsOptional()
  @DocsPropertyOptional({
    description:
      "Should booker have week, month or column view. Specify default layout and enabled layouts user can pick.",
  })
  @Type(() => BookerLayouts_2024_06_14)
  bookerLayouts?: BookerLayouts_2024_06_14;

  @IsOptional()
  @ValidateConfirmationPolicy()
  @DocsPropertyOptional({
    description:
      "Specify how the booking needs to be manually confirmed before it is pushed to the integrations and a confirmation mail is sent.",
    oneOf: [
      { $ref: getSchemaPath(BaseConfirmationPolicy_2024_06_14) },
      { $ref: getSchemaPath(Disabled_2024_06_14) },
    ],
  })
  @Type(() => Object)
  confirmationPolicy?: ConfirmationPolicy_2024_06_14;

  @ValidateNested()
  @IsOptional()
  @Transform(({ value }) => {
    if (value && typeof value === "object") {
      if ("interval" in value) {
        return Object.assign(new Recurrence_2024_06_14(), value);
      } else if ("disabled" in value) {
        return Object.assign(new Disabled_2024_06_14(), value);
      }
    }
    return value;
  })
  @ValidateNested()
  @DocsPropertyOptional({
    description: "Create a recurring event type.",
    oneOf: [{ $ref: getSchemaPath(Recurrence_2024_06_14) }, { $ref: getSchemaPath(Disabled_2024_06_14) }],
  })
  @Type(() => Object)
  recurrence?: Recurrence_2024_06_14 | Disabled_2024_06_14;

  @IsOptional()
  @IsBoolean()
  @DocsPropertyOptional()
  requiresBookerEmailVerification?: boolean;

  @IsOptional()
  @IsBoolean()
  @DocsPropertyOptional()
  hideCalendarNotes?: boolean;

  @IsOptional()
  @IsBoolean()
  @DocsPropertyOptional()
  lockTimeZoneToggleOnBookingPage?: boolean;

  @IsOptional()
  @DocsPropertyOptional()
  @Type(() => EventTypeColor_2024_06_14)
  color?: EventTypeColor_2024_06_14;

  @IsOptional()
  @Transform(({ value }) => {
    if (value && typeof value === "object") {
      if ("seatsPerTimeSlot" in value) {
        return Object.assign(new Seats_2024_06_14(), value);
      } else if ("disabled" in value) {
        return Object.assign(new Disabled_2024_06_14(), value);
      }
    }
    return value;
  })
  @ValidateNested()
  @DocsPropertyOptional({
    description: "Create an event type with multiple seats.",
    oneOf: [{ $ref: getSchemaPath(Seats_2024_06_14) }, { $ref: getSchemaPath(Disabled_2024_06_14) }],
  })
  @Type(() => Object)
  seats?: Seats_2024_06_14 | Disabled_2024_06_14;

  @IsOptional()
  @IsString()
  @DocsPropertyOptional({
    description: `Customizable event name with valid variables: 
      {Event type title}, {Organiser}, {Scheduler}, {Location}, {Organiser first name}, 
      {Scheduler first name}, {Scheduler last name}, {Event duration}, {LOCATION}, 
      {HOST/ATTENDEE}, {HOST}, {ATTENDEE}, {USER}`,
    example: "{Event type title} between {Organiser} and {Scheduler}",
  })
  customName?: string;

  @IsOptional()
  @DocsPropertyOptional()
  @Type(() => DestinationCalendar_2024_06_14)
  destinationCalendar?: DestinationCalendar_2024_06_14;

  @IsOptional()
  @IsBoolean()
  @DocsPropertyOptional()
  useDestinationCalendarEmail?: boolean;

  @IsOptional()
  @IsBoolean()
  @DocsPropertyOptional()
  hideCalendarEventDetails?: boolean;

  @IsOptional()
  @IsUrl()
  @DocsPropertyOptional({
    description: "A valid URL where the booker will redirect to, once the booking is completed successfully",
    example: "https://masterchief.com/argentina/flan/video/9129412",
  })
  successRedirectUrl?: string;
}

export class UpdateTeamEventTypeInput_2024_06_14 extends UpdateEventTypeInput_2024_06_14 {
  @ValidateNested({ each: true })
  @Type(() => Host)
  @IsArray()
  @IsOptional()
  @DocsPropertyOptional({ type: [Host] })
  hosts?: Host[];

  @IsOptional()
  @IsBoolean()
  @DocsProperty()
  @DocsPropertyOptional({
    description: "If true, all current and future team members will be assigned to this event type",
  })
  assignAllTeamMembers?: boolean;
}
