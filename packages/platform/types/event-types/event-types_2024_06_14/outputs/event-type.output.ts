import { ApiProperty as DocsProperty, getSchemaPath, ApiExtraModels } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from "class-validator";

import type { Location_2024_06_14, BookingField_2024_06_14, BookingWindow_2024_06_14 } from "../inputs";
import { Host as TeamEventTypeHostInput, BookingLimitsDuration_2024_06_14 } from "../inputs";
import { Recurrence_2024_06_14 } from "../inputs";
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
} from "../inputs/booking-fields.input";
import type { BookingLimitsCount_2024_06_14 } from "../inputs/booking-limits-count.input";
import {
  AddressLocation_2024_06_14,
  IntegrationLocation_2024_06_14,
  LinkLocation_2024_06_14,
  PhoneLocation_2024_06_14,
  ValidateLocations_2024_06_14,
} from "../inputs/locations.input";

enum SchedulingTypeEnum {
  ROUND_ROBIN = "ROUND_ROBIN",
  COLLECTIVE = "COLLECTIVE",
  MANAGED = "MANAGED",
}

export type EventTypesOutputSchedulingType = "ROUND_ROBIN" | "COLLECTIVE" | "MANAGED";

class User_2024_06_14 {
  @IsInt()
  id!: number;

  @IsString()
  name!: string | null;

  @IsString()
  username!: string | null;

  @IsString()
  avatarUrl!: string | null;

  @IsString()
  weekStart!: string;

  @IsString()
  brandColor!: string | null;

  @IsString()
  darkBrandColor!: string | null;

  metadata!: Record<string, unknown>;
}

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
export class EventTypeOutput_2024_06_14 {
  @IsInt()
  @DocsProperty({ example: 1 })
  id!: number;

  @IsInt()
  @DocsProperty({ example: 10 })
  ownerId!: number;

  @IsInt()
  @Min(1)
  @DocsProperty({ example: 60 })
  lengthInMinutes!: number;

  @IsString()
  @DocsProperty({ example: "Learn the secrets of masterchief!" })
  title!: string;

  @IsString()
  @DocsProperty({ example: "learn-the-secrets-of-masterchief" })
  slug!: string;

  @IsString()
  @DocsProperty({
    example: "Discover the culinary wonders of the Argentina by making the best flan ever!",
  })
  description!: string;

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
  locations!: Location_2024_06_14[];

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
  bookingFields!: BookingField_2024_06_14[];

  @IsBoolean()
  @DocsProperty()
  disableGuests!: boolean;

  @IsInt()
  @IsOptional()
  @DocsProperty({ example: 60, type: Number })
  slotInterval?: number | null;

  @IsInt()
  @Min(0)
  @IsOptional()
  @DocsProperty({ example: 0 })
  minimumBookingNotice?: number;

  @IsInt()
  @IsOptional()
  @DocsProperty({ example: 0 })
  beforeEventBuffer?: number;

  @IsInt()
  @IsOptional()
  @DocsProperty({ example: 0 })
  afterEventBuffer?: number;

  @Type(() => Recurrence_2024_06_14)
  @DocsProperty()
  recurrence!: Recurrence_2024_06_14 | null;

  @Type(() => Object)
  @DocsProperty()
  metadata!: Record<string, unknown>;

  @IsBoolean()
  @DocsProperty()
  requiresConfirmation!: boolean;

  @IsInt()
  @DocsProperty()
  price!: number;

  @IsString()
  @DocsProperty()
  currency!: string;

  @IsBoolean()
  @DocsProperty()
  lockTimeZoneToggleOnBookingPage!: boolean;

  @IsInt()
  @DocsProperty()
  seatsPerTimeSlot!: number | null;

  @IsBoolean()
  @DocsProperty()
  forwardParamsSuccessRedirect!: boolean | null;

  @IsString()
  @DocsProperty()
  successRedirectUrl!: string | null;

  @IsBoolean()
  @DocsProperty()
  seatsShowAvailabilityCount!: boolean | null;

  @IsBoolean()
  @DocsProperty()
  isInstantEvent!: boolean;

  users!: User_2024_06_14[];

  @IsInt()
  @DocsProperty()
  scheduleId!: number | null;

  @IsOptional()
  @DocsProperty()
  bookingLimitsCount?: BookingLimitsCount_2024_06_14;

  @IsOptional()
  @IsBoolean()
  @DocsProperty()
  onlyShowFirstAvailableSlot?: boolean;

  @IsOptional()
  @Type(() => BookingLimitsDuration_2024_06_14)
  @DocsProperty()
  bookingLimitsDuration?: BookingLimitsDuration_2024_06_14;

  @IsOptional()
  @DocsProperty()
  bookingWindow?: BookingWindow_2024_06_14;

  @IsOptional()
  @IsInt()
  @Min(1)
  @DocsProperty()
  offsetStart?: number;
}

export class TeamEventTypeResponseHost extends TeamEventTypeHostInput {
  @IsString()
  name!: string;
}

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
export class TeamEventTypeOutput_2024_06_14 {
  @IsInt()
  @DocsProperty({ example: 1 })
  id!: number;

  @IsInt()
  @Min(1)
  lengthInMinutes!: number;

  @IsString()
  title!: string;

  @IsString()
  slug!: string;

  @IsString()
  description!: string;

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
  locations!: Location_2024_06_14[];

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
  bookingFields!: BookingField_2024_06_14[];

  @IsBoolean()
  disableGuests!: boolean;

  @IsInt()
  @IsOptional()
  slotInterval?: number | null;

  @IsInt()
  @Min(0)
  @IsOptional()
  minimumBookingNotice?: number;

  @IsInt()
  @IsOptional()
  beforeEventBuffer?: number;

  @IsInt()
  @IsOptional()
  afterEventBuffer?: number;

  @IsEnum(SchedulingTypeEnum)
  schedulingType!: EventTypesOutputSchedulingType | null;

  @Type(() => Recurrence_2024_06_14)
  recurrence!: Recurrence_2024_06_14 | null;

  @Type(() => Object)
  metadata!: Record<string, unknown>;

  @IsBoolean()
  requiresConfirmation!: boolean;

  @IsInt()
  price!: number;

  @IsString()
  currency!: string;

  @IsBoolean()
  lockTimeZoneToggleOnBookingPage!: boolean;

  @IsInt()
  seatsPerTimeSlot!: number | null;

  @IsBoolean()
  forwardParamsSuccessRedirect!: boolean | null;

  @IsString()
  successRedirectUrl!: string | null;

  @IsBoolean()
  seatsShowAvailabilityCount!: boolean | null;

  @IsBoolean()
  isInstantEvent!: boolean;

  @IsInt()
  scheduleId!: number | null;

  @IsInt()
  @IsOptional()
  teamId?: number | null;

  @IsInt()
  @IsOptional()
  ownerId?: number | null;

  @IsInt()
  @IsOptional()
  parentEventTypeId?: number | null;

  @ValidateNested({ each: true })
  @Type(() => TeamEventTypeResponseHost)
  @IsArray()
  hosts!: TeamEventTypeResponseHost[];

  @IsBoolean()
  @IsOptional()
  assignAllTeamMembers?: boolean;

  @IsOptional()
  bookingLimitsCount?: BookingLimitsCount_2024_06_14;

  @IsOptional()
  @IsBoolean()
  onlyShowFirstAvailableSlot?: boolean;

  @IsOptional()
  @Type(() => BookingLimitsDuration_2024_06_14)
  bookingLimitsDuration?: BookingLimitsDuration_2024_06_14;

  @IsOptional()
  bookingWindow?: BookingWindow_2024_06_14;

  @IsOptional()
  @IsInt()
  @Min(1)
  offsetStart?: number;
}
