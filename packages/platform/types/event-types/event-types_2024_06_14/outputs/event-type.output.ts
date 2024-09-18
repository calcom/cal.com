import { ApiProperty as DocsProperty } from "@nestjs/swagger";
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
import { Host as TeamEventTypeHostInput, BookingLimitsDuration_2024_06_14 } from "../inputs";
import { Recurrence_2024_06_14 } from "../inputs";
import type { BookingLimitsCount_2024_06_14 } from "../inputs/booking-limits-count.input";
import { ValidateLocations_2024_06_14 } from "../inputs/locations.input";
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

export class EventTypeOutput_2024_06_14 {
  @IsInt()
  @DocsProperty({ example: 1 })
  id!: number;

  @IsInt()
  ownerId!: number;

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
  locations!: Location_2024_06_14[];

  @ValidateOutputBookingFields_2024_06_14()
  bookingFields!: OutputBookingField_2024_06_14[];

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

  users!: User_2024_06_14[];

  @IsInt()
  scheduleId!: number | null;

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

export class TeamEventTypeResponseHost extends TeamEventTypeHostInput {
  @IsString()
  name!: string;
}

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
  locations!: Location_2024_06_14[];

  @ValidateOutputBookingFields_2024_06_14()
  bookingFields!: OutputBookingField_2024_06_14[];

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
