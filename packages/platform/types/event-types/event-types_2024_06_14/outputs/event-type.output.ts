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

import type { Location_2024_06_14, BookingWindow_2024_06_14 } from "../inputs";
import {
  Host as TeamEventTypeHostInput,
  BookingLimitsDuration_2024_06_14,
  BusinessDaysWindow_2024_06_14,
  CalendarDaysWindow_2024_06_14,
  RangeWindow_2024_06_14,
} from "../inputs";
import { Recurrence_2024_06_14 } from "../inputs";
import { BookingLimitsCount_2024_06_14 } from "../inputs/booking-limits-count.input";
import {
  AddressLocation_2024_06_14,
  IntegrationLocation_2024_06_14,
  LinkLocation_2024_06_14,
  PhoneLocation_2024_06_14,
  ValidateLocations_2024_06_14,
} from "../inputs/locations.input";
import {
  EmailDefaultFieldOutput_2024_06_14,
  NameDefaultFieldOutput_2024_06_14,
  LocationDefaultFieldOutput_2024_06_14,
  RescheduleReasonDefaultFieldOutput_2024_06_14,
  TitleDefaultFieldOutput_2024_06_14,
  NotesDefaultFieldOutput_2024_06_14,
  GuestsDefaultFieldOutput_2024_06_14,
  AddressFieldOutput_2024_06_14,
  BooleanFieldOutput_2024_06_14,
  CheckboxGroupFieldOutput_2024_06_14,
  MultiEmailFieldOutput_2024_06_14,
  MultiSelectFieldOutput_2024_06_14,
  NumberFieldOutput_2024_06_14,
  PhoneFieldOutput_2024_06_14,
  RadioGroupFieldOutput_2024_06_14,
  SelectFieldOutput_2024_06_14,
  TextAreaFieldOutput_2024_06_14,
  TextFieldOutput_2024_06_14,
} from "../outputs/booking-fields.output";
import type { OutputBookingField_2024_06_14 } from "./booking-fields.output";
import { ValidateOutputBookingFields_2024_06_14 } from "./booking-fields.output";

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
  EmailDefaultFieldOutput_2024_06_14,
  NameDefaultFieldOutput_2024_06_14,
  LocationDefaultFieldOutput_2024_06_14,
  RescheduleReasonDefaultFieldOutput_2024_06_14,
  TitleDefaultFieldOutput_2024_06_14,
  NotesDefaultFieldOutput_2024_06_14,
  GuestsDefaultFieldOutput_2024_06_14,
  AddressFieldOutput_2024_06_14,
  BooleanFieldOutput_2024_06_14,
  CheckboxGroupFieldOutput_2024_06_14,
  MultiEmailFieldOutput_2024_06_14,
  MultiSelectFieldOutput_2024_06_14,
  NumberFieldOutput_2024_06_14,
  PhoneFieldOutput_2024_06_14,
  RadioGroupFieldOutput_2024_06_14,
  SelectFieldOutput_2024_06_14,
  TextAreaFieldOutput_2024_06_14,
  TextFieldOutput_2024_06_14,
  BookingLimitsDuration_2024_06_14,
  BusinessDaysWindow_2024_06_14,
  CalendarDaysWindow_2024_06_14,
  RangeWindow_2024_06_14
)
class BaseEventTypeOutput_2024_06_14 {
  @IsInt()
  @DocsProperty({ example: 1 })
  id!: number;

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

  @ValidateOutputBookingFields_2024_06_14()
  @DocsProperty({
    oneOf: [
      { $ref: getSchemaPath(NameDefaultFieldOutput_2024_06_14) },
      { $ref: getSchemaPath(EmailDefaultFieldOutput_2024_06_14) },
      { $ref: getSchemaPath(LocationDefaultFieldOutput_2024_06_14) },
      { $ref: getSchemaPath(RescheduleReasonDefaultFieldOutput_2024_06_14) },
      { $ref: getSchemaPath(TitleDefaultFieldOutput_2024_06_14) },
      { $ref: getSchemaPath(NotesDefaultFieldOutput_2024_06_14) },
      { $ref: getSchemaPath(GuestsDefaultFieldOutput_2024_06_14) },
      { $ref: getSchemaPath(PhoneFieldOutput_2024_06_14) },
      { $ref: getSchemaPath(AddressFieldOutput_2024_06_14) },
      { $ref: getSchemaPath(TextFieldOutput_2024_06_14) },
      { $ref: getSchemaPath(NumberFieldOutput_2024_06_14) },
      { $ref: getSchemaPath(TextAreaFieldOutput_2024_06_14) },
      { $ref: getSchemaPath(SelectFieldOutput_2024_06_14) },
      { $ref: getSchemaPath(MultiSelectFieldOutput_2024_06_14) },
      { $ref: getSchemaPath(MultiEmailFieldOutput_2024_06_14) },
      { $ref: getSchemaPath(CheckboxGroupFieldOutput_2024_06_14) },
      { $ref: getSchemaPath(RadioGroupFieldOutput_2024_06_14) },
      { $ref: getSchemaPath(BooleanFieldOutput_2024_06_14) },
    ],
    type: "array",
  })
  @Type(() => Object)
  bookingFields!: OutputBookingField_2024_06_14[];

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

  @IsInt()
  @DocsProperty()
  scheduleId!: number | null;

  @IsOptional()
  @DocsProperty()
  @Type(() => BookingLimitsCount_2024_06_14)
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
  @DocsProperty()
  offsetStart?: number;
}

export class TeamEventTypeResponseHost extends TeamEventTypeHostInput {
  @IsString()
  @DocsProperty({ example: "John Doe" })
  name!: string;
}

export class EventTypeOutput_2024_06_14 extends BaseEventTypeOutput_2024_06_14 {
  @IsInt()
  @DocsProperty({ example: 10 })
  ownerId!: number;

  @Type(() => User_2024_06_14)
  @IsArray()
  @DocsProperty()
  users!: User_2024_06_14[];
}

export class TeamEventTypeOutput_2024_06_14 extends BaseEventTypeOutput_2024_06_14 {
  @IsEnum(SchedulingTypeEnum)
  @DocsProperty({ enum: SchedulingTypeEnum })
  schedulingType!: EventTypesOutputSchedulingType | null;

  @IsInt()
  @IsOptional()
  @DocsProperty()
  teamId?: number | null;

  @IsInt()
  @IsOptional()
  @DocsProperty()
  ownerId?: number | null;

  @IsInt()
  @IsOptional()
  @DocsProperty({
    description:
      "For managed event types parent event type is the event type that this event type is based on",
  })
  parentEventTypeId?: number | null;

  @ValidateNested({ each: true })
  @Type(() => TeamEventTypeResponseHost)
  @IsArray()
  @DocsProperty()
  hosts!: TeamEventTypeResponseHost[];

  @IsBoolean()
  @IsOptional()
  @DocsProperty()
  assignAllTeamMembers?: boolean;
}
