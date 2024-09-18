import { ApiProperty as DocsProperty, getSchemaPath, ApiExtraModels } from "@nestjs/swagger";
import { Type, Transform } from "class-transformer";
import {
  IsString,
  IsInt,
  IsBoolean,
  IsOptional,
  Min,
  IsEnum,
  IsArray,
  ValidateNested,
} from "class-validator";

import { SchedulingType } from "@calcom/platform-enums";

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
} from "./booking-fields.input";
import type { InputBookingField_2024_06_14 } from "./booking-fields.input";
import { ValidateInputBookingFields_2024_06_14 } from "./booking-fields.input";
import { BookingLimitsCount_2024_06_14, ValidateBookingLimistsCount } from "./booking-limits-count.input";
import {
  BookingLimitsDuration_2024_06_14,
  ValidateBookingLimistsDuration,
} from "./booking-limits-duration.input";
import type { BookingWindow_2024_06_14 } from "./booking-window.input";
import {
  BusinessDaysWindow_2024_06_14,
  CalendarDaysWindow_2024_06_14,
  RangeWindow_2024_06_14,
  ValidateBookingWindow,
} from "./booking-window.input";
import {
  AddressLocation_2024_06_14,
  IntegrationLocation_2024_06_14,
  LinkLocation_2024_06_14,
  PhoneLocation_2024_06_14,
  ValidateLocations_2024_06_14,
} from "./locations.input";
import type { Location_2024_06_14 } from "./locations.input";
import { Recurrence_2024_06_14 } from "./recurrence.input";

export const CREATE_EVENT_LENGTH_EXAMPLE = 60;
export const CREATE_EVENT_TITLE_EXAMPLE = "Learn the secrets of masterchief!";
export const CREATE_EVENT_DESCRIPTION_EXAMPLE =
  "Discover the culinary wonders of the Argentina by making the best flan ever!";
export const CREATE_EVENT_SLUG_EXAMPLE = "learn-the-secrets-of-masterchief";

@ApiExtraModels(
  AddressLocation_2024_06_14,
  LinkLocation_2024_06_14,
  IntegrationLocation_2024_06_14,
  PhoneLocation_2024_06_14,
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
  RangeWindow_2024_06_14
)
export class CreateEventTypeInput_2024_06_14 {
  @IsInt()
  @Min(1)
  @DocsProperty({ example: CREATE_EVENT_LENGTH_EXAMPLE })
  lengthInMinutes!: number;

  @IsString()
  @DocsProperty({ example: CREATE_EVENT_TITLE_EXAMPLE })
  title!: string;

  @IsString()
  @DocsProperty({ example: CREATE_EVENT_SLUG_EXAMPLE })
  slug!: string;

  @IsOptional()
  @IsString()
  @DocsProperty({ example: CREATE_EVENT_DESCRIPTION_EXAMPLE })
  description?: string;

  @IsOptional()
  @ValidateLocations_2024_06_14()
  @DocsProperty({
    description:
      "Locations where the event will take place. If not provided, cal video link will be used as the location.",
    oneOf: [
      { $ref: getSchemaPath(AddressLocation_2024_06_14) },
      { $ref: getSchemaPath(LinkLocation_2024_06_14) },
      { $ref: getSchemaPath(IntegrationLocation_2024_06_14) },
      { $ref: getSchemaPath(PhoneLocation_2024_06_14) },
    ],
    type: "array",
  })
  @Type(() => Object)
  locations?: Location_2024_06_14[];

  @IsOptional()
  @ValidateInputBookingFields_2024_06_14()
  @DocsProperty({
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
  @DocsProperty({ description: "If true, person booking this event't cant add guests via their emails." })
  disableGuests?: boolean;

  @IsInt()
  @IsOptional()
  @DocsProperty({
    description: `Number representing length of each slot when event is booked. By default it equal length of the event type.
      If event length is 60 minutes then we would have slots 9AM, 10AM, 11AM etc. but if it was changed to 30 minutes then
      we would have slots 9AM, 9:30AM, 10AM, 10:30AM etc. as the available times to book the 60 minute event.`,
  })
  slotInterval?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  @DocsProperty({ description: "Minimum number of minutes before the event that a booking can be made." })
  minimumBookingNotice?: number;

  @IsInt()
  @IsOptional()
  @DocsProperty({
    description: "Time spaces that can be pre-pended before an event to give more time before it.",
  })
  beforeEventBuffer?: number;

  @IsInt()
  @IsOptional()
  @DocsProperty({
    description: "Time spaces that can be appended after an event to give more time after it.",
  })
  afterEventBuffer?: number;

  @IsInt()
  @IsOptional()
  @DocsProperty({
    description:
      "If you want that this event has different schedule than user's default one you can specify it here.",
  })
  scheduleId?: number;

  @IsOptional()
  @Type(() => BookingLimitsCount_2024_06_14)
  @ValidateBookingLimistsCount()
  @DocsProperty({ description: "Limit how many times this event can be booked" })
  bookingLimitsCount?: BookingLimitsCount_2024_06_14;

  @IsOptional()
  @IsBoolean()
  @DocsProperty({
    description:
      "This will limit your availability for this event type to one slot per day, scheduled at the earliest available time.",
  })
  onlyShowFirstAvailableSlot?: boolean;

  @IsOptional()
  @Type(() => BookingLimitsDuration_2024_06_14)
  @ValidateBookingLimistsDuration()
  @DocsProperty({ description: "Limit total amount of time that this event can be booked" })
  bookingLimitsDuration?: BookingLimitsDuration_2024_06_14;

  @IsOptional()
  @ValidateBookingWindow()
  @DocsProperty({
    description: "Limit how far in the future this event can be booked",
    oneOf: [
      { $ref: getSchemaPath(BusinessDaysWindow_2024_06_14) },
      { $ref: getSchemaPath(CalendarDaysWindow_2024_06_14) },
      { $ref: getSchemaPath(RangeWindow_2024_06_14) },
    ],
    type: "array",
  })
  @Type(() => Object)
  bookingWindow?: BookingWindow_2024_06_14;

  @IsOptional()
  @IsInt()
  @Min(1)
  @DocsProperty({ description: "Offset timeslots shown to bookers by a specified number of minutes" })
  offsetStart?: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => Recurrence_2024_06_14)
  @DocsProperty({
    description: "Create a recurring event that can be booked once but will occur multiple times",
  })
  recurrence?: Recurrence_2024_06_14;
}

export enum HostPriority {
  lowest = "lowest",
  low = "low",
  medium = "medium",
  high = "high",
  highest = "highest",
}
export class Host {
  @IsInt()
  @DocsProperty({ description: "Which user is the host of this event" })
  userId!: number;

  @IsOptional()
  @IsBoolean()
  @DocsProperty({
    description:
      "Only relevant for round robin event types. If true then the user must attend round robin event always.",
  })
  mandatory?: boolean = false;

  @IsEnum(HostPriority)
  @IsOptional()
  @DocsProperty({ enum: HostPriority })
  priority?: keyof typeof HostPriority = "medium";
}

export class CreateTeamEventTypeInput_2024_06_14 extends CreateEventTypeInput_2024_06_14 {
  @Transform(({ value }) => {
    if (value === "collective") {
      return SchedulingType.COLLECTIVE;
    }
    if (value === "roundRobin") {
      return SchedulingType.ROUND_ROBIN;
    }
    if (value === "managed") {
      return SchedulingType.MANAGED;
    }
    return value;
  })
  @IsEnum(SchedulingType)
  @DocsProperty()
  schedulingType!: keyof typeof SchedulingType;

  @ValidateNested({ each: true })
  @Type(() => Host)
  @IsArray()
  @DocsProperty()
  hosts!: Host[];

  @IsBoolean()
  @IsOptional()
  @DocsProperty({
    description: "If true, all current and future team members will be assigned to this event type",
  })
  assignAllTeamMembers?: boolean;
}
