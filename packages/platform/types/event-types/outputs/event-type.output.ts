import { ApiProperty as DocsProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, Min } from "class-validator";

import {
  CREATE_EVENT_DESCRIPTION_EXAMPLE,
  CREATE_EVENT_LENGTH_EXAMPLE,
  CREATE_EVENT_TITLE_EXAMPLE,
  ValidateBookingFields,
  ValidateLocations,
} from "@calcom/platform-types";
import type { Location, BookingField } from "@calcom/platform-types";
import type { Schedule, User } from "@calcom/prisma/client";
import type { SchedulingType } from "@calcom/prisma/enums";
import { SchedulingType as SchedulingTypeEnum } from "@calcom/prisma/enums";

import { RecurringEvent } from "../inputs/recurring-event";

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

  schedule!: Schedule;
}
