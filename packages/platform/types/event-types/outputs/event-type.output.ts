import { ApiProperty as DocsProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, Min } from "class-validator";

import {
  CREATE_EVENT_DESCRIPTION_EXAMPLE,
  CREATE_EVENT_LENGTH_EXAMPLE,
  CREATE_EVENT_TITLE_EXAMPLE,
} from "@calcom/platform-types";
import type { Location, BookingField } from "@calcom/platform-types";

import { ValidateLocations } from "../inputs//locations.input";
import { ValidateBookingFields } from "../inputs/booking-fields.input";
import { RecurringEvent } from "../inputs/recurring-event";

export const SchedulingTypeEnum = {
  ROUND_ROBIN: "ROUND_ROBIN",
  COLLECTIVE: "COLLECTIVE",
  MANAGED: "MANAGED",
} as const;

export type SchedulingType = (typeof SchedulingTypeEnum)[keyof typeof SchedulingTypeEnum];

class Schedule {
  @IsInt()
  id!: number;

  @IsString()
  timeZone!: string | null;
}

class User {
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

export class EventTypeOutput {
  @IsInt()
  @DocsProperty({ example: 1 })
  id!: number;

  @IsInt()
  ownerId!: number;

  @IsInt()
  @Min(1)
  @DocsProperty({ example: CREATE_EVENT_LENGTH_EXAMPLE })
  lengthInMinutes!: number;

  @IsString()
  @DocsProperty({ example: CREATE_EVENT_TITLE_EXAMPLE })
  title!: string;

  @IsString()
  slug!: string;

  @IsString()
  @DocsProperty({ example: CREATE_EVENT_DESCRIPTION_EXAMPLE })
  description!: string;

  @ValidateLocations()
  locations!: Location[];

  @ValidateBookingFields()
  bookingFields!: BookingField[];

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

  @Type(() => RecurringEvent)
  recurringEvent!: RecurringEvent | null;

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

  users!: User[];

  schedule!: Schedule | null;
}
