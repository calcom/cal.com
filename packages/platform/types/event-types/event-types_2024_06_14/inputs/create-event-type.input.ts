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

import type { BookingField_2024_06_14 } from "./booking-fields.input";
import {
  AddressField_2024_06_14,
  BooleanField_2024_06_14,
  CheckboxGroupField_2024_06_14,
  EmailField_2024_06_14,
  MultiEmailField_2024_06_14,
  MultiSelectField_2024_06_14,
  NameField_2024_06_14,
  NumberField_2024_06_14,
  PhoneField_2024_06_14,
  RadioGroupField_2024_06_14,
  SelectField_2024_06_14,
  TextAreaField_2024_06_14,
  TextField_2024_06_14,
  ValidateBookingFields_2024_06_14,
} from "./booking-fields.input";
import { BookingLimitsCount_2024_06_14, ValidateBookingLimistsCount } from "./booking-limits-count.input";
import {
  BookingLimitsDuration_2024_06_14,
  ValidateBookingLimistsDuration,
} from "./booking-limits-duration.input";
import type { BookingWindow_2024_06_14 } from "./booking-window.input";
import { ValidateBookingWindow } from "./booking-window.input";
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
  NameField_2024_06_14,
  EmailField_2024_06_14,
  PhoneField_2024_06_14,
  AddressField_2024_06_14,
  TextField_2024_06_14,
  NumberField_2024_06_14,
  TextAreaField_2024_06_14,
  SelectField_2024_06_14,
  MultiSelectField_2024_06_14,
  MultiEmailField_2024_06_14,
  CheckboxGroupField_2024_06_14,
  RadioGroupField_2024_06_14,
  BooleanField_2024_06_14
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
  @ValidateBookingFields_2024_06_14()
  @DocsProperty({
    oneOf: [
      { $ref: getSchemaPath(NameField_2024_06_14) },
      { $ref: getSchemaPath(EmailField_2024_06_14) },
      { $ref: getSchemaPath(PhoneField_2024_06_14) },
      { $ref: getSchemaPath(AddressField_2024_06_14) },
      { $ref: getSchemaPath(TextField_2024_06_14) },
      { $ref: getSchemaPath(NumberField_2024_06_14) },
      { $ref: getSchemaPath(TextAreaField_2024_06_14) },
      { $ref: getSchemaPath(SelectField_2024_06_14) },
      { $ref: getSchemaPath(MultiSelectField_2024_06_14) },
      { $ref: getSchemaPath(MultiEmailField_2024_06_14) },
      { $ref: getSchemaPath(CheckboxGroupField_2024_06_14) },
      { $ref: getSchemaPath(RadioGroupField_2024_06_14) },
      { $ref: getSchemaPath(BooleanField_2024_06_14) },
    ],
    type: "array",
  })
  @Type(() => Object)
  bookingFields?: BookingField_2024_06_14[];

  @IsBoolean()
  @IsOptional()
  @DocsProperty()
  disableGuests?: boolean;

  @IsInt()
  @IsOptional()
  @DocsProperty()
  slotInterval?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  @DocsProperty()
  minimumBookingNotice?: number;

  @IsInt()
  @IsOptional()
  @DocsProperty()
  beforeEventBuffer?: number;

  @IsInt()
  @IsOptional()
  @DocsProperty()
  afterEventBuffer?: number;

  @IsInt()
  @IsOptional()
  @DocsProperty()
  scheduleId?: number;

  @IsOptional()
  @Type(() => BookingLimitsCount_2024_06_14)
  @ValidateBookingLimistsCount()
  @DocsProperty()
  bookingLimitsCount?: BookingLimitsCount_2024_06_14;

  @IsOptional()
  @IsBoolean()
  @DocsProperty()
  onlyShowFirstAvailableSlot?: boolean;

  @IsOptional()
  @Type(() => BookingLimitsDuration_2024_06_14)
  @ValidateBookingLimistsDuration()
  @DocsProperty()
  bookingLimitsDuration?: BookingLimitsDuration_2024_06_14;

  @IsOptional()
  @ValidateBookingWindow()
  @DocsProperty()
  bookingWindow?: BookingWindow_2024_06_14;

  @IsOptional()
  @IsInt()
  @Min(1)
  @DocsProperty()
  offsetStart?: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => Recurrence_2024_06_14)
  @DocsProperty()
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
  @DocsProperty()
  userId!: number;

  @IsOptional()
  @IsBoolean()
  @DocsProperty()
  mandatory?: boolean = false;

  @IsEnum(HostPriority)
  @IsOptional()
  @DocsProperty()
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
  @DocsProperty()
  assignAllTeamMembers?: boolean;
}
