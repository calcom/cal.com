import { ApiProperty as DocsProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, Min } from "class-validator";

import type { Location_2024_06_14, BookingField_2024_06_14 } from "../inputs";
import { RecurringEvent_2024_06_14 } from "../inputs";
import { ValidateBookingFields_2024_06_14 } from "../inputs/booking-fields.input";
import { ValidateLocations_2024_06_14 } from "../inputs/locations.input";

export const SchedulingTypeEnum = {
  ROUND_ROBIN: "ROUND_ROBIN",
  COLLECTIVE: "COLLECTIVE",
  MANAGED: "MANAGED",
} as const;

export type SchedulingType = (typeof SchedulingTypeEnum)[keyof typeof SchedulingTypeEnum];

class Schedule_2024_06_14 {
  @IsInt()
  id!: number;

  @IsString()
  timeZone!: string | null;
}

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
  schedulingType!: SchedulingType | null;

  @Type(() => RecurringEvent_2024_06_14)
  recurringEvent!: RecurringEvent_2024_06_14 | null;

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

  schedule!: Schedule_2024_06_14 | null;
}
