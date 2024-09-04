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

import type {
  Location_2024_06_14,
  BookingField_2024_06_14,
  BookingWindow_2024_06_14,
  BookingLimitsDuration_2024_06_14,
} from "../inputs";
import { Host as TeamEventTypeHostInput, EventTypeColor_2024_06_14, Seats_2024_06_14 } from "../inputs";
import { Recurrence_2024_06_14 } from "../inputs";
import { BookerLayouts_2024_06_14 } from "../inputs/booker-layouts.input";
import { ValidateBookingFields_2024_06_14 } from "../inputs/booking-fields.input";
import type { BookingLimitsCount_2024_06_14 } from "../inputs/booking-limits-count.input";
import type { ConfirmationPolicy_2024_06_14 } from "../inputs/confirmation-policy.input";
import { ValidateLocations_2024_06_14 } from "../inputs/locations.input";

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
class BaseEventTypeOutput {
  @IsInt()
  @DocsProperty({ example: 1 })
  id!: number;

  @IsInt()
  @IsOptional()
  ownerId?: number | null;

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

  @ValidateBookingFields_2024_06_14()
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

  @IsInt()
  price!: number;

  @IsString()
  currency!: string;

  @IsBoolean()
  lockTimeZoneToggleOnBookingPage!: boolean;

  @IsBoolean()
  forwardParamsSuccessRedirect!: boolean | null;

  @IsString()
  successRedirectUrl!: string | null;

  @IsBoolean()
  isInstantEvent!: boolean;

  @IsInt()
  scheduleId!: number | null;

  @IsOptional()
  bookingLimitsCount?: BookingLimitsCount_2024_06_14;

  @IsOptional()
  @IsBoolean()
  onlyShowFirstAvailableSlot?: boolean;

  @IsOptional()
  bookingLimitsDuration?: BookingLimitsDuration_2024_06_14;

  @IsOptional()
  bookingWindow?: BookingWindow_2024_06_14;

  @IsOptional()
  @Type(() => BookerLayouts_2024_06_14)
  bookerLayouts?: BookerLayouts_2024_06_14;

  @IsOptional()
  requiresConfirmation?: ConfirmationPolicy_2024_06_14;

  @IsOptional()
  @IsBoolean()
  requiresBookerEmailVerification?: boolean;

  @IsOptional()
  @IsBoolean()
  hideCalendarNotes?: boolean;

  @IsOptional()
  @Type(() => EventTypeColor_2024_06_14)
  eventTypeColor?: EventTypeColor_2024_06_14;

  @IsOptional()
  @Type(() => Seats_2024_06_14)
  seats?: Seats_2024_06_14;

  @IsOptional()
  @IsInt()
  @Min(1)
  offsetStart?: number;
}

export class EventTypeOutput_2024_06_14 extends BaseEventTypeOutput {
  @IsInt()
  override ownerId!: number;

  users!: User_2024_06_14[];
}

export class TeamEventTypeResponseHost extends TeamEventTypeHostInput {
  @IsString()
  name!: string;
}

export class TeamEventTypeOutput_2024_06_14 extends BaseEventTypeOutput {
  @IsInt()
  @IsOptional()
  override ownerId?: number | null;

  @IsInt()
  @IsOptional()
  teamId?: number | null;

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
}
