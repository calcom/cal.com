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
} from "class-validator";

import { PeriodType, SchedulingType } from "@calcom/prisma/enums";

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

  @ValidateNested()
  @Type(() => BookingField)
  @IsOptional()
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

enum Editable {
  System = "system",
  SystemButOptional = "system-but-optional",
  SystemButHidden = "system-but-hidden",
  User = "user",
  UserReadonly = "user-readonly",
}

class VariantField {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  type?: string; // Adjust according to your actual enum for field types

  @IsString()
  @IsOptional()
  label?: string;

  @IsString()
  @IsOptional()
  labelAsSafeHtml?: string;

  @IsString()
  @IsOptional()
  placeholder?: string;

  @IsBoolean()
  @IsOptional()
  required?: boolean;
}

class Variant {
  @ValidateNested({ each: true })
  @Type(() => VariantField)
  fields!: VariantField[];
}

class VariantsConfig {
  @ValidateNested()
  @Type(() => Variant)
  variants!: Record<string, Variant>;
}

class Source {
  @IsString()
  id!: string;

  @IsString()
  type!: string;

  @IsString()
  label!: string;

  @IsString()
  @IsOptional()
  editUrl?: string;

  @IsBoolean()
  @IsOptional()
  fieldRequired?: boolean;
}

class View {
  @IsString()
  label!: string;

  @IsString()
  id!: string;

  @IsString()
  @IsOptional()
  description?: string;
}

export class BookingField {
  @IsString()
  @IsOptional()
  variant?: string;

  @ValidateNested()
  @Type(() => VariantsConfig)
  @IsOptional()
  variantsConfig?: VariantsConfig;

  @ValidateNested({ each: true })
  @Type(() => View)
  @IsOptional()
  views?: View[];

  @IsBoolean()
  @IsOptional()
  hideWhenJustOneOption?: boolean;

  @IsBoolean()
  @IsOptional()
  hidden?: boolean;

  @IsEnum(Editable)
  @IsOptional()
  editable?: Editable;

  @ValidateNested({ each: true })
  @Type(() => Source)
  @IsOptional()
  sources?: Source[];
}

class Location {
  @IsString()
  type!: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  link?: string;

  @IsBoolean()
  @IsOptional()
  displayLocationPublicly?: boolean;

  @IsString()
  @IsOptional()
  hostPhoneNumber?: string;

  @IsNumber()
  @IsOptional()
  credentialId?: number;

  @IsString()
  @IsOptional()
  teamName?: string;
}
