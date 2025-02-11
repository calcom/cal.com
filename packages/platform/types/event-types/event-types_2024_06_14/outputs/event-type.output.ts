import {
  ApiProperty as DocsProperty,
  ApiPropertyOptional,
  ApiExtraModels,
  getSchemaPath,
} from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from "class-validator";

import type { BookingWindow_2024_06_14, BookingLimitsDuration_2024_06_14 } from "../inputs";
import {
  EventTypeColor_2024_06_14,
  Seats_2024_06_14,
  Host as TeamEventTypeHostInput,
  BaseBookingLimitsDuration_2024_06_14,
  BusinessDaysWindow_2024_06_14,
  CalendarDaysWindow_2024_06_14,
  RangeWindow_2024_06_14,
} from "../inputs";
import { Recurrence_2024_06_14 } from "../inputs";
import { BookerLayouts_2024_06_14 } from "../inputs/booker-layouts.input";
import type { BookingLimitsCount_2024_06_14 } from "../inputs/booking-limits-count.input";
import type { ConfirmationPolicy_2024_06_14 } from "../inputs/confirmation-policy.input";
import { DestinationCalendar_2024_06_14 } from "../inputs/destination-calendar.input";
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
import type { OutputLocation_2024_06_14 } from "./locations.output";
import {
  OutputAddressLocation_2024_06_14,
  OutputConferencingLocation_2024_06_14,
  OutputIntegrationLocation_2024_06_14,
  OutputLinkLocation_2024_06_14,
  OutputPhoneLocation_2024_06_14,
  OutputUnknownLocation_2024_06_14,
  ValidateOutputLocations_2024_06_14,
} from "./locations.output";

enum SchedulingTypeEnum {
  ROUND_ROBIN = "ROUND_ROBIN",
  COLLECTIVE = "COLLECTIVE",
  MANAGED = "MANAGED",
}

export type EventTypesOutputSchedulingType = "ROUND_ROBIN" | "COLLECTIVE" | "MANAGED";

class User_2024_06_14 {
  @IsInt()
  @DocsProperty()
  id!: number;

  @IsString()
  @DocsProperty({ nullable: true })
  name!: string | null;

  @IsString()
  @DocsProperty({ nullable: true, type: String })
  username!: string | null;

  @IsString()
  @DocsProperty({ nullable: true, type: String })
  avatarUrl!: string | null;

  @IsString()
  @DocsProperty({ type: String })
  weekStart!: string;

  @IsString()
  @DocsProperty({ type: String, nullable: true })
  brandColor!: string | null;

  @IsString()
  @DocsProperty({ type: String, nullable: true })
  darkBrandColor!: string | null;

  @Type(() => Object)
  @DocsProperty({ type: Object })
  metadata!: Record<string, unknown>;
}

class EventTypeTeam {
  @IsInt()
  @DocsProperty()
  id!: number;

  @IsString()
  @IsOptional()
  @DocsProperty()
  slug?: string;

  @IsString()
  @IsOptional()
  @DocsProperty()
  bannerUrl?: string;

  @IsString()
  @IsOptional()
  @DocsProperty()
  name?: string;

  @IsString()
  @IsOptional()
  @DocsProperty()
  logoUrl?: string;

  @IsString()
  @IsOptional()
  @DocsProperty()
  weekStart?: string;

  @IsString()
  @IsOptional()
  @DocsProperty()
  brandColor?: string;

  @IsString()
  @IsOptional()
  @DocsProperty()
  darkBrandColor?: string;

  @IsString()
  @IsOptional()
  @DocsProperty()
  theme?: string;
}

@ApiExtraModels(
  OutputAddressLocation_2024_06_14,
  OutputLinkLocation_2024_06_14,
  OutputIntegrationLocation_2024_06_14,
  OutputPhoneLocation_2024_06_14,
  OutputConferencingLocation_2024_06_14,
  OutputUnknownLocation_2024_06_14,
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
  BaseBookingLimitsDuration_2024_06_14,
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

  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsInt({ each: true })
  @Min(1, { each: true })
  @ApiPropertyOptional({
    type: [Number],
    example: [15, 30, 60],
    description:
      "If you want that user can choose between different lengths of the event you can specify them here. Must include the provided `lengthInMinutes`.",
  })
  lengthInMinutesOptions?: number[];

  @IsString()
  @DocsProperty({ example: "Learn the secrets of masterchief!" })
  title!: string;

  @IsString()
  @DocsProperty({ example: "learn-the-secrets-of-masterchief" })
  slug!: string;

  @IsString()
  @DocsProperty({
    example: "Discover the culinary wonders of Argentina by making the best flan ever!",
  })
  description!: string;

  @ValidateOutputLocations_2024_06_14()
  @DocsProperty({
    required: true,
    oneOf: [
      { $ref: getSchemaPath(OutputAddressLocation_2024_06_14) },
      { $ref: getSchemaPath(OutputLinkLocation_2024_06_14) },
      { $ref: getSchemaPath(OutputIntegrationLocation_2024_06_14) },
      { $ref: getSchemaPath(OutputPhoneLocation_2024_06_14) },
      { $ref: getSchemaPath(OutputConferencingLocation_2024_06_14) },
      { $ref: getSchemaPath(OutputUnknownLocation_2024_06_14) },
    ],
    type: "array",
  })
  @Type(() => Object)
  locations!: OutputLocation_2024_06_14[];

  @ValidateOutputBookingFields_2024_06_14()
  @DocsProperty()
  @DocsProperty({
    required: true,
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
  @ApiPropertyOptional({ example: 60, nullable: true })
  slotInterval?: number | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  @ApiPropertyOptional({ example: 0 })
  minimumBookingNotice?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @ApiPropertyOptional({ example: 0 })
  beforeEventBuffer?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @ApiPropertyOptional({ example: 0 })
  afterEventBuffer?: number;

  @Type(() => Recurrence_2024_06_14)
  @DocsProperty({
    type: Recurrence_2024_06_14,
    nullable: true,
  })
  recurrence!: Recurrence_2024_06_14 | null;

  @Type(() => Object)
  @DocsProperty({
    type: Object,
  })
  metadata!: Record<string, unknown>;

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
  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  seatsPerTimeSlot?: number | null;

  @IsBoolean()
  @DocsProperty({ nullable: true })
  forwardParamsSuccessRedirect!: boolean | null;

  @IsString()
  @DocsProperty({ nullable: true })
  successRedirectUrl!: string | null;

  @IsBoolean()
  @DocsProperty()
  isInstantEvent!: boolean;

  @IsOptional()
  @IsBoolean()
  @ApiPropertyOptional({ type: Boolean, nullable: true })
  seatsShowAvailabilityCount?: boolean | null;

  @IsInt()
  @DocsProperty({ type: Number, nullable: true })
  scheduleId!: number | null;

  @IsOptional()
  @ApiPropertyOptional()
  bookingLimitsCount?: BookingLimitsCount_2024_06_14;

  @IsOptional()
  @IsBoolean()
  @ApiPropertyOptional()
  onlyShowFirstAvailableSlot?: boolean;

  @IsOptional()
  @ApiPropertyOptional()
  bookingLimitsDuration?: BookingLimitsDuration_2024_06_14;

  @IsOptional()
  @ApiPropertyOptional({
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
  @Type(() => BookerLayouts_2024_06_14)
  @ApiPropertyOptional()
  bookerLayouts?: BookerLayouts_2024_06_14;

  @IsOptional()
  @ApiPropertyOptional()
  confirmationPolicy?: ConfirmationPolicy_2024_06_14;

  @IsOptional()
  @IsBoolean()
  @ApiPropertyOptional()
  requiresBookerEmailVerification?: boolean;

  @IsOptional()
  @IsBoolean()
  @ApiPropertyOptional()
  hideCalendarNotes?: boolean;

  @IsOptional()
  @Type(() => EventTypeColor_2024_06_14)
  @ApiPropertyOptional({ type: EventTypeColor_2024_06_14 })
  color?: EventTypeColor_2024_06_14;

  @IsOptional()
  @Type(() => Seats_2024_06_14)
  @ApiPropertyOptional({ type: Seats_2024_06_14 })
  seats?: Seats_2024_06_14;

  @IsOptional()
  @IsInt()
  @Min(1)
  @ApiPropertyOptional()
  offsetStart?: number;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional()
  customName?: string;

  @IsOptional()
  @Type(() => DestinationCalendar_2024_06_14)
  @ApiPropertyOptional({ type: DestinationCalendar_2024_06_14 })
  destinationCalendar?: DestinationCalendar_2024_06_14;

  @IsOptional()
  @IsBoolean()
  @ApiPropertyOptional()
  useDestinationCalendarEmail?: boolean;

  @IsOptional()
  @IsBoolean()
  @ApiPropertyOptional()
  hideCalendarEventDetails?: boolean;
}

export class TeamEventTypeResponseHost extends TeamEventTypeHostInput {
  @IsString()
  @DocsProperty({ example: "John Doe" })
  name!: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({
    example: "https://cal.com/api/avatar/d95949bc-ccb1-400f-acf6-045c51a16856.png",
    nullable: true,
  })
  avatarUrl?: string | null;
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
  @IsInt()
  @DocsProperty()
  teamId!: number;

  @IsInt()
  @IsOptional()
  @ApiPropertyOptional({ nullable: true })
  ownerId?: number | null;

  @IsInt()
  @IsOptional()
  @ApiPropertyOptional({
    description:
      "For managed event types, parent event type is the event type that this event type is based on",
    nullable: true,
  })
  parentEventTypeId?: number | null;

  @ValidateNested({ each: true })
  @Type(() => TeamEventTypeResponseHost)
  @IsArray()
  @DocsProperty()
  hosts!: TeamEventTypeResponseHost[];

  @IsBoolean()
  @IsOptional()
  @ApiPropertyOptional()
  assignAllTeamMembers?: boolean;

  @IsEnum(SchedulingTypeEnum)
  @DocsProperty({ enum: SchedulingTypeEnum, nullable: true })
  schedulingType!: EventTypesOutputSchedulingType | null;

  @IsOptional()
  @IsBoolean()
  @ApiPropertyOptional()
  hideCalendarEventDetails?: boolean;

  @ValidateNested()
  @Type(() => EventTypeTeam)
  @DocsProperty()
  team!: EventTypeTeam;
}
