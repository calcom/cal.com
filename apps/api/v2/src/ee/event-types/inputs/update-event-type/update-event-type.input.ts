import { BookingField } from "@/ee/event-types/inputs/update-event-type/fields/booking-field";
import { Location } from "@/ee/event-types/inputs/update-event-type/fields/location";
import { Type } from "class-transformer";
import {
  IsString,
  IsNumber,
  IsBoolean,
  IsOptional,
  ValidateNested,
  IsEnum,
  Min,
  IsUrl,
  IsDate,
  IsInt,
  IsArray,
} from "class-validator";

import { PeriodType, SchedulingType } from "@calcom/platform-libraries";

enum Frequency {
  YEARLY = 0,
  MONTHLY = 1,
  WEEKLY = 2,
  DAILY = 3,
  HOURLY = 4,
  MINUTELY = 5,
  SECONDLY = 6,
}

class RecurringEvent {
  @IsDate()
  @IsOptional()
  dtstart?: Date;

  @IsInt()
  interval!: number;

  @IsInt()
  count!: number;

  @IsEnum(Frequency)
  freq!: any;

  @IsDate()
  @IsOptional()
  until?: Date;

  @IsString()
  @IsOptional()
  tzid?: string;
}

class IntervalLimits {
  @IsNumber()
  @IsOptional()
  PER_DAY?: number;

  @IsNumber()
  @IsOptional()
  PER_WEEK?: number;

  @IsNumber()
  @IsOptional()
  PER_MONTH?: number;

  @IsNumber()
  @IsOptional()
  PER_YEAR?: number;
}

export class UpdateEventTypeInput {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  slug?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsInt()
  @IsOptional()
  position?: number;

  @ValidateNested({ each: true })
  @Type(() => Location)
  @IsOptional()
  locations?: Location[];

  @IsInt()
  @Min(1)
  @IsOptional()
  length?: number;

  @IsInt()
  @IsOptional()
  offsetStart?: number;

  @IsBoolean()
  @IsOptional()
  hidden?: boolean;

  @IsInt()
  @IsOptional()
  userId?: number;

  @IsInt()
  @IsOptional()
  profileId?: number;

  @IsInt()
  @IsOptional()
  teamId?: number;

  @IsString()
  @IsOptional()
  eventName?: string;

  @IsInt()
  @IsOptional()
  parentId?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BookingField)
  bookingFields?: BookingField[];

  @IsString()
  @IsOptional()
  timeZone?: string;

  @IsEnum(PeriodType)
  @IsOptional()
  periodType?: PeriodType;

  @IsDate()
  @IsOptional()
  periodStartDate?: Date;

  @IsDate()
  @IsOptional()
  periodEndDate?: Date;

  @IsInt()
  @IsOptional()
  periodDays?: number;

  @IsBoolean()
  @IsOptional()
  periodCountCalendarDays?: boolean;

  @IsBoolean()
  @IsOptional()
  lockTimeZoneToggleOnBookingPage?: boolean;

  @IsBoolean()
  @IsOptional()
  requiresConfirmation?: boolean;

  @IsBoolean()
  @IsOptional()
  requiresBookerEmailVerification?: boolean;

  @ValidateNested()
  @Type(() => RecurringEvent)
  @IsOptional()
  recurringEvent?: RecurringEvent;

  @IsBoolean()
  @IsOptional()
  disableGuests?: boolean;

  @IsBoolean()
  @IsOptional()
  hideCalendarNotes?: boolean;

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

  @IsInt()
  @IsOptional()
  seatsPerTimeSlot?: number;

  @IsBoolean()
  @IsOptional()
  onlyShowFirstAvailableSlot?: boolean;

  @IsBoolean()
  @IsOptional()
  seatsShowAttendees?: boolean;

  @IsBoolean()
  @IsOptional()
  seatsShowAvailabilityCount?: boolean;

  @IsEnum(SchedulingType)
  @IsOptional()
  schedulingType?: SchedulingType;

  @IsInt()
  @IsOptional()
  scheduleId?: number;

  @IsInt()
  @IsOptional()
  price?: number;

  @IsString()
  @IsOptional()
  currency?: string;

  @IsInt()
  @IsOptional()
  slotInterval?: number;

  @IsString()
  @IsOptional()
  @IsUrl()
  successRedirectUrl?: string;

  @ValidateNested()
  @Type(() => IntervalLimits)
  @IsOptional()
  bookingLimits?: IntervalLimits;

  @ValidateNested()
  @Type(() => IntervalLimits)
  @IsOptional()
  durationLimits?: IntervalLimits;

  @IsBoolean()
  @IsOptional()
  isInstantEvent?: boolean;

  @IsBoolean()
  @IsOptional()
  assignAllTeamMembers?: boolean;

  @IsBoolean()
  @IsOptional()
  useEventTypeDestinationCalendarEmail?: boolean;

  @IsInt()
  @IsOptional()
  secondaryEmailId?: number;
}
